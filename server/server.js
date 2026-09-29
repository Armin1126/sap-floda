import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { executeQuery, testHanaConnection, inspectSchema } from './db/hana.js';
import { seedHanaDatabase } from './db/seed-data.js';
import {
  hashPassword,
  verifyPassword,
  generateToken,
  seedUsers,
  registerUser,
  authMiddleware,
  requireRole,
  DEMO_USERS
} from './auth.js';
import {
  broadcaster,
  logEvent,
  createNotification,
  executeAgentPipeline,
  processAuthorityDecision,
  updateTaskStatus,
  resetDemoState,
  resolveDisruption,
  processCorridorTelemetry
} from './agent-orchestrator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 4004;

app.use(cors());
app.use(express.json());
app.use(authMiddleware);

// Log incoming requests cleanly
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (!req.originalUrl.includes('/stream') && !req.originalUrl.includes('/health')) {
      console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${duration}ms)`);
    }
  });
  next();
});

function normalizeRow(row) {
  if (!row || typeof row !== 'object') return row;
  const normalized = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[key.toLowerCase()] = value;
    normalized[key] = value;
  }
  return normalized;
}

function normalizeRows(rows) {
  return Array.isArray(rows) ? rows.map(normalizeRow) : rows;
}

// ==========================================
// 1. HEALTH CHECK (REAL SAP HANA QUERY)
// ==========================================
app.get('/api/health', async (req, res) => {
  try {
    const result = await testHanaConnection();
    res.json({
      connected: true,
      database: process.env.HANA_DATABASE || 'Hackfest-DB',
      schema: process.env.HANA_SCHEMA || 'HACKFEST0238',
      user: result.CURRENT_USER,
      timestamp: result.CURRENT_TIMESTAMP,
      engine: 'SAP HANA Cloud'
    });
  } catch (error) {
    res.status(503).json({
      connected: false,
      database: process.env.HANA_DATABASE || 'Hackfest-DB',
      error: error.message
    });
  }
});

// ==========================================
// 2. REAL-TIME SERVER-SENT EVENTS (SSE) STREAM
// ==========================================
app.get('/api/events/stream', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.write(': connected\n\n');
  broadcaster.addClient(res);
});

// ==========================================
// 3. AUTHENTICATION & RBAC
// ==========================================
app.get('/api/auth/users', async (req, res) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  try {
    // Only return users of the requester's department/role to respect organizational privacy
    const userRole = req.user.role;
    let query = `SELECT user_id, employee_id, email, role, full_name, organization FROM FLODA_USERS`;
    const params = [];
    if (userRole && userRole !== 'AUTHORITY') {
      query += ` WHERE role = ?`;
      params.push(userRole);
    }
    query += ` ORDER BY role ASC, full_name ASC`;
    const rows = await executeQuery(query, params);
    res.json(normalizeRows(rows));
  } catch {
    res.json([]);
  }
});

app.post('/api/auth/register', async (req, res) => {
  const { employeeId, fullName, email, password, role, organization } = req.body;
  try {
    const newUser = await registerUser({ employeeId, fullName, email, password, role, organization });

    // Generate JWT token immediately for seamless sign-in
    const token = generateToken({
      user_id: newUser.userId,
      employee_id: newUser.employeeId,
      email: newUser.email,
      role: newUser.role,
      full_name: newUser.fullName,
      organization: newUser.organization
    });

    // Audit registration
    await executeQuery(
      `INSERT INTO FLODA_AUDIT_LOG (log_id, action, decision_rationale, timestamp, actor, role, entity, new_state)
       VALUES (?, 'USER_REGISTERED', ?, CURRENT_TIMESTAMP, ?, ?, 'USER', 'ACTIVE')`,
      [`LOG-${Date.now()}-REG`, `New user ${newUser.fullName} (${newUser.employeeId}) registered under ${newUser.role}`, newUser.fullName, newUser.role]
    );

    res.status(201).json({
      success: true,
      token,
      user: {
        userId: newUser.userId,
        employeeId: newUser.employeeId,
        email: newUser.email,
        role: newUser.role,
        fullName: newUser.fullName,
        organization: newUser.organization
      }
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  const { email, password, employeeId } = req.body;
  if ((!email && !employeeId) || !password) {
    return res.status(400).json({ error: 'Email or Employee ID and password are required' });
  }

  try {
    let rows;
    if (email) {
      rows = await executeQuery(
        `SELECT user_id, employee_id, email, password_hash, salt, role, full_name, organization FROM FLODA_USERS WHERE LOWER(email) = LOWER(?)`,
        [email.trim()]
      );
    } else {
      rows = await executeQuery(
        `SELECT user_id, employee_id, email, password_hash, salt, role, full_name, organization FROM FLODA_USERS WHERE UPPER(employee_id) = UPPER(?)`,
        [employeeId.trim()]
      );
    }

    if (rows.length === 0) {
      return res.status(401).json({ error: 'Invalid user credentials. Account not found.' });
    }

    const user = normalizeRow(rows[0]);
    const isValid = verifyPassword(password, user.password_hash, user.salt);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid user credentials. Password incorrect.' });
    }

    const token = generateToken(user);

    // Audit login
    await executeQuery(
      `INSERT INTO FLODA_AUDIT_LOG (log_id, action, decision_rationale, timestamp, actor, role, entity, new_state)
       VALUES (?, 'USER_LOGIN', ?, CURRENT_TIMESTAMP, ?, ?, 'USER', 'AUTHENTICATED')`,
      [`LOG-${Date.now()}-LOG`, `User ${user.email} (${user.employee_id || 'ID'}) authenticated successfully`, user.full_name, user.role]
    );

    res.json({
      token,
      user: {
        userId: user.user_id,
        employeeId: user.employee_id,
        email: user.email,
        role: user.role,
        fullName: user.full_name,
        organization: user.organization
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/auth/me', (req, res) => {
  if (!req.user) {
    return res.status(401).json({ authenticated: false });
  }
  res.json({ authenticated: true, user: req.user });
});

app.post('/api/auth/logout', (req, res) => {
  res.json({ success: true, message: 'Logged out successfully' });
});

// ==========================================
// 4. DISRUPTIONS & AGENT PIPELINE
// ==========================================
app.get('/api/disruptions', async (req, res) => {
  try {
    const rows = await executeQuery(`
      SELECT * FROM FLODA_DISRUPTIONS ORDER BY created_at DESC
    `);
    res.json(normalizeRows(rows));
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/disruptions', async (req, res) => {
  try {
    const user = req.user?.fullName || 'Corridor Authority';
    const result = await executeAgentPipeline(req.body, user);
    res.status(201).json({
      success: true,
      message: 'Disruption registered and agent evaluation pipeline completed',
      ...result
    });
  } catch (err) {
    console.error('Disruption pipeline error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Auto-Resolution of Disruption & Corridor Reopening
app.post('/api/disruptions/:id/resolve', async (req, res) => {
  try {
    const resolvedBy = req.user?.fullName || req.body.resolvedBy || 'Corridor Authority';
    const notes = req.body.notes || 'Infrastructure clearance verified. Normal highway capacity restored.';
    const result = await resolveDisruption(req.params.id, resolvedBy, notes);
    res.json(result);
  } catch (err) {
    console.error('Disruption resolution error:', err);
    res.status(500).json({ error: err.message });
  }
});

// Autonomous IoT / Highway Sensor Telemetry Ingestion Endpoint
app.post('/api/telemetry/corridor-feed', async (req, res) => {
  try {
    const result = await processCorridorTelemetry(req.body);
    res.json(result);
  } catch (err) {
    console.error('Telemetry ingestion error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. SCENARIOS & RECOMMENDATIONS
// ==========================================
app.get('/api/scenarios', async (req, res) => {
  try {
    const { disruption_id } = req.query;
    let sql = `SELECT * FROM FLODA_SCENARIOS`;
    const params = [];
    if (disruption_id) {
      sql += ` WHERE disruption_id = ?`;
      params.push(disruption_id);
    }
    sql += ` ORDER BY created_at DESC`;
    const rows = await executeQuery(sql, params);
    res.json(normalizeRows(rows));
  } catch (err) {
    res.json([]);
  }
});

app.get('/api/recommendations', async (req, res) => {
  try {
    const { disruption_id } = req.query;
    let sql = `SELECT * FROM FLODA_RECOMMENDATIONS`;
    const params = [];
    if (disruption_id) {
      sql += ` WHERE disruption_id = ?`;
      params.push(disruption_id);
    }
    sql += ` ORDER BY created_at DESC`;
    const rows = await executeQuery(sql, params);
    res.json(normalizeRows(rows));
  } catch (err) {
    res.json([]);
  }
});

// ==========================================
// 6. AUTHORITY DECISIONS & PROPAGATION
// ==========================================
app.post('/api/decisions', async (req, res) => {
  try {
    const decidedBy = req.user?.fullName || req.body.decidedBy || 'Corridor Authority';
    const decidedByRole = req.user?.role || req.body.decidedByRole || 'AUTHORITY';
    const result = await processAuthorityDecision({
      ...req.body,
      decidedBy,
      decidedByRole
    });
    res.status(201).json(result);
  } catch (err) {
    console.error('Decision processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/decisions/:id/approve', async (req, res) => {
  try {
    const decidedBy = req.user?.fullName || req.body.name || 'Corridor Authority';
    const decidedByRole = req.user?.role || 'AUTHORITY';
    const result = await processAuthorityDecision({
      recommendationId: req.params.id,
      disruptionId: req.body.disruptionId,
      scenarioId: req.body.scenarioId,
      decisionType: 'APPROVED',
      decidedBy,
      decidedByRole,
      notes: req.body.notes || 'Scenario approved by executive corridor authority'
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/decisions/:id/reject', async (req, res) => {
  try {
    const decidedBy = req.user?.fullName || req.body.name || 'Corridor Authority';
    const decidedByRole = req.user?.role || 'AUTHORITY';
    const result = await processAuthorityDecision({
      recommendationId: req.params.id,
      disruptionId: req.body.disruptionId,
      scenarioId: req.body.scenarioId,
      decisionType: 'REJECTED',
      decidedBy,
      decidedByRole,
      notes: req.body.reason || 'Scenario rejected by executive corridor authority'
    });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. PERSONA TASKS & EXECUTION STATUS
// ==========================================
app.get('/api/tasks', async (req, res) => {
  try {
    const { role } = req.query;
    let sql = `SELECT * FROM FLODA_TASKS`;
    const params = [];
    if (role && role !== 'AUTHORITY') {
      sql += ` WHERE assigned_role = ?`;
      params.push(role);
    }
    sql += ` ORDER BY created_at DESC`;
    const rows = await executeQuery(sql, params);
    res.json(normalizeRows(rows));
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/tasks/:id/acknowledge', async (req, res) => {
  try {
    const user = req.user?.fullName || req.body.user || 'Operational Operator';
    const role = req.user?.role || req.body.role || 'OPERATOR';
    const result = await updateTaskStatus(req.params.id, 'ACKNOWLEDGED', user, role, req.body.notes);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/tasks/:id/status', async (req, res) => {
  try {
    const { status, notes } = req.body;
    const user = req.user?.fullName || req.body.user || 'Operational Operator';
    const role = req.user?.role || req.body.role || 'OPERATOR';
    const result = await updateTaskStatus(req.params.id, status, user, role, notes);
    res.json({ success: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 8. NOTIFICATIONS API
// ==========================================
app.get('/api/notifications', async (req, res) => {
  try {
    const { role, user } = req.query;
    let sql = `SELECT * FROM FLODA_NOTIFICATIONS`;
    const params = [];
    if (role && role !== 'AUTHORITY') {
      sql += ` WHERE recipient_role = ? OR recipient_role = 'ALL'`;
      params.push(role);
    }
    sql += ` ORDER BY created_at DESC`;
    const rows = await executeQuery(sql, params);
    res.json(normalizeRows(rows));
  } catch (err) {
    res.json([]);
  }
});

app.post('/api/notifications/:id/read', async (req, res) => {
  try {
    await executeQuery(`UPDATE FLODA_NOTIFICATIONS SET read_status = 'READ' WHERE id = ?`, [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/notifications/read-all', async (req, res) => {
  try {
    const { role } = req.body;
    if (role && role !== 'AUTHORITY') {
      await executeQuery(`UPDATE FLODA_NOTIFICATIONS SET read_status = 'READ' WHERE recipient_role = ?`, [role]);
    } else {
      await executeQuery(`UPDATE FLODA_NOTIFICATIONS SET read_status = 'READ'`);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 9. LIVE EVENT STREAM DATA
// ==========================================
app.get('/api/events', async (req, res) => {
  try {
    const rows = await executeQuery(`SELECT * FROM FLODA_EVENTS ORDER BY timestamp DESC LIMIT 50`);
    res.json(normalizeRows(rows));
  } catch (err) {
    res.json([]);
  }
});

// 10. AUDIT TRAIL (CONFIDENTIAL TO CORRIDOR AUTHORITY)
// ==========================================
app.get('/api/audit', async (req, res) => {
  // If request has authenticated user, enforce Authority privilege
  if (req.user && req.user.role !== 'AUTHORITY') {
    return res.status(403).json({ error: 'Audit trail access restricted to Corridor Authority' });
  }
  try {
    const rows = await executeQuery(`
      SELECT log_id, ranking_id, action, decision_rationale, parameter_values, timestamp, actor, role, entity, entity_id, previous_state, new_state
      FROM FLODA_AUDIT_LOG
      ORDER BY timestamp DESC
      LIMIT 100
    `);
    res.json(normalizeRows(rows));
  } catch (error) {
    res.json([]);
  }
});

// ==========================================
// 11. DEMO RESET API
// ==========================================
app.post(['/api/reset', '/odata/v4/ranking/resetAndSeed'], async (req, res) => {
  try {
    const result = await resetDemoState();
    await seedHanaDatabase();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// 12. ODATA COMPATIBILITY ADAPTERS & MANIFESTS
// ==========================================
app.get('/odata/v4/ranking/Manifests', async (req, res) => {
  try {
    const rows = await executeQuery(`SELECT * FROM FLODA_MANIFESTS ORDER BY created_at DESC`);
    res.json({ value: normalizeRows(rows) });
  } catch (error) {
    res.json({ value: [] });
  }
});

app.post('/api/manifests', async (req, res) => {
  try {
    const {
      manifestId,
      commodityType,
      origin,
      destination,
      weightKg = 5000,
      volumeCbm = 20,
      substitutability = 0.5,
      coverClockHours = 72,
      degradationClockHours = 240,
      carriageConstraint = 'standard'
    } = req.body;

    const id = manifestId || `MAN-NPL-${Date.now().toString().slice(-4)}`;
    const weight = Number(weightKg);
    const sub = Number(substitutability);
    const cover = Number(coverClockHours);
    const deg = Number(degradationClockHours);

    // Calculate priority composite score: lower cover clock + lower substitutability + faster degradation -> higher priority
    const score = Math.min(0.99, Math.max(0.10, (
      (1 - sub) * 0.40 +
      (1 - Math.min(cover, 120) / 120) * 0.35 +
      (1 - Math.min(deg, 720) / 720) * 0.25
    ))).toFixed(3);

    // Guardrail rule: hazmat OR weight > 10,000kg requires Authority human review
    const isHazmat = carriageConstraint.toLowerCase().includes('hazmat');
    const isHeavy = weight > 10000;
    const requiresApproval = isHazmat || isHeavy;

    // Insert Manifest
    await executeQuery(`
      INSERT INTO FLODA_MANIFESTS
      (manifest_id, commodity_type, origin, destination, weight_kg, volume_cbm, substitutability, cover_clock_hours, degradation_clock_hours, carriage_constraint, composite_score, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', CURRENT_TIMESTAMP)
    `, [id, commodityType, origin, destination, weight, volumeCbm, sub, cover, deg, carriageConstraint, score]);

    // Check existing rankings to determine rank position
    const existing = await executeQuery(`SELECT COUNT(*) AS CNT FROM FLODA_RANKINGS`);
    const nextRank = (existing[0]?.CNT || 0) + 1;
    const rankingId = `RNK-${Date.now().toString().slice(-4)}`;

    // Insert Ranking
    await executeQuery(`
      INSERT INTO FLODA_RANKINGS
      (ranking_id, manifest_id, chokepoint_id, priority_rank, composite_score, substitutability_score, cover_clock_score, degradation_clock_score, carriage_fit_score, allocated, requires_approval, approval_status, approved_by, approved_at, created_at)
      VALUES (?, ?, NULL, ?, ?, ?, ?, ?, 0.80, ?, ?, ?, ?, ${requiresApproval ? 'NULL' : 'CURRENT_TIMESTAMP'}, CURRENT_TIMESTAMP)
    `, [
      rankingId,
      id,
      nextRank,
      score,
      (1 - sub).toFixed(2),
      (1 - Math.min(cover, 120) / 120).toFixed(2),
      (1 - Math.min(deg, 720) / 720).toFixed(2),
      requiresApproval ? 'N' : 'Y',
      requiresApproval,
      requiresApproval ? 'pending' : 'approved',
      requiresApproval ? null : 'AGENT_LOGISTICS_AUTO'
    ]);

    // Audit log entry
    await executeQuery(`
      INSERT INTO FLODA_AUDIT_LOG (log_id, ranking_id, action, decision_rationale, timestamp, actor, role, entity, new_state)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?, 'LOGISTICS', 'MANIFEST', ?)
    `, [
      `LOG-${Date.now()}-MAN`,
      rankingId,
      requiresApproval ? 'ESCALATION_TRIGGERED' : 'AUTO_ALLOCATION_EXECUTED',
      requiresApproval 
        ? `${commodityType}: Flagged for human review (${isHazmat ? 'Hazmat' : ''} ${isHeavy ? 'Heavy Cargo >10t' : ''}).`
        : `${commodityType}: Priority score ${score}. Auto-allocated by Shapley fair ranking.`,
      'AGENT_LOGISTICS',
      requiresApproval ? 'PENDING' : 'APPROVED'
    ]);

    broadcaster.broadcast('manifest_added', { manifestId: id, commodityType, rankingId, score, requiresApproval });

    res.status(201).json({
      success: true,
      manifest: { manifestId: id, commodityType, origin, destination, weightKg: weight, score, requiresApproval },
      ranking: { rankingId, rank: nextRank, score, allocated: requiresApproval ? 'N' : 'Y', approvalStatus: requiresApproval ? 'pending' : 'approved' }
    });
  } catch (error) {
    console.error('Error adding manifest:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get(['/api/rankings', /^\/odata\/v4\/ranking\/rankedManifests(\(\))?$/], async (req, res) => {
  try {
    const rows = await executeQuery(`SELECT * FROM FLODA_RANKINGS ORDER BY priority_rank ASC`);
    const normalized = normalizeRows(rows);
    res.json(req.path.includes('odata') ? { value: normalized } : normalized);
  } catch (error) {
    res.json(req.path.includes('odata') ? { value: [] } : []);
  }
});

app.get(['/api/approvals', /^\/odata\/v4\/ranking\/pendingApprovals(\(\))?$/], async (req, res) => {
  try {
    const sql = `
      SELECT r.*, m.commodity_type, m.carriage_constraint, m.weight_kg
      FROM FLODA_RANKINGS r
      LEFT JOIN FLODA_MANIFESTS m ON r.manifest_id = m.manifest_id
      WHERE r.approval_status = 'pending'
      ORDER BY r.priority_rank ASC
    `;
    const rows = await executeQuery(sql);
    const normalized = normalizeRows(rows);
    res.json(req.path.includes('odata') ? { value: normalized } : normalized);
  } catch (error) {
    res.json(req.path.includes('odata') ? { value: [] } : []);
  }
});

app.get('/odata/v4/ranking/Chokepoints', async (req, res) => {
  try {
    const rows = await executeQuery(`SELECT * FROM FLODA_CHOKEPOINTS ORDER BY created_at DESC`);
    res.json({ value: normalizeRows(rows) });
  } catch (error) {
    res.json({ value: [] });
  }
});

app.get('/odata/v4/ranking/AuditLog', async (req, res) => {
  try {
    const rows = await executeQuery(`SELECT * FROM FLODA_AUDIT_LOG ORDER BY timestamp DESC`);
    res.json({ value: normalizeRows(rows) });
  } catch (error) {
    res.json({ value: [] });
  }
});

app.post('/odata/v4/ranking/approveAllocation', async (req, res) => {
  const { ranking_id, approver_name } = req.body;
  try {
    const approver = approver_name || 'Corridor Authority Reviewer';

    // 1. Update ranking in HANA
    await executeQuery(`
      UPDATE FLODA_RANKINGS 
      SET approval_status = 'approved', allocated = 'Y', approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE ranking_id = ?
    `, [approver, ranking_id]);

    // 2. Fetch ranking & manifest details
    const rankingRows = await executeQuery(`
      SELECT r.*, m.commodity_type, m.origin, m.destination, m.weight_kg, m.carriage_constraint
      FROM FLODA_RANKINGS r
      LEFT JOIN FLODA_MANIFESTS m ON r.manifest_id = m.manifest_id
      WHERE r.ranking_id = ?
    `, [ranking_id]);

    const rnk = normalizeRow(rankingRows[0] || {});
    const commodity = rnk.commodity_type || rnk.manifest_id || 'Priority Freight';
    const taskId = `TSK-TRN-APP-${Date.now()}`;

    // 3. Dispatch Transport Task for the approved shipment
    await executeQuery(`
      INSERT INTO FLODA_TASKS (task_id, disruption_id, decision_id, assigned_role, title, description, priority, status, created_at)
      VALUES (?, ?, ?, 'TRANSPORT', ?, ?, 'CRITICAL', 'NEW', CURRENT_TIMESTAMP)
    `, [
      taskId,
      rnk.chokepoint_id || 'CP-APPROVED',
      ranking_id,
      `Dispatch Approved Freight: ${commodity} (${rnk.manifest_id})`,
      `Authority (${approver}) approved special transit authorization for ${commodity}. Weight: ${rnk.weight_kg || 'Standard'} kg (${rnk.carriage_constraint || 'Standard'}). Route from ${rnk.origin || 'Staging'} to ${rnk.destination || 'Destination Depot'}.`
    ]);

    // 4. Create Notification for Transport Operator
    await createNotification(
      'TRANSPORT',
      `New Approved Dispatch Order: ${commodity}`,
      `Shipment ${rnk.manifest_id} (${commodity}) approved by Authority ${approver}. Transport convoy requested immediately.`,
      'WARNING',
      rnk.chokepoint_id || null,
      ranking_id
    );

    // 5. Immutable Audit Log
    await executeQuery(`
      INSERT INTO FLODA_AUDIT_LOG (log_id, ranking_id, action, decision_rationale, timestamp, actor, role, entity, new_state)
      VALUES (?, ?, 'HUMAN_APPROVAL', ?, CURRENT_TIMESTAMP, ?, 'AUTHORITY', 'RANKING', 'APPROVED')
    `, [
      `LOG-${Date.now()}`,
      ranking_id,
      `Authority ${approver} approved allocation for ${commodity} (${rnk.manifest_id}). Generated Transport Dispatch Task ${taskId}.`,
      approver
    ]);

    await logEvent(
      'INDIVIDUAL_SHIPMENT_APPROVED',
      `Shipment ${rnk.manifest_id} (${commodity}) approved by ${approver}. Dispatch order sent to Transport Lead.`,
      { ranking_id, taskId, commodity },
      'TASK',
      taskId
    );

    // 6. Broadcast Real-Time SSE Updates to all Dashboards
    broadcaster.broadcast('task_updated', { ranking_id, taskId, status: 'APPROVED' });
    broadcaster.broadcast('decision_propagated', { ranking_id, taskId, decisionType: 'APPROVED' });

    res.json({ success: true, message: `Allocation approved & dispatched to Transport Lead`, ranking_id, taskId });
  } catch (error) {
    console.error('approveAllocation error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/odata/v4/ranking/rejectAllocation', async (req, res) => {
  const { ranking_id, approver_name, reason } = req.body;
  try {
    await executeQuery(`
      UPDATE FLODA_RANKINGS 
      SET approval_status = 'rejected', allocated = 'N', approved_by = ?, approved_at = CURRENT_TIMESTAMP
      WHERE ranking_id = ?
    `, [approver_name || 'Reviewer', ranking_id]);

    await executeQuery(`
      INSERT INTO FLODA_AUDIT_LOG (log_id, ranking_id, action, decision_rationale, timestamp, actor, role, entity, new_state)
      VALUES (?, ?, 'HUMAN_REJECTION', ?, CURRENT_TIMESTAMP, ?, 'AUTHORITY', 'RANKING', 'REJECTED')
    `, [`LOG-${Date.now()}`, ranking_id, `Allocation rejected: ${reason}`, approver_name || 'Reviewer']);

    broadcaster.broadcast('task_updated', { ranking_id, status: 'REJECTED' });
    res.json({ success: true, message: `Allocation rejected: ${reason}`, ranking_id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/odata/v4/ranking/ingestChokepoint', async (req, res) => {
  try {
    const user = req.user?.fullName || 'Corridor Authority';
    const result = await executeAgentPipeline(req.body, user);
    res.json({ success: true, chokepoint_id: result.chokepointId, message: 'Disruption recorded in SAP HANA Cloud' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Schema Inspection
app.get('/api/schema', async (req, res) => {
  try {
    const schema = process.env.HANA_SCHEMA || 'HACKFEST0238';
    const tables = await inspectSchema(schema);
    res.json({
      schema,
      tableCount: tables.length,
      tables
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Seed demo users on startup
seedUsers().catch(err => console.error('Seed users error:', err));

app.listen(PORT, () => {
  console.log(`FLODA Multi-Persona SAP HANA Backend listening on http://localhost:${PORT}`);
  console.log(`Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`SSE event stream: http://localhost:${PORT}/api/events/stream`);
});

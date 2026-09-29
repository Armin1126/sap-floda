const cds = require('@sap/cds');
const { v4: uuidv4 } = require('uuid');

// Thresholds that trigger human-in-the-loop approval before an allocation executes
const HIGH_RISK_WEIGHT_KG = 10000;
const HIGH_RISK_CONSTRAINTS = ['hazmat'];

module.exports = class RankingService extends cds.ApplicationService {
  async init() {
    const { Manifests, Chokepoints, Rankings, AuditLog, InventoryPlans } = this.entities;

    this.on('ingestManifest', async (req) => {
      const {
        commodity_type, origin, destination, weight_kg, volume_cbm,
        substitutability, cover_clock_hours, degradation_clock_hours,
        carriage_constraint
      } = req.data;

      // Basic validation guards (demo robustness)
      if (!commodity_type || !String(commodity_type).trim()) {
        return { success: false, manifest_id: null, message: 'commodity_type is required.' };
      }
      if (!origin || !String(origin).trim()) {
        return { success: false, manifest_id: null, message: 'origin is required.' };
      }
      if (!destination || !String(destination).trim()) {
        return { success: false, manifest_id: null, message: 'destination is required.' };
      }
      if (weight_kg === undefined || weight_kg === null || Number(weight_kg) <= 0) {
        return { success: false, manifest_id: null, message: 'weight_kg must be a positive number.' };
      }
      if (volume_cbm === undefined || volume_cbm === null || Number(volume_cbm) <= 0) {
        return { success: false, manifest_id: null, message: 'volume_cbm must be a positive number.' };
      }
      const sub = Number(substitutability);
      if (Number.isNaN(sub) || sub < 0 || sub > 1) {
        return { success: false, manifest_id: null, message: 'substitutability must be between 0 and 1.' };
      }
      if (cover_clock_hours === undefined || cover_clock_hours === null || Number(cover_clock_hours) < 0) {
        return { success: false, manifest_id: null, message: 'cover_clock_hours must be >= 0.' };
      }
      if (degradation_clock_hours === undefined || degradation_clock_hours === null || Number(degradation_clock_hours) < 0) {
        return { success: false, manifest_id: null, message: 'degradation_clock_hours must be >= 0.' };
      }
      if (!carriage_constraint || !String(carriage_constraint).trim()) {
        return { success: false, manifest_id: null, message: 'carriage_constraint is required.' };
      }

      const manifest_id = `MANIFEST_${Date.now()}_${uuidv4().slice(0, 8)}`;

      await INSERT.into(Manifests).entries({
        manifest_id,
        commodity_type,
        origin,
        destination,
        weight_kg,
        volume_cbm,
        substitutability,
        cover_clock_hours,
        degradation_clock_hours,
        carriage_constraint,
        composite_score: 0,
        status: 'pending',
        created_at: new Date()
      });

      return { success: true, manifest_id, message: 'Manifest ingested successfully.' };
    });

    this.on('ingestChokepoint', async (req) => {
      const {
        location, chokepoint_type, severity, affected_routes,
        capacity_reduction_percent, estimated_resolution_hours
      } = req.data;

      // Basic validation guards (demo robustness)
      if (!location || !String(location).trim()) {
        return { success: false, chokepoint_id: null, message: 'location is required.' };
      }
      if (!chokepoint_type || !String(chokepoint_type).trim()) {
        return { success: false, chokepoint_id: null, message: 'chokepoint_type is required.' };
      }
      const sev = String(severity || '').toLowerCase();
      if (!['low', 'medium', 'high', 'critical'].includes(sev)) {
        return { success: false, chokepoint_id: null, message: "severity must be one of: low, medium, high, critical." };
      }
      if (!affected_routes || !String(affected_routes).trim()) {
        return { success: false, chokepoint_id: null, message: 'affected_routes is required.' };
      }
      const cap = Number(capacity_reduction_percent);
      if (Number.isNaN(cap) || cap < 0 || cap > 100) {
        return { success: false, chokepoint_id: null, message: 'capacity_reduction_percent must be between 0 and 100.' };
      }
      const hrs = Number(estimated_resolution_hours);
      if (Number.isNaN(hrs) || hrs <= 0) {
        return { success: false, chokepoint_id: null, message: 'estimated_resolution_hours must be > 0.' };
      }

      const chokepoint_id = `CHOKEPOINT_${Date.now()}_${uuidv4().slice(0, 8)}`;

      await INSERT.into(Chokepoints).entries({
        chokepoint_id,
        location,
        chokepoint_type,
        severity: sev,
        affected_routes,
        capacity_reduction_percent: cap,
        estimated_resolution_hours: hrs,
        status: 'active',
        created_at: new Date()
      });

      // DISRUPTION SENSING AGENT: log the raw detection event before any planning happens
      await INSERT.into(AuditLog).entries({
        log_id: uuidv4(),
        ranking_id: null,
        action: 'disruption_detected',
        decision_rationale:
          `Disruption sensed at ${location} | Type: ${chokepoint_type} | ` +
          `Severity: ${severity} | Capacity reduction: ${capacity_reduction_percent}% | ` +
          `Affected routes: ${affected_routes} | Est. resolution: ${estimated_resolution_hours}h`,
        parameter_values: JSON.stringify({
          location, chokepoint_type, severity, affected_routes,
          capacity_reduction_percent, estimated_resolution_hours
        }),
        timestamp: new Date(),
        actor: 'DISRUPTION_SENSING_AGENT'
      });

      await this._rerankAllManifests(chokepoint_id);

      return { success: true, chokepoint_id, message: 'Chokepoint ingested successfully.' };
    });

    this.on('rankedManifests', async () => {
      const latestChokepoint = await SELECT.one.from(Chokepoints).orderBy('created_at desc');
      if (!latestChokepoint) return [];
      return await SELECT.from(Rankings)
        .where({ chokepoint_id: latestChokepoint.chokepoint_id })
        .orderBy('priority_rank asc');
    });

    this.on('resetAndSeed', async (req) => {
      return await this._resetAndSeed();
    });

    this.on('pendingApprovals', async () => {
      return await SELECT.from(Rankings).where({ approval_status: 'pending' }).orderBy('priority_rank asc');
    });

    this.on('inventoryRecommendations', async () => {
      const latestChokepoint = await SELECT.one.from(Chokepoints).orderBy('created_at desc');
      if (!latestChokepoint) return [];
      return await SELECT.from(InventoryPlans)
        .where({ chokepoint_id: latestChokepoint.chokepoint_id })
        .orderBy('created_at desc');
    });

    this.on('approveAllocation', async (req) => {
      return await this._decideAllocation(req.data.ranking_id, req.data.approver_name, 'approved', null);
    });

    this.on('rejectAllocation', async (req) => {
      return await this._decideAllocation(req.data.ranking_id, req.data.approver_name, 'rejected', req.data.reason);
    });

    return super.init();
  }

  async _rerankAllManifests(chokepoint_id) {
    const { Manifests, Chokepoints, Rankings, AuditLog } = this.entities;

    const chokepoint = await SELECT.one.from(Chokepoints).where({ chokepoint_id });
    const manifests = await SELECT.from(Manifests).where({ status: 'pending' });

    // SCENARIO PLANNING AGENT: score every manifest against this disruption
    const rankings = manifests.map((manifest) => {
      const scores = this._computeCompositeScore(manifest, chokepoint);
      return {
        ranking_id: `RANK_${chokepoint_id}_${manifest.manifest_id}`,
        manifest_id: manifest.manifest_id,
        chokepoint_id,
        priority_rank: 0,
        composite_score: scores.composite,
        substitutability_score: scores.substitutability,
        cover_clock_score: scores.cover_clock,
        degradation_clock_score: scores.degradation_clock,
        carriage_fit_score: scores.carriage_fit,
        allocated: 'N',
        requires_approval: false,
        approval_status: 'not_required',
        approved_by: null,
        approved_at: null,
        created_at: new Date()
      };
    });

    rankings.sort((a, b) => b.composite_score - a.composite_score);
    rankings.forEach((r, idx) => { r.priority_rank = idx + 1; });

    // REROUTING & LOGISTICS AGENT: decide which allocations are high-stakes enough
    // to require a human sign-off before execution (top priority, hazmat, or heavy cargo)
    rankings.forEach((r) => {
      const manifest = manifests.find(m => m.manifest_id === r.manifest_id);
      const isTopPriority = r.priority_rank === 1;
      const isHighRiskCargo = HIGH_RISK_CONSTRAINTS.includes(manifest.carriage_constraint);
      const isHeavyShipment = manifest.weight_kg > HIGH_RISK_WEIGHT_KG;

      if (isTopPriority || isHighRiskCargo || isHeavyShipment) {
        r.requires_approval = true;
        r.approval_status = 'pending';
      } else {
        // Low-stakes allocations can be auto-executed by the agent
        r.allocated = 'Y';
      }
    });

    await INSERT.into(Rankings).entries(rankings);

    const auditEntries = rankings.map((ranking) => {
      const manifest = manifests.find(m => m.manifest_id === ranking.manifest_id);
      const rationale =
        `Commodity: ${manifest.commodity_type} | ` +
        `Substitutability: ${ranking.substitutability_score.toFixed(2)} | ` +
        `Cover Clock: ${ranking.cover_clock_score.toFixed(2)} | ` +
        `Degradation: ${ranking.degradation_clock_score.toFixed(2)} | ` +
        `Carriage Fit: ${ranking.carriage_fit_score.toFixed(2)} | ` +
        `COMPOSITE: ${ranking.composite_score.toFixed(2)} | ` +
        `Rank: #${ranking.priority_rank} | ` +
        (ranking.requires_approval
          ? 'ESCALATED to human reviewer (high-stakes allocation)'
          : 'AUTO-EXECUTED by agent (standard-risk allocation)');

      return {
        log_id: uuidv4(),
        ranking_id: ranking.ranking_id,
        action: ranking.requires_approval ? 'allocation_escalated' : 'allocation_auto_executed',
        decision_rationale: rationale,
        parameter_values: JSON.stringify({
          substitutability: manifest.substitutability,
          cover_clock_hours: manifest.cover_clock_hours,
          degradation_clock_hours: manifest.degradation_clock_hours,
          carriage_constraint: manifest.carriage_constraint,
          weight_kg: manifest.weight_kg,
          chokepoint_severity: chokepoint.severity,
          chokepoint_type: chokepoint.chokepoint_type
        }),
        timestamp: new Date(),
        actor: ranking.requires_approval ? 'REROUTING_LOGISTICS_AGENT (escalating)' : 'REROUTING_LOGISTICS_AGENT'
      };
    });

    await INSERT.into(AuditLog).entries(auditEntries);

    // Update manifest lifecycle:
    // - Auto-executed allocations are considered completed decisions for now, so they leave the reranking pool.
    // - Escalated allocations remain pending until a human approves/rejects them.
    const autoExecutedManifestIds = rankings
      .filter(r => r.allocated === 'Y' && r.approval_status === 'not_required')
      .map(r => r.manifest_id);

    if (autoExecutedManifestIds.length > 0) {
      await UPDATE(Manifests)
        .set({ status: 'allocated' })
        .where({ manifest_id: autoExecutedManifestIds });
    }

    // INVENTORY REBALANCING AGENT: compute minimal safety-stock recommendations for the most urgent commodities
    await this._generateInventoryRecommendations(chokepoint_id, rankings, manifests, chokepoint);
  }

  // INVENTORY REBALANCING AGENT (minimal): create InventoryPlans for distinct commodities in top-3 manifests
  async _generateInventoryRecommendations(chokepoint_id, rankings, manifests, chokepoint) {
    const { InventoryPlans, AuditLog } = this.entities;

    // Prevent duplicates if reranking is triggered again for the same chokepoint
    await DELETE.from(InventoryPlans).where({ chokepoint_id });

    const top3 = (rankings || []).slice(0, 3);
    if (top3.length === 0) return;

    const severity = String(chokepoint?.severity || '').toLowerCase();

    // Base percentage by severity (simple + explainable)
    const basePct =
      (severity === 'critical' || severity === 'high') ? 0.20 :
      (severity === 'medium') ? 0.10 :
      0.05; // low or unknown

    // Resolution time scaling: longer disruptions justify higher safety stock buffers.
    const resolutionHrs = Number(chokepoint?.estimated_resolution_hours || 0);
    // Factor in range [1.0 .. 1.5] for 0h..120h+ disruptions (caps at +50%)
    const resolutionFactor = Math.min(1.5, Math.max(1.0, 1 + (resolutionHrs / 240)));

    // Effective pct used for delta computation
    const effectivePct = basePct * resolutionFactor;
    const pctLabel = `${Math.round(effectivePct * 100)}%`;

    // Sum total weight per commodity_type across the top-3 ranked manifests
    // and track cover/degradation clocks to allow negative deltas for non-urgent commodities.
    const weightByCommodity = new Map();
    const coverByCommodity = new Map();
    const degradationByCommodity = new Map();
    for (const r of top3) {
      const m = manifests.find(x => x.manifest_id === r.manifest_id);
      if (!m) continue;
      const commodity = m.commodity_type || 'Unknown';
      const w = Number(m.weight_kg || 0);
      weightByCommodity.set(commodity, (weightByCommodity.get(commodity) || 0) + w);

      coverByCommodity.set(commodity, (coverByCommodity.get(commodity) || 0) + Number(m.cover_clock_hours || 0));
      degradationByCommodity.set(commodity, (degradationByCommodity.get(commodity) || 0) + Number(m.degradation_clock_hours || 0));
    }

    const createdAt = new Date();
    const plans = [];
    const auditEntries = [];

    for (const [commodity_type, totalWeight] of weightByCommodity.entries()) {
      const avgCover = (coverByCommodity.get(commodity_type) || 0) / top3.length;
      const avgDegradation = (degradationByCommodity.get(commodity_type) || 0) / top3.length;

      // Negative delta rule (minimal realism):
      // If severity is low (or medium) and the commodity's shipments have high cover/degradation clocks,
      // recommend reducing safety stock to avoid overstocking.
      let direction = 1;
      if ((severity === 'low' || severity === 'medium') && avgCover >= 168 && avgDegradation >= 168) {
        direction = -1;
      }

      const delta = direction * Math.round(totalWeight * effectivePct);
      const plan_id = `PLAN_${chokepoint_id}_${commodity_type.replace(/\W+/g, '_')}_${uuidv4().slice(0, 8)}`;

      const signLabel = delta >= 0 ? '+' : '';
      const rationale =
        `${commodity_type} disrupted by ${chokepoint.chokepoint_type} at ${chokepoint.location} — ` +
        `recommend ${signLabel}${pctLabel} safety stock to absorb ${chokepoint.estimated_resolution_hours}h resolution delay` +
        (direction < 0 ? ` (low severity + high cover clock → avoid overstock)` : '');

      plans.push({
        plan_id,
        chokepoint_id,
        commodity_type,
        recommended_safety_stock_delta: delta,
        rationale,
        created_at: createdAt
      });

      auditEntries.push({
        log_id: uuidv4(),
        ranking_id: null,
        action: 'inventory_recommendation_generated',
        decision_rationale: rationale,
        parameter_values: JSON.stringify({
          chokepoint_id,
          commodity_type,
          total_weight_top3: totalWeight,
          base_percentage: basePct,
          resolution_factor: resolutionFactor,
          effective_percentage: effectivePct,
          recommended_safety_stock_delta: delta,
          avg_cover_clock_hours_top3: avgCover,
          avg_degradation_clock_hours_top3: avgDegradation,
          severity: chokepoint.severity,
          chokepoint_type: chokepoint.chokepoint_type,
          location: chokepoint.location
        }),
        timestamp: createdAt,
        actor: 'INVENTORY_REBALANCING_AGENT'
      });
    }

    if (plans.length > 0) await INSERT.into(InventoryPlans).entries(plans);
    if (auditEntries.length > 0) await INSERT.into(AuditLog).entries(auditEntries);
  }

  // CORE FLODA ALGORITHM: 4-Parameter Equal-Weight Ranking
  _computeCompositeScore(manifest, chokepoint) {
    const w = 0.25; // equal weight — no commodity gets standing privilege

    // 1. Substitutability: harder to replace = higher priority
    const substitutability_score = 1 - manifest.substitutability;

    // 2. Cover Clock: closer to spoilage = higher priority
    const cover_clock_score = Math.min(1, Math.max(0.1, (240 - manifest.cover_clock_hours) / 240));

    // 3. Degradation Clock: closer to value-loss = higher priority
    const degradation_clock_score = Math.min(1, Math.max(0.1, (240 - manifest.degradation_clock_hours) / 240));

    // 4. Carriage Fit: does this chokepoint type support this cargo's constraint?
    let carriage_fit_score = 0.5;
    const c = String(manifest.carriage_constraint || '').toLowerCase();
    const t = String(chokepoint.chokepoint_type || '').toLowerCase();

    if (c === 'none') {
      carriage_fit_score = 1.0;
    }
    // Hazmat is frequently delayed by customs and also suffers in congested ports
    else if (c === 'hazmat' && t === 'customs_delay') {
      carriage_fit_score = 0.1;
    }
    else if (c === 'hazmat' && t === 'port_congestion') {
      carriage_fit_score = 0.3;
    }
    // Cold chain is very exposed to weather disruptions
    else if (c === 'refrigerated' && t === 'weather') {
      carriage_fit_score = 0.15;
    }
    // Keep existing rule for temp-controlled naming as well
    else if (c === 'temp-controlled' && t === 'weather') {
      carriage_fit_score = 0.2;
    }
    // Heavy freight is hard to reroute around infrastructure damage
    else if (c === 'heavy_cargo' && t === 'infrastructure_failure') {
      carriage_fit_score = 0.2;
    }
    else {
      carriage_fit_score = 0.7;
    }

    const composite =
      w * substitutability_score +
      w * cover_clock_score +
      w * degradation_clock_score +
      w * carriage_fit_score;

    return {
      substitutability: substitutability_score,
      cover_clock: cover_clock_score,
      degradation_clock: degradation_clock_score,
      carriage_fit: carriage_fit_score,
      composite
    };
  }

  // HUMAN-IN-THE-LOOP: approve or reject an escalated allocation
  async _decideAllocation(ranking_id, approver_name, decision, reason) {
    const { Rankings, AuditLog, Manifests } = this.entities;

    try {
      const ranking = await SELECT.one.from(Rankings).where({ ranking_id });
      if (!ranking) {
        return { success: false, message: `Ranking ${ranking_id} not found.`, ranking_id };
      }
      if (ranking.approval_status !== 'pending') {
        return {
          success: false,
          message: `Ranking ${ranking_id} is not pending approval (current status: ${ranking.approval_status}).`,
          ranking_id
        };
      }

      await UPDATE(Rankings).set({
        approval_status: decision,
        approved_by: approver_name,
        approved_at: new Date(),
        allocated: decision === 'approved' ? 'Y' : 'N'
      }).where({ ranking_id });

      // Manifest lifecycle update:
      // - approved => allocated (remove from reranking pool)
      // - rejected => pending (shipment still needs a decision in a future disruption)
      await UPDATE(Manifests)
        .set({ status: decision === 'approved' ? 'allocated' : 'pending' })
        .where({ manifest_id: ranking.manifest_id });

      await INSERT.into(AuditLog).entries({
        log_id: uuidv4(),
        ranking_id,
        action: decision === 'approved' ? 'allocation_approved' : 'allocation_rejected',
        decision_rationale:
          `Human reviewer ${approver_name} ${decision} allocation ${ranking_id}` +
          (reason ? ` | Reason: ${reason}` : ''),
        parameter_values: JSON.stringify({ approver_name, decision, reason: reason || null }),
        timestamp: new Date(),
        actor: `HUMAN_REVIEWER: ${approver_name}`
      });

      return {
        success: true,
        message: `Allocation ${ranking_id} ${decision} by ${approver_name}.`,
        ranking_id
      };

    } catch (error) {
      console.error('Approval decision error:', error);
      return { success: false, message: `Failed: ${error.message}`, ranking_id };
    }
  }

  // DEMO RESET/SEED — clears all data and loads 3 contrasting scenarios
  async _resetAndSeed() {
    const { Manifests, Chokepoints, Rankings, AuditLog, InventoryPlans } = this.entities;

    try {
      await DELETE.from(Rankings);
      await DELETE.from(AuditLog);
      await DELETE.from(InventoryPlans);
      await DELETE.from(Chokepoints);
      await DELETE.from(Manifests);

      // Scenario 1: Port Blockade
      const manifests1 = [
        {
          manifest_id: 'MF-PORT-001',
          commodity_type: 'Textiles',
          weight_kg: 5000,
          volume_cbm: 12,
          substitutability: 0.3,
          cover_clock_hours: 48,
          degradation_clock_hours: 72,
          carriage_constraint: 'standard_container',
          status: 'pending',
          created_at: new Date(),
          composite_score: 0
        },
        {
          manifest_id: 'MF-PORT-002',
          commodity_type: 'Rubber',
          weight_kg: 8000,
          volume_cbm: 15,
          substitutability: 0.05,
          cover_clock_hours: 120,
          degradation_clock_hours: 240,
          carriage_constraint: 'refrigerated',
          status: 'pending',
          created_at: new Date(),
          composite_score: 0
        },
        {
          manifest_id: 'MF-PORT-003',
          commodity_type: 'Electronics',
          weight_kg: 2000,
          volume_cbm: 5,
          substitutability: 0.6,
          cover_clock_hours: 24,
          degradation_clock_hours: 48,
          carriage_constraint: 'standard_container',
          status: 'pending',
          created_at: new Date(),
          composite_score: 0
        }
      ];

      // Scenario 2: Weather Blockade
      const manifests2 = [
        {
          manifest_id: 'MF-WEATHER-001',
          commodity_type: 'Pharmaceuticals',
          weight_kg: 1000,
          volume_cbm: 3,
          substitutability: 0.1,
          cover_clock_hours: 36,
          degradation_clock_hours: 72,
          carriage_constraint: 'refrigerated',
          status: 'pending',
          created_at: new Date(),
          composite_score: 0
        },
        {
          manifest_id: 'MF-WEATHER-002',
          commodity_type: 'Fresh Produce',
          weight_kg: 6000,
          volume_cbm: 18,
          substitutability: 0.25,
          cover_clock_hours: 24,
          degradation_clock_hours: 36,
          carriage_constraint: 'refrigerated',
          status: 'pending',
          created_at: new Date(),
          composite_score: 0
        }
      ];

      // Scenario 3: Infrastructure Failure — includes a hazmat + a heavy shipment
      // to demonstrate the human-in-the-loop escalation path
      const manifests3 = [
        {
          manifest_id: 'MF-INFRA-001',
          commodity_type: 'Steel',
          weight_kg: 15000,
          volume_cbm: 25,
          substitutability: 0.4,
          cover_clock_hours: 96,
          degradation_clock_hours: 168,
          carriage_constraint: 'heavy_cargo',
          status: 'pending',
          created_at: new Date(),
          composite_score: 0
        },
        {
          manifest_id: 'MF-INFRA-002',
          commodity_type: 'Textiles',
          weight_kg: 3000,
          volume_cbm: 8,
          substitutability: 0.35,
          cover_clock_hours: 72,
          degradation_clock_hours: 120,
          carriage_constraint: 'standard_container',
          status: 'pending',
          created_at: new Date(),
          composite_score: 0
        },
        {
          manifest_id: 'MF-INFRA-003',
          commodity_type: 'Industrial Chemicals',
          weight_kg: 4000,
          volume_cbm: 10,
          substitutability: 0.15,
          cover_clock_hours: 60,
          degradation_clock_hours: 96,
          carriage_constraint: 'hazmat',
          status: 'pending',
          created_at: new Date(),
          composite_score: 0
        }
      ];

      const allManifests = [...manifests1, ...manifests2, ...manifests3];
      await INSERT.into(Manifests).entries(allManifests);

      return {
        success: true,
        message: `Demo reset complete. Loaded ${allManifests.length} manifests across 3 scenarios.`,
        manifests_loaded: allManifests.length,
        chokepoints_loaded: 0
      };

    } catch (error) {
      console.error('Reset error:', error);
      return {
        success: false,
        message: `Reset failed: ${error.message}`,
        manifests_loaded: 0,
        chokepoints_loaded: 0
      };
    }
  }
};
import { executeQuery, inspectSchema } from './hana.js';

export async function initializeHanaTables() {
  console.log('Initializing FLODA tables in SAP HANA Cloud (schema HACKFEST0238)...');

  // 1. Chokepoints / Disruptions Table
  await executeQuery(`
    CREATE TABLE FLODA_CHOKEPOINTS (
      chokepoint_id VARCHAR(50) PRIMARY KEY,
      location VARCHAR(120) NOT NULL,
      chokepoint_type VARCHAR(60) NOT NULL,
      severity VARCHAR(30) NOT NULL,
      affected_routes VARCHAR(255),
      capacity_reduction_percent INTEGER,
      estimated_resolution_hours INTEGER,
      status VARCHAR(30) DEFAULT 'ACTIVE',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(err => {
    if (!err.message.includes('already exists')) throw err;
  });

  // 2. Manifests Table
  await executeQuery(`
    CREATE TABLE FLODA_MANIFESTS (
      manifest_id VARCHAR(50) PRIMARY KEY,
      commodity_type VARCHAR(120) NOT NULL,
      origin VARCHAR(100),
      destination VARCHAR(100),
      weight_kg DECIMAL(12, 2),
      volume_cbm DECIMAL(10, 2),
      substitutability DECIMAL(4, 2),
      cover_clock_hours INTEGER,
      degradation_clock_hours INTEGER,
      carriage_constraint VARCHAR(60),
      composite_score DECIMAL(6, 3),
      status VARCHAR(30) DEFAULT 'QUEUED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(err => {
    if (!err.message.includes('already exists')) throw err;
  });

  // 3. Rankings Table
  await executeQuery(`
    CREATE TABLE FLODA_RANKINGS (
      ranking_id VARCHAR(50) PRIMARY KEY,
      manifest_id VARCHAR(50) NOT NULL,
      chokepoint_id VARCHAR(50),
      priority_rank INTEGER,
      composite_score DECIMAL(6, 3),
      substitutability_score DECIMAL(6, 3),
      cover_clock_score DECIMAL(6, 3),
      degradation_clock_score DECIMAL(6, 3),
      carriage_fit_score DECIMAL(6, 3),
      allocated VARCHAR(1) DEFAULT 'N',
      requires_approval BOOLEAN DEFAULT FALSE,
      approval_status VARCHAR(30) DEFAULT 'pending',
      approved_by VARCHAR(100),
      approved_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(err => {
    if (!err.message.includes('already exists')) throw err;
  });

  // 4. Audit Log Table
  await executeQuery(`
    CREATE TABLE FLODA_AUDIT_LOG (
      log_id VARCHAR(50) PRIMARY KEY,
      ranking_id VARCHAR(50),
      action VARCHAR(60) NOT NULL,
      decision_rationale VARCHAR(1000),
      parameter_values VARCHAR(1000),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actor VARCHAR(100) NOT NULL
    )
  `).catch(err => {
    if (!err.message.includes('already exists')) throw err;
  });

  // 5. Inventory Plans
  await executeQuery(`
    CREATE TABLE FLODA_INVENTORY_PLANS (
      plan_id VARCHAR(50) PRIMARY KEY,
      chokepoint_id VARCHAR(50),
      commodity_type VARCHAR(120),
      recommended_safety_stock_delta INTEGER,
      rationale VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `).catch(err => {
    if (!err.message.includes('already exists')) throw err;
  });

  console.log('Tables initialized successfully. Checking schema objects:');
  const tables = await inspectSchema();
  console.log('Available tables in HANA:', tables.map(t => t.TABLE_NAME));
}

// Run directly if invoked
if (process.argv[1]?.endsWith('init-tables.js')) {
  try {
    await initializeHanaTables();
    console.log('DB initialization complete!');
  } catch (e) {
    console.error('Initialization error:', e);
    process.exit(1);
  }
}

import { executeQuery } from './hana.js';

export async function upgradeHanaSchema() {
  console.log('Upgrading SAP HANA Cloud schema HACKFEST0238 for multi-persona operations...');

  // Helper to safely execute DDL
  const safeExec = async (sql) => {
    try {
      await executeQuery(sql);
    } catch (err) {
      if (err.message && (err.message.includes('already exists') || err.message.includes('duplicate table name'))) {
        return; // table already exists
      }
      console.warn('DDL warning:', err.message);
    }
  };

  // 1. Users table
  await safeExec(`
    CREATE TABLE FLODA_USERS (
      user_id VARCHAR(50) PRIMARY KEY,
      employee_id VARCHAR(50),
      email VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      salt VARCHAR(64) NOT NULL,
      role VARCHAR(50) NOT NULL,
      full_name VARCHAR(100) NOT NULL,
      organization VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  try {
    await executeQuery(`ALTER TABLE FLODA_USERS ADD (employee_id VARCHAR(50))`);
  } catch {}

  // 2. Disruptions table
  await safeExec(`
    CREATE TABLE FLODA_DISRUPTIONS (
      disruption_id VARCHAR(50) PRIMARY KEY,
      disruption_type VARCHAR(60) NOT NULL,
      location VARCHAR(120) NOT NULL,
      corridor VARCHAR(120) NOT NULL,
      severity VARCHAR(30) NOT NULL,
      description VARCHAR(500),
      expected_duration_hours INTEGER,
      capacity_reduction_percent INTEGER,
      status VARCHAR(30) DEFAULT 'ACTIVE',
      created_by VARCHAR(100),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 3. Scenarios table
  await safeExec(`
    CREATE TABLE FLODA_SCENARIOS (
      scenario_id VARCHAR(50) PRIMARY KEY,
      disruption_id VARCHAR(50) NOT NULL,
      scenario_code VARCHAR(20) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description VARCHAR(1000),
      impact_summary VARCHAR(500),
      affected_shipments_count INTEGER,
      affected_inventory_count INTEGER,
      affected_vehicles_count INTEGER,
      estimated_recovery_hours INTEGER,
      risk_level VARCHAR(30),
      compliance_status VARCHAR(50),
      is_recommended BOOLEAN DEFAULT FALSE,
      status VARCHAR(30) DEFAULT 'PROPOSED',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 4. Recommendations table
  await safeExec(`
    CREATE TABLE FLODA_RECOMMENDATIONS (
      recommendation_id VARCHAR(50) PRIMARY KEY,
      disruption_id VARCHAR(50) NOT NULL,
      recommended_scenario_id VARCHAR(50),
      title VARCHAR(255) NOT NULL,
      rationale VARCHAR(1000),
      urgency VARCHAR(30) DEFAULT 'HIGH',
      status VARCHAR(30) DEFAULT 'PENDING_REVIEW',
      decision_id VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 5. Decisions table
  await safeExec(`
    CREATE TABLE FLODA_DECISIONS (
      decision_id VARCHAR(50) PRIMARY KEY,
      disruption_id VARCHAR(50) NOT NULL,
      recommendation_id VARCHAR(50),
      scenario_id VARCHAR(50),
      decision_type VARCHAR(30) NOT NULL,
      decided_by VARCHAR(100) NOT NULL,
      decided_by_role VARCHAR(50) NOT NULL,
      notes VARCHAR(1000),
      modifications VARCHAR(1000),
      decided_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 6. Tasks table
  await safeExec(`
    CREATE TABLE FLODA_TASKS (
      task_id VARCHAR(50) PRIMARY KEY,
      disruption_id VARCHAR(50),
      decision_id VARCHAR(50),
      assigned_role VARCHAR(50) NOT NULL,
      assigned_user VARCHAR(100),
      title VARCHAR(255) NOT NULL,
      description VARCHAR(1000),
      priority VARCHAR(30) DEFAULT 'HIGH',
      status VARCHAR(50) DEFAULT 'NEW',
      status_notes VARCHAR(1000),
      updated_by VARCHAR(100),
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. Notifications table
  await safeExec(`
    CREATE TABLE FLODA_NOTIFICATIONS (
      id VARCHAR(50) PRIMARY KEY,
      recipient_user VARCHAR(100),
      recipient_role VARCHAR(50) NOT NULL,
      event_type VARCHAR(60) NOT NULL,
      title VARCHAR(200) NOT NULL,
      message VARCHAR(1000) NOT NULL,
      severity VARCHAR(30) DEFAULT 'INFO',
      related_disruption_id VARCHAR(50),
      related_decision_id VARCHAR(50),
      read_status VARCHAR(10) DEFAULT 'UNREAD',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 8. Events stream table
  await safeExec(`
    CREATE TABLE FLODA_EVENTS (
      event_id VARCHAR(50) PRIMARY KEY,
      event_type VARCHAR(60) NOT NULL,
      entity_type VARCHAR(50),
      entity_id VARCHAR(50),
      message VARCHAR(500) NOT NULL,
      details VARCHAR(2000),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 9. Add columns to FLODA_AUDIT_LOG if missing
  const auditColumns = [
    `ALTER TABLE FLODA_AUDIT_LOG ADD (role VARCHAR(50) DEFAULT 'SYSTEM')`,
    `ALTER TABLE FLODA_AUDIT_LOG ADD (entity VARCHAR(50) DEFAULT 'RANKING')`,
    `ALTER TABLE FLODA_AUDIT_LOG ADD (entity_id VARCHAR(50))`,
    `ALTER TABLE FLODA_AUDIT_LOG ADD (previous_state VARCHAR(100))`,
    `ALTER TABLE FLODA_AUDIT_LOG ADD (new_state VARCHAR(100))`
  ];
  for (const alterSql of auditColumns) {
    try {
      await executeQuery(alterSql);
    } catch {
      // Column may already exist
    }
  }

  console.log('Schema upgrade complete in SAP HANA Cloud.');
}

if (process.argv[1]?.endsWith('schema-upgrade.js')) {
  try {
    await upgradeHanaSchema();
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Schema upgrade error:', err);
    process.exit(1);
  }
}

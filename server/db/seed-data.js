import { executeQuery } from './hana.js';

export async function seedHanaDatabase() {
  console.log('Seeding FLODA data into SAP HANA Cloud...');

  // Clear previous demo run data
  await executeQuery('DELETE FROM FLODA_RANKINGS');
  await executeQuery('DELETE FROM FLODA_AUDIT_LOG');
  await executeQuery('DELETE FROM FLODA_INVENTORY_PLANS');
  await executeQuery('DELETE FROM FLODA_MANIFESTS');
  await executeQuery('DELETE FROM FLODA_CHOKEPOINTS');

  // 1. Seed Initial Disruption (Nepal Supply Chain Corridor)
  const chokepointId = 'CP-NEPAL-001';
  await executeQuery(`
    INSERT INTO FLODA_CHOKEPOINTS 
    (chokepoint_id, location, chokepoint_type, severity, affected_routes, capacity_reduction_percent, estimated_resolution_hours, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP)
  `, [
    chokepointId,
    'Mugling-Narayanghat Highway (Nepal)',
    'landslide_blockage',
    'critical',
    'Kolkata-Raxaul-Birgunj-Kathmandu Trade Corridor',
    75,
    96
  ]);

  // Secondary Chokepoint
  await executeQuery(`
    INSERT INTO FLODA_CHOKEPOINTS 
    (chokepoint_id, location, chokepoint_type, severity, affected_routes, capacity_reduction_percent, estimated_resolution_hours, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', CURRENT_TIMESTAMP)
  `, [
    'CP-IND-001',
    'Nhava Sheva (JNPT) Mumbai',
    'port_congestion',
    'high',
    'India-Gulf Route, India-Europe Route',
    60,
    48
  ]);

  // 2. Seed Manifests (Cargo along Nepal & Indian Corridors)
  const manifests = [
    {
      id: 'MAN-NPL-101',
      commodity: 'Critical Pharmaceuticals & Vaccines',
      origin: 'Kolkata Port Depot',
      dest: 'Kathmandu Central Hospital',
      weight: 4200,
      vol: 18.5,
      sub: 0.05, // very hard to replace
      cover: 24, // 24 hours of cover remaining
      deg: 48,
      constraint: 'refrigerated',
      score: 0.945
    },
    {
      id: 'MAN-NPL-102',
      commodity: 'High-Altitude Emergency Heating Fuel',
      origin: 'Barauni Refinery (India)',
      dest: 'Pokhara Regional Depot',
      weight: 18500, // Heavy > 10,000kg -> Escalates to Human Review!
      vol: 24.0,
      sub: 0.15,
      cover: 36,
      deg: 720,
      constraint: 'hazmat', // Hazmat -> Escalates to Human Review!
      score: 0.890
    },
    {
      id: 'MAN-NPL-103',
      commodity: 'WHO Infant Nutrition Formula',
      origin: 'Birgunj Dry Port',
      dest: 'Lalitpur Distribution Hub',
      weight: 6500,
      vol: 22.0,
      sub: 0.10,
      cover: 48,
      deg: 120,
      constraint: 'temp-controlled',
      score: 0.865
    },
    {
      id: 'MAN-NPL-104',
      commodity: 'Disaster Relief Water Purification Units',
      origin: 'Raxaul Border Gateway',
      dest: 'Kathmandu Emergency Ops',
      weight: 8900,
      vol: 32.0,
      sub: 0.20,
      cover: 60,
      deg: 240,
      constraint: 'heavy_cargo',
      score: 0.810
    },
    {
      id: 'MAN-NPL-105',
      commodity: 'Surgical Equipment & Trauma Kits',
      origin: 'Delhi Air Cargo Hub',
      dest: 'Tribhuvan Teaching Hospital',
      weight: 3100,
      vol: 12.0,
      sub: 0.08,
      cover: 30,
      deg: 72,
      constraint: 'fragile',
      score: 0.795
    },
    {
      id: 'MAN-NPL-106',
      commodity: 'Telecom Grid Lithium Battery Backups',
      origin: 'Noida Tech Center',
      dest: 'Kathmandu Telecom Gateway',
      weight: 12400, // Heavy -> Human review
      vol: 28.0,
      sub: 0.35,
      cover: 72,
      deg: 360,
      constraint: 'hazmat',
      score: 0.740
    },
    {
      id: 'MAN-NPL-107',
      commodity: 'High-Priority Agro Fertilizers',
      origin: 'Haldia Port',
      dest: 'Terai Agricultural Commons',
      weight: 22000,
      vol: 45.0,
      sub: 0.50,
      cover: 120,
      deg: 720,
      constraint: 'none',
      score: 0.680
    },
    {
      id: 'MAN-NPL-108',
      commodity: 'Hydropower Transmission Spares',
      origin: 'Bhopal Engineering Plant',
      dest: 'Upper Trishuli Hydropower Site',
      weight: 15200,
      vol: 38.0,
      sub: 0.40,
      cover: 96,
      deg: 500,
      constraint: 'heavy_cargo',
      score: 0.645
    }
  ];

  for (const m of manifests) {
    await executeQuery(`
      INSERT INTO FLODA_MANIFESTS
      (manifest_id, commodity_type, origin, destination, weight_kg, volume_cbm, substitutability, cover_clock_hours, degradation_clock_hours, carriage_constraint, composite_score, status, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'QUEUED', CURRENT_TIMESTAMP)
    `, [
      m.id, m.commodity, m.origin, m.dest, m.weight, m.vol, m.sub, m.cover, m.deg, m.constraint, m.score
    ]);
  }

  // 3. Seed Rankings & Multi-Agent Allocations
  const rankings = [
    {
      id: 'RNK-001',
      manifest_id: 'MAN-NPL-101',
      rank: 1,
      score: 0.945,
      allocated: 'Y',
      requires_approval: false,
      status: 'approved',
      approver: 'AGENT_LOGISTICS_AUTO'
    },
    {
      id: 'RNK-002',
      manifest_id: 'MAN-NPL-102',
      rank: 2,
      score: 0.890,
      allocated: 'N',
      requires_approval: true, // Hazmat & Heavy -> Pending Human Review!
      status: 'pending',
      approver: null
    },
    {
      id: 'RNK-003',
      manifest_id: 'MAN-NPL-103',
      rank: 3,
      score: 0.865,
      allocated: 'Y',
      requires_approval: false,
      status: 'approved',
      approver: 'AGENT_LOGISTICS_AUTO'
    },
    {
      id: 'RNK-004',
      manifest_id: 'MAN-NPL-104',
      rank: 4,
      score: 0.810,
      allocated: 'Y',
      requires_approval: false,
      status: 'approved',
      approver: 'AGENT_LOGISTICS_AUTO'
    },
    {
      id: 'RNK-005',
      manifest_id: 'MAN-NPL-105',
      rank: 5,
      score: 0.795,
      allocated: 'Y',
      requires_approval: false,
      status: 'approved',
      approver: 'AGENT_LOGISTICS_AUTO'
    },
    {
      id: 'RNK-006',
      manifest_id: 'MAN-NPL-106',
      rank: 6,
      score: 0.740,
      allocated: 'N',
      requires_approval: true, // Hazmat -> Pending Review!
      status: 'pending',
      approver: null
    },
    {
      id: 'RNK-007',
      manifest_id: 'MAN-NPL-107',
      rank: 7,
      score: 0.680,
      allocated: 'Y',
      requires_approval: false,
      status: 'approved',
      approver: 'AGENT_LOGISTICS_AUTO'
    },
    {
      id: 'RNK-008',
      manifest_id: 'MAN-NPL-108',
      rank: 8,
      score: 0.645,
      allocated: 'N',
      requires_approval: true, // Heavy cargo (>10t) -> Pending Review!
      status: 'pending',
      approver: null
    }
  ];

  for (const r of rankings) {
    await executeQuery(`
      INSERT INTO FLODA_RANKINGS
      (ranking_id, manifest_id, chokepoint_id, priority_rank, composite_score, substitutability_score, cover_clock_score, degradation_clock_score, carriage_fit_score, allocated, requires_approval, approval_status, approved_by, approved_at, created_at)
      VALUES (?, ?, ?, ?, ?, 0.85, 0.90, 0.80, 0.75, ?, ?, ?, ?, ${r.status === 'approved' ? 'CURRENT_TIMESTAMP' : 'NULL'}, CURRENT_TIMESTAMP)
    `, [
      r.id, r.manifest_id, chokepointId, r.rank, r.score, r.allocated, r.requires_approval, r.status, r.approver
    ]);
  }

  // 4. Seed Audit Log Trail
  const auditEntries = [
    {
      id: 'LOG-001',
      ranking_id: 'RNK-001',
      action: 'AUTO_ALLOCATION_EXECUTED',
      rationale: 'Critical Vaccines: Priority rank 1, zero substitutability, cover clock < 24h. Rerouted via alternate Hetauda bypass.',
      actor: 'AGENT_LOGISTICS'
    },
    {
      id: 'LOG-002',
      ranking_id: 'RNK-002',
      action: 'ESCALATION_TRIGGERED',
      rationale: 'High-Altitude Fuel: Hazardous materials constraint (hazmat) with payload > 18 metric tons exceeds automated tunnel transit safety threshold.',
      actor: 'AGENT_COMPLIANCE'
    },
    {
      id: 'LOG-003',
      ranking_id: 'RNK-003',
      action: 'AUTO_ALLOCATION_EXECUTED',
      rationale: 'Infant Nutrition: Critical cover clock (48h). Green channel allocation approved for secondary mountain corridor dispatch.',
      actor: 'AGENT_LOGISTICS'
    },
    {
      id: 'LOG-004',
      ranking_id: 'RNK-006',
      action: 'ESCALATION_TRIGGERED',
      rationale: 'Lithium Battery Backups: Dual constraint flagged - Hazmat transport classification and shipment mass exceeding 10,000 kg.',
      actor: 'AGENT_COMPLIANCE'
    }
  ];

  for (const a of auditEntries) {
    await executeQuery(`
      INSERT INTO FLODA_AUDIT_LOG
      (log_id, ranking_id, action, decision_rationale, parameter_values, timestamp, actor)
      VALUES (?, ?, ?, ?, '{"algorithm":"multi_agent_shapley","fairness_epsilon":0.02}', CURRENT_TIMESTAMP, ?)
    `, [
      a.id, a.ranking_id, a.action, a.rationale, a.actor
    ]);
  }

  // 5. Seed Inventory Safety Stock Recommendations
  await executeQuery(`
    INSERT INTO FLODA_INVENTORY_PLANS
    (plan_id, chokepoint_id, commodity_type, recommended_safety_stock_delta, rationale, created_at)
    VALUES (?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
  `, [
    'PLAN-001',
    chokepointId,
    'Critical Pharmaceuticals & Vaccines',
    +35,
    'Landslide clearance on Mugling highway estimated at 96h. Recommended safety buffer increase for Kathmandu hospitals.'
  ]);

  console.log('Seed data successfully committed to SAP HANA Cloud!');
}

if (process.argv[1]?.endsWith('seed-data.js')) {
  try {
    await seedHanaDatabase();
    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

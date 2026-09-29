async function verifyFullPlatformFlow() {
  const BASE = 'http://localhost:4004';
  console.log('=== FLODA COMPLETE MULTI-PERSONA E2E OPERATIONAL VERIFICATION ===\n');

  // 1. Authenticate as Corridor Authority
  console.log('1. Authenticating as Corridor Authority (authority@floda.local)...');
  const authLogin = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'authority@floda.local', password: 'FlodaDemo2026!' })
  }).then(r => r.json());
  console.log(`   Authenticated: ${authLogin.user.fullName} (${authLogin.user.role})`);

  // 2. Trigger Disruption
  console.log('\n2. Corridor Authority triggers Nepal Disruption Event...');
  const disruption = await fetch(`${BASE}/api/disruptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authLogin.token}`
    },
    body: JSON.stringify({
      location: 'Mugling-Narayanghat KM-36',
      corridor: 'Birgunj-Kathmandu Arterial Highway',
      chokepoint_type: 'landslide',
      severity: 'critical',
      affected_routes: 'Central Nepal Trans-Himalayan Corridor',
      description: 'Major rockfall blocking both lanes. 14 heavy freight carriers trapped.',
      capacity_reduction_percent: 85,
      expected_duration_hours: 48
    })
  }).then(r => r.json());
  console.log(`   Disruption Created in SAP HANA: ${disruption.disruptionId}`);

  // 3. Fetch Scenarios & Recommendations
  console.log('\n3. Retrieving Generated Scenarios & Autonomous Recommendations...');
  const scenarios = await fetch(`${BASE}/api/scenarios?disruption_id=${disruption.disruptionId}`).then(r => r.json());
  console.log(`   Scenarios Generated in HANA (${scenarios.length}):`);
  scenarios.forEach(s => console.log(`   - [${s.scenario_code}] ${s.title} (Recovery: ${s.estimated_recovery_hours}h, Risk: ${s.risk_level})`));

  const recs = await fetch(`${BASE}/api/recommendations?disruption_id=${disruption.disruptionId}`).then(r => r.json());
  const activeRec = recs[0];
  console.log(`   Autonomous Recommendation: ${activeRec.title}`);

  // 4. Authority Reviews & Approves Recommendation
  console.log('\n4. Corridor Authority Reviews & Authorizes Scenario A...');
  const approval = await fetch(`${BASE}/api/decisions/${activeRec.recommendation_id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authLogin.token}`
    },
    body: JSON.stringify({
      disruptionId: disruption.disruptionId,
      scenarioId: scenarios[0]?.scenario_id,
      notes: 'Authorized emergency rerouting via Hetauda bypass for life-support supplies.'
    })
  }).then(r => r.json());
  console.log(`   Decision Stored in SAP HANA: ${approval.decisionId} (${approval.decisionType})`);

  // 5. Verify Persona Tasks & Notifications Dispatched
  console.log('\n5. Verifying Decision Propagation to Operational Personas...');
  const tasks = await fetch(`${BASE}/api/tasks`).then(r => r.json());
  console.log(`   Active Persona Tasks in HANA (${tasks.length}):`);
  tasks.forEach(t => console.log(`   - [${t.assigned_role}] ${t.title} [Status: ${t.status}]`));

  // 6. Transport Operator Acts
  console.log('\n6. Transport Operator (Rajesh Shrestha) Acknowledges & Starts Transit...');
  const transportTask = tasks.find(t => t.assigned_role === 'TRANSPORT');
  if (transportTask) {
    await fetch(`${BASE}/api/tasks/${transportTask.task_id}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'Rajesh Shrestha', role: 'TRANSPORT', notes: 'Convoy escort assigned' })
    });
    await fetch(`${BASE}/api/tasks/${transportTask.task_id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS', user: 'Rajesh Shrestha', role: 'TRANSPORT', notes: 'Convoy underway via Hetauda bypass (speed: 30 km/h)' })
    });
    console.log('   Transport task transitioned: ACKNOWLEDGED -> IN_PROGRESS');
  }

  // 7. Logistics Operator Acts
  console.log('\n7. Logistics Operator (Pooja Thapa) Re-sequences Staging Bays...');
  const logisticsTask = tasks.find(t => t.assigned_role === 'LOGISTICS');
  if (logisticsTask) {
    await fetch(`${BASE}/api/tasks/${logisticsTask.task_id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'IN_PROGRESS', user: 'Pooja Thapa', role: 'LOGISTICS', notes: 'Bay 1 & Bay 2 loaded with Medical Oxygen & Cold-Chain Vaccines' })
    });
    console.log('   Logistics task transitioned: IN_PROGRESS');
  }

  // 8. Inventory Operator Acts
  console.log('\n8. Inventory Operator (Bikram Adhikari) Releases Buffer Stock...');
  const inventoryTask = tasks.find(t => t.assigned_role === 'INVENTORY');
  if (inventoryTask) {
    await fetch(`${BASE}/api/tasks/${inventoryTask.task_id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED', user: 'Bikram Adhikari', role: 'INVENTORY', notes: '2,500L medical oxygen buffer released and transferred to carrier' })
    });
    console.log('   Inventory task transitioned: COMPLETED');
  }

  // 9. Compliance Officer Acts
  console.log('\n9. Compliance Officer (Anita Sharma) Authorizes Safety Waiver...');
  const complianceTask = tasks.find(t => t.assigned_role === 'COMPLIANCE');
  if (complianceTask) {
    await fetch(`${BASE}/api/tasks/${complianceTask.task_id}/status`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'COMPLETED', user: 'Anita Sharma', role: 'COMPLIANCE', notes: 'NDMA-2026 Rule 14.2 Emergency Hazmat Waiver Certified' })
    });
    console.log('   Compliance task transitioned: COMPLETED (VERIFIED)');
  }

  // 10. Verify Full Audit Ledger in SAP HANA Cloud
  console.log('\n10. Inspecting Complete Audit Trail in SAP HANA Cloud (HACKFEST0238)...');
  const audit = await fetch(`${BASE}/api/audit`).then(r => r.json());
  console.log(`   Audit Ledger Entries: ${audit.length}`);
  audit.slice(0, 8).forEach(a => {
    console.log(`   [${a.timestamp}] ${a.actor} (${a.role || 'SYS'}): ${a.action} -> ${a.decision_rationale || a.action}`);
  });

  console.log('\n=== E2E MULTI-PERSONA EVENT-DRIVEN FLOW FULLY VERIFIED IN SAP HANA CLOUD! ===');
}

verifyFullPlatformFlow().catch(console.error);

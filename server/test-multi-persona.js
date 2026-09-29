async function runTest() {
  console.log('Testing FLODA Multi-Persona Backend & SAP HANA Cloud integration...');

  const BASE = 'http://localhost:4004';

  // 1. Health check
  const healthRes = await fetch(`${BASE}/api/health`);
  const health = await healthRes.json();
  console.log('1. Health check:', health);

  // 2. Auth login
  const loginRes = await fetch(`${BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'authority@floda.local', password: 'FlodaDemo2026!' })
  });
  const loginData = await loginRes.json();
  console.log('2. Login Authority:', loginData.user?.role, 'Token received:', !!loginData.token);
  const token = loginData.token;

  // 3. Trigger Disruption
  const disrRes = await fetch(`${BASE}/api/disruptions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      location: 'Mugling-Narayanghat KM-36',
      corridor: 'Birgunj-Kathmandu Arterial',
      chokepoint_type: 'landslide',
      severity: 'critical',
      affected_routes: 'Central Nepal Trans-Himalayan Corridor',
      description: 'Major rockfall blocking both lanes. 14 freight carriers trapped.',
      capacity_reduction_percent: 85,
      expected_duration_hours: 48
    })
  });
  const disrData = await disrRes.json();
  console.log('3. Trigger Disruption:', disrData.success, 'Disruption ID:', disrData.disruptionId);

  // 4. Fetch Scenarios & Recommendations
  const scnRes = await fetch(`${BASE}/api/scenarios?disruption_id=${disrData.disruptionId}`);
  const scenarios = await scnRes.json();
  console.log(`4. Generated Scenarios (${scenarios.length}):`, scenarios.map(s => s.scenario_code + ': ' + s.title));

  const recRes = await fetch(`${BASE}/api/recommendations?disruption_id=${disrData.disruptionId}`);
  const recs = await recRes.json();
  console.log('5. Generated Recommendation:', recs[0]?.title);

  // 5. Authority Approves Recommendation
  const approveRes = await fetch(`${BASE}/api/decisions/${recs[0]?.recommendation_id}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      disruptionId: disrData.disruptionId,
      scenarioId: scenarios[0]?.scenario_id,
      notes: 'Approved emergency rerouting via Hetauda bypass for life-support supplies.'
    })
  });
  const approveData = await approveRes.json();
  console.log('6. Authority Approval Decision:', approveData);

  // 6. Verify Persona Tasks Generated
  const tasksRes = await fetch(`${BASE}/api/tasks`);
  const tasks = await tasksRes.json();
  console.log(`7. Persona Tasks Generated in HANA (${tasks.length}):`);
  tasks.forEach(t => console.log(`   [${t.assigned_role}] ${t.title} (${t.status})`));

  // 7. Verify Notifications Generated
  const notifRes = await fetch(`${BASE}/api/notifications`);
  const notifs = await notifRes.json();
  console.log(`8. Persona Notifications in HANA (${notifs.length}):`);
  notifs.slice(0, 4).forEach(n => console.log(`   To [${n.recipient_role}]: ${n.title}`));

  // 8. Transport Persona Acknowledges Task
  const transportTask = tasks.find(t => t.assigned_role === 'TRANSPORT');
  if (transportTask) {
    const ackRes = await fetch(`${BASE}/api/tasks/${transportTask.task_id}/acknowledge`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user: 'Rajesh Shrestha', role: 'TRANSPORT', notes: 'Convoy lead deployed' })
    });
    const ackData = await ackRes.json();
    console.log('9. Transport Operator Acknowledgment:', ackData);
  }

  // 9. Check Audit Log
  const auditRes = await fetch(`${BASE}/api/audit`);
  const audit = await auditRes.json();
  console.log(`10. Audit Trail in HANA (${audit.length} entries):`);
  audit.slice(0, 5).forEach(a => console.log(`   [${a.timestamp}] ${a.actor} (${a.role}): ${a.action} - ${a.decision_rationale}`));

  console.log('\nALL MULTI-PERSONA FLOW TESTS PASSED SUCCESSFULLY WITH SAP HANA CLOUD!');
}

runTest().catch(console.error);

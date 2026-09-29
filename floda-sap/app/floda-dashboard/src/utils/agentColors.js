export const statusStyle={approved:'success',allocated:'success',pending:'warning',rejected:'danger',neutral:'neutral'}; 
export const agentLabel = (a) => {
  if (!a) return 'System';
  if (a.includes('IOT-') || a.includes('Autonomous Sensor') || a.includes('TELEMETRY')) return 'IoT Sensor Telemetry';
  if (a.includes('AGENT_LOGISTICS')) return 'Logistics Agent';
  if (a.includes('AGENT_COMPLIANCE')) return 'Compliance Agent';
  if (a.includes('SENSING') || a.includes('DISRUPTION')) return 'Disruption Sensing';
  if (a.includes('REROUTING')) return 'Rerouting Agent';
  if (a.includes('HUMAN')) return 'Authority Reviewer';
  // If it's a real person's name or officer ID, display their name directly
  return a;
};

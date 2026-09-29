import { Activity, BrainCircuit, Route, ShieldCheck, UserCheck, Bot } from 'lucide-react';
import { Card } from '../../components/ui';
import StatTile from '../../components/common/StatTile';
import { pct, score } from '../../utils/formatters';

export default function AgentsCard({ rankings, audit }) {
  const rows = rankings || [];
  const auto = rows.filter(row => row.allocated === 'Y').length;
  const latest = (audit || []).find(row => row.actor?.includes('HUMAN'));

  const hasEvaluations = rows.length > 0;
  const hasApprovalsPending = rows.some(row => row.allocated === 'N');
  const hasAuditLogs = (audit || []).length > 0;

  const agents = [
    { label: 'Disruption Sensing', Icon: Activity, active: hasEvaluations },
    { label: 'Scenario Planning', Icon: BrainCircuit, active: hasEvaluations },
    { label: 'Rerouting & Logistics', Icon: Route, active: auto > 0 },
    { label: 'Compliance & Audit', Icon: ShieldCheck, active: hasAuditLogs },
    { label: 'Human-in-the-Loop', Icon: UserCheck, active: hasApprovalsPending || Boolean(latest) }
  ];

  const activeCount = agents.filter(a => a.active).length;

  return (
    <Card className="card--agents">
      <div className="card-title">
        <span className="card-title-label">
          <span className="title-icon-badge"><Bot size={15} /></span>
          Agent Network
        </span>
        <small className="badge-subtle">{activeCount} of {agents.length} Active Nodes</small>
      </div>

      <div className="stat-grid">
        <StatTile label="AUTO-EXECUTION" value={pct(rows.length ? auto / rows.length : 0)} />
        <StatTile label="ESCALATION" value={pct(rows.length ? (rows.length - auto) / rows.length : 0)} />
        <StatTile
          label="AVG SCORE"
          value={score(rows.reduce((sum, row) => sum + Number(row.composite_score || 0), 0) / (rows.length || 1))}
        />
      </div>

      <div className="agent-icons">
        {agents.map(({ label, Icon, active }) => (
          <div key={label} className={`agent-badge-pill ${active ? 'active' : ''}`} title={label}>
            <Icon size={16} />
            <span className="agent-pill-label">{label.split(' ')[0]}</span>
          </div>
        ))}
      </div>

      <div className="reviewer">
        <div className="reviewer-avatar">
          <UserCheck size={16} />
        </div>
        <div className="reviewer-content">
          <b>{latest ? 'Latest Reviewer Action' : 'Awaiting Reviewer Intervention'}</b>
          <small>{latest?.decision_rationale || 'High-stakes allocations will require explicit approval before dispatch.'}</small>
        </div>
      </div>
    </Card>
  );
}


import { Activity, BrainCircuit, Route, ShieldCheck, RefreshCw, CheckCircle } from 'lucide-react';

const nodes = [
  { step: '01', name: 'Disruption Sensing', Icon: Activity, desc: 'Real-time telemetry' },
  { step: '02', name: 'Scenario Planning', Icon: BrainCircuit, desc: 'Multi-party solver' },
  { step: '03', name: 'Rerouting & Logistics', Icon: Route, desc: 'Dynamic carrier dispatch' },
  { step: '04', name: 'Compliance & Audit', Icon: ShieldCheck, desc: 'Policy validation' }
];

export default function AgentPipeline({ latest, pending, auto, onRefresh }) {
  const hasDisruption = Boolean(latest);

  return (
    <section className="pipeline" aria-label="Autonomous agent orchestration pipeline">
      <div className="pipeline-top">
        <div className="pipeline-status-badge">
          <span className={`status-dot ${hasDisruption ? 'active' : 'idle'}`} />
          <span className="pipeline-status-title">
            {hasDisruption ? `${latest.location} · ${latest.chokepoint_type.replace('_', ' ')}` : 'System Standby · Awaiting Disruption Telemetry'}
          </span>
        </div>

        <div className="pipeline-actions">
          <button
            type="button"
            className="pipeline-btn"
            aria-label="Refresh pipeline telemetry"
            title="Refresh telemetry"
            onClick={onRefresh}
          >
            <RefreshCw size={14} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      <div className="nodes">
        {nodes.map(({ step, name, Icon, desc }, index) => (
          <div className="node-wrap" key={name}>
            <div className="node-box">
              <span className="node-step">STAGE {step}</span>
              <div className="node-icon-wrapper">
                <Icon size={20} strokeWidth={2.2} />
              </div>
              <strong className="node-name">{name}</strong>
              <small className="node-desc">{desc}</small>
            </div>
            {index < nodes.length - 1 && (
              <div className="node-connector" aria-hidden="true">
                <div className="connector-line" />
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="pipeline-foot">
        <div className="pipeline-metric-pill">
          <CheckCircle size={14} className="text-emerald" />
          <span><b>{auto}</b> auto-executed</span>
        </div>
        <div className="pipeline-metric-divider" />
        <div className="pipeline-metric-pill">
          <span className="dot-amber" />
          <span><b>{pending}</b> pending human-in-the-loop review</span>
        </div>
      </div>
    </section>
  );
}


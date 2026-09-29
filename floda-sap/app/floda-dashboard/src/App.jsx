import { useQuery } from '@tanstack/react-query';
import { Toaster } from 'sonner';
import AppShell from './components/layout/AppShell';
import AppHeader from './components/layout/AppHeader';
import AgentPipeline from './features/agent-pipeline/AgentPipeline';
import RankingsTable from './features/rankings/RankingsTable';
import AgentsCard from './features/agents-summary/AgentsCard';
import LatestDisruptionCard from './features/disruption-summary/LatestDisruptionCard';
import ApprovalQueue from './features/approvals/ApprovalQueue';
import AuditLogPanel from './features/audit-trail/AuditLogPanel';
import DisruptionDialog from './features/disruption-simulator/DisruptionDialog';
import DisruptionStatusPipeline from './features/disruption-operations/DisruptionStatusPipeline';
import LiveEventStream from './features/disruption-operations/LiveEventStream';
import RecommendationCard from './features/disruption-operations/RecommendationCard';
import TransportView from './features/persona-views/TransportView';
import LogisticsView from './features/persona-views/LogisticsView';
import InventoryView from './features/persona-views/InventoryView';
import ComplianceView from './features/persona-views/ComplianceView';
import LoginPage from './features/auth/LoginPage';
import { useRankings } from './features/rankings/useRankings';
import { useApprovals } from './features/approvals/useApprovals';
import { useAuditLog } from './features/audit-trail/useAuditLog';
import { useLatestChokepoint } from './features/disruption-summary/useLatestChokepoint';
import { flodaApi } from './services/flodaApi';
import { useUiStore } from './store/uiStore';
import { usePersonaStore } from './store/personaStore';
import { useFlodaEvents } from './hooks/useFlodaEvents';

function App() {
  const activeSection = useUiStore(state => state.activeSection);
  const dialogOpen = useUiStore(state => state.dialogOpen);
  const setDialogOpen = useUiStore(state => state.setDialogOpen);

  const { currentUser, isAuthenticated } = usePersonaStore();

  // Connect to Real-Time Server-Sent Events stream when authenticated
  useFlodaEvents(currentUser?.role);

  const rankings = useRankings();
  const approvals = useApprovals();
  const audit = useAuditLog();
  const chokepoints = useLatestChokepoint();

  const manifests = useQuery({ queryKey: ['manifests'], queryFn: flodaApi.manifests });
  const health = useQuery({ queryKey: ['health'], queryFn: flodaApi.health, refetchInterval: 15000 });

  const disruptions = useQuery({ queryKey: ['disruptions'], queryFn: flodaApi.disruptions, refetchInterval: 5000 });
  const tasks = useQuery({ queryKey: ['tasks'], queryFn: () => flodaApi.tasks(), refetchInterval: 5000 });

  const rankingRows = rankings.data || [];
  const approvalRows = approvals.data || [];
  const activeDisruption = (disruptions.data || []).find(d => d.status !== 'RESOLVED');

  const refreshAll = () => {
    rankings.refetch();
    approvals.refetch();
    audit.refetch();
    chokepoints.refetch();
    manifests.refetch();
    health.refetch();
    disruptions.refetch();
    tasks.refetch();
  };

  const closeSimulator = () => {
    setDialogOpen(false);
  };

  // Authority Overview
  const authorityOverview = (
    <>
      <div className="intro">
        <div>
          <p className="intro-eyebrow">AUTONOMOUS CORRIDOR RESILIENCE · SUPREME COMMAND</p>
          <h1 className="intro-title">Federated Logistics Operations</h1>
          <span className="intro-subtitle">
            Executive authority control under real-time Nepal supply-chain disruptions. Decisions are cryptographically propagated across all operational stakeholders.
          </span>
        </div>
        <div
          className={`live-connection-badge ${health.data?.connected ? 'connected' : health.isError ? 'error' : ''}`}
          title={health.data?.connected ? `SAP HANA Cloud Connected · ${health.data.database}` : 'Connecting to SAP HANA Cloud...'}
        >
          <span className={`live-pulse-dot ${health.data?.connected ? 'active' : health.isError ? 'error' : ''}`} />
          <span>
            {health.data?.connected
              ? 'SAP Secure Ledger Active'
              : health.isError
              ? 'Ledger Disconnected'
              : 'Verifying Connection...'}
          </span>
        </div>
      </div>

      {/* Disruption Response Matrix (when disruption active) */}
      {activeDisruption && (
        <DisruptionStatusPipeline
          disruption={activeDisruption}
          tasks={tasks.data || []}
          isAuthority={currentUser?.role === 'AUTHORITY'}
        />
      )}

      {/* Active Autonomous Recommendation for Authority */}
      {activeDisruption && (
        <RecommendationCard disruption={activeDisruption} />
      )}

      <div className="kpi-ribbon">
        <div className="kpi-card">
          <span className="kpi-label">EVALUATED MANIFESTS</span>
          <div className="kpi-value-row">
            <strong className="kpi-val">{rankingRows.length}</strong>
            <span className="kpi-tag success">Live Active</span>
          </div>
          <small className="kpi-meta">
            {manifests.data?.length ? `${new Set((manifests.data || []).map(m => m.corridor || 'Birgunj-Kathmandu')).size} Active Corridors` : 'Corridor Stream Active'}
          </small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">AUTO-DISPATCH RATE</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-emerald">
              {rankingRows.length ? Math.round((rankingRows.filter(r => r.allocated === 'Y').length / rankingRows.length) * 100) : 0}%
            </strong>
            <span className="kpi-tag neutral">Autonomous</span>
          </div>
          <small className="kpi-meta">
            {rankingRows.filter(r => r.allocated === 'Y').length} automated allocations
          </small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">HUMAN REVIEW QUEUE</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-amber">{approvalRows.length}</strong>
            <span className="kpi-tag warning">Awaiting Action</span>
          </div>
          <small className="kpi-meta">
            {approvalRows.length === 0 ? 'No policy escalations' : `${approvalRows.length} critical guardrail alerts`}
          </small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">FAIRNESS AUDIT TRAIL</span>
          <div className="kpi-value-row">
            <strong className="kpi-val">{audit.data?.length || 0}</strong>
            <span className="kpi-tag info">Immutable</span>
          </div>
          <small className="kpi-meta">
            Enterprise Audit Ledger
          </small>
        </div>
      </div>

      <AgentPipeline
        latest={chokepoints.data?.[0]}
        pending={approvalRows.length}
        auto={rankingRows.filter(row => row.allocated === 'Y').length}
        onRefresh={refreshAll}
      />

      <div className="overview-layout">
        <div className="overview-col-left">
          <RankingsTable query={rankings} manifests={manifests.data} />
          <ApprovalQueue rows={approvalRows} manifests={manifests.data} />
        </div>
        <div className="overview-col-right">
          <AgentsCard rankings={rankingRows} audit={audit.data} />
          <LatestDisruptionCard item={chokepoints.data?.[0]} />
          <LiveEventStream />
        </div>
      </div>
    </>
  );

  const focusedApprovals = (
    <section className="focused-section">
      <div className="intro">
        <div>
          <p className="intro-eyebrow">HUMAN-IN-THE-LOOP CONTROL</p>
          <h1 className="intro-title">Approval Queue</h1>
          <span className="intro-subtitle">Review escalated allocations and enforce policy compliance prior to carrier dispatch.</span>
        </div>
      </div>
      <ApprovalQueue rows={approvalRows} manifests={manifests.data} />
    </section>
  );

  const focusedAudit = (
    <section className="focused-section">
      <div className="intro">
        <div>
          <p className="intro-eyebrow">COMPLIANCE & GOVERNANCE</p>
          <h1 className="intro-title">Decision Audit Trail</h1>
          <span className="intro-subtitle">Immutable log of autonomous agent proposals and reviewer authorizations in SAP HANA Cloud.</span>
        </div>
      </div>
      <AuditLogPanel query={audit} />
    </section>
  );

  const focusedEvents = (
    <section className="focused-section">
      <div className="intro">
        <div>
          <p className="intro-eyebrow">REAL-TIME ORCHESTRATION</p>
          <h1 className="intro-title">Live Operational Event Stream</h1>
          <span className="intro-subtitle">Real-time telemetry and state changes recorded directly into SAP HANA Cloud.</span>
        </div>
      </div>
      <LiveEventStream />
    </section>
  );

  // If not authenticated, render the secure Login portal
  if (!isAuthenticated || !currentUser) {
    return (
      <div className="login-root-container">
        <LoginPage />
        <Toaster richColors position="top-right" />
      </div>
    );
  }

  // Content selection based on active section and persona role
  let content;

  if (activeSection === 'audit' && currentUser?.role === 'AUTHORITY') {
    content = focusedAudit;
  } else if (activeSection === 'events') {
    content = focusedEvents;
  } else if (activeSection === 'approvals' && currentUser?.role === 'AUTHORITY') {
    content = focusedApprovals;
  } else if (currentUser?.role === 'TRANSPORT') {
    content = <TransportView currentUser={currentUser} />;
  } else if (currentUser?.role === 'LOGISTICS') {
    content = <LogisticsView currentUser={currentUser} />;
  } else if (currentUser?.role === 'INVENTORY') {
    content = <InventoryView currentUser={currentUser} />;
  } else if (currentUser?.role === 'COMPLIANCE') {
    content = <ComplianceView currentUser={currentUser} />;
  } else {
    content = authorityOverview;
  }

  return (
    <AppShell>
      <AppHeader
        pending={approvalRows.length}
        manifests={manifests.data || []}
        onOpen={() => setDialogOpen(true)}
      />
      <div className="content">
        {content}
      </div>
      <DisruptionDialog open={dialogOpen} onClose={closeSimulator} />
      <Toaster richColors position="top-right" />
    </AppShell>
  );
}

export default App;

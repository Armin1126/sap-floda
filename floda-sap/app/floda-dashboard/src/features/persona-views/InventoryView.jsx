import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Warehouse, CheckCircle2, Clock, Boxes, AlertTriangle, ArrowRightLeft, ShieldCheck } from 'lucide-react';
import { flodaApi } from '../../services/flodaApi';
import { Button } from '../../components/ui';
import { toast } from 'sonner';

export default function InventoryView({ currentUser }) {
  const queryClient = useQueryClient();
  const [taskTab, setTaskTab] = useState('active'); // 'active' | 'completed' | 'all'

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'INVENTORY'],
    queryFn: () => flodaApi.tasks('INVENTORY'),
    refetchInterval: 5000
  });

  const { data: chokepoints = [] } = useQuery({
    queryKey: ['chokepoints'],
    queryFn: flodaApi.chokepoints
  });

  const { data: manifests = [] } = useQuery({
    queryKey: ['manifests'],
    queryFn: flodaApi.manifests
  });

  const { data: disruptions = [] } = useQuery({
    queryKey: ['disruptions'],
    queryFn: flodaApi.disruptions
  });

  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

  const displayedTasks = taskTab === 'active'
    ? activeTasks
    : taskTab === 'completed'
    ? completedTasks
    : tasks;

  const activeChokepoint = chokepoints[0];
  const activeDisruption = disruptions.find(d => d.status === 'ACTIVE' || d.status === 'MITIGATING') || disruptions[0];
  const capLoss = Number(activeChokepoint?.capacity_reduction_percent || activeDisruption?.capacity_reduction_percent || 0);

  // Dynamic Days of Cover calculated live from HANA disruption telemetry
  const criticalCoverDays = capLoss > 0
    ? Math.max(0.4, (4.5 * (1 - capLoss / 100))).toFixed(1)
    : '4.5';

  const acknowledgeMutation = useMutation({
    mutationFn: ({ taskId, notes }) =>
      flodaApi.acknowledgeTask(taskId, {
        notes,
        user: currentUser?.fullName || 'Inventory Lead',
        role: 'INVENTORY'
      }),
    onSuccess: () => {
      toast.success('Inventory instruction acknowledged. Stock release initiated.');
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status, notes }) =>
      flodaApi.updateTaskStatus(taskId, {
        status,
        notes,
        user: currentUser?.fullName || 'Inventory Lead',
        role: 'INVENTORY'
      }),
    onSuccess: (data) => {
      toast.success(`Inventory status updated: ${data.status.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err) => toast.error(err.message)
  });

  // Calculate dynamic regional depot levels
  const hospitalDoc = Number(criticalCoverDays);
  const regionalDoc = capLoss > 0 ? Math.max(1.8, (6.0 * (1 - capLoss / 150))).toFixed(1) : '6.0';
  const stagingDoc = '14.0';

  return (
    <div className="persona-view-container">
      <div className="intro">
        <div>
          <p className="intro-eyebrow">STRATEGIC WAREHOUSING & BUFFER RESERVES</p>
          <h1 className="intro-title">Inventory Operations Control</h1>
          <span className="intro-subtitle">
            Monitor hospital days-of-cover clocks, execute strategic inventory pre-positioning, and release regional emergency safety stock.
          </span>
        </div>
        <div className="persona-badge-tag inventory">
          <Warehouse size={14} />
          <span>Manager: {currentUser?.fullName} ({currentUser?.org})</span>
        </div>
      </div>

      <div className="kpi-ribbon mb-4">
        <div className="kpi-card">
          <span className="kpi-label">DESTINATION DAYS OF COVER</span>
          <div className="kpi-value-row">
            <strong className={`kpi-val ${hospitalDoc < 2 ? 'text-rose' : 'text-emerald'}`}>
              {hospitalDoc} Days
            </strong>
            <span className={`kpi-tag ${hospitalDoc < 2 ? 'danger' : 'success'}`}>
              {hospitalDoc < 2 ? 'Critical Shortage' : 'Adequate Cover'}
            </span>
          </div>
          <small className="kpi-meta">
            {activeChokepoint ? `Impacted by ${activeChokepoint.location} (-${capLoss}% cap)` : 'Normal consumption rate'}
          </small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">ACTIVE TRANSFER ORDERS</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-violet">{activeTasks.length}</strong>
            <span className="kpi-tag success">{completedTasks.length} Completed</span>
          </div>
          <small className="kpi-meta">{tasks.length} total orders from Corridor Authority</small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">MONITORED CARGO BUFFER</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-amber">{manifests.length} Units</strong>
            <span className="kpi-tag warning">Active Pipeline</span>
          </div>
          <small className="kpi-meta">Across Regional Depots</small>
        </div>
      </div>

      <div className="persona-grid-two">
        {/* Left: Assigned Inventory Tasks */}
        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title">Assigned Pre-Positioning & Transfer Orders</h3>
            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${taskTab === 'active' ? 'active' : ''}`}
                onClick={() => setTaskTab('active')}
              >
                Active ({activeTasks.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${taskTab === 'completed' ? 'active' : ''}`}
                onClick={() => setTaskTab('completed')}
              >
                Completed ({completedTasks.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${taskTab === 'all' ? 'active' : ''}`}
                onClick={() => setTaskTab('all')}
              >
                All ({tasks.length})
              </button>
            </div>
          </div>

          <div className="task-cards-list">
            {displayedTasks.length === 0 ? (
              <div className="empty-state-box">
                <CheckCircle2 size={24} className="text-emerald mb-2" />
                <p>
                  {taskTab === 'completed'
                    ? 'No completed inventory pre-positioning records in the archive.'
                    : 'No pending pre-positioning orders. Standard warehouse safety buffers operating normally.'}
                </p>
              </div>
            ) : (
              displayedTasks.map((task) => {
                const isNew = task.status === 'NEW';
                const isAck = task.status === 'ACKNOWLEDGED';
                const isInProgress = task.status === 'IN_PROGRESS';
                const isCompleted = task.status === 'COMPLETED';

                return (
                  <div key={task.task_id} className={`operational-task-card status-${task.status.toLowerCase()}`}>
                    <div className="task-header-row">
                      <span className={`priority-tag ${task.priority.toLowerCase()}`}>{task.priority}</span>
                      <span className="task-status-pill">{task.status.replace('_', ' ')}</span>
                    </div>

                    <h4 className="task-title">{task.title}</h4>
                    <p className="task-desc">{task.description}</p>

                    {task.status_notes && (
                      <div className="task-notes-callout">
                        <small>Depot Telemetry: {task.status_notes}</small>
                      </div>
                    )}

                    <div className="task-actions-row">
                      {isNew && (
                        <Button
                          variant="primary"
                          disabled={acknowledgeMutation.isPending}
                          onClick={() => acknowledgeMutation.mutate({
                            taskId: task.task_id,
                            notes: `Acknowledged by ${currentUser?.fullName || 'Inventory Lead'}. Unsealing emergency reserve vault.`
                          })}
                        >
                          <CheckCircle2 size={14} />
                          <span>Acknowledge Transfer Request</span>
                        </Button>
                      )}

                      {isAck && (
                        <Button
                          variant="primary"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({
                            taskId: task.task_id,
                            status: 'IN_PROGRESS',
                            notes: `Emergency stocks decanted and staged for inter-hub transport conveyance.`
                          })}
                        >
                          <Boxes size={14} />
                          <span>Begin Stock Transfer Preparation</span>
                        </Button>
                      )}

                      {isInProgress && (
                        <Button
                          variant="primary"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({
                            taskId: task.task_id,
                            status: 'COMPLETED',
                            notes: `Emergency reserves released, loaded, and custody transferred to fleet carrier.`
                          })}
                        >
                          <CheckCircle2 size={14} />
                          <span>Confirm Dispatch & Stock Released</span>
                        </Button>
                      )}

                      {isCompleted && (
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-emerald text-sm font-semibold flex items-center gap-1">
                            <CheckCircle2 size={14} /> Transferred & Persisted in SAP HANA
                          </span>
                          {task.updated_at && (
                            <small className="text-xs text-secondary flex items-center gap-1">
                              <Clock size={11} /> Completed at {new Date(task.updated_at).toLocaleTimeString()} by {task.updated_by || 'Inventory Lead'}
                            </small>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Days of Cover / Strategic Depots */}
        <div className="card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Regional Days of Cover (DoC) Risk Monitor</h3>
              <p className="text-xs text-secondary mt-0.5">Live stock depletion calculated via SAP HANA telemetry</p>
            </div>
            {capLoss > 0 && (
              <span className="badge-count text-rose">
                <AlertTriangle size={12} className="inline mr-1" />
                -{capLoss}% Disruption
              </span>
            )}
          </div>

          <div className="doc-meters-list">
            <div className="doc-meter-item">
              <div className="doc-meta-row">
                <strong className="text-sm">Kathmandu Valley Destination DC (Medical & Cryo)</strong>
                <span className={`${hospitalDoc < 2 ? 'text-rose font-bold' : 'text-emerald font-bold'}`}>
                  {hospitalDoc} Days Remaining
                </span>
              </div>
              <div className="doc-progress-bar">
                <div
                  className={`doc-progress-fill ${hospitalDoc < 2 ? 'critical' : hospitalDoc < 4 ? 'warning' : 'safe'}`}
                  style={{ width: `${Math.min(100, Math.max(10, (hospitalDoc / 5.0) * 100))}%` }}
                />
              </div>
              <small className="text-secondary text-xs">
                {hospitalDoc < 2 ? '⚠️ Emergency escalation threshold exceeded (< 2.0 days)' : '✓ Stable replenishment threshold'}
              </small>
            </div>

            <div className="doc-meter-item mt-3">
              <div className="doc-meta-row">
                <strong className="text-sm">Pokhara & Narayanghat Strategic Buffer Hub</strong>
                <span className={`${Number(regionalDoc) < 3 ? 'text-amber font-bold' : 'text-emerald font-bold'}`}>
                  {regionalDoc} Days Remaining
                </span>
              </div>
              <div className="doc-progress-bar">
                <div
                  className={`doc-progress-fill ${Number(regionalDoc) < 3 ? 'warning' : 'safe'}`}
                  style={{ width: `${Math.min(100, Math.max(20, (Number(regionalDoc) / 7.0) * 100))}%` }}
                />
              </div>
              <small className="text-secondary text-xs">Pre-positioning available for rapid inter-hub transfer</small>
            </div>

            <div className="doc-meter-item mt-3">
              <div className="doc-meta-row">
                <strong className="text-sm">Birgunj Border Inland Transshipment Depot</strong>
                <span className="text-emerald font-bold">{stagingDoc} Days Stock</span>
              </div>
              <div className="doc-progress-bar">
                <div className="doc-progress-fill safe" style={{ width: '92%' }} />
              </div>
              <small className="text-secondary text-xs">Surplus strategic reserve available for corridor re-allocation</small>
            </div>
          </div>

          <div className="mt-4 p-3 bg-subtle rounded-md border border-subtle">
            <h4 className="text-xs font-bold uppercase text-secondary tracking-wider mb-1 flex items-center gap-1.5">
              <ArrowRightLeft size={13} className="text-brand" />
              Depot Buffer Protocol
            </h4>
            <p className="text-xs text-secondary leading-relaxed">
              When corridor throughput drops &gt;50%, autonomous triggers recommend transferring safety stock from Birgunj and Narayanghat to maintain minimum 48-hour life-support cover in Kathmandu hospitals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}


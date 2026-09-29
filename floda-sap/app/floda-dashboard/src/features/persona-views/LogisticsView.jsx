import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, CheckCircle2, Boxes, Clock } from 'lucide-react';
import { flodaApi } from '../../services/flodaApi';
import { Button } from '../../components/ui';
import { toast } from 'sonner';

export default function LogisticsView({ currentUser }) {
  const queryClient = useQueryClient();
  const [taskTab, setTaskTab] = useState('active'); // 'active' | 'completed' | 'all'

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'LOGISTICS'],
    queryFn: () => flodaApi.tasks('LOGISTICS'),
    refetchInterval: 5000
  });

  const { data: manifests = [] } = useQuery({
    queryKey: ['manifests'],
    queryFn: flodaApi.manifests
  });

  const { data: rankings = [] } = useQuery({
    queryKey: ['rankings'],
    queryFn: flodaApi.rankings
  });

  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

  const displayedTasks = taskTab === 'active'
    ? activeTasks
    : taskTab === 'completed'
    ? completedTasks
    : tasks;

  const rankingMap = new Map((rankings || []).map(r => [r.manifest_id, r]));

  const acknowledgeMutation = useMutation({
    mutationFn: ({ taskId, notes }) =>
      flodaApi.acknowledgeTask(taskId, {
        notes,
        user: currentUser?.fullName || 'Logistics Lead',
        role: 'LOGISTICS'
      }),
    onSuccess: () => {
      toast.success('Logistics instruction acknowledged. Bay re-sequencing initiated.');
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
        user: currentUser?.fullName || 'Logistics Lead',
        role: 'LOGISTICS'
      }),
    onSuccess: (data) => {
      toast.success(`Logistics status updated: ${data.status.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err) => toast.error(err.message)
  });

  return (
    <div className="persona-view-container">
      <div className="intro">
        <div>
          <p className="intro-eyebrow">DISTRIBUTION & ALLOCATION CONTROL</p>
          <h1 className="intro-title">Logistics Operations Control</h1>
          <span className="intro-subtitle">
            Manage cargo prioritisation, re-sequence loading bay dispatch, and synchronize shipment handoffs under corridor disruption.
          </span>
        </div>
        <div className="persona-badge-tag logistics">
          <Package size={14} />
          <span>Coordinator: {currentUser?.fullName} ({currentUser?.org})</span>
        </div>
      </div>

      <div className="kpi-ribbon mb-4">
        <div className="kpi-card">
          <span className="kpi-label">ACTIVE INSTRUCTIONS</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-violet">{activeTasks.length}</strong>
            <span className="kpi-tag info">{completedTasks.length} Done</span>
          </div>
          <small className="kpi-meta">{tasks.length} total orders from Corridor Authority</small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">EVALUATED MANIFESTS</span>
          <div className="kpi-value-row">
            <strong className="kpi-val">{manifests.length}</strong>
            <span className="kpi-tag neutral">{rankings.filter(r => r.allocated === 'Y').length} Auto-Staged</span>
          </div>
          <small className="kpi-meta">Across active transshipment hubs</small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">HIGH-PRIORITY SHIPMENTS</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-emerald">
              {manifests.filter(m => m.carriage_constraint === 'hazmat' || m.carriage_constraint === 'reefer' || m.carriage_constraint === 'temp-controlled').length}
            </strong>
            <span className="kpi-tag warning">Hazmat / Cold-Chain</span>
          </div>
          <small className="kpi-meta">Priority Dispatch Lane</small>
        </div>
      </div>

      <div className="persona-grid-two">
        {/* Left: Assigned Tasks */}
        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title">Assigned Logistics Instructions</h3>
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
                    ? 'No completed staging instructions in the archive yet.'
                    : 'No pending logistics tasks. Standard staging operating normally.'}
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
                        <small>Latest Yard Update: {task.status_notes}</small>
                      </div>
                    )}

                    <div className="task-actions-row">
                      {isNew && (
                        <Button
                          variant="primary"
                          disabled={acknowledgeMutation.isPending}
                          onClick={() => acknowledgeMutation.mutate({
                            taskId: task.task_id,
                            notes: `Acknowledged by ${currentUser?.fullName || 'Logistics Lead'}. Priority bay loading assigned.`
                          })}
                        >
                          <CheckCircle2 size={14} />
                          <span>Acknowledge Order</span>
                        </Button>
                      )}

                      {isAck && (
                        <Button
                          variant="primary"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({
                            taskId: task.task_id,
                            status: 'IN_PROGRESS',
                            notes: `Cargo staged at priority loading bays for expedited corridor clearance.`
                          })}
                        >
                          <Boxes size={14} />
                          <span>Begin Bay Staging</span>
                        </Button>
                      )}

                      {isInProgress && (
                        <Button
                          variant="primary"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({
                            taskId: task.task_id,
                            status: 'COMPLETED',
                            notes: `Manifests verified, loaded, and cleared outbound staging gates.`
                          })}
                        >
                          <CheckCircle2 size={14} />
                          <span>Complete Loading & Dispatch</span>
                        </Button>
                      )}

                      {isCompleted && (
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-emerald text-sm font-semibold flex items-center gap-1">
                            <CheckCircle2 size={14} /> Staged & Recorded in SAP HANA
                          </span>
                          {task.updated_at && (
                            <small className="text-xs text-secondary flex items-center gap-1">
                              <Clock size={11} /> Dispatched at {new Date(task.updated_at).toLocaleTimeString()} by {task.updated_by || 'Logistics Coordinator'}
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

        {/* Right: Manifest Prioritization List */}
        <div className="card">
          <div className="card-header-row">
            <div>
              <h3 className="card-title">Manifest Staging & Allocation Sequence</h3>
              <p className="text-xs text-secondary mt-0.5">Priority dispatch sequencing computed via SAP HANA</p>
            </div>
            <span className="badge-count">{manifests.length} Manifests</span>
          </div>

          <div className="manifest-priority-table-wrap">
            <table className="logistics-manifest-table">
              <thead>
                <tr>
                  <th style={{ width: '70px', textAlign: 'center' }}>Rank</th>
                  <th style={{ width: '130px' }}>Manifest ID</th>
                  <th>Cargo / Commodity</th>
                  <th style={{ width: '130px' }}>Constraint</th>
                  <th style={{ width: '100px', textAlign: 'right' }}>Net Weight</th>
                  <th style={{ width: '140px', textAlign: 'center' }}>HANA Status</th>
                </tr>
              </thead>
              <tbody>
                {manifests.map((m) => {
                  const rnk = rankingMap.get(m.manifest_id);
                  const isAllocated = rnk?.allocated === 'Y';
                  const constraintType = m.carriage_constraint || 'none';

                  return (
                    <tr key={m.manifest_id} className="manifest-row-hover">
                      <td style={{ textAlign: 'center' }}>
                        <span className={`manifest-rank-badge ${rnk?.priority_rank <= 3 ? 'top-rank' : ''}`}>
                          #{rnk?.priority_rank || '-'}
                        </span>
                      </td>
                      <td>
                        <span className="manifest-id-code">{m.manifest_id}</span>
                      </td>
                      <td>
                        <div className="manifest-commodity-cell">
                          <strong className="commodity-name">{m.commodity_type}</strong>
                          {m.origin && m.destination && (
                            <small className="route-subtext">{m.origin} ➔ {m.destination}</small>
                          )}
                        </div>
                      </td>
                      <td>
                        <span className={`constraint-chip constraint-${constraintType}`}>
                          {constraintType === 'hazmat' ? '⚠️ Hazmat' : constraintType === 'reefer' || constraintType === 'temp-controlled' || constraintType === 'refrigerated' ? '❄️ Cold-Chain' : constraintType === 'heavy_cargo' ? '⚖️ Heavy' : constraintType === 'fragile' ? '📦 Fragile' : 'Standard'}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <span className="weight-cell">{Number(m.weight_kg).toLocaleString()} <small>kg</small></span>
                      </td>
                      <td style={{ textAlign: 'center' }}>
                        <span className={`allocation-status-pill ${isAllocated ? 'allocated-yes' : 'allocated-pending'}`}>
                          {isAllocated ? '✓ Auto-Allocated' : '⏳ Review'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Truck, CheckCircle2, AlertTriangle, Navigation, Archive, Clock } from 'lucide-react';
import { flodaApi } from '../../services/flodaApi';
import { Button } from '../../components/ui';
import { toast } from 'sonner';

export default function TransportView({ currentUser }) {
  const queryClient = useQueryClient();
  const [taskTab, setTaskTab] = useState('active'); // 'active' | 'completed' | 'all'

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'TRANSPORT'],
    queryFn: () => flodaApi.tasks('TRANSPORT'),
    refetchInterval: 5000
  });

  const { data: chokepoints = [] } = useQuery({
    queryKey: ['chokepoints'],
    queryFn: flodaApi.chokepoints
  });

  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED');

  const displayedTasks = taskTab === 'active'
    ? activeTasks
    : taskTab === 'completed'
    ? completedTasks
    : tasks;

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status, notes }) =>
      flodaApi.updateTaskStatus(taskId, {
        status,
        notes,
        user: currentUser?.fullName || 'Transport Lead',
        role: 'TRANSPORT'
      }),
    onSuccess: (data) => {
      toast.success(`Transport instruction updated: ${data.status.replace('_', ' ')}`);
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const acknowledgeMutation = useMutation({
    mutationFn: ({ taskId, notes }) =>
      flodaApi.acknowledgeTask(taskId, {
        notes,
        user: currentUser?.fullName || 'Transport Lead',
        role: 'TRANSPORT'
      }),
    onSuccess: () => {
      toast.success('Transport instruction acknowledged. Convoy assigned.');
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
          <p className="intro-eyebrow">HEAVY HAUL & CONVOY DISPATCH</p>
          <h1 className="intro-title">Transport Operations Control</h1>
          <span className="intro-subtitle">
            Execute approved rerouting instructions, monitor bridge axle weight limits, and report convoy telemetry back to Corridor Authority.
          </span>
        </div>
        <div className="persona-badge-tag transport">
          <Truck size={14} />
          <span>Operator: {currentUser?.fullName} ({currentUser?.org})</span>
        </div>
      </div>

      <div className="kpi-ribbon mb-4">
        <div className="kpi-card">
          <span className="kpi-label">ACTIVE INSTRUCTIONS</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-sky">{activeTasks.length}</strong>
            <span className="kpi-tag info">{completedTasks.length} Done</span>
          </div>
          <small className="kpi-meta">{tasks.length} total orders from Corridor Authority</small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">ACTIVE CHOKEPOINTS</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-rose">{chokepoints.length}</strong>
            <span className={`kpi-tag ${chokepoints.length > 0 ? 'danger' : 'success'}`}>
              {chokepoints.length > 0 ? 'Active Obstruction' : 'Corridors Clear'}
            </span>
          </div>
          <small className="kpi-meta">
            {chokepoints[0]?.location || 'All corridors operating at 100%'}
          </small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">REROUTE STATUS</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-emerald">
              {tasks.length > 0 ? `${tasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'COMPLETED').length}/${tasks.length}` : 'Standby'}
            </strong>
            <span className="kpi-tag success">{tasks.length > 0 ? 'Active Operations' : 'Baseline SOP'}</span>
          </div>
          <small className="kpi-meta">
            {chokepoints[0]?.capacity_reduction_percent ? `-${chokepoints[0].capacity_reduction_percent}% Capacity on primary route` : 'Standard axle limits active'}
          </small>
        </div>
      </div>

      <div className="persona-grid-two">
        {/* Left: Assigned Transport Tasks */}
        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title">Assigned Rerouting & Fleet Instructions</h3>
            <div className="filter-chips">
              <button
                type="button"
                className={`filter-chip ${taskTab === 'active' ? 'active' : ''}`}
                onClick={() => setTaskTab('active')}
              >
                Active Orders ({activeTasks.length})
              </button>
              <button
                type="button"
                className={`filter-chip ${taskTab === 'completed' ? 'active' : ''}`}
                onClick={() => setTaskTab('completed')}
              >
                Completed Archive ({completedTasks.length})
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
                    ? 'No completed reroute instructions in the archive yet.'
                    : 'No active transport instructions pending. Normal transit operations active.'}
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
                        <small>Latest Operator Telemetry: {task.status_notes}</small>
                      </div>
                    )}

                    <div className="task-actions-row">
                      {isNew && (
                        <Button
                          variant="primary"
                          disabled={acknowledgeMutation.isPending}
                          onClick={() => acknowledgeMutation.mutate({
                            taskId: task.task_id,
                            notes: `Acknowledged by ${currentUser?.fullName || 'Transport Lead'}. Escort assigned.`
                          })}
                        >
                          <CheckCircle2 size={14} />
                          <span>Acknowledge Instruction</span>
                        </Button>
                      )}

                      {isAck && (
                        <Button
                          variant="primary"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({
                            taskId: task.task_id,
                            status: 'IN_PROGRESS',
                            notes: `Transit underway via designated bypass for ${task.title}.`
                          })}
                        >
                          <Navigation size={14} />
                          <span>Start Convoy Transit</span>
                        </Button>
                      )}

                      {isInProgress && (
                        <div className="flex gap-2">
                          <Button
                            variant="primary"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => updateStatusMutation.mutate({
                              taskId: task.task_id,
                              status: 'COMPLETED',
                              notes: `Fleet arrived safely at destination depot. All manifests received.`
                            })}
                          >
                            <CheckCircle2 size={14} />
                            <span>Mark Delivery Completed</span>
                          </Button>

                          <Button
                            variant="outline"
                            disabled={updateStatusMutation.isPending}
                            onClick={() => updateStatusMutation.mutate({
                              taskId: task.task_id,
                              status: 'BLOCKED',
                              notes: `Convoy halted due to secondary road obstruction.`
                            })}
                          >
                            <AlertTriangle size={14} />
                            <span>Report Blocked</span>
                          </Button>
                        </div>
                      )}

                      {isCompleted && (
                        <div className="flex flex-col gap-1 mt-1">
                          <span className="text-emerald text-sm font-semibold flex items-center gap-1">
                            <CheckCircle2 size={14} /> Execution Verified in SAP HANA
                          </span>
                          {task.updated_at && (
                            <small className="text-xs text-secondary flex items-center gap-1">
                              <Clock size={11} /> Completed at {new Date(task.updated_at).toLocaleTimeString()} by {task.updated_by || 'Transport Operator'}
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

        {/* Right: Fleet & Corridor Status */}
        <div className="card">
          <div className="card-header-row">
            <h3 className="card-title">Live Corridor Status & Avoidance Zones</h3>
            <span className="badge-count">{chokepoints.length} Reported</span>
          </div>

          <div className="corridor-status-list">
            {chokepoints.length === 0 ? (
              <div className="empty-state-box">
                <CheckCircle2 size={24} className="text-emerald mb-2" />
                <p>All monitored national corridors operating normally with no active chokepoints.</p>
              </div>
            ) : (
              chokepoints.map((cp) => (
                <div key={cp.chokepoint_id} className="corridor-item alert-border">
                  <div className="corridor-top">
                    <strong>{cp.location}</strong>
                    <span className="badge-danger">-{cp.capacity_reduction_percent}% CAPACITY</span>
                  </div>
                  <p className="text-xs text-secondary mt-1">
                    {cp.affected_routes} · Type: {String(cp.chokepoint_type || '').replace('_', ' ').toUpperCase()} · Est. Resolution: {cp.estimated_resolution_hours}h
                  </p>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

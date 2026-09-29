import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ShieldCheck, AlertOctagon, CheckCircle2, Clock, FileCheck, ShieldAlert, Database } from 'lucide-react';
import { flodaApi } from '../../services/flodaApi';
import { Button } from '../../components/ui';
import { toast } from 'sonner';

export default function ComplianceView({ currentUser }) {
  const queryClient = useQueryClient();
  const [taskTab, setTaskTab] = useState('active'); // 'active' | 'completed' | 'all'

  const { data: tasks = [] } = useQuery({
    queryKey: ['tasks', 'COMPLIANCE'],
    queryFn: () => flodaApi.tasks('COMPLIANCE'),
    refetchInterval: 5000
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: flodaApi.health,
    refetchInterval: 15000
  });

  const { data: manifests = [] } = useQuery({
    queryKey: ['manifests'],
    queryFn: flodaApi.manifests
  });

  const activeTasks = tasks.filter(t => t.status !== 'COMPLETED' && t.status !== 'BLOCKED');
  const completedTasks = tasks.filter(t => t.status === 'COMPLETED' || t.status === 'BLOCKED');

  const displayedTasks = taskTab === 'active'
    ? activeTasks
    : taskTab === 'completed'
    ? completedTasks
    : tasks;

  const hazmatCount = manifests.filter(m => m.carriage_constraint === 'hazmat' || m.carriage_constraint === 'reefer' || m.carriage_constraint === 'temp-controlled').length;

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status, notes }) =>
      flodaApi.updateTaskStatus(taskId, {
        status,
        notes,
        user: currentUser?.fullName || 'Compliance Officer',
        role: 'COMPLIANCE'
      }),
    onSuccess: (data) => {
      toast.success(`Compliance record updated: ${data.status.replace('_', ' ')}`);
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
          <p className="intro-eyebrow">POLICY, HAZMAT & AUDIT GOVERNANCE</p>
          <h1 className="intro-title">Compliance & Safety Control</h1>
          <span className="intro-subtitle">
            Validate emergency transit waivers, enforce hazardous carriage safety guardrails, and maintain immutable cryptographic audit records in SAP HANA Cloud.
          </span>
        </div>
        <div className="persona-badge-tag compliance">
          <ShieldCheck size={14} />
          <span>Officer: {currentUser?.fullName} ({currentUser?.org})</span>
        </div>
      </div>

      <div className="kpi-ribbon mb-4">
        <div className="kpi-card">
          <span className="kpi-label">PENDING COMPLIANCE WAIVERS</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-amber">{activeTasks.length}</strong>
            <span className="kpi-tag warning">Awaiting Review</span>
          </div>
          <small className="kpi-meta">{hazmatCount} regulated cargo manifests active</small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">CERTIFIED WAIVERS ISSUED</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-emerald">{completedTasks.length}</strong>
            <span className="kpi-tag success">Legally Certified</span>
          </div>
          <small className="kpi-meta">
            Signed & Transferred to Authority
          </small>
        </div>

        <div className="kpi-card">
          <span className="kpi-label">LEGAL FRAMEWORK ACTIVE</span>
          <div className="kpi-value-row">
            <strong className="kpi-val text-sky">NDMA-2026</strong>
            <span className="kpi-tag neutral">Sec 14.2</span>
          </div>
          <small className="kpi-meta">Expedited Disaster Clearance Protocol</small>
        </div>
      </div>

      {/* Compliance Action Section */}
      <div className="card mb-4">
        <div className="card-header-row">
          <div>
            <h3 className="card-title">Safety & Regulatory Authorizations</h3>
            <p className="text-xs text-secondary mt-0.5">Emergency corridor waivers signed to SAP HANA audit ledger</p>
          </div>
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
              Certified Archive ({completedTasks.length})
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
                  ? 'No certified regulatory records in the archive yet.'
                  : 'No active compliance waivers pending authorization. All corridor shipments conform to safety baseline.'}
              </p>
            </div>
          ) : (
            displayedTasks.map((task) => {
              const isCompleted = task.status === 'COMPLETED';
              const isBlocked = task.status === 'BLOCKED';

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
                      <small>Regulatory Endorsement: {task.status_notes}</small>
                    </div>
                  )}

                  <div className="task-actions-row">
                    {!isCompleted && !isBlocked ? (
                      <div className="flex gap-2">
                        <Button
                          variant="primary"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({
                            taskId: task.task_id,
                            status: 'COMPLETED',
                            notes: `Emergency Hazmat transit waiver certified under NDMA-2026 Rule 14.2 by ${currentUser?.fullName || 'Compliance Officer'}. Convoy escort authorized.`
                          })}
                        >
                          <ShieldCheck size={14} />
                          <span>Authorize Safety Waiver & Release</span>
                        </Button>

                        <Button
                          variant="outline"
                          disabled={updateStatusMutation.isPending}
                          onClick={() => updateStatusMutation.mutate({
                            taskId: task.task_id,
                            status: 'BLOCKED',
                            notes: `Flagged by ${currentUser?.fullName || 'Compliance Officer'}: Tanker safety inspection check required before corridor dispatch.`
                          })}
                        >
                          <AlertOctagon size={14} />
                          <span>Flag Compliance Exception</span>
                        </Button>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-1 mt-1">
                        <span className={`${isBlocked ? 'text-rose' : 'text-emerald'} text-sm font-semibold flex items-center gap-1`}>
                          {isBlocked ? (
                            <>
                              <ShieldAlert size={14} /> Safety Hold Flagged & Recorded in SAP HANA
                            </>
                          ) : (
                            <>
                              <CheckCircle2 size={14} /> Authorized & Signed to SAP HANA Ledger
                            </>
                          )}
                        </span>
                        {task.updated_at && (
                          <small className="text-xs text-secondary flex items-center gap-1">
                            <Clock size={11} /> Logged at {new Date(task.updated_at).toLocaleTimeString()} by {task.updated_by || 'Compliance Officer'}
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
    </div>
  );
}


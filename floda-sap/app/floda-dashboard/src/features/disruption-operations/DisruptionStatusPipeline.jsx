import { CheckCircle2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { flodaApi } from '../../services/flodaApi';
import { toast } from 'sonner';

export default function DisruptionStatusPipeline({ disruption, tasks = [], decisions = [], isAuthority = false }) {
  const queryClient = useQueryClient();
  if (!disruption) return null;

  const resolveMutation = useMutation({
    mutationFn: () => flodaApi.resolveDisruption(disruption.disruption_id, {
      resolvedBy: 'Corridor Authority',
      notes: `Highway clearance certified by Corridor Authority at ${disruption.location}. All lanes reopened.`
    }),
    onSuccess: (data) => {
      toast.success(data.message || 'Corridor Disruption Marked as Resolved');
      queryClient.invalidateQueries({ queryKey: ['disruptions'] });
      queryClient.invalidateQueries({ queryKey: ['chokepoints'] });
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['recommendations'] });
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['audit'] });
    },
    onError: (err) => toast.error(err.message)
  });

  const transportTask = tasks.find(t => t.assigned_role === 'TRANSPORT');
  const logisticsTask = tasks.find(t => t.assigned_role === 'LOGISTICS');
  const inventoryTask = tasks.find(t => t.assigned_role === 'INVENTORY');
  const complianceTask = tasks.find(t => t.assigned_role === 'COMPLIANCE');

  const authorityDecision = decisions.find(d => d.disruption_id === disruption.disruption_id) || (tasks.length > 0 ? { decision_type: 'APPROVED' } : null);

  const steps = [
    { label: 'Sensing', status: disruption ? 'DETECTED' : 'STANDBY', color: disruption ? 'emerald' : 'neutral' },
    { label: 'Impact', status: disruption?.capacity_reduction_percent ? `-${disruption.capacity_reduction_percent}% CAP` : 'EVALUATED', color: 'emerald' },
    { label: 'Scenario', status: tasks.length > 0 || authorityDecision ? 'GENERATED' : 'SYNTHESIZING', color: 'emerald' },
    { label: 'Recommendation', status: authorityDecision?.decision_type ? 'PROCESSED' : 'READY', color: 'emerald' },
    {
      label: 'Authority',
      status: authorityDecision ? authorityDecision.decision_type : 'PENDING REVIEW',
      color: authorityDecision?.decision_type === 'APPROVED' ? 'emerald' : authorityDecision?.decision_type === 'REJECTED' ? 'rose' : 'amber'
    },
    {
      label: 'Transport',
      status: transportTask?.status?.replace('_', ' ') || (authorityDecision ? 'DISPATCHED' : 'WAITING'),
      color: transportTask?.status === 'COMPLETED' ? 'emerald' : transportTask?.status ? 'sky' : 'neutral'
    },
    {
      label: 'Logistics',
      status: logisticsTask?.status?.replace('_', ' ') || (authorityDecision ? 'DISPATCHED' : 'WAITING'),
      color: logisticsTask?.status === 'COMPLETED' ? 'emerald' : logisticsTask?.status ? 'sky' : 'neutral'
    },
    {
      label: 'Inventory',
      status: inventoryTask?.status?.replace('_', ' ') || (authorityDecision ? 'DISPATCHED' : 'WAITING'),
      color: inventoryTask?.status === 'COMPLETED' ? 'emerald' : inventoryTask?.status ? 'sky' : 'neutral'
    },
    {
      label: 'Compliance',
      status: complianceTask?.status?.replace('_', ' ') || (authorityDecision ? 'VERIFIED' : 'WAITING'),
      color: complianceTask?.status === 'COMPLETED' || complianceTask?.status === 'VERIFIED' ? 'emerald' : complianceTask?.status ? 'amber' : 'neutral'
    }
  ];

  return (
    <div className="pipeline-container card mb-4">
      <div className="pipeline-header">
        <div>
          <span className="pipeline-tag">ACTIVE DISRUPTION ORCHESTRATION</span>
          <h3 className="pipeline-title">
            {disruption.disruption_type?.toUpperCase()} · {disruption.location}
          </h3>
          <p className="pipeline-meta">
            Corridor: {disruption.corridor} · Severity: <strong className="text-rose">{disruption.severity?.toUpperCase()}</strong> · Impact: -{disruption.capacity_reduction_percent}% Capacity
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAuthority && disruption.status !== 'RESOLVED' && (
            <button
              type="button"
              className="btn btn--outline btn--sm text-emerald border-emerald hover:bg-emerald-50"
              disabled={resolveMutation.isPending}
              onClick={() => resolveMutation.mutate()}
              title="Certify road clearance and normalize corridor"
            >
              <CheckCircle2 size={13} className="text-emerald" />
              <span>{resolveMutation.isPending ? 'Reopening...' : 'Mark Disruption Resolved'}</span>
            </button>
          )}
          <div className="pipeline-id-badge">
            <span>{disruption.disruption_id}</span>
          </div>
        </div>
      </div>

      <div className="pipeline-steps-grid">
        {steps.map((step, idx) => (
          <div key={step.label} className={`pipeline-step-box step-${step.color}`}>
            <div className="step-number">{idx + 1}</div>
            <div className="step-info">
              <span className="step-label">{step.label}</span>
              <span className={`step-status-pill status-${step.color}`}>
                {step.status}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

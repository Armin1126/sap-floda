import { useState } from 'react';
import { Check, X, ShieldAlert } from 'lucide-react';
import { Button } from '../../components/ui';
import StatusBadge from '../../components/common/StatusBadge';
import { score } from '../../utils/formatters';
import { toast } from 'sonner';

export default function ApprovalCard({ ranking, manifest, onApprove, onReject, pending }) {
  const [mode, setMode] = useState(null);
  const [name, setName] = useState('Supply Chain Lead');
  const [reason, setReason] = useState('');

  const escalation = [
    ranking.priority_rank === 1 && 'Top priority',
    manifest?.carriage_constraint === 'hazmat' && 'Hazmat cargo',
    Number(manifest?.weight_kg) > 10000 && 'Heavy shipment'
  ].filter(Boolean).join(' · ') || 'Policy guardrail';

  const cancel = () => {
    setMode(null);
    setReason('');
  };

  const confirm = () => {
    if (!name.trim()) return toast.error('Enter reviewer name');
    if (mode === 'reject' && !reason.trim()) return toast.error('Enter a rejection reason');
    if (mode === 'approve') onApprove({ id: ranking.ranking_id, name });
    else onReject({ id: ranking.ranking_id, name, reason });
  };

  return (
    <article className="approval-item">
      <div className="approval-main">
        <div className="approval-heading">
          <strong className="approval-title">{manifest?.commodity_type || ranking.manifest_id}</strong>
          <span className="approval-meta">
            <span className="rank-tag">#{ranking.priority_rank}</span>
            <span>Score: <b>{score(ranking.composite_score)}</b></span>
          </span>
        </div>

        <div className="approval-escalation-pill">
          <ShieldAlert size={12} />
          <span>{escalation}</span>
        </div>
      </div>

      <div className="approval-status-row">
        <StatusBadge status="Pending Approval" />
      </div>

      {mode === null ? (
        <div className="actions">
          <Button disabled={pending} variant="primary" onClick={() => setMode('approve')}>
            <Check size={14} />
            <span>Approve</span>
          </Button>
          <Button disabled={pending} variant="danger" onClick={() => setMode('reject')}>
            <X size={14} />
            <span>Reject</span>
          </Button>
        </div>
      ) : (
        <div className="approval-decision-form">
          <div className="approval-inputs">
            <label className="input-group">
              <span className="input-label">Reviewer Name</span>
              <input
                autoFocus
                className="form-input"
                value={name}
                onChange={event => setName(event.target.value)}
                placeholder="Reviewer name"
              />
            </label>
            {mode === 'reject' && (
              <label className="input-group">
                <span className="input-label">Rejection Reason</span>
                <input
                  className="form-input"
                  value={reason}
                  onChange={event => setReason(event.target.value)}
                  placeholder="Operational justification for rejection"
                />
              </label>
            )}
          </div>
          <div className="actions">
            <Button
              disabled={pending}
              variant={mode === 'reject' ? 'danger' : 'primary'}
              onClick={confirm}
            >
              {mode === 'reject' ? 'Confirm Rejection' : 'Confirm Approval'}
            </Button>
            <Button disabled={pending} variant="outline" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </article>
  );
}


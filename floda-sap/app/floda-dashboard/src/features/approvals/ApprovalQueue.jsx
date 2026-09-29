import { CheckCircle2 } from 'lucide-react';
import { Card } from '../../components/ui';
import EmptyState from '../../components/common/EmptyState';
import ApprovalCard from './ApprovalCard';
import { useApprovalActions } from './useApprovalActions';
import { toast } from 'sonner';

export default function ApprovalQueue({ rows = [], manifests }) {
  const { approve, reject } = useApprovalActions();
  const manifestMap = new Map((manifests || []).map(manifest => [manifest.manifest_id, manifest]));
  const onApprove = payload => approve.mutate(payload, { onSuccess: data => toast.success(data.message || 'Allocation approved'), onError: error => toast.error(error.message) });
  const onReject = payload => reject.mutate(payload, { onSuccess: data => toast.success(data.message || 'Allocation rejected'), onError: error => toast.error(error.message) });

  return (
    <Card className="card--approvals">
      <div className="card-title">
        <span className="card-title-label">
          <span className="title-icon-badge"><CheckCircle2 size={15} /></span>
          Approval Queue
        </span>
        <span className="badge-amber">{rows.length} Pending</span>
      </div>
      {rows.length ? (
        <div className="approval-list">
          {rows.map(ranking => (
            <ApprovalCard
              key={ranking.ranking_id}
              ranking={ranking}
              manifest={manifestMap.get(ranking.manifest_id)}
              onApprove={onApprove}
              onReject={onReject}
              pending={approve.isPending || reject.isPending}
            />
          ))}
        </div>
      ) : (
        <EmptyState title="No allocations awaiting review" detail="All policy exceptions have been resolved." />
      )}
    </Card>
  );
}


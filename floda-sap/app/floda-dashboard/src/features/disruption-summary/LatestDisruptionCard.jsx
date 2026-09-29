import { AlertTriangle, Clock, MapPin } from 'lucide-react';
import { Card, Badge } from '../../components/ui';

export default function LatestDisruptionCard({ item }) {
  return (
    <Card className="card--disruption">
      <div className="card-title">
        <span className="card-title-label">
          <span className="title-icon-badge"><AlertTriangle size={15} /></span>
          Disruption Telemetry
        </span>
        <Badge kind={item ? 'warning' : 'neutral'}>{item ? 'Active Event' : 'Standby'}</Badge>
      </div>

      {item ? (
        <div className="disruption-body">
          <div className="disruption-header-meta">
            <h3 className="disruption-title">
              <MapPin size={16} className="inline-icon" />
              <span>{item.location}</span>
            </h3>
            <span className="disruption-type-chip">
              {String(item.chokepoint_type || '').replace('_', ' ')}
            </span>
          </div>

          <p className="disruption-routes">
            Affected Corridor: <strong>{item.affected_routes}</strong>
          </p>

          <div className="disruption-metric-group">
            <div className="progress-labels">
              <span>Capacity Reduction</span>
              <b>{item.capacity_reduction_percent || 0}%</b>
            </div>
            <div className="progress" role="progressbar" aria-valuenow={item.capacity_reduction_percent || 0}>
              <div
                className="progress-bar-fill"
                style={{ width: `${Math.min(item.capacity_reduction_percent || 0, 100)}%` }}
              />
            </div>
          </div>

          <div className="disruption-eta">
            <Clock size={13} />
            <span>Estimated resolution: <b>{item.estimated_resolution_hours} hours</b></span>
          </div>
        </div>
      ) : (
        <div className="disruption-empty">
          <p>No operational chokepoints currently impacting active corridors.</p>
          <small>Use "Trigger Disruption" to run an automated simulation.</small>
        </div>
      )}
    </Card>
  );
}


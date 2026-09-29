import { useQuery } from '@tanstack/react-query';
import { Activity, Clock } from 'lucide-react';
import { flodaApi } from '../../services/flodaApi';

export default function LiveEventStream() {
  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: flodaApi.events,
    refetchInterval: 5000
  });

  return (
    <div className="card card--events event-stream-card">
      <div className="card-header-row">
        <div className="flex items-center gap-2">
          <Activity size={16} className="text-sky" />
          <h3 className="card-title">Live Operational Event Stream</h3>
        </div>
        <div className="live-indicator">
          <span className="live-pulse-dot active" />
          <span>Real-Time Stream</span>
        </div>
      </div>

      <div className="event-stream-list">
        {events.length === 0 ? (
          <p className="empty-text">No active operational events recorded yet.</p>
        ) : (
          events.slice(0, 10).map((evt) => {
            const timeStr = evt.timestamp
              ? new Date(evt.timestamp).toLocaleTimeString()
              : '--:--:--';

            return (
              <div key={evt.event_id || evt.eventId} className="event-stream-row">
                <span className="event-timestamp">
                  <Clock size={12} className="inline mr-1" />
                  {timeStr}
                </span>
                <span className="event-type-badge">{evt.event_type}</span>
                <span className="event-message">{evt.message}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

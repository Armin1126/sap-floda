import { useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export function useFlodaEvents(currentRole) {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef(null);

  useEffect(() => {
    let reconnectTimeout = null;

    function connect() {
      const es = new EventSource('/api/events/stream');
      eventSourceRef.current = es;

      es.addEventListener('new_event', () => {
        try {
          queryClient.invalidateQueries({ queryKey: ['events'] });
          queryClient.invalidateQueries({ queryKey: ['audit'] });
        } catch (err) {
          console.warn('SSE event error:', err);
        }
      });

      es.addEventListener('notification', (e) => {
        try {
          const notif = JSON.parse(e.data);
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
          queryClient.invalidateQueries({ queryKey: ['tasks'] });

          // Alert if notification is relevant to current persona
          if (!currentRole || currentRole === 'AUTHORITY' || notif.recipient_role === currentRole) {
            if (notif.severity === 'WARNING' || notif.severity === 'CRITICAL') {
              toast.warning(`[${notif.recipient_role}] ${notif.title}: ${notif.message.substring(0, 100)}...`);
            } else {
              toast.info(`[${notif.recipient_role}] ${notif.title}`);
            }
          }
        } catch (err) {
          console.warn('SSE notification error:', err);
        }
      });

      es.addEventListener('task_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['audit'] });
      });

      es.addEventListener('disruption_updated', () => {
        queryClient.invalidateQueries({ queryKey: ['disruptions'] });
        queryClient.invalidateQueries({ queryKey: ['scenarios'] });
        queryClient.invalidateQueries({ queryKey: ['recommendations'] });
        queryClient.invalidateQueries({ queryKey: ['chokepoints'] });
      });

      es.addEventListener('decision_propagated', () => {
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
        queryClient.invalidateQueries({ queryKey: ['notifications'] });
        queryClient.invalidateQueries({ queryKey: ['rankings'] });
        queryClient.invalidateQueries({ queryKey: ['approvals'] });
        queryClient.invalidateQueries({ queryKey: ['audit'] });
        queryClient.invalidateQueries({ queryKey: ['recommendations'] });
        queryClient.invalidateQueries({ queryKey: ['scenarios'] });
      });

      es.addEventListener('state_reset', () => {
        queryClient.invalidateQueries();
        toast.info('System state reset to baseline.');
      });

      es.onerror = () => {
        es.close();
        // Reconnect after 3 seconds
        reconnectTimeout = setTimeout(connect, 3000);
      };
    }

    connect();

    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
    };
  }, [queryClient, currentRole]);
}

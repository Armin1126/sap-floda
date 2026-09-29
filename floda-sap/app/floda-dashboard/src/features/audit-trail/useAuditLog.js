import { useQuery } from '@tanstack/react-query';
import { flodaApi } from '../../services/flodaApi';
import { usePersonaStore } from '../../store/personaStore';
import { polling } from '../../hooks/usePolling';

export const useAuditLog = () => {
  const currentUser = usePersonaStore(state => state.currentUser);
  const isAuthority = currentUser?.role === 'AUTHORITY';

  return useQuery({
    queryKey: ['audit'],
    queryFn: ({ signal }) => flodaApi.audit({ signal }),
    enabled: Boolean(isAuthority),
    ...polling
  });
};

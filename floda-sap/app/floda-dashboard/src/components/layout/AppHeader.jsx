import { useEffect, useState } from 'react';
import { Bell, RotateCcw, Plus, CheckCircle2, Layers, ChevronDown, LogOut, Radio } from 'lucide-react';
import { Button } from '../ui';
import TabNav from './TabNav';
import { Popover, PopoverTrigger, PopoverContent } from '../ui/popover';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/dropdown-menu';
import { flodaApi } from '../../services/flodaApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { usePersonaStore, PERSONAS } from '../../store/personaStore';
import { toast } from 'sonner';

export default function AppHeader({ onOpen }) {
  const queryClient = useQueryClient();
  const { currentUser, switchPersona } = usePersonaStore();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [density, setDensity] = useState('comfortable');

  const { data: notifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.role],
    queryFn: () => flodaApi.notifications(currentUser?.role),
    refetchInterval: 5000
  });

  const unreadCount = notifications.filter(n => n.read_status === 'UNREAD').length;

  useEffect(() => {
    document.body.classList.toggle('density-compact', density === 'compact');
  }, [density]);

  const reset = async () => {
    try {
      const data = await flodaApi.reset();
      toast.success(data.message || 'Demo data reset successfully');
      queryClient.invalidateQueries();
    } catch (error) {
      toast.error(error.message);
    }
  };

  const markRead = async (id) => {
    try {
      await flodaApi.markNotificationRead(id);
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    } catch (err) {
      console.warn('Failed to mark notification read:', err);
    }
  };

  const isAuthority = currentUser?.role === 'AUTHORITY';

  return (
    <header className="app-header">
      <div className="brand-group">
        <div className="brand-badge">
          <Layers size={18} strokeWidth={2.4} />
        </div>
        <div className="brand-text">
          <span className="brand-name">FLODA</span>
          <span className="brand-tag">SAP FEDERATED RESILIENCE</span>
        </div>
      </div>

      <TabNav currentRole={currentUser?.role} />

      <div className="header-actions">
        {/* Reset Demo Button */}
        <Button variant="outline" onClick={reset} title="Reset demo scenario to baseline">
          <RotateCcw size={14} />
          <span>Reset Demo</span>
        </Button>

        {/* Trigger Disruption (Manual Authority Action) */}
        {isAuthority && (
          <>
            <Button
              variant="outline"
              onClick={async () => {
                try {
                  toast.info('Simulating autonomous IoT sensor feed at Trishuli River Basin...');
                  const res = await flodaApi.sendTelemetryFeed({
                    location: 'Trishuli River Basin KM-48',
                    corridor: 'Prithvi Highway Arterial Link',
                    throughputCapacity: 20, // 80% loss
                    averageSpeedKmh: 6.2,
                    status: 'OBSTRUCTED',
                    sensorId: 'IOT-HIGHWAY-SENS-48',
                    description: 'Water level threshold exceeded on causeway. Traffic halted.'
                  });
                  toast.success(res.action === 'AUTONOMOUS_PIPELINE_EXECUTED'
                    ? 'Autonomous IoT Sensing: Disruption detected & pipeline executed without manual trigger!'
                    : 'Telemetry processed');
                  queryClient.invalidateQueries();
                } catch (err) {
                  toast.error(err.message);
                }
              }}
              title="Simulate automated IoT highway traffic sensor feed"
            >
              <Radio size={14} className="text-emerald" />
              <span>IoT Auto-Feed</span>
            </Button>

            <Button variant="primary" onClick={onOpen} title="Trigger a new supply chain disruption scenario">
              <Plus size={15} />
              <span>Trigger Disruption</span>
            </Button>
          </>
        )}

        <div className="header-divider" />

        {/* Real-time Notifications Popover */}
        <Popover open={notificationsOpen} onOpenChange={setNotificationsOpen}>
          <PopoverTrigger asChild>
            <button className="header-icon-button bell" aria-label="Notifications" title="Operational Notifications">
              <Bell size={18} />
              {unreadCount > 0 && <span className="notification-badge">{unreadCount}</span>}
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="popover-content">
            <div className="menu-heading">
              <span>Operational Notifications</span>
              <small>{unreadCount} unread for {currentUser?.badge}</small>
            </div>
            <div className="notification-list">
              {notifications.length ? (
                notifications.slice(0, 8).map(notif => (
                  <div
                    className={`notification-row ${notif.read_status === 'UNREAD' ? 'unread' : ''}`}
                    key={notif.id}
                    onClick={() => markRead(notif.id)}
                  >
                    <CheckCircle2 size={15} className={notif.severity === 'WARNING' ? 'text-amber' : 'text-sky'} />
                    <span>
                      <b>{notif.title}</b>
                      <small>{notif.message}</small>
                    </span>
                  </div>
                ))
              ) : (
                <p className="menu-empty">No active notifications for {currentUser?.badge}.</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                className="menu-link"
                onClick={async () => {
                  await flodaApi.markAllNotificationsRead(currentUser?.role);
                  queryClient.invalidateQueries({ queryKey: ['notifications'] });
                }}
              >
                Mark all as read
              </button>
            )}
          </PopoverContent>
        </Popover>

        {/* Authenticated User Profile & Logout */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="persona-selector-btn" title="Logged in user profile">
              <span className="persona-avatar" style={{ backgroundColor: currentUser?.color || '#3b82f6' }}>
                {currentUser?.fullName?.split(' ').map(n => n[0]).join('') || 'SV'}
              </span>
              <div className="persona-meta">
                <span className="persona-role-badge">{currentUser?.badge}</span>
                <span className="persona-name-short">{currentUser?.fullName?.split(' ')[0]}</span>
              </div>
              <ChevronDown size={14} className="opacity-70" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="dropdown-menu-wide">
            <DropdownMenuLabel>
              <div className="flex items-center gap-2">
                <span className="persona-avatar" style={{ backgroundColor: currentUser?.color || '#3b82f6', width: '28px', height: '28px', fontSize: '11px' }}>
                  {currentUser?.fullName?.split(' ').map(n => n[0]).join('')}
                </span>
                <div>
                  <b className="text-sm">{currentUser?.fullName}</b>
                  <p className="text-xs text-secondary">{currentUser?.title}</p>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <div className="px-3 py-2 text-xs text-secondary flex flex-col gap-1">
              {currentUser?.employeeId && (
                <div><strong>Employee ID:</strong> <span className="font-mono">{currentUser.employeeId}</span></div>
              )}
              <div><strong>Department:</strong> {currentUser?.department || `${currentUser?.badge} Division`}</div>
              <div><strong>Organization:</strong> {currentUser?.org}</div>
              <div><strong>Email:</strong> {currentUser?.email}</div>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setDensity(density === 'comfortable' ? 'compact' : 'comfortable')}>
              {density === 'comfortable' ? 'Display Density: Compact' : 'Display Density: Comfortable'}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-rose font-semibold flex items-center gap-2"
              onSelect={async () => {
                const { logout } = usePersonaStore.getState();
                await logout();
                toast.info('Logged out from FLODA console');
              }}
            >
              <LogOut size={14} />
              <span>Log Out of Console</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

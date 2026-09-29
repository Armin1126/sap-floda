import { LayoutDashboard, CheckCircle2, History, Truck, Package, Warehouse, ShieldCheck, Activity } from 'lucide-react';
import { useUiStore } from '../../store/uiStore';
import { useApprovals } from '../../features/approvals/useApprovals';

export default function TabNav({ currentRole = 'AUTHORITY' }) {
  const activeSection = useUiStore(state => state.activeSection);
  const setActiveSection = useUiStore(state => state.setActiveSection);
  const { data: approvals = [] } = useApprovals();

  let tabs = [];

  if (currentRole === 'AUTHORITY') {
    tabs = [
      { id: 'overview', label: 'Corridor Command', Icon: LayoutDashboard },
      { id: 'approvals', label: 'Approval Queue', Icon: CheckCircle2, badge: approvals.length },
      { id: 'events', label: 'Event Stream', Icon: Activity },
      { id: 'audit', label: 'Audit Trail', Icon: History }
    ];
  } else if (currentRole === 'TRANSPORT') {
    tabs = [
      { id: 'overview', label: 'Transport Control', Icon: Truck },
      { id: 'events', label: 'Event Stream', Icon: Activity }
    ];
  } else if (currentRole === 'LOGISTICS') {
    tabs = [
      { id: 'overview', label: 'Distribution Control', Icon: Package },
      { id: 'events', label: 'Event Stream', Icon: Activity }
    ];
  } else if (currentRole === 'INVENTORY') {
    tabs = [
      { id: 'overview', label: 'Warehouse & Reserves', Icon: Warehouse },
      { id: 'events', label: 'Event Stream', Icon: Activity }
    ];
  } else if (currentRole === 'COMPLIANCE') {
    tabs = [
      { id: 'overview', label: 'Safety & Waivers', Icon: ShieldCheck },
      { id: 'events', label: 'Event Stream', Icon: Activity }
    ];
  }

  return (
    <nav className="tab-nav" aria-label="Dashboard sections">
      {tabs.map(({ id, label, Icon, badge }) => {
        const isActive = activeSection === id;

        return (
          <button
            key={id}
            type="button"
            aria-label={label}
            title={label}
            aria-pressed={isActive}
            className={isActive ? 'tab-button active' : 'tab-button'}
            onClick={() => setActiveSection(id)}
          >
            <Icon size={15} className="tab-icon" />
            <span className="tab-label">{label}</span>
            {badge > 0 && <span className="tab-counter-badge">{badge}</span>}
          </button>
        );
      })}
    </nav>
  );
}

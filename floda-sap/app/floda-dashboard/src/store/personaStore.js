import { create } from 'zustand';
import { useUiStore } from './uiStore';
import { flodaApi } from '../services/flodaApi';

export const PERSONAS = [
  {
    role: 'AUTHORITY',
    email: 'authority@floda.local',
    fullName: 'Srivatsan Venkat',
    title: 'Corridor Authority Lead',
    org: 'Nepal National Corridor Authority',
    badge: 'Authority',
    color: '#3b82f6',
    department: 'Corridor Supreme Command',
    icon: 'Shield',
    description: 'Autonomous corridor orchestration, policy override, human-in-the-loop approvals & scenario authorization.'
  },
  {
    role: 'TRANSPORT',
    email: 'transport@floda.local',
    fullName: 'Rajesh Shrestha',
    title: 'Heavy Haul Fleet Dispatcher',
    org: 'Himalayan Transport Alliance',
    badge: 'Transport',
    color: '#06b6d4',
    department: 'Fleet Dispatch & Routing Operations',
    icon: 'Truck',
    description: 'Fleet rerouting execution, convoy staging, driver telemetry & checkpoint transit confirmation.'
  },
  {
    role: 'LOGISTICS',
    email: 'logistics@floda.local',
    fullName: 'Pooja Thapa',
    title: 'Regional Logistics Coordinator',
    org: 'Central Nepal Distribution Hub',
    badge: 'Logistics',
    color: '#8b5cf6',
    department: 'Hub Allocation & Bay Sequencing',
    icon: 'Package',
    description: 'Cargo prioritization, loading bay re-sequencing & multi-hub transit synchronization.'
  },
  {
    role: 'INVENTORY',
    email: 'inventory@floda.local',
    fullName: 'Bikram Adhikari',
    title: 'Depot Warehouse Manager',
    org: 'Kathmandu Strategic Medical Reserves',
    badge: 'Inventory',
    color: '#10b981',
    department: 'Strategic Warehousing & Buffer Reserves',
    icon: 'Warehouse',
    description: 'Days-of-Cover monitoring, strategic inventory pre-positioning & safety reserve release.'
  },
  {
    role: 'COMPLIANCE',
    email: 'compliance@floda.local',
    fullName: 'Anita Sharma',
    title: 'Safety & Regulatory Officer',
    org: 'Dept of Hazardous Transit & Drug Admin',
    badge: 'Compliance',
    color: '#f59e0b',
    department: 'Policy, Hazmat & Audit Governance',
    icon: 'ShieldCheck',
    description: 'Emergency transit waivers, hazardous carriage guardrails & immutable SAP HANA ledger audit records.'
  }
];

const savedUser = (() => {
  try {
    const raw = localStorage.getItem('floda_user');
    const token = localStorage.getItem('floda_token');
    if (raw && token) {
      return JSON.parse(raw);
    }
    return null; // Force login if not authenticated
  } catch {
    return null;
  }
})();

export const usePersonaStore = create((set, get) => ({
  currentUser: savedUser,
  isAuthenticated: !!savedUser && !!localStorage.getItem('floda_token'),
  personas: PERSONAS,

  login: async (credentials, password) => {
    const payload = typeof credentials === 'object'
      ? credentials
      : { email: credentials, password };

    const res = await flodaApi.login(payload);
    if (res.token && res.user) {
      localStorage.setItem('floda_token', res.token);
      
      const personaMeta = PERSONAS.find(p => p.role === res.user.role) || {
        role: res.user.role,
        email: res.user.email,
        fullName: res.user.fullName,
        title: `${res.user.role} Officer`,
        org: res.user.organization,
        badge: res.user.role,
        color: '#3b82f6',
        department: `${res.user.role} Department`
      };

      const fullUser = {
        ...personaMeta,
        userId: res.user.userId,
        employeeId: res.user.employeeId,
        email: res.user.email,
        role: res.user.role,
        fullName: res.user.fullName || personaMeta.fullName,
        org: res.user.organization || personaMeta.org
      };

      localStorage.setItem('floda_user', JSON.stringify(fullUser));
      useUiStore.getState().setActiveSection('overview');
      set({ currentUser: fullUser, isAuthenticated: true });
      return fullUser;
    }
    throw new Error('Invalid authentication response');
  },

  register: async (registerPayload) => {
    const res = await flodaApi.register(registerPayload);
    if (res.token && res.user) {
      localStorage.setItem('floda_token', res.token);
      
      const personaMeta = PERSONAS.find(p => p.role === res.user.role) || {
        role: res.user.role,
        email: res.user.email,
        fullName: res.user.fullName,
        title: `${res.user.role} Officer`,
        org: res.user.organization,
        badge: res.user.role,
        color: '#3b82f6',
        department: `${res.user.role} Department`
      };

      const fullUser = {
        ...personaMeta,
        userId: res.user.userId,
        employeeId: res.user.employeeId,
        email: res.user.email,
        role: res.user.role,
        fullName: res.user.fullName || personaMeta.fullName,
        org: res.user.organization || personaMeta.org
      };

      localStorage.setItem('floda_user', JSON.stringify(fullUser));
      useUiStore.getState().setActiveSection('overview');
      set({ currentUser: fullUser, isAuthenticated: true });
      return fullUser;
    }
    throw new Error('Registration failed');
  },

  logout: async () => {
    try {
      await flodaApi.logout();
    } catch (e) {
      console.warn('Logout notification error:', e);
    }
    localStorage.removeItem('floda_token');
    localStorage.removeItem('floda_user');
    useUiStore.getState().setActiveSection('overview');
    set({ currentUser: null, isAuthenticated: false });
  },

  setUser: (user) => {
    if (user) {
      localStorage.setItem('floda_user', JSON.stringify(user));
      set({ currentUser: user, isAuthenticated: true });
    } else {
      localStorage.removeItem('floda_user');
      localStorage.removeItem('floda_token');
      set({ currentUser: null, isAuthenticated: false });
    }
  }
}));

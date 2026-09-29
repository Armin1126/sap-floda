import { API_BASE_URL } from '../config/env';

function getAuthHeader() {
  const token = localStorage.getItem('floda_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path, options = {}) {
  const url = path.startsWith('http') || path.startsWith('/api') || path.startsWith('/odata')
    ? path
    : `${API_BASE_URL}${path}`;

  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(url, { ...options, headers });
  if (!response.ok) {
    let errorMsg = `Request failed (${response.status})`;
    try {
      const errJson = await response.json();
      errorMsg = errJson.error?.message || errJson.error || errorMsg;
    } catch {
      errorMsg = `Request failed (${response.status})`;
    }
    throw new Error(errorMsg);
  }
  return response.json();
}

/** @param {string} path @returns {Promise<any[]>} */
async function collection(path, signal) {
  const j = await request(path, { signal });
  return j.value || j || [];
}

/** @param {string} action @param {object} body @returns {Promise<object>} */
async function action(actionPath, body = {}) {
  const j = await request(actionPath, {
    method: 'POST',
    body: JSON.stringify(body)
  });
  return j.value || j;
}

export const flodaApi = {
  // Health
  health: () => request('/api/health'),

  // Auth & RBAC
  users: () => request('/api/auth/users'),
  login: (arg1, arg2) => typeof arg1 === 'object'
    ? action('/api/auth/login', arg1)
    : action('/api/auth/login', { email: arg1, password: arg2 }),
  register: (payload) => action('/api/auth/register', payload),
  logout: () => action('/api/auth/logout'),
  me: () => request('/api/auth/me'),

  // Core OData collections (backwards compatible)
  manifests: () => collection('Manifests'),
  rankings: () => collection('rankedManifests()'),
  approvals: () => collection('pendingApprovals()'),
  chokepoints: () => collection('Chokepoints?$orderby=created_at%20desc'),

  // Multi-Persona Disruptions & Scenarios
  disruptions: () => collection('/api/disruptions'),
  triggerDisruption: (payload) => action('/api/disruptions', payload),
  resolveDisruption: (disruptionId, data) => action(`/api/disruptions/${disruptionId}/resolve`, data),
  sendTelemetryFeed: (telemetry) => action('/api/telemetry/corridor-feed', telemetry),
  scenarios: (disruptionId) => collection(disruptionId ? `/api/scenarios?disruption_id=${disruptionId}` : '/api/scenarios'),
  recommendations: (disruptionId) => collection(disruptionId ? `/api/recommendations?disruption_id=${disruptionId}` : '/api/recommendations'),

  // Decision & Approval Flow
  approveDecision: (recId, data) => action(`/api/decisions/${recId}/approve`, data),
  rejectDecision: (recId, data) => action(`/api/decisions/${recId}/reject`, data),
  approve: (ranking_id, approver_name) => action('approveAllocation', { ranking_id, approver_name }),
  reject: (ranking_id, approver_name, reason) => action('rejectAllocation', { ranking_id, approver_name, reason }),

  // Persona Tasks
  tasks: (role) => collection(role ? `/api/tasks?role=${role}` : '/api/tasks'),
  acknowledgeTask: (taskId, data) => action(`/api/tasks/${taskId}/acknowledge`, data),
  updateTaskStatus: (taskId, data) => action(`/api/tasks/${taskId}/status`, data),

  // Notifications
  notifications: (role) => collection(role ? `/api/notifications?role=${role}` : '/api/notifications'),
  markNotificationRead: (id) => action(`/api/notifications/${id}/read`),
  markAllNotificationsRead: (role) => action('/api/notifications/read-all', { role }),

  // Live Event Stream & Audit
  events: () => collection('/api/events'),
  audit: ({ signal } = {}) => collection('/api/audit', signal),

  // System Reset
  reset: () => action('/api/reset')
};

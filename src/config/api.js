// VitalLens API Configuration
// Set VITE_API_URL in .env or .env.production to override
const API_BASE = import.meta.env.VITE_API_URL || '';

export const API = {
  base: API_BASE,
  pilotRequest: `${API_BASE}/api/pilot-request`,
  analytics: `${API_BASE}/api/analytics`,
  enroll: `${API_BASE}/api/enroll`,
  checkResult: `${API_BASE}/api/check-result`,
  myHistory: `${API_BASE}/api/my-history`,
  dashboard: (slug) => `${API_BASE}/api/dashboard/${slug}`,
  dashboardAggregates: (slug, token) => `${API_BASE}/api/dashboard/${slug}/aggregates?token=${token}`,
  dashboardTrends: (slug, token) => `${API_BASE}/api/dashboard/${slug}/trends?token=${token}`,
  dashboardToday: (slug, token) => `${API_BASE}/api/dashboard/${slug}/today?token=${token}`,
};

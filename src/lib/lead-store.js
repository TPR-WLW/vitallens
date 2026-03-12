// ミルケア — localStorage Lead Store
// Stores contact form submissions locally for the analytics dashboard.

const LEAD_KEY = 'mc_leads';
const MAX_LEADS = 200;

function getList() {
  try {
    return JSON.parse(localStorage.getItem(LEAD_KEY) || '[]');
  } catch {
    return [];
  }
}

/**
 * Save a lead to localStorage.
 * leadData: { company, department, name, email, phone, type, message }
 */
export function saveLead(leadData) {
  const list = getList();
  list.push({ ...leadData, ts: Date.now() });
  if (list.length > MAX_LEADS) list.splice(0, list.length - MAX_LEADS);
  try {
    localStorage.setItem(LEAD_KEY, JSON.stringify(list));
  } catch {
    try {
      localStorage.setItem(LEAD_KEY, JSON.stringify(list.slice(Math.floor(list.length / 2))));
    } catch { /* give up */ }
  }
}

/**
 * Get all leads sorted by timestamp (newest first).
 */
export function getLeads() {
  return getList().sort((a, b) => b.ts - a.ts);
}

/**
 * Get lead statistics.
 */
export function getLeadStats() {
  const leads = getList();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  return {
    total: leads.length,
    last24h: leads.filter((l) => now - l.ts < day).length,
    last7d: leads.filter((l) => now - l.ts < 7 * day).length,
  };
}

/**
 * Clear all leads.
 */
export function clearLeads() {
  localStorage.removeItem(LEAD_KEY);
}

// Constants exported for testing
export { LEAD_KEY, MAX_LEADS };

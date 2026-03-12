// ミルケア — localStorage Analytics Store (privacy-first)
// Tracks page views and events entirely on-device. No external services.

const PV_KEY = 'vl_pageviews';
const EV_KEY = 'vl_events';
const MAX_PV = 500;
const MAX_EV = 500;

function getList(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch {
    return [];
  }
}

function appendTo(key, entry, max) {
  const list = getList(key);
  list.push({ ...entry, ts: Date.now() });
  if (list.length > max) list.splice(0, list.length - max);
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    try {
      localStorage.setItem(key, JSON.stringify(list.slice(Math.floor(list.length / 2))));
    } catch { /* give up */ }
  }
}

/**
 * Record a page view
 */
export function recordPageView(page) {
  const ref = typeof document !== 'undefined' ? document.referrer || '' : '';
  appendTo(PV_KEY, { page, ref }, MAX_PV);
}

/**
 * Record a named event with optional properties
 */
export function recordEvent(name, props = {}) {
  appendTo(EV_KEY, { name, ...props }, MAX_EV);
}

/**
 * Get page view analytics
 */
export function getPageViewStats() {
  const views = getList(PV_KEY);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const last24h = views.filter((v) => now - v.ts < day);
  const last7d = views.filter((v) => now - v.ts < 7 * day);
  const last30d = views.filter((v) => now - v.ts < 30 * day);

  const countByPage = (list) =>
    list.reduce((acc, v) => {
      acc[v.page] = (acc[v.page] || 0) + 1;
      return acc;
    }, {});

  // Daily breakdown (last 7 days)
  const dailyBreakdown = [];
  for (let i = 6; i >= 0; i--) {
    const dayStart = new Date(now - i * day);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = dayStart.getTime() + day;
    const count = views.filter((v) => v.ts >= dayStart.getTime() && v.ts < dayEnd).length;
    dailyBreakdown.push({
      date: dayStart.toISOString().slice(0, 10),
      count,
    });
  }

  return {
    total: views.length,
    last24h: last24h.length,
    last7d: last7d.length,
    last30d: last30d.length,
    byPage24h: countByPage(last24h),
    byPage7d: countByPage(last7d),
    dailyBreakdown,
  };
}

/**
 * Get event analytics
 */
export function getEventStats() {
  const events = getList(EV_KEY);
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const last24h = events.filter((e) => now - e.ts < day);
  const last7d = events.filter((e) => now - e.ts < 7 * day);

  const countByName = (list) =>
    list.reduce((acc, e) => {
      acc[e.name] = (acc[e.name] || 0) + 1;
      return acc;
    }, {});

  return {
    total: events.length,
    last24h: countByName(last24h),
    last7d: countByName(last7d),
    recent: events.slice(-10).reverse(),
  };
}

/**
 * Clear all analytics data
 */
export function clearAnalytics() {
  localStorage.removeItem(PV_KEY);
  localStorage.removeItem(EV_KEY);
}

// Constants exported for testing
export { PV_KEY, EV_KEY, MAX_PV, MAX_EV };

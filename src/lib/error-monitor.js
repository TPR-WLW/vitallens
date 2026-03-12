// ミルケア — Error Monitoring (localStorage-based, privacy-respecting)
// Tracks: JS errors, unhandled rejections, measurement failures

const STORAGE_KEY = 'vl_error_log';
const MAX_ENTRIES = 200;

function getLog() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function append(entry) {
  const log = getLog();
  log.push({ ...entry, ts: Date.now() });
  if (log.length > MAX_ENTRIES) log.splice(0, log.length - MAX_ENTRIES);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // Storage full — drop oldest half
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(log.slice(Math.floor(log.length / 2))));
    } catch { /* give up */ }
  }
}

/**
 * Log a JS error (global handler or manual)
 */
export function logError(message, source, line, col) {
  append({
    type: 'js_error',
    message: String(message).slice(0, 200),
    source: source ? String(source).slice(0, 100) : undefined,
    line,
    col,
  });
}

/**
 * Log an unhandled promise rejection
 */
export function logRejection(reason) {
  append({
    type: 'rejection',
    message: String(reason).slice(0, 200),
  });
}

/**
 * Log a measurement failure or quality issue
 */
export function logMeasureEvent(event, details = {}) {
  append({
    type: 'measure',
    event, // 'camera_error' | 'low_sqi_complete' | 'face_lost_abort' | 'success'
    ...details,
  });
}

/**
 * Get aggregated error stats
 */
export function getErrorStats() {
  const log = getLog();
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;

  const last24h = log.filter((e) => now - e.ts < day);
  const last7d = log.filter((e) => now - e.ts < 7 * day);

  const countByType = (entries) =>
    entries.reduce((acc, e) => {
      const key = e.type === 'measure' ? `measure:${e.event}` : e.type;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

  // Measurement success rate (last 7 days)
  const measurements = last7d.filter((e) => e.type === 'measure');
  const successes = measurements.filter((e) => e.event === 'success').length;
  const total = measurements.length;

  return {
    total: log.length,
    last24h: countByType(last24h),
    last7d: countByType(last7d),
    measureSuccessRate: total > 0 ? Math.round((successes / total) * 100) : null,
    measureTotal: total,
    recentErrors: log.filter((e) => e.type !== 'measure').slice(-5),
  };
}

/**
 * Clear all error logs
 */
export function clearErrorLog() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Install global error handlers (call once at app startup)
 */
export function installGlobalHandlers() {
  const w = typeof window !== 'undefined' ? window : globalThis;
  w.onerror = (message, source, line, col) => {
    logError(message, source, line, col);
  };

  if (typeof w.addEventListener === 'function') {
    w.addEventListener('unhandledrejection', (event) => {
      logRejection(event.reason);
    });
  }
}

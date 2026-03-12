// MiruCare — Lightweight A/B testing framework
// Deterministic variant assignment using localStorage-based analytics.

import { recordEvent } from './analytics-store.js';

const UID_KEY = 'vl_uid';
const AB_PREFIX = 'ab:';
const SESSION_KEY = 'vl_ab_session';

/**
 * Get or create a persistent user ID.
 */
export function getUserId() {
  let uid = localStorage.getItem(UID_KEY);
  if (!uid) {
    uid = crypto.randomUUID
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(UID_KEY, uid);
  }
  return uid;
}

/**
 * Simple string hash (djb2). Returns a positive integer.
 */
function hash(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Track which tests have been viewed this session (dedup).
 */
function getSessionViews() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY) || '{}');
  } catch {
    return {};
  }
}

function markSessionView(testName) {
  const views = getSessionViews();
  views[testName] = true;
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(views));
  } catch { /* ignore */ }
}

/**
 * Get a deterministic variant for the current user.
 * Automatically records a view event (once per session).
 *
 * @param {string} testName - unique test identifier
 * @param {string[]} variants - array of variant names (e.g. ['A', 'B'])
 * @returns {string} the assigned variant
 */
export function getVariant(testName, variants) {
  if (!variants || variants.length === 0) return '';
  if (variants.length === 1) return variants[0];

  const uid = getUserId();
  const idx = hash(testName + ':' + uid) % variants.length;
  const variant = variants[idx];

  // Record view event (deduplicated per session)
  const views = getSessionViews();
  if (!views[testName]) {
    recordEvent(`${AB_PREFIX}view`, { test: testName, variant });
    markSessionView(testName);
  }

  return variant;
}

/**
 * Record a conversion event for an A/B test.
 *
 * @param {string} testName
 * @param {string} variant
 */
export function recordConversion(testName, variant) {
  recordEvent(`${AB_PREFIX}convert`, { test: testName, variant });
}

/**
 * Get aggregated results for a test.
 * Returns { [variant]: { views, conversions, rate } }
 *
 * @param {string} testName
 * @returns {Object}
 */
export function getTestResults(testName) {
  const EV_KEY = 'vl_events';
  let events;
  try {
    events = JSON.parse(localStorage.getItem(EV_KEY) || '[]');
  } catch {
    events = [];
  }

  const results = {};

  for (const e of events) {
    if (e.test !== testName) continue;

    if (e.name === `${AB_PREFIX}view`) {
      if (!results[e.variant]) results[e.variant] = { views: 0, conversions: 0, rate: 0 };
      results[e.variant].views++;
    } else if (e.name === `${AB_PREFIX}convert`) {
      if (!results[e.variant]) results[e.variant] = { views: 0, conversions: 0, rate: 0 };
      results[e.variant].conversions++;
    }
  }

  // Calculate rates
  for (const v of Object.values(results)) {
    v.rate = v.views > 0 ? Math.round((v.conversions / v.views) * 1000) / 10 : 0;
  }

  return results;
}

/**
 * Get all active test names from event data.
 * @returns {string[]}
 */
export function getActiveTests() {
  const EV_KEY = 'vl_events';
  let events;
  try {
    events = JSON.parse(localStorage.getItem(EV_KEY) || '[]');
  } catch {
    events = [];
  }

  const tests = new Set();
  for (const e of events) {
    if (e.name && e.name.startsWith(AB_PREFIX) && e.test) {
      tests.add(e.test);
    }
  }
  return [...tests];
}

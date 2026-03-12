// VitalLens — Lightweight privacy-respecting analytics
// Tracks page views and key events. No cookies, no PII.
// All data stored locally in localStorage. Server-side tracking via VITE_API_URL (optional).

import { API } from '../config/api.js';
import { recordPageView, recordEvent } from './analytics-store.js';

function send(event, data = {}) {
  const payload = {
    event,
    url: window.location.href,
    ref: document.referrer,
    ts: Date.now(),
    ...data,
  };

  if (API.base) {
    try {
      navigator.sendBeacon(API.analytics, JSON.stringify(payload));
    } catch {
      // Silently fail — analytics should never break the app
    }
  }

  if (import.meta.env.DEV) {
    console.log('[VL Analytics]', event, data);
  }
}

export function trackPageView(page) {
  send('pageview', { page });
  recordPageView(page);
}

export function trackEvent(name, props = {}) {
  send('event', { name, ...props });
  recordEvent(name, props);
}

// Expose for use in landing page pilot form
window.__vl_track = trackEvent;

// Auto-track initial page view
trackPageView(window.location.hash || '/');

// Track hash changes
window.addEventListener('hashchange', () => {
  trackPageView(window.location.hash || '/');
});

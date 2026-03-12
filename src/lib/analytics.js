// VitalLens — Lightweight privacy-respecting analytics
// Tracks page views and key events. No cookies, no PII.
// Currently logs to console. Replace endpoint to send data when backend is ready.

const ENDPOINT = null; // Set to API endpoint when available

function send(event, data = {}) {
  const payload = {
    event,
    url: window.location.href,
    ref: document.referrer,
    ts: Date.now(),
    ...data,
  };

  if (ENDPOINT) {
    try {
      navigator.sendBeacon(ENDPOINT, JSON.stringify(payload));
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
}

export function trackEvent(name, props = {}) {
  send('event', { name, ...props });
}

// Expose for use in landing page pilot form
window.__vl_track = trackEvent;

// Auto-track initial page view
trackPageView(window.location.hash || '/');

// Track hash changes
window.addEventListener('hashchange', () => {
  trackPageView(window.location.hash || '/');
});

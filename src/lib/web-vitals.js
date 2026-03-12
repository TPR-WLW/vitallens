// Core Web Vitals reporting — feeds into existing analytics
import { onCLS, onINP, onLCP, onFCP, onTTFB } from 'web-vitals';
import { trackEvent } from './analytics.js';

function sendMetric({ name, value, rating }) {
  trackEvent('web-vital', { metric: name, value: Math.round(value), rating });
}

export function reportWebVitals() {
  onCLS(sendMetric);
  onINP(sendMetric);
  onLCP(sendMetric);
  onFCP(sendMetric);
  onTTFB(sendMetric);
}

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { registerSW } from 'virtual:pwa-register';

import App from './App.jsx';
import { installGlobalHandlers } from './lib/error-monitor.js';
import { reportWebVitals } from './lib/web-vitals.js';

installGlobalHandlers();
reportWebVitals();

registerSW({
  onNeedRefresh() { /* auto-update on next visit */ },
  onOfflineReady() { console.log('オフライン準備完了'); },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

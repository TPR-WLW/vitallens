import { useState, useCallback } from 'react';
import { getPageViewStats, getEventStats, clearAnalytics } from '../lib/analytics-store.js';
import { getErrorStats, clearErrorLog } from '../lib/error-monitor.js';
import '../styles/analytics.css';

const EVENT_LABELS = {
  cta_click: 'CTA',
  demo_start: 'Demo',
  demo_complete: 'Demo OK',
  measure_start: 'Measure',
  measure_complete: 'Measure OK',
  contact_open: 'Contact',
  contact_submit: 'Contact Send',
  dashboard_view: 'Dashboard',
  history_view: 'History',
  sample_view: 'Sample',
  pwa_install: 'PWA Install',
};

const ERROR_LABELS = {
  js_error: 'JS Error',
  rejection: 'Promise Rejection',
  'measure:camera_error': 'Camera Error',
  'measure:low_sqi_complete': 'Low SQI',
  'measure:face_lost_abort': 'Face Lost',
  'measure:success': 'Success',
};

function formatTime(ts) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function BarChart({ data }) {
  const max = Math.max(...data.map((d) => d.count), 1);
  return (
    <div className="analytics-bar-chart" role="img" aria-label="7 day trend">
      {data.map((d) => (
        <div key={d.date} className="analytics-bar-col">
          {d.count > 0 && <span className="analytics-bar-value">{d.count}</span>}
          <div
            className="analytics-bar"
            style={{ height: `${(d.count / max) * 100}%` }}
            aria-label={`${d.date}: ${d.count}`}
          />
          <span className="analytics-bar-label">{d.date.slice(5)}</span>
        </div>
      ))}
    </div>
  );
}

function KpiCard({ value, label, variant }) {
  return (
    <div className="analytics-kpi">
      <div className={`analytics-kpi-value ${variant || ''}`}>{value}</div>
      <div className="analytics-kpi-label">{label}</div>
    </div>
  );
}

function EventBadge({ type }) {
  let cls = '';
  if (type.includes('error') || type === 'rejection') cls = 'error';
  else if (type.includes('success') || type.includes('complete')) cls = 'success';
  else if (type.includes('low_sqi') || type.includes('warning')) cls = 'warning';
  return <span className={`analytics-event-badge ${cls}`}>{type}</span>;
}

export default function AnalyticsDashboard({ onBack }) {
  const [, setRefresh] = useState(0);
  const pv = getPageViewStats();
  const ev = getEventStats();
  const err = getErrorStats();

  const handleClearAll = useCallback(() => {
    clearAnalytics();
    clearErrorLog();
    setRefresh((n) => n + 1);
  }, []);

  const handleRefresh = useCallback(() => {
    setRefresh((n) => n + 1);
  }, []);

  const topPages7d = Object.entries(pv.byPage7d)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const topEvents7d = Object.entries(ev.last7d)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const errorEntries7d = Object.entries(err.last7d)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="analytics">
      <header className="analytics-header">
        <div className="analytics-header-inner">
          <button className="dash-back" onClick={onBack} aria-label="Back">
            Back
          </button>
          <h1>Analytics</h1>
          <span className="analytics-badge">LOCAL</span>
        </div>
      </header>

      <div className="analytics-body">
        {/* KPIs */}
        <div className="analytics-kpis">
          <KpiCard value={pv.last24h} label="PV (24h)" />
          <KpiCard value={pv.last7d} label="PV (7d)" />
          <KpiCard
            value={err.measureSuccessRate !== null ? `${err.measureSuccessRate}%` : '-'}
            label="Success Rate"
            variant={err.measureSuccessRate !== null && err.measureSuccessRate >= 70 ? 'success' : err.measureSuccessRate !== null ? 'warning' : ''}
          />
          <KpiCard
            value={Object.values(err.last24h).reduce((s, n) => s + n, 0)}
            label="Errors (24h)"
            variant={Object.values(err.last24h).reduce((s, n) => s + n, 0) > 0 ? 'danger' : ''}
          />
          <KpiCard value={err.measureTotal} label="Total Measures" />
        </div>

        {/* Daily PV Chart */}
        <div className="analytics-section">
          <h2>PV (7d)</h2>
          {pv.last7d > 0 ? (
            <BarChart data={pv.dailyBreakdown} />
          ) : (
            <p className="analytics-empty">No data</p>
          )}
        </div>

        {/* Top Pages */}
        <div className="analytics-section">
          <h2>Top Pages (7d)</h2>
          {topPages7d.length > 0 ? (
            <table className="analytics-table">
              <thead>
                <tr><th>Page</th><th>Views</th></tr>
              </thead>
              <tbody>
                {topPages7d.map(([page, count]) => (
                  <tr key={page}>
                    <td>{page || '/'}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="analytics-empty">No data</p>
          )}
        </div>

        {/* Events */}
        <div className="analytics-section">
          <h2>Events (7d)</h2>
          {topEvents7d.length > 0 ? (
            <table className="analytics-table">
              <thead>
                <tr><th>Event</th><th>Count</th></tr>
              </thead>
              <tbody>
                {topEvents7d.map(([name, count]) => (
                  <tr key={name}>
                    <td>{EVENT_LABELS[name] || name}</td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="analytics-empty">No data</p>
          )}
        </div>

        {/* Error Monitoring */}
        <div className="analytics-section">
          <h2>Errors & Measures (7d)</h2>
          {errorEntries7d.length > 0 ? (
            <table className="analytics-table">
              <thead>
                <tr><th>Type</th><th>Count</th></tr>
              </thead>
              <tbody>
                {errorEntries7d.map(([type, count]) => (
                  <tr key={type}>
                    <td><EventBadge type={type} /></td>
                    <td>{count}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="analytics-empty">No data</p>
          )}
        </div>

        {/* Recent Errors */}
        {err.recentErrors.length > 0 && (
          <div className="analytics-section">
            <h2>Recent Errors</h2>
            <table className="analytics-table">
              <thead>
                <tr><th>Time</th><th>Type</th><th>Message</th></tr>
              </thead>
              <tbody>
                {err.recentErrors.map((e, i) => (
                  <tr key={i}>
                    <td className="analytics-ts">{formatTime(e.ts)}</td>
                    <td><EventBadge type={e.type} /></td>
                    <td>{e.message}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recent Events */}
        {ev.recent.length > 0 && (
          <div className="analytics-section">
            <h2>Recent Events</h2>
            <table className="analytics-table">
              <thead>
                <tr><th>Time</th><th>Event</th></tr>
              </thead>
              <tbody>
                {ev.recent.map((e, i) => (
                  <tr key={i}>
                    <td className="analytics-ts">{formatTime(e.ts)}</td>
                    <td>{EVENT_LABELS[e.name] || e.name}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Actions */}
        <div className="analytics-actions">
          <button className="dash-back" onClick={handleRefresh}>
            Refresh
          </button>
          <button className="analytics-clear-btn" onClick={handleClearAll}>
            Clear All Data
          </button>
        </div>
      </div>
    </div>
  );
}

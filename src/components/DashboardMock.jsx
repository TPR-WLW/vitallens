import { useState, useEffect } from 'react';
import { API } from '../config/api.js';
import '../styles/dashboard.css';

// Mock data — used when API is unavailable or in demo mode
const MOCK_DATA = {
  overall: { wellness: 87, checkIns: 142, alerts: 3, avgHR: 68 },
  trend: [
    { day: 'Mon', stress: 32, checkIns: 28 },
    { day: 'Tue', stress: 38, checkIns: 31 },
    { day: 'Wed', stress: 72, checkIns: 35 },
    { day: 'Thu', stress: 58, checkIns: 33 },
    { day: 'Fri', stress: 29, checkIns: 30 },
    { day: 'Sat', stress: 22, checkIns: 12 },
    { day: 'Sun', stress: 18, checkIns: 8 },
  ],
  teams: [
    { name: 'Billing Support', agents: 45, wellness: 91, checkIns: 38, status: 'healthy' },
    { name: 'Tech Support L1', agents: 62, wellness: 78, checkIns: 44, status: 'watch' },
    { name: 'Tech Support L2', agents: 28, wellness: 85, checkIns: 22, status: 'healthy' },
    { name: 'Sales Inbound', agents: 35, wellness: 92, checkIns: 28, status: 'healthy' },
    { name: 'Retention', agents: 20, wellness: 69, checkIns: 10, status: 'alert' },
  ],
  distribution: [
    { label: 'Relaxed', pct: 42, color: 'var(--color-success)' },
    { label: 'Normal', pct: 35, color: 'var(--color-primary)' },
    { label: 'Elevated', pct: 18, color: 'var(--color-warning)' },
    { label: 'High', pct: 5, color: 'var(--color-danger)' },
  ],
  alerts: [
    { time: '2:34 PM', team: 'Retention', message: 'Team stress elevated above threshold for 2+ hours. Recommend scheduling break rotation.' },
    { time: '11:15 AM', team: 'Tech Support L1', message: 'Stress spike detected after product outage escalation queue opened.' },
    { time: '9:02 AM', team: 'Billing Support', message: 'Morning check-in participation at 84% — above target.' },
  ],
};

function transformAPIData(aggregates, today) {
  if (!aggregates || !today) return null;

  const totalChecks = today.checks || 0;
  const avgHR = Math.round(today.avg_heart_rate || 0);
  const stressDist = today.stress_distribution || {};
  const total = (stressDist.low || 0) + (stressDist.moderate || 0) + (stressDist.elevated || 0);
  const wellnessScore = total > 0 ? Math.round(((stressDist.low || 0) / total) * 100) : 0;
  const alertCount = stressDist.elevated || 0;

  // Build trend from daily aggregates
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const trend = (aggregates.daily || []).slice(-7).map((d) => {
    const date = new Date(d.date);
    const stressTotal = (d.stress_moderate_count || 0) + (d.stress_elevated_count || 0);
    const allChecks = (d.stress_low_count || 0) + stressTotal;
    return {
      day: days[date.getDay()],
      stress: allChecks > 0 ? Math.round((stressTotal / allChecks) * 100) : 0,
      checkIns: d.total_checks || 0,
    };
  });

  // Distribution from today
  const distribution = [
    { label: 'Relaxed', pct: total > 0 ? Math.round(((stressDist.low || 0) / total) * 100) : 0, color: 'var(--color-success)' },
    { label: 'Elevated', pct: total > 0 ? Math.round(((stressDist.moderate || 0) / total) * 100) : 0, color: 'var(--color-warning)' },
    { label: 'High', pct: total > 0 ? Math.round(((stressDist.elevated || 0) / total) * 100) : 0, color: 'var(--color-danger)' },
  ];

  return {
    overall: { wellness: wellnessScore, checkIns: totalChecks, alerts: alertCount, avgHR },
    trend: trend.length > 0 ? trend : MOCK_DATA.trend,
    teams: MOCK_DATA.teams, // Teams not in API yet — keep mock
    distribution,
    alerts: MOCK_DATA.alerts, // Alerts not in API yet — keep mock
  };
}

export default function DashboardMock({ onBack }) {
  const [data, setData] = useState(MOCK_DATA);
  const [isLive, setIsLive] = useState(false);
  const [loading, setLoading] = useState(false);

  // Try to fetch real data from API
  useEffect(() => {
    if (!API.base) return; // No API configured

    // Check URL for slug and token: #/dashboard?slug=xxx&token=yyy
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const slug = params.get('slug');
    const token = params.get('token');
    if (!slug || !token) return; // No credentials — stay on mock

    setLoading(true);
    Promise.all([
      fetch(API.dashboardAggregates(slug, token)).then((r) => r.ok ? r.json() : null),
      fetch(API.dashboardToday(slug, token)).then((r) => r.ok ? r.json() : null),
    ])
      .then(([aggregates, today]) => {
        const transformed = transformAPIData(aggregates, today);
        if (transformed) {
          setData(transformed);
          setIsLive(true);
        }
      })
      .catch(() => { /* fall back to mock */ })
      .finally(() => setLoading(false));
  }, []);

  const maxStress = Math.max(...data.trend.map((d) => d.stress), 1);

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dash-top-header">
        <div className="dash-top-inner">
          <button className="dash-back" onClick={onBack}>← Back</button>
          <h1>Team Wellness Dashboard</h1>
          <span className="dash-top-badge">{isLive ? 'Live' : 'Demo'}</span>
        </div>
        <p className="dash-top-sub">Anonymized, aggregate wellness data — no individual identification</p>
      </header>

      {loading && <div style={{ textAlign: 'center', padding: '24px', color: '#9ca3af' }}>Loading dashboard data...</div>}

      <div className="dash-content">
        {/* KPI Row */}
        <div className="dash-kpi-row">
          <div className="dash-kpi">
            <div className="dash-kpi-value green">{data.overall.wellness}%</div>
            <div className="dash-kpi-label">Team Wellness</div>
            {!isLive && <div className="dash-kpi-change up">+3% vs last week</div>}
          </div>
          <div className="dash-kpi">
            <div className="dash-kpi-value">{data.overall.checkIns}</div>
            <div className="dash-kpi-label">Check-Ins Today</div>
            {!isLive && <div className="dash-kpi-change up">74% participation</div>}
          </div>
          <div className="dash-kpi">
            <div className="dash-kpi-value amber">{data.overall.alerts}</div>
            <div className="dash-kpi-label">Active Alerts</div>
            {!isLive && <div className="dash-kpi-change down">+1 vs yesterday</div>}
          </div>
          <div className="dash-kpi">
            <div className="dash-kpi-value">{data.overall.avgHR}</div>
            <div className="dash-kpi-label">Avg HR (BPM)</div>
            {!isLive && <div className="dash-kpi-change">Normal range</div>}
          </div>
        </div>

        <div className="dash-two-col">
          {/* Stress Trend */}
          <div className="dash-panel">
            <h3>7-Day Stress Trend</h3>
            <div className="trend-chart">
              {data.trend.map((d) => (
                <div key={d.day} className="trend-col">
                  <div className="trend-bar-wrap">
                    <div
                      className={`trend-bar ${d.stress > 60 ? 'high' : d.stress > 40 ? 'medium' : ''}`}
                      style={{ height: `${(d.stress / maxStress) * 100}%` }}
                    />
                  </div>
                  <span className="trend-label">{d.day}</span>
                  <span className="trend-value">{d.stress}%</span>
                </div>
              ))}
            </div>
            {!isLive && <p className="trend-note">Wed-Thu spike: product launch support queue. Extra breaks scheduled.</p>}
          </div>

          {/* Distribution */}
          <div className="dash-panel">
            <h3>Wellness Distribution</h3>
            <div className="dist-chart">
              {data.distribution.map((d) => (
                <div key={d.label} className="dist-row">
                  <span className="dist-label">{d.label}</span>
                  <div className="dist-bar-wrap">
                    <div
                      className="dist-bar"
                      style={{ width: `${d.pct}%`, background: d.color }}
                    />
                  </div>
                  <span className="dist-pct">{d.pct}%</span>
                </div>
              ))}
            </div>
            <p className="trend-note">
              {isLive
                ? `${data.distribution[0].pct}% of check-ins in Relaxed range.`
                : `${data.distribution[0].pct + (data.distribution[1]?.pct || 0)}% of check-ins in Relaxed or Normal range.`
              }
            </p>
          </div>
        </div>

        {/* Team Breakdown */}
        <div className="dash-panel">
          <h3>Team Breakdown</h3>
          <div className="team-table">
            <div className="team-row team-header">
              <span>Team</span>
              <span>Agents</span>
              <span>Wellness</span>
              <span>Check-Ins</span>
              <span>Status</span>
            </div>
            {data.teams.map((t) => (
              <div key={t.name} className="team-row">
                <span className="team-name">{t.name}</span>
                <span>{t.agents}</span>
                <span className={t.wellness >= 85 ? 'green' : t.wellness >= 75 ? 'amber' : 'red'}>
                  {t.wellness}%
                </span>
                <span>{t.checkIns}</span>
                <span>
                  <span className={`status-badge status-${t.status}`}>
                    {t.status === 'healthy' ? 'Healthy' : t.status === 'watch' ? 'Watch' : 'Alert'}
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Alerts */}
        <div className="dash-panel">
          <h3>Recent Alerts & Insights</h3>
          <div className="alerts-list">
            {data.alerts.map((a, i) => (
              <div key={i} className={`alert-item ${i === 0 ? 'alert-warn' : ''}`}>
                <div className="alert-meta">
                  <span className="alert-time">{a.time}</span>
                  <span className="alert-team">{a.team}</span>
                </div>
                <p>{a.message}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Privacy Banner */}
        <div className="privacy-banner">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="#6b7280">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
          </svg>
          <span>
            All data shown is anonymized and aggregated. No individual agent can be identified.
            Video never leaves the agent's browser. Supervisors see trends, never raw data.
          </span>
        </div>
      </div>
    </div>
  );
}

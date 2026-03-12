import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../../services/index.js';
import { stressStatus, StatusBadge, KPICard } from './AdminDashboard.jsx';

const EVENT_LOG_KEY = 'mirucare_event_log';
const EVENT_LOG_MAX = 100;
const EVENTS_PER_PAGE = 10;

function relativeTime(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'たった今';
  if (mins < 60) return `${mins}分前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}時間前`;
  const days = Math.floor(hours / 24);
  if (days === 1) return '昨日';
  if (days < 7) return `${days}日前`;
  return new Date(dateStr).toLocaleDateString('ja-JP');
}

function loadEventLog() {
  try {
    const raw = localStorage.getItem(EVENT_LOG_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveEventLog(events) {
  const sorted = events
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    .slice(0, EVENT_LOG_MAX);
  try {
    localStorage.setItem(EVENT_LOG_KEY, JSON.stringify(sorted));
  } catch {
    // Storage full — silently fail
  }
  return sorted;
}

function mergeEvents(fresh, stored) {
  const ids = new Set(stored.map(e => e.id));
  const merged = [...stored];
  for (const e of fresh) {
    if (!ids.has(e.id)) {
      merged.push(e);
      ids.add(e.id);
    }
  }
  return merged;
}

function NotificationPanel({ orgStats, alertThreshold = 55 }) {
  const [notifications, setNotifications] = useState([]);
  const [eventLog, setEventLog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [logExpanded, setLogExpanded] = useState(false);
  const [logPage, setLogPage] = useState(1);

  useEffect(() => {
    if (!orgStats?.orgId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      try {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        const fromISO = sevenDaysAgo.toISOString();
        const toISO = now.toISOString();

        const [measurements, users] = await Promise.all([
          dataService.getMeasurements({ orgId: orgStats.orgId, from: fromISO, to: toISO }),
          dataService.getUsersByOrg(orgStats.orgId),
        ]);

        if (cancelled) return;

        const items = [];

        // New member registrations within last 7 days
        const recentUsers = (users || []).filter(u => {
          if (!u.createdAt) return false;
          return new Date(u.createdAt).getTime() >= sevenDaysAgo.getTime();
        });
        for (const u of recentUsers) {
          const ts = u.createdAt;
          items.push({
            id: `member-${ts}`,
            type: 'member',
            message: `新しいメンバーが参加しました: ${u.name || '匿名'}`,
            timestamp: ts,
          });
        }

        // High stress alerts (no user names for privacy)
        const highStress = (measurements || []).filter(
          m => m.stressScore != null && m.stressScore > alertThreshold
        );
        for (const m of highStress) {
          const ts = m.measuredAt || m.createdAt || m.timestamp;
          items.push({
            id: `stress-${ts}`,
            type: 'stress',
            message: `高ストレスが検出されました（スコア: ${m.stressScore}）`,
            timestamp: ts,
          });
        }

        // Low quality measurements
        const lowQuality = (measurements || []).filter(m => m.qualityGrade === 'C');
        for (const m of lowQuality) {
          const ts = m.measuredAt || m.createdAt || m.timestamp;
          items.push({
            id: `quality-${ts}`,
            type: 'quality',
            message: '低品質の計測がありました — 環境改善をお勧めします',
            timestamp: ts,
          });
        }

        // Merge fresh events with stored log, persist
        const stored = loadEventLog();
        const merged = mergeEvents(items, stored);
        const persisted = saveEventLog(merged);

        // Top 5 for the notification panel
        setNotifications(persisted.slice(0, 5));
        setEventLog(persisted);
      } catch {
        // Silently fail — notifications are non-critical
        setNotifications([]);
        setEventLog(loadEventLog());
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [orgStats?.orgId, alertThreshold]);

  const handleClearLog = useCallback(() => {
    try { localStorage.removeItem(EVENT_LOG_KEY); } catch {}
    setEventLog([]);
    setNotifications([]);
    setLogExpanded(false);
    setLogPage(1);
  }, []);

  if (loading) return null;

  const iconMap = {
    member: { cls: 'adm-notif-icon-member', icon: '\ud83d\udc64' },
    stress: { cls: 'adm-notif-icon-stress', icon: '\u26a0' },
    quality: { cls: 'adm-notif-icon-quality', icon: '\u25cb' },
  };

  const totalPages = Math.max(1, Math.ceil(eventLog.length / EVENTS_PER_PAGE));
  const pagedEvents = eventLog.slice((logPage - 1) * EVENTS_PER_PAGE, logPage * EVENTS_PER_PAGE);

  return (
    <div className="adm-notifications">
      <h3 className="adm-section-title">最近のイベント</h3>
      {notifications.length === 0 ? (
        <div className="adm-notif-empty">直近7日間のイベントはありません</div>
      ) : (
        <div className="adm-notif-list">
          {notifications.map((n) => {
            const { cls, icon } = iconMap[n.type] || iconMap.quality;
            return (
              <div key={n.id} className="adm-notif-item">
                <span className={`adm-notif-icon ${cls}`}>{icon}</span>
                <span className="adm-notif-text">{n.message}</span>
                <span className="adm-notif-time">{n.timestamp ? relativeTime(n.timestamp) : ''}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* Event Log Section */}
      {eventLog.length > 0 && (
        <div className="adm-notif-log-section">
          <div className="adm-notif-log-header">
            <button
              className="adm-btn-ghost adm-notif-log-toggle"
              onClick={() => { setLogExpanded(e => !e); setLogPage(1); }}
            >
              {logExpanded ? '閉じる' : 'すべて表示'}
              <span className="adm-notif-log-count">({eventLog.length}件)</span>
            </button>
            {logExpanded && (
              <button className="adm-link-btn" onClick={handleClearLog}>
                ログをクリア
              </button>
            )}
          </div>

          {logExpanded && (
            <div className="adm-notif-log-body">
              <h4 className="adm-notif-log-title">イベントログ</h4>
              <div className="adm-notif-list">
                {pagedEvents.map((n) => {
                  const { cls, icon } = iconMap[n.type] || iconMap.quality;
                  return (
                    <div key={n.id} className="adm-notif-item">
                      <span className={`adm-notif-icon ${cls}`}>{icon}</span>
                      <span className="adm-notif-text">{n.message}</span>
                      <span className="adm-notif-time">
                        {n.timestamp ? new Date(n.timestamp).toLocaleString('ja-JP') : ''}
                      </span>
                    </div>
                  );
                })}
              </div>
              {totalPages > 1 && (
                <div className="adm-notif-log-pager">
                  <button
                    className="adm-btn-ghost"
                    disabled={logPage <= 1}
                    onClick={() => setLogPage(p => p - 1)}
                  >
                    前へ
                  </button>
                  <span className="adm-notif-log-page">
                    {logPage} / {totalPages}
                  </span>
                  <button
                    className="adm-btn-ghost"
                    disabled={logPage >= totalPages}
                    onClick={() => setLogPage(p => p + 1)}
                  >
                    次へ
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const SCHEDULE_THRESHOLDS = {
  daily: { days: 2, label: '2日' },
  thrice: { days: 4, label: '4日' },
  weekly: { days: 10, label: '10日' },
};

function MeasurementReminder({ orgId, measureSchedule }) {
  const [inactiveCount, setInactiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const threshold = SCHEDULE_THRESHOLDS[measureSchedule] || SCHEDULE_THRESHOLDS.daily;

  useEffect(() => {
    if (!orgId) { setLoading(false); return; }
    let cancelled = false;

    (async () => {
      try {
        const now = new Date();
        const lookbackMs = 30 * 24 * 60 * 60 * 1000;
        const thresholdMs = threshold.days * 24 * 60 * 60 * 1000;
        const lookbackDate = new Date(now.getTime() - lookbackMs);
        const cutoff = new Date(now.getTime() - thresholdMs);

        const [measurements, users] = await Promise.all([
          dataService.getMeasurements({
            orgId,
            from: lookbackDate.toISOString(),
            to: now.toISOString(),
          }),
          dataService.getUsersByOrg(orgId),
        ]);

        if (cancelled) return;

        const recentUserIds = new Set();
        for (const m of (measurements || [])) {
          const ts = m.measuredAt || m.createdAt || m.timestamp;
          if (ts && new Date(ts).getTime() >= cutoff.getTime()) {
            recentUserIds.add(m.userId);
          }
        }

        const allUsers = users || [];
        const inactive = allUsers.filter(u => !recentUserIds.has(u.id));
        setInactiveCount(inactive.length);
      } catch {
        setInactiveCount(0);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [orgId, threshold.days]);

  if (loading || inactiveCount === 0) return null;

  return (
    <div className="adm-reminder-banner">
      <span className="adm-reminder-icon">{'\u23f0'}</span>
      <div className="adm-reminder-text">
        <div className="adm-reminder-main">
          {inactiveCount}名のメンバーが{threshold.label}以上計測を行っていません
        </div>
        <div className="adm-reminder-sub">
          推奨スケジュール（{measureSchedule === 'daily' ? '毎日' : measureSchedule === 'thrice' ? '週3回' : '週1回'}）に基づく判定です
        </div>
      </div>
    </div>
  );
}

function AlertBanner({ teamStats, alertThreshold = 55 }) {
  const alerts = teamStats.filter(
    (ts) => !ts.privacyFiltered && ts.stats?.avgStress > alertThreshold
  );
  if (alerts.length === 0) return null;

  return (
    <div className="adm-alert-banner" role="alert">
      <span className="adm-alert-icon">⚠</span>
      <div className="adm-alert-content">
        <strong>要注意:</strong>{' '}
        {alerts.map((a, i) => (
          <span key={a.teamId}>
            {i > 0 && '、'}
            {a.teamName}（スコア {a.stats.avgStress}）
          </span>
        ))}
        {alerts.length === 1 ? ' のストレスレベルが高めです。' : ' のストレスレベルが高めです。'}
        早期対応を推奨します。
      </div>
    </div>
  );
}

const PERIOD_OPTIONS = [
  { value: 7, label: '7日' },
  { value: 30, label: '30日' },
  { value: 90, label: '90日' },
];

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

function ActivityHeatmap({ orgId, teams }) {
  const [cells, setCells] = useState([]);
  const [selectedTeam, setSelectedTeam] = useState('');

  useEffect(() => {
    if (!orgId) return;
    let cancelled = false;

    (async () => {
      const now = new Date();
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      let measurements = [];
      try {
        measurements = await dataService.getMeasurements({
          orgId,
          from: thirtyDaysAgo.toISOString(),
          to: now.toISOString(),
        });
      } catch { /* */ }

      if (cancelled) return;

      // チーム絞り込み（クライアントサイド）
      if (selectedTeam) {
        measurements = measurements.filter(m => m.teamId === selectedTeam);
      }

      // Group by date string
      const byDate = {};
      for (const m of measurements) {
        const ts = m.measuredAt || m.createdAt || m.timestamp;
        if (!ts) continue;
        const dateKey = new Date(ts).toISOString().slice(0, 10);
        if (!byDate[dateKey]) byDate[dateKey] = [];
        byDate[dateKey].push(m);
      }

      // Build 35 cells (5 weeks) ending today
      const result = [];
      // Start from the most recent Sunday that is >= 30 days ago
      const todayDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startDate = new Date(todayDate);
      startDate.setDate(startDate.getDate() - 34); // 35 days including today
      // Align to previous Sunday
      const dayOfWeek = startDate.getDay();
      startDate.setDate(startDate.getDate() - dayOfWeek);

      const endDate = new Date(todayDate);
      endDate.setDate(endDate.getDate() + (6 - todayDate.getDay())); // complete the week

      for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
        const key = d.toISOString().slice(0, 10);
        const isFuture = d > todayDate;
        const dayMeasurements = byDate[key] || [];
        const count = dayMeasurements.length;

        let level = 0;
        if (count >= 10) level = 4;
        else if (count >= 5) level = 3;
        else if (count >= 2) level = 2;
        else if (count >= 1) level = 1;

        const avgStress = count > 0
          ? Math.round(dayMeasurements.reduce((s, m) => s + (m.stressScore || 0), 0) / count)
          : null;

        result.push({
          date: key,
          count,
          level,
          avgStress,
          isFuture,
          label: `${new Date(key + 'T00:00:00').getMonth() + 1}/${new Date(key + 'T00:00:00').getDate()}`,
        });
      }

      setCells(result);
    })();

    return () => { cancelled = true; };
  }, [orgId, selectedTeam]);

  if (cells.length === 0) return null;

  return (
    <div className="adm-heatmap">
      <div className="adm-heatmap-header">
        <h3 className="adm-section-title" style={{ margin: 0 }}>計測アクティビティ</h3>
        {teams && teams.length > 0 && (
          <div className="adm-heatmap-filter">
            <select
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              aria-label="部署フィルター"
            >
              <option value="">全体</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>
      <div className="adm-heatmap-grid">
        {DAY_LABELS.map((d) => (
          <div key={d} className="adm-heatmap-day-label">{d}</div>
        ))}
        {cells.map((cell) => {
          if (cell.isFuture) {
            return <div key={cell.date} className="adm-heatmap-cell adm-heatmap-cell-empty" />;
          }
          return (
            <div
              key={cell.date}
              className={`adm-heatmap-cell adm-heatmap-cell-${cell.level}`}
            >
              <div className="adm-heatmap-tooltip">
                {cell.label}: {cell.count}件
                {cell.avgStress != null ? ` (平均ストレス: ${cell.avgStress})` : ''}
              </div>
            </div>
          );
        })}
      </div>
      <div className="adm-heatmap-legend">
        <span>少</span>
        <div className="adm-heatmap-legend-cell adm-heatmap-cell-0" />
        <div className="adm-heatmap-legend-cell adm-heatmap-cell-1" />
        <div className="adm-heatmap-legend-cell adm-heatmap-cell-2" />
        <div className="adm-heatmap-legend-cell adm-heatmap-cell-3" />
        <div className="adm-heatmap-legend-cell adm-heatmap-cell-4" />
        <span>多</span>
      </div>
    </div>
  );
}

const WIDGET_DEFAULTS = {
  periodWidgets: true,
  notifications: true,
  kpiCards: true,
  kpiGoals: true,
  heatmap: true,
  teamSummary: true,
};

const WIDGET_STORAGE_KEY = 'mirucare_widget_config';

function loadWidgetConfig() {
  try {
    const raw = localStorage.getItem(WIDGET_STORAGE_KEY);
    return raw ? { ...WIDGET_DEFAULTS, ...JSON.parse(raw) } : { ...WIDGET_DEFAULTS };
  } catch {
    return { ...WIDGET_DEFAULTS };
  }
}

const WIDGET_LABELS = {
  periodWidgets: '期間別ウィジェット',
  notifications: '通知パネル',
  kpiCards: 'KPIカード',
  kpiGoals: 'KPI目標達成状況',
  heatmap: '計測アクティビティ',
  teamSummary: '部署別サマリー',
};

export default function OverviewView({ orgStats, teamStats, onTeamClick, alertThreshold, goalStress, goalParticipation, teams, measureSchedule }) {
  const totalMembers = orgStats?.totalMembers || 0;
  const activeMeasured = orgStats?.activeMeasured || 0;
  const participationRate = totalMembers > 0 ? Math.round((activeMeasured / totalMembers) * 100) : 0;
  const avgStress = orgStats?.stats?.avgStress;

  // ウィジェットカスタマイズ
  const [widgetConfig, setWidgetConfig] = useState(loadWidgetConfig);
  const [showWidgetPanel, setShowWidgetPanel] = useState(false);

  const toggleWidget = (key) => {
    setWidgetConfig(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem(WIDGET_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  };

  // 期間セレクター
  const [period, setPeriod] = useState(7);

  // 期間別ウィジェット
  const [periodStats, setPeriodStats] = useState(null);

  useEffect(() => {
    if (!orgStats?.orgId) return;
    let cancelled = false;
    (async () => {
      const now = new Date();
      const periodMs = period * 24 * 60 * 60 * 1000;
      const periodStart = new Date(now.getTime() - periodMs);
      const prevPeriodStart = new Date(now.getTime() - periodMs * 2);

      const [thisPeriod, lastPeriod] = await Promise.all([
        dataService.getMeasurements({
          orgId: orgStats.orgId,
          from: periodStart.toISOString(),
          to: now.toISOString(),
        }),
        dataService.getMeasurements({
          orgId: orgStats.orgId,
          from: prevPeriodStart.toISOString(),
          to: periodStart.toISOString(),
        }),
      ]);

      if (cancelled) return;

      const thisCount = thisPeriod.length;
      const lastCount = lastPeriod.length;
      const thisAvg = thisCount > 0
        ? Math.round(thisPeriod.reduce((s, m) => s + (m.stressScore || 0), 0) / thisCount)
        : null;
      const lastAvg = lastCount > 0
        ? Math.round(lastPeriod.reduce((s, m) => s + (m.stressScore || 0), 0) / lastCount)
        : null;

      // トレンド: ストレスが下がった=改善(up arrow green), 上がった=悪化(up arrow red)
      let countTrend = 'flat';
      if (lastCount > 0) {
        const diff = ((thisCount - lastCount) / lastCount) * 100;
        if (diff > 10) countTrend = 'up';
        else if (diff < -10) countTrend = 'down';
      } else if (thisCount > 0) {
        countTrend = 'up';
      }

      let stressTrend = 'flat';
      if (thisAvg != null && lastAvg != null) {
        const diff = thisAvg - lastAvg;
        if (diff > 3) stressTrend = 'worse';
        else if (diff < -3) stressTrend = 'better';
      }

      setPeriodStats({ thisCount, thisAvg, countTrend, stressTrend });
    })();
    return () => { cancelled = true; };
  }, [orgStats?.orgId, period]);

  const periodLabel = `直近${period}日間`;
  const comparisonLabel = `前${period}日比`;

  return (
    <div className="adm-view">
      <AlertBanner teamStats={teamStats} alertThreshold={alertThreshold} />
      <MeasurementReminder orgId={orgStats?.orgId} measureSchedule={measureSchedule} />

      {/* ウィジェットカスタマイズ */}
      <div className="adm-widget-customize">
        <button className="adm-widget-gear" onClick={() => setShowWidgetPanel(p => !p)} aria-label="ウィジェット設定">
          {showWidgetPanel ? '閉じる' : '⚙ カスタマイズ'}
        </button>
      </div>
      {showWidgetPanel && (
        <div className="adm-widget-panel">
          <h4>表示ウィジェット</h4>
          {Object.entries(WIDGET_LABELS).map(([key, label]) => (
            <div key={key} className="adm-widget-toggle">
              <input
                type="checkbox"
                id={`widget-${key}`}
                checked={widgetConfig[key]}
                onChange={() => toggleWidget(key)}
              />
              <label htmlFor={`widget-${key}`}>{label}</label>
            </div>
          ))}
        </div>
      )}

      {/* 期間セレクター + ウィジェットカード */}
      {widgetConfig.periodWidgets && <div className="adm-weekly-widgets">
        <div className="adm-period-header">
          <h3 className="adm-section-title">{periodLabel}</h3>
          <div className="adm-period-selector" role="group" aria-label="表示期間">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`adm-period-btn${period === opt.value ? ' active' : ''}`}
                onClick={() => setPeriod(opt.value)}
                aria-pressed={period === opt.value}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
        {periodStats && (
          <div className="adm-widget-row">
            <div className="adm-widget-card">
              <div className="adm-widget-value">
                {periodStats.thisCount}
                <span className={`adm-widget-trend adm-trend-${periodStats.countTrend}`}>
                  {periodStats.countTrend === 'up' ? '\u2191' : periodStats.countTrend === 'down' ? '\u2193' : '\u2192'}
                </span>
              </div>
              <div className="adm-widget-label">計測回数</div>
              <div className="adm-widget-sub">{comparisonLabel}</div>
            </div>
            <div className="adm-widget-card">
              <div className="adm-widget-value">
                {periodStats.thisAvg != null ? periodStats.thisAvg : '---'}
                {periodStats.stressTrend !== 'flat' && (
                  <span className={`adm-widget-trend adm-trend-${periodStats.stressTrend === 'better' ? 'better' : 'worse'}`}>
                    {periodStats.stressTrend === 'better' ? '\u2193' : '\u2191'}
                  </span>
                )}
              </div>
              <div className="adm-widget-label">平均ストレス</div>
              <div className="adm-widget-sub">
                {periodStats.thisAvg != null ? stressStatus(periodStats.thisAvg).label : ''}
              </div>
            </div>
          </div>
        )}
      </div>}

      {/* 通知パネル */}
      {widgetConfig.notifications && <NotificationPanel orgStats={orgStats} alertThreshold={alertThreshold} />}

      {widgetConfig.kpiCards && (
        <div className="adm-kpi-row">
          <KPICard value={`${totalMembers}名`} label="登録メンバー" />
          <KPICard value={`${activeMeasured}名`} label="計測済み" sub={`(${participationRate}%)`} />
          <KPICard
            value={avgStress != null ? avgStress : '---'}
            label="平均ストレス"
            sub={avgStress != null ? stressStatus(avgStress).label : ''}
          />
        </div>
      )}

      {/* KPI目標達成状況 */}
      {widgetConfig.kpiGoals && (goalStress != null || goalParticipation != null) && (
        <div className="adm-kpi-goals">
          <h3 className="adm-section-title">KPI目標達成状況</h3>
          {goalStress != null && avgStress != null && (() => {
            const stressDiff = avgStress - goalStress;
            const fillClass = stressDiff <= 0 ? 'adm-goal-fill-good' : stressDiff <= 10 ? 'adm-goal-fill-warn' : 'adm-goal-fill-bad';
            const pct = Math.min(100, Math.round((avgStress / (goalStress + 30)) * 100));
            const goalPct = Math.round((goalStress / (goalStress + 30)) * 100);
            return (
              <div className="adm-goal-row">
                <div className="adm-goal-label">ストレス目標</div>
                <div className="adm-goal-bar">
                  <div className={`adm-goal-fill ${fillClass}`} style={{ width: `${pct}%` }} />
                  <div className="adm-goal-marker" style={{ left: `${goalPct}%` }} />
                </div>
                <div className="adm-goal-value">
                  目標: {goalStress} / 実績: {avgStress}
                </div>
              </div>
            );
          })()}
          {goalParticipation != null && (() => {
            const partDiff = participationRate - goalParticipation;
            const fillClass = partDiff >= 0 ? 'adm-goal-fill-good' : partDiff >= -10 ? 'adm-goal-fill-warn' : 'adm-goal-fill-bad';
            const pct = Math.min(100, participationRate);
            return (
              <div className="adm-goal-row">
                <div className="adm-goal-label">参加率目標</div>
                <div className="adm-goal-bar">
                  <div className={`adm-goal-fill ${fillClass}`} style={{ width: `${pct}%` }} />
                  <div className="adm-goal-marker" style={{ left: `${goalParticipation}%` }} />
                </div>
                <div className="adm-goal-value">
                  目標: {goalParticipation}% / 実績: {participationRate}%
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* 計測アクティビティヒートマップ */}
      {widgetConfig.heatmap && <ActivityHeatmap orgId={orgStats?.orgId} teams={teams || []} />}

      {widgetConfig.teamSummary && <>
      <h3 className="adm-section-title">部署別サマリー</h3>
      <div className="adm-table-wrap">
        <table className="adm-table" aria-label="部署別サマリー">
          <thead>
            <tr>
              <th scope="col">部署</th>
              <th scope="col">計測数 / 登録数</th>
              <th scope="col">平均ストレス</th>
              <th scope="col">状態</th>
            </tr>
          </thead>
          <tbody>
            {teamStats.map((ts) => {
              const clickable = !ts.privacyFiltered;
              return (
                <tr
                  key={ts.teamId}
                  className={clickable ? 'adm-row-clickable' : 'adm-row-muted'}
                  onClick={() => clickable && onTeamClick(ts.teamId)}
                >
                  <td>{ts.teamName}</td>
                  <td>
                    {ts.stats ? ts.stats.measurementCount : '---'} / {ts.memberCount}
                  </td>
                  <td>{ts.stats ? ts.stats.avgStress : '---'}</td>
                  <td><StatusBadge score={ts.stats?.avgStress ?? null} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="adm-privacy-note">
        ※ 計測数が5名未満の部署はプライバシー保護のため集計データを表示しません。
      </p>
      <p className="adm-privacy-note">
        すべてのデータは匿名化・集計された状態で表示されます。個人の計測結果は管理者に表示されません。
      </p>
      </>}
    </div>
  );
}

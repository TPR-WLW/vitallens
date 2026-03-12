import { useState, useEffect, useMemo } from 'react';
import { dataService } from '../../services/index.js';
import { stressStatus, StatusBadge, KPICard } from './AdminDashboard.jsx';

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

function NotificationPanel({ orgStats, alertThreshold = 55 }) {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

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
          items.push({
            type: 'member',
            message: `新しいメンバーが参加しました: ${u.name || '匿名'}`,
            timestamp: u.createdAt,
          });
        }

        // High stress alerts (no user names for privacy)
        const highStress = (measurements || []).filter(
          m => m.stressScore != null && m.stressScore > alertThreshold
        );
        for (const m of highStress) {
          items.push({
            type: 'stress',
            message: `高ストレスが検出されました（スコア: ${m.stressScore}）`,
            timestamp: m.measuredAt || m.createdAt || m.timestamp,
          });
        }

        // Low quality measurements
        const lowQuality = (measurements || []).filter(m => m.qualityGrade === 'C');
        for (const m of lowQuality) {
          items.push({
            type: 'quality',
            message: '低品質の計測がありました — 環境改善をお勧めします',
            timestamp: m.measuredAt || m.createdAt || m.timestamp,
          });
        }

        // Sort descending by timestamp, take max 5
        items.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setNotifications(items.slice(0, 5));
      } catch {
        // Silently fail — notifications are non-critical
        setNotifications([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => { cancelled = true; };
  }, [orgStats?.orgId, alertThreshold]);

  if (loading) return null;

  const iconMap = {
    member: { cls: 'adm-notif-icon-member', icon: '\ud83d\udc64' },
    stress: { cls: 'adm-notif-icon-stress', icon: '\u26a0' },
    quality: { cls: 'adm-notif-icon-quality', icon: '\u25cb' },
  };

  return (
    <div className="adm-notifications">
      <h3 className="adm-section-title">最近のイベント</h3>
      {notifications.length === 0 ? (
        <div className="adm-notif-empty">直近7日間のイベントはありません</div>
      ) : (
        <div className="adm-notif-list">
          {notifications.map((n, i) => {
            const { cls, icon } = iconMap[n.type] || iconMap.quality;
            return (
              <div key={i} className="adm-notif-item">
                <span className={`adm-notif-icon ${cls}`}>{icon}</span>
                <span className="adm-notif-text">{n.message}</span>
                <span className="adm-notif-time">{n.timestamp ? relativeTime(n.timestamp) : ''}</span>
              </div>
            );
          })}
        </div>
      )}
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

export default function OverviewView({ orgStats, teamStats, onTeamClick, alertThreshold }) {
  const totalMembers = orgStats?.totalMembers || 0;
  const activeMeasured = orgStats?.activeMeasured || 0;
  const participationRate = totalMembers > 0 ? Math.round((activeMeasured / totalMembers) * 100) : 0;
  const avgStress = orgStats?.stats?.avgStress;

  // 直近7日ウィジェット
  const [weeklyStats, setWeeklyStats] = useState(null);

  useEffect(() => {
    if (!orgStats?.orgId) return;
    (async () => {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

      const thisWeek = await dataService.getMeasurements({
        orgId: orgStats.orgId,
        from: sevenDaysAgo.toISOString(),
        to: now.toISOString(),
      });
      const lastWeek = await dataService.getMeasurements({
        orgId: orgStats.orgId,
        from: fourteenDaysAgo.toISOString(),
        to: sevenDaysAgo.toISOString(),
      });

      const thisCount = thisWeek.length;
      const lastCount = lastWeek.length;
      const thisAvg = thisCount > 0
        ? Math.round(thisWeek.reduce((s, m) => s + (m.stressScore || 0), 0) / thisCount)
        : null;
      const lastAvg = lastCount > 0
        ? Math.round(lastWeek.reduce((s, m) => s + (m.stressScore || 0), 0) / lastCount)
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

      setWeeklyStats({ thisCount, thisAvg, countTrend, stressTrend });
    })();
  }, [orgStats?.orgId]);

  return (
    <div className="adm-view">
      <AlertBanner teamStats={teamStats} alertThreshold={alertThreshold} />

      {/* 直近7日ウィジェットカード */}
      {weeklyStats && (
        <div className="adm-weekly-widgets">
          <h3 className="adm-section-title">直近7日間</h3>
          <div className="adm-widget-row">
            <div className="adm-widget-card">
              <div className="adm-widget-value">
                {weeklyStats.thisCount}
                <span className={`adm-widget-trend adm-trend-${weeklyStats.countTrend}`}>
                  {weeklyStats.countTrend === 'up' ? '\u2191' : weeklyStats.countTrend === 'down' ? '\u2193' : '\u2192'}
                </span>
              </div>
              <div className="adm-widget-label">計測回数</div>
              <div className="adm-widget-sub">前週比</div>
            </div>
            <div className="adm-widget-card">
              <div className="adm-widget-value">
                {weeklyStats.thisAvg != null ? weeklyStats.thisAvg : '---'}
                {weeklyStats.stressTrend !== 'flat' && (
                  <span className={`adm-widget-trend adm-trend-${weeklyStats.stressTrend === 'better' ? 'better' : 'worse'}`}>
                    {weeklyStats.stressTrend === 'better' ? '\u2193' : '\u2191'}
                  </span>
                )}
              </div>
              <div className="adm-widget-label">平均ストレス</div>
              <div className="adm-widget-sub">
                {weeklyStats.thisAvg != null ? stressStatus(weeklyStats.thisAvg).label : ''}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 通知パネル */}
      <NotificationPanel orgStats={orgStats} alertThreshold={alertThreshold} />

      <div className="adm-kpi-row">
        <KPICard value={`${totalMembers}名`} label="登録メンバー" />
        <KPICard value={`${activeMeasured}名`} label="計測済み" sub={`(${participationRate}%)`} />
        <KPICard
          value={avgStress != null ? avgStress : '---'}
          label="平均ストレス"
          sub={avgStress != null ? stressStatus(avgStress).label : ''}
        />
      </div>

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
    </div>
  );
}

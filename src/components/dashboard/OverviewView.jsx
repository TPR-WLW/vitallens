import { stressStatus, StatusBadge, KPICard } from './AdminDashboard.jsx';

function AlertBanner({ teamStats }) {
  const alerts = teamStats.filter(
    (ts) => !ts.privacyFiltered && ts.stats?.avgStress > 55
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

export default function OverviewView({ orgStats, teamStats, onTeamClick }) {
  const totalMembers = orgStats?.totalMembers || 0;
  const activeMeasured = orgStats?.activeMeasured || 0;
  const participationRate = totalMembers > 0 ? Math.round((activeMeasured / totalMembers) * 100) : 0;
  const avgStress = orgStats?.stats?.avgStress;

  return (
    <div className="adm-view">
      <AlertBanner teamStats={teamStats} />
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
        <table className="adm-table">
          <thead>
            <tr>
              <th>部署</th>
              <th>計測数 / 登録数</th>
              <th>平均ストレス</th>
              <th>状態</th>
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

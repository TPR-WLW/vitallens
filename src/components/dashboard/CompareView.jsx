import { useState, useEffect } from 'react';
import { dataService } from '../../services/index.js';
import { StatusBadge, stressStatus } from './AdminDashboard.jsx';

export default function CompareView({ session, teams }) {
  const [teamA, setTeamA] = useState('');
  const [teamB, setTeamB] = useState('');
  const [period, setPeriod] = useState(30);
  const [statsA, setStatsA] = useState(null);
  const [statsB, setStatsB] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!teamA || !teamB || teamA === teamB) {
      setStatsA(null);
      setStatsB(null);
      return;
    }

    (async () => {
      setLoading(true);
      try {
        const from = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
        const to = new Date().toISOString();
        const [a, b] = await Promise.all([
          dataService.getTeamStats(teamA, { from, to }),
          dataService.getTeamStats(teamB, { from, to }),
        ]);
        setStatsA(a);
        setStatsB(b);
      } catch (err) {
        console.error('Compare load error:', err);
      }
      setLoading(false);
    })();
  }, [teamA, teamB, period]);

  const metrics = [
    { label: '平均ストレススコア', key: 'avgStress', unit: '', badge: true },
    { label: '平均心拍数', key: 'avgHr', unit: ' bpm', badge: false },
    { label: '平均RMSSD', key: 'avgHrv.rmssd', unit: ' ms', badge: false },
    { label: '平均SDNN', key: 'avgHrv.sdnn', unit: ' ms', badge: false },
    { label: '計測回数', key: 'measurementCount', unit: '件', badge: false },
  ];

  const getValue = (stats, key) => {
    if (!stats?.stats) return null;
    const parts = key.split('.');
    let v = stats.stats;
    for (const p of parts) v = v?.[p];
    return v ?? null;
  };

  const diffColor = (a, b, inverse = false) => {
    if (a == null || b == null) return '#9ca3af';
    const d = a - b;
    if (inverse) return d < -3 ? '#22c55e' : d > 3 ? '#ef4444' : '#9ca3af';
    return d > 3 ? '#22c55e' : d < -3 ? '#ef4444' : '#9ca3af';
  };

  return (
    <div className="adm-view">
      <h2 className="adm-view-title">部署間比較レポート</h2>
      <p className="adm-view-desc">2つの部署を選択して、ストレス推移・参加率・HRV指標を対比します。</p>

      <div className="adm-compare-selectors">
        <div className="adm-export-field">
          <label className="adm-export-label">部署A</label>
          <select
            className="adm-export-select"
            value={teamA}
            onChange={(e) => setTeamA(e.target.value)}
            aria-label="比較部署A"
          >
            <option value="">選択してください</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === teamB}>{t.name}</option>
            ))}
          </select>
        </div>
        <div className="adm-compare-vs">VS</div>
        <div className="adm-export-field">
          <label className="adm-export-label">部署B</label>
          <select
            className="adm-export-select"
            value={teamB}
            onChange={(e) => setTeamB(e.target.value)}
            aria-label="比較部署B"
          >
            <option value="">選択してください</option>
            {teams.map((t) => (
              <option key={t.id} value={t.id} disabled={t.id === teamA}>{t.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="adm-export-field" style={{ marginTop: 12 }}>
        <label className="adm-export-label">比較期間</label>
        <select
          className="adm-export-select"
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value))}
          aria-label="比較期間"
        >
          <option value={7}>直近7日間</option>
          <option value={30}>直近30日間</option>
          <option value={90}>直近90日間</option>
        </select>
      </div>

      {loading && <div style={{ marginTop: 16, color: '#666' }}>読み込み中...</div>}

      {!loading && teamA && teamB && teamA !== teamB && statsA && statsB && (
        <div style={{ marginTop: 24 }}>
          {(statsA.privacyFiltered || statsB.privacyFiltered) && (
            <div className="adm-privacy-note" style={{ marginBottom: 12 }}>
              ※ 5名未満の部署は集計対象外です。
            </div>
          )}

          <table className="adm-table adm-compare-table">
            <thead>
              <tr>
                <th>指標</th>
                <th>{statsA.teamName}</th>
                <th>{statsB.teamName}</th>
                <th>差異</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>メンバー数</td>
                <td>{statsA.memberCount}名</td>
                <td>{statsB.memberCount}名</td>
                <td>---</td>
              </tr>
              {metrics.map(({ label, key, unit, badge }) => {
                const va = getValue(statsA, key);
                const vb = getValue(statsB, key);
                const diff = va != null && vb != null ? Math.round((va - vb) * 10) / 10 : null;
                const isStress = key === 'avgStress';

                return (
                  <tr key={key}>
                    <td>{label}</td>
                    <td>
                      {va != null ? (badge ? <StatusBadge score={va} /> : `${va}${unit}`) : '---'}
                    </td>
                    <td>
                      {vb != null ? (badge ? <StatusBadge score={vb} /> : `${vb}${unit}`) : '---'}
                    </td>
                    <td style={{ color: diff != null ? diffColor(va, vb, isStress) : '#9ca3af', fontWeight: 600 }}>
                      {diff != null ? `${diff > 0 ? '+' : ''}${diff}` : '---'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Visual bar comparison for stress */}
          {!statsA.privacyFiltered && !statsB.privacyFiltered && statsA.stats && statsB.stats && (
            <div className="adm-compare-bars" style={{ marginTop: 20 }}>
              <h3 className="adm-section-title">ストレススコア比較</h3>
              <div className="adm-compare-bar-row">
                <span className="adm-compare-bar-label">{statsA.teamName}</span>
                <div className="adm-compare-bar-track">
                  <div
                    className="adm-compare-bar-fill"
                    style={{
                      width: `${Math.min(statsA.stats.avgStress, 100)}%`,
                      background: stressStatus(statsA.stats.avgStress).color,
                    }}
                  />
                </div>
                <span className="adm-compare-bar-value">{statsA.stats.avgStress}</span>
              </div>
              <div className="adm-compare-bar-row">
                <span className="adm-compare-bar-label">{statsB.teamName}</span>
                <div className="adm-compare-bar-track">
                  <div
                    className="adm-compare-bar-fill"
                    style={{
                      width: `${Math.min(statsB.stats.avgStress, 100)}%`,
                      background: stressStatus(statsB.stats.avgStress).color,
                    }}
                  />
                </div>
                <span className="adm-compare-bar-value">{statsB.stats.avgStress}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {!teamA || !teamB ? (
        <div className="adm-empty-state" style={{ marginTop: 24 }}>
          <p>2つの部署を選択すると比較レポートが表示されます。</p>
        </div>
      ) : teamA === teamB ? (
        <div className="adm-privacy-note" style={{ marginTop: 16 }}>
          異なる部署を選択してください。
        </div>
      ) : null}
    </div>
  );
}

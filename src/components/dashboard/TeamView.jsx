import { useState, useEffect } from 'react';
import { dataService } from '../../services/index.js';
import { stressStatus, StatusBadge, KPICard } from './AdminDashboard.jsx';

export default function TeamView({ teamStats, orgId }) {
  const [period, setPeriod] = useState('4weeks');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [weeklyData, setWeeklyData] = useState([]);
  const [monthComparison, setMonthComparison] = useState(null);
  const [drillTeamId, setDrillTeamId] = useState(null);
  const [dailyData, setDailyData] = useState([]);

  useEffect(() => {
    loadWeeklyData();
  }, [orgId, period]);

  useEffect(() => {
    loadMonthComparison();
  }, [orgId, teamStats]);

  useEffect(() => {
    if (drillTeamId) {
      loadDailyData(drillTeamId);
    } else {
      setDailyData([]);
    }
  }, [drillTeamId]);

  async function loadDailyData(teamId) {
    const days = [];
    for (let d = 13; d >= 0; d--) {
      const dayStart = new Date();
      dayStart.setDate(dayStart.getDate() - d);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);

      const label = `${dayStart.getMonth() + 1}/${dayStart.getDate()}`;
      const stats = await dataService.getTeamStats(teamId, {
        from: dayStart.toISOString(),
        to: dayEnd.toISOString(),
      });
      if (stats.stats && !stats.privacyFiltered) {
        days.push({ label, avgStress: stats.stats.avgStress, count: stats.stats.measurementCount });
      } else {
        days.push({ label, avgStress: null, count: 0 });
      }
    }
    setDailyData(days);
  }

  async function loadWeeklyData() {
    const weeks = period === '1week' ? 1 : period === '4weeks' ? 4 : period === '3months' ? 12 : 52;
    const data = [];

    for (let w = weeks - 1; w >= 0; w--) {
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1 - w * 7);
      weekStart.setHours(0, 0, 0, 0);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weekEnd.setHours(23, 59, 59, 999);

      const weekLabel = `${weekStart.getMonth() + 1}/${weekStart.getDate()}週`;

      const teamWeekData = { label: weekLabel, teams: {} };
      for (const ts of teamStats) {
        const stats = await dataService.getTeamStats(ts.teamId, {
          from: weekStart.toISOString(),
          to: weekEnd.toISOString(),
        });
        if (stats.stats && !stats.privacyFiltered) {
          teamWeekData.teams[ts.teamId] = {
            name: ts.teamName,
            avgStress: stats.stats.avgStress,
            count: stats.stats.measurementCount,
          };
        }
      }
      data.push(teamWeekData);
    }
    setWeeklyData(data);
  }

  async function loadMonthComparison() {
    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const thisMonthLabel = `${thisMonthStart.getFullYear()}年${thisMonthStart.getMonth() + 1}月`;
    const lastMonthLabel = `${lastMonthStart.getFullYear()}年${lastMonthStart.getMonth() + 1}月`;

    const result = { thisMonth: { label: thisMonthLabel, teams: {} }, lastMonth: { label: lastMonthLabel, teams: {} }, orgThis: null, orgLast: null };

    let totalStressThis = 0, totalCountThis = 0;
    let totalStressLast = 0, totalCountLast = 0;

    for (const ts of teamStats) {
      if (ts.privacyFiltered) continue;
      const thisStats = await dataService.getTeamStats(ts.teamId, { from: thisMonthStart.toISOString(), to: thisMonthEnd.toISOString() });
      const lastStats = await dataService.getTeamStats(ts.teamId, { from: lastMonthStart.toISOString(), to: lastMonthEnd.toISOString() });

      if (thisStats.stats && !thisStats.privacyFiltered) {
        result.thisMonth.teams[ts.teamId] = { name: ts.teamName, avgStress: thisStats.stats.avgStress, count: thisStats.stats.measurementCount };
        totalStressThis += thisStats.stats.avgStress * thisStats.stats.measurementCount;
        totalCountThis += thisStats.stats.measurementCount;
      }
      if (lastStats.stats && !lastStats.privacyFiltered) {
        result.lastMonth.teams[ts.teamId] = { name: ts.teamName, avgStress: lastStats.stats.avgStress, count: lastStats.stats.measurementCount };
        totalStressLast += lastStats.stats.avgStress * lastStats.stats.measurementCount;
        totalCountLast += lastStats.stats.measurementCount;
      }
    }

    result.orgThis = totalCountThis > 0 ? Math.round(totalStressThis / totalCountThis) : null;
    result.orgLast = totalCountLast > 0 ? Math.round(totalStressLast / totalCountLast) : null;

    setMonthComparison(result);
  }

  // SVGチャート描画
  const chartW = 600, chartH = 280, padL = 45, padR = 20, padT = 20, padB = 40;
  const plotW = chartW - padL - padR;
  const plotH = chartH - padT - padB;

  const COLORS = ['#4f8cff', '#f59e0b', '#22c55e', '#ef4444', '#8b5cf6', '#ec4899'];

  // チームごとのライン
  const teamIds = [...new Set(teamStats.filter(t => !t.privacyFiltered).map(t => t.teamId))];
  const visibleTeams = selectedTeam === 'all' ? teamIds : [selectedTeam];

  function getY(stress) {
    const minY = 0, maxY = 100;
    return padT + plotH - ((stress - minY) / (maxY - minY)) * plotH;
  }

  function getX(i) {
    if (weeklyData.length <= 1) return padL + plotW / 2;
    return padL + (i / (weeklyData.length - 1)) * plotW;
  }

  // 今週のサマリー
  const latestWeek = weeklyData[weeklyData.length - 1];
  const prevWeek = weeklyData.length >= 2 ? weeklyData[weeklyData.length - 2] : null;

  let totalStress = 0, totalCount = 0;
  if (latestWeek) {
    for (const td of Object.values(latestWeek.teams)) {
      totalStress += td.avgStress * td.count;
      totalCount += td.count;
    }
  }
  const currentAvg = totalCount > 0 ? Math.round(totalStress / totalCount) : null;

  let prevAvg = null;
  if (prevWeek) {
    let ps = 0, pc = 0;
    for (const td of Object.values(prevWeek.teams)) {
      ps += td.avgStress * td.count;
      pc += td.count;
    }
    if (pc > 0) prevAvg = Math.round(ps / pc);
  }
  const diff = currentAvg != null && prevAvg != null ? currentAvg - prevAvg : null;

  return (
    <div className="adm-view">
      <h2 className="adm-view-title">チーム ストレス推移</h2>

      <div className="adm-filters">
        <label>
          部署:
          <select value={selectedTeam} onChange={(e) => setSelectedTeam(e.target.value)}>
            <option value="all">全部署</option>
            {teamStats.filter(t => !t.privacyFiltered).map(t => (
              <option key={t.teamId} value={t.teamId}>{t.teamName}</option>
            ))}
          </select>
        </label>
        <label>
          期間:
          <select value={period} onChange={(e) => setPeriod(e.target.value)}>
            <option value="1week">直近1週間</option>
            <option value="4weeks">直近4週間</option>
            <option value="3months">直近3ヶ月</option>
            <option value="all">全期間</option>
          </select>
        </label>
      </div>

      <div className="adm-chart-container">
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="adm-chart-svg" role="img" aria-label="チーム別ストレス推移チャート">
          {/* Y軸グリッド */}
          {[0, 25, 50, 75, 100].map(v => (
            <g key={v}>
              <line x1={padL} y1={getY(v)} x2={chartW - padR} y2={getY(v)} stroke="#2d3140" strokeWidth="1" />
              <text x={padL - 8} y={getY(v) + 4} textAnchor="end" fill="#9ca3af" fontSize="11">{v}</text>
            </g>
          ))}

          {/* ストレスゾーン背景 */}
          <rect x={padL} y={getY(55)} width={plotW} height={getY(36) - getY(55)} fill="rgba(245,158,11,0.05)" />
          <rect x={padL} y={getY(100)} width={plotW} height={getY(56) - getY(100)} fill="rgba(239,68,68,0.05)" />

          {/* X軸ラベル */}
          {weeklyData.map((wd, i) => (
            <text key={i} x={getX(i)} y={chartH - 8} textAnchor="middle" fill="#9ca3af" fontSize="11">
              {wd.label}
            </text>
          ))}

          {/* データライン */}
          {visibleTeams.map((teamId, tIdx) => {
            const points = weeklyData
              .map((wd, i) => wd.teams[teamId] ? { x: getX(i), y: getY(wd.teams[teamId].avgStress) } : null)
              .filter(Boolean);
            if (points.length < 2) return null;
            const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
            return (
              <g key={teamId}>
                <path d={pathD} fill="none" stroke={COLORS[tIdx % COLORS.length]} strokeWidth="2.5" />
                {points.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="4" fill={COLORS[tIdx % COLORS.length]} />
                ))}
              </g>
            );
          })}
        </svg>

        {/* 凡例 */}
        <div className="adm-chart-legend">
          {teamStats.map((ts, i) => (
            <span key={ts.teamId} className="adm-legend-item">
              <span className="adm-legend-dot" style={{ background: ts.privacyFiltered ? '#9ca3af' : COLORS[i % COLORS.length] }} />
              {ts.teamName}
              {ts.privacyFiltered && <small className="adm-text-muted">（データ不足）</small>}
            </span>
          ))}
        </div>
      </div>

      {/* 今週のサマリー */}
      <h3 className="adm-section-title">今週のサマリー</h3>
      <div className="adm-kpi-row">
        <KPICard value={`${totalCount}件`} label="計測完了" />
        <KPICard
          value={currentAvg != null ? currentAvg : '---'}
          label="平均ストレス"
          sub={currentAvg != null ? stressStatus(currentAvg).label : ''}
        />
        <KPICard
          value={diff != null ? `${diff > 0 ? '+' : ''}${diff}` : '---'}
          label="前週比"
          sub={diff != null ? (diff < 0 ? '改善' : diff > 0 ? '悪化' : '変化なし') : ''}
        />
      </div>

      {/* 部署別日次ドリルダウン */}
      {drillTeamId && (() => {
        const team = teamStats.find(t => t.teamId === drillTeamId);
        if (!team) return null;
        const teamColorIdx = teamStats.filter(t => !t.privacyFiltered).indexOf(team);
        const lineColor = COLORS[(teamColorIdx >= 0 ? teamColorIdx : 0) % COLORS.length];

        const dW = 600, dH = 220, dPL = 45, dPR = 20, dPT = 20, dPB = 40;
        const dPlotW = dW - dPL - dPR;
        const dPlotH = dH - dPT - dPB;
        const getDY = (s) => dPT + dPlotH - (s / 100) * dPlotH;
        const getDX = (i) => dailyData.length <= 1 ? dPL + dPlotW / 2 : dPL + (i / (dailyData.length - 1)) * dPlotW;

        const points = dailyData.map((d, i) => d.avgStress != null ? { x: getDX(i), y: getDY(d.avgStress), stress: d.avgStress, label: d.label, count: d.count } : null);
        const validPoints = points.filter(Boolean);
        const pathD = validPoints.length >= 2
          ? validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
          : '';

        const validStresses = dailyData.filter(d => d.avgStress != null);
        const avg14 = validStresses.length > 0 ? Math.round(validStresses.reduce((s, d) => s + d.avgStress, 0) / validStresses.length) : null;
        const maxDay = validStresses.length > 0 ? validStresses.reduce((a, b) => a.avgStress > b.avgStress ? a : b) : null;
        const minDay = validStresses.length > 0 ? validStresses.reduce((a, b) => a.avgStress < b.avgStress ? a : b) : null;

        return (
          <>
            <h3 className="adm-section-title" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>{team.teamName} の日次推移（直近14日間）</span>
              <button className="adm-btn-ghost adm-drill-close" onClick={() => setDrillTeamId(null)} aria-label="閉じる">✕</button>
            </h3>
            <div className="adm-chart-container">
              <svg viewBox={`0 0 ${dW} ${dH}`} className="adm-chart-svg" role="img" aria-label={`${team.teamName}の日次ストレス推移チャート`}>
                {/* Y軸グリッド */}
                {[0, 25, 50, 75, 100].map(v => (
                  <g key={v}>
                    <line x1={dPL} y1={getDY(v)} x2={dW - dPR} y2={getDY(v)} stroke="#2d3140" strokeWidth="1" />
                    <text x={dPL - 8} y={getDY(v) + 4} textAnchor="end" fill="#9ca3af" fontSize="11">{v}</text>
                  </g>
                ))}

                {/* ストレスゾーン背景 */}
                <rect x={dPL} y={getDY(55)} width={dPlotW} height={getDY(36) - getDY(55)} fill="rgba(245,158,11,0.05)" />
                <rect x={dPL} y={getDY(100)} width={dPlotW} height={getDY(56) - getDY(100)} fill="rgba(239,68,68,0.05)" />

                {/* X軸ラベル */}
                {dailyData.map((d, i) => (
                  <text key={i} x={getDX(i)} y={dH - 8} textAnchor="middle" fill="#9ca3af" fontSize="10">
                    {d.label}
                  </text>
                ))}

                {/* データライン */}
                {pathD && <path d={pathD} fill="none" stroke={lineColor} strokeWidth="2.5" />}
                {validPoints.map((p, i) => (
                  <circle key={i} cx={p.x} cy={p.y} r="4" fill={lineColor}>
                    <title>{`${p.label}: スコア ${p.stress}（${p.count}件）`}</title>
                  </circle>
                ))}
              </svg>
            </div>
            <div className="adm-kpi-row">
              <KPICard
                value={avg14 != null ? avg14 : '---'}
                label="14日平均"
                sub={avg14 != null ? stressStatus(avg14).label : ''}
              />
              <KPICard
                value={maxDay ? `${maxDay.avgStress}` : '---'}
                label="最高スコア日"
                sub={maxDay ? maxDay.label : ''}
              />
              <KPICard
                value={minDay ? `${minDay.avgStress}` : '---'}
                label="最低スコア日"
                sub={minDay ? minDay.label : ''}
              />
            </div>
          </>
        );
      })()}

      {/* 部署別ステータス */}
      <h3 className="adm-section-title">部署別ステータス</h3>
      <div className="adm-status-list">
        {teamStats.map(ts => {
          if (ts.privacyFiltered) {
            return (
              <div key={ts.teamId} className="adm-status-item adm-status-muted">
                <span className="adm-status-label">データ不足</span>
                <span>{ts.teamName}（計測者{ts.memberCount}名 — あと{5 - ts.memberCount}名の参加で集計可能）</span>
              </div>
            );
          }
          const s = stressStatus(ts.stats?.avgStress || 0);
          return (
            <div key={ts.teamId} className={`adm-status-item adm-status-${s.level}`}>
              <span className="adm-status-label">{s.label}</span>
              <span>
                <button
                  className="adm-drill-link"
                  onClick={() => setDrillTeamId(ts.teamId)}
                >
                  {ts.teamName}
                </button>
                （ストレススコア {ts.stats?.avgStress}）
              </span>
            </div>
          );
        })}
      </div>

      {/* 期間比較レポート（先月 vs 今月） */}
      {monthComparison && (monthComparison.orgThis != null || monthComparison.orgLast != null) && (() => {
        const orgDiff = monthComparison.orgThis != null && monthComparison.orgLast != null
          ? monthComparison.orgThis - monthComparison.orgLast : null;
        const teamIds = [...new Set([
          ...Object.keys(monthComparison.thisMonth.teams),
          ...Object.keys(monthComparison.lastMonth.teams),
        ])];

        return (
          <>
            <h3 className="adm-section-title">期間比較レポート</h3>
            <div className="adm-kpi-row" aria-label="期間比較サマリー">
              <KPICard
                value={monthComparison.orgLast != null ? monthComparison.orgLast : '---'}
                label={monthComparison.lastMonth.label}
                sub={monthComparison.orgLast != null ? stressStatus(monthComparison.orgLast).label : 'データなし'}
              />
              <KPICard
                value={monthComparison.orgThis != null ? monthComparison.orgThis : '---'}
                label={monthComparison.thisMonth.label}
                sub={monthComparison.orgThis != null ? stressStatus(monthComparison.orgThis).label : 'データなし'}
              />
              <KPICard
                value={orgDiff != null ? `${orgDiff > 0 ? '+' : ''}${orgDiff}` : '---'}
                label="前月比"
                sub={orgDiff != null ? (orgDiff < 0 ? '改善' : orgDiff > 0 ? '悪化' : '変化なし') : ''}
              />
            </div>

            {teamIds.length > 0 && (
              <div className="adm-table-wrap">
                <table className="adm-table" aria-label="部署別月間比較">
                  <thead>
                    <tr>
                      <th scope="col">部署</th>
                      <th scope="col">{monthComparison.lastMonth.label}</th>
                      <th scope="col">{monthComparison.thisMonth.label}</th>
                      <th scope="col">変化</th>
                    </tr>
                  </thead>
                  <tbody>
                    {teamIds.map(tid => {
                      const last = monthComparison.lastMonth.teams[tid];
                      const curr = monthComparison.thisMonth.teams[tid];
                      const name = (curr || last).name;
                      const d = last && curr ? curr.avgStress - last.avgStress : null;
                      return (
                        <tr key={tid}>
                          <td>{name}</td>
                          <td>{last ? <StatusBadge score={last.avgStress} /> : <span style={{ color: '#9ca3af' }}>---</span>}</td>
                          <td>{curr ? <StatusBadge score={curr.avgStress} /> : <span style={{ color: '#9ca3af' }}>---</span>}</td>
                          <td style={{ color: d != null ? (d < -3 ? '#22c55e' : d > 3 ? '#ef4444' : '#9ca3af') : '#9ca3af', fontWeight: 600 }}>
                            {d != null ? `${d > 0 ? '+' : ''}${d}` : '---'}
                            {d != null && <small style={{ marginLeft: 4, fontWeight: 400 }}>{d < -3 ? '改善' : d > 3 ? '悪化' : '横ばい'}</small>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            <p className="adm-privacy-note">
              ※ 組織全体のストレススコア推移: {monthComparison.lastMonth.label} {monthComparison.orgLast ?? '---'} → {monthComparison.thisMonth.label} {monthComparison.orgThis ?? '---'}
            </p>
          </>
        );
      })()}

      {/* 部署間ベンチマーク比較 */}
      {(() => {
        const benchmarkTeams = teamStats.filter(ts => !ts.privacyFiltered && ts.stats);
        if (benchmarkTeams.length < 2) return null;

        const allAvg = benchmarkTeams.reduce((sum, ts) => sum + (ts.stats.avgStress || 0), 0) / benchmarkTeams.length;
        const orgAvg = Math.round(allAvg);
        const sorted = [...benchmarkTeams].sort((a, b) => (a.stats.avgStress || 0) - (b.stats.avgStress || 0));

        return (
          <>
            <h3 className="adm-section-title">部署間ベンチマーク</h3>
            <div className="adm-table-wrap">
              <table className="adm-table" aria-label="部署間ベンチマーク比較">
                <thead>
                  <tr>
                    <th scope="col">順位</th>
                    <th scope="col">部署</th>
                    <th scope="col">ストレススコア</th>
                    <th scope="col">組織平均との差</th>
                    <th scope="col">参加率</th>
                  </tr>
                </thead>
                <tbody>
                  {sorted.map((ts, idx) => {
                    const score = ts.stats.avgStress || 0;
                    const diff = score - orgAvg;
                    const participation = ts.memberCount > 0
                      ? Math.round((ts.stats.measurementCount / ts.memberCount) * 100)
                      : 0;
                    return (
                      <tr key={ts.teamId}>
                        <td>{idx + 1}</td>
                        <td>{ts.teamName}</td>
                        <td><StatusBadge score={score} /></td>
                        <td style={{ color: diff > 5 ? '#ef4444' : diff < -5 ? '#22c55e' : '#9ca3af' }}>
                          {diff > 0 ? '+' : ''}{diff}
                        </td>
                        <td>{participation}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="adm-privacy-note">
              ※ 組織全体の平均ストレススコア: {orgAvg}（{benchmarkTeams.length}部署の集計）
            </p>
          </>
        );
      })()}
    </div>
  );
}

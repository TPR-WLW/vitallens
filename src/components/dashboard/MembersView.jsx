import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../../services/index.js';

export default function MembersView({ session, teams, onRefresh }) {
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [newDeptName, setNewDeptName] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);

  useEffect(() => {
    loadMembers();
  }, [session.orgId]);

  async function loadMembers() {
    const users = await dataService.getUsersByOrg(session.orgId);
    // 各ユーザーのチーム情報を取得
    const enriched = [];
    for (const u of users) {
      const memberships = await dataService.getTeamMembers
        ? null : null; // チーム情報はteamMembershipsから
      enriched.push(u);
    }
    setMembers(users);
  }

  async function handleMemberClick(memberId) {
    if (memberId !== session.userId) return;
    if (expandedMemberId === memberId) {
      setExpandedMemberId(null);
      setTimelineData(null);
      return;
    }
    setExpandedMemberId(memberId);
    setTimelineLoading(true);
    try {
      const measurements = await dataService.getMeasurements({ userId: memberId });
      const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const recent = (measurements || []).filter(m => new Date(m.timestamp).getTime() >= thirtyDaysAgo);
      setTimelineData(recent);
    } catch {
      setTimelineData([]);
    }
    setTimelineLoading(false);
  }

  const inviteLink = `${window.location.origin}${window.location.pathname}?invite=${session.orgId}`;

  const copyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink).catch(() => {});
  };

  const handleAddDept = async () => {
    if (!newDeptName.trim()) return;
    await dataService.createTeam({ name: newDeptName.trim(), orgId: session.orgId });
    setNewDeptName('');
    onRefresh();
  };

  const filteredMembers = filter === 'all'
    ? members
    : members; // フィルタリングは将来拡張

  return (
    <div className="adm-view">
      <h2 className="adm-view-title">メンバー管理</h2>

      {/* 招待リンク */}
      <div className="adm-invite-section">
        <h3 className="adm-section-title">招待リンク</h3>
        <div className="adm-invite-row">
          <input type="text" readOnly value={inviteLink} className="adm-invite-input" />
          <button className="adm-btn-secondary" onClick={copyInviteLink}>リンクをコピー</button>
        </div>
        <p className="adm-privacy-note">※ このリンクを共有してメンバーを招待してください</p>
      </div>

      {/* メンバー一覧 */}
      <h3 className="adm-section-title">メンバー一覧（{members.length}名）</h3>
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>表示名</th>
              <th>ロール</th>
              <th>参加日</th>
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(m => {
              const isOwn = m.id === session.userId;
              const isExpanded = expandedMemberId === m.id;
              return (
                <React.Fragment key={m.id}>
                  <tr
                    className={isOwn ? 'adm-member-clickable' : ''}
                    onClick={() => handleMemberClick(m.id)}
                    title={isOwn ? 'クリックしてスコア推移を表示' : ''}
                  >
                    <td>
                      {m.name}
                      {isOwn && <span className="adm-member-you-badge">あなた</span>}
                      {isOwn && (isExpanded ? ' \u25B2' : ' \u25BC')}
                    </td>
                    <td>{m.role === 'admin' ? '管理者' : 'メンバー'}</td>
                    <td>{new Date(m.createdAt).toLocaleDateString('ja-JP')}</td>
                  </tr>
                  {isOwn && isExpanded && (
                    <tr>
                      <td colSpan={3} style={{ padding: 0, border: 'none' }}>
                        <ScoreTimeline
                          data={timelineData}
                          loading={timelineLoading}
                          onClose={() => { setExpandedMemberId(null); setTimelineData(null); }}
                        />
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* 部署管理 */}
      <h3 className="adm-section-title">部署管理</h3>
      <div className="adm-dept-manage">
        {teams.map(t => (
          <div key={t.id} className="adm-dept-manage-row">
            <span>{t.name}</span>
          </div>
        ))}
        <div className="adm-dept-add-row">
          <input
            type="text"
            placeholder="新しい部署名"
            value={newDeptName}
            onChange={(e) => setNewDeptName(e.target.value)}
          />
          <button className="adm-btn-secondary" onClick={handleAddDept}>追加</button>
        </div>
      </div>

      <p className="adm-privacy-note">
        ※ メンバーの計測データは匿名集計のみ閲覧可能です。個人の計測結果を管理者が閲覧することはできません。
        自分自身のスコア推移のみ確認できます。
      </p>
    </div>
  );
}

/* ===== Score Timeline Component ===== */

function ScoreTimeline({ data, loading, onClose }) {
  // Aggregate daily averages from measurements (must be before any returns per Rules of Hooks)
  const dailyScores = useMemo(() => {
    if (!data || data.length === 0) return [];
    const byDay = {};
    for (const m of data) {
      if (m.stressScore == null) continue;
      const day = new Date(m.timestamp).toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(m.stressScore);
    }
    return Object.entries(byDay)
      .map(([date, scores]) => ({
        date,
        avg: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
        count: scores.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [data]);

  if (loading) {
    return (
      <div className="adm-member-timeline">
        <p className="adm-text-muted" style={{ textAlign: 'center', padding: '24px' }}>読み込み中...</p>
      </div>
    );
  }

  if (dailyScores.length === 0) {
    return (
      <div className="adm-member-timeline">
        <div className="adm-timeline-header">
          <span className="adm-timeline-title">ストレススコア推移（過去30日）</span>
          <button className="adm-btn-ghost adm-timeline-close" onClick={onClose}>閉じる</button>
        </div>
        <p className="adm-text-muted" style={{ textAlign: 'center', padding: '24px' }}>
          ストレススコアのデータがありません
        </p>
      </div>
    );
  }

  // Summary stats
  const allScores = dailyScores.map(d => d.avg);
  const avgScore = Math.round(allScores.reduce((a, b) => a + b, 0) / allScores.length);
  const maxScore = Math.max(...allScores);
  const minScore = Math.min(...allScores);
  const totalCount = data.filter(m => m.stressScore != null).length;

  // SVG chart dimensions
  const W = 700, H = 200;
  const PAD = { top: 20, right: 20, bottom: 40, left: 40 };
  const chartW = W - PAD.left - PAD.right;
  const chartH = H - PAD.top - PAD.bottom;

  const xScale = (i) => PAD.left + (dailyScores.length === 1 ? chartW / 2 : (i / (dailyScores.length - 1)) * chartW);
  const yScale = (v) => PAD.top + chartH - (v / 100) * chartH;

  // Build polyline points
  const points = dailyScores.map((d, i) => `${xScale(i)},${yScale(d.avg)}`).join(' ');

  // Zone boundaries
  const y40 = yScale(40);
  const y60 = yScale(60);
  const y0 = yScale(0);
  const y100 = yScale(100);

  return (
    <div className="adm-member-timeline">
      <div className="adm-timeline-header">
        <span className="adm-timeline-title">ストレススコア推移（過去30日）</span>
        <button className="adm-btn-ghost adm-timeline-close" onClick={onClose}>閉じる</button>
      </div>

      <div className="adm-chart-container" style={{ marginBottom: '12px' }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="adm-chart-svg">
          {/* Background zones */}
          <rect x={PAD.left} y={y100} width={chartW} height={y60 - y100} fill="rgba(239,68,68,0.08)" />
          <rect x={PAD.left} y={y60} width={chartW} height={y40 - y60} fill="rgba(245,158,11,0.08)" />
          <rect x={PAD.left} y={y40} width={chartW} height={y0 - y40} fill="rgba(34,197,94,0.08)" />

          {/* Zone labels */}
          <text x={PAD.left + 4} y={y100 + 14} fontSize="10" fill="#ef4444" opacity="0.7">要対応</text>
          <text x={PAD.left + 4} y={y60 + 14} fontSize="10" fill="#f59e0b" opacity="0.7">注意</text>
          <text x={PAD.left + 4} y={y40 + 14} fontSize="10" fill="#22c55e" opacity="0.7">良好</text>

          {/* Y axis labels */}
          {[0, 20, 40, 60, 80, 100].map(v => (
            <React.Fragment key={v}>
              <text x={PAD.left - 6} y={yScale(v) + 4} fontSize="10" fill="#9ca3af" textAnchor="end">{v}</text>
              <line x1={PAD.left} y1={yScale(v)} x2={PAD.left + chartW} y2={yScale(v)} stroke="#374151" strokeWidth="0.5" opacity="0.3" />
            </React.Fragment>
          ))}

          {/* X axis date labels (show first, last, and some middle ones) */}
          {dailyScores.map((d, i) => {
            const total = dailyScores.length;
            if (total <= 7 || i === 0 || i === total - 1 || i % Math.ceil(total / 6) === 0) {
              return (
                <text key={d.date} x={xScale(i)} y={H - 6} fontSize="9" fill="#9ca3af" textAnchor="middle">
                  {d.date.slice(5)}
                </text>
              );
            }
            return null;
          })}

          {/* Line */}
          <polyline points={points} fill="none" stroke="#4f8cff" strokeWidth="2" strokeLinejoin="round" />

          {/* Data points with hover titles */}
          {dailyScores.map((d, i) => (
            <circle key={d.date} cx={xScale(i)} cy={yScale(d.avg)} r="4" fill="#4f8cff" stroke="#1a1a2e" strokeWidth="1.5">
              <title>{`${d.date}: ${d.avg}点（${d.count}回計測）`}</title>
            </circle>
          ))}
        </svg>

        <div className="adm-chart-legend">
          <span className="adm-legend-item"><span className="adm-legend-dot" style={{ background: '#22c55e' }} /> 良好 (0-40)</span>
          <span className="adm-legend-item"><span className="adm-legend-dot" style={{ background: '#f59e0b' }} /> 注意 (40-60)</span>
          <span className="adm-legend-item"><span className="adm-legend-dot" style={{ background: '#ef4444' }} /> 要対応 (60-100)</span>
        </div>
      </div>

      {/* Summary stats */}
      <div className="adm-timeline-stats">
        <div className="adm-timeline-stat">
          <span className="adm-timeline-stat-value">{avgScore}</span>
          <span className="adm-timeline-stat-label">平均スコア</span>
        </div>
        <div className="adm-timeline-stat">
          <span className="adm-timeline-stat-value">{maxScore}</span>
          <span className="adm-timeline-stat-label">最高</span>
        </div>
        <div className="adm-timeline-stat">
          <span className="adm-timeline-stat-value">{minScore}</span>
          <span className="adm-timeline-stat-label">最低</span>
        </div>
        <div className="adm-timeline-stat">
          <span className="adm-timeline-stat-value">{totalCount}</span>
          <span className="adm-timeline-stat-label">計測回数</span>
        </div>
      </div>
    </div>
  );
}

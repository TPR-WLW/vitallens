import { useState, useEffect, useCallback } from 'react';
import { dataService } from '../../services/index.js';
import { loadSampleData, isSampleDataLoaded, clearSampleData } from './sample-data.js';
import '../../styles/admin-dashboard.css';

// ===== トラフィックライト =====
function stressStatus(score) {
  if (score <= 35) return { label: '良好', color: '#22c55e', level: 'good' };
  if (score <= 55) return { label: '注意', color: '#f59e0b', level: 'watch' };
  return { label: '要対応', color: '#ef4444', level: 'alert' };
}

function StatusBadge({ score, showScore = true }) {
  if (score == null) {
    return <span className="adm-badge adm-badge-gray">データ不足</span>;
  }
  const s = stressStatus(score);
  return (
    <span className={`adm-badge adm-badge-${s.level}`}>
      {showScore && <span className="adm-badge-score">{score}</span>}
      {s.label}
    </span>
  );
}

// ===== KPIカード =====
function KPICard({ value, label, sub }) {
  return (
    <div className="adm-kpi-card">
      <div className="adm-kpi-value">{value}</div>
      <div className="adm-kpi-label">{label}</div>
      {sub && <div className="adm-kpi-sub">{sub}</div>}
    </div>
  );
}

// ===== 概要ビュー =====
function OverviewView({ orgStats, teamStats, onTeamClick }) {
  const totalMembers = orgStats?.totalMembers || 0;
  const activeMeasured = orgStats?.activeMeasured || 0;
  const participationRate = totalMembers > 0 ? Math.round((activeMeasured / totalMembers) * 100) : 0;
  const avgStress = orgStats?.stats?.avgStress;

  return (
    <div className="adm-view">
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

// ===== チームビュー（ストレス推移） =====
function TeamView({ teamStats, orgId }) {
  const [period, setPeriod] = useState('4weeks');
  const [selectedTeam, setSelectedTeam] = useState('all');
  const [weeklyData, setWeeklyData] = useState([]);

  useEffect(() => {
    loadWeeklyData();
  }, [orgId, period]);

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
        <svg viewBox={`0 0 ${chartW} ${chartH}`} className="adm-chart-svg">
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
              <span>{ts.teamName}（ストレススコア {ts.stats?.avgStress}）</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ===== メンバー管理ビュー =====
function MembersView({ session, teams, onRefresh }) {
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [newDeptName, setNewDeptName] = useState('');

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
            {filteredMembers.map(m => (
              <tr key={m.id}>
                <td>{m.name}</td>
                <td>{m.role === 'admin' ? '管理者' : 'メンバー'}</td>
                <td>{new Date(m.createdAt).toLocaleDateString('ja-JP')}</td>
              </tr>
            ))}
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
      </p>
    </div>
  );
}

// ===== CSV出力ビュー =====
function ExportView({ session, teams }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [teamId, setTeamId] = useState('');
  const [filePrefix, setFilePrefix] = useState('mirucare-report');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const generatePreview = async () => {
    setLoading(true);
    try {
      const opts = {
        from: startDate,
        to: endDate + 'T23:59:59.999Z',
      };
      if (teamId) opts.teamId = teamId;
      const csv = await dataService.exportCSV(session.orgId, opts);
      setPreview(csv);
    } catch {
      setPreview('エラーが発生しました');
    }
    setLoading(false);
  };

  useEffect(() => {
    generatePreview();
  }, [startDate, endDate, teamId]);

  const handleDownload = () => {
    const bom = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([bom + preview], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = filePrefix.trim() || 'mirucare-report';
    a.download = `${prefix}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <div className="adm-view">
      <h2 className="adm-view-title">CSVデータ出力</h2>
      <p className="adm-view-desc">部署別ストレスデータをCSV形式でエクスポートします。稟議書や社内報告書への添付にご利用ください。</p>

      <h3 className="adm-section-title">期間選択</h3>
      <div className="adm-date-range">
        <label>
          開始日:
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          終了日:
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>
      <div className="adm-quick-range">
        <button className="adm-btn-ghost" onClick={() => setQuickRange(7)}>直近1週間</button>
        <button className="adm-btn-ghost" onClick={() => setQuickRange(30)}>直近1ヶ月</button>
        <button className="adm-btn-ghost" onClick={() => setQuickRange(365)}>全期間</button>
      </div>

      <h3 className="adm-section-title">部署フィルター</h3>
      <div className="adm-export-field">
        <select
          className="adm-export-select"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">全部署</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="adm-export-privacy">
        <p>個人の計測データは含まれません</p>
        <p>1日の計測者が5名未満の部署データは除外されます</p>
      </div>

      <button className="adm-btn-primary" onClick={handleDownload} disabled={!preview || loading}>
        CSVをダウンロード
      </button>

      <div className="adm-export-field" style={{ marginTop: 12 }}>
        <label className="adm-export-label">ファイル名</label>
        <div className="adm-export-filename">
          <input
            type="text"
            className="adm-export-input"
            value={filePrefix}
            onChange={(e) => setFilePrefix(e.target.value)}
            placeholder="mirucare-report"
          />
          <span className="adm-export-suffix">-{new Date().toISOString().split('T')[0]}.csv</span>
        </div>
      </div>

      {preview && (
        <>
          <h3 className="adm-section-title" style={{ marginTop: 24 }}>プレビュー</h3>
          <pre className="adm-csv-preview">{preview.split('\n').slice(0, 11).join('\n')}</pre>
        </>
      )}
    </div>
  );
}

// ===== 設定ビュー =====
function SettingsView({ session, orgName, orgStats, onLogout }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState(null); // { type: 'success'|'error', text }
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);

    if (newPassword.length < 8) {
      setPwMsg({ type: 'error', text: '新しいパスワードは8文字以上で入力してください' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: '新しいパスワードが一致しません' });
      return;
    }

    setPwLoading(true);
    try {
      await dataService.changePassword({
        userId: session.userId,
        currentPassword,
        newPassword,
      });
      setPwMsg({ type: 'success', text: 'パスワードを変更しました' });
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setPwMsg({ type: 'error', text: err.message });
    }
    setPwLoading(false);
  };

  const handleDeleteAllMeasurements = async () => {
    setDeleteLoading(true);
    setDeleteMsg(null);
    try {
      const result = await dataService.clearAllMeasurements(session.orgId);
      setDeleteMsg({ type: 'success', text: `${result.deleted}件の計測データを削除しました` });
      setDeleteConfirm(false);
    } catch (err) {
      setDeleteMsg({ type: 'error', text: err.message });
    }
    setDeleteLoading(false);
  };

  return (
    <div className="adm-view">
      <h2 className="adm-view-title">設定</h2>

      {/* 組織情報 */}
      <div className="adm-settings-section">
        <h3 className="adm-section-title">組織情報</h3>
        <div className="adm-settings-card">
          <div className="adm-settings-row">
            <span className="adm-settings-label">組織名</span>
            <span>{orgName || '---'}</span>
          </div>
          <div className="adm-settings-row">
            <span className="adm-settings-label">組織ID（招待コード）</span>
            <code className="adm-settings-code">{session.orgId}</code>
          </div>
          <div className="adm-settings-row">
            <span className="adm-settings-label">メンバー数</span>
            <span>{orgStats?.totalMembers || 0}名</span>
          </div>
        </div>
      </div>

      {/* パスワード変更 */}
      <div className="adm-settings-section">
        <h3 className="adm-section-title">パスワード変更</h3>
        <form className="adm-settings-card" onSubmit={handleChangePassword}>
          {pwMsg && (
            <div className={pwMsg.type === 'success' ? 'adm-settings-success' : 'adm-login-error'}>
              {pwMsg.text}
            </div>
          )}
          <div className="adm-field">
            <span>現在のパスワード</span>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
            />
          </div>
          <div className="adm-field">
            <span>新しいパスワード（8文字以上）</span>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              minLength={8}
              required
            />
          </div>
          <div className="adm-field">
            <span>新しいパスワード（確認）</span>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="adm-btn-primary" disabled={pwLoading}>
            {pwLoading ? '変更中...' : 'パスワードを変更'}
          </button>
        </form>
      </div>

      {/* データ管理 */}
      <div className="adm-settings-section">
        <h3 className="adm-section-title">データ管理</h3>
        <div className="adm-settings-card">
          {deleteMsg && (
            <div className={deleteMsg.type === 'success' ? 'adm-settings-success' : 'adm-login-error'}>
              {deleteMsg.text}
            </div>
          )}
          {!deleteConfirm ? (
            <button
              className="adm-btn-danger"
              onClick={() => setDeleteConfirm(true)}
            >
              全計測データを削除
            </button>
          ) : (
            <div className="adm-settings-confirm">
              <p className="adm-settings-warning">この操作は取り消せません。組織の全計測データが完全に削除されます。</p>
              <div className="adm-settings-confirm-actions">
                <button
                  className="adm-btn-danger"
                  onClick={handleDeleteAllMeasurements}
                  disabled={deleteLoading}
                >
                  {deleteLoading ? '削除中...' : '本当に削除する'}
                </button>
                <button
                  className="adm-btn-secondary"
                  onClick={() => setDeleteConfirm(false)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* アカウント */}
      <div className="adm-settings-section">
        <h3 className="adm-section-title">アカウント</h3>
        <div className="adm-settings-card">
          <div className="adm-settings-row">
            <span className="adm-settings-label">ユーザー名</span>
            <span>{session.userName}</span>
          </div>
          <div className="adm-settings-row">
            <span className="adm-settings-label">ロール</span>
            <span>{session.role === 'admin' ? '管理者' : 'メンバー'}</span>
          </div>
          <button className="adm-btn-secondary" onClick={onLogout} style={{ marginTop: 12 }}>
            ログアウト
          </button>
        </div>
      </div>
    </div>
  );
}

// ===== メインダッシュボード =====
export default function AdminDashboard({ session, onLogout, onStartMeasure }) {
  const [view, setView] = useState('overview');
  const [orgStats, setOrgStats] = useState(null);
  const [teamStats, setTeamStats] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sampleLoaded, setSampleLoaded] = useState(isSampleDataLoaded());
  const [sampleLoading, setSampleLoading] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const org = await dataService.getOrg(session.orgId);
      setOrgName(org?.name || '');

      const orgS = await dataService.getOrgStats(session.orgId);
      setOrgStats(orgS);

      const t = await dataService.getTeams(session.orgId);
      setTeams(t);

      const ts = [];
      for (const team of t) {
        const stats = await dataService.getTeamStats(team.id);
        ts.push(stats);
      }
      setTeamStats(ts);
    } catch (err) {
      console.error('Dashboard data load error:', err);
    }
  }, [session.orgId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleLoadSample = async () => {
    setSampleLoading(true);
    try {
      const result = await loadSampleData();
      setSampleLoaded(true);
      // セッションを更新（サンプルデータのorgIdを使う）
      const newSession = { ...session, orgId: result.orgId };
      localStorage.setItem('mirucare_session', JSON.stringify({ ...newSession, exp: Date.now() + 86400000 }));
      window.location.reload(); // フルリロードでデータ反映
    } catch (err) {
      console.error('Sample data load error:', err);
    }
    setSampleLoading(false);
  };

  const handleClearSample = async () => {
    await clearSampleData();
    setSampleLoaded(false);
    onLogout();
  };

  const handleTeamClick = (teamId) => {
    setView('team');
  };

  const navItems = [
    { id: 'overview', label: 'ダッシュボード' },
    { id: 'team', label: 'チーム' },
    { id: 'members', label: 'メンバー' },
    { id: 'export', label: 'CSV出力' },
    { id: 'settings', label: '設定' },
  ];

  return (
    <div className="adm-layout">
      {/* モバイルヘッダー */}
      <div className="adm-mobile-header">
        <button className="adm-hamburger" onClick={() => setSidebarOpen(!sidebarOpen)}>
          ☰
        </button>
        <span className="adm-mobile-title">ミルケア</span>
        <button className="adm-btn-ghost adm-logout-btn" onClick={onLogout}>ログアウト</button>
      </div>

      {/* サイドバー */}
      <aside className={`adm-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="adm-sidebar-brand">
          <h2>ミルケア</h2>
        </div>

        <nav className="adm-sidebar-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`adm-nav-item ${view === item.id ? 'active' : ''}`}
              onClick={() => { setView(item.id); setSidebarOpen(false); }}
            >
              {item.label}
            </button>
          ))}
        </nav>

        <div className="adm-sidebar-divider" />

        <div className="adm-sidebar-actions">
          {!sampleLoaded ? (
            <button
              className="adm-btn-ghost adm-sidebar-btn"
              onClick={handleLoadSample}
              disabled={sampleLoading}
            >
              {sampleLoading ? '読込中...' : 'サンプルデータ読込'}
            </button>
          ) : (
            <button className="adm-btn-ghost adm-sidebar-btn" onClick={handleClearSample}>
              サンプルをクリア
            </button>
          )}
        </div>

        <div className="adm-sidebar-divider" />

        <button className="adm-btn-ghost adm-sidebar-btn" onClick={onStartMeasure}>
          計測を開始
        </button>

        <div className="adm-sidebar-footer">
          <span className="adm-user-name">{session.userName}</span>
          <button className="adm-link-btn" onClick={onLogout}>ログアウト</button>
        </div>
      </aside>

      {/* メインコンテンツ */}
      <main className="adm-main">
        {sampleLoaded && (
          <div className="adm-sample-banner">
            サンプルデータを表示中です。実際の計測データとは異なります。
            <button className="adm-link-btn" onClick={handleClearSample}>サンプルをクリア</button>
          </div>
        )}

        <div className="adm-main-header">
          <h1>{orgName || '管理画面'}</h1>
        </div>

        {view === 'overview' && (
          <OverviewView orgStats={orgStats} teamStats={teamStats} onTeamClick={handleTeamClick} />
        )}
        {view === 'team' && (
          <TeamView teamStats={teamStats} orgId={session.orgId} />
        )}
        {view === 'members' && (
          <MembersView session={session} teams={teams} onRefresh={loadData} />
        )}
        {view === 'export' && (
          <ExportView session={session} teams={teams} />
        )}
        {view === 'settings' && (
          <SettingsView session={session} orgName={orgName} orgStats={orgStats} onLogout={onLogout} />
        )}
      </main>

      {/* オーバーレイ（モバイルサイドバー用） */}
      {sidebarOpen && <div className="adm-overlay" onClick={() => setSidebarOpen(false)} />}
    </div>
  );
}

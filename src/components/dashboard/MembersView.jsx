import React, { useState, useEffect, useMemo } from 'react';
import { dataService } from '../../services/index.js';

export default function MembersView({ session, teams, onRefresh }) {
  const [members, setMembers] = useState([]);
  const [filter, setFilter] = useState('all');
  const [newDeptName, setNewDeptName] = useState('');
  const [expandedMemberId, setExpandedMemberId] = useState(null);
  const [timelineData, setTimelineData] = useState(null);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [lastMeasurementDates, setLastMeasurementDates] = useState({});
  const [removingMemberId, setRemovingMemberId] = useState(null);
  const [removeMsg, setRemoveMsg] = useState(null);
  const [roleChanging, setRoleChanging] = useState(null);

  useEffect(() => {
    loadMembers();
  }, [session.orgId]);

  async function loadMembers() {
    const users = await dataService.getUsersByOrg(session.orgId);
    setMembers(users);
    // 最終計測日を取得
    try {
      const dates = await dataService.getLastMeasurementDates(session.orgId);
      setLastMeasurementDates(dates);
    } catch { /* ignore */ }
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

  const handleRemoveMember = async (memberId) => {
    setRemoveMsg(null);
    try {
      await dataService.deactivateUser(memberId, session.orgId);
      setRemoveMsg({ type: 'success', text: 'メンバーを削除しました' });
      setRemovingMemberId(null);
      loadMembers();
      onRefresh();
    } catch (err) {
      setRemoveMsg({ type: 'error', text: err.message });
    }
  };

  const handleRoleChange = async (memberId, newRole) => {
    setRemoveMsg(null);
    setRoleChanging(memberId);
    try {
      await dataService.updateUserRole({ userId: memberId, newRole });
      setRemoveMsg({ type: 'success', text: newRole === 'admin' ? '管理者に昇格しました' : 'メンバーに降格しました' });
      loadMembers();
      onRefresh();
    } catch (err) {
      setRemoveMsg({ type: 'error', text: err.message });
    }
    setRoleChanging(null);
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

      {/* メール招待 */}
      <EmailInvite inviteLink={inviteLink} orgName={session.orgId} />

      {/* メンバー一覧 */}
      <h3 className="adm-section-title">メンバー一覧（{members.length}名）</h3>
      {removeMsg && (
        <div className={removeMsg.type === 'success' ? 'adm-csv-success' : 'adm-csv-error'}>
          {removeMsg.text}
        </div>
      )}
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>表示名</th>
              <th>ロール</th>
              <th>参加日</th>
              <th>最終計測</th>
              {session.role === 'admin' && <th>操作</th>}
            </tr>
          </thead>
          <tbody>
            {filteredMembers.map(m => {
              const isOwn = m.id === session.userId;
              const isExpanded = expandedMemberId === m.id;
              const isRemoving = removingMemberId === m.id;
              const colCount = session.role === 'admin' ? 5 : 4;
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
                    <td className={lastMeasurementDates[m.id] && (Date.now() - new Date(lastMeasurementDates[m.id]).getTime() > 7 * 24 * 60 * 60 * 1000) ? 'adm-last-measure-warn' : ''}>
                      {lastMeasurementDates[m.id]
                        ? new Date(lastMeasurementDates[m.id]).toLocaleDateString('ja-JP')
                        : '未計測'}
                    </td>
                    {session.role === 'admin' && (
                      <td onClick={(e) => e.stopPropagation()}>
                        {isOwn ? (
                          <span className="adm-text-muted">---</span>
                        ) : isRemoving ? (
                          <div className="adm-member-remove-confirm">
                            <button className="adm-btn-danger adm-btn-sm" onClick={() => handleRemoveMember(m.id)}>
                              削除する
                            </button>
                            <button className="adm-btn-ghost adm-btn-sm" onClick={() => setRemovingMemberId(null)}>
                              取消
                            </button>
                          </div>
                        ) : (
                          <div className="adm-member-actions">
                            <button
                              className={`adm-btn-ghost adm-btn-sm ${m.role === 'admin' ? 'adm-btn-demote' : 'adm-btn-promote'}`}
                              onClick={() => handleRoleChange(m.id, m.role === 'admin' ? 'member' : 'admin')}
                              disabled={roleChanging === m.id}
                              aria-label={m.role === 'admin' ? `${m.name}をメンバーに降格` : `${m.name}を管理者に昇格`}
                            >
                              {roleChanging === m.id ? '...' : m.role === 'admin' ? '降格' : '昇格'}
                            </button>
                            <button
                              className="adm-btn-ghost adm-btn-sm adm-btn-remove"
                              onClick={() => { setRemovingMemberId(m.id); setRemoveMsg(null); }}
                              aria-label={`${m.name}を削除`}
                            >
                              削除
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                  {isOwn && isExpanded && (
                    <tr>
                      <td colSpan={colCount} style={{ padding: 0, border: 'none' }}>
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

      {/* CSVインポート */}
      <CsvMemberImport session={session} teams={teams} onImportComplete={() => { loadMembers(); onRefresh(); }} />

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

/* ===== Email Invite ===== */

function EmailInvite({ inviteLink, orgName }) {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState([]);
  const [error, setError] = useState('');

  const isValidEmail = (e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  const handleInvite = () => {
    setError('');
    if (!isValidEmail(email)) {
      setError('有効なメールアドレスを入力してください');
      return;
    }
    if (sent.includes(email)) {
      setError('このメールアドレスは既に招待済みです');
      return;
    }

    // メール本文を生成してクリップボードにコピー
    const subject = `ミルケア（MiruCare）への招待`;
    const body = [
      `ミルケアへ招待されました。`,
      ``,
      `以下のリンクからアクセスし、新規登録してください:`,
      inviteLink,
      ``,
      `※ このリンクを開いて「新規登録」タブから登録を行ってください。`,
      `※ 本メールに心当たりがない場合は無視してください。`,
    ].join('\n');

    const mailtoUrl = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

    // メーラーを起動
    window.open(mailtoUrl, '_blank');
    setSent((prev) => [...prev, email]);
    setEmail('');
  };

  return (
    <div className="adm-invite-section" style={{ marginTop: 16 }}>
      <h3 className="adm-section-title">メール招待</h3>
      <div className="adm-invite-row">
        <input
          type="email"
          className="adm-invite-input"
          placeholder="メールアドレスを入力"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
          aria-label="招待メールアドレス"
        />
        <button className="adm-btn-primary" onClick={handleInvite} disabled={!email.trim()}>
          招待メールを送信
        </button>
      </div>
      {error && <p className="adm-csv-error">{error}</p>}
      {sent.length > 0 && (
        <div className="adm-invite-sent-list">
          <p className="adm-privacy-note">送信済み（{sent.length}件）:</p>
          <ul className="adm-invite-sent-emails">
            {sent.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
      )}
      <p className="adm-privacy-note">
        ※ お使いのメールアプリが起動します。招待リンクが本文に含まれます。
      </p>
    </div>
  );
}

/* ===== CSV Member Import ===== */

function CsvMemberImport({ session, teams, onImportComplete }) {
  const [parsedRows, setParsedRows] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [importing, setImporting] = useState(false);
  const fileInputRef = React.useRef(null);

  function parseCSV(text) {
    const lines = text.split(/\r?\n/).filter(l => l.trim());
    if (lines.length < 2) throw new Error('ヘッダー行とデータ行が必要です');

    const header = lines[0].split(',').map(h => h.trim().toLowerCase());
    const nameIdx = header.findIndex(h => h === '名前' || h === 'name' || h === '表示名');
    const emailIdx = header.findIndex(h => h === 'メール' || h === 'email' || h === 'メールアドレス');
    const deptIdx = header.findIndex(h => h === '部署' || h === 'department' || h === 'team');

    if (nameIdx === -1 || emailIdx === -1) {
      throw new Error('「名前」と「メール」列が必要です（CSVヘッダーを確認してください）');
    }

    const rows = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(',').map(c => c.trim());
      const name = cols[nameIdx];
      const email = cols[emailIdx];
      const dept = deptIdx !== -1 ? cols[deptIdx] || '' : '';

      if (!name || !email) continue;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) continue;

      rows.push({ name, email, dept });
    }
    return rows;
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setSuccess('');

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = parseCSV(ev.target.result);
        if (rows.length === 0) {
          setError('有効なデータ行が見つかりません');
          return;
        }
        setParsedRows(rows);
      } catch (err) {
        setError(err.message);
        setParsedRows([]);
      }
    };
    reader.readAsText(file, 'UTF-8');
  }

  async function handleImport() {
    setImporting(true);
    setError('');
    setSuccess('');
    let imported = 0;
    let skipped = 0;

    // Build team name → id map
    const teamMap = {};
    for (const t of teams) {
      teamMap[t.name] = t.id;
    }

    for (const row of parsedRows) {
      try {
        // Generate a temporary password (user will reset via invite)
        const tempPass = crypto.randomUUID ? crypto.randomUUID().slice(0, 12) : Math.random().toString(36).slice(2, 14);

        const user = await dataService.createUser({
          email: row.email,
          password: tempPass,
          name: row.name,
          orgId: session.orgId,
          role: 'member',
        });

        // Assign to team if department specified
        if (row.dept && teamMap[row.dept]) {
          await dataService.addTeamMember({ userId: user.id, teamId: teamMap[row.dept] });
        } else if (row.dept) {
          // Create new team
          const newTeam = await dataService.createTeam({ name: row.dept, orgId: session.orgId });
          teamMap[row.dept] = newTeam.id;
          await dataService.addTeamMember({ userId: user.id, teamId: newTeam.id });
        }
        imported++;
      } catch {
        skipped++;
      }
    }

    setSuccess(`${imported}名をインポートしました${skipped > 0 ? `（${skipped}名スキップ — メール重複等）` : ''}`);
    setParsedRows([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setImporting(false);
    onImportComplete();
  }

  function handleCancel() {
    setParsedRows([]);
    setError('');
    setSuccess('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="adm-csv-import-section">
      <h3 className="adm-section-title">CSVインポート</h3>
      <div
        className="adm-csv-dropzone"
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          style={{ display: 'none' }}
          onChange={handleFileChange}
          data-testid="csv-file-input"
        />
        <p className="adm-csv-dropzone-label">CSVファイルをクリックして選択</p>
        <p className="adm-csv-dropzone-sub">
          必須列: 名前, メール / 任意列: 部署
        </p>
      </div>

      {error && <p className="adm-csv-error">{error}</p>}
      {success && <p className="adm-csv-success">{success}</p>}

      {parsedRows.length > 0 && (
        <div className="adm-csv-preview">
          <p className="adm-csv-preview-count">
            {parsedRows.length}名のメンバーが検出されました
          </p>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>名前</th>
                  <th>メール</th>
                  <th>部署</th>
                </tr>
              </thead>
              <tbody>
                {parsedRows.slice(0, 10).map((r, i) => (
                  <tr key={i}>
                    <td>{r.name}</td>
                    <td>{r.email}</td>
                    <td>{r.dept || '---'}</td>
                  </tr>
                ))}
                {parsedRows.length > 10 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
                      ...他 {parsedRows.length - 10}名
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="adm-csv-actions">
            <button
              className="adm-btn-secondary"
              onClick={handleImport}
              disabled={importing}
            >
              {importing ? 'インポート中...' : `${parsedRows.length}名をインポート`}
            </button>
            <button className="adm-btn-ghost" onClick={handleCancel}>キャンセル</button>
          </div>
        </div>
      )}
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

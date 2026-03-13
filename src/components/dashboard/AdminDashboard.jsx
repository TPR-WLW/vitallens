import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { dataService } from '../../services/index.js';
import { ReminderService } from '../../services/reminder-service.js';
import { loadSampleData, isSampleDataLoaded, clearSampleData } from './sample-data.js';
import '../../styles/admin-dashboard.css';

const LazyOverviewView = lazy(() => import('./OverviewView.jsx'));
const LazyTeamView = lazy(() => import('./TeamView.jsx'));
const LazyMembersView = lazy(() => import('./MembersView.jsx'));
const LazyExportView = lazy(() => import('./ExportView.jsx'));
const LazySettingsView = lazy(() => import('./SettingsView.jsx'));
const LazyPersonalView = lazy(() => import('./PersonalView.jsx'));
const LazyCompareView = lazy(() => import('./CompareView.jsx'));

// ===== トラフィックライト =====
export function stressStatus(score) {
  if (score <= 35) return { label: '良好', color: '#22c55e', level: 'good' };
  if (score <= 55) return { label: '注意', color: '#f59e0b', level: 'watch' };
  return { label: '要対応', color: '#ef4444', level: 'alert' };
}

export function StatusBadge({ score, showScore = true }) {
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
export function KPICard({ value, label, sub }) {
  return (
    <div className="adm-kpi-card">
      <div className="adm-kpi-value">{value}</div>
      <div className="adm-kpi-label">{label}</div>
      {sub && <div className="adm-kpi-sub">{sub}</div>}
    </div>
  );
}

const SuspenseFallback = <div className="adm-view">読み込み中...</div>;

// ===== 参加済み組織リスト =====
function OrgList({ currentOrgId, session }) {
  const [orgs, setOrgs] = useState([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem('mirucare_orgs') || '[]');
    if (stored.length === 0) return;

    (async () => {
      const resolved = [];
      for (const orgId of stored) {
        if (orgId === currentOrgId) continue;
        try {
          const org = await dataService.getOrg(orgId);
          if (org) resolved.push({ id: orgId, name: org.name });
        } catch { /* skip invalid */ }
      }
      setOrgs(resolved);
    })();
  }, [currentOrgId]);

  const handleSwitch = (orgId) => {
    const newSession = { ...session, orgId };
    localStorage.setItem('mirucare_session', JSON.stringify({ ...newSession, exp: Date.now() + 86400000 }));
    window.location.reload();
  };

  if (orgs.length === 0) return null;

  return (
    <div className="adm-org-list" aria-label="参加済み組織">
      {orgs.map((o) => (
        <button
          key={o.id}
          className="adm-org-list-item"
          onClick={() => handleSwitch(o.id)}
          title={`組織ID: ${o.id}`}
        >
          <span className="adm-org-list-icon">🏢</span>
          <span className="adm-org-list-name">{o.name}</span>
          <span className="adm-org-list-arrow">→</span>
        </button>
      ))}
    </div>
  );
}

// ===== メインダッシュボード =====
export default function AdminDashboard({ session, onLogout, onStartMeasure }) {
  const [view, setView] = useState(session.role === 'admin' || session.role === 'manager' ? 'overview' : 'personal');
  const [orgStats, setOrgStats] = useState(null);
  const [teamStats, setTeamStats] = useState([]);
  const [teams, setTeams] = useState([]);
  const [sampleLoaded, setSampleLoaded] = useState(isSampleDataLoaded());
  const [sampleLoading, setSampleLoading] = useState(false);
  const [orgName, setOrgName] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [alertThreshold, setAlertThreshold] = useState(55);
  const [goalStress, setGoalStress] = useState(null);
  const [goalParticipation, setGoalParticipation] = useState(null);
  const [measureSchedule, setMeasureSchedule] = useState('daily');
  const [showOrgJoin, setShowOrgJoin] = useState(false);
  const [orgJoinCode, setOrgJoinCode] = useState('');
  const [orgJoinMsg, setOrgJoinMsg] = useState(null);
  const [announcement, setAnnouncement] = useState(null);
  const [managerTeamId, setManagerTeamId] = useState(null);

  // マネージャーの所属チームIDを取得
  useEffect(() => {
    if (session.role === 'manager') {
      dataService.getUserTeamId(session.userId).then(teamId => {
        setManagerTeamId(teamId);
      });
    }
  }, [session.role, session.userId]);

  const loadData = useCallback(async () => {
    try {
      const org = await dataService.getOrg(session.orgId);
      setOrgName(org?.name || '');
      if (org?.config?.alertThreshold != null) setAlertThreshold(org.config.alertThreshold);
      if (org?.config?.goalStress != null) setGoalStress(org.config.goalStress);
      if (org?.config?.goalParticipation != null) setGoalParticipation(org.config.goalParticipation);
      if (org?.config?.measureSchedule) setMeasureSchedule(org.config.measureSchedule);
      if (org?.config?.announcement) setAnnouncement(org.config.announcement);

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

  // リマインダー通知タイマー開始
  useEffect(() => {
    if (ReminderService.isEnabled()) {
      ReminderService.startTimer(measureSchedule);
    }
    return () => ReminderService.clearTimer();
  }, [measureSchedule]);

  // === リアルタイム更新: BroadcastChannel + visibilitychange ===
  const [toastVisible, setToastVisible] = useState(false);
  const lastLoadTimeRef = useRef(Date.now());
  const toastTimerRef = useRef(null);

  const refreshAndNotify = useCallback(() => {
    lastLoadTimeRef.current = Date.now();
    loadData();
    setToastVisible(true);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastVisible(false), 3000);
  }, [loadData]);

  useEffect(() => {
    let channel = null;
    try {
      channel = new BroadcastChannel('mirucare-measurements');
      channel.onmessage = (event) => {
        if (event.data?.type === 'measurement-saved' && event.data.timestamp > lastLoadTimeRef.current) {
          refreshAndNotify();
        }
      };
    } catch (_e) {
      // BroadcastChannel未対応ブラウザは無視
    }

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // タブが再度表示されたらデータを更新
        loadData();
        lastLoadTimeRef.current = Date.now();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      if (channel) {
        try { channel.close(); } catch (_e) { /* ignore */ }
      }
      document.removeEventListener('visibilitychange', handleVisibility);
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    };
  }, [loadData, refreshAndNotify]);

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

  // テーマ切替
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('mirucare_theme') || 'dark';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('mirucare_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  const isAdmin = session.role === 'admin';
  const isManager = session.role === 'manager';

  const navItems = isAdmin
    ? [
        { id: 'overview', label: 'ダッシュボード' },
        { id: 'team', label: 'チーム' },
        { id: 'members', label: 'メンバー' },
        { id: 'compare', label: '部署比較' },
        { id: 'export', label: 'CSV出力' },
        { id: 'settings', label: '設定' },
      ]
    : isManager
    ? [
        { id: 'overview', label: 'ダッシュボード' },
        { id: 'team', label: '自部署チーム' },
        { id: 'personal', label: 'マイデータ' },
        { id: 'settings', label: '設定' },
      ]
    : [
        { id: 'personal', label: 'マイデータ' },
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
          <button
            className="adm-theme-toggle-btn"
            onClick={toggleTheme}
            title={theme === 'dark' ? 'ライトモードに切替' : 'ダークモードに切替'}
            aria-label="テーマ切替"
          >
            {theme === 'dark' ? '\u2600' : '\u263E'}
          </button>
        </div>

        {/* 組織切替（マルチテナント） */}
        <div className="adm-org-switcher">
          <div className="adm-org-current" title={`組織ID: ${session.orgId}`}>
            <span className="adm-org-icon">🏢</span>
            <span className="adm-org-name">{orgName || '組織名未設定'}</span>
          </div>

          {/* 参加済み組織リスト */}
          <OrgList currentOrgId={session.orgId} session={session} />

          {!showOrgJoin ? (
            <button className="adm-btn-ghost adm-org-add-btn" onClick={() => { setShowOrgJoin(true); setOrgJoinMsg(null); }}>
              + 組織を追加
            </button>
          ) : (
            <div className="adm-org-join-form">
              <input
                type="text"
                className="adm-org-join-input"
                placeholder="招待コード（組織ID）"
                value={orgJoinCode}
                onChange={(e) => setOrgJoinCode(e.target.value)}
                aria-label="招待コード"
              />
              <div className="adm-org-join-actions">
                <button
                  className="adm-btn-primary adm-org-join-btn"
                  disabled={!orgJoinCode.trim()}
                  onClick={async () => {
                    setOrgJoinMsg(null);
                    try {
                      const org = await dataService.getOrg(orgJoinCode.trim());
                      if (!org) { setOrgJoinMsg({ type: 'error', text: '組織が見つかりません' }); return; }
                      // Save as additional org in localStorage
                      const key = 'mirucare_orgs';
                      const stored = JSON.parse(localStorage.getItem(key) || '[]');
                      if (!stored.includes(orgJoinCode.trim()) && orgJoinCode.trim() !== session.orgId) {
                        stored.push(orgJoinCode.trim());
                        localStorage.setItem(key, JSON.stringify(stored));
                      }
                      setOrgJoinMsg({ type: 'success', text: `「${org.name}」に参加しました` });
                      setOrgJoinCode('');
                      setShowOrgJoin(false);
                    } catch {
                      setOrgJoinMsg({ type: 'error', text: '参加に失敗しました' });
                    }
                  }}
                >
                  参加
                </button>
                <button className="adm-btn-ghost" onClick={() => { setShowOrgJoin(false); setOrgJoinCode(''); setOrgJoinMsg(null); }}>
                  キャンセル
                </button>
              </div>
              {orgJoinMsg && (
                <div className={orgJoinMsg.type === 'success' ? 'adm-org-join-success' : 'adm-org-join-error'}>
                  {orgJoinMsg.text}
                </div>
              )}
            </div>
          )}
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

        {isAdmin && (
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
        )}

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

        {announcement?.text && (
          <div className="adm-announcement-banner" role="status">
            <span className="adm-announcement-icon">📢</span>
            <div>
              <div className="adm-announcement-text">{announcement.text}</div>
              {announcement.updatedAt && (
                <div className="adm-announcement-meta">
                  {new Date(announcement.updatedAt).toLocaleDateString('ja-JP')} 更新
                </div>
              )}
            </div>
          </div>
        )}

        <div className="adm-main-header">
          <h1>{orgName || '管理画面'}</h1>
          <button
            className="adm-btn-secondary adm-print-btn"
            onClick={() => window.print()}
            title="印刷 / PDF出力"
          >
            印刷
          </button>
        </div>

        {view === 'overview' && isAdmin && (
          <Suspense fallback={SuspenseFallback}>
            <LazyOverviewView orgStats={orgStats} teamStats={teamStats} onTeamClick={handleTeamClick} alertThreshold={alertThreshold} goalStress={goalStress} goalParticipation={goalParticipation} teams={teams} measureSchedule={measureSchedule} />
          </Suspense>
        )}
        {view === 'overview' && isManager && (
          <Suspense fallback={SuspenseFallback}>
            <LazyOverviewView
              orgStats={null}
              teamStats={managerTeamId ? teamStats.filter(ts => ts.teamId === managerTeamId) : []}
              onTeamClick={handleTeamClick}
              alertThreshold={alertThreshold}
              goalStress={goalStress}
              goalParticipation={goalParticipation}
              teams={managerTeamId ? teams.filter(t => t.id === managerTeamId) : []}
              measureSchedule={measureSchedule}
            />
          </Suspense>
        )}
        {view === 'personal' && !isAdmin && (
          <Suspense fallback={SuspenseFallback}>
            <LazyPersonalView session={session} />
          </Suspense>
        )}
        {view === 'team' && isAdmin && (
          <Suspense fallback={SuspenseFallback}>
            <LazyTeamView teamStats={teamStats} orgId={session.orgId} />
          </Suspense>
        )}
        {view === 'team' && isManager && (
          <Suspense fallback={SuspenseFallback}>
            <LazyTeamView
              teamStats={managerTeamId ? teamStats.filter(ts => ts.teamId === managerTeamId) : []}
              orgId={session.orgId}
            />
          </Suspense>
        )}
        {view === 'members' && isAdmin && (
          <Suspense fallback={SuspenseFallback}>
            <LazyMembersView session={session} teams={teams} onRefresh={loadData} />
          </Suspense>
        )}
        {view === 'compare' && isAdmin && (
          <Suspense fallback={SuspenseFallback}>
            <LazyCompareView session={session} teams={teams} />
          </Suspense>
        )}
        {view === 'export' && isAdmin && (
          <Suspense fallback={SuspenseFallback}>
            <LazyExportView session={session} teams={teams} />
          </Suspense>
        )}
        {view === 'settings' && (
          <Suspense fallback={SuspenseFallback}>
            <LazySettingsView session={session} orgName={orgName} orgStats={orgStats} onLogout={onLogout} isAdmin={isAdmin} theme={theme} onThemeChange={toggleTheme} onSettingsChange={(changes) => { if (changes.alertThreshold != null) setAlertThreshold(changes.alertThreshold); if (changes.goalStress != null) setGoalStress(changes.goalStress); if (changes.goalParticipation != null) setGoalParticipation(changes.goalParticipation); if (changes.measureSchedule) setMeasureSchedule(changes.measureSchedule); if (changes.announcement !== undefined) setAnnouncement(changes.announcement); }} />
          </Suspense>
        )}
      </main>

      {/* オーバーレイ（モバイルサイドバー用） */}
      {sidebarOpen && <div className="adm-overlay" onClick={() => setSidebarOpen(false)} />}

      {/* データ更新トースト */}
      {toastVisible && (
        <div className="adm-toast" role="status" aria-live="polite">
          データ更新しました
        </div>
      )}
    </div>
  );
}

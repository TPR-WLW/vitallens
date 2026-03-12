import { useState, useEffect } from 'react';
import { dataService } from '../../services/index.js';

export default function SettingsView({ session, orgName, orgStats, onLogout, onSettingsChange }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [pwMsg, setPwMsg] = useState(null); // { type: 'success'|'error', text }
  const [pwLoading, setPwLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteMsg, setDeleteMsg] = useState(null);

  // アラート閾値設定
  const [alertThreshold, setAlertThreshold] = useState(55);
  const [alertMsg, setAlertMsg] = useState(null);

  // KPI目標設定
  const [goalStress, setGoalStress] = useState(40);
  const [goalParticipation, setGoalParticipation] = useState(80);
  const [goalMsg, setGoalMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const config = await dataService.getOrgSettings(session.orgId);
        if (config.alertThreshold != null) setAlertThreshold(config.alertThreshold);
        if (config.goalStress != null) setGoalStress(config.goalStress);
        if (config.goalParticipation != null) setGoalParticipation(config.goalParticipation);
      } catch { /* デフォルト値を使用 */ }
    })();
  }, [session.orgId]);

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

  const handleSaveGoals = async () => {
    setGoalMsg(null);
    try {
      await dataService.updateOrgSettings(session.orgId, { goalStress, goalParticipation });
      setGoalMsg({ type: 'success', text: `目標を保存しました（ストレス: ${goalStress}、参加率: ${goalParticipation}%）` });
      if (onSettingsChange) onSettingsChange({ goalStress, goalParticipation });
    } catch (err) {
      setGoalMsg({ type: 'error', text: err.message });
    }
  };

  const handleSaveAlertThreshold = async () => {
    setAlertMsg(null);
    try {
      await dataService.updateOrgSettings(session.orgId, { alertThreshold });
      setAlertMsg({ type: 'success', text: `アラート閾値を${alertThreshold}に変更しました` });
      if (onSettingsChange) onSettingsChange({ alertThreshold });
    } catch (err) {
      setAlertMsg({ type: 'error', text: err.message });
    }
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

      {/* 通知設定 */}
      <div className="adm-settings-section">
        <h3 className="adm-section-title">通知設定</h3>
        <div className="adm-settings-card">
          {alertMsg && (
            <div className={alertMsg.type === 'success' ? 'adm-settings-success' : 'adm-login-error'}>
              {alertMsg.text}
            </div>
          )}
          <div className="adm-settings-row">
            <span className="adm-settings-label">ストレスアラート閾値</span>
            <span className="adm-settings-threshold-value">{alertThreshold}</span>
          </div>
          <div className="adm-settings-slider-row">
            <span className="adm-settings-range-label">低 (30)</span>
            <input
              type="range"
              min={30}
              max={80}
              step={5}
              value={alertThreshold}
              onChange={(e) => setAlertThreshold(Number(e.target.value))}
              className="adm-settings-slider"
              aria-label="ストレスアラート閾値"
            />
            <span className="adm-settings-range-label">高 (80)</span>
          </div>
          <p className="adm-privacy-note">
            部署平均ストレススコアがこの値を超えると、ダッシュボードにアラートが表示されます。
          </p>
          <button className="adm-btn-primary" onClick={handleSaveAlertThreshold}>
            閾値を保存
          </button>
        </div>
      </div>

      {/* KPI目標設定 */}
      <div className="adm-settings-section">
        <h3 className="adm-section-title">KPI目標設定</h3>
        <div className="adm-settings-card">
          {goalMsg && (
            <div className={goalMsg.type === 'success' ? 'adm-settings-success' : 'adm-login-error'}>
              {goalMsg.text}
            </div>
          )}
          <div className="adm-settings-row">
            <span className="adm-settings-label">目標ストレススコア</span>
            <span className="adm-settings-threshold-value">{goalStress}</span>
          </div>
          <div className="adm-settings-slider-row">
            <span className="adm-settings-range-label">低 (20)</span>
            <input
              type="range"
              min={20}
              max={60}
              step={5}
              value={goalStress}
              onChange={(e) => setGoalStress(Number(e.target.value))}
              className="adm-settings-slider"
              aria-label="目標ストレススコア"
            />
            <span className="adm-settings-range-label">高 (60)</span>
          </div>
          <p className="adm-privacy-note">
            組織の目標平均ストレススコア。この値以下を維持することが目標です。
          </p>

          <div className="adm-settings-row" style={{ marginTop: 12 }}>
            <span className="adm-settings-label">目標計測参加率</span>
            <span className="adm-settings-threshold-value">{goalParticipation}%</span>
          </div>
          <div className="adm-settings-slider-row">
            <span className="adm-settings-range-label">50%</span>
            <input
              type="range"
              min={50}
              max={100}
              step={5}
              value={goalParticipation}
              onChange={(e) => setGoalParticipation(Number(e.target.value))}
              className="adm-settings-slider"
              aria-label="目標計測参加率"
            />
            <span className="adm-settings-range-label">100%</span>
          </div>
          <p className="adm-privacy-note">
            全メンバーのうち、期間内に1回以上計測を行った割合の目標値。
          </p>

          <button className="adm-btn-primary" onClick={handleSaveGoals}>
            目標を保存
          </button>
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

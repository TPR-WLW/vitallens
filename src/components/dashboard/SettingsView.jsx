import { useState } from 'react';
import { dataService } from '../../services/index.js';

export default function SettingsView({ session, orgName, orgStats, onLogout }) {
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

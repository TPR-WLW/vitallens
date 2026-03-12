import { useState, useEffect } from 'react';
import { dataService } from '../../services/index.js';
import { ReminderService } from '../../services/reminder-service.js';

export default function SettingsView({ session, orgName, orgStats, onLogout, isAdmin = true, onSettingsChange }) {
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

  // 計測スケジュール設定
  const [measureSchedule, setMeasureSchedule] = useState('daily');
  const [scheduleMsg, setScheduleMsg] = useState(null);

  // 通知リマインダー設定
  const [notifEnabled, setNotifEnabled] = useState(ReminderService.isEnabled());
  const [notifPermission, setNotifPermission] = useState(ReminderService.getPermissionState());
  const [notifMsg, setNotifMsg] = useState(null);

  // 個人データ削除リクエスト
  const [deleteMyDataConfirm, setDeleteMyDataConfirm] = useState(false);
  const [deleteMyDataLoading, setDeleteMyDataLoading] = useState(false);
  const [deleteMyDataMsg, setDeleteMyDataMsg] = useState(null);

  // お知らせバナー
  const [announcementText, setAnnouncementText] = useState('');
  const [announcementMsg, setAnnouncementMsg] = useState(null);

  // 秘密の質問
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [securityMsg, setSecurityMsg] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const config = await dataService.getOrgSettings(session.orgId);
        if (config.alertThreshold != null) setAlertThreshold(config.alertThreshold);
        if (config.goalStress != null) setGoalStress(config.goalStress);
        if (config.goalParticipation != null) setGoalParticipation(config.goalParticipation);
        if (config.measureSchedule) setMeasureSchedule(config.measureSchedule);
        if (config.announcement?.text) setAnnouncementText(config.announcement.text);
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

  const handleSaveSchedule = async () => {
    setScheduleMsg(null);
    const labels = { daily: '毎日', thrice: '週3回', weekly: '週1回' };
    try {
      await dataService.updateOrgSettings(session.orgId, { measureSchedule });
      setScheduleMsg({ type: 'success', text: `計測スケジュールを「${labels[measureSchedule]}」に設定しました` });
      if (onSettingsChange) onSettingsChange({ measureSchedule });
    } catch (err) {
      setScheduleMsg({ type: 'error', text: err.message });
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

  const handleSaveAnnouncement = async () => {
    setAnnouncementMsg(null);
    try {
      const announcement = announcementText.trim()
        ? { text: announcementText.trim(), updatedAt: new Date().toISOString() }
        : null;
      await dataService.updateOrgSettings(session.orgId, { announcement });
      setAnnouncementMsg({ type: 'success', text: announcement ? 'お知らせを更新しました' : 'お知らせを削除しました' });
      if (onSettingsChange) onSettingsChange({ announcement });
    } catch (err) {
      setAnnouncementMsg({ type: 'error', text: err.message });
    }
  };

  const handleToggleNotification = async () => {
    setNotifMsg(null);
    if (!notifEnabled) {
      // 有効化
      const result = await ReminderService.requestPermission();
      setNotifPermission(result);
      if (result === 'granted') {
        setNotifEnabled(true);
        ReminderService.startTimer(measureSchedule);
        setNotifMsg({ type: 'success', text: '計測リマインダー通知を有効にしました' });
      } else if (result === 'denied') {
        setNotifMsg({ type: 'error', text: 'ブラウザの通知がブロックされています。ブラウザの設定から通知を許可してください。' });
      } else {
        setNotifMsg({ type: 'error', text: 'このブラウザは通知に対応していません' });
      }
    } else {
      // 無効化
      ReminderService.setEnabled(false);
      ReminderService.clearTimer();
      setNotifEnabled(false);
      setNotifMsg({ type: 'success', text: '計測リマインダー通知を無効にしました' });
    }
  };

  const handleSaveSecurityQuestion = async () => {
    setSecurityMsg(null);
    if (!securityQuestion || !securityAnswer.trim()) {
      setSecurityMsg({ type: 'error', text: '質問と回答の両方を入力してください' });
      return;
    }
    try {
      await dataService.setSecurityQuestion({
        userId: session.userId,
        question: securityQuestion,
        answer: securityAnswer,
      });
      setSecurityMsg({ type: 'success', text: '秘密の質問を設定しました' });
      setSecurityAnswer('');
    } catch (err) {
      setSecurityMsg({ type: 'error', text: err.message });
    }
  };

  const handleDeleteMyData = async () => {
    setDeleteMyDataLoading(true);
    setDeleteMyDataMsg(null);
    try {
      await dataService.deleteUserData(session.userId);
      setDeleteMyDataMsg({ type: 'success', text: '個人の計測データをすべて削除しました。' });
      setDeleteMyDataConfirm(false);
    } catch (err) {
      setDeleteMyDataMsg({ type: 'error', text: err.message });
    }
    setDeleteMyDataLoading(false);
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

      {/* お知らせバナー（管理者のみ） */}
      {isAdmin && (
        <div className="adm-settings-section">
          <h3 className="adm-section-title">お知らせバナー</h3>
          <div className="adm-settings-card">
            {announcementMsg && (
              <div className={announcementMsg.type === 'success' ? 'adm-settings-success' : 'adm-login-error'}>
                {announcementMsg.text}
              </div>
            )}
            <p className="adm-privacy-note" style={{ marginBottom: 8 }}>
              ダッシュボード上部にメッセージを表示します。全メンバーに表示されます。
            </p>
            <textarea
              className="adm-announcement-textarea"
              value={announcementText}
              onChange={(e) => setAnnouncementText(e.target.value)}
              placeholder="お知らせ内容を入力（空にすると非表示）"
              maxLength={500}
              aria-label="お知らせバナー内容"
            />
            <div className="adm-announcement-actions">
              <button className="adm-btn-primary" onClick={handleSaveAnnouncement}>
                お知らせを保存
              </button>
              {announcementText && (
                <button className="adm-btn-ghost" onClick={() => { setAnnouncementText(''); }}>
                  クリア
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 通知設定（管理者のみ） */}
      {isAdmin && <div className="adm-settings-section">
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

      }

      {/* KPI目標設定（管理者のみ） */}
      {isAdmin && <div className="adm-settings-section">
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

      }

      {/* 計測スケジュール設定（管理者のみ） */}
      {isAdmin && <div className="adm-settings-section">
        <h3 className="adm-section-title">計測スケジュール設定</h3>
        <div className="adm-settings-card">
          {scheduleMsg && (
            <div className={scheduleMsg.type === 'success' ? 'adm-settings-success' : 'adm-login-error'}>
              {scheduleMsg.text}
            </div>
          )}
          <div className="adm-settings-row">
            <span className="adm-settings-label">推奨計測頻度</span>
            <select
              value={measureSchedule}
              onChange={(e) => setMeasureSchedule(e.target.value)}
              className="adm-schedule-select"
              aria-label="推奨計測頻度"
            >
              <option value="daily">毎日</option>
              <option value="thrice">週3回</option>
              <option value="weekly">週1回</option>
            </select>
          </div>
          <p className="adm-privacy-note">
            メンバーへの推奨計測頻度です。計測リマインダーの判定基準に使用されます。
          </p>
          <button className="adm-btn-primary" onClick={handleSaveSchedule}>
            スケジュールを保存
          </button>
        </div>
      </div>

      }

      {/* 計測リマインダー通知 */}
      <div className="adm-settings-section">
        <h3 className="adm-section-title">計測リマインダー通知</h3>
        <div className="adm-settings-card">
          {notifMsg && (
            <div className={notifMsg.type === 'success' ? 'adm-settings-success' : 'adm-login-error'}>
              {notifMsg.text}
            </div>
          )}
          <div className="adm-settings-row">
            <span className="adm-settings-label">ブラウザ通知</span>
            <button
              className={notifEnabled ? 'adm-btn-secondary' : 'adm-btn-primary'}
              onClick={handleToggleNotification}
              aria-label="計測リマインダー通知切替"
            >
              {notifEnabled ? '無効にする' : '有効にする'}
            </button>
          </div>
          {notifPermission === 'denied' && (
            <p className="adm-csv-error">
              ブラウザの通知がブロックされています。ブラウザの設定から通知を許可してください。
            </p>
          )}
          {notifPermission === 'unsupported' && (
            <p className="adm-privacy-note">このブラウザは通知に対応していません。</p>
          )}
          <p className="adm-privacy-note">
            計測スケジュール（{measureSchedule === 'daily' ? '毎日' : measureSchedule === 'thrice' ? '週3回' : '週1回'}）に基づき、計測が遅れている場合に通知でお知らせします。
          </p>
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

      {/* 秘密の質問（パスワードリセット用） */}
      <div className="adm-settings-section">
        <h3 className="adm-section-title">秘密の質問（パスワードリセット用）</h3>
        <div className="adm-settings-card">
          {securityMsg && (
            <div className={securityMsg.type === 'success' ? 'adm-settings-success' : 'adm-login-error'}>
              {securityMsg.text}
            </div>
          )}
          <p className="adm-privacy-note" style={{ marginBottom: 8 }}>
            パスワードを忘れた場合に、秘密の質問で本人確認を行いリセットできます。
          </p>
          <div className="adm-security-qa">
            <div className="adm-field">
              <span>秘密の質問</span>
              <select
                value={securityQuestion}
                onChange={(e) => setSecurityQuestion(e.target.value)}
                aria-label="秘密の質問"
              >
                <option value="">質問を選択してください</option>
                <option value="母親の旧姓は？">母親の旧姓は？</option>
                <option value="最初に飼ったペットの名前は？">最初に飼ったペットの名前は？</option>
                <option value="出身小学校の名前は？">出身小学校の名前は？</option>
                <option value="好きな食べ物は？">好きな食べ物は？</option>
                <option value="子供の頃のニックネームは？">子供の頃のニックネームは？</option>
              </select>
            </div>
            <div className="adm-field">
              <span>回答</span>
              <input
                type="text"
                value={securityAnswer}
                onChange={(e) => setSecurityAnswer(e.target.value)}
                placeholder="回答を入力"
                aria-label="秘密の質問の回答"
              />
            </div>
          </div>
          <button
            className="adm-btn-primary"
            onClick={handleSaveSecurityQuestion}
            disabled={!securityQuestion || !securityAnswer.trim()}
            style={{ marginTop: 8 }}
          >
            秘密の質問を設定
          </button>
        </div>
      </div>

      {/* 個人データ削除リクエスト */}
      <div className="adm-settings-section">
        <h3 className="adm-section-title">個人データ削除</h3>
        <div className="adm-settings-card">
          {deleteMyDataMsg && (
            <div className={deleteMyDataMsg.type === 'success' ? 'adm-settings-success' : 'adm-login-error'}>
              {deleteMyDataMsg.text}
            </div>
          )}
          <p className="adm-privacy-note" style={{ marginBottom: 12 }}>
            個人情報保護法に基づき、ご自身の計測データの削除を申請できます。
            削除されたデータは復元できません。アカウント自体は残ります。
          </p>
          {!deleteMyDataConfirm ? (
            <button
              className="adm-btn-danger"
              onClick={() => setDeleteMyDataConfirm(true)}
              aria-label="個人データ削除リクエスト"
            >
              自分の計測データを削除
            </button>
          ) : (
            <div className="adm-settings-confirm">
              <p className="adm-settings-warning">
                この操作は取り消せません。あなたの全計測データとチームメンバーシップが完全に削除されます。
              </p>
              <div className="adm-settings-confirm-actions">
                <button
                  className="adm-btn-danger"
                  onClick={handleDeleteMyData}
                  disabled={deleteMyDataLoading}
                >
                  {deleteMyDataLoading ? '削除中...' : '本当に削除する'}
                </button>
                <button
                  className="adm-btn-secondary"
                  onClick={() => setDeleteMyDataConfirm(false)}
                >
                  キャンセル
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* データ管理（管理者のみ） */}
      {isAdmin && (
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
      )}

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

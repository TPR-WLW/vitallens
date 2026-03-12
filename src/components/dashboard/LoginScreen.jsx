import { useState } from 'react';
import { dataService } from '../../services/index.js';
import '../../styles/admin-dashboard.css';

/**
 * ログイン / 新規登録 画面
 * ローカルファースト認証（IndexedDB + PBKDF2）
 */
export default function LoginScreen({ onLogin, onBack }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('admin'); // 'admin' | 'member'
  const [inviteCode, setInviteCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { user, session } = await dataService.login({ email, password });
      onLogin(user, session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('パスワードは8文字以上で入力してください');
      return;
    }
    if (password !== passwordConfirm) {
      setError('パスワードが一致しません');
      return;
    }
    if (!name.trim()) {
      setError('お名前を入力してください');
      return;
    }

    setLoading(true);
    try {
      let orgId;
      if (role === 'admin') {
        // 管理者: 新しい組織を作成
        const org = await dataService.createOrg({ name: `${name}の組織` });
        orgId = org.id;
      } else {
        // メンバー: 招待コードで組織に参加（簡易実装）
        if (!inviteCode.trim()) {
          setError('招待コードを入力してください');
          setLoading(false);
          return;
        }
        // 招待コードはorgIdとして扱う（簡易実装）
        orgId = inviteCode.trim();
        const org = await dataService.getOrg(orgId);
        if (!org) {
          setError('無効な招待コードです');
          setLoading(false);
          return;
        }
      }

      const user = await dataService.createUser({
        email,
        password,
        name: name.trim(),
        orgId,
        role,
      });

      const { session } = await dataService.login({ email, password });
      onLogin(user, session);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adm-login-page">
      <div className="adm-login-card">
        <div className="adm-login-header">
          <h1>ミルケア</h1>
          <p>チーム ストレスモニタリング</p>
        </div>

        <div className="adm-login-tabs">
          <button
            className={`adm-login-tab ${tab === 'login' ? 'active' : ''}`}
            onClick={() => { setTab('login'); setError(''); }}
          >
            ログイン
          </button>
          <button
            className={`adm-login-tab ${tab === 'register' ? 'active' : ''}`}
            onClick={() => { setTab('register'); setError(''); }}
          >
            新規登録
          </button>
        </div>

        {error && <div className="adm-login-error">{error}</div>}

        {tab === 'login' ? (
          <form onSubmit={handleLogin} className="adm-login-form">
            <label className="adm-field">
              <span>メールアドレス</span>
              <input
                type="email"
                placeholder="例: tanaka@example.co.jp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="adm-field">
              <span>パスワード</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            <button type="submit" className="adm-btn-primary" disabled={loading}>
              {loading ? 'ログイン中...' : 'ログイン'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleRegister} className="adm-login-form">
            <label className="adm-field">
              <span>お名前</span>
              <input
                type="text"
                placeholder="例: 田中太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </label>
            <label className="adm-field">
              <span>メールアドレス</span>
              <input
                type="email"
                placeholder="例: tanaka@example.co.jp"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </label>
            <label className="adm-field">
              <span>パスワード（8文字以上）</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </label>
            <label className="adm-field">
              <span>パスワード確認</span>
              <input
                type="password"
                value={passwordConfirm}
                onChange={(e) => setPasswordConfirm(e.target.value)}
                required
                autoComplete="new-password"
              />
            </label>

            <div className="adm-role-select">
              <label className={`adm-role-option ${role === 'admin' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="admin"
                  checked={role === 'admin'}
                  onChange={() => setRole('admin')}
                />
                <span>管理者として登録</span>
              </label>
              <label className={`adm-role-option ${role === 'member' ? 'active' : ''}`}>
                <input
                  type="radio"
                  name="role"
                  value="member"
                  checked={role === 'member'}
                  onChange={() => setRole('member')}
                />
                <span>メンバーとして参加</span>
                <small>（招待コードが必要です）</small>
              </label>
            </div>

            {role === 'member' && (
              <label className="adm-field">
                <span>招待コード</span>
                <input
                  type="text"
                  placeholder="招待コードを入力"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  required
                />
              </label>
            )}

            <button type="submit" className="adm-btn-primary" disabled={loading}>
              {loading ? '登録中...' : 'アカウントを作成'}
            </button>

            <p className="adm-login-warning">
              パスワードを忘れた場合、復旧できません。メモを取ってください。
            </p>
          </form>
        )}

        <div className="adm-login-footer">
          <p className="adm-login-local-note">
            データはこの端末にのみ保存されます
          </p>
          <button className="adm-link-btn" onClick={onBack}>
            計測デモに戻る
          </button>
        </div>
      </div>
    </div>
  );
}

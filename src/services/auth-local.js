/**
 * ローカル認証サービス — MiruCare
 * PBKDF2 (Web Crypto API) でパスワードハッシュ、localStorage でセッション管理。
 * クラウド移行時は同じインターフェースで fetch() ベースに差し替え。
 */

import { put, get, getOneByIndex, getByIndex } from './idb-helpers.js';

const SESSION_KEY = 'mirucare_session';

/** ID生成 */
function generateId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

/** ソルト生成 */
function generateSalt() {
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    return Array.from(crypto.getRandomValues(new Uint8Array(16)))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }
  return Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
}

/** PBKDF2でパスワードハッシュ */
async function hashPassword(password, salt) {
  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']
    );
    const bits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' },
      keyMaterial, 256
    );
    return Array.from(new Uint8Array(bits))
      .map(b => b.toString(16).padStart(2, '0')).join('');
  }
  // フォールバック（テスト環境用）: 簡易ハッシュ
  let hash = 0;
  const combined = salt + password;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash + combined.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(16).padStart(16, '0');
}

/**
 * ユーザー登録
 */
export async function register({ email, password, name, orgId, role = 'member' }) {
  if (!email || !password || !name || !orgId) {
    throw new Error('必須項目が入力されていません');
  }

  // メールアドレスの重複チェック
  const existing = await getOneByIndex('users', 'email', email);
  if (existing) {
    throw new Error('このメールアドレスは既に登録されています');
  }

  const salt = generateSalt();
  const passwordHash = await hashPassword(password, salt);

  const user = {
    id: generateId(),
    orgId,
    email,
    name,
    role,
    passwordHash,
    salt,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await put('users', user);

  // パスワード情報を除いたユーザーオブジェクトを返す
  const { passwordHash: _, salt: __, ...safeUser } = user;
  const session = createSession(safeUser);

  return { user: safeUser, session };
}

/**
 * ログイン
 */
export async function login({ email, password }) {
  if (!email || !password) {
    throw new Error('メールアドレスとパスワードを入力してください');
  }

  const user = await getOneByIndex('users', 'email', email);
  if (!user) {
    throw new Error('メールアドレスまたはパスワードが正しくありません');
  }

  const hash = await hashPassword(password, user.salt);
  if (hash !== user.passwordHash) {
    throw new Error('メールアドレスまたはパスワードが正しくありません');
  }

  const { passwordHash: _, salt: __, ...safeUser } = user;
  const session = createSession(safeUser);

  return { user: safeUser, session };
}

/**
 * ログアウト
 */
export function logout() {
  localStorage.removeItem(SESSION_KEY);
}

/**
 * 現在のセッション取得
 */
export function getSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (session.exp < Date.now()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

/**
 * セッション作成（内部用）
 */
function createSession(user) {
  const session = {
    userId: user.id,
    orgId: user.orgId,
    role: user.role,
    userName: user.name,
    exp: Date.now() + 24 * 60 * 60 * 1000, // 24時間
  };
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  return session;
}

/**
 * パスワード変更
 */
export async function changePassword({ userId, currentPassword, newPassword }) {
  if (!userId || !currentPassword || !newPassword) {
    throw new Error('必須項目が入力されていません');
  }
  if (newPassword.length < 8) {
    throw new Error('新しいパスワードは8文字以上で入力してください');
  }

  const user = await get('users', userId);
  if (!user) {
    throw new Error('ユーザーが見つかりません');
  }

  const currentHash = await hashPassword(currentPassword, user.salt);
  if (currentHash !== user.passwordHash) {
    throw new Error('現在のパスワードが正しくありません');
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);

  user.salt = newSalt;
  user.passwordHash = newHash;
  user.updatedAt = new Date().toISOString();

  await put('users', user);
}

/**
 * 秘密の質問を設定
 */
export async function setSecurityQuestion({ userId, question, answer }) {
  if (!userId || !question || !answer) throw new Error('必須項目が入力されていません');
  const user = await get('users', userId);
  if (!user) throw new Error('ユーザーが見つかりません');

  const answerHash = await hashPassword(answer.trim().toLowerCase(), user.salt);
  user.securityQuestion = question;
  user.securityAnswerHash = answerHash;
  user.updatedAt = new Date().toISOString();
  await put('users', user);
}

/**
 * 秘密の質問でパスワードリセット
 */
export async function resetPasswordWithSecurityAnswer({ email, answer, newPassword }) {
  if (!email || !answer || !newPassword) throw new Error('必須項目が入力されていません');
  if (newPassword.length < 8) throw new Error('新しいパスワードは8文字以上で入力してください');

  const user = await getOneByIndex('users', 'email', email);
  if (!user) throw new Error('メールアドレスが見つかりません');
  if (!user.securityQuestion || !user.securityAnswerHash) {
    throw new Error('秘密の質問が設定されていません');
  }

  const answerHash = await hashPassword(answer.trim().toLowerCase(), user.salt);
  if (answerHash !== user.securityAnswerHash) {
    throw new Error('秘密の質問の回答が正しくありません');
  }

  const newSalt = generateSalt();
  const newHash = await hashPassword(newPassword, newSalt);
  user.salt = newSalt;
  user.passwordHash = newHash;
  user.updatedAt = new Date().toISOString();
  await put('users', user);
}

/**
 * メールアドレスで秘密の質問を取得
 */
export async function getSecurityQuestion(email) {
  if (!email) return null;
  const user = await getOneByIndex('users', 'email', email);
  if (!user || !user.securityQuestion) return null;
  return user.securityQuestion;
}

/**
 * 組織のユーザー一覧取得（パスワード情報除外）
 */
export async function getUsersByOrg(orgId) {
  const users = await getByIndex('users', 'orgId', orgId);
  return users.map(({ passwordHash, salt, ...u }) => u);
}

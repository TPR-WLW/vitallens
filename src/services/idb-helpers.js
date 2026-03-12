/**
 * IndexedDB ヘルパー — MiruCare ローカルファーストデータ層
 * 外部依存なし。生のIndexedDB APIをPromiseラッパーで提供。
 */

const DB_NAME = 'mirucare_db';
const DB_VERSION = 1;

const STORES = {
  organizations: {
    keyPath: 'id',
    indexes: [['slug', 'slug', { unique: true }]],
  },
  users: {
    keyPath: 'id',
    indexes: [
      ['email', 'email', { unique: true }],
      ['orgId', 'orgId', { unique: false }],
    ],
  },
  measurements: {
    keyPath: 'id',
    indexes: [
      ['userId', 'userId', { unique: false }],
      ['orgId', 'orgId', { unique: false }],
      ['timestamp', 'timestamp', { unique: false }],
    ],
  },
  teams: {
    keyPath: 'id',
    indexes: [['orgId', 'orgId', { unique: false }]],
  },
  teamMemberships: {
    keyPath: 'id',
    indexes: [
      ['userId', 'userId', { unique: false }],
      ['teamId', 'teamId', { unique: false }],
    ],
  },
};

let dbInstance = null;

/**
 * IndexedDB接続を開く（キャッシュ済みインスタンスを返す）
 */
export function getDB() {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      for (const [name, config] of Object.entries(STORES)) {
        if (!db.objectStoreNames.contains(name)) {
          const store = db.createObjectStore(name, { keyPath: config.keyPath });
          for (const [indexName, keyPath, options] of config.indexes) {
            store.createIndex(indexName, keyPath, options);
          }
        }
      }
    };

    request.onsuccess = (event) => {
      dbInstance = event.target.result;
      resolve(dbInstance);
    };

    request.onerror = (event) => {
      reject(new Error('IndexedDB接続エラー: ' + (event.target.error?.message || '')));
    };
  });
}

/** レコードを保存（put） */
export async function put(storeName, data) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.put(data);
    req.onsuccess = () => resolve(data);
    req.onerror = (e) => reject(new Error('保存エラー: ' + (e.target.error?.message || '')));
  });
}

/** キーでレコード取得 */
export async function get(storeName, key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(new Error('取得エラー: ' + (e.target.error?.message || '')));
  });
}

/** 全レコード取得 */
export async function getAll(storeName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(new Error('一覧取得エラー: ' + (e.target.error?.message || '')));
  });
}

/** インデックスでレコード取得 */
export async function getByIndex(storeName, indexName, value) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.getAll(value);
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = (e) => reject(new Error('インデックス取得エラー: ' + (e.target.error?.message || '')));
  });
}

/** インデックスで1件取得 */
export async function getOneByIndex(storeName, indexName, value) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const index = store.index(indexName);
    const req = index.get(value);
    req.onsuccess = () => resolve(req.result || null);
    req.onerror = (e) => reject(new Error('取得エラー: ' + (e.target.error?.message || '')));
  });
}

/** レコード削除 */
export async function del(storeName, key) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.delete(key);
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(new Error('削除エラー: ' + (e.target.error?.message || '')));
  });
}

/** ストアの全レコードクリア */
export async function clear(storeName) {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const req = store.clear();
    req.onsuccess = () => resolve();
    req.onerror = (e) => reject(new Error('クリアエラー: ' + (e.target.error?.message || '')));
  });
}

/** DBインスタンスリセット（テスト用） */
export function resetDB() {
  if (dbInstance) {
    dbInstance.close();
  }
  dbInstance = null;
}

/** 全ストアクリア（テスト/リセット用） */
export async function clearAll() {
  for (const name of Object.keys(STORES)) {
    await clear(name);
  }
}

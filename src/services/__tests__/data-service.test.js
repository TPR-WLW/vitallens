/**
 * LocalDataService + Auth テスト
 *
 * IndexedDBはjsdomで利用不可のため、idb-helpersをモックして
 * インメモリストアでテスト。
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// === In-memory IndexedDB mock ===
const stores = {};

function resetStores() {
  for (const key of Object.keys(stores)) delete stores[key];
}

function getStore(name) {
  if (!stores[name]) stores[name] = {};
  return stores[name];
}

vi.mock('../idb-helpers.js', () => ({
  getDB: vi.fn().mockResolvedValue({}),
  put: vi.fn(async (storeName, data) => {
    getStore(storeName)[data.id] = { ...data };
    return data;
  }),
  get: vi.fn(async (storeName, key) => {
    return getStore(storeName)[key] || null;
  }),
  getAll: vi.fn(async (storeName) => {
    return Object.values(getStore(storeName));
  }),
  getByIndex: vi.fn(async (storeName, indexName, value) => {
    return Object.values(getStore(storeName)).filter(item => item[indexName] === value);
  }),
  getOneByIndex: vi.fn(async (storeName, indexName, value) => {
    return Object.values(getStore(storeName)).find(item => item[indexName] === value) || null;
  }),
  del: vi.fn(async (storeName, key) => {
    delete getStore(storeName)[key];
  }),
  clear: vi.fn(async (storeName) => {
    const store = getStore(storeName);
    for (const key of Object.keys(store)) delete store[key];
  }),
  clearAll: vi.fn(async () => {
    resetStores();
  }),
  resetDB: vi.fn(),
}));

// Mock localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = value; }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
Object.defineProperty(globalThis, 'localStorage', { value: localStorageMock });

// Mock crypto for PBKDF2 fallback
if (!globalThis.crypto) {
  globalThis.crypto = { randomUUID: () => `${Date.now()}-${Math.random().toString(36).slice(2)}` };
}

import { LocalDataService } from '../local-data-service.js';
import { register, login, logout, getSession } from '../auth-local.js';

describe('Auth Service', () => {
  let service;

  beforeEach(() => {
    resetStores();
    localStorageMock.clear();
    service = new LocalDataService();
  });

  it('should register a new user', async () => {
    const org = await service.createOrg({ name: 'テスト株式会社' });
    const result = await register({
      email: 'test@example.com',
      password: 'password123',
      name: '田中太郎',
      orgId: org.id,
      role: 'admin',
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe('test@example.com');
    expect(result.user.name).toBe('田中太郎');
    expect(result.user.role).toBe('admin');
    expect(result.user.passwordHash).toBeUndefined(); // パスワードハッシュは返さない
    expect(result.session).toBeDefined();
    expect(result.session.userId).toBe(result.user.id);
  });

  it('should reject duplicate email registration', async () => {
    const org = await service.createOrg({ name: 'テスト株式会社' });
    await register({
      email: 'dup@example.com', password: 'pass', name: '田中', orgId: org.id,
    });

    await expect(register({
      email: 'dup@example.com', password: 'pass2', name: '佐藤', orgId: org.id,
    })).rejects.toThrow('既に登録されています');
  });

  it('should reject registration with missing fields', async () => {
    await expect(register({
      email: '', password: 'pass', name: '田中', orgId: 'org1',
    })).rejects.toThrow('必須項目');
  });

  it('should login with correct credentials', async () => {
    const org = await service.createOrg({ name: 'テスト株式会社' });
    await register({
      email: 'login@example.com', password: 'mypass', name: '鈴木', orgId: org.id,
    });
    logout();

    const result = await login({ email: 'login@example.com', password: 'mypass' });
    expect(result.user.email).toBe('login@example.com');
    expect(result.session.userId).toBe(result.user.id);
  });

  it('should reject login with wrong password', async () => {
    const org = await service.createOrg({ name: 'テスト株式会社' });
    await register({
      email: 'wrong@example.com', password: 'correct', name: '山田', orgId: org.id,
    });
    logout();

    await expect(login({
      email: 'wrong@example.com', password: 'incorrect',
    })).rejects.toThrow('正しくありません');
  });

  it('should reject login with non-existent email', async () => {
    await expect(login({
      email: 'nobody@example.com', password: 'pass',
    })).rejects.toThrow('正しくありません');
  });

  it('should manage session lifecycle', async () => {
    const org = await service.createOrg({ name: 'テスト株式会社' });
    await register({
      email: 'session@example.com', password: 'pass', name: 'セッション', orgId: org.id,
    });

    // セッションが存在する
    const session = getSession();
    expect(session).not.toBeNull();
    expect(session.userId).toBeDefined();
    expect(session.exp).toBeGreaterThan(Date.now());

    // ログアウトでセッションクリア
    logout();
    expect(getSession()).toBeNull();
  });

  it('should expire sessions after 24 hours', () => {
    // 期限切れセッションを直接設定
    localStorageMock.setItem('mirucare_session', JSON.stringify({
      userId: 'u1', orgId: 'o1', role: 'admin', exp: Date.now() - 1000,
    }));

    expect(getSession()).toBeNull();
  });
});

describe('LocalDataService — Organization', () => {
  let service;

  beforeEach(() => {
    resetStores();
    localStorageMock.clear();
    service = new LocalDataService();
  });

  it('should create an organization', async () => {
    const org = await service.createOrg({ name: '株式会社テスト' });
    expect(org.id).toBeDefined();
    expect(org.name).toBe('株式会社テスト');
    expect(org.plan).toBe('trial');
    expect(org.config.timezone).toBe('Asia/Tokyo');
  });

  it('should retrieve an organization by ID', async () => {
    const org = await service.createOrg({ name: '取得テスト' });
    const retrieved = await service.getOrg(org.id);
    expect(retrieved.name).toBe('取得テスト');
  });
});

describe('LocalDataService — Teams', () => {
  let service;
  let org;

  beforeEach(async () => {
    resetStores();
    localStorageMock.clear();
    service = new LocalDataService();
    org = await service.createOrg({ name: 'チームテスト株式会社' });
  });

  it('should create a team', async () => {
    const team = await service.createTeam({ name: '営業部', orgId: org.id });
    expect(team.id).toBeDefined();
    expect(team.name).toBe('営業部');
    expect(team.orgId).toBe(org.id);
  });

  it('should list teams by org', async () => {
    await service.createTeam({ name: '営業部', orgId: org.id });
    await service.createTeam({ name: '開発部', orgId: org.id });

    const teams = await service.getTeams(org.id);
    expect(teams).toHaveLength(2);
  });

  it('should add and remove team members', async () => {
    const team = await service.createTeam({ name: '人事部', orgId: org.id });
    const user = await service.createUser({
      email: 'member@example.com', password: 'pass', name: '高橋', orgId: org.id,
    });

    const membership = await service.addTeamMember({ userId: user.id, teamId: team.id });
    expect(membership.userId).toBe(user.id);
    expect(membership.teamId).toBe(team.id);

    const members = await service.getTeamMembers(team.id);
    expect(members).toHaveLength(1);

    await service.removeTeamMember(membership.id);
    const afterRemove = await service.getTeamMembers(team.id);
    expect(afterRemove).toHaveLength(0);
  });
});

describe('LocalDataService — Measurements', () => {
  let service;
  let org;

  beforeEach(async () => {
    resetStores();
    localStorageMock.clear();
    service = new LocalDataService();
    org = await service.createOrg({ name: '計測テスト株式会社' });
  });

  it('should save and retrieve measurements', async () => {
    const user = await service.createUser({
      email: 'measure@example.com', password: 'pass', name: '計測者', orgId: org.id,
    });

    const saved = await service.saveMeasurement({
      userId: user.id,
      orgId: org.id,
      hr: 72,
      confidence: 0.85,
      hrv: { rmssd: 35.2, sdnn: 42.1, pnn50: 15.3 },
      stressScore: 38,
      qualityGrade: 'A',
    });

    expect(saved.id).toBeDefined();
    expect(saved.hr).toBe(72);

    const results = await service.getMeasurements({ userId: user.id });
    expect(results).toHaveLength(1);
    expect(results[0].hr).toBe(72);
  });

  it('should filter measurements by date range', async () => {
    const user = await service.createUser({
      email: 'filter@example.com', password: 'pass', name: 'フィルタ', orgId: org.id,
    });

    // 古いデータを直接追加
    const { put } = await import('../idb-helpers.js');
    await put('measurements', {
      id: 'old-1', userId: user.id, orgId: org.id,
      timestamp: '2026-01-01T00:00:00Z', hr: 70, stressScore: 30, hrv: {},
      qualityGrade: 'B',
    });
    await put('measurements', {
      id: 'new-1', userId: user.id, orgId: org.id,
      timestamp: '2026-03-10T00:00:00Z', hr: 75, stressScore: 40, hrv: {},
      qualityGrade: 'A',
    });

    const filtered = await service.getMeasurements({
      userId: user.id, from: '2026-03-01', to: '2026-03-31',
    });
    expect(filtered).toHaveLength(1);
    expect(filtered[0].hr).toBe(75);
  });

  it('should save measurements with frequency and respiratory data', async () => {
    const user = await service.createUser({
      email: 'full@example.com', password: 'pass', name: '完全', orgId: org.id,
    });

    const saved = await service.saveMeasurement({
      userId: user.id, orgId: org.id,
      hr: 68, confidence: 0.9,
      hrv: { rmssd: 40, sdnn: 50, pnn50: 20 },
      freqMetrics: { lfHfRatio: 1.5, lfNorm: 60, hfNorm: 40 },
      respiratory: { rate: 16, confidence: 0.7 },
      stressScore: 25,
      qualityGrade: 'A',
    });

    expect(saved.freqMetrics.lfHfRatio).toBe(1.5);
    expect(saved.respiratory.rate).toBe(16);
  });
});

describe('LocalDataService — Team Stats (5名ルール)', () => {
  let service;
  let org;
  let team;

  beforeEach(async () => {
    resetStores();
    localStorageMock.clear();
    service = new LocalDataService();
    org = await service.createOrg({ name: '統計テスト株式会社' });
    team = await service.createTeam({ name: '営業部', orgId: org.id });
  });

  it('should return privacyFiltered=true when team has < 5 members', async () => {
    // 3名のみ追加
    for (let i = 0; i < 3; i++) {
      const user = await service.createUser({
        email: `user${i}@example.com`, password: 'pass', name: `ユーザー${i}`, orgId: org.id,
      });
      await service.addTeamMember({ userId: user.id, teamId: team.id });
    }

    const stats = await service.getTeamStats(team.id);
    expect(stats.privacyFiltered).toBe(true);
    expect(stats.stats).toBeNull();
    expect(stats.memberCount).toBe(3);
  });

  it('should return stats when team has >= 5 members', async () => {
    const { put } = await import('../idb-helpers.js');

    for (let i = 0; i < 6; i++) {
      const user = await service.createUser({
        email: `stat${i}@example.com`, password: 'pass', name: `統計${i}`, orgId: org.id,
      });
      await service.addTeamMember({ userId: user.id, teamId: team.id });

      // 計測データを追加
      await put('measurements', {
        id: `m-${i}`, userId: user.id, orgId: org.id, teamId: team.id,
        timestamp: new Date().toISOString(),
        hr: 70 + i, stressScore: 30 + i * 5, hrv: { rmssd: 35 + i, sdnn: 40 + i },
        qualityGrade: 'A',
      });
    }

    const stats = await service.getTeamStats(team.id);
    expect(stats.privacyFiltered).toBe(false);
    expect(stats.stats).not.toBeNull();
    expect(stats.stats.avgHr).toBeGreaterThan(0);
    expect(stats.stats.avgStress).toBeGreaterThan(0);
    expect(stats.memberCount).toBe(6);
  });
});

describe('LocalDataService — CSV Export', () => {
  let service;
  let org;

  beforeEach(async () => {
    resetStores();
    localStorageMock.clear();
    service = new LocalDataService();
    org = await service.createOrg({ name: 'CSV株式会社' });
  });

  it('should export CSV with header row', async () => {
    const csv = await service.exportCSV(org.id);
    expect(csv).toContain('日付,部署名,計測人数,平均ストレススコア,平均心拍数,平均RMSSD');
  });

  it('should skip teams with < 5 members in team CSV', async () => {
    const team = await service.createTeam({ name: '小チーム', orgId: org.id });

    // 3名だけ
    for (let i = 0; i < 3; i++) {
      const user = await service.createUser({
        email: `csv${i}@example.com`, password: 'pass', name: `CSV${i}`, orgId: org.id,
      });
      await service.addTeamMember({ userId: user.id, teamId: team.id });
    }

    const csv = await service.exportCSV(org.id, { teamId: team.id });
    expect(csv).toContain('プライバシー保護');
  });

  it('should export user CSV with measurement data', async () => {
    const user = await service.createUser({
      email: 'usercsv@example.com', password: 'pass', name: 'ユーザーCSV', orgId: org.id,
    });

    const { put } = await import('../idb-helpers.js');
    await put('measurements', {
      id: 'csv-m1', userId: user.id, orgId: org.id,
      timestamp: '2026-03-10T10:00:00Z', hr: 72, stressScore: 35,
      hrv: { rmssd: 38, sdnn: 45, pnn50: 18 },
      freqMetrics: { lfHfRatio: 1.2 },
      respiratory: { rate: 15 },
      qualityGrade: 'A',
    });

    const csv = await service.exportUserCSV({ userId: user.id });
    expect(csv).toContain('日時,心拍数,ストレススコア');
    expect(csv).toContain('72');
    expect(csv).toContain('38');
  });
});

describe('LocalDataService — Data Management', () => {
  let service;
  let org;

  beforeEach(async () => {
    resetStores();
    localStorageMock.clear();
    service = new LocalDataService();
    org = await service.createOrg({ name: 'データ管理テスト' });
  });

  it('should delete user data', async () => {
    const user = await service.createUser({
      email: 'delete@example.com', password: 'pass', name: '削除テスト', orgId: org.id,
    });

    const { put } = await import('../idb-helpers.js');
    await put('measurements', {
      id: 'del-m1', userId: user.id, orgId: org.id,
      timestamp: new Date().toISOString(), hr: 70, stressScore: 30, hrv: {},
      qualityGrade: 'B',
    });

    await service.deleteUserData(user.id);
    const remaining = await service.getMeasurements({ userId: user.id });
    expect(remaining).toHaveLength(0);
  });

  it('should delete all data', async () => {
    await service.createUser({
      email: 'all@example.com', password: 'pass', name: '全削除', orgId: org.id,
    });

    await service.deleteAllData();
    // Stores should be empty (clearAll mock clears all)
    const { getAll } = await import('../idb-helpers.js');
    const orgs = await getAll('organizations');
    expect(orgs).toHaveLength(0);
  });
});

describe('LocalDataService — Org Stats', () => {
  let service;
  let org;

  beforeEach(async () => {
    resetStores();
    localStorageMock.clear();
    service = new LocalDataService();
    org = await service.createOrg({ name: '組織統計テスト' });
  });

  it('should return org-wide stats', async () => {
    const { put } = await import('../idb-helpers.js');

    for (let i = 0; i < 3; i++) {
      const user = await service.createUser({
        email: `orgstat${i}@example.com`, password: 'pass', name: `統計${i}`, orgId: org.id,
      });
      await put('measurements', {
        id: `os-m${i}`, userId: user.id, orgId: org.id,
        timestamp: new Date().toISOString(), hr: 70 + i, stressScore: 40 + i,
        hrv: { rmssd: 35 }, qualityGrade: 'A',
      });
    }

    const stats = await service.getOrgStats(org.id);
    expect(stats.totalMembers).toBe(3);
    expect(stats.activeMeasured).toBe(3);
    expect(stats.stats.avgHr).toBeGreaterThan(0);
    expect(stats.stats.measurementCount).toBe(3);
  });

  it('should handle empty org stats', async () => {
    const stats = await service.getOrgStats(org.id);
    expect(stats.totalMembers).toBe(0);
    expect(stats.activeMeasured).toBe(0);
    expect(stats.stats.measurementCount).toBe(0);
  });
});

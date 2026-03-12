import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveLead,
  getLeads,
  getLeadStats,
  clearLeads,
  LEAD_KEY,
  MAX_LEADS,
} from '../lead-store.js';

// localStorage mock
const storage = {};
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] ?? null),
  setItem: vi.fn((key, value) => { storage[key] = value; }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
};
vi.stubGlobal('localStorage', localStorageMock);

const makeLead = (overrides = {}) => ({
  company: 'テスト株式会社',
  department: '人事部',
  name: '田中太郎',
  email: 'tanaka@example.co.jp',
  phone: '03-1234-5678',
  type: '資料請求',
  message: 'テストメッセージ',
  ...overrides,
});

describe('lead-store', () => {
  beforeEach(() => {
    delete storage[LEAD_KEY];
    localStorageMock.getItem.mockImplementation((key) => storage[key] ?? null);
    localStorageMock.setItem.mockImplementation((key, value) => { storage[key] = value; });
    localStorageMock.removeItem.mockImplementation((key) => { delete storage[key]; });
    vi.restoreAllMocks();
    // Re-stub after restoreAllMocks
    vi.stubGlobal('localStorage', localStorageMock);
  });

  describe('saveLead', () => {
    it('リードをlocalStorageに保存する', () => {
      saveLead(makeLead());
      const stored = JSON.parse(storage[LEAD_KEY]);
      expect(stored).toHaveLength(1);
      expect(stored[0].company).toBe('テスト株式会社');
      expect(stored[0].email).toBe('tanaka@example.co.jp');
      expect(stored[0].ts).toBeTypeOf('number');
    });

    it('複数リードを蓄積する', () => {
      saveLead(makeLead({ company: 'A社' }));
      saveLead(makeLead({ company: 'B社' }));
      saveLead(makeLead({ company: 'C社' }));
      const stored = JSON.parse(storage[LEAD_KEY]);
      expect(stored).toHaveLength(3);
    });

    it('MAX_LEADSを超えたら古いものを削除する', () => {
      // Pre-fill with MAX_LEADS entries
      const list = Array.from({ length: MAX_LEADS }, (_, i) => ({
        ...makeLead({ company: `会社${i}` }),
        ts: Date.now() - (MAX_LEADS - i) * 1000,
      }));
      storage[LEAD_KEY] = JSON.stringify(list);

      saveLead(makeLead({ company: '最新会社' }));
      const stored = JSON.parse(storage[LEAD_KEY]);
      expect(stored).toHaveLength(MAX_LEADS);
      expect(stored[stored.length - 1].company).toBe('最新会社');
      // 最古のエントリが削除されている
      expect(stored.find((l) => l.company === '会社0')).toBeUndefined();
    });

    it('localStorage容量超過時に半分に縮小して再保存する', () => {
      let throwOnce = true;
      localStorageMock.setItem.mockImplementation((key, value) => {
        if (key === LEAD_KEY && throwOnce) {
          throwOnce = false;
          throw new DOMException('QuotaExceededError');
        }
        storage[key] = value;
      });

      // Pre-fill some data
      storage[LEAD_KEY] = JSON.stringify([
        { ...makeLead({ company: '古い会社' }), ts: 1000 },
        { ...makeLead({ company: '新しい会社' }), ts: 2000 },
      ]);

      saveLead(makeLead({ company: '最新' }));
      // Fallback save should have succeeded with reduced list
      const stored = JSON.parse(storage[LEAD_KEY]);
      expect(stored.length).toBeLessThan(4); // trimmed
      expect(stored[stored.length - 1].company).toBe('最新');
    });

    it('壊れたJSONでも空配列として扱う', () => {
      storage[LEAD_KEY] = 'not-valid-json';
      saveLead(makeLead());
      const stored = JSON.parse(storage[LEAD_KEY]);
      expect(stored).toHaveLength(1);
    });
  });

  describe('getLeads', () => {
    it('空の場合は空配列を返す', () => {
      expect(getLeads()).toEqual([]);
    });

    it('新しい順にソートして返す', () => {
      const list = [
        { ...makeLead({ company: '古い' }), ts: 1000 },
        { ...makeLead({ company: '新しい' }), ts: 3000 },
        { ...makeLead({ company: '中間' }), ts: 2000 },
      ];
      storage[LEAD_KEY] = JSON.stringify(list);
      const leads = getLeads();
      expect(leads[0].company).toBe('新しい');
      expect(leads[1].company).toBe('中間');
      expect(leads[2].company).toBe('古い');
    });
  });

  describe('getLeadStats', () => {
    it('空の場合はゼロを返す', () => {
      const stats = getLeadStats();
      expect(stats).toEqual({ total: 0, last24h: 0, last7d: 0 });
    });

    it('期間別の件数を正しくカウントする', () => {
      const now = Date.now();
      const hour = 60 * 60 * 1000;
      const day = 24 * hour;
      const list = [
        { ...makeLead(), ts: now - 1 * hour },       // 1時間前 → 24h内, 7d内
        { ...makeLead(), ts: now - 12 * hour },      // 12時間前 → 24h内, 7d内
        { ...makeLead(), ts: now - 3 * day },        // 3日前 → 7d内のみ
        { ...makeLead(), ts: now - 10 * day },       // 10日前 → どちらにも入らない
      ];
      storage[LEAD_KEY] = JSON.stringify(list);
      const stats = getLeadStats();
      expect(stats.total).toBe(4);
      expect(stats.last24h).toBe(2);
      expect(stats.last7d).toBe(3);
    });
  });

  describe('clearLeads', () => {
    it('全リードデータを削除する', () => {
      storage[LEAD_KEY] = JSON.stringify([makeLead()]);
      clearLeads();
      expect(storage[LEAD_KEY]).toBeUndefined();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith(LEAD_KEY);
    });
  });

  describe('constants', () => {
    it('LEAD_KEYが正しい値', () => {
      expect(LEAD_KEY).toBe('mc_leads');
    });

    it('MAX_LEADSが200', () => {
      expect(MAX_LEADS).toBe(200);
    });
  });
});

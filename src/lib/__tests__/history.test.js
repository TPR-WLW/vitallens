import { describe, it, expect, beforeEach, vi } from 'vitest';
import { saveEntry, getEntries, deleteEntry, clearAll, getCount } from '../history.js';

// localStorage モック
const storage = {};
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] ?? null),
  setItem: vi.fn((key, value) => { storage[key] = value; }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
};
vi.stubGlobal('localStorage', localStorageMock);

function makeResult(overrides = {}) {
  return {
    hr: 72,
    confidence: 0.85,
    duration: 180,
    samples: 5400,
    hrv: {
      metrics: { rmssd: 35, sdnn: 42, pnn50: 18, meanIBI: 833, meanHR: 72 },
      stress: { level: 'low', score: 28, label: '低い', color: '#22c55e' },
      quality: { grade: 'A', score: 0.85, message: '信号品質: 優秀' },
    },
    emotion: {
      summary: {
        dominant: 'neutral',
        distribution: { neutral: 70, happiness: 20, sadness: 5, surprise: 3, anger: 1, fear: 1, disgust: 0 },
      },
    },
    ...overrides,
  };
}

describe('history', () => {
  beforeEach(() => {
    // ストレージをクリア
    for (const key of Object.keys(storage)) delete storage[key];
    vi.clearAllMocks();
  });

  describe('saveEntry', () => {
    it('計測結果を保存し、エントリを返す', () => {
      const result = makeResult();
      const entry = saveEntry(result);

      expect(entry).toHaveProperty('id');
      expect(entry).toHaveProperty('timestamp');
      expect(entry.data.hr).toBe(72);
      expect(entry.data.hrv.metrics.rmssd).toBe(35);
      expect(entry.data.emotionSummary).toEqual(result.emotion.summary);
    });

    it('デモ/サンプルフラグを保持する', () => {
      const demo = saveEntry(makeResult({ isDemo: true }));
      expect(demo.data.isDemo).toBe(true);
      expect(demo.data.isSample).toBe(false);

      const sample = saveEntry(makeResult({ isSample: true }));
      expect(sample.data.isSample).toBe(true);
    });

    it('HRVなしの結果も保存できる', () => {
      const entry = saveEntry(makeResult({ hrv: null }));
      expect(entry.data.hrv).toBeNull();
    });

    it('emotionなしの結果も保存できる', () => {
      const entry = saveEntry(makeResult({ emotion: null }));
      expect(entry.data.emotionSummary).toBeNull();
    });

    it('新しいエントリが先頭に追加される', () => {
      saveEntry(makeResult({ hr: 70 }));
      saveEntry(makeResult({ hr: 80 }));
      const entries = getEntries();
      expect(entries).toHaveLength(2);
      expect(entries[0].data.hr).toBe(80);
      expect(entries[1].data.hr).toBe(70);
    });

    it('100件を超えると古いエントリが削除される', () => {
      for (let i = 0; i < 105; i++) {
        saveEntry(makeResult({ hr: 60 + i }));
      }
      const entries = getEntries();
      expect(entries.length).toBeLessThanOrEqual(100);
    });
  });

  describe('getEntries', () => {
    it('空のストレージでは空配列を返す', () => {
      expect(getEntries()).toEqual([]);
    });

    it('不正なJSONでは空配列を返す', () => {
      storage['mirucare_history'] = 'invalid-json';
      expect(getEntries()).toEqual([]);
    });

    it('配列でない値では空配列を返す', () => {
      storage['mirucare_history'] = JSON.stringify({ not: 'array' });
      expect(getEntries()).toEqual([]);
    });
  });

  describe('deleteEntry', () => {
    it('指定IDのエントリを削除する', () => {
      const e1 = saveEntry(makeResult({ hr: 70 }));
      saveEntry(makeResult({ hr: 80 }));
      expect(getEntries()).toHaveLength(2);

      deleteEntry(e1.id);
      const remaining = getEntries();
      expect(remaining).toHaveLength(1);
      expect(remaining[0].data.hr).toBe(80);
    });

    it('存在しないIDでもエラーにならない', () => {
      saveEntry(makeResult());
      deleteEntry('nonexistent');
      expect(getEntries()).toHaveLength(1);
    });
  });

  describe('clearAll', () => {
    it('全履歴を削除する', () => {
      saveEntry(makeResult());
      saveEntry(makeResult());
      expect(getEntries()).toHaveLength(2);

      clearAll();
      expect(getEntries()).toEqual([]);
    });
  });

  describe('getCount', () => {
    it('履歴の件数を返す', () => {
      expect(getCount()).toBe(0);
      saveEntry(makeResult());
      expect(getCount()).toBe(1);
      saveEntry(makeResult());
      expect(getCount()).toBe(2);
    });
  });
});

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  logError,
  logRejection,
  logMeasureEvent,
  getErrorStats,
  clearErrorLog,
  installGlobalHandlers,
} from '../error-monitor.js';

const STORAGE_KEY = 'vl_error_log';

// localStorage モック
const storage = {};
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] ?? null),
  setItem: vi.fn((key, value) => { storage[key] = value; }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
};
vi.stubGlobal('localStorage', localStorageMock);

describe('error-monitor', () => {
  beforeEach(() => {
    delete storage[STORAGE_KEY];
    localStorageMock.getItem.mockImplementation((key) => storage[key] ?? null);
    localStorageMock.setItem.mockImplementation((key, value) => { storage[key] = value; });
    localStorageMock.removeItem.mockImplementation((key) => { delete storage[key]; });
  });

  describe('logError', () => {
    it('stores a JS error entry', () => {
      logError('TypeError: x is undefined', 'app.js', 42, 10);
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log).toHaveLength(1);
      expect(log[0].type).toBe('js_error');
      expect(log[0].message).toBe('TypeError: x is undefined');
      expect(log[0].source).toBe('app.js');
      expect(log[0].line).toBe(42);
      expect(log[0].col).toBe(10);
      expect(log[0].ts).toBeGreaterThan(0);
    });

    it('truncates long messages to 200 chars', () => {
      logError('x'.repeat(300));
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log[0].message.length).toBe(200);
    });

    it('handles undefined source gracefully', () => {
      logError('err', undefined, 1, 1);
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log[0].source).toBeUndefined();
    });
  });

  describe('logRejection', () => {
    it('stores a rejection entry', () => {
      logRejection('Network error');
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log).toHaveLength(1);
      expect(log[0].type).toBe('rejection');
      expect(log[0].message).toBe('Network error');
    });

    it('converts non-string reasons to string', () => {
      logRejection({ code: 42 });
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log[0].message).toBe('[object Object]');
    });
  });

  describe('logMeasureEvent', () => {
    it('stores success events with details', () => {
      logMeasureEvent('success', { hr: 72, sqi: 0.85 });
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log).toHaveLength(1);
      expect(log[0].type).toBe('measure');
      expect(log[0].event).toBe('success');
      expect(log[0].hr).toBe(72);
      expect(log[0].sqi).toBe(0.85);
    });

    it('stores camera_error events', () => {
      logMeasureEvent('camera_error', { message: 'NotAllowedError' });
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log[0].event).toBe('camera_error');
    });

    it('stores low_sqi_complete events', () => {
      logMeasureEvent('low_sqi_complete', { sqi: 0.15 });
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log[0].event).toBe('low_sqi_complete');
    });

    it('works with no details', () => {
      logMeasureEvent('success');
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log[0].event).toBe('success');
    });
  });

  describe('getErrorStats', () => {
    it('returns empty stats when no logs', () => {
      const stats = getErrorStats();
      expect(stats.total).toBe(0);
      expect(stats.measureSuccessRate).toBeNull();
      expect(stats.recentErrors).toEqual([]);
    });

    it('calculates measurement success rate', () => {
      logMeasureEvent('success', {});
      logMeasureEvent('success', {});
      logMeasureEvent('low_sqi_complete', {});
      const stats = getErrorStats();
      expect(stats.measureTotal).toBe(3);
      expect(stats.measureSuccessRate).toBe(67);
    });

    it('counts by type in last 24h', () => {
      logError('err1');
      logError('err2');
      logMeasureEvent('success', {});
      const stats = getErrorStats();
      expect(stats.last24h['js_error']).toBe(2);
      expect(stats.last24h['measure:success']).toBe(1);
    });

    it('returns recent non-measure errors (max 5)', () => {
      logError('err1');
      logRejection('rej1');
      logMeasureEvent('success', {});
      const stats = getErrorStats();
      expect(stats.recentErrors).toHaveLength(2);
      expect(stats.recentErrors[0].type).toBe('js_error');
      expect(stats.recentErrors[1].type).toBe('rejection');
    });

    it('100% success rate when all succeed', () => {
      logMeasureEvent('success', {});
      logMeasureEvent('success', {});
      const stats = getErrorStats();
      expect(stats.measureSuccessRate).toBe(100);
    });
  });

  describe('clearErrorLog', () => {
    it('removes all error logs', () => {
      logError('err');
      logMeasureEvent('success', {});
      clearErrorLog();
      expect(storage[STORAGE_KEY]).toBeUndefined();
      expect(getErrorStats().total).toBe(0);
    });
  });

  describe('max entries cap', () => {
    it('caps at 200 entries', () => {
      for (let i = 0; i < 210; i++) {
        logError(`err${i}`);
      }
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log.length).toBeLessThanOrEqual(200);
    });
  });

  describe('installGlobalHandlers', () => {
    it('sets globalThis.onerror handler', () => {
      installGlobalHandlers();
      expect(globalThis.onerror).toBeInstanceOf(Function);
    });

    it('onerror handler logs the error', () => {
      installGlobalHandlers();
      globalThis.onerror('test error', 'test.js', 1, 1);
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log).toHaveLength(1);
      expect(log[0].message).toBe('test error');
    });
  });

  describe('corrupted storage resilience', () => {
    it('handles corrupted JSON in localStorage', () => {
      storage[STORAGE_KEY] = 'not json';
      logError('new error');
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log).toHaveLength(1);
    });
  });

  describe('multiple sequential entries', () => {
    it('appends entries in order', () => {
      logError('first');
      logMeasureEvent('success', {});
      logRejection('third');
      const log = JSON.parse(storage[STORAGE_KEY]);
      expect(log).toHaveLength(3);
      expect(log[0].type).toBe('js_error');
      expect(log[1].type).toBe('measure');
      expect(log[2].type).toBe('rejection');
    });
  });
});

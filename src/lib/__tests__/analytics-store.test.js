import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  recordPageView,
  recordEvent,
  getPageViewStats,
  getEventStats,
  clearAnalytics,
  PV_KEY,
  EV_KEY,
  MAX_PV,
} from '../analytics-store.js';

// localStorage mock
const storage = {};
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] ?? null),
  setItem: vi.fn((key, value) => { storage[key] = value; }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
};
vi.stubGlobal('localStorage', localStorageMock);

describe('analytics-store', () => {
  beforeEach(() => {
    delete storage[PV_KEY];
    delete storage[EV_KEY];
    localStorageMock.getItem.mockImplementation((key) => storage[key] ?? null);
    localStorageMock.setItem.mockImplementation((key, value) => { storage[key] = value; });
    localStorageMock.removeItem.mockImplementation((key) => { delete storage[key]; });
  });

  describe('recordPageView', () => {
    it('stores a page view entry', () => {
      recordPageView('/');
      const log = JSON.parse(storage[PV_KEY]);
      expect(log).toHaveLength(1);
      expect(log[0].page).toBe('/');
      expect(log[0].ts).toBeGreaterThan(0);
    });

    it('appends multiple page views', () => {
      recordPageView('/');
      recordPageView('/start');
      recordPageView('/result');
      const log = JSON.parse(storage[PV_KEY]);
      expect(log).toHaveLength(3);
      expect(log[1].page).toBe('/start');
    });

    it('includes referrer', () => {
      recordPageView('/');
      const log = JSON.parse(storage[PV_KEY]);
      expect(log[0]).toHaveProperty('ref');
    });
  });

  describe('recordEvent', () => {
    it('stores a named event', () => {
      recordEvent('cta_click', { from: 'landing' });
      const log = JSON.parse(storage[EV_KEY]);
      expect(log).toHaveLength(1);
      expect(log[0].name).toBe('cta_click');
      expect(log[0].from).toBe('landing');
      expect(log[0].ts).toBeGreaterThan(0);
    });

    it('stores event without props', () => {
      recordEvent('demo_start');
      const log = JSON.parse(storage[EV_KEY]);
      expect(log).toHaveLength(1);
      expect(log[0].name).toBe('demo_start');
    });
  });

  describe('getPageViewStats', () => {
    it('returns zero stats when empty', () => {
      const stats = getPageViewStats();
      expect(stats.total).toBe(0);
      expect(stats.last24h).toBe(0);
      expect(stats.last7d).toBe(0);
      expect(stats.last30d).toBe(0);
      expect(stats.dailyBreakdown).toHaveLength(7);
    });

    it('counts recent page views', () => {
      recordPageView('/');
      recordPageView('/start');
      const stats = getPageViewStats();
      expect(stats.total).toBe(2);
      expect(stats.last24h).toBe(2);
      expect(stats.last7d).toBe(2);
    });

    it('groups by page', () => {
      recordPageView('/');
      recordPageView('/');
      recordPageView('/start');
      const stats = getPageViewStats();
      expect(stats.byPage24h['/']).toBe(2);
      expect(stats.byPage24h['/start']).toBe(1);
    });

    it('daily breakdown has correct length', () => {
      recordPageView('/');
      const stats = getPageViewStats();
      expect(stats.dailyBreakdown).toHaveLength(7);
      // Today should have count
      const today = stats.dailyBreakdown[6];
      expect(today.count).toBeGreaterThanOrEqual(1);
    });

    it('excludes old entries from 24h count', () => {
      // Manually insert an old entry
      const old = [{ page: '/', ref: '', ts: Date.now() - 2 * 24 * 60 * 60 * 1000 }];
      storage[PV_KEY] = JSON.stringify(old);
      recordPageView('/new');
      const stats = getPageViewStats();
      expect(stats.total).toBe(2);
      expect(stats.last24h).toBe(1);
      expect(stats.last7d).toBe(2);
    });
  });

  describe('getEventStats', () => {
    it('returns zero stats when empty', () => {
      const stats = getEventStats();
      expect(stats.total).toBe(0);
      expect(stats.last24h).toEqual({});
      expect(stats.last7d).toEqual({});
      expect(stats.recent).toEqual([]);
    });

    it('counts events by name', () => {
      recordEvent('cta_click');
      recordEvent('cta_click');
      recordEvent('demo_start');
      const stats = getEventStats();
      expect(stats.total).toBe(3);
      expect(stats.last7d.cta_click).toBe(2);
      expect(stats.last7d.demo_start).toBe(1);
    });

    it('returns recent events in reverse order', () => {
      recordEvent('a');
      recordEvent('b');
      recordEvent('c');
      const stats = getEventStats();
      expect(stats.recent[0].name).toBe('c');
      expect(stats.recent[2].name).toBe('a');
    });

    it('limits recent to 10', () => {
      for (let i = 0; i < 15; i++) recordEvent(`ev_${i}`);
      const stats = getEventStats();
      expect(stats.recent).toHaveLength(10);
    });
  });

  describe('clearAnalytics', () => {
    it('removes all analytics data', () => {
      recordPageView('/');
      recordEvent('test');
      clearAnalytics();
      expect(storage[PV_KEY]).toBeUndefined();
      expect(storage[EV_KEY]).toBeUndefined();
    });
  });

  describe('max entries', () => {
    it('trims page views to MAX_PV', () => {
      for (let i = 0; i < MAX_PV + 10; i++) {
        recordPageView(`/page-${i}`);
      }
      const log = JSON.parse(storage[PV_KEY]);
      expect(log.length).toBeLessThanOrEqual(MAX_PV);
    });
  });

  describe('corrupted storage', () => {
    it('handles corrupted JSON gracefully', () => {
      storage[PV_KEY] = '{broken json';
      const stats = getPageViewStats();
      expect(stats.total).toBe(0);
    });
  });
});

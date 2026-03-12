import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getUserId,
  getVariant,
  recordConversion,
  getTestResults,
  getActiveTests,
} from '../ab-test.js';

// localStorage mock
const storage = {};
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] ?? null),
  setItem: vi.fn((key, value) => { storage[key] = value; }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
};
vi.stubGlobal('localStorage', localStorageMock);

// sessionStorage mock
const sessionStore = {};
const sessionStorageMock = {
  getItem: vi.fn((key) => sessionStore[key] ?? null),
  setItem: vi.fn((key, value) => { sessionStore[key] = value; }),
  removeItem: vi.fn((key) => { delete sessionStore[key]; }),
};
vi.stubGlobal('sessionStorage', sessionStorageMock);

// crypto.randomUUID mock
vi.stubGlobal('crypto', { randomUUID: () => 'test-uuid-1234' });

describe('ab-test', () => {
  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
    Object.keys(sessionStore).forEach((k) => delete sessionStore[k]);
  });

  describe('getUserId', () => {
    it('creates and persists a user ID', () => {
      const uid = getUserId();
      expect(uid).toBe('test-uuid-1234');
      expect(storage.vl_uid).toBe('test-uuid-1234');
    });

    it('returns the same ID on subsequent calls', () => {
      const a = getUserId();
      const b = getUserId();
      expect(a).toBe(b);
    });
  });

  describe('getVariant', () => {
    it('returns a stable variant for the same user', () => {
      const v1 = getVariant('test1', ['A', 'B']);
      // Clear session to allow re-view
      Object.keys(sessionStore).forEach((k) => delete sessionStore[k]);
      const v2 = getVariant('test1', ['A', 'B']);
      expect(v1).toBe(v2);
    });

    it('returns one of the provided variants', () => {
      const variant = getVariant('my_test', ['control', 'experiment']);
      expect(['control', 'experiment']).toContain(variant);
    });

    it('returns empty string for empty variants array', () => {
      expect(getVariant('test', [])).toBe('');
    });

    it('returns the only variant when array has one element', () => {
      expect(getVariant('test', ['only'])).toBe('only');
    });

    it('records a view event on first call per session', () => {
      getVariant('cta_test', ['A', 'B']);
      const events = JSON.parse(storage.vl_events);
      const views = events.filter((e) => e.name === 'ab:view' && e.test === 'cta_test');
      expect(views).toHaveLength(1);
    });

    it('deduplicates view events within a session', () => {
      getVariant('cta_test', ['A', 'B']);
      getVariant('cta_test', ['A', 'B']);
      getVariant('cta_test', ['A', 'B']);
      const events = JSON.parse(storage.vl_events);
      const views = events.filter((e) => e.name === 'ab:view' && e.test === 'cta_test');
      expect(views).toHaveLength(1);
    });

    it('different users get reasonable distribution', () => {
      const counts = { A: 0, B: 0 };
      for (let i = 0; i < 100; i++) {
        storage.vl_uid = `user-${i}`;
        Object.keys(sessionStore).forEach((k) => delete sessionStore[k]);
        const v = getVariant('dist_test', ['A', 'B']);
        counts[v]++;
      }
      // Both variants should get at least 20% (very loose check)
      expect(counts.A).toBeGreaterThan(20);
      expect(counts.B).toBeGreaterThan(20);
    });
  });

  describe('recordConversion', () => {
    it('records a conversion event', () => {
      recordConversion('cta_test', 'A');
      const events = JSON.parse(storage.vl_events);
      const conversions = events.filter((e) => e.name === 'ab:convert' && e.test === 'cta_test');
      expect(conversions).toHaveLength(1);
      expect(conversions[0].variant).toBe('A');
    });
  });

  describe('getTestResults', () => {
    it('returns empty object when no data', () => {
      const results = getTestResults('nonexistent');
      expect(results).toEqual({});
    });

    it('aggregates views and conversions correctly', () => {
      // Simulate 3 views for A, 2 views for B, 1 conversion for A
      const events = [
        { name: 'ab:view', test: 'cta', variant: 'A', ts: Date.now() },
        { name: 'ab:view', test: 'cta', variant: 'A', ts: Date.now() },
        { name: 'ab:view', test: 'cta', variant: 'A', ts: Date.now() },
        { name: 'ab:view', test: 'cta', variant: 'B', ts: Date.now() },
        { name: 'ab:view', test: 'cta', variant: 'B', ts: Date.now() },
        { name: 'ab:convert', test: 'cta', variant: 'A', ts: Date.now() },
      ];
      storage.vl_events = JSON.stringify(events);

      const results = getTestResults('cta');
      expect(results.A.views).toBe(3);
      expect(results.A.conversions).toBe(1);
      expect(results.A.rate).toBe(33.3);
      expect(results.B.views).toBe(2);
      expect(results.B.conversions).toBe(0);
      expect(results.B.rate).toBe(0);
    });

    it('ignores events from other tests', () => {
      const events = [
        { name: 'ab:view', test: 'other', variant: 'A', ts: Date.now() },
        { name: 'ab:view', test: 'cta', variant: 'B', ts: Date.now() },
      ];
      storage.vl_events = JSON.stringify(events);

      const results = getTestResults('cta');
      expect(Object.keys(results)).toEqual(['B']);
    });
  });

  describe('getActiveTests', () => {
    it('returns empty array when no tests', () => {
      expect(getActiveTests()).toEqual([]);
    });

    it('returns unique test names', () => {
      const events = [
        { name: 'ab:view', test: 'cta', variant: 'A', ts: Date.now() },
        { name: 'ab:view', test: 'cta', variant: 'B', ts: Date.now() },
        { name: 'ab:convert', test: 'headline', variant: 'X', ts: Date.now() },
        { name: 'cta_click', ts: Date.now() }, // not an AB event
      ];
      storage.vl_events = JSON.stringify(events);

      const tests = getActiveTests();
      expect(tests).toHaveLength(2);
      expect(tests).toContain('cta');
      expect(tests).toContain('headline');
    });
  });
});

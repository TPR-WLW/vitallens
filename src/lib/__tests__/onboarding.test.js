import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isFirstVisit, completeOnboarding, resetOnboarding } from '../onboarding.js';

// localStorage モック
const storage = {};
const localStorageMock = {
  getItem: vi.fn((key) => storage[key] ?? null),
  setItem: vi.fn((key, value) => { storage[key] = value; }),
  removeItem: vi.fn((key) => { delete storage[key]; }),
};
vi.stubGlobal('localStorage', localStorageMock);

beforeEach(() => {
  Object.keys(storage).forEach((key) => delete storage[key]);
  vi.clearAllMocks();
});

describe('onboarding', () => {
  it('isFirstVisit returns true when no localStorage entry', () => {
    expect(isFirstVisit()).toBe(true);
  });

  it('isFirstVisit returns false after completeOnboarding', () => {
    completeOnboarding();
    expect(isFirstVisit()).toBe(false);
  });

  it('completeOnboarding sets localStorage key to true', () => {
    completeOnboarding();
    expect(localStorageMock.setItem).toHaveBeenCalledWith('mirucare_onboarding_complete', 'true');
  });

  it('resetOnboarding removes localStorage key', () => {
    completeOnboarding();
    expect(isFirstVisit()).toBe(false);
    resetOnboarding();
    expect(isFirstVisit()).toBe(true);
  });

  it('isFirstVisit returns true when localStorage throws', () => {
    localStorageMock.getItem.mockImplementationOnce(() => { throw new Error('quota'); });
    expect(isFirstVisit()).toBe(true);
  });

  it('completeOnboarding does not throw when localStorage is unavailable', () => {
    localStorageMock.setItem.mockImplementationOnce(() => { throw new Error('quota'); });
    expect(() => completeOnboarding()).not.toThrow();
  });

  it('resetOnboarding does not throw when localStorage is unavailable', () => {
    localStorageMock.removeItem.mockImplementationOnce(() => { throw new Error('quota'); });
    expect(() => resetOnboarding()).not.toThrow();
  });
});

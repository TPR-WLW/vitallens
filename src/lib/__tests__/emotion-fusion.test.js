import { describe, it, expect } from 'vitest';
import { computeConditionScores, getTensionLabel } from '../emotion-fusion.js';

// Mock HRV data matching analyzeHRV() output format
function makeHRVData(overrides = {}) {
  return {
    metrics: {
      rmssd: 38,
      sdnn: 45,
      pnn50: 20,
      ...overrides.metrics,
    },
    stress: {
      level: 'moderate',
      score: 45,
      label: '中程度',
      color: '#f59e0b',
      ...overrides.stress,
    },
    quality: { grade: 'B', message: '良好' },
  };
}

// Mock emotion summary matching EmotionProcessor.summary format
function makeEmotionSummary(overrides = {}) {
  return {
    dominant: 'neutral',
    distribution: {
      happiness: 10,
      sadness: 5,
      anger: 5,
      fear: 0,
      disgust: 0,
      surprise: 5,
      neutral: 75,
      ...overrides.distribution,
    },
    ...overrides,
  };
}

describe('computeConditionScores', () => {
  it('returns inconclusive when both HRV and emotion are null', () => {
    const result = computeConditionScores(null, null);
    expect(result.tension.score).toBe(-1);
    expect(result.vitality.score).toBe(-1);
    expect(result.balance.score).toBe(-1);
    expect(result.overall.score).toBe(-1);
    expect(result.tension.label).toBe('計測不能');
  });

  it('works with HRV only (no emotion)', () => {
    const result = computeConditionScores(makeHRVData(), null);
    expect(result.tension.score).toBeGreaterThanOrEqual(0);
    expect(result.tension.score).toBeLessThanOrEqual(100);
    expect(result.vitality.score).toBeGreaterThanOrEqual(0);
    expect(result.balance.score).toBeGreaterThanOrEqual(0);
    expect(result.hasEmotion).toBeFalsy();
  });

  it('works with emotion only (no HRV)', () => {
    const result = computeConditionScores(null, makeEmotionSummary());
    expect(result.tension.score).toBeGreaterThanOrEqual(0);
    expect(result.vitality.score).toBeGreaterThanOrEqual(0);
    expect(result.balance.score).toBeGreaterThanOrEqual(0);
    expect(result.hasEmotion).toBeTruthy();
  });

  it('works with both HRV and emotion', () => {
    const result = computeConditionScores(makeHRVData(), makeEmotionSummary());
    expect(result.tension.score).toBeGreaterThanOrEqual(0);
    expect(result.tension.score).toBeLessThanOrEqual(100);
    expect(result.vitality.score).toBeGreaterThanOrEqual(0);
    expect(result.balance.score).toBeGreaterThanOrEqual(0);
    expect(result.overall.score).toBeGreaterThanOrEqual(0);
    expect(result.hasEmotion).toBeTruthy();
    expect(result.overall.message).toBeTruthy();
  });

  it('all scores are clamped to [0, 100]', () => {
    // Extreme stress
    const highStress = makeHRVData({ stress: { score: 100, level: 'high', label: '高い', color: '#ef4444' } });
    const negativeEmotions = makeEmotionSummary({
      distribution: { anger: 40, fear: 30, sadness: 20, happiness: 0, neutral: 10, disgust: 0, surprise: 0 },
    });
    const result = computeConditionScores(highStress, negativeEmotions);
    expect(result.tension.score).toBeGreaterThanOrEqual(0);
    expect(result.tension.score).toBeLessThanOrEqual(100);
    expect(result.vitality.score).toBeGreaterThanOrEqual(0);
    expect(result.vitality.score).toBeLessThanOrEqual(100);
  });

  it('low stress + positive emotions give high scores', () => {
    const lowStress = makeHRVData({
      stress: { score: 15, level: 'low', label: '低い', color: '#22c55e' },
      metrics: { rmssd: 55, sdnn: 50, pnn50: 35 },
    });
    const happy = makeEmotionSummary({
      distribution: { happiness: 40, neutral: 50, sadness: 0, anger: 0, fear: 0, disgust: 0, surprise: 10 },
    });
    const result = computeConditionScores(lowStress, happy);
    expect(result.tension.score).toBeGreaterThanOrEqual(60);
    expect(result.vitality.score).toBeGreaterThanOrEqual(60);
    expect(result.overall.score).toBeGreaterThanOrEqual(60);
  });

  it('high stress + negative emotions give low scores', () => {
    const highStress = makeHRVData({
      stress: { score: 85, level: 'high', label: '高い', color: '#ef4444' },
      metrics: { rmssd: 18, sdnn: 20, pnn50: 5 },
    });
    const negative = makeEmotionSummary({
      distribution: { anger: 35, fear: 25, sadness: 20, happiness: 0, neutral: 15, disgust: 5, surprise: 0 },
    });
    const result = computeConditionScores(highStress, negative);
    expect(result.tension.score).toBeLessThanOrEqual(40);
    expect(result.overall.score).toBeLessThanOrEqual(50);
  });

  it('overall score has correct level labels', () => {
    const good = computeConditionScores(
      makeHRVData({ stress: { score: 20, level: 'low', label: '低い', color: '#22c55e' }, metrics: { rmssd: 50, sdnn: 50, pnn50: 30 } }),
      makeEmotionSummary()
    );
    expect(['とても良い', '良い']).toContain(good.overall.label);
  });

  it('handles HRV with unknown stress level', () => {
    const result = computeConditionScores(
      { stress: { level: 'unknown', score: 0 }, metrics: null },
      makeEmotionSummary()
    );
    // Should fall back to emotion-only
    expect(result.tension.score).toBeGreaterThanOrEqual(0);
  });
});

describe('getTensionLabel', () => {
  it('returns 計測不能 for negative scores', () => {
    expect(getTensionLabel(-1)).toBe('計測不能');
  });

  it('returns 低い for high scores (low tension = good)', () => {
    expect(getTensionLabel(80)).toBe('低い');
  });

  it('returns 高い for low scores (high tension = bad)', () => {
    expect(getTensionLabel(20)).toBe('高い');
  });
});

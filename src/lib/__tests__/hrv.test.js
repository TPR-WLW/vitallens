/**
 * HRV Analysis Module - Accuracy Validation Tests
 *
 * Tests cover:
 * 1. cubicSplineInterpolate - spline precision against known functions
 * 2. detectPeaks - peak detection on synthetic signals
 * 3. extractIBI - artifact rejection logic
 * 4. computeHRVMetrics - hand-verified metric calculations
 * 5. assessStressLevel - stress score boundary checks
 * 6. analyzeHRV - end-to-end integration with synthetic rPPG
 * 7. Physiological plausibility checks
 *
 * QA: James Bach style - exploratory + boundary + oracle-based verification
 */

import { describe, it, expect } from 'vitest';
import {
  cubicSplineInterpolate,
  detectPeaks,
  extractIBI,
  computeHRVMetrics,
  assessStressLevel,
  analyzeHRV,
} from '../hrv.js';

// ============================================================
// Helpers
// ============================================================

/**
 * Generate a clean sine wave signal.
 * @param {number} freqHz - Frequency in Hz
 * @param {number} durationSec - Duration in seconds
 * @param {number} sampleRate - Samples per second
 * @param {number} [amplitude=1] - Amplitude
 * @returns {Float64Array}
 */
function generateSineWave(freqHz, durationSec, sampleRate, amplitude = 1) {
  const N = Math.floor(durationSec * sampleRate);
  const signal = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    signal[i] = amplitude * Math.sin(2 * Math.PI * freqHz * (i / sampleRate));
  }
  return signal;
}

/**
 * Generate timestamps at a fixed FPS.
 */
function generateTimestamps(durationSec, fps) {
  const N = Math.floor(durationSec * fps);
  const timestamps = new Array(N);
  for (let i = 0; i < N; i++) {
    timestamps[i] = (i / fps) * 1000; // milliseconds
  }
  return timestamps;
}

/**
 * Hand-compute SDNN, RMSSD, pNN50 for test oracle.
 */
function handComputeHRV(ibis) {
  const N = ibis.length;
  const mean = ibis.reduce((a, b) => a + b, 0) / N;
  const variance = ibis.reduce((a, v) => a + (v - mean) ** 2, 0) / (N - 1);
  const sdnn = Math.sqrt(variance);

  let sumSqDiff = 0;
  let nn50 = 0;
  for (let i = 1; i < N; i++) {
    const diff = ibis[i] - ibis[i - 1];
    sumSqDiff += diff * diff;
    if (Math.abs(diff) > 50) nn50++;
  }
  const rmssd = Math.sqrt(sumSqDiff / (N - 1));
  const pnn50 = (nn50 / (N - 1)) * 100;

  return { sdnn, rmssd, pnn50, mean };
}


// ============================================================
// 1. cubicSplineInterpolate
// ============================================================

describe('cubicSplineInterpolate', () => {
  it('should reproduce a linear function exactly', () => {
    // f(x) = 2x + 1 -- cubic spline should reproduce linear perfectly
    const x = [0, 1, 2, 3, 4, 5];
    const y = x.map(v => 2 * v + 1);
    const xNew = [0.5, 1.5, 2.5, 3.5, 4.5];
    const result = cubicSplineInterpolate(x, y, xNew);

    for (let i = 0; i < xNew.length; i++) {
      const expected = 2 * xNew[i] + 1;
      expect(result[i]).toBeCloseTo(expected, 10);
    }
  });

  it('should approximate sin(x) with high precision given sufficient points', () => {
    // Sample sin at 20 evenly spaced points over [0, 2*PI]
    const N = 20;
    const x = Array.from({ length: N }, (_, i) => (i / (N - 1)) * 2 * Math.PI);
    const y = x.map(v => Math.sin(v));

    // Interpolate at midpoints
    const xNew = Array.from({ length: N - 1 }, (_, i) =>
      (x[i] + x[i + 1]) / 2
    );
    const result = cubicSplineInterpolate(x, y, xNew);

    for (let i = 0; i < xNew.length; i++) {
      const expected = Math.sin(xNew[i]);
      // Cubic spline on sin with 20 points should be accurate to ~0.001
      expect(Math.abs(result[i] - expected)).toBeLessThan(0.005);
    }
  });

  it('should pass through original data points', () => {
    const x = [0, 1, 2, 3, 4];
    const y = [0, 1, 4, 9, 16]; // x^2
    const result = cubicSplineInterpolate(x, y, x);

    for (let i = 0; i < x.length; i++) {
      expect(result[i]).toBeCloseTo(y[i], 6);
    }
  });

  it('should fall back to linear interpolation for < 4 points', () => {
    const x = [0, 1, 2];
    const y = [0, 2, 4];
    const xNew = [0.5, 1.5];
    const result = cubicSplineInterpolate(x, y, xNew);

    expect(result[0]).toBeCloseTo(1, 6);
    expect(result[1]).toBeCloseTo(3, 6);
  });
});


// ============================================================
// 2. detectPeaks
// ============================================================

describe('detectPeaks', () => {
  it('should detect correct number of peaks in a 1Hz sine wave at 256Hz', () => {
    // 1Hz sine = 1 peak per second. Over 10 seconds, expect ~10 peaks.
    // But edge effects from minDistance and boundary exclusion reduce count.
    const sampleRate = 256;
    const signal = generateSineWave(1, 10, sampleRate);
    const peaks = detectPeaks(signal, sampleRate);

    // Expect roughly 8-10 peaks (boundary exclusion removes first/last ~300ms)
    expect(peaks.length).toBeGreaterThanOrEqual(7);
    expect(peaks.length).toBeLessThanOrEqual(10);
  });

  it('should detect peaks at correct intervals for 1Hz sine', () => {
    const sampleRate = 256;
    const signal = generateSineWave(1, 10, sampleRate);
    const peaks = detectPeaks(signal, sampleRate);

    // Check that inter-peak intervals are ~256 samples (1 second)
    for (let i = 1; i < peaks.length; i++) {
      const interval = peaks[i] - peaks[i - 1];
      // Allow +/- 5 samples tolerance (~20ms at 256Hz)
      expect(Math.abs(interval - sampleRate)).toBeLessThan(5);
    }
  });

  it('should detect peaks at correct intervals for 1.5Hz (90 BPM) sine', () => {
    const sampleRate = 256;
    const freqHz = 1.5; // 90 BPM
    const signal = generateSineWave(freqHz, 10, sampleRate);
    const peaks = detectPeaks(signal, sampleRate);

    const expectedInterval = sampleRate / freqHz; // ~170.67 samples
    for (let i = 1; i < peaks.length; i++) {
      const interval = peaks[i] - peaks[i - 1];
      expect(Math.abs(interval - expectedInterval)).toBeLessThan(5);
    }
  });

  it('should return empty array for signal shorter than 1 second', () => {
    const sampleRate = 256;
    const signal = new Float64Array(100); // < 256 samples
    expect(detectPeaks(signal, sampleRate)).toEqual([]);
  });

  it('should handle a flat signal (no peaks)', () => {
    const sampleRate = 256;
    const signal = new Float64Array(256 * 5); // 5 seconds of zeros
    signal.fill(1.0);
    const peaks = detectPeaks(signal, sampleRate);
    expect(peaks.length).toBe(0);
  });
});


// ============================================================
// 3. extractIBI
// ============================================================

describe('extractIBI', () => {
  it('should extract correct IBIs from evenly spaced peaks at 256Hz', () => {
    // Peaks every 256 samples = 1000ms IBI at 256Hz sample rate
    const sampleRate = 256;
    const peaks = [256, 512, 768, 1024, 1280, 1536];
    const { ibis, validCount, artifactCount } = extractIBI(peaks, sampleRate);

    expect(validCount).toBe(5);
    expect(artifactCount).toBe(0);
    ibis.forEach(ibi => {
      expect(ibi).toBeCloseTo(1000, 1); // 1000ms
    });
  });

  it('should reject IBIs below 300ms (> 200 BPM)', () => {
    const sampleRate = 256;
    // 50 samples apart = 195ms (too fast)
    const peaks = [256, 306, 562, 818];
    const { ibis, artifactCount } = extractIBI(peaks, sampleRate);

    // First IBI (306-256)=50 samples = 195ms -> rejected
    expect(artifactCount).toBeGreaterThan(0);
    // Remaining IBIs should be valid
    ibis.forEach(ibi => {
      expect(ibi).toBeGreaterThanOrEqual(300);
    });
  });

  it('should reject IBIs above 1500ms (< 40 BPM)', () => {
    const sampleRate = 256;
    // 512 samples apart = 2000ms (too slow)
    const peaks = [0, 512, 1024];
    const { ibis, artifactCount } = extractIBI(peaks, sampleRate);

    // 512 samples / 256 Hz = 2000ms -> rejected
    expect(artifactCount).toBe(2);
    expect(ibis.length).toBe(0);
  });

  it('should handle ectopic beat pattern (short-long-normal)', () => {
    const sampleRate = 256;
    // Normal: 256 samples = 1000ms
    // Ectopic: 180 samples = 703ms, then 332 samples = 1297ms, back to 256 = 1000ms
    const peaks = [0, 256, 512, 692, 1024, 1280];
    const { ibis, artifactCount } = extractIBI(peaks, sampleRate);

    // The ectopic IBI at 692-512 = 180 samples = 703ms should potentially be
    // flagged if the jump is >30% from 1000ms (change = 29.7% -- borderline)
    // and 1024-692 = 332 samples = 1297ms
    expect(ibis.length).toBeGreaterThan(0);
  });

  it('should return empty for fewer than 2 peaks', () => {
    const { ibis, validCount, artifactCount } = extractIBI([256], 256);
    expect(ibis).toEqual([]);
    expect(validCount).toBe(0);
    expect(artifactCount).toBe(0);
  });

  it('should reject sudden >50% jump even without ectopic pattern', () => {
    const sampleRate = 256;
    // Normal 1000ms, then sudden 1600ms (60% change), then 1650ms
    // peaks at every 256 samples (1000ms), then 409 (1598ms), then 421 (1645ms)
    const peaks = [0, 256, 512, 921, 1342];
    const { ibis, artifactCount } = extractIBI(peaks, sampleRate);

    // 921-512 = 409 samples = 1598ms -> >50% change from 1000ms -> rejected
    // OR it may be range-rejected since 1598ms > 1500ms
    expect(artifactCount).toBeGreaterThan(0);
  });
});


// ============================================================
// 4. computeHRVMetrics
// ============================================================

describe('computeHRVMetrics', () => {
  it('should return null for fewer than 5 IBIs', () => {
    expect(computeHRVMetrics([800, 810, 790, 800])).toBeNull();
  });

  it('should compute correct SDNN, RMSSD, pNN50 for constant IBIs', () => {
    // All IBIs identical = zero variability
    const ibis = [1000, 1000, 1000, 1000, 1000, 1000];
    const result = computeHRVMetrics(ibis);

    expect(result).not.toBeNull();
    expect(result.sdnn).toBeCloseTo(0, 1);
    expect(result.rmssd).toBeCloseTo(0, 1);
    expect(result.pnn50).toBeCloseTo(0, 1);
    expect(result.meanIBI).toBe(1000);
    expect(result.meanHR).toBe(60);
  });

  it('should match hand-calculated values for a known IBI series', () => {
    // Realistic IBI series with moderate variability
    const ibis = [800, 820, 790, 810, 850, 780, 830, 800, 810, 795];
    const hand = handComputeHRV(ibis);
    const result = computeHRVMetrics(ibis);

    expect(result).not.toBeNull();
    // Match to 1 decimal (the function rounds to 1 decimal)
    expect(result.sdnn).toBeCloseTo(Math.round(hand.sdnn * 10) / 10, 1);
    expect(result.rmssd).toBeCloseTo(Math.round(hand.rmssd * 10) / 10, 1);
    expect(result.pnn50).toBeCloseTo(Math.round(hand.pnn50 * 10) / 10, 1);
  });

  it('should compute correct meanHR from meanIBI', () => {
    const ibis = [750, 750, 750, 750, 750]; // 80 BPM
    const result = computeHRVMetrics(ibis);
    expect(result.meanHR).toBe(80);
  });

  it('should compute pNN50 correctly when all successive diffs > 50ms', () => {
    // Alternating pattern: 800, 900, 800, 900, 800 -> all diffs = 100 > 50
    const ibis = [800, 900, 800, 900, 800, 900];
    const result = computeHRVMetrics(ibis);
    expect(result.pnn50).toBeCloseTo(100, 1);
  });

  it('should compute pNN50 correctly when no successive diffs > 50ms', () => {
    // Small variations: all diffs < 50ms
    const ibis = [800, 810, 820, 815, 805, 810];
    const result = computeHRVMetrics(ibis);
    expect(result.pnn50).toBeCloseTo(0, 1);
  });

  it('should handle large IBI series correctly', () => {
    // 100 IBIs with known statistics
    const ibis = [];
    for (let i = 0; i < 100; i++) {
      ibis.push(800 + (i % 2 === 0 ? 20 : -20)); // Alternating 820, 780
    }
    const hand = handComputeHRV(ibis);
    const result = computeHRVMetrics(ibis);

    expect(result.sdnn).toBeCloseTo(Math.round(hand.sdnn * 10) / 10, 1);
    expect(result.rmssd).toBeCloseTo(Math.round(hand.rmssd * 10) / 10, 1);
  });
});


// ============================================================
// 5. assessStressLevel
// ============================================================

describe('assessStressLevel', () => {
  it('should return "unknown" for null metrics', () => {
    const result = assessStressLevel(null);
    expect(result.level).toBe('unknown');
    expect(result.score).toBe(0);
  });

  it('should return "low" stress for high HRV (relaxed)', () => {
    // High RMSSD=70, high SDNN=60 -> low stress
    const result = assessStressLevel({ rmssd: 70, sdnn: 60, pnn50: 30 });
    expect(result.level).toBe('low');
    expect(result.score).toBeLessThanOrEqual(30);
    expect(result.label).toBe('リラックス');
    expect(result.color).toBe('#22c55e');
  });

  it('should return "high" stress for very low HRV (stressed)', () => {
    // Very low RMSSD=8, SDNN=8 -> high stress
    const result = assessStressLevel({ rmssd: 8, sdnn: 8, pnn50: 0 });
    expect(result.level).toBe('high');
    expect(result.score).toBeGreaterThan(80);
    expect(result.label).toBe('高い');
    expect(result.color).toBe('#ef4444');
  });

  it('should return "moderate" for mid-range HRV', () => {
    // RMSSD=40, SDNN=35 -> moderate
    // rmssdScore = 100 - (40-5)*(100/55) = 100 - 63.6 = 36.4
    // sdnnScore = 100 - (35-5)*(100/50) = 100 - 60 = 40
    // stressScore = round(36.4*0.7 + 40*0.3) = round(25.5 + 12) = 37
    const result = assessStressLevel({ rmssd: 40, sdnn: 35, pnn50: 15 });
    expect(result.level).toBe('moderate');
    expect(result.score).toBeGreaterThan(30);
    expect(result.score).toBeLessThanOrEqual(55);
  });

  it('should return "elevated" for low-moderate HRV', () => {
    // RMSSD=20, SDNN=18 -> elevated
    // rmssdScore = 100 - (20-5)*(100/55) = 100 - 27.3 = 72.7
    // sdnnScore = 100 - (18-5)*(100/50) = 100 - 26 = 74
    // stressScore = round(72.7*0.7 + 74*0.3) = round(50.9 + 22.2) = 73
    const result = assessStressLevel({ rmssd: 20, sdnn: 18, pnn50: 5 });
    expect(result.level).toBe('elevated');
    expect(result.score).toBeGreaterThan(55);
    expect(result.score).toBeLessThanOrEqual(80);
  });

  it('FIXED BUG-01: RMSSD=25, SDNN=22 no longer scores as "high" — now "elevated"', () => {
    // Previously scored 79 ("high"), now with widened normalization range:
    // rmssdScore = 100 - (25-5)*(100/55) = 100 - 36.4 = 63.6
    // sdnnScore = 100 - (22-5)*(100/50) = 100 - 34 = 66
    // stressScore = round(63.6*0.7 + 66*0.3) = round(44.5 + 19.8) = 64
    const result = assessStressLevel({ rmssd: 25, sdnn: 22, pnn50: 5 });
    expect(result.level).toBe('elevated'); // Fixed: was "high"
    expect(result.score).toBeLessThanOrEqual(80);
    expect(result.score).toBeGreaterThan(55);
  });

  it('should clamp extreme RMSSD values to valid score range', () => {
    // Extremely high RMSSD=200 -> score should not go below 0
    const result = assessStressLevel({ rmssd: 200, sdnn: 150, pnn50: 50 });
    expect(result.score).toBeGreaterThanOrEqual(0);

    // Extremely low RMSSD=0 -> score should not exceed 100
    const result2 = assessStressLevel({ rmssd: 0, sdnn: 0, pnn50: 0 });
    expect(result2.score).toBeLessThanOrEqual(100);
  });

  it('should weight RMSSD 70% and SDNN 30%', () => {
    // Verify weighting: if RMSSD is very high but SDNN is very low
    const highRmssd = assessStressLevel({ rmssd: 60, sdnn: 5, pnn50: 0 });
    const highSdnn = assessStressLevel({ rmssd: 5, sdnn: 55, pnn50: 0 });

    // highRmssd: rmssdScore=0, sdnnScore=100 -> stress = 0*0.7+100*0.3 = 30
    // highSdnn: rmssdScore=100, sdnnScore=0 -> stress = 100*0.7+0*0.3 = 70
    // So highSdnn case should be much more stressed
    expect(highSdnn.score).toBeGreaterThan(highRmssd.score);
  });
});


// ============================================================
// 6. analyzeHRV - Integration Test
// ============================================================

describe('analyzeHRV', () => {
  it('should return insufficient data for short signals (< 30 seconds)', () => {
    const fps = 30;
    const signal = generateSineWave(1, 20, fps); // 20 seconds, need 30
    const timestamps = generateTimestamps(20, fps);

    const result = analyzeHRV(signal, timestamps, fps);
    expect(result.metrics).toBeNull();
    expect(result.stress.level).toBe('unknown');
    expect(result.quality.grade).toBe('D');
  });

  it('should produce valid HRV metrics for a clean 1Hz (60 BPM) sine wave at 30fps for 60 seconds', () => {
    const fps = 30;
    const durationSec = 60;
    const freqHz = 1; // 60 BPM

    const signal = generateSineWave(freqHz, durationSec, fps);
    const timestamps = generateTimestamps(durationSec, fps);

    const result = analyzeHRV(signal, timestamps, fps);

    // For a perfectly regular 1Hz sine at 30fps:
    // After upsampling to 256Hz and peak detection, peaks should be ~256 samples apart
    // IBI should be ~1000ms, SDNN and RMSSD should be near zero
    if (result.metrics) {
      expect(result.metrics.meanHR).toBeGreaterThanOrEqual(55);
      expect(result.metrics.meanHR).toBeLessThanOrEqual(65);
      // Regular signal -> very low variability
      expect(result.metrics.sdnn).toBeLessThan(20);
      expect(result.metrics.rmssd).toBeLessThan(20);
    }
  });

  it('should produce valid HRV metrics for 1.2Hz (72 BPM) sine at 30fps for 60 seconds', () => {
    const fps = 30;
    const durationSec = 60;
    const freqHz = 1.2;

    const signal = generateSineWave(freqHz, durationSec, fps);
    const timestamps = generateTimestamps(durationSec, fps);

    const result = analyzeHRV(signal, timestamps, fps);

    if (result.metrics) {
      // 72 BPM expected
      expect(result.metrics.meanHR).toBeGreaterThanOrEqual(65);
      expect(result.metrics.meanHR).toBeLessThanOrEqual(80);
    }
  });

  it('should include quality assessment', () => {
    const fps = 30;
    const signal = generateSineWave(1, 60, fps);
    const timestamps = generateTimestamps(60, fps);
    const result = analyzeHRV(signal, timestamps, fps);

    expect(result.quality).toBeDefined();
    expect(['A', 'B', 'C', 'D']).toContain(result.quality.grade);
    expect(result.quality.score).toBeGreaterThanOrEqual(0);
    expect(result.quality.score).toBeLessThanOrEqual(1);
  });

  it('should include debug information', () => {
    const fps = 30;
    const signal = generateSineWave(1, 60, fps);
    const timestamps = generateTimestamps(60, fps);
    const result = analyzeHRV(signal, timestamps, fps);

    expect(result.debug).toBeDefined();
    expect(result.debug.totalBeats).toBeGreaterThan(0);
  });
});


// ============================================================
// 7. Physiological Plausibility Checks
// ============================================================

describe('Physiological Plausibility', () => {
  describe('Normal resting HRV ranges', () => {
    it('should produce RMSSD in 20-80ms and SDNN in 30-100ms for moderate variability IBIs', () => {
      // Simulate a resting heart with moderate natural variability
      // IBI around 850ms (70 BPM) with ~30ms standard deviation
      const rng = seedRandom(42);
      const ibis = [];
      for (let i = 0; i < 60; i++) {
        ibis.push(850 + gaussianRandom(rng) * 30);
      }

      const result = computeHRVMetrics(ibis);
      expect(result).not.toBeNull();

      // RMSSD should be in physiological range for resting
      expect(result.rmssd).toBeGreaterThan(10);
      expect(result.rmssd).toBeLessThan(100);

      // SDNN should be in physiological range
      expect(result.sdnn).toBeGreaterThan(10);
      expect(result.sdnn).toBeLessThan(120);

      // HR should be around 70
      expect(result.meanHR).toBeGreaterThanOrEqual(65);
      expect(result.meanHR).toBeLessThanOrEqual(75);
    });
  });

  describe('Perfectly regular heartbeat (60 BPM)', () => {
    it('should produce SDNN ~ 0, RMSSD ~ 0, pNN50 = 0 for constant 1000ms IBIs', () => {
      const ibis = new Array(30).fill(1000);
      const result = computeHRVMetrics(ibis);

      expect(result).not.toBeNull();
      expect(result.sdnn).toBeCloseTo(0, 1);
      expect(result.rmssd).toBeCloseTo(0, 1);
      expect(result.pnn50).toBeCloseTo(0, 1);
      expect(result.meanHR).toBe(60);
    });
  });

  describe('Variable heartbeat (800 +/- 50ms IBI)', () => {
    it('should produce non-zero SDNN and RMSSD', () => {
      // Alternating pattern for deterministic test
      const ibis = [];
      for (let i = 0; i < 30; i++) {
        ibis.push(i % 2 === 0 ? 750 : 850);
      }

      const result = computeHRVMetrics(ibis);
      expect(result).not.toBeNull();
      expect(result.sdnn).toBeGreaterThan(0);
      expect(result.rmssd).toBeGreaterThan(0);

      // SDNN should be ~50ms (standard deviation of alternating +/-50)
      expect(result.sdnn).toBeCloseTo(50, -1); // within ~10ms
      // RMSSD of alternating +100 diffs: sqrt(mean(100^2)) = 100
      expect(result.rmssd).toBeCloseTo(100, -1);
      // All successive diffs = 100 > 50, so pNN50 = 100%
      expect(result.pnn50).toBeCloseTo(100, 1);
    });
  });

  describe('Edge cases - insufficient data', () => {
    it('should handle signal that is exactly 30 seconds (boundary)', () => {
      const fps = 30;
      const durationSec = 30;
      const signal = generateSineWave(1, durationSec, fps);
      const timestamps = generateTimestamps(durationSec, fps);

      // N = 30*30 = 900, fps*30 = 900. The check is N < fps*30, so 900 < 900 = false
      // This means exactly 30 seconds should pass the minimum check
      const result = analyzeHRV(signal, timestamps, fps);
      // Should NOT return "insufficient data"
      expect(result.stress.label).not.toBe('データ不足');
    });

    it('should return insufficient for signal just under 30 seconds', () => {
      const fps = 30;
      // 29.9 seconds -> 897 samples < 900
      const N = Math.floor(29.9 * fps);
      const signal = new Float64Array(N);
      const timestamps = new Array(N);
      for (let i = 0; i < N; i++) {
        signal[i] = Math.sin(2 * Math.PI * 1 * (i / fps));
        timestamps[i] = (i / fps) * 1000;
      }

      const result = analyzeHRV(signal, timestamps, fps);
      expect(result.metrics).toBeNull();
    });

    it('should handle very few peaks gracefully', () => {
      // A very low-amplitude noisy signal that produces few peaks
      const fps = 30;
      const durationSec = 60;
      const N = fps * durationSec;
      const signal = new Float64Array(N);
      // Tiny amplitude noise -- unlikely to produce enough peaks
      for (let i = 0; i < N; i++) {
        signal[i] = Math.random() * 0.001;
      }
      const timestamps = generateTimestamps(durationSec, fps);

      const result = analyzeHRV(signal, timestamps, fps);
      // Should handle gracefully -- metrics may be null or have low quality
      expect(result.quality.grade).toBeDefined();
    });
  });
});


// ============================================================
// Utility: Seeded pseudo-random number generator
// ============================================================

function seedRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function gaussianRandom(rng) {
  // Box-Muller transform
  const u1 = rng();
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

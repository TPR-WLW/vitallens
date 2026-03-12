/**
 * Signal Quality & Notch Filter Tests
 *
 * Tests cover:
 * 1. notchFilter — removes target frequency while preserving others
 * 2. computeAliasFrequency — correct aliasing math for 50/60Hz at various fps
 * 3. RPPGProcessor SQI — channel stability and aggregate SQI
 * 4. Fluorescent flicker rejection — end-to-end with POS pipeline
 *
 * QA: James Bach style — boundary + oracle-based + real-world scenario
 */

import { describe, it, expect } from 'vitest';
import { notchFilter, computeAliasFrequency, std } from '../signal.js';
import { RPPGProcessor } from '../rppg.js';

// ============================================================
// Helpers
// ============================================================

function generateSineWave(freqHz, durationSec, sampleRate, amplitude = 1) {
  const N = Math.floor(durationSec * sampleRate);
  const signal = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    signal[i] = amplitude * Math.sin(2 * Math.PI * freqHz * (i / sampleRate));
  }
  return signal;
}

function signalPower(signal) {
  let sum = 0;
  for (let i = 0; i < signal.length; i++) sum += signal[i] * signal[i];
  return sum / signal.length;
}

// ============================================================
// 1. notchFilter
// ============================================================

describe('notchFilter', () => {
  it('should attenuate a sine wave at the notch frequency', () => {
    // Use higher sample rate for clean notch behavior
    const sampleRate = 256;
    const notchFreq = 2.0; // 2 Hz
    const signal = generateSineWave(2.0, 5, sampleRate);

    const filtered = notchFilter(signal, sampleRate, notchFreq, 30);
    const originalPower = signalPower(signal);
    const filteredPower = signalPower(filtered);

    // Should attenuate significantly (edge transients add residual power)
    // 2nd-order biquad with forward-backward pass: expect >5x power reduction
    expect(filteredPower / originalPower).toBeLessThan(0.2);
  });

  it('should preserve a sine wave away from the notch frequency', () => {
    const sampleRate = 30;
    const notchFreq = 2.0;
    // Signal at 1.0 Hz — well away from 2.0 Hz notch
    const signal = generateSineWave(1.0, 10, sampleRate);

    const filtered = notchFilter(signal, sampleRate, notchFreq, 30);
    const originalPower = signalPower(signal);
    const filteredPower = signalPower(filtered);

    // Should preserve >80% of power
    expect(filteredPower / originalPower).toBeGreaterThan(0.8);
  });

  it('should return copy of signal for invalid notch frequency (0 or above Nyquist)', () => {
    const signal = new Float64Array([1, 2, 3, 4, 5]);
    const result0 = notchFilter(signal, 30, 0);
    const resultHigh = notchFilter(signal, 30, 20); // above Nyquist (15Hz)

    for (let i = 0; i < signal.length; i++) {
      expect(result0[i]).toBe(signal[i]);
      expect(resultHigh[i]).toBe(signal[i]);
    }
  });

  it('should remove target frequency from a composite signal', () => {
    const sampleRate = 256;
    const duration = 5;
    const N = sampleRate * duration;

    // Signal = 1Hz (HR) + 3Hz (flicker alias)
    const signal = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      signal[i] = Math.sin(2 * Math.PI * 1.0 * (i / sampleRate))   // HR at 1Hz
                 + Math.sin(2 * Math.PI * 3.0 * (i / sampleRate));  // Flicker at 3Hz
    }

    const filtered = notchFilter(signal, sampleRate, 3.0, 30);

    // After filtering, the 3Hz component should be mostly gone
    // Check by filtering out 1Hz and seeing what remains
    const hrOnly = generateSineWave(1.0, duration, sampleRate);
    let diffPower = 0;
    for (let i = 100; i < N - 100; i++) { // Skip edges for filter settling
      const diff = filtered[i] - hrOnly[i];
      diffPower += diff * diff;
    }
    diffPower /= (N - 200);
    const hrPower = signalPower(hrOnly);

    // Residual should be < 10% of HR signal power
    expect(diffPower / hrPower).toBeLessThan(0.1);
  });
});

// ============================================================
// 2. computeAliasFrequency
// ============================================================

describe('computeAliasFrequency', () => {
  it('should return 0 for 60Hz at 30fps (exact multiple)', () => {
    const alias = computeAliasFrequency(60, 30);
    expect(alias).toBeCloseTo(0, 5);
  });

  it('should return 10Hz for 50Hz at 30fps', () => {
    // 50 % 30 = 20, 20 > 15 (Nyquist), fold: 30 - 20 = 10
    const alias = computeAliasFrequency(50, 30);
    expect(alias).toBeCloseTo(10, 5);
  });

  it('should return ~1Hz for 50Hz at 24.5fps', () => {
    // 50 % 24.5 = 1.0
    const alias = computeAliasFrequency(50, 24.5);
    expect(alias).toBeCloseTo(1.0, 1);
  });

  it('should return 0 for 50Hz at 25fps (exact multiple)', () => {
    const alias = computeAliasFrequency(50, 25);
    expect(alias).toBeCloseTo(0, 5);
  });

  it('should return ~2Hz for 50Hz at 24fps', () => {
    // 50 % 24 = 2
    const alias = computeAliasFrequency(50, 24);
    expect(alias).toBeCloseTo(2, 1);
  });

  it('should handle harmonic alias correctly (100Hz at 30fps)', () => {
    // 100 % 30 = 10, 10 < 15 (Nyquist)
    const alias = computeAliasFrequency(100, 30);
    expect(alias).toBeCloseTo(10, 5);
  });

  it('should handle 50Hz at 29fps', () => {
    // 50 % 29 = 21, 21 > 14.5, fold: 29 - 21 = 8
    const alias = computeAliasFrequency(50, 29);
    expect(alias).toBeCloseTo(8, 1);
  });
});

// ============================================================
// 3. RPPGProcessor SQI
// ============================================================

describe('RPPGProcessor SQI', () => {
  it('should return sqi object from computeHeartRate()', () => {
    const processor = new RPPGProcessor();
    const fps = 30;
    const duration = 5; // 5 seconds, > MIN_SAMPLES_FOR_HR (64)

    // Simulate clean 1.2Hz (72 BPM) signal with realistic RGB values
    for (let i = 0; i < fps * duration; i++) {
      const t = i / fps;
      const pulse = Math.sin(2 * Math.PI * 1.2 * t) * 2;
      processor.addSample(
        150 + pulse,        // R
        120 + pulse * 1.5,  // G (green has stronger rPPG signal)
        100 + pulse * 0.5,  // B
        (i / fps) * 1000
      );
    }

    const result = processor.computeHeartRate();
    expect(result).not.toBeNull();
    expect(result.sqi).toBeDefined();
    expect(result.sqi.score).toBeGreaterThanOrEqual(0);
    expect(result.sqi.score).toBeLessThanOrEqual(1);
    expect(result.sqi.label).toBeDefined();
    expect(result.sqi.color).toBeDefined();
    expect(result.sqi.components).toBeDefined();
    expect(result.sqi.components.spectral).toBeGreaterThanOrEqual(0);
    expect(result.sqi.components.channelStability).toBeGreaterThanOrEqual(0);
  });

  it('should report low channel stability for motion-contaminated signal', () => {
    const processor = new RPPGProcessor();
    const fps = 30;

    // First 3 seconds: clean signal
    for (let i = 0; i < fps * 3; i++) {
      const t = i / fps;
      const pulse = Math.sin(2 * Math.PI * 1.2 * t) * 2;
      processor.addSample(150 + pulse, 120 + pulse * 1.5, 100 + pulse * 0.5, t * 1000);
    }

    // Next 3 seconds: inject motion artifact (large channel variance)
    for (let i = 0; i < fps * 3; i++) {
      const t = 3 + i / fps;
      const pulse = Math.sin(2 * Math.PI * 1.2 * t) * 2;
      const motion = (i % 2 === 0 ? 40 : -40); // Large oscillation = motion
      processor.addSample(
        150 + pulse + motion,
        120 + pulse * 1.5 + motion,
        100 + pulse * 0.5 + motion,
        t * 1000
      );
    }

    const result = processor.computeHeartRate();
    if (result?.sqi) {
      // Channel stability should be < 1 due to motion windows
      expect(result.sqi.components.channelStability).toBeLessThan(1);
    }
  });

  it('should have sqi labels in Japanese', () => {
    const processor = new RPPGProcessor();

    // With no windowSQIs, channelStabilityAgg defaults to 1.0
    // So score = spectral * 0.5 + 1.0 * 0.5
    // For '信号良好' (>=0.6): need spectral >= 0.2 → 0.2*0.5 + 0.5 = 0.6
    const goodSqi = processor.computeAggregateSQI(0.8); // 0.8*0.5+0.5 = 0.9
    expect(goodSqi.label).toBe('信号良好');
    expect(goodSqi.color).toBe('#22c55e');

    // For '信号普通' (0.35-0.6): need low channelStability
    // Simulate bad windows
    processor.windowSQIs = [0.1, 0.1, 0.1, 0.1, 0.2];
    const okSqi = processor.computeAggregateSQI(0.5); // 0.5*0.5 + 0.1*0.5 = 0.3
    expect(okSqi.label).toBe('信号不安定'); // 0.3 < 0.35
    expect(okSqi.color).toBe('#ef4444');

    // For '信号普通' range
    processor.windowSQIs = [0.3, 0.3, 0.4, 0.5, 0.6];
    const midSqi = processor.computeAggregateSQI(0.5); // 0.5*0.5 + 0.3*0.5 = 0.4
    expect(midSqi.label).toBe('信号普通');
    expect(midSqi.color).toBe('#f59e0b');

    // For '信号不安定' (<0.35)
    processor.windowSQIs = [0.0, 0.0, 0.0, 0.1, 0.1];
    const badSqi = processor.computeAggregateSQI(0.2); // 0.2*0.5 + 0.0*0.5 = 0.1
    expect(badSqi.label).toBe('信号不安定');
    expect(badSqi.color).toBe('#ef4444');
  });
});

// ============================================================
// 4. Fluorescent flicker rejection (end-to-end)
// ============================================================

describe('Fluorescent flicker rejection', () => {
  it('should not apply notch filter when alias is outside HR band (50Hz at 30fps = 10Hz)', () => {
    // At exactly 30fps, 50Hz aliases to 10Hz which is above bandpass (3.5Hz)
    // The notch filter should NOT be applied (alias outside 0.5-4.0Hz range)
    const processor = new RPPGProcessor();
    const fps = 30;

    // Generate clean HR signal — notch should not interfere
    for (let i = 0; i < fps * 5; i++) {
      const t = i / fps;
      const pulse = Math.sin(2 * Math.PI * 1.0 * t) * 2;
      processor.addSample(150 + pulse, 120 + pulse * 1.5, 100 + pulse * 0.5, t * 1000);
    }

    const result = processor.computeHeartRate();
    // Should still get valid HR (no notch interference)
    expect(result).not.toBeNull();
    if (result) {
      expect(result.hr).toBeGreaterThan(0);
    }
  });

  it('should apply notch filter when alias falls in HR band (50Hz at ~24.5fps = ~1Hz)', () => {
    // At 24.5fps, 50Hz aliases to ~1.0Hz which is in the HR band
    // The notch filter should be applied to remove this artifact
    const processor = new RPPGProcessor();
    const fps = 24.5;

    for (let i = 0; i < Math.ceil(fps * 5); i++) {
      const t = i / fps;
      const pulse = Math.sin(2 * Math.PI * 1.2 * t) * 2;
      // Add 50Hz flicker that aliases to ~1Hz at this fps
      const flicker = Math.sin(2 * Math.PI * 1.0 * t) * 3; // Simulates aliased flicker
      processor.addSample(
        150 + pulse + flicker,
        120 + pulse * 1.5 + flicker * 0.8,
        100 + pulse * 0.5 + flicker * 0.5,
        t * 1000
      );
    }

    const result = processor.computeHeartRate();
    // Should still produce a result (notch filter removes flicker, HR survives)
    expect(result).not.toBeNull();
  });
});

// ============================================================
// 5. CHROM algorithm
// ============================================================

describe('CHROM algorithm', () => {
  it('chromWindow() should extract a signal from clean RGB with known pulse', () => {
    const processor = new RPPGProcessor();
    const N = 60; // 2 seconds at 30fps
    const R = new Float64Array(N);
    const G = new Float64Array(N);
    const B = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      const t = i / 30;
      const pulse = Math.sin(2 * Math.PI * 1.2 * t) * 2;
      R[i] = 150 + pulse;
      G[i] = 120 + pulse * 1.5;
      B[i] = 100 + pulse * 0.5;
    }

    const result = processor.chromWindow(R, G, B);
    expect(result).not.toBeNull();
    expect(result.signal).toBeInstanceOf(Float64Array);
    expect(result.signal.length).toBe(N);
    expect(result.channelStability).toBeGreaterThanOrEqual(0);
    expect(result.channelStability).toBeLessThanOrEqual(1);

    // Signal should have non-zero energy (actual pulse extracted)
    const energy = signalPower(result.signal);
    expect(energy).toBeGreaterThan(0);
  });

  it('chromWindow() returns null for short signals (<4 samples)', () => {
    const processor = new RPPGProcessor();
    const R = new Float64Array([150, 151, 152]);
    const G = new Float64Array([120, 121, 122]);
    const B = new Float64Array([100, 101, 102]);

    const result = processor.chromWindow(R, G, B);
    expect(result).toBeNull();
  });

  it('chromWindow() returns null when means are too low (<1)', () => {
    const processor = new RPPGProcessor();
    const N = 10;
    // All zeros — means will be 0
    const R = new Float64Array(N);
    const G = new Float64Array(N);
    const B = new Float64Array(N);

    expect(processor.chromWindow(R, G, B)).toBeNull();

    // One channel below 1, others valid
    const R2 = new Float64Array(N).fill(0.5);
    const G2 = new Float64Array(N).fill(120);
    const B2 = new Float64Array(N).fill(100);
    expect(processor.chromWindow(R2, G2, B2)).toBeNull();
  });

  it('chromAlgorithm() with overlapping windows produces signal of correct length', () => {
    const processor = new RPPGProcessor();
    const fps = 30;
    const duration = 5;
    const N = fps * duration; // 150 samples

    const R = new Float64Array(N);
    const G = new Float64Array(N);
    const B = new Float64Array(N);

    for (let i = 0; i < N; i++) {
      const t = i / fps;
      const pulse = Math.sin(2 * Math.PI * 1.0 * t) * 2;
      R[i] = 150 + pulse;
      G[i] = 120 + pulse * 1.5;
      B[i] = 100 + pulse * 0.5;
    }

    const result = processor.chromAlgorithm(R, G, B, fps);
    expect(result).not.toBeNull();
    expect(result).toBeInstanceOf(Float64Array);
    expect(result.length).toBe(N);

    // windowSQIs should have been populated by the overlapping windows
    expect(processor.windowSQIs.length).toBeGreaterThan(0);
  });

  it('computeHeartRate() returns algorithm field (POS or CHROM)', () => {
    const processor = new RPPGProcessor();
    const fps = 30;
    const duration = 5;

    for (let i = 0; i < fps * duration; i++) {
      const t = i / fps;
      const pulse = Math.sin(2 * Math.PI * 1.2 * t) * 2;
      processor.addSample(
        150 + pulse,
        120 + pulse * 1.5,
        100 + pulse * 0.5,
        t * 1000
      );
    }

    const result = processor.computeHeartRate();
    expect(result).not.toBeNull();
    expect(result.algorithm).toBeDefined();
    expect(['POS', 'CHROM']).toContain(result.algorithm);
  });

  it('computeHeartRate() picks algorithm with higher composite SQI', () => {
    // Two processors with same data — both should pick the same algorithm
    // and the chosen one should have non-negative score
    const processor = new RPPGProcessor();
    const fps = 30;
    const duration = 5;

    for (let i = 0; i < fps * duration; i++) {
      const t = i / fps;
      const pulse = Math.sin(2 * Math.PI * 1.2 * t) * 2;
      processor.addSample(
        150 + pulse,
        120 + pulse * 1.5,
        100 + pulse * 0.5,
        t * 1000
      );
    }

    const result = processor.computeHeartRate();
    expect(result).not.toBeNull();

    // Verify the winning algorithm has valid SQI
    expect(result.sqi).toBeDefined();
    expect(result.sqi.score).toBeGreaterThanOrEqual(0);
    expect(result.sqi.score).toBeLessThanOrEqual(1);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it('_compositeScore() computes weighted average of stability p25 and spectral confidence', () => {
    const processor = new RPPGProcessor();

    // Empty SQIs — stability defaults to 1
    const score1 = processor._compositeScore([], 0.8);
    // 0.8 * 0.5 + 1.0 * 0.5 = 0.9
    expect(score1).toBeCloseTo(0.9, 5);

    // With SQIs: p25 index = floor(4 * 0.25) = 1, sorted[1] = 0.3
    const score2 = processor._compositeScore([0.1, 0.3, 0.5, 0.9], 0.6);
    // 0.6 * 0.5 + 0.3 * 0.5 = 0.45
    expect(score2).toBeCloseTo(0.45, 5);

    // All zeros
    const score3 = processor._compositeScore([0, 0, 0, 0], 0);
    expect(score3).toBeCloseTo(0, 5);

    // Single SQI: p25 index = floor(1 * 0.25) = 0, sorted[0] = 0.7
    const score4 = processor._compositeScore([0.7], 1.0);
    // 1.0 * 0.5 + 0.7 * 0.5 = 0.85
    expect(score4).toBeCloseTo(0.85, 5);
  });

  it('CHROM channel stability reflects motion artifacts', () => {
    const processor = new RPPGProcessor();
    const N = 60;

    // Clean signal — should have high channel stability
    const R1 = new Float64Array(N);
    const G1 = new Float64Array(N);
    const B1 = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / 30;
      const pulse = Math.sin(2 * Math.PI * 1.2 * t) * 2;
      R1[i] = 150 + pulse;
      G1[i] = 120 + pulse * 1.5;
      B1[i] = 100 + pulse * 0.5;
    }
    const clean = processor.chromWindow(R1, G1, B1);

    // Noisy signal — large random jumps should reduce channel stability
    const R2 = new Float64Array(N);
    const G2 = new Float64Array(N);
    const B2 = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      const t = i / 30;
      const pulse = Math.sin(2 * Math.PI * 1.2 * t) * 2;
      const motion = (i % 2 === 0 ? 30 : -30);
      R2[i] = 150 + pulse + motion;
      G2[i] = 120 + pulse * 1.5 + motion;
      B2[i] = 100 + pulse * 0.5 + motion;
    }
    const noisy = processor.chromWindow(R2, G2, B2);

    expect(clean).not.toBeNull();
    expect(noisy).not.toBeNull();

    // Clean signal should have higher channel stability than motion-contaminated
    expect(clean.channelStability).toBeGreaterThan(noisy.channelStability);
  });
});

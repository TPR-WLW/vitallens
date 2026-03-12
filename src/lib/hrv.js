/**
 * HRV (Heart Rate Variability) analysis module for MiruCare.
 *
 * Extracts Inter-Beat Intervals (IBI) from rPPG pulse signal,
 * applies cubic spline interpolation for improved timing precision,
 * and computes time-domain HRV metrics: SDNN, RMSSD, pNN50.
 *
 * Reference: de Haan & Jeanne (2013) — rPPG HRV feasibility.
 * Upsampling from ~30fps to 256Hz improves IBI timing from ~33ms to ~4ms uncertainty.
 */

const TARGET_SAMPLE_RATE = 256; // Virtual sample rate after cubic spline interpolation
const MIN_IBI_MS = 300;  // ~200 BPM max
const MAX_IBI_MS = 1500; // ~40 BPM min
const IBI_JUMP_THRESHOLD = 0.3; // 30% change = artifact

/**
 * Cubic spline interpolation.
 * Takes irregularly or regularly sampled data and resamples to target rate.
 *
 * @param {number[]} x - Input sample positions (e.g., timestamps in seconds)
 * @param {number[]} y - Input sample values
 * @param {number[]} xNew - Desired output sample positions
 * @returns {Float64Array} Interpolated values at xNew positions
 */
export function cubicSplineInterpolate(x, y, xNew) {
  const n = x.length;
  if (n < 4) {
    // Fallback to linear interpolation for very short signals
    return linearInterpolate(x, y, xNew);
  }

  // Compute natural cubic spline coefficients
  const h = new Float64Array(n - 1);
  const alpha = new Float64Array(n - 1);

  for (let i = 0; i < n - 1; i++) {
    h[i] = x[i + 1] - x[i];
    if (h[i] <= 0) h[i] = 1e-10; // Guard against zero/negative intervals
  }

  for (let i = 1; i < n - 1; i++) {
    alpha[i] = (3 / h[i]) * (y[i + 1] - y[i]) - (3 / h[i - 1]) * (y[i] - y[i - 1]);
  }

  // Tridiagonal system solve
  const l = new Float64Array(n);
  const mu = new Float64Array(n);
  const z = new Float64Array(n);
  const c = new Float64Array(n);
  const b = new Float64Array(n - 1);
  const d = new Float64Array(n - 1);

  l[0] = 1;

  for (let i = 1; i < n - 1; i++) {
    l[i] = 2 * (x[i + 1] - x[i - 1]) - h[i - 1] * mu[i - 1];
    if (Math.abs(l[i]) < 1e-12) l[i] = 1e-12;
    mu[i] = h[i] / l[i];
    z[i] = (alpha[i] - h[i - 1] * z[i - 1]) / l[i];
  }

  l[n - 1] = 1;

  for (let j = n - 2; j >= 0; j--) {
    c[j] = z[j] - mu[j] * c[j + 1];
    b[j] = (y[j + 1] - y[j]) / h[j] - h[j] * (c[j + 1] + 2 * c[j]) / 3;
    d[j] = (c[j + 1] - c[j]) / (3 * h[j]);
  }

  // Evaluate spline at new positions
  const result = new Float64Array(xNew.length);
  let segment = 0;

  for (let i = 0; i < xNew.length; i++) {
    const xi = xNew[i];

    // Find correct segment (advance forward)
    while (segment < n - 2 && xi > x[segment + 1]) {
      segment++;
    }
    // Clamp to valid range
    if (segment >= n - 1) segment = n - 2;

    const dx = xi - x[segment];
    result[i] = y[segment] + b[segment] * dx + c[segment] * dx * dx + d[segment] * dx * dx * dx;
  }

  return result;
}

/**
 * Linear interpolation fallback.
 */
function linearInterpolate(x, y, xNew) {
  const result = new Float64Array(xNew.length);
  let j = 0;

  for (let i = 0; i < xNew.length; i++) {
    while (j < x.length - 2 && xNew[i] > x[j + 1]) j++;
    const t = x[j + 1] - x[j];
    if (t <= 0) {
      result[i] = y[j];
    } else {
      const frac = (xNew[i] - x[j]) / t;
      result[i] = y[j] + frac * (y[j + 1] - y[j]);
    }
  }

  return result;
}

/**
 * Detect peaks in the upsampled pulse signal using adaptive threshold.
 *
 * @param {Float64Array} signal - Upsampled pulse signal
 * @param {number} sampleRate - Sample rate (256 Hz after interpolation)
 * @returns {number[]} Array of peak indices
 */
export function detectPeaks(signal, sampleRate) {
  const N = signal.length;
  if (N < sampleRate) return []; // Need at least 1 second

  // Minimum distance between peaks: ~300ms (200 BPM max)
  const minDistance = Math.floor(sampleRate * 0.3);

  // Compute adaptive threshold using moving average
  const windowSize = Math.floor(sampleRate * 1.5); // 1.5 second window
  const halfWin = Math.floor(windowSize / 2);

  // Find local maxima above adaptive threshold
  const peaks = [];

  for (let i = minDistance; i < N - minDistance; i++) {
    // Check if local maximum
    let isMax = true;
    const checkRange = Math.min(Math.floor(sampleRate * 0.05), 12); // ~50ms neighborhood
    for (let j = -checkRange; j <= checkRange; j++) {
      if (j !== 0 && signal[i + j] >= signal[i]) {
        isMax = false;
        break;
      }
    }

    if (!isMax) continue;

    // Compute local mean for adaptive threshold
    const start = Math.max(0, i - halfWin);
    const end = Math.min(N, i + halfWin);
    let sum = 0;
    for (let j = start; j < end; j++) sum += signal[j];
    const localMean = sum / (end - start);

    // Compute local max amplitude for relative threshold
    let localMax = -Infinity;
    for (let j = start; j < end; j++) {
      if (signal[j] > localMax) localMax = signal[j];
    }

    // Peak must be above mean + 30% of (max - mean)
    const threshold = localMean + 0.3 * (localMax - localMean);
    if (signal[i] < threshold) continue;

    // Enforce minimum distance from last peak
    if (peaks.length > 0 && (i - peaks[peaks.length - 1]) < minDistance) {
      // Keep the higher peak
      if (signal[i] > signal[peaks[peaks.length - 1]]) {
        peaks[peaks.length - 1] = i;
      }
      continue;
    }

    peaks.push(i);
  }

  return peaks;
}

/**
 * Extract Inter-Beat Intervals from peak indices.
 * Applies artifact rejection for physiologically implausible intervals.
 *
 * @param {number[]} peakIndices - Array of peak sample indices
 * @param {number} sampleRate - Sample rate (256 Hz)
 * @returns {{ ibis: number[], validCount: number, artifactCount: number }}
 */
export function extractIBI(peakIndices, sampleRate) {
  if (peakIndices.length < 2) return { ibis: [], validCount: 0, artifactCount: 0 };

  const rawIBIs = [];
  for (let i = 1; i < peakIndices.length; i++) {
    const ibiMs = ((peakIndices[i] - peakIndices[i - 1]) / sampleRate) * 1000;
    rawIBIs.push(ibiMs);
  }

  // Artifact rejection: remove physiologically impossible and sudden jumps
  const validIBIs = [];
  let artifactCount = 0;

  for (let i = 0; i < rawIBIs.length; i++) {
    const ibi = rawIBIs[i];

    // Basic range check
    if (ibi < MIN_IBI_MS || ibi > MAX_IBI_MS) {
      artifactCount++;
      continue;
    }

    // Jump check: compare with neighbors
    if (validIBIs.length > 0) {
      const prevIBI = validIBIs[validIBIs.length - 1];
      const change = Math.abs(ibi - prevIBI) / prevIBI;
      if (change > IBI_JUMP_THRESHOLD) {
        // Check if next IBI returns to normal (ectopic beat pattern)
        if (i + 1 < rawIBIs.length) {
          const nextIBI = rawIBIs[i + 1];
          const nextChange = Math.abs(nextIBI - prevIBI) / prevIBI;
          if (nextChange < IBI_JUMP_THRESHOLD) {
            // Current IBI is likely artifact, skip
            artifactCount++;
            continue;
          }
        }
        // Gradual change — accept with caution if not extreme
        if (change > 0.5) {
          artifactCount++;
          continue;
        }
      }
    }

    validIBIs.push(ibi);
  }

  return {
    ibis: validIBIs,
    validCount: validIBIs.length,
    artifactCount,
  };
}

/**
 * Compute time-domain HRV metrics from IBI array.
 *
 * @param {number[]} ibis - Array of inter-beat intervals in milliseconds
 * @returns {{ sdnn: number, rmssd: number, pnn50: number, meanIBI: number, meanHR: number } | null}
 */
export function computeHRVMetrics(ibis) {
  const N = ibis.length;
  if (N < 5) return null; // Need minimum 5 valid intervals

  // Mean IBI
  let sum = 0;
  for (let i = 0; i < N; i++) sum += ibis[i];
  const meanIBI = sum / N;

  // Mean HR from mean IBI
  const meanHR = 60000 / meanIBI;

  // SDNN: Standard deviation of NN intervals
  let variance = 0;
  for (let i = 0; i < N; i++) {
    const diff = ibis[i] - meanIBI;
    variance += diff * diff;
  }
  const sdnn = Math.sqrt(variance / (N - 1));

  // RMSSD: Root mean square of successive differences
  let sumSqDiff = 0;
  let nn50Count = 0;

  for (let i = 1; i < N; i++) {
    const diff = ibis[i] - ibis[i - 1];
    sumSqDiff += diff * diff;

    // pNN50: percentage of successive differences > 50ms
    if (Math.abs(diff) > 50) {
      nn50Count++;
    }
  }

  const rmssd = Math.sqrt(sumSqDiff / (N - 1));
  const pnn50 = ((nn50Count / (N - 1)) * 100);

  return {
    sdnn: Math.round(sdnn * 10) / 10,
    rmssd: Math.round(rmssd * 10) / 10,
    pnn50: Math.round(pnn50 * 10) / 10,
    meanIBI: Math.round(meanIBI),
    meanHR: Math.round(meanHR),
  };
}

/**
 * Compute stress level from HRV metrics.
 * Lower HRV (low RMSSD, low SDNN) = higher stress.
 *
 * Calibrated for ultra-short rPPG recordings (1-3 min) where HRV values
 * trend lower than gold-standard 5-min ECG baselines.
 *
 * rPPG ultra-short normative adjustments:
 * - RMSSD typical range: 15-60ms (vs 20-80ms for 5-min ECG)
 * - SDNN typical range: 15-55ms (vs 30-100ms for 5-min ECG)
 *
 * @param {{ sdnn: number, rmssd: number, pnn50: number }} metrics
 * @returns {{ level: string, score: number, label: string, color: string }}
 */
export function assessStressLevel(metrics) {
  if (!metrics) return { level: 'unknown', score: 0, label: '計測不可', color: '#9ca3af' };

  const { rmssd, sdnn } = metrics;

  // Composite score: weighted combination (RMSSD is more reliable for ultra-short)
  // Higher HRV → lower stress. Normalize to 0-100 where 100 = max stress
  // Widened range to reduce false positives from rPPG's inherent lower HRV readings
  const rmssdScore = Math.max(0, Math.min(100, 100 - (rmssd - 5) * (100 / 55)));  // 5ms=100stress, 60ms=0stress
  const sdnnScore = Math.max(0, Math.min(100, 100 - (sdnn - 5) * (100 / 50)));    // 5ms=100stress, 55ms=0stress

  // RMSSD weighted 70%, SDNN 30% (RMSSD more reliable in ultra-short recordings)
  const stressScore = Math.round(rmssdScore * 0.7 + sdnnScore * 0.3);

  if (stressScore <= 30) {
    return { level: 'low', score: stressScore, label: 'リラックス', color: '#22c55e' };
  }
  if (stressScore <= 55) {
    return { level: 'moderate', score: stressScore, label: '通常', color: '#4f8cff' };
  }
  if (stressScore <= 80) {
    return { level: 'elevated', score: stressScore, label: 'やや高め', color: '#f59e0b' };
  }
  return { level: 'high', score: stressScore, label: '高い', color: '#ef4444' };
}

/**
 * Full HRV analysis pipeline.
 * Takes raw rPPG pulse signal and timestamps, returns HRV metrics.
 *
 * @param {Float64Array} signal - Filtered rPPG pulse signal
 * @param {number[]} timestamps - Frame timestamps in milliseconds
 * @param {number} fps - Estimated frames per second
 * @returns {{ metrics: object|null, stress: object, quality: object }}
 */
export function analyzeHRV(signal, timestamps, fps) {
  const N = signal.length;
  if (N < fps * 30) { // Need at least 30 seconds
    return {
      metrics: null,
      stress: { level: 'unknown', score: 0, label: 'データ不足', color: '#9ca3af' },
      quality: { grade: 'D', score: 0, message: '計測時間が短すぎます' },
    };
  }

  // Step 1: Create time axis in seconds
  const tStart = timestamps[0];
  const xOriginal = new Array(N);
  for (let i = 0; i < N; i++) {
    xOriginal[i] = (timestamps[i] - tStart) / 1000;
  }

  const duration = xOriginal[N - 1];

  // Step 2: Cubic spline interpolation to 256 Hz
  const numSamples = Math.floor(duration * TARGET_SAMPLE_RATE);
  const xUpsampled = new Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    xUpsampled[i] = (i / TARGET_SAMPLE_RATE);
  }

  const yOriginal = Array.from(signal);
  const upsampled = cubicSplineInterpolate(xOriginal, yOriginal, xUpsampled);

  // Step 3: Peak detection on upsampled signal
  const peaks = detectPeaks(upsampled, TARGET_SAMPLE_RATE);

  // Step 4: Extract IBIs with artifact rejection
  const { ibis, validCount, artifactCount } = extractIBI(peaks, TARGET_SAMPLE_RATE);

  // Step 5: Compute HRV metrics
  const metrics = computeHRVMetrics(ibis);

  // Step 6: Assess stress level
  const stress = assessStressLevel(metrics);

  // Step 7: Quality assessment
  const totalBeats = peaks.length;
  const artifactRate = totalBeats > 0 ? artifactCount / totalBeats : 1;
  const expectedBeats = duration / 60 * (metrics?.meanHR || 70); // Expected beats based on HR
  const beatDetectionRate = totalBeats / Math.max(expectedBeats, 1);

  let qualityScore = 0;
  qualityScore += Math.min(1, beatDetectionRate) * 0.4;        // Beat detection coverage
  qualityScore += Math.max(0, 1 - artifactRate * 2) * 0.3;     // Low artifact rate
  qualityScore += Math.min(1, validCount / 20) * 0.3;           // Sufficient valid IBIs

  let grade, message;
  if (qualityScore >= 0.7) {
    grade = 'A'; message = '信号品質：良好';
  } else if (qualityScore >= 0.5) {
    grade = 'B'; message = '信号品質：普通';
  } else if (qualityScore >= 0.3) {
    grade = 'C'; message = '信号品質：やや不安定';
  } else {
    grade = 'D'; message = '信号品質：不安定 — 再計測をお勧めします';
  }

  return {
    metrics,
    stress,
    quality: { grade, score: Math.round(qualityScore * 100) / 100, message },
    debug: { totalBeats, validIBIs: validCount, artifactCount, artifactRate: Math.round(artifactRate * 100) },
  };
}

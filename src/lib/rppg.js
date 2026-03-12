/**
 * rPPG heart rate extraction using POS (Plane-Orthogonal-to-Skin) algorithm.
 *
 * Reference: Wang, W., den Brinker, A. C., Stuijk, S., & de Haan, G. (2017).
 * "Algorithmic Principles of Remote PPG."
 * IEEE Transactions on Biomedical Engineering, 64(7), 1479-1491.
 *
 * The POS algorithm projects normalized RGB signals onto a plane orthogonal
 * to the skin tone direction, then combines components using an adaptive
 * alpha tuning based on signal statistics.
 */

import { bandpassFilter, detrend, hammingWindow, findDominantFrequency, std } from './signal.js';

// Buffer configuration
const WINDOW_SIZE_SECONDS = 30;
const MIN_SAMPLES_FOR_HR = 64; // Minimum samples before attempting HR calculation
const OVERLAP_SEGMENT_SECONDS = 1.6; // POS uses overlapping temporal windows

/**
 * rPPG Processor — accumulates RGB samples and computes heart rate.
 */
export class RPPGProcessor {
  constructor() {
    this.reset();
  }

  reset() {
    this.rBuffer = [];
    this.gBuffer = [];
    this.bBuffer = [];
    this.timestamps = [];
    this.lastHR = null;
    this.lastConfidence = 0;
    this.hrHistory = []; // Sliding window of recent HR estimates
  }

  /**
   * Add a new RGB sample (mean values from face ROI).
   * @param {number} r - Mean red channel value (0-255)
   * @param {number} g - Mean green channel value (0-255)
   * @param {number} b - Mean blue channel value (0-255)
   * @param {number} timestamp - Timestamp in ms
   */
  addSample(r, g, b, timestamp) {
    this.rBuffer.push(r);
    this.gBuffer.push(g);
    this.bBuffer.push(b);
    this.timestamps.push(timestamp);

    // Estimate frame rate from timestamps
    const fps = this.estimateFPS();
    const maxSamples = Math.ceil(WINDOW_SIZE_SECONDS * (fps || 30));

    // Keep buffer bounded
    if (this.rBuffer.length > maxSamples) {
      const excess = this.rBuffer.length - maxSamples;
      this.rBuffer.splice(0, excess);
      this.gBuffer.splice(0, excess);
      this.bBuffer.splice(0, excess);
      this.timestamps.splice(0, excess);
    }
  }

  /**
   * Estimate actual FPS from timestamp buffer.
   */
  estimateFPS() {
    const N = this.timestamps.length;
    if (N < 10) return 30; // Default assumption

    const duration = (this.timestamps[N - 1] - this.timestamps[0]) / 1000;
    if (duration < 0.1) return 30;

    return (N - 1) / duration;
  }

  /**
   * Get the number of samples collected.
   */
  get sampleCount() {
    return this.rBuffer.length;
  }

  /**
   * Check if we have enough data for a heart rate estimate.
   */
  get isReady() {
    return this.rBuffer.length >= MIN_SAMPLES_FOR_HR;
  }

  /**
   * Compute heart rate using POS algorithm.
   * @returns {{ hr: number, confidence: number, signal: Float64Array } | null}
   */
  computeHeartRate() {
    const N = this.rBuffer.length;
    if (N < MIN_SAMPLES_FOR_HR) return null;

    const fps = this.estimateFPS();

    // Step 1: Convert buffers to Float64Arrays
    const R = new Float64Array(this.rBuffer);
    const G = new Float64Array(this.gBuffer);
    const B = new Float64Array(this.bBuffer);

    // Step 2: Apply POS algorithm with temporal windowing
    const pulseSignal = this.posAlgorithm(R, G, B, fps);
    if (!pulseSignal) return null;

    // Step 3: Detrend the pulse signal
    const detrended = detrend(pulseSignal);

    // Step 4: Bandpass filter (0.7 - 3.5 Hz = 42 - 210 BPM)
    const filtered = bandpassFilter(detrended, fps, 0.7, 3.5);

    // Step 5: Apply window function for cleaner FFT
    const windowed = hammingWindow(filtered);

    // Step 6: Find dominant frequency via FFT
    const result = findDominantFrequency(windowed, fps, 0.7, 3.5);

    // Step 7: Temporal smoothing — reject outliers, smooth HR
    const hr = this.smoothHR(result.bpm, result.confidence);

    return {
      hr: Math.round(hr),
      confidence: result.confidence,
      signal: filtered,
    };
  }

  /**
   * POS (Plane Orthogonal to Skin) algorithm.
   * Processes RGB signals in overlapping temporal windows.
   *
   * @param {Float64Array} R - Red channel time series
   * @param {Float64Array} G - Green channel time series
   * @param {Float64Array} B - Blue channel time series
   * @param {number} fps - Frames per second
   * @returns {Float64Array|null} Extracted pulse signal
   */
  posAlgorithm(R, G, B, fps) {
    const N = R.length;
    const windowLen = Math.round(OVERLAP_SEGMENT_SECONDS * fps);

    if (windowLen < 4 || N < windowLen) {
      // Fallback: process entire buffer as one window
      return this.posWindow(R, G, B);
    }

    // Process overlapping windows and accumulate
    const H = new Float64Array(N);

    for (let start = 0; start <= N - windowLen; start++) {
      const rWin = R.slice(start, start + windowLen);
      const gWin = G.slice(start, start + windowLen);
      const bWin = B.slice(start, start + windowLen);

      const hWin = this.posWindow(rWin, gWin, bWin);
      if (!hWin) continue;

      // Overlap-add
      for (let i = 0; i < windowLen && start + i < N; i++) {
        H[start + i] += hWin[i];
      }
    }

    return H;
  }

  /**
   * POS algorithm for a single temporal window.
   *
   * Core math:
   *   Cn = [R/mean(R); G/mean(G); B/mean(B)]  (temporal normalization)
   *   S = P * Cn  where P = [[0, 1, -1], [-2, 1, 1]]  (projection matrix)
   *   h = S[0] + (std(S[0]) / std(S[1])) * S[1]  (alpha tuning)
   */
  posWindow(R, G, B) {
    const N = R.length;
    if (N < 4) return null;

    // Compute means
    let meanR = 0, meanG = 0, meanB = 0;
    for (let i = 0; i < N; i++) {
      meanR += R[i];
      meanG += G[i];
      meanB += B[i];
    }
    meanR /= N;
    meanG /= N;
    meanB /= N;

    // Avoid division by zero
    if (meanR < 1 || meanG < 1 || meanB < 1) return null;

    // Temporal normalization: Cn = C / mean(C)
    const Rn = new Float64Array(N);
    const Gn = new Float64Array(N);
    const Bn = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      Rn[i] = R[i] / meanR;
      Gn[i] = G[i] / meanG;
      Bn[i] = B[i] / meanB;
    }

    // Projection: S = P * Cn
    // P = [[0, 1, -1], [-2, 1, 1]]
    // S1 = Gn - Bn
    // S2 = -2*Rn + Gn + Bn
    const S1 = new Float64Array(N);
    const S2 = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      S1[i] = Gn[i] - Bn[i];
      S2[i] = -2 * Rn[i] + Gn[i] + Bn[i];
    }

    // Alpha tuning: h = S1 + (std(S1)/std(S2)) * S2
    const stdS1 = std(S1);
    const stdS2 = std(S2);

    const alpha = stdS2 > 1e-10 ? stdS1 / stdS2 : 0;

    const h = new Float64Array(N);
    for (let i = 0; i < N; i++) {
      h[i] = S1[i] + alpha * S2[i];
    }

    return h;
  }

  /**
   * Smooth HR estimates over time to reduce jitter.
   * Rejects physiologically implausible jumps.
   */
  smoothHR(rawBPM, confidence) {
    // Reject clearly invalid readings
    if (rawBPM < 40 || rawBPM > 220 || confidence < 0.1) {
      return this.lastHR || 0;
    }

    // If we have history, reject large jumps unless confidence is high
    if (this.lastHR && Math.abs(rawBPM - this.lastHR) > 30 && confidence < 0.4) {
      return this.lastHR;
    }

    this.hrHistory.push(rawBPM);
    if (this.hrHistory.length > 5) {
      this.hrHistory.shift();
    }

    // Median of recent estimates (robust to outliers)
    const sorted = [...this.hrHistory].sort((a, b) => a - b);
    const median = sorted[Math.floor(sorted.length / 2)];

    // Exponential moving average with median
    if (this.lastHR) {
      const smoothingFactor = Math.min(0.3 + confidence * 0.4, 0.7);
      this.lastHR = this.lastHR * (1 - smoothingFactor) + median * smoothingFactor;
    } else {
      this.lastHR = median;
    }

    this.lastConfidence = confidence;
    return this.lastHR;
  }
}

/**
 * Signal processing utilities for rPPG.
 * Implements FFT, bandpass filtering, and helper functions.
 * No external dependencies — pure JavaScript.
 */

/**
 * Compute FFT using Cooley-Tukey radix-2 DIT algorithm.
 * Input length must be a power of 2.
 * Returns array of { re, im } complex numbers.
 */
export function fft(signal) {
  const N = signal.length;
  if (N === 1) return [{ re: signal[0], im: 0 }];

  if (N & (N - 1)) {
    // Not a power of 2 — pad with zeros
    const nextPow2 = 1 << Math.ceil(Math.log2(N));
    const padded = new Float64Array(nextPow2);
    padded.set(signal);
    return fft(padded);
  }

  // Split into even and odd
  const even = new Float64Array(N / 2);
  const odd = new Float64Array(N / 2);
  for (let i = 0; i < N / 2; i++) {
    even[i] = signal[2 * i];
    odd[i] = signal[2 * i + 1];
  }

  const fftEven = fft(even);
  const fftOdd = fft(odd);

  const result = new Array(N);
  for (let k = 0; k < N / 2; k++) {
    const angle = (-2 * Math.PI * k) / N;
    const twiddleRe = Math.cos(angle);
    const twiddleIm = Math.sin(angle);

    const oddRe = twiddleRe * fftOdd[k].re - twiddleIm * fftOdd[k].im;
    const oddIm = twiddleRe * fftOdd[k].im + twiddleIm * fftOdd[k].re;

    result[k] = {
      re: fftEven[k].re + oddRe,
      im: fftEven[k].im + oddIm,
    };
    result[k + N / 2] = {
      re: fftEven[k].re - oddRe,
      im: fftEven[k].im - oddIm,
    };
  }

  return result;
}

/**
 * Compute magnitude spectrum from FFT result.
 */
export function magnitude(fftResult) {
  return fftResult.map((c) => Math.sqrt(c.re * c.re + c.im * c.im));
}

/**
 * Find dominant frequency in a signal within a frequency band.
 * @param {Float64Array|number[]} signal - Time-domain signal
 * @param {number} sampleRate - Samples per second (fps)
 * @param {number} minFreq - Minimum frequency in Hz
 * @param {number} maxFreq - Maximum frequency in Hz
 * @returns {{ frequency: number, bpm: number, confidence: number }}
 */
export function findDominantFrequency(signal, sampleRate, minFreq = 0.7, maxFreq = 4.0) {
  const N = signal.length;
  if (N < 8) return { frequency: 0, bpm: 0, confidence: 0 };

  // Zero-pad to next power of 2 for better frequency resolution
  const fftSize = 1 << Math.ceil(Math.log2(N));
  const padded = new Float64Array(fftSize);
  padded.set(signal);

  const spectrum = magnitude(fft(padded));
  const freqResolution = sampleRate / fftSize;

  // Find indices corresponding to our frequency band
  const minBin = Math.ceil(minFreq / freqResolution);
  const maxBin = Math.floor(maxFreq / freqResolution);

  let maxMag = 0;
  let maxBinIdx = minBin;
  let totalMag = 0;

  for (let i = minBin; i <= maxBin && i < spectrum.length / 2; i++) {
    totalMag += spectrum[i];
    if (spectrum[i] > maxMag) {
      maxMag = spectrum[i];
      maxBinIdx = i;
    }
  }

  // Parabolic interpolation for sub-bin accuracy
  let peakFreq = maxBinIdx * freqResolution;
  if (maxBinIdx > minBin && maxBinIdx < maxBin) {
    const alpha = spectrum[maxBinIdx - 1];
    const beta = spectrum[maxBinIdx];
    const gamma = spectrum[maxBinIdx + 1];
    const denom = alpha - 2 * beta + gamma;
    if (Math.abs(denom) > 1e-10) {
      const p = 0.5 * (alpha - gamma) / denom;
      peakFreq = (maxBinIdx + p) * freqResolution;
    }
  }

  // Confidence: ratio of peak energy to total band energy
  const numBins = maxBin - minBin + 1;
  const avgMag = totalMag / numBins;
  const confidence = avgMag > 0 ? Math.min(maxMag / (avgMag * 3), 1.0) : 0;

  return {
    frequency: peakFreq,
    bpm: peakFreq * 60,
    confidence,
  };
}

/**
 * Apply a simple moving average filter (low-pass).
 */
export function movingAverage(signal, windowSize) {
  const result = new Float64Array(signal.length);
  const half = Math.floor(windowSize / 2);

  for (let i = 0; i < signal.length; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - half); j <= Math.min(signal.length - 1, i + half); j++) {
      sum += signal[j];
      count++;
    }
    result[i] = sum / count;
  }

  return result;
}

/**
 * Detrend a signal by removing linear trend.
 */
export function detrend(signal) {
  const N = signal.length;
  if (N < 2) return signal;

  // Compute linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (let i = 0; i < N; i++) {
    sumX += i;
    sumY += signal[i];
    sumXY += i * signal[i];
    sumX2 += i * i;
  }

  const denom = N * sumX2 - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return signal;

  const slope = (N * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / N;

  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    result[i] = signal[i] - (slope * i + intercept);
  }

  return result;
}

/**
 * Apply Hamming window to a signal.
 */
export function hammingWindow(signal) {
  const N = signal.length;
  const result = new Float64Array(N);
  for (let i = 0; i < N; i++) {
    const w = 0.54 - 0.46 * Math.cos((2 * Math.PI * i) / (N - 1));
    result[i] = signal[i] * w;
  }
  return result;
}

/**
 * Butterworth-style bandpass filter using cascaded biquad sections.
 * Simple 2nd-order IIR bandpass filter.
 * @param {Float64Array|number[]} signal
 * @param {number} sampleRate
 * @param {number} lowCut - Low cutoff frequency (Hz)
 * @param {number} highCut - High cutoff frequency (Hz)
 * @returns {Float64Array}
 */
export function bandpassFilter(signal, sampleRate, lowCut = 0.7, highCut = 4.0) {
  // Design 2nd order bandpass biquad filter
  const f0 = Math.sqrt(lowCut * highCut);
  const bw = highCut - lowCut;
  const w0 = (2 * Math.PI * f0) / sampleRate;
  const Q = f0 / bw;
  const alpha = Math.sin(w0) / (2 * Q);

  // Bandpass filter coefficients (constant-0dB-peak-gain)
  const b0 = alpha;
  const b1 = 0;
  const b2 = -alpha;
  const a0 = 1 + alpha;
  const a1 = -2 * Math.cos(w0);
  const a2 = 1 - alpha;

  // Normalize
  const nb0 = b0 / a0;
  const nb1 = b1 / a0;
  const nb2 = b2 / a0;
  const na1 = a1 / a0;
  const na2 = a2 / a0;

  // Apply filter forward
  const N = signal.length;
  const result = new Float64Array(N);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;

  for (let i = 0; i < N; i++) {
    const x = signal[i];
    const y = nb0 * x + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    result[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }

  // Apply filter backward (zero-phase filtering)
  const result2 = new Float64Array(N);
  x1 = 0; x2 = 0; y1 = 0; y2 = 0;

  for (let i = N - 1; i >= 0; i--) {
    const x = result[i];
    const y = nb0 * x + nb1 * x1 + nb2 * x2 - na1 * y1 - na2 * y2;
    result2[i] = y;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
  }

  return result2;
}

/**
 * Compute standard deviation of a signal.
 */
export function std(signal) {
  const N = signal.length;
  if (N < 2) return 0;

  let sum = 0;
  for (let i = 0; i < N; i++) sum += signal[i];
  const mean = sum / N;

  let variance = 0;
  for (let i = 0; i < N; i++) {
    const diff = signal[i] - mean;
    variance += diff * diff;
  }

  return Math.sqrt(variance / (N - 1));
}

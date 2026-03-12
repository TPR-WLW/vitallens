/**
 * Facial Emotion Recognition — Core Module
 *
 * Uses MediaPipe FaceLandmarker (Vision Tasks API) to detect 478 face landmarks,
 * computes Action Unit intensities from geometric distances,
 * and classifies emotions via rule-based AU combination mapping.
 *
 * All processing is on-device. No face data leaves the browser.
 *
 * Architecture: CTO ADR cycle17-facial-emotion-poc-architecture.md
 */

// ---------------------------------------------------------------------------
// CDN paths for MediaPipe Tasks Vision WASM + model
// ---------------------------------------------------------------------------
const MEDIAPIPE_VERSION = '0.10.22';
const VISION_WASM_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm`;
const MODEL_CDN = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MEDIAPIPE_VERSION}/wasm/face_landmarker.task`;

// ---------------------------------------------------------------------------
// Landmark Indices (MediaPipe 478-point mesh)
// ---------------------------------------------------------------------------
const LM = {
  MOUTH_TOP: 0,
  NOSE_TIP: 1,
  NOSE_BRIDGE: 6,
  UPPER_LIP_TOP: 13,
  LOWER_LIP_BOTTOM: 14,
  MOUTH_BOTTOM: 17,
  LEFT_EYE_OUTER: 33,
  LEFT_BROW_OUTER: 70,
  LEFT_BROW_MID: 105,
  LEFT_BROW_INNER: 107,
  LEFT_EYE_INNER: 133,
  LEFT_EYE_BOTTOM: 145,
  CHIN: 152,
  LEFT_EYE_TOP: 159,
  JAW_LEFT: 172,
  LEFT_CHEEK: 234,
  RIGHT_EYE_OUTER: 263,
  MOUTH_RIGHT: 291,
  RIGHT_BROW_OUTER: 300,
  RIGHT_BROW_MID: 334,
  RIGHT_BROW_INNER: 336,
  RIGHT_EYE_INNER: 362,
  RIGHT_EYE_BOTTOM: 374,
  RIGHT_EYE_TOP: 386,
  JAW_RIGHT: 397,
  RIGHT_CHEEK: 454,
  MOUTH_LEFT: 61,
};

// ---------------------------------------------------------------------------
// AU Thresholds — tunable config
// ---------------------------------------------------------------------------
const AU_THRESHOLDS = {
  AU1: 0.12,
  AU2: 0.10,
  AU4: 0.08,
  AU6: 0.06,
  AU7: 0.05,
  AU12: 0.10,
  AU15: 0.04,
  AU20: 0.08,
  AU25: 0.06,
  AU26: 0.15,
};

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------
function dist(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = (a.z || 0) - (b.z || 0);
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

// ---------------------------------------------------------------------------
// AU Computation (pure functions, no state)
// ---------------------------------------------------------------------------

/**
 * Compute all 10 AU intensities from a single frame's landmarks.
 * @param {Array} lm - 478 landmark objects with {x, y, z}
 * @param {Object|null} baseline - neutral baseline signals (null = no baseline)
 * @returns {Object} AU intensities keyed by name, each 0.0 to 1.0
 */
function computeAUs(lm, baseline) {
  const iod = dist(lm[LM.LEFT_EYE_INNER], lm[LM.RIGHT_EYE_INNER]);
  if (iod < 1e-6) return null; // degenerate

  const normDist = (a, b) => dist(lm[a], lm[b]) / iod;
  const bl = baseline || {};
  const T = AU_THRESHOLDS;

  // AU1 — Inner Brow Raise
  const au1Signal = normDist(LM.LEFT_BROW_INNER, LM.LEFT_EYE_INNER)
                  + normDist(LM.RIGHT_BROW_INNER, LM.RIGHT_EYE_INNER);
  const AU1 = bl.AU1 != null
    ? clamp01((au1Signal - bl.AU1) / T.AU1)
    : 0;

  // AU2 — Outer Brow Raise
  const au2Signal = normDist(LM.LEFT_BROW_OUTER, LM.LEFT_EYE_OUTER)
                  + normDist(LM.RIGHT_BROW_OUTER, LM.RIGHT_EYE_OUTER);
  const AU2 = bl.AU2 != null
    ? clamp01((au2Signal - bl.AU2) / T.AU2)
    : 0;

  // AU4 — Brow Lowerer (inverted: distance DECREASES)
  const au4Signal = normDist(LM.LEFT_BROW_INNER, LM.RIGHT_BROW_INNER);
  const AU4 = bl.AU4 != null
    ? clamp01((bl.AU4 - au4Signal) / T.AU4)
    : 0;

  // AU6 — Cheek Raiser (distance DECREASES)
  const au6Signal = normDist(LM.LEFT_CHEEK, LM.LEFT_EYE_BOTTOM)
                  + normDist(LM.RIGHT_CHEEK, LM.RIGHT_EYE_BOTTOM);
  const AU6 = bl.AU6 != null
    ? clamp01((bl.AU6 - au6Signal) / T.AU6)
    : 0;

  // AU7 — Lid Tightener (eye opening DECREASES)
  const au7Signal = normDist(LM.LEFT_EYE_TOP, LM.LEFT_EYE_BOTTOM)
                  + normDist(LM.RIGHT_EYE_TOP, LM.RIGHT_EYE_BOTTOM);
  const AU7 = bl.AU7 != null
    ? clamp01((bl.AU7 - au7Signal) / T.AU7)
    : 0;

  // AU12 — Lip Corner Puller (mouth width INCREASES)
  const au12Signal = normDist(LM.MOUTH_LEFT, LM.MOUTH_RIGHT);
  const AU12 = bl.AU12 != null
    ? clamp01((au12Signal - bl.AU12) / T.AU12)
    : 0;

  // AU15 — Lip Corner Depressor (corners drop below upper lip)
  const avgCornerY = (lm[LM.MOUTH_LEFT].y + lm[LM.MOUTH_RIGHT].y) / 2;
  const au15Signal = avgCornerY - lm[LM.UPPER_LIP_TOP].y; // positive when corners below lip
  const AU15 = bl.AU15 != null
    ? clamp01((au15Signal - bl.AU15) / T.AU15)
    : 0;

  // AU20 — Lip Stretcher (width increases but NOT smiling)
  const au20Signal = normDist(LM.MOUTH_LEFT, LM.MOUTH_RIGHT);
  let AU20 = bl.AU20 != null
    ? clamp01((au20Signal - bl.AU20) / T.AU20)
    : 0;
  if (AU12 >= 0.2) AU20 = 0; // suppress if smiling

  // AU25 — Lips Part (no baseline needed)
  const au25Signal = normDist(LM.UPPER_LIP_TOP, LM.LOWER_LIP_BOTTOM);
  const AU25 = clamp01(au25Signal / T.AU25);

  // AU26 — Jaw Drop
  const au26Signal = normDist(LM.MOUTH_TOP, LM.MOUTH_BOTTOM);
  const AU26 = bl.AU26 != null
    ? clamp01((au26Signal - bl.AU26) / T.AU26)
    : 0;

  return { AU1, AU2, AU4, AU6, AU7, AU12, AU15, AU20, AU25, AU26 };
}

/**
 * Extract raw signal values for baseline calibration.
 */
function extractRawSignals(lm) {
  const iod = dist(lm[LM.LEFT_EYE_INNER], lm[LM.RIGHT_EYE_INNER]);
  if (iod < 1e-6) return null;

  const normDist = (a, b) => dist(lm[a], lm[b]) / iod;
  const avgCornerY = (lm[LM.MOUTH_LEFT].y + lm[LM.MOUTH_RIGHT].y) / 2;

  return {
    AU1: normDist(LM.LEFT_BROW_INNER, LM.LEFT_EYE_INNER)
       + normDist(LM.RIGHT_BROW_INNER, LM.RIGHT_EYE_INNER),
    AU2: normDist(LM.LEFT_BROW_OUTER, LM.LEFT_EYE_OUTER)
       + normDist(LM.RIGHT_BROW_OUTER, LM.RIGHT_EYE_OUTER),
    AU4: normDist(LM.LEFT_BROW_INNER, LM.RIGHT_BROW_INNER),
    AU6: normDist(LM.LEFT_CHEEK, LM.LEFT_EYE_BOTTOM)
       + normDist(LM.RIGHT_CHEEK, LM.RIGHT_EYE_BOTTOM),
    AU7: normDist(LM.LEFT_EYE_TOP, LM.LEFT_EYE_BOTTOM)
       + normDist(LM.RIGHT_EYE_TOP, LM.RIGHT_EYE_BOTTOM),
    AU12: normDist(LM.MOUTH_LEFT, LM.MOUTH_RIGHT),
    AU15: avgCornerY - lm[LM.UPPER_LIP_TOP].y,
    AU20: normDist(LM.MOUTH_LEFT, LM.MOUTH_RIGHT),
    AU26: normDist(LM.MOUTH_TOP, LM.MOUTH_BOTTOM),
  };
}

// ---------------------------------------------------------------------------
// Emotion Classification (rule-based, Ekman 6 + neutral)
// ---------------------------------------------------------------------------

const EMOTION_LABELS = {
  happiness: '幸福',
  sadness: '悲しみ',
  surprise: '驚き',
  fear: '恐怖',
  anger: '怒り',
  disgust: '嫌悪',
  neutral: '平常',
};

/**
 * Classify emotion from AU intensities.
 * @param {Object} aus - AU intensities
 * @returns {{ emotion: string, confidence: number, scores: Object }}
 */
function classifyEmotion(aus) {
  if (!aus) return { emotion: 'neutral', confidence: 0, scores: {} };

  const scores = {};

  // Happiness: AU6 >= 0.3 AND AU12 >= 0.4
  if (aus.AU6 >= 0.3 && aus.AU12 >= 0.4) {
    let s = (aus.AU6 + aus.AU12) / 2;
    if (aus.AU25 > 0) s += 0.1;
    scores.happiness = s;
  }

  // Sadness: AU1 >= 0.3 AND AU15 >= 0.3
  if (aus.AU1 >= 0.3 && aus.AU15 >= 0.3) {
    let s = (aus.AU1 + aus.AU15) / 2;
    if (aus.AU4 > 0) s += 0.1;
    scores.sadness = s;
  }

  // Surprise: AU1 >= 0.4 AND AU2 >= 0.4 AND AU25 >= 0.3
  if (aus.AU1 >= 0.4 && aus.AU2 >= 0.4 && aus.AU25 >= 0.3) {
    let s = (aus.AU1 + aus.AU2 + aus.AU25) / 3;
    if (aus.AU26 > 0) s += 0.15;
    scores.surprise = s;
  }

  // Fear: AU1 >= 0.3 AND AU2 >= 0.2 AND AU4 >= 0.2 AND AU20 >= 0.2
  if (aus.AU1 >= 0.3 && aus.AU2 >= 0.2 && aus.AU4 >= 0.2 && aus.AU20 >= 0.2) {
    let s = (aus.AU1 + aus.AU2 + aus.AU4 + aus.AU20) / 4;
    if (aus.AU25 > 0) s += 0.1;
    scores.fear = s;
  }

  // Anger: AU4 >= 0.4 AND AU7 >= 0.3, inhibited by AU12 >= 0.3
  if (aus.AU4 >= 0.4 && aus.AU7 >= 0.3 && aus.AU12 < 0.3) {
    let s = (aus.AU4 + aus.AU7) / 2;
    if (aus.AU25 > 0) s += 0.1;
    scores.anger = s;
  }

  // Disgust: AU4 >= 0.2 AND AU7 >= 0.2 AND AU25 >= 0.2
  if (aus.AU4 >= 0.2 && aus.AU7 >= 0.2 && aus.AU25 >= 0.2) {
    let s = (aus.AU4 + aus.AU7 + aus.AU25) / 3;
    if (aus.AU15 > 0) s += 0.1;
    scores.disgust = s;
  }

  // Pick winner
  let bestEmotion = 'neutral';
  let bestScore = 0.3; // minimum threshold to beat neutral

  for (const [emotion, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      bestEmotion = emotion;
    }
  }

  // Neutral score
  const maxEmotionScore = Object.values(scores).length > 0
    ? Math.max(...Object.values(scores))
    : 0;
  scores.neutral = 1.0 - maxEmotionScore;

  const confidence = bestEmotion === 'neutral'
    ? scores.neutral
    : bestScore;

  return { emotion: bestEmotion, confidence: Math.min(1, confidence), scores };
}

// ---------------------------------------------------------------------------
// Emotion Processor — stateful orchestrator
// ---------------------------------------------------------------------------

const CALIBRATION_FRAMES = 60; // ~2 seconds at 30fps
const SMOOTHING_WINDOW = 10;   // ~1 second worth of emotion frames at ~10fps

export class EmotionProcessor {
  constructor() {
    this._calibrationBuffer = [];
    this._baseline = null;
    this._emotionWindow = [];
    this._emotionHistory = [];
    this._currentEmotion = { emotion: 'neutral', confidence: 0, scores: {} };
    this._frameCount = 0;
  }

  /** Whether calibration is complete */
  get isCalibrated() {
    return this._baseline !== null;
  }

  /** Current smoothed emotion */
  get currentEmotion() {
    return this._currentEmotion;
  }

  /** Full emotion history for the session */
  get history() {
    return this._emotionHistory;
  }

  /** Emotion summary: percentage of each emotion over the session */
  get summary() {
    if (this._emotionHistory.length === 0) {
      return { dominant: 'neutral', distribution: { neutral: 100 } };
    }

    const counts = {};
    for (const entry of this._emotionHistory) {
      counts[entry.emotion] = (counts[entry.emotion] || 0) + 1;
    }

    const total = this._emotionHistory.length;
    const distribution = {};
    let dominant = 'neutral';
    let maxPct = 0;

    for (const [emotion, count] of Object.entries(counts)) {
      const pct = Math.round((count / total) * 100);
      distribution[emotion] = pct;
      if (pct > maxPct) {
        maxPct = pct;
        dominant = emotion;
      }
    }

    return { dominant, distribution };
  }

  /**
   * Process a single frame of landmarks.
   * Call this every N frames from the main loop.
   *
   * @param {Array} landmarks - 478 landmark array from FaceLandmarker
   * @param {number} timestamp - performance.now() timestamp
   * @returns {{ emotion: string, confidence: number, calibrating: boolean }}
   */
  processLandmarks(landmarks, timestamp) {
    this._frameCount++;

    // During calibration: collect raw signal samples
    if (!this._baseline) {
      const raw = extractRawSignals(landmarks);
      if (raw) {
        this._calibrationBuffer.push(raw);
      }

      if (this._calibrationBuffer.length >= CALIBRATION_FRAMES) {
        this._computeBaseline();
      }

      return { emotion: 'neutral', confidence: 0, calibrating: true };
    }

    // Post-calibration: compute AUs and classify
    const aus = computeAUs(landmarks, this._baseline);
    if (!aus) {
      return { ...this._currentEmotion, calibrating: false };
    }

    const raw = classifyEmotion(aus);

    // Add to sliding window
    this._emotionWindow.push(raw.emotion);
    if (this._emotionWindow.length > SMOOTHING_WINDOW) {
      this._emotionWindow.shift();
    }

    // Majority voting
    const smoothed = this._majorityVote();

    this._currentEmotion = {
      emotion: smoothed,
      confidence: raw.confidence,
      scores: raw.scores,
    };

    // Record in history
    this._emotionHistory.push({
      emotion: smoothed,
      confidence: raw.confidence,
      timestamp,
      aus,
    });

    return { ...this._currentEmotion, calibrating: false };
  }

  /** Reset for new measurement */
  reset() {
    this._calibrationBuffer = [];
    this._baseline = null;
    this._emotionWindow = [];
    this._emotionHistory = [];
    this._currentEmotion = { emotion: 'neutral', confidence: 0, scores: {} };
    this._frameCount = 0;
  }

  // -- Private methods --

  _computeBaseline() {
    // Median of each signal across calibration frames
    const keys = Object.keys(this._calibrationBuffer[0]);
    const baseline = {};

    for (const key of keys) {
      const values = this._calibrationBuffer
        .map(f => f[key])
        .filter(v => v != null)
        .sort((a, b) => a - b);

      if (values.length > 0) {
        const mid = Math.floor(values.length / 2);
        baseline[key] = values.length % 2 === 0
          ? (values[mid - 1] + values[mid]) / 2
          : values[mid];
      }
    }

    this._baseline = baseline;
  }

  _majorityVote() {
    if (this._emotionWindow.length === 0) return 'neutral';

    const counts = {};
    for (const e of this._emotionWindow) {
      counts[e] = (counts[e] || 0) + 1;
    }

    let best = 'neutral';
    let bestCount = 0;

    for (const [emotion, count] of Object.entries(counts)) {
      if (count > bestCount) {
        bestCount = count;
        best = emotion;
      }
    }

    // Require >= 60% agreement to switch from neutral
    const ratio = bestCount / this._emotionWindow.length;
    if (ratio < 0.6 && best !== 'neutral') {
      return 'neutral';
    }

    return best;
  }
}

// ---------------------------------------------------------------------------
// FaceLandmarker — lazy singleton init
// ---------------------------------------------------------------------------

let _landmarker = null;
let _landmarkerPromise = null;
let _loadingState = 'idle'; // idle | loading | ready | error

/**
 * Get current loading state.
 * @returns {'idle'|'loading'|'ready'|'error'}
 */
export function getLandmarkerState() {
  return _loadingState;
}

/**
 * Lazily initialize the MediaPipe FaceLandmarker.
 * Returns the landmarker instance. Subsequent calls return the cached instance.
 *
 * @returns {Promise<Object>} FaceLandmarker instance
 */
export async function initFaceLandmarker() {
  if (_landmarker) return _landmarker;
  if (_landmarkerPromise) return _landmarkerPromise;

  _loadingState = 'loading';

  _landmarkerPromise = (async () => {
    try {
      // Dynamically import the Vision Tasks API from CDN
      const vision = await import(
        /* webpackIgnore: true */
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest'
      );

      const { FaceLandmarker, FilesetResolver } = vision;

      const filesetResolver = await FilesetResolver.forVisionTasks(VISION_WASM_CDN);

      _landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
        baseOptions: {
          modelAssetPath: MODEL_CDN,
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
        outputFaceBlendshapes: false,
      });

      _loadingState = 'ready';
      return _landmarker;
    } catch (err) {
      _loadingState = 'error';
      _landmarkerPromise = null;
      console.error('[MiruCare] FaceLandmarker init failed:', err);
      throw err;
    }
  })();

  return _landmarkerPromise;
}

/**
 * Run face landmark detection on a video frame.
 *
 * @param {HTMLVideoElement} video
 * @param {number} timestamp - performance.now()
 * @returns {Array|null} 478 landmarks or null if no face detected
 */
export function detectLandmarks(video, timestamp) {
  if (!_landmarker || _loadingState !== 'ready') return null;

  try {
    const result = _landmarker.detectForVideo(video, timestamp);
    if (result?.faceLandmarks?.length > 0) {
      return result.faceLandmarks[0]; // First face only
    }
  } catch {
    // Silently fail — rPPG continues unaffected
  }

  return null;
}

/**
 * Clean up and dispose the FaceLandmarker.
 */
export function disposeFaceLandmarker() {
  if (_landmarker) {
    try { _landmarker.close(); } catch { /* ignore */ }
    _landmarker = null;
  }
  _landmarkerPromise = null;
  _loadingState = 'idle';
}

// Re-export for external use
export { EMOTION_LABELS, classifyEmotion, computeAUs };

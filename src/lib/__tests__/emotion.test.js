import { describe, it, expect } from 'vitest';
import { computeAUs, classifyEmotion, EMOTION_LABELS } from '../emotion.js';

// Helper: create a mock 478-landmark array with controllable positions
function makeLandmarks(overrides = {}) {
  const base = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  // Set default face geometry (neutral expression)
  // Eyes
  base[133] = { x: 0.4, y: 0.5, z: 0 };  // left eye inner
  base[362] = { x: 0.6, y: 0.5, z: 0 };  // right eye inner
  base[33]  = { x: 0.3, y: 0.5, z: 0 };  // left eye outer
  base[263] = { x: 0.7, y: 0.5, z: 0 };  // right eye outer
  base[159] = { x: 0.4, y: 0.47, z: 0 }; // left eye top
  base[145] = { x: 0.4, y: 0.53, z: 0 }; // left eye bottom
  base[386] = { x: 0.6, y: 0.47, z: 0 }; // right eye top
  base[374] = { x: 0.6, y: 0.53, z: 0 }; // right eye bottom
  // Brows
  base[107] = { x: 0.42, y: 0.44, z: 0 }; // left brow inner
  base[336] = { x: 0.58, y: 0.44, z: 0 }; // right brow inner
  base[70]  = { x: 0.3, y: 0.44, z: 0 };  // left brow outer
  base[300] = { x: 0.7, y: 0.44, z: 0 };  // right brow outer
  // Mouth
  base[61]  = { x: 0.42, y: 0.7, z: 0 };  // mouth left
  base[291] = { x: 0.58, y: 0.7, z: 0 };  // mouth right
  base[13]  = { x: 0.5, y: 0.68, z: 0 };  // upper lip top
  base[14]  = { x: 0.5, y: 0.72, z: 0 };  // lower lip bottom
  base[0]   = { x: 0.5, y: 0.67, z: 0 };  // mouth top
  base[17]  = { x: 0.5, y: 0.73, z: 0 };  // mouth bottom
  // Nose
  base[1]   = { x: 0.5, y: 0.55, z: 0 };  // nose tip
  base[6]   = { x: 0.5, y: 0.48, z: 0 };  // nose bridge
  // Cheeks
  base[234] = { x: 0.35, y: 0.58, z: 0 }; // left cheek
  base[454] = { x: 0.65, y: 0.58, z: 0 }; // right cheek
  base[152] = { x: 0.5, y: 0.8, z: 0 };   // chin

  for (const [idx, pos] of Object.entries(overrides)) {
    base[Number(idx)] = pos;
  }
  return base;
}

function makeBaseline(lm) {
  // Extract raw signals for baseline (matching the function in emotion.js)
  const iod = Math.sqrt(
    (lm[133].x - lm[362].x) ** 2 + (lm[133].y - lm[362].y) ** 2
  );
  const normDist = (a, b) => Math.sqrt(
    (lm[a].x - lm[b].x) ** 2 + (lm[a].y - lm[b].y) ** 2
  ) / iod;
  const avgCornerY = (lm[61].y + lm[291].y) / 2;

  return {
    AU1: normDist(107, 133) + normDist(336, 362),
    AU2: normDist(70, 33) + normDist(300, 263),
    AU4: normDist(107, 336),
    AU6: normDist(234, 145) + normDist(454, 374),
    AU7: normDist(159, 145) + normDist(386, 374),
    AU12: normDist(61, 291),
    AU15: avgCornerY - lm[13].y,
    AU20: normDist(61, 291),
    AU26: normDist(0, 17),
  };
}

describe('computeAUs', () => {
  it('returns null for degenerate landmarks (IOD=0)', () => {
    const lm = makeLandmarks({
      133: { x: 0.5, y: 0.5, z: 0 },
      362: { x: 0.5, y: 0.5, z: 0 },
    });
    expect(computeAUs(lm, null)).toBeNull();
  });

  it('returns all zeros with no baseline', () => {
    const lm = makeLandmarks();
    const aus = computeAUs(lm, null);
    expect(aus).not.toBeNull();
    // Without baseline, most AUs should be 0 (except AU25)
    expect(aus.AU1).toBe(0);
    expect(aus.AU2).toBe(0);
    expect(aus.AU4).toBe(0);
    expect(aus.AU12).toBe(0);
  });

  it('returns zero AUs for neutral face with matching baseline', () => {
    const lm = makeLandmarks();
    const baseline = makeBaseline(lm);
    const aus = computeAUs(lm, baseline);
    expect(aus).not.toBeNull();
    expect(aus.AU1).toBe(0);
    expect(aus.AU4).toBe(0);
    expect(aus.AU12).toBe(0);
  });

  it('detects AU12 (smile) when mouth corners move apart', () => {
    const neutralLm = makeLandmarks();
    const baseline = makeBaseline(neutralLm);

    // Widen mouth corners significantly
    const smilingLm = makeLandmarks({
      61: { x: 0.35, y: 0.68, z: 0 },
      291: { x: 0.65, y: 0.68, z: 0 },
    });
    const aus = computeAUs(smilingLm, baseline);
    expect(aus.AU12).toBeGreaterThan(0.3);
  });

  it('detects AU4 (brow lower) when inner brows get closer', () => {
    const neutralLm = makeLandmarks();
    const baseline = makeBaseline(neutralLm);

    // Move inner brows closer together
    const frowningLm = makeLandmarks({
      107: { x: 0.46, y: 0.44, z: 0 },
      336: { x: 0.54, y: 0.44, z: 0 },
    });
    const aus = computeAUs(frowningLm, baseline);
    expect(aus.AU4).toBeGreaterThan(0);
  });

  it('AU25 works without baseline (lips parting)', () => {
    const lm = makeLandmarks({
      13: { x: 0.5, y: 0.65, z: 0 },
      14: { x: 0.5, y: 0.78, z: 0 },
    });
    const aus = computeAUs(lm, null);
    // AU25 should be positive since lips are far apart
    expect(aus.AU25).toBeGreaterThan(0);
  });

  it('all AU values are in [0, 1] range', () => {
    const neutralLm = makeLandmarks();
    const baseline = makeBaseline(neutralLm);
    // Extreme landmarks
    const extremeLm = makeLandmarks({
      107: { x: 0.42, y: 0.30, z: 0 },
      336: { x: 0.58, y: 0.30, z: 0 },
      61: { x: 0.2, y: 0.8, z: 0 },
      291: { x: 0.8, y: 0.8, z: 0 },
    });
    const aus = computeAUs(extremeLm, baseline);
    for (const [key, val] of Object.entries(aus)) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThanOrEqual(1);
    }
  });
});

describe('classifyEmotion', () => {
  it('returns neutral for null AUs', () => {
    const result = classifyEmotion(null);
    expect(result.emotion).toBe('neutral');
    expect(result.confidence).toBe(0);
  });

  it('returns neutral when all AUs are zero', () => {
    const aus = { AU1: 0, AU2: 0, AU4: 0, AU6: 0, AU7: 0, AU12: 0, AU15: 0, AU20: 0, AU25: 0, AU26: 0 };
    const result = classifyEmotion(aus);
    expect(result.emotion).toBe('neutral');
  });

  it('classifies happiness when AU6 and AU12 are high', () => {
    const aus = { AU1: 0, AU2: 0, AU4: 0, AU6: 0.5, AU7: 0, AU12: 0.6, AU15: 0, AU20: 0, AU25: 0, AU26: 0 };
    const result = classifyEmotion(aus);
    expect(result.emotion).toBe('happiness');
    expect(result.confidence).toBeGreaterThan(0);
  });

  it('classifies surprise when AU1, AU2, AU25 are high', () => {
    const aus = { AU1: 0.6, AU2: 0.5, AU4: 0, AU6: 0, AU7: 0, AU12: 0, AU15: 0, AU20: 0, AU25: 0.5, AU26: 0.3 };
    const result = classifyEmotion(aus);
    expect(result.emotion).toBe('surprise');
  });

  it('classifies anger when AU4 and AU7 are high', () => {
    const aus = { AU1: 0, AU2: 0, AU4: 0.6, AU6: 0, AU7: 0.5, AU12: 0, AU15: 0, AU20: 0, AU25: 0, AU26: 0 };
    const result = classifyEmotion(aus);
    expect(result.emotion).toBe('anger');
  });

  it('anger is inhibited by AU12 (smiling)', () => {
    const aus = { AU1: 0, AU2: 0, AU4: 0.6, AU6: 0, AU7: 0.5, AU12: 0.4, AU15: 0, AU20: 0, AU25: 0, AU26: 0 };
    const result = classifyEmotion(aus);
    expect(result.emotion).not.toBe('anger');
  });

  it('classifies sadness when AU1 and AU15 are high', () => {
    const aus = { AU1: 0.5, AU2: 0, AU4: 0.2, AU6: 0, AU7: 0, AU12: 0, AU15: 0.5, AU20: 0, AU25: 0, AU26: 0 };
    const result = classifyEmotion(aus);
    expect(result.emotion).toBe('sadness');
  });
});

describe('EMOTION_LABELS', () => {
  it('has Japanese labels for all 7 emotions', () => {
    expect(Object.keys(EMOTION_LABELS)).toHaveLength(7);
    expect(EMOTION_LABELS.happiness).toBe('幸福');
    expect(EMOTION_LABELS.neutral).toBe('平常');
    expect(EMOTION_LABELS.anger).toBe('怒り');
  });
});

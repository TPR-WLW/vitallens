/**
 * Condition Score Fusion — HRV + Emotion -> 3 wellness axes
 *
 * Fuses physiological (HRV) and facial expression data into user-facing
 * wellness dimensions. Follows the UX spec principle: show "condition",
 * never individual emotion labels.
 *
 * Outputs 3 scores (0-100) mapped to 5 qualitative levels.
 * All labels are in Japanese per the product spec.
 */

// ---------------------------------------------------------------------------
// Level mapping (same palette as existing stress card)
// ---------------------------------------------------------------------------
const LEVELS = [
  { min: 80, label: 'とても良い', color: '#22c55e' },
  { min: 60, label: '良い',       color: '#22c55e' },
  { min: 40, label: '普通',       color: '#3b82f6' },
  { min: 20, label: 'やや注意',   color: '#f59e0b' },
  { min: 0,  label: '注意',       color: '#ef4444' },
];

function scoreToLevel(score) {
  for (const level of LEVELS) {
    if (score >= level.min) return level;
  }
  return LEVELS[LEVELS.length - 1];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Clamp a number to [0, 100] */
function clamp100(v) {
  return Math.max(0, Math.min(100, Math.round(v)));
}

/**
 * Get the percentage of negative emotions from the emotion summary distribution.
 * Negative emotions: anger, fear, sadness, disgust
 */
function getNegativeEmotionRatio(distribution) {
  if (!distribution) return 0;
  const negatives = ['anger', 'fear', 'sadness', 'disgust'];
  let total = 0;
  for (const e of negatives) {
    total += (distribution[e] || 0);
  }
  return total / 100; // 0 to 1
}

/**
 * Get the percentage of positive/neutral emotions.
 */
function getPositiveNeutralRatio(distribution) {
  if (!distribution) return 1;
  const positives = ['happiness', 'neutral'];
  let total = 0;
  for (const e of positives) {
    total += (distribution[e] || 0);
  }
  return total / 100;
}

/**
 * Compute emotion variability (Shannon entropy normalized to 0-1).
 * High entropy = many different emotions = less stable.
 */
function emotionVariability(distribution) {
  if (!distribution) return 0;
  const values = Object.values(distribution).filter(v => v > 0);
  if (values.length <= 1) return 0;

  const total = values.reduce((a, b) => a + b, 0);
  if (total === 0) return 0;

  let entropy = 0;
  for (const v of values) {
    const p = v / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }

  // Normalize by max possible entropy (log2 of number of emotion categories)
  const maxEntropy = Math.log2(7); // 7 emotions
  return entropy / maxEntropy; // 0 to 1
}

// ---------------------------------------------------------------------------
// Main fusion function
// ---------------------------------------------------------------------------

/**
 * Compute 3 condition scores from HRV data + emotion summary.
 *
 * @param {Object|null} hrvData - { metrics, stress } from analyzeHRV()
 * @param {Object|null} emotionSummary - { dominant, distribution } from EmotionProcessor.summary
 * @returns {{ tension: Object, vitality: Object, balance: Object, overall: Object }}
 */
export function computeConditionScores(hrvData, emotionSummary) {
  const hasHRV = hrvData?.stress && hrvData.stress.level !== 'unknown';
  const hasEmotion = emotionSummary && emotionSummary.distribution;

  // If we have neither, return inconclusive
  if (!hasHRV && !hasEmotion) {
    const inconclusive = { score: -1, label: '計測不能', color: '#9ca3af' };
    return {
      tension: inconclusive,
      vitality: inconclusive,
      balance: inconclusive,
      overall: inconclusive,
    };
  }

  const stressScore = hasHRV ? hrvData.stress.score : 50; // 0-100 where 100 = high stress
  const metrics = hrvData?.metrics;

  const dist = hasEmotion ? emotionSummary.distribution : {};
  const negRatio = getNegativeEmotionRatio(dist);
  const posNeutralRatio = getPositiveNeutralRatio(dist);
  const variability = emotionVariability(dist);

  // --- Tension (こころの緊張度) ---
  // Lower is better. Combines HRV stress + negative emotions.
  // Invert so that high score = low tension = good
  let tensionRaw;
  if (hasHRV && hasEmotion) {
    tensionRaw = 100 - (stressScore * 0.6 + negRatio * 100 * 0.4);
  } else if (hasHRV) {
    tensionRaw = 100 - stressScore;
  } else {
    tensionRaw = 100 - negRatio * 100;
  }
  const tensionScore = clamp100(tensionRaw);
  const tensionLevel = scoreToLevel(tensionScore);

  // --- Vitality (回復・活力) ---
  // Higher is better. RMSSD/pNN50 indicate recovery capacity. Positive emotions add.
  let vitalityRaw;
  if (hasHRV && metrics) {
    // Normalize RMSSD: 15ms = 0, 60ms = 100 (rPPG ultra-short range)
    const rmssdNorm = clamp100((metrics.rmssd - 15) * (100 / 45));
    // Normalize pNN50: 3% = 0, 40% = 100
    const pnn50Norm = clamp100((metrics.pnn50 - 3) * (100 / 37));
    const hrvVitality = rmssdNorm * 0.6 + pnn50Norm * 0.4;

    if (hasEmotion) {
      vitalityRaw = hrvVitality * 0.7 + posNeutralRatio * 100 * 0.3;
    } else {
      vitalityRaw = hrvVitality;
    }
  } else {
    vitalityRaw = posNeutralRatio * 100;
  }
  const vitalityScore = clamp100(vitalityRaw);
  const vitalityLevel = scoreToLevel(vitalityScore);

  // --- Balance (バランス度) ---
  // LF/HF balance approximation from stress score + emotion variability.
  // Optimal = moderate stress (not too low, not too high) + low emotion variability.
  let balanceRaw;
  const stressBalance = hasHRV
    ? 100 - Math.abs(stressScore - 40) * 1.5  // optimal around 40
    : 60;

  if (hasEmotion) {
    // Low variability is good (stable emotional state)
    const stabilityScore = (1 - variability) * 100;
    balanceRaw = stressBalance * 0.5 + stabilityScore * 0.5;
  } else {
    balanceRaw = stressBalance;
  }
  const balanceScore = clamp100(balanceRaw);
  const balanceLevel = scoreToLevel(balanceScore);

  // --- Overall ---
  const overallScore = clamp100(
    tensionScore * 0.35 + vitalityScore * 0.35 + balanceScore * 0.30
  );
  const overallLevel = scoreToLevel(overallScore);

  // Overall message (from UX spec)
  let overallMessage;
  if (overallScore >= 70) {
    overallMessage = '自律神経・表情の両面から、今のあなたの状態は落ち着いています。';
  } else if (overallScore >= 45) {
    overallMessage = 'やや緊張傾向が見られます。短い休憩や深呼吸が効果的かもしれません。';
  } else if (overallScore >= 0) {
    overallMessage = 'お体の緊張が高めの傾向です。無理をせず、少し休息を取ることをお勧めします。';
  }

  return {
    tension: { score: tensionScore, ...tensionLevel },
    vitality: { score: vitalityScore, ...vitalityLevel },
    balance: { score: balanceScore, ...balanceLevel },
    overall: {
      score: overallScore,
      ...overallLevel,
      message: overallMessage,
    },
    hasEmotion,
  };
}

/**
 * Get Japanese label for the tension dimension.
 */
export function getTensionLabel(score) {
  if (score < 0) return '計測不能';
  if (score >= 70) return '低い';
  if (score >= 45) return 'やや高め';
  return '高い';
}

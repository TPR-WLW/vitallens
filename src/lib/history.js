/**
 * 計測履歴管理 — localStorage ベース
 * Measurement history management using localStorage
 */

const STORAGE_KEY = 'mirucare_history';
const MAX_ENTRIES = 100;

/**
 * 計測結果を保存用オブジェクトに変換（循環参照やサイズ対策）
 */
function serializeResult(result) {
  return {
    hr: result.hr,
    confidence: result.confidence,
    duration: result.duration,
    samples: result.samples,
    isDemo: !!result.isDemo,
    isSample: !!result.isSample,
    hrv: result.hrv
      ? {
          metrics: result.hrv.metrics,
          stress: result.hrv.stress,
          quality: result.hrv.quality,
        }
      : null,
    emotionSummary: result.emotion?.summary || null,
  };
}

/**
 * 計測結果を履歴に保存
 * @param {object} result - MeasureScreen/DemoMeasureScreen の結果オブジェクト
 * @returns {object} 保存されたエントリ（id, timestamp 付き）
 */
export function saveEntry(result) {
  const entry = {
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    timestamp: new Date().toISOString(),
    data: serializeResult(result),
  };

  const entries = getEntries();
  entries.unshift(entry);

  // 上限を超えたら古いものを削除
  if (entries.length > MAX_ENTRIES) {
    entries.length = MAX_ENTRIES;
  }

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  } catch {
    // localStorage full — 古い半分を削除して再試行
    entries.length = Math.floor(entries.length / 2);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
  }

  return entry;
}

/**
 * 全履歴を取得（新しい順）
 * @returns {Array} エントリの配列
 */
export function getEntries() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * 特定のエントリを削除
 * @param {string} id
 */
export function deleteEntry(id) {
  const entries = getEntries().filter((e) => e.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * 全履歴を削除
 */
export function clearAll() {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * 履歴の件数を返す
 */
export function getCount() {
  return getEntries().length;
}

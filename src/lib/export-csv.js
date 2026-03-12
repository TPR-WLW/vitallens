/**
 * 計測履歴CSVエクスポート
 * Exports measurement history entries as a CSV file download.
 */

import { computeConditionScores } from './emotion-fusion.js';

/**
 * 履歴エントリ配列をCSV文字列に変換
 * @param {Array} entries - history.js の getEntries() の戻り値
 * @returns {string} CSV文字列（BOM付きUTF-8、Excel対応）
 */
export function entriesToCSV(entries) {
  const headers = [
    '計測日時',
    '種別',
    '心拍数(BPM)',
    '平均HR',
    'ストレスレベル',
    'ストレススコア',
    'RMSSD(ms)',
    'SDNN(ms)',
    'pNN50(%)',
    'LF/HF比',
    'LF norm(%)',
    'HF norm(%)',
    '呼吸数(/分)',
    '品質グレード',
    'アルゴリズム',
    'コンディション',
    'コンディションスコア',
    '緊張度スコア',
    '活力スコア',
    'バランススコア',
    '計測信頼度',
    '計測時間(秒)',
    'サンプル数',
  ];

  const rows = entries.map((entry) => {
    const d = entry.data;
    const condition = computeConditionScores(
      d.hrv ? { metrics: d.hrv.metrics, stress: d.hrv.stress } : null,
      d.emotionSummary
    );

    const type = d.isDemo ? 'デモ' : d.isSample ? 'サンプル' : '実計測';
    const confidenceLabel = d.confidence > 0.4 ? '高' : d.confidence > 0.2 ? '中' : '低';

    const freqMetrics = d.hrv?.freqMetrics;

    return [
      entry.timestamp,
      type,
      d.hr || '',
      d.hrv?.metrics?.meanHR ?? '',
      d.hrv?.stress?.label || '',
      d.hrv?.stress?.score ?? '',
      d.hrv?.metrics?.rmssd ?? '',
      d.hrv?.metrics?.sdnn ?? '',
      d.hrv?.metrics?.pnn50 ?? '',
      freqMetrics?.lfHfRatio != null ? freqMetrics.lfHfRatio.toFixed(2) : '',
      freqMetrics?.lfNorm != null ? Math.round(freqMetrics.lfNorm) : '',
      freqMetrics?.hfNorm != null ? Math.round(freqMetrics.hfNorm) : '',
      freqMetrics?.respiratory?.respiratoryRate != null ? freqMetrics.respiratory.respiratoryRate.toFixed(1) : '',
      d.hrv?.quality?.grade ?? '',
      d.algorithm || '',
      condition.overall.score >= 0 ? condition.overall.label : '',
      condition.overall.score >= 0 ? condition.overall.score : '',
      condition.tension.score >= 0 ? condition.tension.score : '',
      condition.vitality.score >= 0 ? condition.vitality.score : '',
      condition.balance.score >= 0 ? condition.balance.score : '',
      confidenceLabel,
      d.duration || '',
      d.samples || '',
    ];
  });

  const csvContent = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const str = String(cell);
          if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
          }
          return str;
        })
        .join(',')
    )
    .join('\n');

  // BOM for Excel UTF-8 compatibility
  return '\uFEFF' + csvContent;
}

/**
 * 履歴エントリをCSVファイルとしてダウンロード
 * @param {Array} entries - history.js の getEntries() の戻り値
 */
export function downloadCSV(entries) {
  if (!entries || entries.length === 0) return;

  const csv = entriesToCSV(entries);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const now = new Date();
  const filename = `mirucare_history_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`;

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

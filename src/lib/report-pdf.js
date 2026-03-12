/**
 * PDF結果レポート生成 — ブラウザ印刷APIを使用
 * Opens a formatted report in a new window and triggers print dialog (Save as PDF).
 */

import { computeConditionScores } from './emotion-fusion.js';

/**
 * 計測結果からPDFレポート用HTMLを生成し、印刷ダイアログを表示
 * @param {object} result - 計測結果オブジェクト
 * @param {string} [timestamp] - ISO タイムスタンプ（履歴からの場合）
 */
export function printReport(result, timestamp) {
  const { hr, confidence, hrv, emotion } = result;
  const metrics = hrv?.metrics;
  const stress = hrv?.stress;
  const quality = hrv?.quality;

  const emotionSummary = emotion?.summary || result.emotionSummary || null;
  const condition = computeConditionScores(
    hrv ? { metrics, stress } : null,
    emotionSummary
  );

  const now = timestamp ? new Date(timestamp) : new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  const confidenceLabel = confidence > 0.4 ? '高' : confidence > 0.2 ? '中' : '低';
  const showCondition = condition.overall.score >= 0;

  const getTensionDisplay = (score) => {
    if (score < 0) return '計測不能';
    if (score >= 70) return '低い';
    if (score >= 45) return 'やや高め';
    return '高い';
  };
  const getVitalityDisplay = (score) => {
    if (score < 0) return '計測不能';
    if (score >= 70) return '十分';
    if (score >= 45) return '普通';
    return 'やや不足';
  };
  const getBalanceDisplay = (score) => {
    if (score < 0) return '計測不能';
    if (score >= 70) return '良好';
    if (score >= 45) return '普通';
    return 'やや乱れ';
  };

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>コンディションチェック結果レポート — ミルケア</title>
<style>
  @page { size: A4; margin: 20mm 15mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif;
    color: #1a1a2e;
    font-size: 11pt;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .report { max-width: 700px; margin: 0 auto; }
  .header {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #4f8cff;
    padding-bottom: 12px;
    margin-bottom: 20px;
  }
  .header-left h1 {
    font-size: 18pt;
    color: #4f8cff;
    margin-bottom: 2px;
  }
  .header-left .subtitle { font-size: 9pt; color: #666; }
  .header-right { text-align: right; font-size: 9pt; color: #666; }
  .header-right .date { font-size: 11pt; color: #333; font-weight: 600; }

  .section { margin-bottom: 18px; }
  .section-title {
    font-size: 12pt;
    font-weight: 700;
    color: #333;
    border-left: 4px solid #4f8cff;
    padding-left: 8px;
    margin-bottom: 10px;
  }

  .condition-box {
    background: #f8f9fc;
    border: 2px solid ${showCondition ? condition.overall.color : '#ccc'};
    border-radius: 8px;
    padding: 16px 20px;
    text-align: center;
    margin-bottom: 14px;
  }
  .condition-label { font-size: 10pt; color: #666; margin-bottom: 6px; }
  .condition-score {
    font-size: 22pt;
    font-weight: 700;
    color: ${showCondition ? condition.overall.color : '#999'};
  }
  .condition-message {
    font-size: 9.5pt;
    color: #555;
    margin-top: 8px;
  }

  .dimensions {
    display: flex;
    gap: 10px;
    margin-bottom: 14px;
  }
  .dim-card {
    flex: 1;
    background: #f8f9fc;
    border-radius: 6px;
    padding: 12px 8px;
    text-align: center;
  }
  .dim-label { font-size: 8.5pt; color: #888; margin-bottom: 4px; }
  .dim-value { font-size: 11pt; font-weight: 600; }
  .dim-bar {
    height: 4px;
    background: #e5e7eb;
    border-radius: 2px;
    margin-top: 6px;
    overflow: hidden;
  }
  .dim-bar-fill { height: 100%; border-radius: 2px; }

  .metrics-table {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 10px;
  }
  .metrics-table th, .metrics-table td {
    padding: 8px 12px;
    border: 1px solid #e5e7eb;
    text-align: center;
    font-size: 10pt;
  }
  .metrics-table th {
    background: #f1f3f8;
    font-weight: 600;
    color: #444;
  }
  .metrics-value { font-size: 14pt; font-weight: 700; color: #4f8cff; }
  .metrics-ref { font-size: 8pt; color: #999; }

  .stress-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 14px;
    background: #f8f9fc;
    border-radius: 6px;
    margin-bottom: 10px;
  }
  .stress-label-text { font-size: 10pt; color: #666; min-width: 90px; }
  .stress-bar {
    flex: 1;
    height: 8px;
    background: #e5e7eb;
    border-radius: 4px;
    overflow: hidden;
  }
  .stress-bar-fill { height: 100%; border-radius: 4px; }
  .stress-badge {
    padding: 2px 12px;
    border-radius: 12px;
    font-size: 9pt;
    font-weight: 600;
    color: #fff;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    padding: 6px 0;
    font-size: 9.5pt;
    border-bottom: 1px solid #f0f0f0;
  }
  .info-label { color: #888; }
  .info-value { font-weight: 500; color: #333; }

  .hr-box {
    display: flex;
    align-items: center;
    gap: 16px;
    padding: 14px;
    background: #f8f9fc;
    border-radius: 6px;
    margin-bottom: 14px;
  }
  .hr-number { font-size: 28pt; font-weight: 800; color: #333; }
  .hr-unit { font-size: 10pt; color: #888; }

  .disclaimer {
    margin-top: 24px;
    padding-top: 12px;
    border-top: 1px solid #e5e7eb;
    font-size: 8pt;
    color: #999;
    line-height: 1.5;
  }
  .footer {
    margin-top: 16px;
    text-align: center;
    font-size: 8pt;
    color: #bbb;
  }

  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
<div class="report">
  <div class="header">
    <div class="header-left">
      <h1>コンディションチェック結果</h1>
      <div class="subtitle">ミルケア（MiruCare）— 非接触バイタルモニタリング</div>
    </div>
    <div class="header-right">
      <div class="date">${dateStr}</div>
      <div>${timeStr} 計測</div>
      ${result.isDemo ? '<div style="color:#4f8cff;font-weight:600;">デモデータ</div>' : ''}
      ${result.isSample ? '<div style="color:#f59e0b;font-weight:600;">サンプルデータ</div>' : ''}
    </div>
  </div>

  ${showCondition ? `
  <div class="section">
    <div class="section-title">総合コンディション</div>
    <div class="condition-box">
      <div class="condition-label">総合評価</div>
      <div class="condition-score">${condition.overall.label}（${condition.overall.score}点）</div>
      ${condition.overall.message ? `<div class="condition-message">${condition.overall.message}</div>` : ''}
    </div>

    <div class="dimensions">
      <div class="dim-card">
        <div class="dim-label">こころの緊張度</div>
        <div class="dim-value" style="color:${condition.tension.color}">${getTensionDisplay(condition.tension.score)}</div>
        <div class="dim-bar"><div class="dim-bar-fill" style="width:${Math.max(0, condition.tension.score)}%;background:${condition.tension.color}"></div></div>
      </div>
      <div class="dim-card">
        <div class="dim-label">回復・活力</div>
        <div class="dim-value" style="color:${condition.vitality.color}">${getVitalityDisplay(condition.vitality.score)}</div>
        <div class="dim-bar"><div class="dim-bar-fill" style="width:${Math.max(0, condition.vitality.score)}%;background:${condition.vitality.color}"></div></div>
      </div>
      <div class="dim-card">
        <div class="dim-label">バランス度</div>
        <div class="dim-value" style="color:${condition.balance.color}">${getBalanceDisplay(condition.balance.score)}</div>
        <div class="dim-bar"><div class="dim-bar-fill" style="width:${Math.max(0, condition.balance.score)}%;background:${condition.balance.color}"></div></div>
      </div>
    </div>
  </div>
  ` : ''}

  ${stress && stress.level !== 'unknown' ? `
  <div class="section">
    <div class="section-title">ストレスレベル</div>
    <div class="stress-row">
      <span class="stress-label-text">ストレス</span>
      <div class="stress-bar">
        <div class="stress-bar-fill" style="width:${stress.score}%;background:${stress.color}"></div>
      </div>
      <span class="stress-badge" style="background:${stress.color}">${stress.label}</span>
    </div>
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">心拍数</div>
    <div class="hr-box">
      <div>
        <span class="hr-number">${hr > 0 ? hr : '--'}</span>
        <span class="hr-unit">BPM</span>
      </div>
    </div>
  </div>

  ${metrics ? `
  <div class="section">
    <div class="section-title">HRV指標（心拍変動）</div>
    <table class="metrics-table">
      <tr>
        <th>RMSSD</th>
        <th>SDNN</th>
        <th>pNN50</th>
      </tr>
      <tr>
        <td>
          <div class="metrics-value">${metrics.rmssd}</div>
          <div class="metrics-ref">ms（基準値: 20〜60ms）</div>
        </td>
        <td>
          <div class="metrics-value">${metrics.sdnn}</div>
          <div class="metrics-ref">ms（基準値: 20〜55ms）</div>
        </td>
        <td>
          <div class="metrics-value">${metrics.pnn50}</div>
          <div class="metrics-ref">%（基準値: 3〜40%）</div>
        </td>
      </tr>
    </table>
    ${quality ? `<div style="font-size:9pt;color:#666;">データ品質: <strong>${quality.grade}</strong> — ${quality.message}</div>` : ''}
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">計測情報</div>
    <div class="info-row">
      <span class="info-label">計測信頼度</span>
      <span class="info-value">${confidenceLabel}</span>
    </div>
    <div class="info-row">
      <span class="info-label">計測時間</span>
      <span class="info-value">${Math.round(result.duration / 60)}分</span>
    </div>
    <div class="info-row">
      <span class="info-label">サンプル数</span>
      <span class="info-value">${result.samples}</span>
    </div>
  </div>

  <div class="disclaimer">
    <p>※ 本レポートはウェルネス参考値を提供するものであり、医療機器による診断結果ではありません。</p>
    <p>※ 診断・治療の目的で使用しないでください。体調に不安がある場合は医療専門家にご相談ください。</p>
    <p>※ カメラ映像は処理後に即時破棄され、外部サーバーへの送信は行われません。</p>
  </div>

  <div class="footer">
    ミルケア（MiruCare）— 非接触バイタルモニタリング | レポート生成日時: ${dateStr} ${timeStr}
  </div>
</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
</script>
</body>
</html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('ポップアップがブロックされています。ブラウザの設定でポップアップを許可してください。');
    return;
  }
  printWindow.document.write(html);
  printWindow.document.close();
}

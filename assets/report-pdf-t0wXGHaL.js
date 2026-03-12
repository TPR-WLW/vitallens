import{c as y}from"./emotion-fusion-jvwGp-Nd.js";function k(s,c){const{hr:p,confidence:v,hrv:r,emotion:b}=s,o=r?.metrics,e=r?.stress,d=r?.quality,g=b?.summary||s.emotionSummary||null,i=y(r?{metrics:o,stress:e}:null,g),a=c?new Date(c):new Date,f=`${a.getFullYear()}年${a.getMonth()+1}月${a.getDate()}日`,m=`${String(a.getHours()).padStart(2,"0")}:${String(a.getMinutes()).padStart(2,"0")}`,x=v>.4?"高":v>.2?"中":"低",n=i.overall.score>=0,h=t=>t<0?"計測不能":t>=70?"低い":t>=45?"やや高め":"高い",u=t=>t<0?"計測不能":t>=70?"十分":t>=45?"普通":"やや不足",$=t=>t<0?"計測不能":t>=70?"良好":t>=45?"普通":"やや乱れ",w=`<!DOCTYPE html>
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
    border: 2px solid ${n?i.overall.color:"#ccc"};
    border-radius: 8px;
    padding: 16px 20px;
    text-align: center;
    margin-bottom: 14px;
  }
  .condition-label { font-size: 10pt; color: #666; margin-bottom: 6px; }
  .condition-score {
    font-size: 22pt;
    font-weight: 700;
    color: ${n?i.overall.color:"#999"};
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
      <div class="date">${f}</div>
      <div>${m} 計測</div>
      ${s.isDemo?'<div style="color:#4f8cff;font-weight:600;">デモデータ</div>':""}
      ${s.isSample?'<div style="color:#f59e0b;font-weight:600;">サンプルデータ</div>':""}
    </div>
  </div>

  ${n?`
  <div class="section">
    <div class="section-title">総合コンディション</div>
    <div class="condition-box">
      <div class="condition-label">総合評価</div>
      <div class="condition-score">${i.overall.label}（${i.overall.score}点）</div>
      ${i.overall.message?`<div class="condition-message">${i.overall.message}</div>`:""}
    </div>

    <div class="dimensions">
      <div class="dim-card">
        <div class="dim-label">こころの緊張度</div>
        <div class="dim-value" style="color:${i.tension.color}">${h(i.tension.score)}</div>
        <div class="dim-bar"><div class="dim-bar-fill" style="width:${Math.max(0,i.tension.score)}%;background:${i.tension.color}"></div></div>
      </div>
      <div class="dim-card">
        <div class="dim-label">回復・活力</div>
        <div class="dim-value" style="color:${i.vitality.color}">${u(i.vitality.score)}</div>
        <div class="dim-bar"><div class="dim-bar-fill" style="width:${Math.max(0,i.vitality.score)}%;background:${i.vitality.color}"></div></div>
      </div>
      <div class="dim-card">
        <div class="dim-label">バランス度</div>
        <div class="dim-value" style="color:${i.balance.color}">${$(i.balance.score)}</div>
        <div class="dim-bar"><div class="dim-bar-fill" style="width:${Math.max(0,i.balance.score)}%;background:${i.balance.color}"></div></div>
      </div>
    </div>
  </div>
  `:""}

  ${e&&e.level!=="unknown"?`
  <div class="section">
    <div class="section-title">ストレスレベル</div>
    <div class="stress-row">
      <span class="stress-label-text">ストレス</span>
      <div class="stress-bar">
        <div class="stress-bar-fill" style="width:${e.score}%;background:${e.color}"></div>
      </div>
      <span class="stress-badge" style="background:${e.color}">${e.label}</span>
    </div>
  </div>
  `:""}

  <div class="section">
    <div class="section-title">心拍数</div>
    <div class="hr-box">
      <div>
        <span class="hr-number">${p>0?p:"--"}</span>
        <span class="hr-unit">BPM</span>
      </div>
    </div>
  </div>

  ${o?`
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
          <div class="metrics-value">${o.rmssd}</div>
          <div class="metrics-ref">ms（基準値: 20〜60ms）</div>
        </td>
        <td>
          <div class="metrics-value">${o.sdnn}</div>
          <div class="metrics-ref">ms（基準値: 20〜55ms）</div>
        </td>
        <td>
          <div class="metrics-value">${o.pnn50}</div>
          <div class="metrics-ref">%（基準値: 3〜40%）</div>
        </td>
      </tr>
    </table>
    ${d?`<div style="font-size:9pt;color:#666;">データ品質: <strong>${d.grade}</strong> — ${d.message}</div>`:""}
  </div>
  `:""}

  <div class="section">
    <div class="section-title">計測情報</div>
    <div class="info-row">
      <span class="info-label">計測信頼度</span>
      <span class="info-value">${x}</span>
    </div>
    <div class="info-row">
      <span class="info-label">計測時間</span>
      <span class="info-value">${Math.round(s.duration/60)}分</span>
    </div>
    <div class="info-row">
      <span class="info-label">サンプル数</span>
      <span class="info-value">${s.samples}</span>
    </div>
  </div>

  <div class="disclaimer">
    <p>※ 本レポートはウェルネス参考値を提供するものであり、医療機器による診断結果ではありません。</p>
    <p>※ 診断・治療の目的で使用しないでください。体調に不安がある場合は医療専門家にご相談ください。</p>
    <p>※ カメラ映像は処理後に即時破棄され、外部サーバーへの送信は行われません。</p>
  </div>

  <div class="footer">
    ミルケア（MiruCare）— 非接触バイタルモニタリング | レポート生成日時: ${f} ${m}
  </div>
</div>

<script>
  window.onload = function() {
    setTimeout(function() { window.print(); }, 300);
  };
<\/script>
</body>
</html>`,l=window.open("","_blank");if(!l){alert("ポップアップがブロックされています。ブラウザの設定でポップアップを許可してください。");return}l.document.write(w),l.document.close()}export{k as p};

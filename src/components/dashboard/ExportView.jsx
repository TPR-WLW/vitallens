import { useState, useEffect } from 'react';
import { dataService } from '../../services/index.js';
import { stressStatus } from './AdminDashboard.jsx';

export default function ExportView({ session, teams }) {
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [teamId, setTeamId] = useState('');
  const [filePrefix, setFilePrefix] = useState('mirucare-report');
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  const generatePreview = async () => {
    setLoading(true);
    try {
      const opts = {
        from: startDate,
        to: endDate + 'T23:59:59.999Z',
      };
      if (teamId) opts.teamId = teamId;
      const csv = await dataService.exportCSV(session.orgId, opts);
      setPreview(csv);
    } catch {
      setPreview('エラーが発生しました');
    }
    setLoading(false);
  };

  useEffect(() => {
    generatePreview();
  }, [startDate, endDate, teamId]);

  const handleDownload = () => {
    const bom = '\uFEFF'; // UTF-8 BOM for Excel
    const blob = new Blob([bom + preview], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const prefix = filePrefix.trim() || 'mirucare-report';
    a.download = `${prefix}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const setQuickRange = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  };

  return (
    <div className="adm-view">
      <h2 className="adm-view-title">CSVデータ出力</h2>
      <p className="adm-view-desc">部署別ストレス・HRVデータをCSV形式でエクスポートします。RMSSD・SDNN・pNN50・LF/HF・呼吸数を含む全指標を出力します。稟議書や社内報告書への添付にご利用ください。</p>

      <h3 className="adm-section-title">期間選択</h3>
      <div className="adm-date-range">
        <label>
          開始日:
          <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </label>
        <label>
          終了日:
          <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </label>
      </div>
      <div className="adm-quick-range">
        <button className="adm-btn-ghost" onClick={() => setQuickRange(7)}>直近1週間</button>
        <button className="adm-btn-ghost" onClick={() => setQuickRange(30)}>直近1ヶ月</button>
        <button className="adm-btn-ghost" onClick={() => setQuickRange(365)}>全期間</button>
      </div>

      <h3 className="adm-section-title">部署フィルター</h3>
      <div className="adm-export-field">
        <select
          className="adm-export-select"
          value={teamId}
          onChange={(e) => setTeamId(e.target.value)}
        >
          <option value="">全部署</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      </div>

      <div className="adm-export-privacy">
        <p>個人の計測データは含まれません</p>
        <p>1日の計測者が5名未満の部署データは除外されます</p>
      </div>

      <button className="adm-btn-primary" onClick={handleDownload} disabled={!preview || loading}>
        CSVをダウンロード
      </button>

      <div className="adm-export-field" style={{ marginTop: 12 }}>
        <label className="adm-export-label">ファイル名</label>
        <div className="adm-export-filename">
          <input
            type="text"
            className="adm-export-input"
            value={filePrefix}
            onChange={(e) => setFilePrefix(e.target.value)}
            placeholder="mirucare-report"
          />
          <span className="adm-export-suffix">-{new Date().toISOString().split('T')[0]}.csv</span>
        </div>
      </div>

      {preview && (
        <>
          <h3 className="adm-section-title" style={{ marginTop: 24 }}>プレビュー</h3>
          <pre className="adm-csv-preview">{preview.split('\n').slice(0, 11).join('\n')}</pre>
        </>
      )}

      <hr className="adm-divider" />

      <h2 className="adm-view-title" style={{ marginTop: 24 }}>メンバー別CSV出力</h2>
      <p className="adm-view-desc">メンバー一覧と最終計測日をCSV形式でエクスポートします。計測未実施メンバーの把握にご利用ください。</p>
      <MemberCsvExport session={session} />

      <hr className="adm-divider" />

      <h2 className="adm-view-title" style={{ marginTop: 24 }}>組織レポート出力（PDF）</h2>
      <p className="adm-view-desc">期間比較・部署間ベンチマーク・チーム推移を含むA4レポートをPDFとして出力します。</p>
      <button
        className="adm-btn-primary"
        onClick={() => generateOrgReportPDF(session, teams)}
      >
        組織レポートをPDF出力
      </button>
    </div>
  );
}

function MemberCsvExport({ session }) {
  const [preview, setPreview] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const csv = await dataService.exportMemberCSV(session.orgId);
        setPreview(csv);
      } catch {
        setPreview('エラーが発生しました');
      }
      setLoading(false);
    })();
  }, [session.orgId]);

  const handleDownload = () => {
    const bom = '\uFEFF';
    const blob = new Blob([bom + preview], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mirucare-members-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <button className="adm-btn-primary" onClick={handleDownload} disabled={!preview || loading}>
        メンバーCSVをダウンロード
      </button>
      {preview && (
        <>
          <h3 className="adm-section-title" style={{ marginTop: 16 }}>プレビュー</h3>
          <pre className="adm-csv-preview">{preview.split('\n').slice(0, 11).join('\n')}</pre>
        </>
      )}
    </div>
  );
}

/**
 * ベンチマーク横棒グラフSVG生成
 */
function generateBenchmarkSVG(sortedBench, benchAvg) {
  const barH = 28;
  const gap = 6;
  const labelW = 80;
  const chartW = 500;
  const svgH = sortedBench.length * (barH + gap) + 20;
  const maxScore = 100;

  const bars = sortedBench.map((t, i) => {
    const y = i * (barH + gap) + 10;
    const w = Math.max(2, (t.thisAvg / maxScore) * (chartW - labelW - 60));
    const color = t.thisAvg > 60 ? '#ef4444' : t.thisAvg > 40 ? '#f59e0b' : '#22c55e';
    return `
      <text x="${labelW - 8}" y="${y + barH / 2 + 4}" text-anchor="end" font-size="9" fill="#333">${t.name}</text>
      <rect x="${labelW}" y="${y}" width="${w}" height="${barH}" rx="4" fill="${color}" opacity="0.85"/>
      <text x="${labelW + w + 6}" y="${y + barH / 2 + 4}" font-size="9" font-weight="600" fill="#333">${t.thisAvg}</text>
    `;
  }).join('');

  const avgX = labelW + (benchAvg / maxScore) * (chartW - labelW - 60);

  return `<svg viewBox="0 0 ${chartW} ${svgH}" width="100%" preserveAspectRatio="xMidYMid meet" style="margin:8px 0 12px">
    ${bars}
    <line x1="${avgX}" y1="4" x2="${avgX}" y2="${svgH - 4}" stroke="#4f8cff" stroke-width="1.5" stroke-dasharray="4,3"/>
    <text x="${avgX}" y="${svgH}" text-anchor="middle" font-size="7" fill="#4f8cff">平均 ${benchAvg}</text>
  </svg>`;
}

/**
 * 先月 vs 今月 比較棒グラフSVG生成
 */
function generateComparisonSVG(teamRows, lastLabel, thisLabel) {
  const teams = teamRows.filter(t => t.lastAvg != null || t.thisAvg != null);
  if (teams.length === 0) return '';

  const groupW = 80;
  const barW = 28;
  const chartH = 180;
  const padTop = 20;
  const padBottom = 40;
  const padLeft = 30;
  const svgW = padLeft + teams.length * groupW + 20;
  const maxScore = 100;
  const plotH = chartH - padTop - padBottom;

  const groups = teams.map((t, i) => {
    const x = padLeft + i * groupW + (groupW - barW * 2 - 6) / 2;
    const lastH = t.lastAvg != null ? (t.lastAvg / maxScore) * plotH : 0;
    const thisH = t.thisAvg != null ? (t.thisAvg / maxScore) * plotH : 0;
    const lastY = padTop + plotH - lastH;
    const thisY = padTop + plotH - thisH;

    return `
      ${t.lastAvg != null ? `<rect x="${x}" y="${lastY}" width="${barW}" height="${lastH}" rx="3" fill="#94a3b8" opacity="0.7"/>
      <text x="${x + barW / 2}" y="${lastY - 3}" text-anchor="middle" font-size="7" fill="#666">${t.lastAvg}</text>` : ''}
      ${t.thisAvg != null ? `<rect x="${x + barW + 6}" y="${thisY}" width="${barW}" height="${thisH}" rx="3" fill="#4f8cff" opacity="0.85"/>
      <text x="${x + barW + 6 + barW / 2}" y="${thisY - 3}" text-anchor="middle" font-size="7" fill="#4f8cff">${t.thisAvg}</text>` : ''}
      <text x="${x + barW + 3}" y="${chartH - 10}" text-anchor="middle" font-size="8" fill="#333">${t.name}</text>
    `;
  }).join('');

  // Y-axis gridlines
  const gridLines = [0, 25, 50, 75].map(v => {
    const y = padTop + plotH - (v / maxScore) * plotH;
    return `<line x1="${padLeft}" y1="${y}" x2="${svgW - 10}" y2="${y}" stroke="#e5e7eb" stroke-width="0.5"/>
    <text x="${padLeft - 4}" y="${y + 3}" text-anchor="end" font-size="7" fill="#999">${v}</text>`;
  }).join('');

  return `<svg viewBox="0 0 ${svgW} ${chartH}" width="100%" preserveAspectRatio="xMidYMid meet" style="margin:8px 0 4px">
    ${gridLines}
    <line x1="${padLeft}" y1="${padTop}" x2="${padLeft}" y2="${padTop + plotH}" stroke="#ccc" stroke-width="0.5"/>
    ${groups}
    <rect x="${svgW - 100}" y="2" width="10" height="10" rx="2" fill="#94a3b8" opacity="0.7"/>
    <text x="${svgW - 86}" y="11" font-size="8" fill="#666">${lastLabel}</text>
    <rect x="${svgW - 50}" y="2" width="10" height="10" rx="2" fill="#4f8cff" opacity="0.85"/>
    <text x="${svgW - 36}" y="11" font-size="8" fill="#4f8cff">${thisLabel}</text>
  </svg>`;
}

/**
 * 組織レポートPDF生成 — 印刷APIを使用
 */
async function generateOrgReportPDF(session, teams) {
  const now = new Date();
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  const thisMonthLabel = `${thisMonthStart.getFullYear()}年${thisMonthStart.getMonth() + 1}月`;
  const lastMonthLabel = `${lastMonthStart.getFullYear()}年${lastMonthStart.getMonth() + 1}月`;
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  // Gather team data
  const teamRows = [];
  let totalStressThis = 0, totalCountThis = 0;
  let totalStressLast = 0, totalCountLast = 0;

  for (const t of teams) {
    const thisStats = await dataService.getTeamStats(t.id, { from: thisMonthStart.toISOString(), to: thisMonthEnd.toISOString() });
    const lastStats = await dataService.getTeamStats(t.id, { from: lastMonthStart.toISOString(), to: lastMonthEnd.toISOString() });

    const thisAvg = thisStats.stats && !thisStats.privacyFiltered ? thisStats.stats.avgStress : null;
    const lastAvg = lastStats.stats && !lastStats.privacyFiltered ? lastStats.stats.avgStress : null;
    const thisCount = thisStats.stats ? thisStats.stats.measurementCount : 0;
    const lastCount = lastStats.stats ? lastStats.stats.measurementCount : 0;

    if (thisAvg != null) { totalStressThis += thisAvg * thisCount; totalCountThis += thisCount; }
    if (lastAvg != null) { totalStressLast += lastAvg * lastCount; totalCountLast += lastCount; }

    teamRows.push({ name: t.name, thisAvg, lastAvg, thisCount, lastCount });
  }

  const orgThis = totalCountThis > 0 ? Math.round(totalStressThis / totalCountThis) : null;
  const orgLast = totalCountLast > 0 ? Math.round(totalStressLast / totalCountLast) : null;
  const orgDiff = orgThis != null && orgLast != null ? orgThis - orgLast : null;

  // Badge helper
  const badge = (score) => {
    if (score == null) return '<span style="color:#9ca3af">---</span>';
    const s = stressStatus(score);
    return `<span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:9pt;font-weight:600;color:#fff;background:${s.color}">${score} ${s.label}</span>`;
  };

  const diffColor = (d) => d == null ? '#9ca3af' : d < -3 ? '#22c55e' : d > 3 ? '#ef4444' : '#9ca3af';
  const diffLabel = (d) => d == null ? '' : d < -3 ? '改善' : d > 3 ? '悪化' : '横ばい';

  // Benchmark (sort by stress ascending)
  const benchTeams = teamRows.filter(t => t.thisAvg != null);
  const sortedBench = [...benchTeams].sort((a, b) => (a.thisAvg || 0) - (b.thisAvg || 0));
  const benchAvg = benchTeams.length > 0 ? Math.round(benchTeams.reduce((s, t) => s + t.thisAvg, 0) / benchTeams.length) : null;

  const comparisonRows = teamRows.map(t => {
    const d = t.thisAvg != null && t.lastAvg != null ? t.thisAvg - t.lastAvg : null;
    return `<tr>
      <td>${t.name}</td>
      <td>${badge(t.lastAvg)}</td>
      <td>${badge(t.thisAvg)}</td>
      <td style="color:${diffColor(d)};font-weight:600">${d != null ? `${d > 0 ? '+' : ''}${d}` : '---'} <small style="font-weight:400">${diffLabel(d)}</small></td>
    </tr>`;
  }).join('');

  const benchmarkRows = sortedBench.map((t, i) => {
    const diff = benchAvg != null ? t.thisAvg - benchAvg : null;
    return `<tr>
      <td>${i + 1}</td>
      <td>${t.name}</td>
      <td>${badge(t.thisAvg)}</td>
      <td style="color:${diffColor(diff != null && diff > 5 ? 10 : diff != null && diff < -5 ? -10 : 0)}">${diff != null ? `${diff > 0 ? '+' : ''}${diff}` : '---'}</td>
    </tr>`;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<title>組織ストレスレポート — ミルケア</title>
<style>
  @page { size: A4; margin: 18mm 14mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Hiragino Kaku Gothic ProN', 'Noto Sans JP', sans-serif;
    color: #1a1a2e; font-size: 10.5pt; line-height: 1.6;
    -webkit-print-color-adjust: exact; print-color-adjust: exact;
  }
  .report { max-width: 700px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; border-bottom: 3px solid #4f8cff; padding-bottom: 10px; margin-bottom: 18px; }
  .header-left h1 { font-size: 16pt; color: #4f8cff; }
  .header-left .subtitle { font-size: 8.5pt; color: #666; }
  .header-right { text-align: right; font-size: 9pt; color: #666; }
  .header-right .date { font-size: 11pt; color: #333; font-weight: 600; }
  .section { margin-bottom: 18px; break-inside: avoid; }
  .section-title { font-size: 12pt; font-weight: 700; color: #333; border-left: 4px solid #4f8cff; padding-left: 8px; margin-bottom: 10px; }
  .kpi-row { display: flex; gap: 12px; margin-bottom: 14px; }
  .kpi-card { flex: 1; background: #f8f9fc; border-radius: 8px; padding: 12px; text-align: center; }
  .kpi-value { font-size: 20pt; font-weight: 800; color: #333; }
  .kpi-label { font-size: 8.5pt; color: #888; margin-top: 2px; }
  .kpi-sub { font-size: 8pt; color: #666; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
  th, td { padding: 7px 10px; border: 1px solid #e5e7eb; font-size: 9.5pt; text-align: center; }
  th { background: #f1f3f8; font-weight: 600; color: #444; }
  .disclaimer { margin-top: 20px; padding-top: 10px; border-top: 1px solid #e5e7eb; font-size: 7.5pt; color: #999; }
  .footer { margin-top: 12px; text-align: center; font-size: 7.5pt; color: #bbb; }
  @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="report">
  <div class="header">
    <div class="header-left">
      <h1>組織ストレスレポート</h1>
      <div class="subtitle">ミルケア（MiruCare）— 非接触バイタルモニタリング</div>
    </div>
    <div class="header-right">
      <div class="date">${dateStr}</div>
      <div>レポート出力日</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">期間比較（${lastMonthLabel} → ${thisMonthLabel}）</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value">${orgLast ?? '---'}</div>
        <div class="kpi-label">${lastMonthLabel}</div>
        <div class="kpi-sub">${orgLast != null ? stressStatus(orgLast).label : 'データなし'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${orgThis ?? '---'}</div>
        <div class="kpi-label">${thisMonthLabel}</div>
        <div class="kpi-sub">${orgThis != null ? stressStatus(orgThis).label : 'データなし'}</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value" style="color:${orgDiff != null ? (orgDiff < 0 ? '#22c55e' : orgDiff > 0 ? '#ef4444' : '#333') : '#999'}">${orgDiff != null ? `${orgDiff > 0 ? '+' : ''}${orgDiff}` : '---'}</div>
        <div class="kpi-label">前月比</div>
        <div class="kpi-sub">${orgDiff != null ? (orgDiff < 0 ? '改善' : orgDiff > 0 ? '悪化' : '変化なし') : ''}</div>
      </div>
    </div>

    <table>
      <thead><tr><th>部署</th><th>${lastMonthLabel}</th><th>${thisMonthLabel}</th><th>変化</th></tr></thead>
      <tbody>${comparisonRows}</tbody>
    </table>
  </div>

  ${sortedBench.length >= 2 ? `
  <div class="section">
    <div class="section-title">部署間ベンチマーク</div>
    ${generateBenchmarkSVG(sortedBench, benchAvg)}
    <table>
      <thead><tr><th>順位</th><th>部署</th><th>ストレススコア</th><th>組織平均との差</th></tr></thead>
      <tbody>${benchmarkRows}</tbody>
    </table>
    <p style="font-size:8pt;color:#888;margin-top:4px">※ 組織平均: ${benchAvg}（${sortedBench.length}部署の集計）</p>
  </div>
  ` : ''}

  ${teamRows.length >= 2 && (teamRows.some(t => t.lastAvg != null) && teamRows.some(t => t.thisAvg != null)) ? `
  <div class="section">
    <div class="section-title">部署別ストレス推移チャート</div>
    ${generateComparisonSVG(teamRows, lastMonthLabel, thisMonthLabel)}
  </div>
  ` : ''}

  <div class="section">
    <div class="section-title">計測状況</div>
    <div class="kpi-row">
      <div class="kpi-card">
        <div class="kpi-value">${totalCountThis}</div>
        <div class="kpi-label">${thisMonthLabel} 計測数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${teams.length}</div>
        <div class="kpi-label">部署数</div>
      </div>
      <div class="kpi-card">
        <div class="kpi-value">${benchTeams.length}</div>
        <div class="kpi-label">集計可能部署</div>
      </div>
    </div>
  </div>

  <div class="disclaimer">
    <p>※ 本レポートはウェルネス参考値を提供するものであり、医療機器による診断結果ではありません。</p>
    <p>※ 個人の計測データは含まれません。1日の計測者が5名未満の部署データは除外されます。</p>
    <p>※ カメラ映像は処理後に即時破棄され、外部サーバーへの送信は行われません。</p>
  </div>
  <div class="footer">ミルケア（MiruCare）— 組織ストレスレポート | ${dateStr}</div>
</div>

<script>window.onload = function() { setTimeout(function() { window.print(); }, 300); };</script>
</body>
</html>`;

  const w = window.open('', '_blank');
  if (!w) {
    alert('ポップアップがブロックされています。ブラウザの設定でポップアップを許可してください。');
    return;
  }
  w.document.write(html);
  w.document.close();
}

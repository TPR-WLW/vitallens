import { useState, useMemo } from 'react';
import {
  generateAllData,
  filterData,
  computeKPIs,
  computeMonthlyTrend,
  computeDeptSummary,
  computeStressDistribution,
  generateAlerts,
  downloadAdminCSV,
  DEPARTMENTS,
  MONTHS,
} from '../lib/dashboard-data.js';
import '../styles/dashboard.css';

// --- ROI計算 ---
function calcROI(employeeCount) {
  const mirucareCostAnnual = employeeCount * 500 * 12;
  const wearableAnnual = employeeCount * 3500 * 12 + employeeCount * 20000;
  const questionnaireCost = employeeCount * 1200;

  const mentalLeaveRate = 0.012;
  const avgLeaveCost = 4500000;
  const preventionRate = 0.15;
  const preventedLeaves = Math.round(employeeCount * mentalLeaveRate * preventionRate * 10) / 10;
  const savingsFromPrevention = Math.round(preventedLeaves * avgLeaveCost);

  const avgTurnoverCost = 3000000;
  const turnoverReduction = 0.005;
  const savedTurnover = Math.round(employeeCount * turnoverReduction * 10) / 10;
  const savingsFromTurnover = Math.round(savedTurnover * avgTurnoverCost);

  const totalSavings = savingsFromPrevention + savingsFromTurnover;
  const roi = Math.round(((totalSavings - mirucareCostAnnual) / mirucareCostAnnual) * 100);

  return {
    mirucareCostAnnual,
    wearableAnnual,
    questionnaireCost,
    savingsFromPrevention,
    savingsFromTurnover,
    totalSavings,
    preventedLeaves,
    savedTurnover,
    roi,
    costVsWearable: Math.round(((wearableAnnual - mirucareCostAnnual) / wearableAnnual) * 100),
  };
}

function formatYen(num) {
  if (num >= 10000) return `${Math.round(num / 10000)}万円`;
  return `${num.toLocaleString()}円`;
}

// --- PDF Export ---
function exportDashboardPDF(kpis, deptSummary, monthlyTrend) {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('ポップアップがブロックされました。ブラウザの設定を確認してください。');
    return;
  }
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;

  printWindow.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>ミルケア レポート — ${dateStr}</title>
<style>
body{font-family:'Hiragino Kaku Gothic ProN','Noto Sans JP',sans-serif;margin:40px;color:#1a1a2e;font-size:13px;line-height:1.6}
h1{font-size:20px;border-bottom:2px solid #4f8cff;padding-bottom:8px;margin-bottom:16px}
h2{font-size:15px;color:#4f8cff;margin-top:24px;margin-bottom:8px}
table{width:100%;border-collapse:collapse;margin-bottom:16px}
th,td{border:1px solid #ddd;padding:6px 10px;text-align:center;font-size:12px}
th{background:#f0f4ff;font-weight:600}
.summary-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.summary-item{background:#f8f9fc;border-radius:8px;padding:12px;text-align:center}
.summary-value{font-size:22px;font-weight:800;color:#4f8cff}
.summary-label{font-size:11px;color:#666;margin-top:4px}
.footer{margin-top:32px;font-size:11px;color:#999;border-top:1px solid #eee;padding-top:12px}
.status-good{color:#22c55e}.status-watch{color:#f59e0b}.status-alert{color:#ef4444}
@media print{body{margin:20px}button{display:none}}
</style></head><body>
<h1>ミルケア ストレスモニタリングレポート</h1>
<p>レポート日: ${dateStr}　｜　対象従業員数: ${kpis.totalMembers}名　｜　データ: デモ用サンプル</p>
<div class="summary-grid">
<div class="summary-item"><div class="summary-value">${kpis.avgStress}</div><div class="summary-label">全社平均ストレススコア</div></div>
<div class="summary-item"><div class="summary-value">${kpis.avgParticipation}%</div><div class="summary-label">参加率</div></div>
<div class="summary-item"><div class="summary-value">${kpis.avgHR}</div><div class="summary-label">平均心拍数 (BPM)</div></div>
<div class="summary-item"><div class="summary-value">${kpis.alertDepts}</div><div class="summary-label">要注意部署数</div></div>
</div>
<h2>部署別ストレス状況</h2>
<table><tr><th>部署</th><th>人数</th><th>平均ストレス</th><th>平均HR</th><th>RMSSD</th><th>SDNN</th><th>参加率</th><th>コンディション</th><th>状態</th></tr>
${deptSummary.map((d) => `<tr><td>${d.deptName}</td><td>${d.members}</td><td>${d.avgStress}</td><td>${d.avgHR}</td><td>${d.rmssd}ms</td><td>${d.sdnn}ms</td><td>${d.participation}%</td><td>${d.conditionScore}</td><td class="status-${d.status}">${d.status === 'good' ? '良好' : d.status === 'watch' ? '注意' : '要対応'}</td></tr>`).join('')}
</table>
<h2>月次推移</h2>
<table><tr><th>月</th>${monthlyTrend.map((m) => `<th>${m.label}</th>`).join('')}</tr>
<tr><td>平均ストレス</td>${monthlyTrend.map((m) => `<td>${m.avgStress}</td>`).join('')}</tr>
<tr><td>参加率</td>${monthlyTrend.map((m) => `<td>${m.avgParticipation}%</td>`).join('')}</tr>
<tr><td>コンディション</td>${monthlyTrend.map((m) => `<td>${m.avgCondition}</td>`).join('')}</tr></table>
<p class="footer">※ 本レポートはデモ用サンプルデータに基づくものです。実際のデータとは異なります。<br>※ 本サービスは医療機器ではありません。計測値は参考値としてご活用ください。<br>ミルケア（MiruCare）— mirucare.jp</p>
<button onclick="window.print()" style="margin-top:16px;padding:10px 24px;background:#4f8cff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">印刷 / PDF保存</button>
</body></html>`);
  printWindow.document.close();
}

// --- SVG Trend Chart Component ---
function TrendChartSVG({ data, dataKey, color, label }) {
  if (data.length === 0) return null;
  const W = 400, H = 120, PAD = 30, PADT = 10, PADB = 20;
  const vals = data.map((d) => d[dataKey]);
  const minV = Math.min(...vals) - 5;
  const maxV = Math.max(...vals) + 5;
  const rangeV = maxV - minV || 1;
  const stepX = (W - PAD * 2) / Math.max(data.length - 1, 1);

  const points = data.map((d, i) => ({
    x: PAD + i * stepX,
    y: PADT + (1 - (d[dataKey] - minV) / rangeV) * (H - PADT - PADB),
  }));

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${H - PADB} L${points[0].x},${H - PADB} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="dash-svg-chart" role="img" aria-label={label}>
      <defs>
        <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#grad-${dataKey})`} />
      <path d={linePath} fill="none" stroke={color} strokeWidth="2" strokeLinejoin="round" />
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={p.x} cy={p.y} r={i === points.length - 1 ? 4 : 2.5} fill={color} />
          <text x={p.x} y={H - 4} textAnchor="middle" fontSize="9" fill="#9ca3af">
            {data[i].label}
          </text>
          {i === points.length - 1 && (
            <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fontWeight="700" fill={color}>
              {vals[i]}
            </text>
          )}
        </g>
      ))}
    </svg>
  );
}

// --- Main Component ---
export default function DashboardMock({ onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [deptFilter, setDeptFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState('all');
  const [trendMetric, setTrendMetric] = useState('avgStress');
  const [roiEmployees, setRoiEmployees] = useState(500);

  // データ生成（一度だけ）
  const allData = useMemo(() => generateAllData(), []);

  // フィルタ適用 & 集計
  const filtered = useMemo(() => filterData(allData, { deptId: deptFilter, monthId: monthFilter }), [allData, deptFilter, monthFilter]);
  const kpis = useMemo(() => computeKPIs(filtered), [filtered]);
  const monthlyTrend = useMemo(() => computeMonthlyTrend(filterData(allData, { deptId: deptFilter })), [allData, deptFilter]);
  const deptSummary = useMemo(() => computeDeptSummary(filterData(allData, { monthId: monthFilter })), [allData, monthFilter]);
  const distribution = useMemo(() => computeStressDistribution(filtered), [filtered]);
  const alerts = useMemo(() => generateAlerts(deptSummary), [deptSummary]);

  const maxMonthlyVal = Math.max(...monthlyTrend.map((m) => m[trendMetric] || 0), 1);
  const roi = calcROI(roiEmployees);

  const trendColor = trendMetric === 'avgStress' ? '#4f8cff' : trendMetric === 'avgCondition' ? '#22c55e' : '#f59e0b';
  const trendLabel = trendMetric === 'avgStress' ? 'ストレス推移' : trendMetric === 'avgCondition' ? 'コンディション推移' : '参加率推移';

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dash-top-header">
        <div className="dash-top-inner">
          <button className="dash-back" onClick={onBack}>← 戻る</button>
          <h1>チームダッシュボード</h1>
          <span className="dash-top-badge">デモ</span>
        </div>
        <p className="dash-top-sub">匿名化・集計データのみ表示（5名以上の集計）。個人の特定はできません。</p>
      </header>

      {/* Tabs */}
      <div className="dash-tabs">
        <button className={`dash-tab ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
          概要
        </button>
        <button className={`dash-tab ${activeTab === 'roi' ? 'active' : ''}`} onClick={() => setActiveTab('roi')}>
          ROI試算
        </button>
      </div>

      <div className="dash-content">
        {activeTab === 'overview' && (
          <>
            {/* Filters */}
            <div className="dash-filters">
              <div className="dash-filter-group">
                <label className="dash-filter-label">部署</label>
                <select className="dash-filter-select" value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}>
                  <option value="all">全部署</option>
                  {DEPARTMENTS.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
              <div className="dash-filter-group">
                <label className="dash-filter-label">期間</label>
                <select className="dash-filter-select" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
                  <option value="all">全期間（6ヶ月）</option>
                  {MONTHS.map((m) => (
                    <option key={m.id} value={m.id}>{m.label}</option>
                  ))}
                </select>
              </div>
              {(deptFilter !== 'all' || monthFilter !== 'all') && (
                <button className="dash-filter-reset" onClick={() => { setDeptFilter('all'); setMonthFilter('all'); }}>
                  フィルタ解除
                </button>
              )}
            </div>

            {/* KPI Row */}
            <div className="dash-kpi-row">
              <div className="dash-kpi">
                <div className="dash-kpi-value">{kpis.avgStress}</div>
                <div className="dash-kpi-label">平均ストレス</div>
                <div className={`dash-kpi-change ${kpis.avgStress <= 40 ? 'up' : kpis.avgStress <= 55 ? '' : 'down'}`}>
                  {kpis.avgStress <= 40 ? '良好' : kpis.avgStress <= 55 ? '注意' : '要対応'}
                </div>
              </div>
              <div className="dash-kpi">
                <div className="dash-kpi-value green">{kpis.avgParticipation}%</div>
                <div className="dash-kpi-label">参加率</div>
                <div className="dash-kpi-change up">目標: 90%</div>
              </div>
              <div className="dash-kpi">
                <div className="dash-kpi-value">{kpis.avgCondition}</div>
                <div className="dash-kpi-label">コンディション</div>
                <div className={`dash-kpi-change ${kpis.avgCondition >= 60 ? 'up' : ''}`}>
                  {kpis.avgCondition >= 60 ? '良好' : kpis.avgCondition >= 40 ? '普通' : '要改善'}
                </div>
              </div>
              <div className="dash-kpi">
                <div className="dash-kpi-value amber">{kpis.alertDepts}</div>
                <div className="dash-kpi-label">要注意部署</div>
                <div className="dash-kpi-change down">{kpis.alertDepts > 0 ? '対応検討中' : '問題なし'}</div>
              </div>
            </div>

            <div className="dash-two-col">
              {/* Monthly Trend (SVG) */}
              <div className="dash-panel">
                <div className="dash-panel-header">
                  <h3>月次推移</h3>
                  <select className="dash-metric-select" value={trendMetric} onChange={(e) => setTrendMetric(e.target.value)}>
                    <option value="avgStress">ストレス</option>
                    <option value="avgCondition">コンディション</option>
                    <option value="avgParticipation">参加率</option>
                  </select>
                </div>
                {monthlyTrend.length > 1 ? (
                  <TrendChartSVG data={monthlyTrend} dataKey={trendMetric} color={trendColor} label={trendLabel} />
                ) : (
                  <div className="trend-chart">
                    {monthlyTrend.map((m) => (
                      <div key={m.monthId} className="trend-col">
                        <div className="trend-bar-wrap">
                          <div
                            className={`trend-bar ${m[trendMetric] > 50 ? 'high' : m[trendMetric] > 40 ? 'medium' : ''}`}
                            style={{ height: `${(m[trendMetric] / maxMonthlyVal) * 100}%` }}
                          />
                        </div>
                        <span className="trend-label">{m.label}</span>
                        <span className="trend-value">{m[trendMetric]}</span>
                      </div>
                    ))}
                  </div>
                )}
                <p className="trend-note">
                  {deptFilter !== 'all'
                    ? `${DEPARTMENTS.find((d) => d.id === deptFilter)?.name || ''}の${trendLabel}`
                    : `全社の${trendLabel}（6ヶ月間）`}
                </p>
              </div>

              {/* Distribution */}
              <div className="dash-panel">
                <h3>ストレス分布</h3>
                <div className="dist-chart">
                  {distribution.map((d) => (
                    <div key={d.label} className="dist-row">
                      <span className="dist-label">{d.label}</span>
                      <div className="dist-bar-wrap">
                        <div className="dist-bar" style={{ width: `${d.pct}%`, background: d.color }} />
                      </div>
                      <span className="dist-pct">{d.pct}%</span>
                    </div>
                  ))}
                </div>
                <p className="trend-note">
                  {distribution.length > 0 && `${distribution[0].pct + distribution[1].pct}%がリラックス〜通常範囲内。`}
                </p>
              </div>
            </div>

            {/* Department Breakdown */}
            <div className="dash-panel">
              <h3>部署別ストレス状況</h3>
              <div className="team-table">
                <div className="team-row team-header">
                  <span>部署</span>
                  <span>人数</span>
                  <span>ストレス</span>
                  <span>コンディション</span>
                  <span>参加率</span>
                  <span>状態</span>
                </div>
                {deptSummary.map((d) => (
                  <div
                    key={d.deptId}
                    className={`team-row ${deptFilter === d.deptId ? 'team-row-active' : ''}`}
                    onClick={() => setDeptFilter(deptFilter === d.deptId ? 'all' : d.deptId)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === 'Enter' && setDeptFilter(deptFilter === d.deptId ? 'all' : d.deptId)}
                  >
                    <span className="team-name">{d.deptName}</span>
                    <span>{d.members}名</span>
                    <span className={d.avgStress <= 35 ? 'green' : d.avgStress <= 55 ? 'amber' : 'red'}>
                      {d.avgStress}
                    </span>
                    <span className={d.conditionScore >= 60 ? 'green' : d.conditionScore >= 40 ? 'amber' : 'red'}>
                      {d.conditionScore}
                    </span>
                    <span>{d.participation}%</span>
                    <span>
                      <span className={`status-badge status-${d.status === 'good' ? 'healthy' : d.status}`}>
                        {d.status === 'good' ? '良好' : d.status === 'watch' ? '注意' : '要対応'}
                      </span>
                    </span>
                  </div>
                ))}
              </div>
              <p className="trend-note" style={{ marginTop: 12 }}>部署をクリックするとフィルタできます。</p>
            </div>

            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="dash-panel">
                <h3>アラート・通知</h3>
                <div className="alerts-list">
                  {alerts.map((a, i) => (
                    <div key={i} className={`alert-item ${a.type === 'warning' ? 'alert-warn' : ''}`}>
                      <div className="alert-meta">
                        <span className="alert-time">{a.date}</span>
                        <span className="alert-team">{a.dept}</span>
                      </div>
                      <p>{a.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Export */}
            <div className="dash-panel dash-export-panel">
              <h3>レポートエクスポート</h3>
              <p className="export-desc">ダッシュボードデータをエクスポートできます。稟議書や報告書への添付にご利用ください。</p>
              <div className="dash-export-buttons">
                <button className="btn-export" onClick={() => exportDashboardPDF(kpis, deptSummary, monthlyTrend)}>
                  PDFレポート出力
                </button>
                <button className="btn-export btn-export-csv" onClick={() => downloadAdminCSV(deptSummary, monthlyTrend)}>
                  CSVデータ出力
                </button>
              </div>
            </div>

            {/* Privacy Banner */}
            <div className="privacy-banner">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="#6b7280">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
              </svg>
              <span>
                すべてのデータは匿名化・集計された状態で表示されます。
                個人の特定につながる情報は一切表示されません（5名以上の集計のみ）。
                映像データはブラウザ上で処理され、サーバーへの送信はありません。
              </span>
            </div>
          </>
        )}

        {activeTab === 'roi' && (
          <>
            {/* ROI Calculator */}
            <div className="dash-panel roi-panel">
              <h3>導入効果シミュレーション（ROI試算）</h3>
              <p className="roi-desc">
                従業員数を入力すると、ミルケア導入による年間コスト削減効果を試算できます。
              </p>

              <div className="roi-input-row">
                <label className="roi-label">従業員数</label>
                <input
                  type="number"
                  className="roi-input"
                  value={roiEmployees}
                  min={10}
                  max={10000}
                  step={10}
                  onChange={(e) => setRoiEmployees(Math.max(10, parseInt(e.target.value) || 10))}
                />
                <span className="roi-unit">名</span>
              </div>

              <h4 className="roi-section-title">年間コスト比較</h4>
              <div className="roi-comparison">
                <div className="roi-option roi-option-highlight">
                  <div className="roi-option-name">ミルケア</div>
                  <div className="roi-option-price">{formatYen(roi.mirucareCostAnnual)}</div>
                  <div className="roi-option-detail">¥500/人/月 × 12ヶ月</div>
                  <div className="roi-option-detail">継続モニタリング（毎日可能）</div>
                </div>
                <div className="roi-option">
                  <div className="roi-option-name">ウェアラブル</div>
                  <div className="roi-option-price">{formatYen(roi.wearableAnnual)}</div>
                  <div className="roi-option-detail">デバイス費用 + 月額利用料</div>
                  <div className="roi-option-detail">デバイス配布・管理コスト別途</div>
                </div>
                <div className="roi-option">
                  <div className="roi-option-name">質問票（外部委託）</div>
                  <div className="roi-option-price">{formatYen(roi.questionnaireCost)}</div>
                  <div className="roi-option-detail">年1回の実施のみ</div>
                  <div className="roi-option-detail">主観回答の限界あり</div>
                </div>
              </div>

              <div className="roi-savings-badge">
                ウェアラブル比 {roi.costVsWearable}% コスト削減
              </div>

              <h4 className="roi-section-title">早期発見による間接コスト削減効果（推計）</h4>
              <div className="roi-grid">
                <div className="roi-card">
                  <div className="roi-card-label">メンタル不調による休職予防</div>
                  <div className="roi-card-value">{formatYen(roi.savingsFromPrevention)}</div>
                  <div className="roi-card-detail">
                    推定予防件数: {roi.preventedLeaves}件/年<br />
                    （休職率1.2% × 早期発見15%予防 × 1件あたり450万円）
                  </div>
                </div>
                <div className="roi-card">
                  <div className="roi-card-label">離職率改善効果</div>
                  <div className="roi-card-value">{formatYen(roi.savingsFromTurnover)}</div>
                  <div className="roi-card-detail">
                    推定改善人数: {roi.savedTurnover}名/年<br />
                    （離職率0.5%改善 × 1名あたり採用・教育コスト300万円）
                  </div>
                </div>
              </div>

              <div className="roi-summary">
                <div className="roi-summary-row">
                  <span>ミルケア年間費用</span>
                  <span className="roi-cost">{formatYen(roi.mirucareCostAnnual)}</span>
                </div>
                <div className="roi-summary-row">
                  <span>推定コスト削減効果</span>
                  <span className="roi-savings">{formatYen(roi.totalSavings)}</span>
                </div>
                <div className="roi-summary-row roi-summary-total">
                  <span>投資対効果（ROI）</span>
                  <span className="roi-roi-value">{roi.roi}%</span>
                </div>
              </div>

              <p className="roi-disclaimer">
                ※ 上記は一般的な統計データに基づく推計値です。実際の効果は企業の状況により異なります。<br />
                ※ 休職コストは厚生労働省調査等を参考に算出。離職コストは採用・教育費用の一般的水準を使用。
              </p>
            </div>

            {/* 健康経営 Value */}
            <div className="dash-panel">
              <h3>健康経営優良法人認定への貢献</h3>
              <div className="kenkou-grid">
                <div className="kenkou-item">
                  <div className="kenkou-check">✓</div>
                  <div>
                    <strong>従業員の健康状態の把握</strong>
                    <p>継続的なストレスモニタリングにより、認定要件を満たす客観的データを蓄積できます。</p>
                  </div>
                </div>
                <div className="kenkou-item">
                  <div className="kenkou-check">✓</div>
                  <div>
                    <strong>メンタルヘルス対策の実施</strong>
                    <p>ストレスの早期検知と部署別傾向分析により、予防的な対策が可能になります。</p>
                  </div>
                </div>
                <div className="kenkou-item">
                  <div className="kenkou-check">✓</div>
                  <div>
                    <strong>取り組みの定量的評価</strong>
                    <p>月次レポートにより、健康経営施策の効果を数値で証明できます。</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="privacy-banner">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="#6b7280">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
              </svg>
              <span>
                ROI試算は一般的な統計データに基づく参考値です。
                詳細なシミュレーションをご希望の場合は、お問い合わせください。
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

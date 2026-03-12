import { useState } from 'react';
import '../styles/dashboard.css';

// --- 日本企業向けモックデータ ---
const MOCK_DEPARTMENTS = [
  { name: '営業部', members: 45, avgStress: 38, avgHR: 72, rmssd: 35, sdnn: 41, participation: 89, status: 'good' },
  { name: '開発部', members: 62, avgStress: 52, avgHR: 75, rmssd: 28, sdnn: 33, participation: 78, status: 'watch' },
  { name: '人事部', members: 18, avgStress: 31, avgHR: 68, rmssd: 42, sdnn: 48, participation: 94, status: 'good' },
  { name: '経理部', members: 22, avgStress: 44, avgHR: 70, rmssd: 30, sdnn: 36, participation: 85, status: 'watch' },
  { name: 'カスタマーサポート部', members: 35, avgStress: 61, avgHR: 78, rmssd: 22, sdnn: 27, participation: 72, status: 'alert' },
  { name: '総務部', members: 15, avgStress: 28, avgHR: 66, rmssd: 45, sdnn: 50, participation: 92, status: 'good' },
];

const MOCK_MONTHLY = [
  { month: '10月', avgStress: 42, participation: 75, avgHR: 72 },
  { month: '11月', avgStress: 45, participation: 78, avgHR: 73 },
  { month: '12月', avgStress: 51, participation: 80, avgHR: 75 },
  { month: '1月', avgStress: 48, participation: 82, avgHR: 74 },
  { month: '2月', avgStress: 44, participation: 85, avgHR: 72 },
  { month: '3月', avgStress: 40, participation: 88, avgHR: 71 },
];

const MOCK_DISTRIBUTION = [
  { label: 'リラックス', pct: 32, color: 'var(--color-success)' },
  { label: '通常', pct: 38, color: 'var(--color-primary)' },
  { label: 'やや高い', pct: 22, color: 'var(--color-warning)' },
  { label: '高ストレス', pct: 8, color: 'var(--color-danger)' },
];

const MOCK_ALERTS = [
  { date: '3月12日', dept: 'カスタマーサポート部', message: '部門平均ストレスが閾値（55）を超過。休憩ローテーションの検討を推奨します。' },
  { date: '3月11日', dept: '開発部', message: 'リリース前の残業増加に伴い、ストレス上昇傾向を検出。勤務時間の確認を推奨します。' },
  { date: '3月10日', dept: '全社', message: '今月の参加率が88%に到達。目標の90%まであと2ポイントです。' },
];

function totalMembers(depts) {
  return depts.reduce((sum, d) => sum + d.members, 0);
}

function weightedAvg(depts, key) {
  const total = depts.reduce((sum, d) => sum + d.members, 0);
  return Math.round(depts.reduce((sum, d) => sum + d[key] * d.members, 0) / total);
}

// --- ROI計算 ---
function calcROI(employeeCount) {
  const mirucareCostMonthly = employeeCount * 500;
  const mirucareCostAnnual = mirucareCostMonthly * 12;

  // ウェアラブル比較
  const wearableDeviceCost = employeeCount * 20000; // 初期デバイス費用
  const wearableMonthly = employeeCount * 3500;
  const wearableAnnual = wearableMonthly * 12 + wearableDeviceCost;

  // 質問票（外部委託）比較
  const questionnaireCost = employeeCount * 1200; // 年1回

  // 休職予防効果（厚労省データに基づく推計）
  const mentalLeaveRate = 0.012; // 1.2%がメンタル不調で休職
  const avgLeaveCost = 4500000; // 休職1件あたりコスト（代替人員、業務影響含む）
  const preventionRate = 0.15; // 早期発見で15%予防
  const preventedLeaves = Math.round(employeeCount * mentalLeaveRate * preventionRate * 10) / 10;
  const savingsFromPrevention = Math.round(preventedLeaves * avgLeaveCost);

  // 離職率改善
  const avgTurnoverCost = 3000000; // 1人離職あたりの採用・教育コスト
  const turnoverReduction = 0.005; // 0.5%改善
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
  if (num >= 10000) {
    return `${Math.round(num / 10000)}万円`;
  }
  return `${num.toLocaleString()}円`;
}

// --- PDF Export ---
function exportResultsPDF() {
  // Generate a printable HTML window for result export
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('ポップアップがブロックされました。ブラウザの設定を確認してください。');
    return;
  }
  const now = new Date();
  const dateStr = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`;
  const depts = MOCK_DEPARTMENTS;
  const total = totalMembers(depts);
  const avgStress = weightedAvg(depts, 'avgStress');
  const avgParticipation = weightedAvg(depts, 'participation');

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
<p>レポート日: ${dateStr}　｜　対象従業員数: ${total}名　｜　データ: デモ用サンプル</p>
<div class="summary-grid">
<div class="summary-item"><div class="summary-value">${avgStress}</div><div class="summary-label">全社平均ストレススコア</div></div>
<div class="summary-item"><div class="summary-value">${avgParticipation}%</div><div class="summary-label">参加率</div></div>
<div class="summary-item"><div class="summary-value">${weightedAvg(depts, 'avgHR')}</div><div class="summary-label">平均心拍数 (BPM)</div></div>
<div class="summary-item"><div class="summary-value">${depts.filter(d => d.status === 'alert').length}</div><div class="summary-label">要注意部署数</div></div>
</div>
<h2>部署別ストレス状況</h2>
<table><tr><th>部署</th><th>人数</th><th>平均ストレス</th><th>平均HR</th><th>RMSSD</th><th>SDNN</th><th>参加率</th><th>状態</th></tr>
${depts.map(d => `<tr><td>${d.name}</td><td>${d.members}</td><td>${d.avgStress}</td><td>${d.avgHR}</td><td>${d.rmssd}ms</td><td>${d.sdnn}ms</td><td>${d.participation}%</td><td class="status-${d.status}">${d.status === 'good' ? '良好' : d.status === 'watch' ? '注意' : '要対応'}</td></tr>`).join('')}
</table>
<h2>月次推移</h2>
<table><tr><th>月</th>${MOCK_MONTHLY.map(m => `<th>${m.month}</th>`).join('')}</tr>
<tr><td>平均ストレス</td>${MOCK_MONTHLY.map(m => `<td>${m.avgStress}</td>`).join('')}</tr>
<tr><td>参加率</td>${MOCK_MONTHLY.map(m => `<td>${m.participation}%</td>`).join('')}</tr></table>
<p class="footer">※ 本レポートはデモ用サンプルデータに基づくものです。実際のデータとは異なります。<br>※ 本サービスは医療機器ではありません。計測値は参考値としてご活用ください。<br>ミルケア（MiruCare）— info@mirucare.jp</p>
<button onclick="window.print()" style="margin-top:16px;padding:10px 24px;background:#4f8cff;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:14px">印刷 / PDF保存</button>
</body></html>`);
  printWindow.document.close();
}

// --- Main Component ---
export default function DashboardMock({ onBack }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [roiEmployees, setRoiEmployees] = useState(500);
  const depts = MOCK_DEPARTMENTS;
  const total = totalMembers(depts);
  const avgStress = weightedAvg(depts, 'avgStress');
  const avgParticipation = weightedAvg(depts, 'participation');
  const avgHR = weightedAvg(depts, 'avgHR');
  const alertCount = depts.filter((d) => d.status === 'alert').length;
  const maxMonthlyStress = Math.max(...MOCK_MONTHLY.map((m) => m.avgStress), 1);

  const roi = calcROI(roiEmployees);

  return (
    <div className="dashboard">
      {/* Header */}
      <header className="dash-top-header">
        <div className="dash-top-inner">
          <button className="dash-back" onClick={onBack}>← 戻る</button>
          <h1>チームダッシュボード</h1>
          <span className="dash-top-badge">デモ</span>
        </div>
        <p className="dash-top-sub">匿名化・集計データのみ表示。個人の特定はできません。</p>
      </header>

      {/* Tabs */}
      <div className="dash-tabs">
        <button
          className={`dash-tab ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          概要
        </button>
        <button
          className={`dash-tab ${activeTab === 'roi' ? 'active' : ''}`}
          onClick={() => setActiveTab('roi')}
        >
          ROI試算
        </button>
      </div>

      <div className="dash-content">
        {activeTab === 'overview' && (
          <>
            {/* KPI Row */}
            <div className="dash-kpi-row">
              <div className="dash-kpi">
                <div className="dash-kpi-value">{avgStress}</div>
                <div className="dash-kpi-label">全社平均ストレス</div>
                <div className="dash-kpi-change">{avgStress <= 40 ? '良好' : avgStress <= 55 ? '注意' : '要対応'}</div>
              </div>
              <div className="dash-kpi">
                <div className="dash-kpi-value green">{avgParticipation}%</div>
                <div className="dash-kpi-label">参加率</div>
                <div className="dash-kpi-change up">目標: 90%</div>
              </div>
              <div className="dash-kpi">
                <div className="dash-kpi-value">{avgHR}</div>
                <div className="dash-kpi-label">平均心拍数 (BPM)</div>
                <div className="dash-kpi-change">正常範囲</div>
              </div>
              <div className="dash-kpi">
                <div className="dash-kpi-value amber">{alertCount}</div>
                <div className="dash-kpi-label">要注意部署</div>
                <div className="dash-kpi-change down">{alertCount > 0 ? '対応検討中' : '問題なし'}</div>
              </div>
            </div>

            <div className="dash-two-col">
              {/* Monthly Trend */}
              <div className="dash-panel">
                <h3>月次ストレス推移</h3>
                <div className="trend-chart">
                  {MOCK_MONTHLY.map((m) => (
                    <div key={m.month} className="trend-col">
                      <div className="trend-bar-wrap">
                        <div
                          className={`trend-bar ${m.avgStress > 50 ? 'high' : m.avgStress > 40 ? 'medium' : ''}`}
                          style={{ height: `${(m.avgStress / maxMonthlyStress) * 100}%` }}
                        />
                      </div>
                      <span className="trend-label">{m.month}</span>
                      <span className="trend-value">{m.avgStress}</span>
                    </div>
                  ))}
                </div>
                <p className="trend-note">12月のストレス上昇: 年末業務集中期間。1月以降は改善傾向。</p>
              </div>

              {/* Distribution */}
              <div className="dash-panel">
                <h3>ストレス分布</h3>
                <div className="dist-chart">
                  {MOCK_DISTRIBUTION.map((d) => (
                    <div key={d.label} className="dist-row">
                      <span className="dist-label">{d.label}</span>
                      <div className="dist-bar-wrap">
                        <div
                          className="dist-bar"
                          style={{ width: `${d.pct}%`, background: d.color }}
                        />
                      </div>
                      <span className="dist-pct">{d.pct}%</span>
                    </div>
                  ))}
                </div>
                <p className="trend-note">
                  全従業員の70%がリラックス〜通常範囲内。
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
                  <span>参加率</span>
                  <span>状態</span>
                </div>
                {depts.map((d) => (
                  <div key={d.name} className="team-row">
                    <span className="team-name">{d.name}</span>
                    <span>{d.members}名</span>
                    <span className={d.avgStress <= 35 ? 'green' : d.avgStress <= 50 ? 'amber' : 'red'}>
                      {d.avgStress}
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
            </div>

            {/* Alerts */}
            <div className="dash-panel">
              <h3>アラート・通知</h3>
              <div className="alerts-list">
                {MOCK_ALERTS.map((a, i) => (
                  <div key={i} className={`alert-item ${i === 0 ? 'alert-warn' : ''}`}>
                    <div className="alert-meta">
                      <span className="alert-time">{a.date}</span>
                      <span className="alert-team">{a.dept}</span>
                    </div>
                    <p>{a.message}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Export */}
            <div className="dash-panel dash-export-panel">
              <h3>レポートエクスポート</h3>
              <p className="export-desc">現在のダッシュボードデータをPDF形式でエクスポートできます。稟議書や報告書への添付にご利用ください。</p>
              <button className="btn-export" onClick={exportResultsPDF}>
                レポートをPDF出力
              </button>
            </div>

            {/* Privacy Banner */}
            <div className="privacy-banner">
              <svg viewBox="0 0 20 20" width="16" height="16" fill="#6b7280">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" />
              </svg>
              <span>
                すべてのデータは匿名化・集計された状態で表示されます。
                個人の特定につながる情報は一切表示されません。
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

              {/* Cost Comparison */}
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

              {/* Hidden Cost Savings */}
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

              {/* ROI Summary */}
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

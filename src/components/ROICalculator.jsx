import { useState, useMemo } from 'react';
import '../styles/roi-calculator.css';

// ============================================================
// ROI Calculator Configuration
// All labels in Japanese for 稟議書 (budget approval) use
// ============================================================

const DEFAULT_INPUTS = {
  // 基本パラメータ
  employeeCount: { label: '従業員数', value: 500, min: 50, max: 10000, step: 50, unit: '名', tooltip: '対象従業員数（ストレスチェック義務化対象）' },
  avgAnnualSalary: { label: '平均年収', value: 5000000, min: 2000000, max: 12000000, step: 100000, unit: '円', tooltip: '厚生労働省 令和5年 賃金構造基本統計調査 中企業平均' },

  // リスク指標（業界平均デフォルト）
  mentalLeaveRate: { label: 'メンタル休職発生率', value: 1.2, min: 0.5, max: 5.0, step: 0.1, unit: '%', tooltip: '厚労省 令和4年労働安全衛生調査：過去1年でメンタル不調により1ヶ月以上休業した割合' },
  avgLeaveDuration: { label: '平均休職期間', value: 6, min: 1, max: 18, step: 1, unit: 'ヶ月', tooltip: '日本生産性本部調査 メンタル不調による平均休職期間' },
  mentalTurnoverRate: { label: 'メンタル起因離職率', value: 2.5, min: 0.5, max: 8.0, step: 0.1, unit: '%', tooltip: 'リクルートワークス研究所推計：メンタル不調に起因する年間離職率' },
  replacementCostRatio: { label: '採用・育成コスト', value: 50, min: 30, max: 100, step: 5, unit: '% (年収比)', tooltip: '日本人材マネジメント協会推計：1名の採用+育成コスト' },
  stressedWorkerRatio: { label: '高ストレス者割合', value: 20, min: 10, max: 40, step: 1, unit: '%', tooltip: '厚労省 ストレスチェック集計：高ストレスと判定される割合の全国平均' },
  presenteeismLoss: { label: 'プレゼンティーイズム損失', value: 15, min: 5, max: 30, step: 1, unit: '%', tooltip: 'WHO-HPQ準拠：ストレス状態での生産性低下率' },

  // MiruCare効果（保守的推計）
  stressReductionRate: { label: 'ストレス改善効果', value: 30, min: 10, max: 50, step: 5, unit: '%', tooltip: '継続的モニタリングによる高ストレス者の削減率（保守的推計）' },

  // 健康経営
  kenkoKeieiValue: { label: '健康経営認定価値', value: 3000000, min: 0, max: 10000000, step: 500000, unit: '円/年', tooltip: 'リクルート調査：採用ブランド力向上 + 日本政策投資銀行 金利優遇相当額' },
};

// 競合コスト定数
const COMPETITOR_COSTS = {
  mirucare: {
    label: 'MiruCare（ミルケア）',
    perPersonMonth: 500,
    setupPerPerson: 0,
    deviceCost: 0,
    frequency: '常時（リアルタイム）',
    method: 'カメラ（非接触）',
    features: ['リアルタイム測定', '部署別分析', 'アラート通知', 'トレンド可視化', '匿名・プライバシー保護'],
  },
  wearable: {
    label: 'ウェアラブル端末',
    perPersonMonth: 3500,
    setupPerPerson: 0,
    deviceCost: 20000,
    deviceLifeYears: 2,
    frequency: '常時',
    method: 'デバイス装着',
    features: ['心拍・活動量', '睡眠分析', 'デバイス管理が必要', '装着拒否リスク', '紛失・故障対応'],
  },
  questionnaire: {
    label: '質問票（外部委託）',
    perPersonYear: 1000,
    setupPerPerson: 0,
    deviceCost: 0,
    frequency: '年1回',
    method: '自己申告',
    features: ['法定義務対応', '年1回のスナップショット', '自己申告バイアス', 'リアルタイム性なし', '予防には不十分'],
  },
};

// ============================================================
// Calculation Engine
// ============================================================

function calculateROI(inputs) {
  const e = inputs.employeeCount.value;
  const salary = inputs.avgAnnualSalary.value;

  // --- 年間コスト比較 ---
  const mirucareAnnual = e * COMPETITOR_COSTS.mirucare.perPersonMonth * 12;
  const wearableAnnual = e * COMPETITOR_COSTS.wearable.perPersonMonth * 12
    + e * (COMPETITOR_COSTS.wearable.deviceCost / COMPETITOR_COSTS.wearable.deviceLifeYears);
  const questionnaireAnnual = e * COMPETITOR_COSTS.questionnaire.perPersonYear;

  const costComparison = {
    mirucare: { annual: mirucareAnnual, perPerson: mirucareAnnual / e },
    wearable: { annual: wearableAnnual, perPerson: wearableAnnual / e },
    questionnaire: { annual: questionnaireAnnual, perPerson: questionnaireAnnual / e },
    savingsVsWearable: wearableAnnual - mirucareAnnual,
    savingsVsWearablePct: Math.round(((wearableAnnual - mirucareAnnual) / wearableAnnual) * 100),
  };

  // --- 潜在コスト削減 ---
  const reductionRate = inputs.stressReductionRate.value / 100;
  const leaveRate = inputs.mentalLeaveRate.value / 100;
  const leaveDuration = inputs.avgLeaveDuration.value;
  const turnoverRate = inputs.mentalTurnoverRate.value / 100;
  const replCostRatio = inputs.replacementCostRatio.value / 100;
  const stressedRatio = inputs.stressedWorkerRatio.value / 100;
  const presenteeism = inputs.presenteeismLoss.value / 100;

  // 休職コスト削減
  // 休職中も社会保険料負担 + 代替要員コスト ≒ 給与の50%が企業負担
  const leaveCountBefore = e * leaveRate;
  const leaveCountReduced = leaveCountBefore * reductionRate;
  const leaveCostPerPerson = salary * 0.5 * (leaveDuration / 12);
  const leaveSavings = leaveCountReduced * leaveCostPerPerson;

  // 離職コスト削減
  const turnoverCountBefore = e * turnoverRate;
  const turnoverCountReduced = turnoverCountBefore * reductionRate;
  const turnoverCostPerPerson = salary * replCostRatio;
  const turnoverSavings = turnoverCountReduced * turnoverCostPerPerson;

  // プレゼンティーイズム回復
  const stressedBefore = e * stressedRatio;
  const stressedRecovered = stressedBefore * reductionRate;
  const presenteeismSavings = stressedRecovered * salary * presenteeism;

  // 健康経営認定価値
  const kenkoValue = inputs.kenkoKeieiValue.value;

  const hiddenSavings = {
    leave: {
      label: '休職コスト削減',
      tooltip: `年間休職者 ${leaveCountBefore.toFixed(1)}名 → ${(leaveCountBefore - leaveCountReduced).toFixed(1)}名（${leaveCountReduced.toFixed(1)}名分の削減）`,
      amount: Math.round(leaveSavings),
    },
    turnover: {
      label: '離職コスト削減',
      tooltip: `年間メンタル離職 ${turnoverCountBefore.toFixed(1)}名 → ${(turnoverCountBefore - turnoverCountReduced).toFixed(1)}名（採用+育成コスト ${formatJPY(turnoverCostPerPerson)}/名）`,
      amount: Math.round(turnoverSavings),
    },
    presenteeism: {
      label: 'プレゼンティーイズム改善',
      tooltip: `高ストレス者 ${stressedBefore.toFixed(0)}名中 ${stressedRecovered.toFixed(0)}名の生産性回復（${inputs.presenteeismLoss.value}%→通常水準）`,
      amount: Math.round(presenteeismSavings),
    },
    kenkoKeiei: {
      label: '健康経営認定効果',
      tooltip: '採用ブランド力向上・金利優遇・取引先評価向上の年間換算価値',
      amount: kenkoValue,
    },
  };

  const totalSavings = Object.values(hiddenSavings).reduce((sum, s) => sum + s.amount, 0);
  const netBenefit = totalSavings - mirucareAnnual;
  const roiPct = Math.round((netBenefit / mirucareAnnual) * 100);
  const paybackMonths = totalSavings > 0 ? Math.round((mirucareAnnual / totalSavings) * 12 * 10) / 10 : Infinity;

  return {
    costComparison,
    hiddenSavings,
    summary: {
      mirucareAnnualCost: mirucareAnnual,
      totalSavings,
      netBenefit,
      roiPct,
      paybackMonths,
      perEmployeeMonthlyBenefit: Math.round(netBenefit / e / 12),
    },
  };
}

// ============================================================
// Formatting Helpers
// ============================================================

function formatJPY(amount) {
  if (Math.abs(amount) >= 100000000) {
    return `${(amount / 100000000).toFixed(1)}億円`;
  }
  if (Math.abs(amount) >= 10000) {
    return `${Math.round(amount / 10000).toLocaleString()}万円`;
  }
  return `${amount.toLocaleString()}円`;
}

function formatJPYExact(amount) {
  return `${amount.toLocaleString()}円`;
}

// ============================================================
// React Component
// ============================================================

export default function ROICalculator({ onBack }) {
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [showDetail, setShowDetail] = useState(false);

  const updateInput = (key, newValue) => {
    setInputs((prev) => ({
      ...prev,
      [key]: { ...prev[key], value: Number(newValue) },
    }));
  };

  const result = useMemo(() => calculateROI(inputs), [inputs]);

  return (
    <div className="roi-calculator">
      <header className="roi-header">
        {onBack && <button className="roi-back" onClick={onBack}>← 戻る</button>}
        <div>
          <h1>導入効果シミュレーション</h1>
          <p className="roi-subtitle">稟議書用 ROI試算ツール ── 貴社の数値でシミュレーション可能</p>
        </div>
      </header>

      <div className="roi-content">
        {/* ── 入力パラメータ ── */}
        <section className="roi-section">
          <h2>基本情報の入力</h2>
          <p className="roi-section-note">スライダーで貴社の実情に合わせて調整してください。デフォルト値は業界平均です。</p>
          <div className="roi-inputs-grid">
            {Object.entries(inputs).map(([key, cfg]) => (
              <div key={key} className="roi-input-group" title={cfg.tooltip}>
                <label>{cfg.label}</label>
                <div className="roi-input-row">
                  <input
                    type="range"
                    min={cfg.min}
                    max={cfg.max}
                    step={cfg.step}
                    value={cfg.value}
                    onChange={(e) => updateInput(key, e.target.value)}
                  />
                  <span className="roi-input-value">
                    {key === 'avgAnnualSalary' || key === 'kenkoKeieiValue'
                      ? formatJPY(cfg.value)
                      : `${cfg.value.toLocaleString()}${cfg.unit}`}
                  </span>
                </div>
                <span className="roi-input-tooltip">{cfg.tooltip}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── コスト比較 ── */}
        <section className="roi-section">
          <h2>年間コスト比較</h2>
          <div className="roi-cost-table">
            <div className="roi-cost-row roi-cost-header">
              <span>ソリューション</span>
              <span>月額/人</span>
              <span>初期費用/人</span>
              <span>年間総額</span>
              <span>測定頻度</span>
            </div>
            {/* MiruCare */}
            <div className="roi-cost-row roi-cost-highlight">
              <span className="roi-cost-name">{COMPETITOR_COSTS.mirucare.label}</span>
              <span>{formatJPYExact(COMPETITOR_COSTS.mirucare.perPersonMonth)}</span>
              <span>0円</span>
              <span className="roi-cost-total">{formatJPY(result.costComparison.mirucare.annual)}</span>
              <span>{COMPETITOR_COSTS.mirucare.frequency}</span>
            </div>
            {/* Wearable */}
            <div className="roi-cost-row">
              <span className="roi-cost-name">{COMPETITOR_COSTS.wearable.label}</span>
              <span>{formatJPYExact(COMPETITOR_COSTS.wearable.perPersonMonth)}</span>
              <span>{formatJPYExact(COMPETITOR_COSTS.wearable.deviceCost)}/台</span>
              <span className="roi-cost-total">{formatJPY(result.costComparison.wearable.annual)}</span>
              <span>{COMPETITOR_COSTS.wearable.frequency}</span>
            </div>
            {/* Questionnaire */}
            <div className="roi-cost-row">
              <span className="roi-cost-name">{COMPETITOR_COSTS.questionnaire.label}</span>
              <span>--</span>
              <span>0円</span>
              <span className="roi-cost-total">{formatJPY(result.costComparison.questionnaire.annual)}</span>
              <span>{COMPETITOR_COSTS.questionnaire.frequency}</span>
            </div>
          </div>
          <div className="roi-savings-callout">
            ウェアラブルと比較して年間 <strong>{formatJPY(result.costComparison.savingsVsWearable)}</strong>（{result.costComparison.savingsVsWearablePct}%）のコスト削減
          </div>
        </section>

        {/* ── 潜在コスト削減 ── */}
        <section className="roi-section">
          <h2>導入による潜在的コスト削減効果</h2>
          <p className="roi-section-note">ストレスの早期発見・対応により期待される年間削減額</p>
          <div className="roi-savings-grid">
            {Object.entries(result.hiddenSavings).map(([key, saving]) => (
              <div key={key} className="roi-saving-card" title={saving.tooltip}>
                <div className="roi-saving-label">{saving.label}</div>
                <div className="roi-saving-amount">{formatJPY(saving.amount)}</div>
                <div className="roi-saving-detail">{saving.tooltip}</div>
              </div>
            ))}
          </div>
          <div className="roi-savings-total">
            年間 潜在削減効果合計：<strong>{formatJPY(result.summary.totalSavings)}</strong>
          </div>
        </section>

        {/* ── ROI サマリー ── */}
        <section className="roi-section roi-summary-section">
          <h2>投資対効果（ROI）サマリー</h2>
          <div className="roi-summary-grid">
            <div className="roi-summary-card">
              <div className="roi-summary-label">MiruCare 年間費用</div>
              <div className="roi-summary-value">{formatJPY(result.summary.mirucareAnnualCost)}</div>
              <div className="roi-summary-sub">{formatJPYExact(Math.round(result.summary.mirucareAnnualCost / inputs.employeeCount.value / 12))}/人/月</div>
            </div>
            <div className="roi-summary-card">
              <div className="roi-summary-label">年間削減効果</div>
              <div className="roi-summary-value green">{formatJPY(result.summary.totalSavings)}</div>
              <div className="roi-summary-sub">{formatJPYExact(Math.round(result.summary.totalSavings / inputs.employeeCount.value / 12))}/人/月相当</div>
            </div>
            <div className="roi-summary-card">
              <div className="roi-summary-label">純利益（年間）</div>
              <div className={`roi-summary-value ${result.summary.netBenefit >= 0 ? 'green' : 'red'}`}>
                {result.summary.netBenefit >= 0 ? '+' : ''}{formatJPY(result.summary.netBenefit)}
              </div>
              <div className="roi-summary-sub">削減効果 - 導入費用</div>
            </div>
            <div className="roi-summary-card roi-summary-highlight">
              <div className="roi-summary-label">ROI</div>
              <div className={`roi-summary-value ${result.summary.roiPct >= 0 ? 'green' : 'red'}`}>
                {result.summary.roiPct >= 0 ? '+' : ''}{result.summary.roiPct}%
              </div>
              <div className="roi-summary-sub">投資回収期間：{result.summary.paybackMonths}ヶ月</div>
            </div>
          </div>
        </section>

        {/* ── 稟議書用テキスト ── */}
        <section className="roi-section">
          <h2>稟議書 記載例</h2>
          <button className="roi-toggle" onClick={() => setShowDetail(!showDetail)}>
            {showDetail ? '▼ 閉じる' : '▶ 稟議書テキストを表示'}
          </button>
          {showDetail && (
            <div className="roi-ringi-text">
              <h3>件名：ストレスモニタリングツール「MiruCare」導入の件</h3>
              <div className="roi-ringi-body">
                <p><strong>1. 目的</strong></p>
                <p>
                  従業員のメンタルヘルス不調の早期発見・予防体制を強化し、
                  休職・離職に伴う損失を削減するとともに、
                  2028年ストレスチェック制度拡充への対応を図る。
                </p>

                <p><strong>2. 概要</strong></p>
                <p>
                  MiruCare（ミルケア）は、PCカメラを用いた非接触型ストレスモニタリングツール。
                  心拍変動（HRV）をリアルタイムで解析し、部署単位の匿名ストレス傾向を可視化する。
                  デバイスの購入・配布が不要であり、既存のPC環境で即時導入可能。
                </p>

                <p><strong>3. 費用</strong></p>
                <p>
                  月額 {formatJPYExact(COMPETITOR_COSTS.mirucare.perPersonMonth)}/人（税別）
                  × {inputs.employeeCount.value}名 = 年間 {formatJPYExact(result.summary.mirucareAnnualCost)}（税別）
                </p>

                <p><strong>4. 期待効果</strong></p>
                <ul>
                  <li>休職コスト削減：年間 {formatJPY(result.hiddenSavings.leave.amount)}</li>
                  <li>離職コスト削減：年間 {formatJPY(result.hiddenSavings.turnover.amount)}</li>
                  <li>生産性向上（プレゼンティーイズム改善）：年間 {formatJPY(result.hiddenSavings.presenteeism.amount)}</li>
                  <li>健康経営認定取得による企業価値向上：年間 {formatJPY(result.hiddenSavings.kenkoKeiei.amount)}相当</li>
                </ul>
                <p>
                  <strong>投資対効果（ROI）：{result.summary.roiPct}%、投資回収期間：{result.summary.paybackMonths}ヶ月</strong>
                </p>

                <p><strong>5. 競合比較</strong></p>
                <p>
                  ウェアラブル端末（Fitbit/Garmin法人）と比較し、
                  年間 {formatJPY(result.costComparison.savingsVsWearable)}（{result.costComparison.savingsVsWearablePct}%）のコスト削減。
                  質問票方式（年1回）と異なり、リアルタイムでの傾向把握が可能。
                </p>

                <p><strong>6. リスクと対策</strong></p>
                <ul>
                  <li>プライバシー：映像はブラウザ内処理、サーバー送信なし。個人特定不可の匿名集計のみ</li>
                  <li>精度：医療機器ではないが、傾向把握には十分な精度（rPPG技術）</li>
                  <li>法令：ストレスチェック制度の補完ツールとして位置付け（代替ではない）</li>
                </ul>
              </div>
            </div>
          )}
        </section>

        {/* ── 前提条件注記 ── */}
        <div className="roi-disclaimer">
          <strong>※ 前提条件について</strong>
          <p>
            本試算は厚生労働省統計データ、日本生産性本部調査、WHO-HPQ等の公開データに基づく推計値です。
            実際の効果は導入環境・利用率・既存施策との組み合わせにより変動します。
            ストレス改善効果（{inputs.stressReductionRate.value}%）は保守的な推計値であり、
            継続的モニタリングの学術研究に基づきます。
          </p>
        </div>
      </div>
    </div>
  );
}

// Export calculation engine and constants for testing
export { calculateROI, DEFAULT_INPUTS, COMPETITOR_COSTS, formatJPY };

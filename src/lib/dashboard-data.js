/**
 * 管理者ダッシュボード — インタラクティブデータ生成・フィルタリング
 * Generates deterministic mock team data with department/period filtering.
 * Anonymized aggregation only (5名以上).
 */

import { computeConditionScores } from './emotion-fusion.js';

// --- 部署定義 ---
const DEPARTMENTS = [
  { id: 'sales', name: '営業部', members: 45 },
  { id: 'engineering', name: '開発部', members: 62 },
  { id: 'hr', name: '人事部', members: 18 },
  { id: 'finance', name: '経理部', members: 22 },
  { id: 'support', name: 'カスタマーサポート部', members: 35 },
  { id: 'admin', name: '総務部', members: 15 },
];

// --- 期間定義（6ヶ月分） ---
const MONTHS = [
  { id: '2025-10', label: '10月' },
  { id: '2025-11', label: '11月' },
  { id: '2025-12', label: '12月' },
  { id: '2026-01', label: '1月' },
  { id: '2026-02', label: '2月' },
  { id: '2026-03', label: '3月' },
];

// --- 決定論的シード乱数（再現可能） ---
function seededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return s / 0x7fffffff;
  };
}

// --- 部署ごとの基本特性（ストレス傾向） ---
const DEPT_PROFILES = {
  sales: { baseStress: 38, baseHR: 72, baseRmssd: 35, baseSdnn: 41, baseParticipation: 89 },
  engineering: { baseStress: 52, baseHR: 75, baseRmssd: 28, baseSdnn: 33, baseParticipation: 78 },
  hr: { baseStress: 31, baseHR: 68, baseRmssd: 42, baseSdnn: 48, baseParticipation: 94 },
  finance: { baseStress: 44, baseHR: 70, baseRmssd: 30, baseSdnn: 36, baseParticipation: 85 },
  support: { baseStress: 61, baseHR: 78, baseRmssd: 22, baseSdnn: 27, baseParticipation: 72 },
  admin: { baseStress: 28, baseHR: 66, baseRmssd: 45, baseSdnn: 50, baseParticipation: 92 },
};

// --- 月ごとの季節変動（12月にストレス上昇、3月に改善） ---
const SEASONAL_FACTOR = {
  '2025-10': 0,
  '2025-11': 3,
  '2025-12': 9,
  '2026-01': 6,
  '2026-02': 2,
  '2026-03': -2,
};

/**
 * 全データポイントを生成（部署×月のマトリクス）
 * @returns {Array<Object>} 各部署・月の集計データ
 */
export function generateAllData() {
  const data = [];
  const rng = seededRandom(42);

  for (const dept of DEPARTMENTS) {
    const profile = DEPT_PROFILES[dept.id];
    for (const month of MONTHS) {
      const seasonal = SEASONAL_FACTOR[month.id];
      const noise = (rng() - 0.5) * 6; // ±3のランダムノイズ

      const stress = Math.round(Math.max(10, Math.min(90, profile.baseStress + seasonal + noise)));
      const hr = Math.round(Math.max(55, Math.min(95, profile.baseHR + seasonal * 0.3 + (rng() - 0.5) * 4)));
      const rmssd = Math.round(Math.max(10, Math.min(60, profile.baseRmssd - seasonal * 0.5 + (rng() - 0.5) * 6)));
      const sdnn = Math.round(Math.max(10, Math.min(65, profile.baseSdnn - seasonal * 0.4 + (rng() - 0.5) * 6)));
      const pnn50 = Math.round(Math.max(3, Math.min(40, 15 + (rmssd - 30) * 0.5 + (rng() - 0.5) * 4)));
      const participation = Math.round(Math.max(50, Math.min(100, profile.baseParticipation + (rng() - 0.5) * 8)));

      // コンディションスコア算出
      const hrvData = {
        metrics: { rmssd, sdnn, pnn50, meanHR: hr, meanIBI: Math.round(60000 / hr) },
        stress: {
          score: stress,
          level: stress <= 35 ? 'low' : stress <= 55 ? 'moderate' : 'high',
          label: stress <= 35 ? '低い' : stress <= 55 ? '通常' : '高い',
          color: stress <= 35 ? '#22c55e' : stress <= 55 ? '#4f8cff' : '#f59e0b',
        },
      };
      const condition = computeConditionScores(hrvData, null);

      data.push({
        deptId: dept.id,
        deptName: dept.name,
        members: dept.members,
        monthId: month.id,
        monthLabel: month.label,
        stress,
        hr,
        rmssd,
        sdnn,
        pnn50,
        participation,
        conditionScore: condition.overall.score,
        tensionScore: condition.tension.score,
        vitalityScore: condition.vitality.score,
        balanceScore: condition.balance.score,
      });
    }
  }
  return data;
}

/**
 * フィルタ適用
 * @param {Array} allData - generateAllData()の結果
 * @param {Object} filters - { deptId: string|'all', monthId: string|'all' }
 * @returns {Array} フィルタされたデータ
 */
export function filterData(allData, filters) {
  return allData.filter((d) => {
    if (filters.deptId && filters.deptId !== 'all' && d.deptId !== filters.deptId) return false;
    if (filters.monthId && filters.monthId !== 'all' && d.monthId !== filters.monthId) return false;
    return true;
  });
}

/**
 * 集計KPIを算出（加重平均）
 * @param {Array} data - フィルタ済みデータ
 * @returns {Object} 集計KPI
 */
export function computeKPIs(data) {
  if (data.length === 0) {
    return { avgStress: 0, avgHR: 0, avgParticipation: 0, avgCondition: 0, totalMembers: 0, alertDepts: 0, deptCount: 0 };
  }

  const totalMembers = data.reduce((s, d) => s + d.members, 0);
  const weightedAvg = (key) => Math.round(data.reduce((s, d) => s + d[key] * d.members, 0) / totalMembers);

  // ユニーク部署のアラート数（最新月ベース）
  const latestMonth = data.reduce((latest, d) => (d.monthId > latest ? d.monthId : latest), data[0].monthId);
  const latestData = data.filter((d) => d.monthId === latestMonth);
  const alertDepts = new Set(latestData.filter((d) => d.stress > 55).map((d) => d.deptId)).size;

  return {
    avgStress: weightedAvg('stress'),
    avgHR: weightedAvg('hr'),
    avgParticipation: weightedAvg('participation'),
    avgCondition: weightedAvg('conditionScore'),
    totalMembers,
    alertDepts,
    deptCount: new Set(data.map((d) => d.deptId)).size,
  };
}

/**
 * 月次トレンドデータを算出
 * @param {Array} data - フィルタ済みデータ
 * @returns {Array} 月ごとの集計値
 */
export function computeMonthlyTrend(data) {
  const byMonth = {};
  for (const d of data) {
    if (!byMonth[d.monthId]) {
      byMonth[d.monthId] = { monthId: d.monthId, label: d.monthLabel, items: [] };
    }
    byMonth[d.monthId].items.push(d);
  }

  return MONTHS.filter((m) => byMonth[m.id]).map((m) => {
    const items = byMonth[m.id].items;
    const total = items.reduce((s, d) => s + d.members, 0);
    const wAvg = (key) => Math.round(items.reduce((s, d) => s + d[key] * d.members, 0) / total);
    return {
      monthId: m.id,
      label: m.label,
      avgStress: wAvg('stress'),
      avgHR: wAvg('hr'),
      avgParticipation: wAvg('participation'),
      avgCondition: wAvg('conditionScore'),
    };
  });
}

/**
 * 部署別サマリ（特定月 or 全期間平均）
 * @param {Array} data - フィルタ済みデータ
 * @returns {Array} 部署ごとの集計値
 */
export function computeDeptSummary(data) {
  const byDept = {};
  for (const d of data) {
    if (!byDept[d.deptId]) {
      byDept[d.deptId] = { deptId: d.deptId, deptName: d.deptName, members: d.members, items: [] };
    }
    byDept[d.deptId].items.push(d);
  }

  return DEPARTMENTS.filter((dept) => byDept[dept.id]).map((dept) => {
    const info = byDept[dept.id];
    const items = info.items;
    const avg = (key) => Math.round(items.reduce((s, d) => s + d[key], 0) / items.length);
    const avgStress = avg('stress');
    const status = avgStress <= 35 ? 'good' : avgStress <= 55 ? 'watch' : 'alert';
    return {
      deptId: dept.id,
      deptName: info.deptName,
      members: info.members,
      avgStress,
      avgHR: avg('hr'),
      rmssd: avg('rmssd'),
      sdnn: avg('sdnn'),
      participation: avg('participation'),
      conditionScore: avg('conditionScore'),
      status,
    };
  });
}

/**
 * ストレス分布（全体の割合）
 * @param {Array} data - フィルタ済みデータ
 * @returns {Array} カテゴリ別割合
 */
export function computeStressDistribution(data) {
  if (data.length === 0) return [];

  const total = data.reduce((s, d) => s + d.members, 0);
  let relaxed = 0, normal = 0, elevated = 0, high = 0;

  for (const d of data) {
    if (d.stress <= 25) relaxed += d.members;
    else if (d.stress <= 45) normal += d.members;
    else if (d.stress <= 60) elevated += d.members;
    else high += d.members;
  }

  const pct = (v) => Math.round((v / total) * 100);
  // 端数調整
  const pcts = [pct(relaxed), pct(normal), pct(elevated), pct(high)];
  const diff = 100 - pcts.reduce((a, b) => a + b, 0);
  // 最大カテゴリに差分を加算
  const maxIdx = pcts.indexOf(Math.max(...pcts));
  pcts[maxIdx] += diff;

  return [
    { label: 'リラックス', pct: pcts[0], color: 'var(--color-success)' },
    { label: '通常', pct: pcts[1], color: 'var(--color-primary)' },
    { label: 'やや高い', pct: pcts[2], color: 'var(--color-warning)' },
    { label: '高ストレス', pct: pcts[3], color: 'var(--color-danger)' },
  ];
}

/**
 * アラート生成（閾値超過の部署を検出）
 * @param {Array} deptSummary - computeDeptSummary()の結果
 * @returns {Array} アラート一覧
 */
export function generateAlerts(deptSummary) {
  const alerts = [];
  const today = new Date();
  const fmt = (offset) => {
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return `${d.getMonth() + 1}月${d.getDate()}日`;
  };

  // 高ストレス部署
  const alertDepts = deptSummary.filter((d) => d.status === 'alert');
  for (const dept of alertDepts) {
    alerts.push({
      date: fmt(0),
      dept: dept.deptName,
      type: 'warning',
      message: `部門平均ストレスが閾値（55）を超過（${dept.avgStress}）。休憩ローテーションの検討を推奨します。`,
    });
  }

  // 注意部署
  const watchDepts = deptSummary.filter((d) => d.status === 'watch');
  for (const dept of watchDepts) {
    alerts.push({
      date: fmt(1),
      dept: dept.deptName,
      type: 'info',
      message: `ストレススコアが注意レベル（${dept.avgStress}）。継続モニタリングを推奨します。`,
    });
  }

  // 参加率低い部署
  const lowParticipation = deptSummary.filter((d) => d.participation < 80);
  for (const dept of lowParticipation) {
    alerts.push({
      date: fmt(2),
      dept: dept.deptName,
      type: 'info',
      message: `参加率が${dept.participation}%で目標（90%）を下回っています。参加促進施策を検討してください。`,
    });
  }

  return alerts.slice(0, 5); // 最大5件
}

/**
 * 管理者向けCSVエクスポート（集計データ）
 * @param {Array} deptSummary - computeDeptSummary()の結果
 * @param {Array} monthlyTrend - computeMonthlyTrend()の結果
 * @returns {string} CSV文字列
 */
export function exportAdminCSV(deptSummary, monthlyTrend) {
  const lines = [];

  // セクション1: 部署別サマリ
  lines.push('# 部署別サマリ');
  lines.push('部署名,人数,平均ストレス,平均心拍数(BPM),RMSSD(ms),SDNN(ms),参加率(%),コンディションスコア,状態');
  for (const d of deptSummary) {
    const statusLabel = d.status === 'good' ? '良好' : d.status === 'watch' ? '注意' : '要対応';
    lines.push([d.deptName, d.members, d.avgStress, d.avgHR, d.rmssd, d.sdnn, d.participation, d.conditionScore, statusLabel].join(','));
  }

  lines.push('');

  // セクション2: 月次推移
  lines.push('# 月次推移');
  lines.push('月,平均ストレス,平均心拍数(BPM),参加率(%),コンディションスコア');
  for (const m of monthlyTrend) {
    lines.push([m.label, m.avgStress, m.avgHR, m.avgParticipation, m.avgCondition].join(','));
  }

  return '\uFEFF' + lines.join('\n');
}

/**
 * 管理者CSVダウンロード
 */
export function downloadAdminCSV(deptSummary, monthlyTrend) {
  const csv = exportAdminCSV(deptSummary, monthlyTrend);
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const now = new Date();
  const filename = `mirucare_admin_${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}.csv`;
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// --- エクスポート定数 ---
export { DEPARTMENTS, MONTHS };

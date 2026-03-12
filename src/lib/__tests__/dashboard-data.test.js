import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateAllData,
  filterData,
  computeKPIs,
  computeMonthlyTrend,
  computeDeptSummary,
  computeStressDistribution,
  generateAlerts,
  exportAdminCSV,
  DEPARTMENTS,
  MONTHS,
} from '../dashboard-data.js';

describe('dashboard-data', () => {
  let allData;

  beforeEach(() => {
    allData = generateAllData();
  });

  // --- generateAllData ---
  describe('generateAllData', () => {
    it('部署×月のマトリクスを生成する（6部署×6ヶ月=36件）', () => {
      expect(allData).toHaveLength(DEPARTMENTS.length * MONTHS.length);
    });

    it('各データポイントに必須フィールドが含まれる', () => {
      const d = allData[0];
      expect(d).toHaveProperty('deptId');
      expect(d).toHaveProperty('deptName');
      expect(d).toHaveProperty('members');
      expect(d).toHaveProperty('monthId');
      expect(d).toHaveProperty('stress');
      expect(d).toHaveProperty('hr');
      expect(d).toHaveProperty('rmssd');
      expect(d).toHaveProperty('participation');
      expect(d).toHaveProperty('conditionScore');
      expect(d).toHaveProperty('tensionScore');
      expect(d).toHaveProperty('vitalityScore');
      expect(d).toHaveProperty('balanceScore');
    });

    it('ストレスが妥当な範囲内', () => {
      for (const d of allData) {
        expect(d.stress).toBeGreaterThanOrEqual(10);
        expect(d.stress).toBeLessThanOrEqual(90);
      }
    });

    it('決定論的で再現可能', () => {
      const second = generateAllData();
      expect(allData).toEqual(second);
    });
  });

  // --- filterData ---
  describe('filterData', () => {
    it('部署フィルタが機能する', () => {
      const result = filterData(allData, { deptId: 'sales' });
      expect(result).toHaveLength(MONTHS.length);
      expect(result.every((d) => d.deptId === 'sales')).toBe(true);
    });

    it('月フィルタが機能する', () => {
      const result = filterData(allData, { monthId: '2026-03' });
      expect(result).toHaveLength(DEPARTMENTS.length);
      expect(result.every((d) => d.monthId === '2026-03')).toBe(true);
    });

    it('部署+月の複合フィルタ', () => {
      const result = filterData(allData, { deptId: 'hr', monthId: '2026-01' });
      expect(result).toHaveLength(1);
      expect(result[0].deptId).toBe('hr');
      expect(result[0].monthId).toBe('2026-01');
    });

    it('allフィルタは全件返す', () => {
      const result = filterData(allData, { deptId: 'all', monthId: 'all' });
      expect(result).toHaveLength(allData.length);
    });
  });

  // --- computeKPIs ---
  describe('computeKPIs', () => {
    it('全データのKPIを計算', () => {
      const kpis = computeKPIs(allData);
      expect(kpis.totalMembers).toBeGreaterThan(0);
      expect(kpis.avgStress).toBeGreaterThan(0);
      expect(kpis.avgHR).toBeGreaterThan(0);
      expect(kpis.avgParticipation).toBeGreaterThan(0);
      expect(kpis.avgCondition).toBeGreaterThanOrEqual(0);
    });

    it('空データで安全にゼロを返す', () => {
      const kpis = computeKPIs([]);
      expect(kpis.totalMembers).toBe(0);
      expect(kpis.avgStress).toBe(0);
    });

    it('アラート部署数を正しく計算', () => {
      const kpis = computeKPIs(allData);
      expect(typeof kpis.alertDepts).toBe('number');
      expect(kpis.alertDepts).toBeGreaterThanOrEqual(0);
    });
  });

  // --- computeMonthlyTrend ---
  describe('computeMonthlyTrend', () => {
    it('月数分のトレンドデータを返す', () => {
      const trend = computeMonthlyTrend(allData);
      expect(trend).toHaveLength(MONTHS.length);
    });

    it('各月にラベルと集計値がある', () => {
      const trend = computeMonthlyTrend(allData);
      for (const m of trend) {
        expect(m).toHaveProperty('label');
        expect(m).toHaveProperty('avgStress');
        expect(m).toHaveProperty('avgCondition');
        expect(m).toHaveProperty('avgParticipation');
      }
    });

    it('単一部署フィルタでも機能する', () => {
      const filtered = filterData(allData, { deptId: 'engineering' });
      const trend = computeMonthlyTrend(filtered);
      expect(trend).toHaveLength(MONTHS.length);
    });
  });

  // --- computeDeptSummary ---
  describe('computeDeptSummary', () => {
    it('部署数分のサマリを返す', () => {
      const summary = computeDeptSummary(allData);
      expect(summary).toHaveLength(DEPARTMENTS.length);
    });

    it('各部署にステータスがある', () => {
      const summary = computeDeptSummary(allData);
      for (const d of summary) {
        expect(['good', 'watch', 'alert']).toContain(d.status);
      }
    });

    it('コンディションスコアが含まれる', () => {
      const summary = computeDeptSummary(allData);
      for (const d of summary) {
        expect(typeof d.conditionScore).toBe('number');
      }
    });
  });

  // --- computeStressDistribution ---
  describe('computeStressDistribution', () => {
    it('4カテゴリの分布を返す', () => {
      const dist = computeStressDistribution(allData);
      expect(dist).toHaveLength(4);
    });

    it('合計が100%になる', () => {
      const dist = computeStressDistribution(allData);
      const total = dist.reduce((s, d) => s + d.pct, 0);
      expect(total).toBe(100);
    });

    it('空データで空配列を返す', () => {
      expect(computeStressDistribution([])).toEqual([]);
    });
  });

  // --- generateAlerts ---
  describe('generateAlerts', () => {
    it('アラートを生成する', () => {
      const summary = computeDeptSummary(allData);
      const alerts = generateAlerts(summary);
      expect(Array.isArray(alerts)).toBe(true);
      expect(alerts.length).toBeLessThanOrEqual(5);
    });

    it('高ストレス部署がある場合warningアラートを含む', () => {
      const summary = computeDeptSummary(allData);
      const hasAlert = summary.some((d) => d.status === 'alert');
      const alerts = generateAlerts(summary);
      if (hasAlert) {
        expect(alerts.some((a) => a.type === 'warning')).toBe(true);
      }
    });
  });

  // --- exportAdminCSV ---
  describe('exportAdminCSV', () => {
    it('BOM付きCSVを生成する', () => {
      const summary = computeDeptSummary(allData);
      const trend = computeMonthlyTrend(allData);
      const csv = exportAdminCSV(summary, trend);
      expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it('部署別サマリセクションを含む', () => {
      const summary = computeDeptSummary(allData);
      const trend = computeMonthlyTrend(allData);
      const csv = exportAdminCSV(summary, trend);
      expect(csv).toContain('部署別サマリ');
      expect(csv).toContain('営業部');
    });

    it('月次推移セクションを含む', () => {
      const summary = computeDeptSummary(allData);
      const trend = computeMonthlyTrend(allData);
      const csv = exportAdminCSV(summary, trend);
      expect(csv).toContain('月次推移');
      expect(csv).toContain('10月');
    });
  });
});

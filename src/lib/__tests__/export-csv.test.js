import { describe, it, expect } from 'vitest';
import { entriesToCSV } from '../export-csv.js';

function makeEntry(overrides = {}) {
  return {
    id: 'test1',
    timestamp: '2026-03-12T10:30:00.000Z',
    data: {
      hr: 72,
      confidence: 0.85,
      duration: 180,
      samples: 540,
      isDemo: false,
      isSample: false,
      hrv: {
        metrics: { rmssd: 35, sdnn: 42, pnn50: 18 },
        stress: { level: 'moderate', label: '中程度', score: 45, color: '#f59e0b' },
        quality: { grade: 'B', message: '良好' },
      },
      emotionSummary: null,
      ...overrides,
    },
  };
}

describe('entriesToCSV', () => {
  it('generates CSV with BOM and headers', () => {
    const csv = entriesToCSV([makeEntry()]);
    expect(csv.charCodeAt(0)).toBe(0xFEFF); // BOM
    expect(csv).toContain('計測日時');
    expect(csv).toContain('心拍数(BPM)');
    expect(csv).toContain('RMSSD(ms)');
  });

  it('includes entry data in correct columns', () => {
    const csv = entriesToCSV([makeEntry()]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2); // header + 1 row
    const row = lines[1];
    expect(row).toContain('2026-03-12');
    expect(row).toContain('実計測');
    expect(row).toContain('72');
    expect(row).toContain('35');
    expect(row).toContain('42');
    expect(row).toContain('18');
  });

  it('marks demo entries correctly', () => {
    const csv = entriesToCSV([makeEntry({ isDemo: true })]);
    expect(csv).toContain('デモ');
  });

  it('marks sample entries correctly', () => {
    const csv = entriesToCSV([makeEntry({ isSample: true })]);
    expect(csv).toContain('サンプル');
  });

  it('handles entries without HRV data', () => {
    const csv = entriesToCSV([makeEntry({ hrv: null })]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(2);
    // Should not throw
  });

  it('handles multiple entries', () => {
    const entries = [makeEntry(), makeEntry({ hr: 80 })];
    entries[1].id = 'test2';
    const csv = entriesToCSV(entries);
    const lines = csv.split('\n');
    expect(lines.length).toBe(3); // header + 2 rows
  });

  it('escapes commas in values', () => {
    const entry = makeEntry();
    entry.data.hrv.stress.label = 'テスト,ラベル';
    const csv = entriesToCSV([entry]);
    expect(csv).toContain('"テスト,ラベル"');
  });

  it('returns BOM-only for empty entries', () => {
    const csv = entriesToCSV([]);
    const lines = csv.split('\n');
    expect(lines.length).toBe(1); // header only
  });
});

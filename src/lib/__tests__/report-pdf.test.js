/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { printReport } from '../report-pdf.js';

function makeResult(overrides = {}) {
  return {
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
    emotion: null,
    ...overrides,
  };
}

describe('printReport', () => {
  let mockWindow;

  beforeEach(() => {
    mockWindow = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
    };
    vi.spyOn(window, 'open').mockReturnValue(mockWindow);
  });

  it('opens a new window and writes HTML', () => {
    printReport(makeResult());
    expect(window.open).toHaveBeenCalledWith('', '_blank');
    expect(mockWindow.document.write).toHaveBeenCalledTimes(1);
    expect(mockWindow.document.close).toHaveBeenCalledTimes(1);
  });

  it('includes report title in HTML', () => {
    printReport(makeResult());
    const html = mockWindow.document.write.mock.calls[0][0];
    expect(html).toContain('コンディションチェック結果');
    expect(html).toContain('ミルケア');
  });

  it('includes heart rate in report', () => {
    printReport(makeResult({ hr: 80 }));
    const html = mockWindow.document.write.mock.calls[0][0];
    expect(html).toContain('80');
    expect(html).toContain('BPM');
  });

  it('includes HRV metrics', () => {
    printReport(makeResult());
    const html = mockWindow.document.write.mock.calls[0][0];
    expect(html).toContain('RMSSD');
    expect(html).toContain('35');
    expect(html).toContain('SDNN');
    expect(html).toContain('42');
  });

  it('includes stress level', () => {
    printReport(makeResult());
    const html = mockWindow.document.write.mock.calls[0][0];
    expect(html).toContain('ストレスレベル');
    expect(html).toContain('中程度');
  });

  it('shows demo badge for demo data', () => {
    printReport(makeResult({ isDemo: true }));
    const html = mockWindow.document.write.mock.calls[0][0];
    expect(html).toContain('デモデータ');
  });

  it('includes disclaimer', () => {
    printReport(makeResult());
    const html = mockWindow.document.write.mock.calls[0][0];
    expect(html).toContain('ウェルネス参考値');
    expect(html).toContain('医療機器');
  });

  it('uses provided timestamp', () => {
    printReport(makeResult(), '2026-01-15T14:30:00.000Z');
    const html = mockWindow.document.write.mock.calls[0][0];
    expect(html).toContain('2026年1月15日');
  });

  it('alerts if popup is blocked', () => {
    vi.spyOn(window, 'open').mockReturnValue(null);
    vi.spyOn(window, 'alert').mockImplementation(() => {});
    printReport(makeResult());
    expect(window.alert).toHaveBeenCalled();
  });

  it('handles result without HRV data', () => {
    printReport(makeResult({ hrv: null }));
    const html = mockWindow.document.write.mock.calls[0][0];
    expect(html).toContain('コンディションチェック結果');
    expect(html).not.toContain('RMSSD');
  });
});

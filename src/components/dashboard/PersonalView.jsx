import React, { useState, useEffect } from 'react';
import { dataService } from '../../services/index.js';
import { StatusBadge } from './AdminDashboard.jsx';

export default function PersonalView({ session }) {
  const [measurements, setMeasurements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState(30);
  const [editingMemoId, setEditingMemoId] = useState(null);
  const [memoText, setMemoText] = useState('');
  const [memoSaved, setMemoSaved] = useState(null);
  const [viewMode, setViewMode] = useState('list');
  const [calMonth, setCalMonth] = useState(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const from = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toISOString();
        const data = await dataService.getMeasurements({ userId: session.userId, from });
        setMeasurements(data);
      } catch (err) {
        console.error('Personal data load error:', err);
      }
      setLoading(false);
    })();
  }, [session.userId, period]);

  const avgStress = measurements.length > 0
    ? Math.round(measurements.reduce((s, m) => s + (m.stressScore || 0), 0) / measurements.length)
    : null;
  const avgHr = measurements.length > 0
    ? Math.round(measurements.reduce((s, m) => s + (m.hr || 0), 0) / measurements.length)
    : null;
  const avgRmssd = measurements.length > 0
    ? Math.round(measurements.reduce((s, m) => s + (m.hrv?.rmssd || 0), 0) / measurements.length * 10) / 10
    : null;

  const recentFive = measurements.slice(0, 5);

  // Trend: compare first half vs second half
  const half = Math.floor(measurements.length / 2);
  const trendLabel = (() => {
    if (measurements.length < 4) return null;
    const recent = measurements.slice(0, half);
    const older = measurements.slice(half);
    const recentAvg = recent.reduce((s, m) => s + (m.stressScore || 0), 0) / recent.length;
    const olderAvg = older.reduce((s, m) => s + (m.stressScore || 0), 0) / older.length;
    const diff = recentAvg - olderAvg;
    if (diff < -3) return { text: '改善傾向', color: '#22c55e' };
    if (diff > 3) return { text: '上昇傾向', color: '#ef4444' };
    return { text: '横ばい', color: '#9ca3af' };
  })();

  // Quality grade trend
  const qualityGradeValue = (g) => g === 'A' ? 3 : g === 'B' ? 2 : g === 'C' ? 1 : 0;
  const qualityTrend = (() => {
    const graded = measurements.filter(m => m.qualityGrade);
    if (graded.length < 4) return null;
    const h = Math.floor(graded.length / 2);
    const recentAvg = graded.slice(0, h).reduce((s, m) => s + qualityGradeValue(m.qualityGrade), 0) / h;
    const olderAvg = graded.slice(h).reduce((s, m) => s + qualityGradeValue(m.qualityGrade), 0) / (graded.length - h);
    const diff = recentAvg - olderAvg;
    if (diff > 0.3) return { text: '改善傾向', color: '#22c55e' };
    if (diff < -0.3) return { text: '低下傾向', color: '#ef4444' };
    return { text: '安定', color: '#9ca3af' };
  })();
  const qualityDist = (() => {
    const graded = measurements.filter(m => m.qualityGrade);
    if (graded.length === 0) return null;
    const counts = { A: 0, B: 0, C: 0 };
    graded.forEach(m => { if (counts[m.qualityGrade] != null) counts[m.qualityGrade]++; });
    const total = graded.length;
    return { A: counts.A, B: counts.B, C: counts.C, total };
  })();

  const handleExportPersonal = async () => {
    try {
      const csv = await dataService.exportUserCSV({ userId: session.userId });
      const bom = '\uFEFF';
      const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mirucare-personal-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  };

  const handlePdfReport = () => {
    const svgWidth = 600;
    const svgHeight = 200;
    const pad = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartW = svgWidth - pad.left - pad.right;
    const chartH = svgHeight - pad.top - pad.bottom;

    const sorted = [...measurements].reverse();
    const scores = sorted.map(m => m.stressScore ?? 0);
    const maxScore = 100;
    const minScore = 0;

    let svgContent = '';
    if (sorted.length >= 2) {
      [0, 25, 50, 75, 100].forEach(v => {
        const y = pad.top + chartH - ((v - minScore) / (maxScore - minScore)) * chartH;
        svgContent += `<line x1="${pad.left}" y1="${y}" x2="${svgWidth - pad.right}" y2="${y}" stroke="#e5e7eb" stroke-width="1"/>`;
        svgContent += `<text x="${pad.left - 8}" y="${y + 4}" text-anchor="end" font-size="11" fill="#6b7280">${v}</text>`;
      });

      const points = sorted.map((m, i) => {
        const x = pad.left + (i / (sorted.length - 1)) * chartW;
        const y = pad.top + chartH - ((scores[i] - minScore) / (maxScore - minScore)) * chartH;
        return { x, y, score: scores[i] };
      });

      const areaPath = `M${points[0].x},${pad.top + chartH} ` +
        points.map(p => `L${p.x},${p.y}`).join(' ') +
        ` L${points[points.length - 1].x},${pad.top + chartH} Z`;
      svgContent += `<path d="${areaPath}" fill="rgba(79,140,255,0.1)"/>`;

      const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
      svgContent += `<path d="${linePath}" fill="none" stroke="#4f8cff" stroke-width="2"/>`;

      points.forEach(p => {
        const color = p.score >= 70 ? '#ef4444' : p.score >= 40 ? '#f59e0b' : '#22c55e';
        svgContent += `<circle cx="${p.x}" cy="${p.y}" r="3" fill="${color}"/>`;
      });

      [0, Math.floor(sorted.length / 2), sorted.length - 1].forEach(i => {
        if (i < sorted.length) {
          const x = pad.left + (i / (sorted.length - 1)) * chartW;
          const label = new Date(sorted[i].timestamp).toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' });
          svgContent += `<text x="${x}" y="${svgHeight - 5}" text-anchor="middle" font-size="10" fill="#6b7280">${label}</text>`;
        }
      });
    } else if (sorted.length === 1) {
      svgContent += `<circle cx="${pad.left + chartW / 2}" cy="${pad.top + chartH / 2}" r="5" fill="#4f8cff"/>`;
      svgContent += `<text x="${pad.left + chartW / 2}" y="${pad.top + chartH / 2 - 12}" text-anchor="middle" font-size="12" fill="#333">${scores[0]}</text>`;
    } else {
      svgContent += `<text x="${svgWidth / 2}" y="${svgHeight / 2}" text-anchor="middle" font-size="13" fill="#9ca3af">データなし</text>`;
    }

    const trendSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${svgWidth}" height="${svgHeight}" viewBox="0 0 ${svgWidth} ${svgHeight}" style="width:100%;height:auto;max-width:600px;">${svgContent}</svg>`;

    const stressLbl = (s) => {
      if (s == null) return '---';
      if (s >= 70) return `${s} (高)`;
      if (s >= 40) return `${s} (中)`;
      return `${s} (低)`;
    };

    const measurementRows = measurements.map(m => {
      const ts = new Date(m.timestamp).toLocaleString('ja-JP', {
        year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      });
      const sc = (m.stressScore ?? 0) >= 70 ? '#dc2626' : (m.stressScore ?? 0) >= 40 ? '#d97706' : '#16a34a';
      return `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:0.85rem;white-space:nowrap;">${ts}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:0.85rem;color:${sc};font-weight:600;">${stressLbl(m.stressScore)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:0.85rem;">${m.hr ?? '---'} bpm</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:0.85rem;">${m.hrv?.rmssd ? (Math.round(m.hrv.rmssd * 10) / 10) + ' ms' : '---'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:0.85rem;">${m.qualityGrade || '---'}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #e5e7eb;font-size:0.82rem;color:#555;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${m.memo ? m.memo.replace(/</g, '&lt;').replace(/>/g, '&gt;') : ''}</td>
      </tr>`;
    }).join('');

    const today = new Date().toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });
    const periodFrom = new Date(Date.now() - period * 24 * 60 * 60 * 1000).toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric' });

    const html = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8"/>
<title>ミルケア 個人レポート</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: "Hiragino Kaku Gothic ProN", "Meiryo", "Yu Gothic", sans-serif; color: #1f2937; background: #fff; line-height: 1.6; }
  .rpt-header { text-align: center; padding-bottom: 16px; border-bottom: 3px solid #4f8cff; margin-bottom: 20px; }
  .rpt-header h1 { font-size: 1.4rem; color: #4f8cff; margin-bottom: 4px; }
  .rpt-header .sub { font-size: 0.85rem; color: #6b7280; }
  .rpt-meta { display: flex; justify-content: space-between; font-size: 0.82rem; color: #6b7280; margin-bottom: 20px; padding: 8px 12px; background: #f9fafb; border-radius: 6px; }
  .rpt-section { margin-bottom: 20px; page-break-inside: avoid; }
  .rpt-section h2 { font-size: 1.05rem; color: #374151; border-left: 4px solid #4f8cff; padding-left: 10px; margin-bottom: 10px; }
  .rpt-kpi { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
  .rpt-kpi-box { text-align: center; padding: 12px 8px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb; }
  .rpt-kpi-val { font-size: 1.5rem; font-weight: 800; color: #1f2937; }
  .rpt-kpi-lbl { font-size: 0.78rem; color: #6b7280; margin-top: 2px; }
  .rpt-kpi-unit { font-size: 0.72rem; color: #9ca3af; }
  .rpt-trend { display: inline-block; padding: 2px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: 600; }
  .rpt-chart { text-align: center; margin: 10px 0; }
  table { width: 100%; border-collapse: collapse; font-size: 0.85rem; }
  thead th { background: #f3f4f6; padding: 8px 10px; text-align: left; font-weight: 600; font-size: 0.8rem; color: #374151; border-bottom: 2px solid #d1d5db; }
  .rpt-footer { margin-top: 24px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 0.75rem; color: #9ca3af; text-align: center; }
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .rpt-kpi-box { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  }
</style>
</head>
<body>
  <div class="rpt-header">
    <h1>ミルケア（MiruCare）個人レポート</h1>
    <div class="sub">${session.userName || session.email || 'ユーザー'} 様</div>
  </div>
  <div class="rpt-meta">
    <span>対象期間: ${periodFrom} ～ ${today}</span>
    <span>出力日: ${today}</span>
  </div>
  <div class="rpt-section">
    <h2>サマリー</h2>
    <div class="rpt-kpi">
      <div class="rpt-kpi-box"><div class="rpt-kpi-val">${measurements.length}</div><div class="rpt-kpi-lbl">計測回数</div></div>
      <div class="rpt-kpi-box"><div class="rpt-kpi-val">${avgStress ?? '---'}</div><div class="rpt-kpi-lbl">平均ストレス</div></div>
      <div class="rpt-kpi-box"><div class="rpt-kpi-val">${avgHr ?? '---'}</div><div class="rpt-kpi-lbl">平均心拍数</div><div class="rpt-kpi-unit">bpm</div></div>
      <div class="rpt-kpi-box"><div class="rpt-kpi-val">${avgRmssd ?? '---'}</div><div class="rpt-kpi-lbl">平均RMSSD</div><div class="rpt-kpi-unit">ms</div></div>
    </div>
    ${trendLabel ? `<div style="margin-bottom:8px;">ストレス傾向: <span class="rpt-trend" style="background:${trendLabel.color}20;color:${trendLabel.color};">${trendLabel.text}</span></div>` : ''}
    ${qualityTrend ? `<div>計測品質傾向: <span class="rpt-trend" style="background:${qualityTrend.color}20;color:${qualityTrend.color};">${qualityTrend.text}</span></div>` : ''}
  </div>
  <div class="rpt-section">
    <h2>ストレストレンド</h2>
    <div class="rpt-chart">${trendSvg}</div>
  </div>
  <div class="rpt-section">
    <h2>計測データ一覧</h2>
    <table>
      <thead><tr><th>日時</th><th>ストレス</th><th>心拍数</th><th>RMSSD</th><th>品質</th><th>メモ</th></tr></thead>
      <tbody>${measurementRows}</tbody>
    </table>
  </div>
  <div class="rpt-footer">
    <p>※ 本データはウェルネス参考値です。医療機器による診断結果ではありません。</p>
    <p style="margin-top:4px;">ミルケア（MiruCare） — 生成日: ${today}</p>
  </div>
</body>
</html>`;

    const w = window.open('', '_blank', 'width=800,height=600');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.onload = () => { setTimeout(() => { w.print(); }, 300); };
    }
  };

  const handleExportSummary = () => {
    const lines = [];
    lines.push('【計測サマリー（メモ付き）】');
    lines.push(`期間: 直近${period}日間`);
    lines.push(`出力日: ${new Date().toLocaleDateString('ja-JP')}`);
    lines.push('');
    if (avgStress != null) lines.push(`平均ストレス: ${avgStress}`);
    if (avgHr != null) lines.push(`平均心拍数: ${avgHr} bpm`);
    if (avgRmssd != null) lines.push(`平均RMSSD: ${avgRmssd} ms`);
    lines.push(`計測回数: ${measurements.length}`);
    if (trendLabel) lines.push(`ストレス傾向: ${trendLabel.text}`);
    if (qualityTrend) lines.push(`計測品質傾向: ${qualityTrend.text}`);
    lines.push('');
    lines.push('■ 計測詳細');
    for (const m of measurements) {
      const ts = new Date(m.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
      lines.push(`${ts} | ストレス: ${m.stressScore ?? '---'} | HR: ${m.hr ?? '---'} | 品質: ${m.qualityGrade || '---'}`);
      if (m.memo) lines.push(`  メモ: ${m.memo}`);
    }
    lines.push('');
    lines.push('※ 本データはウェルネス参考値です。医療機器による診断結果ではありません。');
    lines.push('— ミルケア（MiruCare）');
    const text = lines.join('\n');
    const blob = new Blob(['\uFEFF' + text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mirucare-summary-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleMemoClick = (m) => {
    if (editingMemoId === m.id) {
      setEditingMemoId(null);
      return;
    }
    setEditingMemoId(m.id);
    setMemoText(m.memo || '');
    setMemoSaved(null);
  };

  const handleSaveMemo = async (measurementId) => {
    try {
      await dataService.updateMeasurementMemo(measurementId, memoText);
      setMemoSaved(measurementId);
      // Update local state
      setMeasurements(prev => prev.map(m =>
        m.id === measurementId ? { ...m, memo: memoText, memoUpdatedAt: new Date().toISOString() } : m
      ));
      setTimeout(() => setMemoSaved(null), 2000);
    } catch (err) {
      console.error('Memo save error:', err);
    }
  };

  // === Calendar helpers ===
  const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

  const buildCalendarGrid = (year, month) => {
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const rows = [];
    let row = new Array(firstDay).fill(null);
    for (let d = 1; d <= daysInMonth; d++) {
      row.push(d);
      if (row.length === 7) {
        rows.push(row);
        row = [];
      }
    }
    if (row.length > 0) {
      while (row.length < 7) row.push(null);
      rows.push(row);
    }
    return rows;
  };

  const getMeasurementsByDate = () => {
    const map = {};
    for (const m of measurements) {
      const d = new Date(m.timestamp);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      if (!map[key]) map[key] = [];
      map[key].push(m);
    }
    return map;
  };

  const getStressColor = (dayMeasurements) => {
    if (!dayMeasurements || dayMeasurements.length === 0) return null;
    const avg = dayMeasurements.reduce((s, m) => s + (m.stressScore || 0), 0) / dayMeasurements.length;
    if (avg <= 40) return '#22c55e';
    if (avg <= 70) return '#f59e0b';
    return '#ef4444';
  };

  const calGrid = buildCalendarGrid(calMonth.year, calMonth.month);
  const measurementMap = getMeasurementsByDate();

  const navigateMonth = (delta) => {
    setCalMonth(prev => {
      let m = prev.month + delta;
      let y = prev.year;
      if (m < 0) { m = 11; y--; }
      if (m > 11) { m = 0; y++; }
      return { year: y, month: m };
    });
    setSelectedDay(null);
  };

  const getDayKey = (day) => `${calMonth.year}-${calMonth.month}-${day}`;

  const selectedDayMeasurements = selectedDay
    ? measurementMap[getDayKey(selectedDay)] || []
    : [];

  const renderCalendar = () => (
    <div className="adm-cal">
      <div className="adm-cal-nav">
        <button className="adm-cal-nav-btn" onClick={() => navigateMonth(-1)} aria-label="前月">&lt;</button>
        <span className="adm-cal-nav-title">{calMonth.year}年{calMonth.month + 1}月</span>
        <button className="adm-cal-nav-btn" onClick={() => navigateMonth(1)} aria-label="次月">&gt;</button>
      </div>
      <div className="adm-cal-grid">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`adm-cal-weekday${i === 0 ? ' adm-cal-sun' : i === 6 ? ' adm-cal-sat' : ''}`}>{w}</div>
        ))}
        {calGrid.flat().map((day, idx) => {
          if (day === null) return <div key={`e${idx}`} className="adm-cal-cell adm-cal-cell-empty" />;
          const key = getDayKey(day);
          const dayMs = measurementMap[key];
          const color = getStressColor(dayMs);
          const count = dayMs ? dayMs.length : 0;
          const isToday = (() => {
            const now = new Date();
            return calMonth.year === now.getFullYear() && calMonth.month === now.getMonth() && day === now.getDate();
          })();
          const isSelected = selectedDay === day;
          return (
            <div
              key={`d${day}`}
              className={`adm-cal-cell${count > 0 ? ' adm-cal-cell-has' : ''}${isToday ? ' adm-cal-cell-today' : ''}${isSelected ? ' adm-cal-cell-selected' : ''}`}
              onClick={() => setSelectedDay(isSelected ? null : day)}
              role="button"
              tabIndex={0}
              aria-label={`${calMonth.month + 1}月${day}日${count > 0 ? ` ${count}件の計測` : ''}`}
            >
              <span className="adm-cal-day-num">{day}</span>
              {count > 0 && (
                <div className="adm-cal-indicator">
                  <span className="adm-cal-dot" style={{ background: color }} />
                  <span className="adm-cal-count">{count}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {selectedDay && (
        <div className="adm-cal-detail">
          <div className="adm-cal-detail-header">
            <span className="adm-cal-detail-title">{calMonth.month + 1}月{selectedDay}日の計測</span>
            <button className="adm-btn-ghost adm-btn-sm" onClick={() => setSelectedDay(null)}>閉じる</button>
          </div>
          {selectedDayMeasurements.length === 0 ? (
            <p className="adm-cal-detail-empty">この日の計測データはありません。</p>
          ) : (
            <table className="adm-table">
              <thead>
                <tr>
                  <th>時刻</th>
                  <th>ストレス</th>
                  <th>心拍数</th>
                  <th>品質</th>
                  <th>メモ</th>
                </tr>
              </thead>
              <tbody>
                {selectedDayMeasurements.map((m) => (
                  <tr key={m.id}>
                    <td>{new Date(m.timestamp).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</td>
                    <td><StatusBadge score={m.stressScore} /></td>
                    <td>{m.hr} bpm</td>
                    <td>{m.qualityGrade || '---'}</td>
                    <td>{m.memo || '---'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  );

  if (loading) return <div className="adm-view">読み込み中...</div>;

  return (
    <div className="adm-view">
      <h2 className="adm-view-title">マイデータ</h2>
      <p className="adm-view-desc">あなたの計測データの概要です。個人情報は他のメンバーや管理者には開示されません。</p>

      <div className="adm-cal-controls">
        <div className="adm-export-field" style={{ marginBottom: 0 }}>
          <label className="adm-export-label">表示期間</label>
          <select
            className="adm-export-select"
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value))}
            aria-label="表示期間"
          >
            <option value={7}>直近7日間</option>
            <option value={30}>直近30日間</option>
            <option value={90}>直近90日間</option>
          </select>
        </div>
        <div className="adm-cal-view-toggle">
          <button
            className={`adm-cal-toggle-btn${viewMode === 'list' ? ' active' : ''}`}
            onClick={() => setViewMode('list')}
          >
            リスト
          </button>
          <button
            className={`adm-cal-toggle-btn${viewMode === 'calendar' ? ' active' : ''}`}
            onClick={() => setViewMode('calendar')}
          >
            カレンダー
          </button>
        </div>
      </div>

      <div className="adm-kpi-row">
        <div className="adm-kpi-card">
          <div className="adm-kpi-value">{measurements.length}</div>
          <div className="adm-kpi-label">計測回数</div>
        </div>
        <div className="adm-kpi-card">
          <div className="adm-kpi-value">{avgStress ?? '---'}</div>
          <div className="adm-kpi-label">平均ストレス</div>
          {avgStress != null && <div className="adm-kpi-sub"><StatusBadge score={avgStress} /></div>}
        </div>
        <div className="adm-kpi-card">
          <div className="adm-kpi-value">{avgHr ?? '---'}</div>
          <div className="adm-kpi-label">平均心拍数</div>
          {avgHr != null && <div className="adm-kpi-sub">bpm</div>}
        </div>
        <div className="adm-kpi-card">
          <div className="adm-kpi-value">{avgRmssd ?? '---'}</div>
          <div className="adm-kpi-label">平均RMSSD</div>
          {avgRmssd != null && <div className="adm-kpi-sub">ms</div>}
        </div>
      </div>

      {trendLabel && (
        <div className="adm-personal-trend" style={{ color: trendLabel.color }}>
          ストレス傾向: {trendLabel.text}
        </div>
      )}

      {qualityDist && (
        <div className="adm-quality-trend-section">
          <h3 className="adm-section-title" style={{ marginTop: 16, marginBottom: 8 }}>計測品質トレンド</h3>
          <div className="adm-quality-bar">
            {qualityDist.A > 0 && (
              <div className="adm-quality-seg adm-quality-a" style={{ width: `${(qualityDist.A / qualityDist.total) * 100}%` }} title={`A: ${qualityDist.A}件`}>
                A: {qualityDist.A}
              </div>
            )}
            {qualityDist.B > 0 && (
              <div className="adm-quality-seg adm-quality-b" style={{ width: `${(qualityDist.B / qualityDist.total) * 100}%` }} title={`B: ${qualityDist.B}件`}>
                B: {qualityDist.B}
              </div>
            )}
            {qualityDist.C > 0 && (
              <div className="adm-quality-seg adm-quality-c" style={{ width: `${(qualityDist.C / qualityDist.total) * 100}%` }} title={`C: ${qualityDist.C}件`}>
                C: {qualityDist.C}
              </div>
            )}
          </div>
          {qualityTrend && (
            <div className="adm-personal-trend" style={{ color: qualityTrend.color, marginTop: 4 }}>
              品質傾向: {qualityTrend.text}
            </div>
          )}
        </div>
      )}

      {viewMode === 'calendar' && renderCalendar()}

      {viewMode === 'list' && recentFive.length > 0 && (
        <>
          <h3 className="adm-section-title" style={{ marginTop: 24 }}>直近の計測</h3>
          <table className="adm-table">
            <thead>
              <tr>
                <th>日時</th>
                <th>ストレス</th>
                <th>心拍数</th>
                <th>RMSSD</th>
                <th>品質</th>
                <th>メモ</th>
              </tr>
            </thead>
            <tbody>
              {recentFive.map((m) => (
                <React.Fragment key={m.id}>
                  <tr className="adm-member-clickable" onClick={() => handleMemoClick(m)} title="クリックしてメモを編集">
                    <td>{new Date(m.timestamp).toLocaleString('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</td>
                    <td><StatusBadge score={m.stressScore} /></td>
                    <td>{m.hr} bpm</td>
                    <td>{m.hrv?.rmssd ? `${Math.round(m.hrv.rmssd * 10) / 10} ms` : '---'}</td>
                    <td>{m.qualityGrade || '---'}</td>
                    <td>{m.memo ? '📝' : '---'}</td>
                  </tr>
                  {editingMemoId === m.id && (
                    <tr>
                      <td colSpan={6} style={{ padding: '8px 12px', border: 'none' }}>
                        <div className="adm-memo-section">
                          <textarea
                            className="adm-memo-textarea"
                            value={memoText}
                            onChange={(e) => setMemoText(e.target.value)}
                            placeholder="体調、環境、気分などを記録…"
                            maxLength={300}
                            aria-label="計測メモ"
                          />
                          <div style={{ display: 'flex', gap: 8, marginTop: 6, alignItems: 'center' }}>
                            <button className="adm-btn-primary adm-btn-sm" onClick={() => handleSaveMemo(m.id)}>
                              保存
                            </button>
                            <button className="adm-btn-ghost adm-btn-sm" onClick={() => setEditingMemoId(null)}>
                              閉じる
                            </button>
                            {memoSaved === m.id && <span className="adm-memo-saved">保存しました</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </>
      )}

      {viewMode === 'list' && measurements.length === 0 && (
        <div className="adm-empty-state">
          <p>まだ計測データがありません。</p>
          <p>サイドバーの「計測を開始」ボタンから計測を行ってください。</p>
        </div>
      )}

      <div style={{ marginTop: 24, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="adm-btn-secondary" onClick={handleExportPersonal} disabled={measurements.length === 0}>
          個人データをCSV出力
        </button>
        <button className="adm-btn-secondary" onClick={handleExportSummary} disabled={measurements.length === 0}>
          メモ付きサマリー出力
        </button>
        <button className="adm-btn-secondary adm-btn-pdf" onClick={handlePdfReport} disabled={measurements.length === 0}>
          PDFレポート出力
        </button>
      </div>

      <div className="adm-privacy-note" style={{ marginTop: 16 }}>
        ※ 本データはウェルネス参考値です。医療機器による診断結果ではありません。
      </div>
    </div>
  );
}

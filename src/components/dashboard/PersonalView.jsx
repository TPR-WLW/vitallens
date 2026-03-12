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

  if (loading) return <div className="adm-view">読み込み中...</div>;

  return (
    <div className="adm-view">
      <h2 className="adm-view-title">マイデータ</h2>
      <p className="adm-view-desc">あなたの計測データの概要です。個人情報は他のメンバーや管理者には開示されません。</p>

      <div className="adm-export-field">
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

      {recentFive.length > 0 && (
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

      {measurements.length === 0 && (
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
      </div>

      <div className="adm-privacy-note" style={{ marginTop: 16 }}>
        ※ 本データはウェルネス参考値です。医療機器による診断結果ではありません。
      </div>
    </div>
  );
}

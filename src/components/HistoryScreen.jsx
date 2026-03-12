import { useState, useRef, useCallback, useMemo } from 'react';
import { getEntries, deleteEntry, clearAll } from '../lib/history.js';
import { computeConditionScores } from '../lib/emotion-fusion.js';
import { downloadCSV } from '../lib/export-csv.js';
import { printReport } from '../lib/report-pdf.js';

/**
 * 計測履歴画面 — 過去の計測結果一覧 + トレンドチャート
 */
/**
 * フィルタ条件に基づいてエントリを絞り込む
 */
function applyFilters(entries, { dateFrom, dateTo, type, stress }) {
  return entries.filter((entry) => {
    // 日付範囲フィルタ
    if (dateFrom) {
      const entryDate = new Date(entry.timestamp).toISOString().slice(0, 10);
      if (entryDate < dateFrom) return false;
    }
    if (dateTo) {
      const entryDate = new Date(entry.timestamp).toISOString().slice(0, 10);
      if (entryDate > dateTo) return false;
    }

    // タイプフィルタ
    if (type === 'real' && (entry.data.isDemo || entry.data.isSample)) return false;
    if (type === 'demo' && !entry.data.isDemo) return false;
    if (type === 'sample' && !entry.data.isSample) return false;

    // ストレスレベルフィルタ
    if (stress !== 'all') {
      const score = entry.data.hrv?.stress?.score;
      if (score == null) return false;
      if (stress === 'good' && score > 35) return false;
      if (stress === 'caution' && (score <= 35 || score > 55)) return false;
      if (stress === 'action' && score <= 55) return false;
    }

    return true;
  });
}

export default function HistoryScreen({ onBack, onRestart }) {
  const [entries, setEntries] = useState(() => getEntries());
  const [confirmClear, setConfirmClear] = useState(false);
  const [trendPeriod, setTrendPeriod] = useState('all');
  const [compareIds, setCompareIds] = useState([]); // 比較対象のID（最大2）
  const [showCompare, setShowCompare] = useState(false);

  // フィルタ状態
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterStress, setFilterStress] = useState('all');

  const hasActiveFilter = filterDateFrom || filterDateTo || filterType !== 'all' || filterStress !== 'all';

  const resetFilters = () => {
    setFilterDateFrom('');
    setFilterDateTo('');
    setFilterType('all');
    setFilterStress('all');
  };

  // フィルタ済みエントリ
  const filteredEntries = useMemo(
    () => hasActiveFilter
      ? applyFilters(entries, { dateFrom: filterDateFrom, dateTo: filterDateTo, type: filterType, stress: filterStress })
      : entries,
    [entries, filterDateFrom, filterDateTo, filterType, filterStress, hasActiveFilter]
  );

  const handleDelete = (id) => {
    deleteEntry(id);
    setEntries(getEntries());
  };

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    clearAll();
    setEntries([]);
    setConfirmClear(false);
  };

  const toggleCompare = (id) => {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 2) return [prev[1], id]; // 最大2つ: 古い方を外す
      return [...prev, id];
    });
  };

  // 実計測のみ（デモ・サンプル除外）のエントリをトレンド表示用に抽出
  const realEntries = entries.filter((e) => !e.data.isDemo && !e.data.isSample);

  return (
    <div className="history-screen">
      <div className="history-content">
        {onBack && (
          <a className="back-link" href="#" onClick={(e) => { e.preventDefault(); onBack(); }}>
            &larr; トップに戻る
          </a>
        )}

        <h2>計測履歴</h2>

        {entries.length === 0 ? (
          <div className="history-empty">
            <p className="history-empty-text">まだ計測履歴がありません</p>
            <p className="history-empty-sub">計測を行うと、ここに結果が記録されます。</p>
            {onRestart && (
              <button className="btn-primary" onClick={onRestart}>
                計測を始める
              </button>
            )}
          </div>
        ) : (
          <>
            {/* トレンドチャート（実計測が2件以上ある場合のみ） */}
            {realEntries.length >= 2 && (
              <TrendChart entries={realEntries} period={trendPeriod} onPeriodChange={setTrendPeriod} />
            )}

            {/* フィルタバー */}
            <div className="history-filter-bar" role="search" aria-label="履歴フィルタ">
              <div className="history-filter-row">
                <div className="history-filter-group">
                  <label className="history-filter-label" htmlFor="filter-date-from">開始日</label>
                  <input
                    id="filter-date-from"
                    type="date"
                    className="history-filter-input"
                    value={filterDateFrom}
                    onChange={(e) => setFilterDateFrom(e.target.value)}
                  />
                </div>
                <div className="history-filter-group">
                  <label className="history-filter-label" htmlFor="filter-date-to">終了日</label>
                  <input
                    id="filter-date-to"
                    type="date"
                    className="history-filter-input"
                    value={filterDateTo}
                    onChange={(e) => setFilterDateTo(e.target.value)}
                  />
                </div>
              </div>
              <div className="history-filter-row">
                <div className="history-filter-group">
                  <label className="history-filter-label" htmlFor="filter-type">タイプ</label>
                  <select
                    id="filter-type"
                    className="history-filter-select"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">全て</option>
                    <option value="real">実計測</option>
                    <option value="demo">デモ</option>
                    <option value="sample">サンプル</option>
                  </select>
                </div>
                <div className="history-filter-group">
                  <label className="history-filter-label" htmlFor="filter-stress">ストレス</label>
                  <select
                    id="filter-stress"
                    className="history-filter-select"
                    value={filterStress}
                    onChange={(e) => setFilterStress(e.target.value)}
                  >
                    <option value="all">全て</option>
                    <option value="good">良好 (35以下)</option>
                    <option value="caution">注意 (36-55)</option>
                    <option value="action">要対応 (56以上)</option>
                  </select>
                </div>
                {hasActiveFilter && (
                  <button className="btn-filter-reset" onClick={resetFilters}>
                    リセット
                  </button>
                )}
              </div>
              {hasActiveFilter && (
                <div className="history-filter-count">
                  {filteredEntries.length}件表示中 / 全{entries.length}件
                </div>
              )}
            </div>

            {/* サマリー + エクスポート */}
            <div className="history-summary">
              <span>計測回数: {entries.length}回</span>
              {realEntries.length > 0 && (
                <span>（実計測: {realEntries.length}回）</span>
              )}
            </div>
            <div className="history-export">
              <button className="btn-export-csv" onClick={() => downloadCSV(entries)}>
                CSVエクスポート
              </button>
            </div>

            {/* 比較バー */}
            {compareIds.length > 0 && (
              <div className="history-compare-bar">
                <span>{compareIds.length}/2 件選択中</span>
                {compareIds.length === 2 && (
                  <button className="btn-compare" onClick={() => setShowCompare(true)}>
                    比較する
                  </button>
                )}
                <button className="btn-compare-clear" onClick={() => setCompareIds([])}>
                  選択解除
                </button>
              </div>
            )}

            {/* 一覧（20件以上で仮想化スクロール） */}
            {filteredEntries.length === 0 && hasActiveFilter ? (
              <div className="history-empty">
                <p className="history-empty-text">条件に一致する計測がありません</p>
                <p className="history-empty-sub">フィルタ条件を変更してください。</p>
              </div>
            ) : filteredEntries.length > 20 ? (
              <VirtualHistoryList
                entries={filteredEntries}
                onDelete={handleDelete}
                onPrintReport={(e) => printReport(e.data, e.timestamp)}
                compareIds={compareIds}
                onToggleCompare={toggleCompare}
              />
            ) : (
              <div className="history-list">
                {filteredEntries.map((entry) => (
                  <HistoryCard
                    key={entry.id}
                    entry={entry}
                    onDelete={handleDelete}
                    onPrintReport={(e) => printReport(e.data, e.timestamp)}
                    compareSelected={compareIds.includes(entry.id)}
                    onToggleCompare={() => toggleCompare(entry.id)}
                  />
                ))}
              </div>
            )}

            {/* 比較モーダル */}
            {showCompare && compareIds.length === 2 && (
              <CompareView
                entryA={entries.find((e) => e.id === compareIds[0])}
                entryB={entries.find((e) => e.id === compareIds[1])}
                onClose={() => setShowCompare(false)}
              />
            )}

            {/* 全削除 */}
            <div className="history-clear">
              <button
                className={`btn-clear ${confirmClear ? 'btn-clear-confirm' : ''}`}
                onClick={handleClearAll}
              >
                {confirmClear ? '本当に全て削除しますか？' : '履歴を全て削除'}
              </button>
              {confirmClear && (
                <button className="btn-clear-cancel" onClick={() => setConfirmClear(false)}>
                  キャンセル
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * 仮想スクロールリスト — 大量エントリ時のパフォーマンス最適化
 */
const ITEM_HEIGHT = 160; // 推定カード高さ(px)
const BUFFER = 4; // 上下バッファ数

function VirtualHistoryList({ entries, onDelete, onPrintReport, compareIds, onToggleCompare }) {
  const containerRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);

  const containerHeight = 600; // 表示エリア高さ
  const totalHeight = entries.length * ITEM_HEIGHT;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  const { startIdx, endIdx, offsetY } = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / ITEM_HEIGHT) - BUFFER);
    const visible = Math.ceil(containerHeight / ITEM_HEIGHT) + BUFFER * 2;
    const end = Math.min(entries.length, start + visible);
    return { startIdx: start, endIdx: end, offsetY: start * ITEM_HEIGHT };
  }, [scrollTop, entries.length]);

  const visibleEntries = entries.slice(startIdx, endIdx);

  return (
    <div
      ref={containerRef}
      className="history-list-virtual"
      style={{ height: containerHeight, overflowY: 'auto' }}
      onScroll={handleScroll}
    >
      <div className="history-list-spacer" style={{ height: totalHeight }}>
        <div className="history-list-viewport" style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleEntries.map((entry) => (
            <HistoryCard
              key={entry.id}
              entry={entry}
              onDelete={onDelete}
              onPrintReport={onPrintReport}
              compareSelected={compareIds.includes(entry.id)}
              onToggleCompare={() => onToggleCompare(entry.id)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * 個別の計測カード
 */
function HistoryCard({ entry, onDelete, onPrintReport, compareSelected, onToggleCompare }) {
  const [expanded, setExpanded] = useState(false);
  const { data, timestamp } = entry;
  const date = new Date(timestamp);
  const dateStr = `${date.getFullYear()}/${String(date.getMonth() + 1).padStart(2, '0')}/${String(date.getDate()).padStart(2, '0')}`;
  const timeStr = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

  const condition = computeConditionScores(
    data.hrv ? { metrics: data.hrv.metrics, stress: data.hrv.stress } : null,
    data.emotionSummary
  );

  const stressLabel = data.hrv?.stress?.label || '--';
  const stressColor = data.hrv?.stress?.color || '#9ca3af';
  const showCondition = condition.overall.score >= 0;

  const metrics = data.hrv?.metrics;
  const freqMetrics = data.hrv?.freqMetrics;
  const quality = data.hrv?.quality;
  const hasDetail = metrics && (metrics.sdnn != null || metrics.pnn50 != null || freqMetrics);

  return (
    <div className={`history-card${compareSelected ? ' history-card-selected' : ''}`}>
      <div className="history-card-header">
        <label className="history-compare-check" title="比較対象に選択">
          <input
            type="checkbox"
            checked={compareSelected}
            onChange={onToggleCompare}
            aria-label="比較対象に選択"
          />
        </label>
        <div className="history-card-date">
          <span className="history-date">{dateStr}</span>
          <span className="history-time">{timeStr}</span>
          {(data.isDemo || data.isSample) && (
            <span className="history-tag">
              {data.isDemo ? 'デモ' : 'サンプル'}
            </span>
          )}
        </div>
        <button
          className="history-delete-btn"
          onClick={() => onDelete(entry.id)}
          aria-label="削除"
        >
          &times;
        </button>
      </div>

      <div className="history-card-body">
        {/* コンディション */}
        {showCondition && (
          <div className="history-condition">
            <span className="history-condition-label">コンディション</span>
            <span className="history-condition-value" style={{ color: condition.overall.color }}>
              {condition.overall.label}
            </span>
          </div>
        )}

        {/* メトリクス行 */}
        <div className="history-metrics">
          <div className="history-metric">
            <span className="history-metric-value">{data.hr || '--'}</span>
            <span className="history-metric-unit">BPM</span>
          </div>
          <div className="history-metric">
            <span className="history-metric-value" style={{ color: stressColor }}>
              {stressLabel}
            </span>
            <span className="history-metric-unit">ストレス</span>
          </div>
          {metrics?.rmssd != null && (
            <div className="history-metric">
              <span className="history-metric-value">{metrics.rmssd}</span>
              <span className="history-metric-unit">RMSSD</span>
            </div>
          )}
        </div>

        {/* 展開ボタン + PDF */}
        <div className="history-card-actions">
          {hasDetail && (
            <button
              className="btn-history-expand"
              onClick={() => setExpanded(!expanded)}
              aria-expanded={expanded}
              aria-label={expanded ? '詳細を閉じる' : '詳細を表示'}
            >
              {expanded ? '閉じる ▲' : '詳細 ▼'}
            </button>
          )}
          <button
            className="btn-history-pdf"
            onClick={() => onPrintReport(entry)}
          >
            PDF
          </button>
        </div>

        {/* 展開時の詳細HRV指標 */}
        {expanded && hasDetail && (
          <div className="history-detail" aria-label="HRV詳細指標">
            <div className="history-detail-grid">
              {metrics.sdnn != null && (
                <div className="history-detail-item">
                  <span className="history-detail-value">{metrics.sdnn}</span>
                  <span className="history-detail-label">SDNN (ms)</span>
                </div>
              )}
              {metrics.pnn50 != null && (
                <div className="history-detail-item">
                  <span className="history-detail-value">{metrics.pnn50}</span>
                  <span className="history-detail-label">pNN50 (%)</span>
                </div>
              )}
              {metrics.meanHR != null && (
                <div className="history-detail-item">
                  <span className="history-detail-value">{metrics.meanHR}</span>
                  <span className="history-detail-label">平均HR</span>
                </div>
              )}
              {freqMetrics?.lfHfRatio != null && (
                <div className="history-detail-item">
                  <span className="history-detail-value">{freqMetrics.lfHfRatio.toFixed(2)}</span>
                  <span className="history-detail-label">LF/HF</span>
                </div>
              )}
              {freqMetrics?.lfNorm != null && (
                <div className="history-detail-item">
                  <span className="history-detail-value">{Math.round(freqMetrics.lfNorm)}</span>
                  <span className="history-detail-label">LF norm (%)</span>
                </div>
              )}
              {freqMetrics?.hfNorm != null && (
                <div className="history-detail-item">
                  <span className="history-detail-value">{Math.round(freqMetrics.hfNorm)}</span>
                  <span className="history-detail-label">HF norm (%)</span>
                </div>
              )}
              {freqMetrics?.respiratory?.respiratoryRate != null && (
                <div className="history-detail-item">
                  <span className="history-detail-value">{freqMetrics.respiratory.respiratoryRate.toFixed(1)}</span>
                  <span className="history-detail-label">呼吸数 (/分)</span>
                </div>
              )}
              {quality && (
                <div className="history-detail-item">
                  <span className="history-detail-value">{quality.grade}</span>
                  <span className="history-detail-label">品質グレード</span>
                </div>
              )}
            </div>
            {data.algorithm && (
              <div className="history-detail-algo">アルゴリズム: {data.algorithm}</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * SVG トレンドチャート — コンディションスコアの推移（期間フィルタ + ホバー日付表示）
 */
function TrendChart({ entries, period, onPeriodChange }) {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  // 期間でフィルタリング
  const now = Date.now();
  const cutoff = period === '1week' ? now - 7 * 86400000
    : period === '1month' ? now - 30 * 86400000
    : 0;

  // 古い順に並べ替え
  const sorted = [...entries].reverse();
  const filtered = cutoff > 0
    ? sorted.filter((e) => new Date(e.timestamp).getTime() >= cutoff)
    : sorted;
  const maxPoints = 20;
  const display = filtered.slice(-maxPoints);

  const scores = display.map((e) => {
    const condition = computeConditionScores(
      e.data.hrv ? { metrics: e.data.hrv.metrics, stress: e.data.hrv.stress } : null,
      e.data.emotionSummary
    );
    return condition.overall.score >= 0 ? condition.overall.score : null;
  });

  const validScores = scores.filter((s) => s !== null);
  if (validScores.length < 2) return (
    <div className="trend-chart-container">
      <h3 className="trend-title">コンディション推移</h3>
      <div className="trend-period-btns">
        {[['1week', '1週間'], ['1month', '1ヶ月'], ['all', '全期間']].map(([k, label]) => (
          <button key={k} className={`trend-period-btn${period === k ? ' active' : ''}`} onClick={() => onPeriodChange(k)}>{label}</button>
        ))}
      </div>
      <p className="trend-note">この期間のデータが不足しています</p>
    </div>
  );

  const W = 320;
  const H = 140;
  const PAD_X = 30;
  const PAD_Y = 16;
  const PAD_BOTTOM = 30;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y - PAD_BOTTOM;

  // ポイント座標を計算
  const points = [];
  let idx = 0;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] !== null) {
      const x = PAD_X + (idx / (validScores.length - 1)) * chartW;
      const y = PAD_Y + (1 - scores[i] / 100) * chartH;
      const d = new Date(display[i].timestamp);
      const dateLabel = `${d.getMonth() + 1}/${d.getDate()}`;
      const timeLabel = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
      points.push({ x, y, score: scores[i], dateLabel, timeLabel });
      idx++;
    }
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
  const areaPath = `${linePath} L${points[points.length - 1].x},${H - PAD_BOTTOM} L${points[0].x},${H - PAD_BOTTOM} Z`;
  const yGood = PAD_Y + (1 - 60 / 100) * chartH;
  const yWarn = PAD_Y + (1 - 40 / 100) * chartH;

  // X軸日付ラベル（最初・最後・中間を表示）
  const xLabels = [];
  if (points.length > 0) {
    xLabels.push(points[0]);
    if (points.length > 2) {
      xLabels.push(points[Math.floor(points.length / 2)]);
    }
    if (points.length > 1) {
      xLabels.push(points[points.length - 1]);
    }
  }

  return (
    <div className="trend-chart-container">
      <h3 className="trend-title">コンディション推移</h3>
      <div className="trend-period-btns">
        {[['1week', '1週間'], ['1month', '1ヶ月'], ['all', '全期間']].map(([k, label]) => (
          <button key={k} className={`trend-period-btn${period === k ? ' active' : ''}`} onClick={() => onPeriodChange(k)}>{label}</button>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="trend-chart-svg"
        preserveAspectRatio="xMidYMid meet"
        onMouseLeave={() => setHoveredIdx(null)}
      >
        <defs>
          <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#4f8cff" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#4f8cff" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* しきい値ライン */}
        <line x1={PAD_X} y1={yGood} x2={W - PAD_X} y2={yGood} stroke="#22c55e" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.4" />
        <line x1={PAD_X} y1={yWarn} x2={W - PAD_X} y2={yWarn} stroke="#f59e0b" strokeWidth="0.5" strokeDasharray="4,3" opacity="0.4" />
        <text x={PAD_X - 4} y={yGood + 3} textAnchor="end" fontSize="7" fill="#22c55e" opacity="0.6">良</text>
        <text x={PAD_X - 4} y={yWarn + 3} textAnchor="end" fontSize="7" fill="#f59e0b" opacity="0.6">注</text>

        {/* エリア */}
        <path d={areaPath} fill="url(#trendGrad)" />

        {/* ライン */}
        <path d={linePath} fill="none" stroke="#4f8cff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

        {/* X軸日付ラベル */}
        {xLabels.map((p, i) => (
          <text key={i} x={p.x} y={H - 8} textAnchor="middle" fontSize="7" fill="#9ca3af">
            {p.dateLabel}
          </text>
        ))}

        {/* ポイント + ホバー領域 */}
        {points.map((p, i) => (
          <g key={i} onMouseEnter={() => setHoveredIdx(i)} onTouchStart={() => setHoveredIdx(i)}>
            {/* 透明ヒット領域 */}
            <circle cx={p.x} cy={p.y} r="10" fill="transparent" />
            <circle
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 ? 4 : 2.5}
              fill={i === points.length - 1 ? '#4f8cff' : '#1a1d27'}
              stroke="#4f8cff"
              strokeWidth={i === points.length - 1 ? 2 : 1.5}
            />
          </g>
        ))}

        {/* ホバーツールチップ */}
        {hoveredIdx != null && points[hoveredIdx] && (() => {
          const p = points[hoveredIdx];
          const tooltipW = 58;
          const tooltipH = 28;
          let tx = p.x - tooltipW / 2;
          if (tx < 2) tx = 2;
          if (tx + tooltipW > W - 2) tx = W - 2 - tooltipW;
          const ty = p.y - tooltipH - 8;
          return (
            <g>
              <rect x={tx} y={ty} width={tooltipW} height={tooltipH} rx="4" fill="#252836" stroke="#4f8cff" strokeWidth="0.5" />
              <text x={tx + tooltipW / 2} y={ty + 11} textAnchor="middle" fontSize="8" fontWeight="600" fill="#4f8cff">
                {p.score}点
              </text>
              <text x={tx + tooltipW / 2} y={ty + 22} textAnchor="middle" fontSize="7" fill="#9ca3af">
                {p.dateLabel} {p.timeLabel}
              </text>
            </g>
          );
        })()}

        {/* 最新のスコアラベル（ホバーなしの場合のみ） */}
        {hoveredIdx == null && points.length > 0 && (
          <text
            x={points[points.length - 1].x}
            y={points[points.length - 1].y - 8}
            textAnchor="middle"
            fontSize="9"
            fontWeight="600"
            fill="#4f8cff"
          >
            {points[points.length - 1].score}
          </text>
        )}
      </svg>
      <p className="trend-note">直近{validScores.length}回の実計測</p>
    </div>
  );
}

/**
 * 比較ビュー — 2つの計測結果を並べて比較
 */
function CompareView({ entryA, entryB, onClose }) {
  if (!entryA || !entryB) return null;

  const formatDate = (ts) => {
    const d = new Date(ts);
    return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  };

  const condA = computeConditionScores(
    entryA.data.hrv ? { metrics: entryA.data.hrv.metrics, stress: entryA.data.hrv.stress } : null,
    entryA.data.emotionSummary
  );
  const condB = computeConditionScores(
    entryB.data.hrv ? { metrics: entryB.data.hrv.metrics, stress: entryB.data.hrv.stress } : null,
    entryB.data.emotionSummary
  );

  const rows = [
    { label: '日時', a: formatDate(entryA.timestamp), b: formatDate(entryB.timestamp) },
    { label: 'コンディション', a: condA.overall.score >= 0 ? `${condA.overall.label} (${condA.overall.score})` : '--', b: condB.overall.score >= 0 ? `${condB.overall.label} (${condB.overall.score})` : '--' },
    { label: '心拍数 (BPM)', a: entryA.data.hr || '--', b: entryB.data.hr || '--' },
    { label: 'ストレス', a: entryA.data.hrv?.stress?.label || '--', b: entryB.data.hrv?.stress?.label || '--' },
    { label: 'RMSSD (ms)', a: entryA.data.hrv?.metrics?.rmssd ?? '--', b: entryB.data.hrv?.metrics?.rmssd ?? '--' },
    { label: 'SDNN (ms)', a: entryA.data.hrv?.metrics?.sdnn ?? '--', b: entryB.data.hrv?.metrics?.sdnn ?? '--' },
    { label: 'pNN50 (%)', a: entryA.data.hrv?.metrics?.pnn50 ?? '--', b: entryB.data.hrv?.metrics?.pnn50 ?? '--' },
    { label: 'LF/HF', a: entryA.data.hrv?.freqMetrics?.lfHfRatio?.toFixed(2) ?? '--', b: entryB.data.hrv?.freqMetrics?.lfHfRatio?.toFixed(2) ?? '--' },
    { label: 'LF norm (%)', a: entryA.data.hrv?.freqMetrics?.lfNorm != null ? Math.round(entryA.data.hrv.freqMetrics.lfNorm) : '--', b: entryB.data.hrv?.freqMetrics?.lfNorm != null ? Math.round(entryB.data.hrv.freqMetrics.lfNorm) : '--' },
    { label: 'HF norm (%)', a: entryA.data.hrv?.freqMetrics?.hfNorm != null ? Math.round(entryA.data.hrv.freqMetrics.hfNorm) : '--', b: entryB.data.hrv?.freqMetrics?.hfNorm != null ? Math.round(entryB.data.hrv.freqMetrics.hfNorm) : '--' },
    { label: '呼吸数 (/分)', a: entryA.data.hrv?.freqMetrics?.respiratory?.respiratoryRate?.toFixed(1) ?? '--', b: entryB.data.hrv?.freqMetrics?.respiratory?.respiratoryRate?.toFixed(1) ?? '--' },
    { label: '品質', a: entryA.data.hrv?.quality?.grade ?? '--', b: entryB.data.hrv?.quality?.grade ?? '--' },
    { label: 'アルゴリズム', a: entryA.data.algorithm || '--', b: entryB.data.algorithm || '--' },
  ];

  // 数値差分の色付け（値が下がった場合は改善=緑、ストレスは逆）
  const diffColor = (a, b, lowerIsBetter = false) => {
    const na = parseFloat(a);
    const nb = parseFloat(b);
    if (isNaN(na) || isNaN(nb)) return '';
    if (na === nb) return '';
    const improved = lowerIsBetter ? nb < na : nb > na;
    return improved ? 'compare-improved' : 'compare-declined';
  };

  return (
    <div className="compare-overlay" role="dialog" aria-label="計測結果比較">
      <div className="compare-modal">
        <div className="compare-header">
          <h3>計測結果の比較</h3>
          <div className="compare-header-actions">
            <button className="btn-compare-print" onClick={() => window.print()} aria-label="印刷する">
              印刷する
            </button>
            <button className="compare-close" onClick={onClose} aria-label="閉じる">&times;</button>
          </div>
        </div>
        <div className="compare-table-wrap">
          <table className="compare-table">
            <thead>
              <tr>
                <th>指標</th>
                <th>計測A</th>
                <th>計測B</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label}>
                  <td className="compare-label">{row.label}</td>
                  <td>{row.a}</td>
                  <td className={diffColor(row.a, row.b)}>{row.b}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { getEntries, deleteEntry, clearAll } from '../lib/history.js';
import { computeConditionScores } from '../lib/emotion-fusion.js';

/**
 * 計測履歴画面 — 過去の計測結果一覧 + トレンドチャート
 */
export default function HistoryScreen({ onBack, onRestart }) {
  const [entries, setEntries] = useState(() => getEntries());
  const [confirmClear, setConfirmClear] = useState(false);

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
            {realEntries.length >= 2 && <TrendChart entries={realEntries} />}

            {/* サマリー */}
            <div className="history-summary">
              <span>計測回数: {entries.length}回</span>
              {realEntries.length > 0 && (
                <span>（実計測: {realEntries.length}回）</span>
              )}
            </div>

            {/* 一覧 */}
            <div className="history-list">
              {entries.map((entry) => (
                <HistoryCard key={entry.id} entry={entry} onDelete={handleDelete} />
              ))}
            </div>

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
 * 個別の計測カード
 */
function HistoryCard({ entry, onDelete }) {
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

  return (
    <div className="history-card">
      <div className="history-card-header">
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
          {data.hrv?.metrics?.rmssd != null && (
            <div className="history-metric">
              <span className="history-metric-value">{data.hrv.metrics.rmssd}</span>
              <span className="history-metric-unit">RMSSD</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * SVG トレンドチャート — ストレススコアの推移
 */
function TrendChart({ entries }) {
  // 古い順に並べ替え
  const sorted = [...entries].reverse();
  const maxPoints = 20;
  const display = sorted.slice(-maxPoints);

  const scores = display.map((e) => {
    const condition = computeConditionScores(
      e.data.hrv ? { metrics: e.data.hrv.metrics, stress: e.data.hrv.stress } : null,
      e.data.emotionSummary
    );
    return condition.overall.score >= 0 ? condition.overall.score : null;
  });

  const validScores = scores.filter((s) => s !== null);
  if (validScores.length < 2) return null;

  const W = 320;
  const H = 120;
  const PAD_X = 30;
  const PAD_Y = 16;
  const chartW = W - PAD_X * 2;
  const chartH = H - PAD_Y * 2;

  // ポイント座標を計算
  const points = [];
  let idx = 0;
  for (let i = 0; i < scores.length; i++) {
    if (scores[i] !== null) {
      const x = PAD_X + (idx / (validScores.length - 1)) * chartW;
      const y = PAD_Y + (1 - scores[i] / 100) * chartH;
      points.push({ x, y, score: scores[i], entry: display[i] });
      idx++;
    }
  }

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');

  // グラデーション用のエリアパス
  const areaPath = `${linePath} L${points[points.length - 1].x},${H - PAD_Y} L${points[0].x},${H - PAD_Y} Z`;

  // 色のしきい値ライン
  const yGood = PAD_Y + (1 - 60 / 100) * chartH;
  const yWarn = PAD_Y + (1 - 40 / 100) * chartH;

  return (
    <div className="trend-chart-container">
      <h3 className="trend-title">コンディション推移</h3>
      <svg viewBox={`0 0 ${W} ${H}`} className="trend-chart-svg" preserveAspectRatio="xMidYMid meet">
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

        {/* ポイント */}
        {points.map((p, i) => (
          <circle
            key={i}
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 4 : 2.5}
            fill={i === points.length - 1 ? '#4f8cff' : '#1a1d27'}
            stroke="#4f8cff"
            strokeWidth={i === points.length - 1 ? 2 : 1.5}
          />
        ))}

        {/* 最新のスコアラベル */}
        {points.length > 0 && (
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

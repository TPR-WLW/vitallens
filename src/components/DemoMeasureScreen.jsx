import { useState, useEffect, useRef, useCallback } from 'react';

const DEMO_DURATION = 20; // seconds — fast enough not to bore, long enough to feel real

// Simulate a realistic HR that stabilizes over time
function getSimulatedHR(elapsed) {
  if (elapsed < 3) return 0;
  // Start at ~82, settle to ~76 with slight variation
  const base = 76;
  const jitter = Math.sin(elapsed * 1.7) * 2 + Math.cos(elapsed * 0.9) * 1.5;
  const settling = Math.max(0, 6 - elapsed * 0.4);
  return Math.round(base + settling + jitter);
}

function getPhase(elapsed) {
  if (elapsed < 4) return 'calibrating';
  if (elapsed < 12) return 'measuring';
  return 'hrv';
}

function getStatus(phase) {
  switch (phase) {
    case 'calibrating': return 'キャリブレーション中...';
    case 'measuring': return '心拍を読み取っています...';
    case 'hrv': return 'HRV分析中 — そのままお待ちください...';
    default: return '準備中...';
  }
}

function getSignalQuality(elapsed) {
  if (elapsed < 3) return 0;
  return Math.min(0.85, 0.3 + elapsed * 0.04);
}

export default function DemoMeasureScreen({ onComplete, onCancel }) {
  const [elapsed, setElapsed] = useState(0);
  const startRef = useRef(null);
  const rafRef = useRef(null);
  const completedRef = useRef(false);

  const tick = useCallback(() => {
    if (!startRef.current) startRef.current = performance.now();
    const sec = (performance.now() - startRef.current) / 1000;
    setElapsed(Math.min(sec, DEMO_DURATION));

    if (sec >= DEMO_DURATION && !completedRef.current) {
      completedRef.current = true;
      onComplete();
      return;
    }
    rafRef.current = requestAnimationFrame(tick);
  }, [onComplete]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [tick]);

  const phase = getPhase(elapsed);
  const hr = getSimulatedHR(elapsed);
  const quality = getSignalQuality(elapsed);
  const progress = Math.min((elapsed / DEMO_DURATION) * 100, 100);
  const remainingSec = Math.max(0, Math.ceil(DEMO_DURATION - elapsed));
  const qualityLabel = quality > 0.4 ? '良好' : quality > 0.2 ? '普通' : '低い';

  return (
    <div className="measure-screen demo-measure-screen">
      {/* Animated visualization instead of camera */}
      <div className="demo-visual">
        {/* Face silhouette */}
        <svg className="demo-face" viewBox="0 0 200 260" fill="none">
          <ellipse
            cx="100" cy="120" rx="70" ry="90"
            stroke="var(--color-primary)"
            strokeWidth="2"
            strokeDasharray={phase === 'calibrating' ? '8 4' : 'none'}
            opacity={elapsed < 2 ? 0.4 : 0.7}
            className={elapsed >= 2 ? 'demo-face-detected' : ''}
          />
          {/* Eyes */}
          <ellipse cx="75" cy="105" rx="8" ry="5" fill="var(--color-primary)" opacity="0.4" />
          <ellipse cx="125" cy="105" rx="8" ry="5" fill="var(--color-primary)" opacity="0.4" />
          {/* Nose */}
          <line x1="100" y1="115" x2="100" y2="135" stroke="var(--color-primary)" strokeWidth="1.5" opacity="0.3" />
          {/* Mouth */}
          <path d="M85 155 Q100 162 115 155" stroke="var(--color-primary)" strokeWidth="1.5" opacity="0.3" fill="none" />
        </svg>

        {/* Animated pulse wave */}
        <div className="demo-pulse-container">
          <svg className="demo-pulse-wave" viewBox="0 0 400 80" preserveAspectRatio="none">
            <path
              className="demo-pulse-path"
              d="M0 40 L40 40 L50 40 L55 20 L60 60 L65 15 L70 55 L75 40 L80 40 L120 40 L130 40 L135 20 L140 60 L145 15 L150 55 L155 40 L160 40 L200 40 L210 40 L215 20 L220 60 L225 15 L230 55 L235 40 L240 40 L280 40 L290 40 L295 20 L300 60 L305 15 L310 55 L315 40 L320 40 L400 40"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              opacity={elapsed < 3 ? 0.3 : 0.8}
            />
          </svg>
        </div>

        {/* Demo badge */}
        <div className="demo-badge-overlay">
          <span className="demo-badge-label">デモモード</span>
          <span className="demo-badge-sub">カメラ不要・合成データで体験</span>
        </div>
      </div>

      {/* Same overlay structure as real MeasureScreen */}
      <div className="measure-overlay">
        <div className="measure-status">
          <span className="status-text">{getStatus(phase)}</span>
          {hr > 0 && (
            <span className="current-hr">
              <span className="hr-value">{hr}</span>
              <span className="hr-unit">BPM</span>
            </span>
          )}
        </div>

        <div className="phase-indicator">
          <span className={`phase-dot ${phase === 'calibrating' || phase === 'measuring' || phase === 'hrv' ? 'active' : ''}`} />
          <span className={`phase-dot ${phase === 'measuring' || phase === 'hrv' ? 'active' : ''}`} />
          <span className={`phase-dot ${phase === 'hrv' ? 'active' : ''}`} />
          <span className="phase-label">
            {phase === 'calibrating' && 'キャリブレーション'}
            {phase === 'measuring' && '心拍計測'}
            {phase === 'hrv' && 'HRV分析'}
          </span>
        </div>

        {elapsed >= 5 && (
          <div className="emotion-indicator">
            <span className={`emotion-dot ${elapsed >= 8 ? 'emotion-dot-active' : ''}`} />
            <span className="emotion-indicator-text">
              {elapsed < 8 ? '表情キャリブレーション中...' : '表情分析中'}
            </span>
          </div>
        )}

        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-info">
            <span className="time-remaining">残り {remainingSec}秒</span>
            <span className="signal-quality">信号: {qualityLabel}</span>
          </div>
        </div>

        <button className="btn-cancel" onClick={onCancel}>
          中止
        </button>
      </div>
    </div>
  );
}

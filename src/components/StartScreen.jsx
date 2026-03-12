import { useState, useEffect } from 'react';
import { getCount } from '../lib/history.js';

const CHECKLIST_ITEMS = [
  { id: 'lighting', text: '顔に均一な照明が当たっている（逆光・強い影なし）' },
  { id: 'position', text: 'カメラの正面に座っている' },
  { id: 'face', text: 'サングラス・マスクを外している' },
  { id: 'rest', text: 'リラックスした状態で安静にしている' },
];

export default function StartScreen({ onStart, onBack, onShowSample, onStartDemo, onShowHistory }) {
  const [cameraError, setCameraError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [quickMode, setQuickMode] = useState(true);
  const [checked, setChecked] = useState({});

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && onBack) {
        onBack();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onBack]);

  const handleStart = async () => {
    setLoading(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      onStart(quickMode, stream);
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setCameraError('カメラへのアクセスが拒否されました。カメラの使用を許可して再度お試しください。');
      } else if (err.name === 'NotFoundError') {
        setCameraError('カメラが見つかりません。カメラを接続して再度お試しください。');
      } else {
        setCameraError('カメラにアクセスできません。ブラウザの設定をご確認ください。');
      }
      setLoading(false);
    }
  };

  const toggleCheck = (id) => {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const durationLabel = quickMode ? '1分間' : '3分間';

  return (
    <div className="start-screen" role="main" aria-label="計測準備画面">
      <div className="start-content">
        {onBack && (
          <a
            className="back-link"
            href="#"
            onClick={(e) => { e.preventDefault(); onBack(); }}
            aria-label="トップページに戻る"
          >
            &larr; トップに戻る
          </a>
        )}

        <div className="logo" aria-hidden="true">
          <svg viewBox="0 0 48 48" width="64" height="64" fill="none">
            <circle cx="24" cy="24" r="22" stroke="#4f8cff" strokeWidth="3" />
            <path
              d="M24 14c-4 0-8 3.5-8 9s4 11 8 15c4-4 8-9 8-15s-4-9-8-9z"
              fill="#4f8cff"
              opacity="0.85"
            />
          </svg>
        </div>

        <h1>ミルケア</h1>
        <p className="subtitle">非接触バイタルモニタリング</p>

        <div className="mode-selector" role="radiogroup" aria-label="計測モード選択">
          <button
            className={`mode-btn ${quickMode ? 'mode-active' : ''}`}
            onClick={() => setQuickMode(true)}
            role="radio"
            aria-checked={quickMode}
          >
            <span className="mode-label">クイックチェック</span>
            <span className="mode-duration">1分</span>
          </button>
          <button
            className={`mode-btn ${!quickMode ? 'mode-active' : ''}`}
            onClick={() => setQuickMode(false)}
            role="radio"
            aria-checked={!quickMode}
          >
            <span className="mode-label">通常チェック</span>
            <span className="mode-duration">3分</span>
          </button>
        </div>

        <div className="checklist-card" role="group" aria-label="計測前チェックリスト">
          <h3>計測前チェックリスト</h3>
          <div className="checklist-items">
            {CHECKLIST_ITEMS.map((item) => (
              <label
                key={item.id}
                className="checklist-item"
                tabIndex={0}
                role="checkbox"
                aria-checked={!!checked[item.id]}
                onClick={() => toggleCheck(item.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleCheck(item.id);
                  }
                }}
              >
                <span className={`checklist-check${checked[item.id] ? ' checked' : ''}`} aria-hidden="true">
                  {checked[item.id] && (
                    <svg viewBox="0 0 14 14" fill="none">
                      <path d="M2.5 7.5L5.5 10.5L11.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </span>
                <span className={`checklist-text${checked[item.id] ? ' checklist-text-checked' : ''}`}>
                  {item.text}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div className="privacy-note" aria-label="プライバシー保護について">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="#6b7280" aria-hidden="true">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            />
          </svg>
          <span>完全プライバシー保護 — 全ての処理はお使いのデバイス上で完結します。映像の録画・送信は一切行いません。</span>
        </div>

        {cameraError && <div className="error-message" role="alert">{cameraError}</div>}

        <button
          className="btn-primary"
          onClick={handleStart}
          disabled={loading}
          aria-label={loading ? 'カメラを確認中' : `${durationLabel}のチェックを開始`}
        >
          {loading ? 'カメラを確認中...' : 'チェック開始'}
        </button>

        {onStartDemo && (
          <button className="btn-demo" onClick={onStartDemo} aria-label="カメラなしでデモを体験する">
            カメラなしでデモを体験する
          </button>
        )}

        {onShowSample && (
          <button className="btn-sample" onClick={onShowSample} aria-label="サンプル結果を見る">
            サンプル結果を見る
          </button>
        )}

        {onShowHistory && getCount() > 0 && (
          <button className="btn-history" onClick={onShowHistory} aria-label={`計測履歴を見る（${getCount()}件）`}>
            計測履歴を見る（{getCount()}件）
          </button>
        )}

        <p className="disclaimer">
          ※ 本ツールはウェルネス参考値を提供するものであり、医療機器ではありません。
          診断・治療の目的で使用しないでください。
        </p>
      </div>
    </div>
  );
}

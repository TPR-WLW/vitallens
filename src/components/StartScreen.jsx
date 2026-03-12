import { useState } from 'react';

export default function StartScreen({ onStart }) {
  const [cameraError, setCameraError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    setCameraError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      onStart();
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

  return (
    <div className="start-screen">
      <div className="start-content">
        <div className="logo">
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

        <div className="info-card">
          <h3>計測の流れ</h3>
          <ol>
            <li>顔をガイドの楕円に合わせます</li>
            <li>3分間じっとしていてください</li>
            <li>心拍数・HRV・ストレスレベルを確認</li>
          </ol>
        </div>

        <div className="privacy-note">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="#6b7280">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            />
          </svg>
          <span>完全プライバシー保護 — 全ての処理はお使いのデバイス上で完結します。映像の録画・送信は一切行いません。</span>
        </div>

        {cameraError && <div className="error-message">{cameraError}</div>}

        <button className="btn-primary" onClick={handleStart} disabled={loading}>
          {loading ? 'カメラを確認中...' : 'チェック開始'}
        </button>

        <p className="disclaimer">
          ※ 本ツールはウェルネス参考値を提供するものであり、医療機器ではありません。
          診断・治療の目的で使用しないでください。
        </p>
      </div>
    </div>
  );
}

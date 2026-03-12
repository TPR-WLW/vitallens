import { useRef, useEffect, useState, forwardRef, useImperativeHandle } from 'react';

const CameraView = forwardRef(function CameraView({ stream, faceDetected, paused }, ref) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [videoError, setVideoError] = useState(null);

  useImperativeHandle(ref, () => ({
    getVideo: () => videoRef.current,
    getCanvas: () => canvasRef.current,
    getContext: () => canvasRef.current?.getContext('2d', { willReadFrequently: true }),
  }));

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      setVideoError(null);
      video.play().catch(() => {
        setVideoError(
          '映像の再生に失敗しました。ブラウザの設定を確認するか、ページを再読み込みしてお試しください。'
        );
      });
    }

    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="camera-view" role="img" aria-label="カメラ映像 — 顔をガイド枠に合わせてください">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-video"
        aria-hidden="true"
      />
      <canvas ref={canvasRef} className="hidden-canvas" aria-hidden="true" />

      {paused && (
        <div className="measure-paused-overlay" role="alert" aria-live="assertive">
          <svg className="paused-icon" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="30" stroke="#f59e0b" strokeWidth="3" />
            <path d="M32 18v20" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
            <circle cx="32" cy="46" r="2.5" fill="#f59e0b" />
          </svg>
          <div className="paused-text">計測を一時停止中</div>
          <div className="paused-sub">顔が検出されていません。ガイド枠の中に顔を合わせると自動的に再開します。</div>
        </div>
      )}

      <div className="face-guide-container" aria-hidden="true">
        <svg viewBox="0 0 300 400" className="face-guide-svg">
          <defs>
            <mask id="oval-mask">
              <rect width="300" height="400" fill="white" />
              <ellipse cx="150" cy="180" rx="90" ry="120" fill="black" />
            </mask>
          </defs>
          <rect
            width="300"
            height="400"
            fill="rgba(0,0,0,0.4)"
            mask="url(#oval-mask)"
          />
          <ellipse
            cx="150"
            cy="180"
            rx="90"
            ry="120"
            fill="none"
            stroke={faceDetected ? '#22c55e' : '#ffffff'}
            strokeWidth="2.5"
            strokeDasharray={faceDetected ? 'none' : '8 4'}
            className={faceDetected ? 'guide-detected' : 'guide-searching'}
          />

          {/* Corner brackets for positioning */}
          {!faceDetected && (
            <g className="guide-corners" stroke="#ffffff" strokeWidth="2.5" fill="none" strokeLinecap="round">
              {/* Top */}
              <path d="M130 62 L150 58 L170 62" />
              {/* Bottom */}
              <path d="M130 298 L150 302 L170 298" />
              {/* Left */}
              <path d="M62 160 L58 180 L62 200" />
              {/* Right */}
              <path d="M238 160 L242 180 L238 200" />
            </g>
          )}

          {/* Positioning guide hints when face not detected */}
          {!faceDetected && !paused && (
            <g className="guide-hints">
              {/* Small face silhouette */}
              <ellipse cx="150" cy="165" rx="35" ry="42" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" strokeDasharray="4 3" />
              <ellipse cx="150" cy="155" rx="45" ry="30" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              {/* Arrow hints */}
              <path d="M150 330 L150 315 M143 322 L150 315 L157 322" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </g>
          )}
        </svg>

        <div className="face-guide-text" role="status" aria-live="polite">
          {videoError ? (
            <span>{videoError}</span>
          ) : faceDetected ? (
            <span className="guide-text-detected">顔を検出しました — そのまま動かないでください</span>
          ) : (
            <div className="guide-text-steps">
              <span className="guide-step">顔をガイド枠の中央に合わせてください</span>
              <span className="guide-step-sub">カメラから40〜60cmの距離を保ってください</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

export default CameraView;

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

  const guideText = videoError
    ? videoError
    : faceDetected
      ? '顔を検出しました — そのまま動かないでください'
      : '顔をガイドの中に合わせてください';

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
        </svg>

        <div className="face-guide-text" role="status" aria-live="polite">
          {guideText}
        </div>
      </div>
    </div>
  );
});

export default CameraView;

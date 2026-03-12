import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

const CameraView = forwardRef(function CameraView({ stream, faceDetected }, ref) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  useImperativeHandle(ref, () => ({
    getVideo: () => videoRef.current,
    getCanvas: () => canvasRef.current,
    getContext: () => canvasRef.current?.getContext('2d', { willReadFrequently: true }),
  }));

  useEffect(() => {
    const video = videoRef.current;
    if (video && stream) {
      video.srcObject = stream;
      video.play().catch(() => {});
    }

    return () => {
      if (video) {
        video.srcObject = null;
      }
    };
  }, [stream]);

  return (
    <div className="camera-view">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-video"
      />
      <canvas ref={canvasRef} className="hidden-canvas" />

      <div className="face-guide-container">
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

        <div className="face-guide-text">
          {faceDetected
            ? '顔を検出しました — そのまま動かないでください'
            : '顔をガイドの中に合わせてください'}
        </div>
      </div>
    </div>
  );
});

export default CameraView;

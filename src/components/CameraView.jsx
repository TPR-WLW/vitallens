import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

/**
 * CameraView renders the webcam feed with a face positioning oval guide.
 * Exposes video and canvas refs via imperative handle for frame extraction.
 */
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

      {/* Face positioning guide */}
      <div className="face-guide-container">
        <svg viewBox="0 0 300 400" className="face-guide-svg">
          {/* Darkened overlay with oval cutout */}
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
          {/* Oval border */}
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
            ? 'Face detected — hold still'
            : 'Position your face in the oval'}
        </div>
      </div>
    </div>
  );
});

export default CameraView;

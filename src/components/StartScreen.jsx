import { useState } from 'react';

export default function StartScreen({ onStart }) {
  const [cameraError, setCameraError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleStart = async () => {
    setLoading(true);
    setCameraError(null);

    try {
      // Test camera access first
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach((t) => t.stop());
      onStart();
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setCameraError('Camera access was denied. Please allow camera access and try again.');
      } else if (err.name === 'NotFoundError') {
        setCameraError('No camera found. Please connect a camera and try again.');
      } else {
        setCameraError('Could not access camera. Please check your browser settings.');
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

        <h1>VitalLens</h1>
        <p className="subtitle">Agent Wellness Check</p>

        <div className="info-card">
          <h3>How it works</h3>
          <ol>
            <li>Position your face in the guide oval</li>
            <li>Stay still for 30 seconds</li>
            <li>Get your wellness insights</li>
          </ol>
        </div>

        <div className="privacy-note">
          <svg viewBox="0 0 20 20" width="16" height="16" fill="#6b7280">
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
            />
          </svg>
          <span>100% private — all processing happens on your device. No video is recorded or sent anywhere.</span>
        </div>

        {cameraError && <div className="error-message">{cameraError}</div>}

        <button className="btn-primary" onClick={handleStart} disabled={loading}>
          {loading ? 'Checking camera...' : 'Begin Check-In'}
        </button>

        <p className="disclaimer">
          This tool provides general wellness insights only. It is not a medical device and should not be used for diagnosis or treatment.
        </p>
      </div>
    </div>
  );
}

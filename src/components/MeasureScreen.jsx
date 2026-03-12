import { useRef, useState, useEffect, useCallback } from 'react';
import CameraView from './CameraView.jsx';
import { startCamera, stopCamera, extractROI } from '../lib/camera.js';
import { RPPGProcessor } from '../lib/rppg.js';

const MEASUREMENT_DURATION = 30; // seconds

export default function MeasureScreen({ onComplete, onCancel }) {
  const cameraRef = useRef(null);
  const processorRef = useRef(new RPPGProcessor());
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);

  const [stream, setStream] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [currentHR, setCurrentHR] = useState(null);
  const [status, setStatus] = useState('Initializing camera...');
  const [signalQuality, setSignalQuality] = useState(0);

  // Initialize camera
  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const mediaStream = await startCamera();
        if (cancelled) {
          stopCamera(mediaStream);
          return;
        }
        streamRef.current = mediaStream;
        setStream(mediaStream);
        setStatus('Position your face in the oval');
      } catch (err) {
        setStatus('Camera error: ' + err.message);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
      if (streamRef.current) {
        stopCamera(streamRef.current);
      }
    };
  }, []);

  // Processing loop
  const processFrame = useCallback(() => {
    if (!cameraRef.current) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const video = cameraRef.current.getVideo();
    const canvas = cameraRef.current.getCanvas();
    const ctx = cameraRef.current.getContext();

    if (!video || !canvas || !ctx || video.readyState < 2) {
      animFrameRef.current = requestAnimationFrame(processFrame);
      return;
    }

    const now = performance.now();

    // Start timing from first valid frame
    if (!startTimeRef.current) {
      startTimeRef.current = now;
    }

    const elapsedSec = (now - startTimeRef.current) / 1000;
    setElapsed(Math.min(elapsedSec, MEASUREMENT_DURATION));

    // Extract RGB from face ROI
    const roi = extractROI(canvas, ctx, video);
    setFaceDetected(roi.valid);

    if (roi.valid) {
      processorRef.current.addSample(roi.r, roi.g, roi.b, now);

      // Attempt HR calculation after enough samples
      if (processorRef.current.isReady) {
        const result = processorRef.current.computeHeartRate();
        if (result && result.hr > 0) {
          setCurrentHR(result.hr);
          setSignalQuality(result.confidence);

          if (elapsedSec < 10) {
            setStatus('Calibrating...');
          } else if (result.confidence < 0.25) {
            setStatus('Measuring — hold still...');
          } else {
            setStatus('Reading heart rate...');
          }
        }
      } else {
        setStatus('Collecting data — hold still...');
      }
    } else {
      setStatus('Position your face in the oval');
    }

    // Check if measurement is complete
    if (elapsedSec >= MEASUREMENT_DURATION) {
      const finalResult = processorRef.current.computeHeartRate();
      onComplete({
        hr: finalResult?.hr || currentHR || 0,
        confidence: finalResult?.confidence || signalQuality,
        duration: MEASUREMENT_DURATION,
        samples: processorRef.current.sampleCount,
      });
      return;
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [onComplete, currentHR, signalQuality]);

  // Start processing loop when stream is ready
  useEffect(() => {
    if (stream) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [stream, processFrame]);

  const progress = Math.min((elapsed / MEASUREMENT_DURATION) * 100, 100);
  const remainingSec = Math.max(0, Math.ceil(MEASUREMENT_DURATION - elapsed));

  return (
    <div className="measure-screen">
      <CameraView ref={cameraRef} stream={stream} faceDetected={faceDetected} />

      <div className="measure-overlay">
        {/* Status bar */}
        <div className="measure-status">
          <span className="status-text">{status}</span>
          {currentHR > 0 && (
            <span className="current-hr">
              <span className="hr-value">{currentHR}</span>
              <span className="hr-unit">BPM</span>
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="progress-info">
            <span className="time-remaining">{remainingSec}s remaining</span>
            <span className="signal-quality">
              Signal: {signalQuality > 0.4 ? 'Good' : signalQuality > 0.2 ? 'Fair' : 'Low'}
            </span>
          </div>
        </div>

        {/* Cancel button */}
        <button className="btn-cancel" onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

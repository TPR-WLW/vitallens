import { useRef, useState, useEffect, useCallback } from 'react';
import CameraView from './CameraView.jsx';
import { startCamera, stopCamera, extractROI } from '../lib/camera.js';
import { RPPGProcessor } from '../lib/rppg.js';
import { analyzeHRV } from '../lib/hrv.js';

const MEASUREMENT_DURATION = 180; // 3 minutes for reliable HRV
const QUICK_CHECK_DURATION = 60;  // 1 minute minimum for basic HRV
const HRV_MIN_DURATION = 45;      // Minimum seconds before attempting HRV

export default function MeasureScreen({ onComplete, onCancel, quickMode = false }) {
  const cameraRef = useRef(null);
  const processorRef = useRef(new RPPGProcessor());
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);

  const duration = quickMode ? QUICK_CHECK_DURATION : MEASUREMENT_DURATION;

  const [stream, setStream] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [currentHR, setCurrentHR] = useState(null);
  const [status, setStatus] = useState('カメラを起動中...');
  const [signalQuality, setSignalQuality] = useState(0);
  const [phase, setPhase] = useState('init'); // init | calibrating | measuring | hrv

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
        setStatus('顔をガイドの中に合わせてください');
      } catch (err) {
        setStatus('カメラエラー: ' + err.message);
      }
    }

    init();

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) stopCamera(streamRef.current);
    };
  }, []);

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

    if (!startTimeRef.current) {
      startTimeRef.current = now;
    }

    const elapsedSec = (now - startTimeRef.current) / 1000;
    setElapsed(Math.min(elapsedSec, duration));

    const roi = extractROI(canvas, ctx, video);
    setFaceDetected(roi.valid);

    if (roi.valid) {
      processorRef.current.addSample(roi.r, roi.g, roi.b, now);

      if (processorRef.current.isReady) {
        const result = processorRef.current.computeHeartRate();
        if (result && result.hr > 0) {
          setCurrentHR(result.hr);
          setSignalQuality(result.confidence);

          if (elapsedSec < 15) {
            setPhase('calibrating');
            setStatus('キャリブレーション中...');
          } else if (elapsedSec < HRV_MIN_DURATION) {
            setPhase('measuring');
            setStatus(result.confidence < 0.25
              ? '計測中 — 動かないでください...'
              : '心拍を読み取っています...');
          } else {
            setPhase('hrv');
            setStatus('HRV分析中 — そのままお待ちください...');
          }
        }
      } else {
        setStatus('データ収集中 — じっとしていてください...');
      }
    } else {
      setStatus('顔をガイドの中に合わせてください');
    }

    if (elapsedSec >= duration) {
      const finalResult = processorRef.current.computeHeartRate();
      const hr = finalResult?.hr || currentHR || 0;
      const confidence = finalResult?.confidence || signalQuality;

      // Run HRV analysis
      let hrvResult = null;
      if (finalResult?.signal && finalResult?.timestamps) {
        hrvResult = analyzeHRV(finalResult.signal, finalResult.timestamps, finalResult.fps);
      }

      onComplete({
        hr,
        confidence,
        duration,
        samples: processorRef.current.sampleCount,
        hrv: hrvResult,
      });
      return;
    }

    animFrameRef.current = requestAnimationFrame(processFrame);
  }, [onComplete, currentHR, signalQuality, duration]);

  useEffect(() => {
    if (stream) {
      animFrameRef.current = requestAnimationFrame(processFrame);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [stream, processFrame]);

  const progress = Math.min((elapsed / duration) * 100, 100);
  const remainingSec = Math.max(0, Math.ceil(duration - elapsed));
  const minutes = Math.floor(remainingSec / 60);
  const seconds = remainingSec % 60;
  const timeDisplay = minutes > 0
    ? `${minutes}:${String(seconds).padStart(2, '0')}`
    : `${seconds}秒`;

  const qualityLabel = signalQuality > 0.4 ? '良好' : signalQuality > 0.2 ? '普通' : '低い';

  return (
    <div className="measure-screen">
      <CameraView ref={cameraRef} stream={stream} faceDetected={faceDetected} />

      <div className="measure-overlay">
        <div className="measure-status">
          <span className="status-text">{status}</span>
          {currentHR > 0 && (
            <span className="current-hr">
              <span className="hr-value">{currentHR}</span>
              <span className="hr-unit">BPM</span>
            </span>
          )}
        </div>

        {/* Phase indicator */}
        <div className="phase-indicator">
          <span className={`phase-dot ${phase === 'calibrating' || phase === 'measuring' || phase === 'hrv' ? 'active' : ''}`} />
          <span className={`phase-dot ${phase === 'measuring' || phase === 'hrv' ? 'active' : ''}`} />
          <span className={`phase-dot ${phase === 'hrv' ? 'active' : ''}`} />
          <span className="phase-label">
            {phase === 'init' && '準備中'}
            {phase === 'calibrating' && 'キャリブレーション'}
            {phase === 'measuring' && '心拍計測'}
            {phase === 'hrv' && 'HRV分析'}
          </span>
        </div>

        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-info">
            <span className="time-remaining">残り {timeDisplay}</span>
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

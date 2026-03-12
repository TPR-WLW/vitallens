import { useRef, useState, useEffect, useCallback } from 'react';
import CameraView from './CameraView.jsx';
import { startCamera, stopCamera, extractROI } from '../lib/camera.js';
import { RPPGProcessor } from '../lib/rppg.js';
import { analyzeHRV } from '../lib/hrv.js';
import {
  initFaceLandmarker,
  detectLandmarks,
  disposeFaceLandmarker,
  getLandmarkerState,
  EmotionProcessor,
} from '../lib/emotion.js';

const MEASUREMENT_DURATION = 180; // 3 minutes for reliable HRV
const QUICK_CHECK_DURATION = 60;  // 1 minute minimum for basic HRV
const HRV_MIN_DURATION = 45;      // Minimum seconds before attempting HRV
const EMOTION_FRAME_INTERVAL = 4; // Run emotion every 4th frame (~7.5fps at 30fps)

export default function MeasureScreen({ onComplete, onCancel, quickMode = false, initialStream = null }) {
  const cameraRef = useRef(null);
  const processorRef = useRef(new RPPGProcessor());
  const emotionRef = useRef(new EmotionProcessor());
  const streamRef = useRef(null);
  const animFrameRef = useRef(null);
  const startTimeRef = useRef(null);
  const frameCountRef = useRef(0);
  const landmarkerReadyRef = useRef(false);

  const duration = quickMode ? QUICK_CHECK_DURATION : MEASUREMENT_DURATION;

  const [stream, setStream] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [faceDetected, setFaceDetected] = useState(false);
  const [currentHR, setCurrentHR] = useState(null);
  const [status, setStatus] = useState('カメラを起動中...');
  const [signalQuality, setSignalQuality] = useState(0);
  const [sqi, setSqi] = useState(null); // Enhanced SQI object { score, label, color, components }
  const [phase, setPhase] = useState('init'); // init | calibrating | measuring | hrv
  const [emotionStatus, setEmotionStatus] = useState('loading'); // loading | calibrating | active | error

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        // Reuse stream from StartScreen if available, otherwise start new
        const mediaStream = initialStream || await startCamera();
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

    // Init camera immediately
    init();

    // Init FaceLandmarker in parallel (non-blocking)
    initFaceLandmarker()
      .then(() => {
        if (!cancelled) {
          landmarkerReadyRef.current = true;
          setEmotionStatus('calibrating');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setEmotionStatus('error');
        }
      });

    return () => {
      cancelled = true;
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      if (streamRef.current) stopCamera(streamRef.current);
      // Note: we do NOT dispose FaceLandmarker here — it's a shared singleton
      // that can be reused across measurements
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

    // ----- rPPG Pipeline (EVERY frame, unchanged) -----
    const roi = extractROI(canvas, ctx, video);
    setFaceDetected(roi.valid);

    if (roi.valid) {
      processorRef.current.addSample(roi.r, roi.g, roi.b, now);

      if (processorRef.current.isReady) {
        const result = processorRef.current.computeHeartRate();
        if (result && result.hr > 0) {
          setCurrentHR(result.hr);
          setSignalQuality(result.confidence);
          if (result.sqi) setSqi(result.sqi);

          if (elapsedSec < 15) {
            setPhase('calibrating');
            setStatus('キャリブレーション中...');
          } else if (elapsedSec < HRV_MIN_DURATION) {
            setPhase('measuring');
            const sqiScore = result.sqi?.score ?? result.confidence;
            if (sqiScore < 0.25) {
              setStatus('計測中 — 動かないでください...');
            } else if (result.sqi?.components?.channelStability < 0.4) {
              setStatus('計測中 — 照明が不安定です、位置を調整してください');
            } else {
              setStatus('心拍を読み取っています...');
            }
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

    // ----- Emotion Pipeline (every Nth frame, additive only) -----
    frameCountRef.current++;
    if (
      landmarkerReadyRef.current &&
      frameCountRef.current % EMOTION_FRAME_INTERVAL === 0
    ) {
      const landmarks = detectLandmarks(video, Math.round(now));
      if (landmarks) {
        const emotionResult = emotionRef.current.processLandmarks(landmarks, now);
        if (emotionResult.calibrating) {
          setEmotionStatus('calibrating');
        } else {
          setEmotionStatus('active');
        }
      }
    }

    // ----- Completion -----
    if (elapsedSec >= duration) {
      const finalResult = processorRef.current.computeHeartRate();
      const hr = finalResult?.hr || currentHR || 0;
      const confidence = finalResult?.confidence || signalQuality;
      const finalSqi = finalResult?.sqi || sqi;

      // Run HRV analysis
      let hrvResult = null;
      if (finalResult?.signal && finalResult?.timestamps) {
        hrvResult = analyzeHRV(finalResult.signal, finalResult.timestamps, finalResult.fps);
      }

      // Gather emotion data
      const emotionProcessor = emotionRef.current;
      const emotionData = emotionProcessor.isCalibrated
        ? {
            summary: emotionProcessor.summary,
            history: emotionProcessor.history,
            isCalibrated: true,
          }
        : null;

      onComplete({
        hr,
        confidence,
        sqi: finalSqi,
        duration,
        samples: processorRef.current.sampleCount,
        hrv: hrvResult,
        emotion: emotionData,
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

  const qualityLabel = sqi ? sqi.label : (signalQuality > 0.4 ? '信号良好' : signalQuality > 0.2 ? '信号普通' : '信号不安定');
  const qualityColor = sqi ? sqi.color : undefined;
  const sqiScore = sqi?.score ?? signalQuality;
  const sqiPercent = Math.round(sqiScore * 100);

  // Contextual SQI tip based on signal components
  let sqiTip = null;
  let sqiTipWarning = false;
  if (phase !== 'init' && elapsed > 5) {
    if (sqi?.components?.channelStability < 0.3) {
      sqiTip = '動きを検出しています — できるだけ静止してください';
      sqiTipWarning = true;
    } else if (sqi?.components?.channelStability < 0.5) {
      sqiTip = '照明環境を確認してください — 顔に均一な光が当たると精度が向上します';
      sqiTipWarning = true;
    } else if (sqiScore < 0.35) {
      sqiTip = '信号が不安定です — 顔の位置とカメラの距離を調整してください';
      sqiTipWarning = true;
    } else if (sqiScore >= 0.6 && phase === 'measuring') {
      sqiTip = '信号品質が良好です — そのまま動かないでください';
    }
  }

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

        {/* Emotion analysis indicator (subtle, top-right style placed in overlay) */}
        {emotionStatus !== 'error' && (
          <div className="emotion-indicator">
            <span className={`emotion-dot ${emotionStatus === 'active' ? 'emotion-dot-active' : ''}`} />
            <span className="emotion-indicator-text">
              {emotionStatus === 'loading' && '表情分析を準備中...'}
              {emotionStatus === 'calibrating' && '表情キャリブレーション中...'}
              {emotionStatus === 'active' && '表情分析中'}
            </span>
          </div>
        )}

        <div className="progress-container">
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${progress}%` }} />
          </div>
          <div className="progress-info">
            <span className="time-remaining">残り {timeDisplay}</span>
            <span className="signal-quality" style={qualityColor ? { color: qualityColor } : undefined}>
              {qualityLabel}
            </span>
          </div>
        </div>

        {/* Enhanced SQI display */}
        {phase !== 'init' && (
          <div className="sqi-display">
            <div className="sqi-bar-container">
              <span className="sqi-label">信号品質</span>
              <div className="sqi-bar-track">
                <div
                  className="sqi-bar-fill"
                  style={{
                    width: `${sqiPercent}%`,
                    backgroundColor: qualityColor || 'var(--color-primary)',
                  }}
                />
              </div>
              <span className="sqi-value" style={qualityColor ? { color: qualityColor } : undefined}>
                {sqiPercent}%
              </span>
            </div>
            {sqiTip && (
              <div className={`sqi-tip${sqiTipWarning ? ' sqi-tip-warning' : ''}`}>
                <span className="sqi-tip-icon">{sqiTipWarning ? '\u26A0' : '\u2713'}</span>
                <span>{sqiTip}</span>
              </div>
            )}
          </div>
        )}

        <button className="btn-cancel" onClick={onCancel}>
          中止
        </button>
      </div>
    </div>
  );
}

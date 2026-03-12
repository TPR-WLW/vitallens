import { useState } from 'react';
import LandingPage from './components/LandingPage.jsx';
import StartScreen from './components/StartScreen.jsx';
import MeasureScreen from './components/MeasureScreen.jsx';
import DemoMeasureScreen from './components/DemoMeasureScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import DashboardMock from './components/DashboardMock.jsx';
import './styles/app.css';

const SCREENS = {
  LANDING: 'landing',
  START: 'start',
  MEASURE: 'measure',
  DEMO: 'demo',
  RESULT: 'result',
  SAMPLE: 'sample',
  DASHBOARD: 'dashboard',
};

// Realistic sample result for a moderately stressed Japanese office worker
const SAMPLE_RESULT = {
  hr: 76,
  confidence: 0.82,
  duration: 180,
  samples: 5400,
  isSample: true,
  hrv: {
    metrics: { rmssd: 32, sdnn: 38, pnn50: 14, meanIBI: 789, meanHR: 76 },
    stress: { level: 'moderate', score: 42, label: '通常', color: '#4f8cff' },
    quality: { grade: 'A', score: 0.82, message: '信号品質: 優秀' },
    debug: { totalBeats: 228, validIBIs: 220, artifactCount: 8, artifactRate: 0.035 },
  },
  emotion: {
    summary: {
      dominant: 'neutral',
      distribution: { neutral: 72, happiness: 18, sadness: 4, surprise: 3, anger: 1, fear: 1, disgust: 1 },
    },
    history: new Array(120).fill(null).map((_, i) => ({
      emotion: i % 5 === 0 ? 'happiness' : 'neutral',
      confidence: 0.7,
      timestamp: i * 1500,
    })),
    isCalibrated: true,
  },
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LANDING);
  const [result, setResult] = useState(null);
  const [quickMode, setQuickMode] = useState(true);
  const [cameraStream, setCameraStream] = useState(null);

  const handleTryDemo = () => {
    setScreen(SCREENS.START);
  };

  const handleShowDashboard = () => {
    setScreen(SCREENS.DASHBOARD);
  };

  const handleStartDemo = () => {
    setScreen(SCREENS.DEMO);
    setResult(null);
  };

  const handleDemoComplete = () => {
    setResult({ ...SAMPLE_RESULT, isDemo: true, isSample: false });
    setScreen(SCREENS.RESULT);
  };

  const handleBackToLanding = () => {
    // Stop any lingering camera stream
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setScreen(SCREENS.LANDING);
  };

  const handleShowSample = () => {
    // Stop camera if started during start screen
    if (cameraStream) {
      cameraStream.getTracks().forEach((t) => t.stop());
      setCameraStream(null);
    }
    setResult(SAMPLE_RESULT);
    setScreen(SCREENS.SAMPLE);
  };

  const handleStart = (isQuick, stream) => {
    setQuickMode(isQuick);
    setCameraStream(stream || null);
    setScreen(SCREENS.MEASURE);
    setResult(null);
  };

  const handleComplete = (measureResult) => {
    setResult(measureResult);
    setScreen(SCREENS.RESULT);
  };

  const handleCancel = () => {
    setScreen(SCREENS.START);
  };

  const handleRestart = () => {
    setScreen(SCREENS.MEASURE);
    setResult(null);
  };

  return (
    <div className="app">
      {screen === SCREENS.LANDING && <LandingPage onTryDemo={handleTryDemo} onShowDashboard={handleShowDashboard} onStartDemo={handleStartDemo} />}
      {screen === SCREENS.DASHBOARD && <DashboardMock onBack={handleBackToLanding} />}
      {screen === SCREENS.START && (
        <StartScreen onStart={handleStart} onBack={handleBackToLanding} onShowSample={handleShowSample} onStartDemo={handleStartDemo} />
      )}
      {screen === SCREENS.SAMPLE && result && (
        <ResultScreen
          result={result}
          onRestart={() => setScreen(SCREENS.START)}
          onBack={handleBackToLanding}
        />
      )}
      {screen === SCREENS.DEMO && (
        <DemoMeasureScreen
          onComplete={handleDemoComplete}
          onCancel={() => setScreen(SCREENS.START)}
        />
      )}
      {screen === SCREENS.MEASURE && (
        <MeasureScreen
          onComplete={handleComplete}
          onCancel={handleCancel}
          quickMode={quickMode}
          initialStream={cameraStream}
        />
      )}
      {screen === SCREENS.RESULT && result && (
        <ResultScreen
          result={result}
          onRestart={handleRestart}
          onBack={handleBackToLanding}
        />
      )}
    </div>
  );
}

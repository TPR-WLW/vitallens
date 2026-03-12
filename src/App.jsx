import { useState, lazy, Suspense } from 'react';
import LandingPage from './components/LandingPage.jsx';
import StartScreen from './components/StartScreen.jsx';
import MeasureScreen from './components/MeasureScreen.jsx';
import DemoMeasureScreen from './components/DemoMeasureScreen.jsx';
import PwaInstallPrompt from './components/PwaInstallPrompt.jsx';
import OnboardingOverlay from './components/OnboardingOverlay.jsx';
import { isFirstVisit, completeOnboarding } from './lib/onboarding.js';
import './styles/app.css';

// Lazy-loaded heavy components (split into separate chunks)
const ResultScreen = lazy(() => import('./components/ResultScreen.jsx'));
const HistoryScreen = lazy(() => import('./components/HistoryScreen.jsx'));
const DashboardMock = lazy(() => import('./components/DashboardMock.jsx'));

const SCREENS = {
  LANDING: 'landing',
  START: 'start',
  MEASURE: 'measure',
  DEMO: 'demo',
  RESULT: 'result',
  SAMPLE: 'sample',
  DASHBOARD: 'dashboard',
  HISTORY: 'history',
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
  const [showOnboarding, setShowOnboarding] = useState(isFirstVisit);

  const handleTryDemo = () => {
    setScreen(SCREENS.START);
  };

  const handleShowDashboard = () => {
    setScreen(SCREENS.DASHBOARD);
  };

  const handleShowHistory = () => {
    setScreen(SCREENS.HISTORY);
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

  const handleOnboardingComplete = () => {
    completeOnboarding();
    setShowOnboarding(false);
  };

  return (
    <div className="app">
      <PwaInstallPrompt />
      {showOnboarding && <OnboardingOverlay onComplete={handleOnboardingComplete} />}
      {screen === SCREENS.LANDING && <LandingPage onTryDemo={handleTryDemo} onShowDashboard={handleShowDashboard} onStartDemo={handleStartDemo} onShowHistory={handleShowHistory} />}
      <Suspense fallback={<div className="loading-fallback">読み込み中...</div>}>
        {screen === SCREENS.DASHBOARD && <DashboardMock onBack={handleBackToLanding} />}
        {screen === SCREENS.HISTORY && <HistoryScreen onBack={handleBackToLanding} onRestart={() => setScreen(SCREENS.START)} />}
        {screen === SCREENS.SAMPLE && result && (
          <ResultScreen
            result={result}
            onRestart={() => setScreen(SCREENS.START)}
            onBack={handleBackToLanding}
            onShowHistory={handleShowHistory}
          />
        )}
        {screen === SCREENS.RESULT && result && (
          <ResultScreen
            result={result}
            onRestart={handleRestart}
            onBack={handleBackToLanding}
            onShowHistory={handleShowHistory}
          />
        )}
      </Suspense>
      {screen === SCREENS.START && (
        <StartScreen onStart={handleStart} onBack={handleBackToLanding} onShowSample={handleShowSample} onStartDemo={handleStartDemo} onShowHistory={handleShowHistory} />
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
    </div>
  );
}

import { useState } from 'react';
import LandingPage from './components/LandingPage.jsx';
import StartScreen from './components/StartScreen.jsx';
import MeasureScreen from './components/MeasureScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import './styles/app.css';

const SCREENS = {
  LANDING: 'landing',
  START: 'start',
  MEASURE: 'measure',
  RESULT: 'result',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.LANDING);
  const [result, setResult] = useState(null);
  const [quickMode, setQuickMode] = useState(true);

  const handleTryDemo = () => {
    setScreen(SCREENS.START);
  };

  const handleBackToLanding = () => {
    setScreen(SCREENS.LANDING);
  };

  const handleStart = (isQuick) => {
    setQuickMode(isQuick);
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
      {screen === SCREENS.LANDING && <LandingPage onTryDemo={handleTryDemo} />}
      {screen === SCREENS.START && (
        <StartScreen onStart={handleStart} onBack={handleBackToLanding} />
      )}
      {screen === SCREENS.MEASURE && (
        <MeasureScreen
          onComplete={handleComplete}
          onCancel={handleCancel}
          quickMode={quickMode}
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

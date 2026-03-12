import { useState } from 'react';
import StartScreen from './components/StartScreen.jsx';
import MeasureScreen from './components/MeasureScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import './styles/app.css';

const SCREENS = {
  START: 'start',
  MEASURE: 'measure',
  RESULT: 'result',
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.START);
  const [result, setResult] = useState(null);

  const handleStart = () => {
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
      {screen === SCREENS.START && <StartScreen onStart={handleStart} />}
      {screen === SCREENS.MEASURE && (
        <MeasureScreen onComplete={handleComplete} onCancel={handleCancel} />
      )}
      {screen === SCREENS.RESULT && result && (
        <ResultScreen result={result} onRestart={handleRestart} />
      )}
    </div>
  );
}

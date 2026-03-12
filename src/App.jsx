import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage.jsx';
import DashboardMock from './components/DashboardMock.jsx';
import StartScreen from './components/StartScreen.jsx';
import MeasureScreen from './components/MeasureScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import './styles/app.css';

const ROUTES = {
  LANDING: '',
  DEMO: 'demo',
  DASHBOARD: 'dashboard',
};

const SCREENS = {
  START: 'start',
  MEASURE: 'measure',
  RESULT: 'result',
};

function getRoute() {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  return hash || ROUTES.LANDING;
}

export default function App() {
  const [route, setRoute] = useState(getRoute);
  const [screen, setScreen] = useState(SCREENS.START);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (r) => {
    window.location.hash = r ? `#/${r}` : '';
    setRoute(r);
  };

  // Demo screen handlers
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

  // Landing page
  if (route === ROUTES.LANDING) {
    return (
      <LandingPage
        onTryDemo={() => { setScreen(SCREENS.START); navigate(ROUTES.DEMO); }}
        onViewDashboard={() => navigate(ROUTES.DASHBOARD)}
      />
    );
  }

  // Dashboard
  if (route === ROUTES.DASHBOARD) {
    return <DashboardMock onBack={() => navigate(ROUTES.LANDING)} />;
  }

  // Demo (original app flow)
  return (
    <div className="app">
      {screen === SCREENS.START && <StartScreen onStart={handleStart} onBack={() => navigate(ROUTES.LANDING)} />}
      {screen === SCREENS.MEASURE && (
        <MeasureScreen onComplete={handleComplete} onCancel={handleCancel} />
      )}
      {screen === SCREENS.RESULT && result && (
        <ResultScreen result={result} onRestart={handleRestart} />
      )}
    </div>
  );
}

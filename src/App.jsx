import { useState, useEffect } from 'react';
import LandingPage from './components/LandingPage.jsx';
import DashboardMock from './components/DashboardMock.jsx';
import JoinScreen from './components/JoinScreen.jsx';
import StartScreen from './components/StartScreen.jsx';
import MeasureScreen from './components/MeasureScreen.jsx';
import ResultScreen from './components/ResultScreen.jsx';
import { getTenantSlug } from './lib/agent.js';
import './styles/app.css';

function getRoute() {
  const hash = window.location.hash.replace('#/', '').replace('#', '');
  return hash || '';
}

function parseRoute(hash) {
  // Match /join/:slug
  const joinMatch = hash.match(/^join\/(.+)$/);
  if (joinMatch) return { page: 'join', slug: joinMatch[1] };

  // Match /dashboard/:slug (real dashboard with token in query)
  if (hash === 'dashboard') return { page: 'dashboard' };
  if (hash === 'demo') return { page: 'demo' };
  return { page: 'landing' };
}

const SCREENS = {
  START: 'start',
  MEASURE: 'measure',
  RESULT: 'result',
};

export default function App() {
  const [route, setRoute] = useState(getRoute);
  const [screen, setScreen] = useState(SCREENS.START);
  const [result, setResult] = useState(null);
  const [tenantSlug, setTenantSlug] = useState(getTenantSlug);

  useEffect(() => {
    const onHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (r) => {
    window.location.hash = r ? `#/${r}` : '';
    setRoute(r);
  };

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

  const parsed = parseRoute(route);

  // Join / Enrollment
  if (parsed.page === 'join') {
    return (
      <JoinScreen
        tenantSlug={parsed.slug}
        onEnrolled={(slug) => {
          setTenantSlug(slug);
          setScreen(SCREENS.START);
          navigate('demo');
        }}
        onBack={() => navigate('')}
      />
    );
  }

  // Landing page
  if (parsed.page === 'landing') {
    return (
      <LandingPage
        onTryDemo={() => { setScreen(SCREENS.START); navigate('demo'); }}
        onViewDashboard={() => navigate('dashboard')}
      />
    );
  }

  // Dashboard
  if (parsed.page === 'dashboard') {
    return <DashboardMock onBack={() => navigate('')} />;
  }

  // Demo / Check-in flow
  return (
    <div className="app">
      {screen === SCREENS.START && <StartScreen onStart={handleStart} onBack={() => navigate('')} />}
      {screen === SCREENS.MEASURE && (
        <MeasureScreen onComplete={handleComplete} onCancel={handleCancel} />
      )}
      {screen === SCREENS.RESULT && result && (
        <ResultScreen result={result} onRestart={handleRestart} tenantSlug={tenantSlug} />
      )}
    </div>
  );
}

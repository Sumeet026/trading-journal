import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { auth, onAuthStateChanged } from './lib/firebase';
import { migrateToUserScopedStorage } from './lib/storage';
import Layout from './components/Layout';
import Notification from './components/Notification';
import Auth from './pages/Auth';
import Dashboard from './pages/Dashboard';
import TradeEntry from './pages/TradeEntry';
import TradeHistory from './pages/TradeHistory';
import SessionAnalysis from './pages/SessionAnalysis';
import Calendar from './pages/Calendar';
import Notes from './pages/Notes';
import Accounts from './pages/Accounts';
import Backtest from './pages/Backtest';
import Settings from './pages/Settings';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css';

function AppContent() {
  const { state, dispatch, loadInitialData } = useApp();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    migrateToUserScopedStorage();
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      dispatch({ type: 'SET_USER', payload: user });
      loadInitialData(user?.uid);
      setAuthReady(true);
    }, () => {
      loadInitialData(null);
      setAuthReady(true);
    });
    return unsubscribe;
  }, [dispatch, loadInitialData]);

  if (!authReady) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: 'var(--bg-dark)' }}>
        <div className="text-center">
          <i className="fa-solid fa-chart-column" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '12px' }}></i>
          <p className="text-muted">Loading ApexTrader...</p>
        </div>
      </div>
    );
  }

  if (!state.user && !state.isLocalMode) {
    return <Auth />;
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/entry" element={<TradeEntry />} />
          <Route path="/history" element={<TradeHistory />} />
          <Route path="/sessions" element={<SessionAnalysis />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/backtest" element={<Backtest />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppContent />
      <NotificationWrapper />
    </AppProvider>
  );
}

function NotificationWrapper() {
  const { state, dispatch } = useApp();
  const handleDismiss = () => dispatch({ type: 'CLEAR_NOTIFICATION' });
  return <Notification notification={state.notification} onDismiss={handleDismiss} />;
}

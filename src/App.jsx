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
import MT5Import from './pages/MT5Import';
import SessionAnalysis from './pages/SessionAnalysis';
import Calendar from './pages/Calendar';
import Notes from './pages/Notes';
import Accounts from './pages/Accounts';
import Backtest from './pages/Backtest';
import Settings from './pages/Settings';
import StrategyAnalysis from './pages/StrategyAnalysis';
import '@fortawesome/fontawesome-free/css/all.min.css';
import './index.css';

function AppContent() {
  const { state, dispatch, loadInitialData } = useApp();
  const [authReady, setAuthReady] = useState(false);

  useEffect(() => {
    migrateToUserScopedStorage();

    const savedTheme = localStorage.getItem('tj_theme') || 'navy';
    if (savedTheme !== 'navy') {
      const THEME_VARS = {
        emerald: { '--primary': '#10b981', '--primary-hover': '#059669', '--primary-glow': 'rgba(16,185,129,0.15)', '--bg-dark': '#050f0a', '--bg-card': '#0a1a12', '--bg-card-hover': '#0f2519', '--card-border': 'rgba(16,185,129,0.08)', '--card-border-hover': 'rgba(16,185,129,0.25)' },
        cyberpunk: { '--primary': '#f59e0b', '--primary-hover': '#d97706', '--primary-glow': 'rgba(245,158,11,0.15)', '--bg-dark': '#0a0800', '--bg-card': '#1a1408', '--bg-card-hover': '#251e0f', '--card-border': 'rgba(245,158,11,0.08)', '--card-border-hover': 'rgba(245,158,11,0.25)' },
        amethyst: { '--primary': '#a855f7', '--primary-hover': '#9333ea', '--primary-glow': 'rgba(168,85,247,0.15)', '--bg-dark': '#0a060f', '--bg-card': '#150d1e', '--bg-card-hover': '#1e1428', '--card-border': 'rgba(168,85,247,0.08)', '--card-border-hover': 'rgba(168,85,247,0.25)' },
      };
      const root = document.documentElement;
      if (THEME_VARS[savedTheme]) {
        root.setAttribute('data-theme', savedTheme);
        Object.entries(THEME_VARS[savedTheme]).forEach(([prop, val]) => root.style.setProperty(prop, val));
      }
    }

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
          <Route path="/import/mt5" element={<MT5Import />} />
          <Route path="/sessions" element={<SessionAnalysis />} />
          <Route path="/calendar" element={<Calendar />} />
          <Route path="/notes" element={<Notes />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/strategy" element={<StrategyAnalysis />} />
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

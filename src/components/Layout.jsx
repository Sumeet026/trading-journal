import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { auth, signOut } from '../lib/firebase';
import Notification from './Notification';

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: 'fa-chart-line' },
  { path: '/entry', label: 'Trade Entry', icon: 'fa-circle-plus' },
  { path: '/history', label: 'Trade History', icon: 'fa-clock-rotate-left' },
  { path: '/import/mt5', label: 'MT5 Import', icon: 'fa-file-import' },
  { path: '/sessions', label: 'Session Analysis', icon: 'fa-layer-group' },
  { path: '/calendar', label: 'Calendar', icon: 'fa-calendar-days' },
  { path: '/notes', label: 'Notes', icon: 'fa-note-sticky' },
  { path: '/accounts', label: 'Accounts', icon: 'fa-wallet' },
  { path: '/strategy', label: 'Strategy', icon: 'fa-chess' },
  { path: '/backtest', label: 'Backtest', icon: 'fa-flask' },
  { path: '/settings', label: 'Settings', icon: 'fa-gear' },
];

const PAGE_TITLES = {
  '/': 'Dashboard',
  '/entry': 'Trade Entry',
  '/history': 'Trade History',
  '/import/mt5': 'AI MT5 Screenshot Importer',
  '/sessions': 'Session Analysis',
  '/calendar': 'Trading Calendar',
  '/notes': 'Daily Notes',
  '/accounts': 'Accounts',
  '/strategy': 'Strategy Analysis',
  '/backtest': 'Backtest Journal',
  '/settings': 'Settings',
};

export default function Layout() {
  const { state, dispatch } = useApp();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      dispatch({ type: 'SET_USER', payload: null });
    } catch (e) {
      console.error('Logout failed:', e);
    }
  };

  const handleAccountChange = (e) => {
    dispatch({ type: 'SET_ACTIVE_ACCOUNT', payload: e.target.value });
  };

  const pageTitle = PAGE_TITLES[location.pathname] || 'ApexTrader';
  const userName = state.user?.displayName || state.user?.email?.split('@')[0] || 'Guest Trader';
  const userEmail = state.user?.email || 'Local Sandbox Mode';
  const avatarInitial = userName.charAt(0).toUpperCase();

  return (
    <div className="app-container">
      {sidebarOpen && <div className="sidebar-overlay active" onClick={() => setSidebarOpen(false)} />}

      <aside className={`sidebar ${sidebarOpen ? 'active' : ''}`}>
        <div className="sidebar-logo">
          <i className="fa-solid fa-chart-column"></i>
          <span>ApexTrader</span>
        </div>

        <ul className="sidebar-menu">
          {NAV_ITEMS.map((item) => (
            <li key={item.path} className={`sidebar-item ${location.pathname === item.path ? 'active' : ''}`}>
              <NavLink to={item.path} end={item.path === '/'}>
                <i className={`fa-solid ${item.icon}`}></i>
                {item.label}
              </NavLink>
            </li>
          ))}
        </ul>

        <div className="sidebar-footer">
          <div className="user-profile-summary">
            <div className="user-avatar">{avatarInitial}</div>
            <div className="user-info">
              <span className="user-name">{userName}</span>
              <span className="user-email">{userEmail}</span>
            </div>
          </div>
          <button className="btn btn-sm btn-secondary" onClick={handleLogout} title="Logout">
            <i className="fa-solid fa-right-from-bracket"></i>
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="app-header">
          <div className="header-title-area flex align-center gap-2">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <i className="fa-solid fa-bars"></i>
            </button>
            <h2>{pageTitle}</h2>
          </div>

          <div className="header-actions">
            <span className="text-xs text-muted" id="liveSaveIndicator">
              <i className="fa-solid fa-circle text-success" style={{ fontSize: '0.5rem' }}></i>
            </span>

            <select className="input-control" value={state.activeAccountId} onChange={handleAccountChange}>
              <option value="all">All Accounts (Combined)</option>
              {state.accounts.filter(a => !a.archived).map(acc => (
                <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency || 'USD'})</option>
              ))}
            </select>

            {state.activeAccountId !== 'all' && (() => {
              const sel = state.accounts.find(a => a.id === state.activeAccountId);
              if (!sel) return null;
              const sym = sel.currency === 'EUR' ? '€' : sel.currency === 'GBP' ? '£' : sel.currency === 'INR' ? '₹' : '$';
              return (
                <span className="text-sm font-bold text-accent" style={{ fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {sym}{(sel.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              );
            })()}

            <NavLink to="/entry" className="btn btn-primary btn-sm">
              <i className="fa-solid fa-plus"></i>
              <span className="btn-label-desktop">Quick Add</span>
            </NavLink>

            <span className="text-xs text-muted" style={{ fontFamily: 'monospace' }}>
              {currentTime.toLocaleTimeString()}
            </span>
          </div>
        </header>

        <div className="page-container active">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

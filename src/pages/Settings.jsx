import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportData, importData } from '../lib/storage';
import { auth, signOut } from '../lib/firebase';

const THEMES = {
  navy: { label: 'TradingView Navy', primary: '#6366f1' },
  emerald: { label: 'Emerald Forest', primary: '#10b981' },
  cyberpunk: { label: 'Cyberpunk Neon', primary: '#f59e0b' },
  amethyst: { label: 'Amethyst Void', primary: '#a855f7' },
};

const THEME_VARS = {
  emerald: { '--primary': '#10b981', '--primary-hover': '#059669', '--primary-glow': 'rgba(16,185,129,0.15)', '--bg-dark': '#050f0a', '--bg-card': '#0a1a12', '--bg-card-hover': '#0f2519', '--card-border': 'rgba(16,185,129,0.08)', '--card-border-hover': 'rgba(16,185,129,0.25)' },
  cyberpunk: { '--primary': '#f59e0b', '--primary-hover': '#d97706', '--primary-glow': 'rgba(245,158,11,0.15)', '--bg-dark': '#0a0800', '--bg-card': '#1a1408', '--bg-card-hover': '#251e0f', '--card-border': 'rgba(245,158,11,0.08)', '--card-border-hover': 'rgba(245,158,11,0.25)' },
  amethyst: { '--primary': '#a855f7', '--primary-hover': '#9333ea', '--primary-glow': 'rgba(168,85,247,0.15)', '--bg-dark': '#0a060f', '--bg-card': '#150d1e', '--bg-card-hover': '#1e1428', '--card-border': 'rgba(168,85,247,0.08)', '--card-border-hover': 'rgba(168,85,247,0.25)' },
};

export default function Settings() {
  const { state, dispatch } = useApp();
  const [activeTheme, setActiveTheme] = useState(localStorage.getItem('tj_theme') || 'navy');

  const applyTheme = (key) => {
    const root = document.documentElement;
    root.removeAttribute('data-theme');
    root.style.cssText = '';
    if (key !== 'navy' && THEME_VARS[key]) {
      root.setAttribute('data-theme', key);
      Object.entries(THEME_VARS[key]).forEach(([prop, val]) => root.style.setProperty(prop, val));
    }
    localStorage.setItem('tj_theme', key);
    setActiveTheme(key);
  };

  const handleExport = async () => {
    const data = await exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `apextrader_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click(); URL.revokeObjectURL(url);
    dispatch({ type: 'SET_NOTIFICATION', payload: { message: 'Backup exported!', type: 'success' } });
  };

  const handleImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      dispatch({ type: 'SET_NOTIFICATION', payload: { message: 'Backup imported!', type: 'success' } });
      window.location.reload();
    } catch (err) {
      dispatch({ type: 'SET_NOTIFICATION', payload: { message: 'Invalid backup file.', type: 'danger' } });
    }
  };

  const handleReset = async () => {
    if (!confirm('DELETE ALL DATA? This cannot be undone!')) return;
    if (!confirm('Are you REALLY sure?')) return;
    localStorage.clear();
    window.location.reload();
  };

  const userName = state.user?.displayName || 'Guest Trader';
  const userEmail = state.user?.email || 'local_sandbox@offline';

  return (
    <div className="grid-cols-2" style={{ gap: '20px' }}>
      {/* Profile */}
      <div className="card-premium">
        <div className="card-title-bar"><h3><i className="fa-solid fa-user"></i> Profile</h3></div>
        <div className="mb-3">
          <div className="text-sm text-muted">Name</div>
          <div className="font-semibold">{userName}</div>
        </div>
        <div className="mb-3">
          <div className="text-sm text-muted">Email</div>
          <div className="font-semibold">{userEmail}</div>
        </div>
        <div className="mb-3">
          <div className="text-sm text-muted">Connection Mode</div>
          <span className={`badge ${state.user ? 'badge-win' : 'badge-loss'}`}>
            {state.user ? 'Firebase Connected' : 'Local Sandbox'}
          </span>
        </div>
      </div>

      {/* Theme */}
      <div className="card-premium">
        <div className="card-title-bar"><h3><i className="fa-solid fa-palette"></i> Theme</h3></div>
        <div className="grid-cols-2" style={{ gap: '10px' }}>
          {Object.entries(THEMES).map(([key, t]) => (
            <button key={key} className={`btn ${activeTheme === key ? 'btn-primary' : 'btn-secondary'}`} onClick={() => applyTheme(key)} style={{ justifyContent: 'flex-start' }}>
              <span style={{ width: '16px', height: '16px', borderRadius: '50%', background: t.primary, display: 'inline-block' }}></span>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Backup */}
      <div className="card-premium col-span-2">
        <div className="card-title-bar"><h3><i className="fa-solid fa-shield-halved"></i> Backup & Data</h3></div>
        <div className="flex gap-2">
          <button className="btn btn-primary" onClick={handleExport}><i className="fa-solid fa-download"></i> Export Backup (JSON)</button>
          <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
            <i className="fa-solid fa-upload"></i> Import Backup
            <input type="file" accept=".json" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button className="btn btn-danger" onClick={handleReset}><i className="fa-solid fa-trash-can"></i> Reset All Data</button>
        </div>
      </div>
    </div>
  );
}

import { useState } from 'react';
import { useApp } from '../context/AppContext';
import {
  auth,
  isFirebaseEnabled,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  onAuthStateChanged,
  updateProfile
} from '../lib/firebase';

export default function Auth() {
  const { dispatch } = useApp();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        dispatch({ type: 'SET_USER', payload: cred.user });
      } else {
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        if (name) {
          await updateProfile(cred.user, { displayName: name });
        }
        dispatch({ type: 'SET_USER', payload: { ...cred.user, displayName: name } });
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const cred = await signInWithPopup(auth, provider);
      dispatch({ type: 'SET_USER', payload: cred.user });
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!email) {
      setError('Enter your email first.');
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      setResetSent(true);
      setError('');
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''));
    }
  };

  const handleLocalMode = () => {
    dispatch({ type: 'SET_USER', payload: null });
    dispatch({ type: 'SET_LOCAL_MODE', payload: true });
  };

  if (!isFirebaseEnabled) {
    return (
      <div className="auth-overlay">
        <div className="auth-card">
          <div className="auth-header">
            <i className="fa-solid fa-chart-column"></i>
            <h2>ApexTrader</h2>
            <p>Firebase is not configured. Running in Local Sandbox Mode.</p>
          </div>
          <button className="btn btn-primary btn-lg" onClick={handleLocalMode} style={{ width: '100%' }}>
            <i className="fa-solid fa-play"></i> Continue Locally
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-overlay">
      <div className="auth-card">
        <div className="auth-header">
          <i className="fa-solid fa-chart-column"></i>
          <h2>{isLogin ? 'Welcome Back' : 'Create Account'}</h2>
          <p>{isLogin ? 'Sign in to your trading journal' : 'Start your trading journey'}</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <div className="form-group">
              <label>Full Name</label>
              <input className="input-control" type="text" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input className="input-control" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input className="input-control" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>

          {error && <p className="text-danger text-sm">{error}</p>}
          {resetSent && <p className="text-success text-sm">Password reset email sent!</p>}

          <button className="btn btn-primary btn-lg" type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Sign Up'}
          </button>
        </form>

        <button className="btn btn-secondary btn-lg" onClick={handleGoogleLogin} disabled={loading} style={{ width: '100%' }}>
          <i className="fa-brands fa-google"></i> Continue with Google
        </button>

        <div style={{ textAlign: 'center' }}>
          {isLogin && (
            <p className="text-xs text-muted" style={{ cursor: 'pointer', marginBottom: '8px' }} onClick={handleForgotPassword}>
              Forgot password?
            </p>
          )}
          <p className="text-sm text-muted">
            {isLogin ? "Don't have an account? " : "Already have an account? "}
            <span className="auth-toggle-link" onClick={() => { setIsLogin(!isLogin); setError(''); }}>
              {isLogin ? 'Sign Up' : 'Sign In'}
            </span>
          </p>
        </div>

        <button className="btn btn-sm" onClick={handleLocalMode} style={{ width: '100%', background: 'transparent', color: 'var(--text-muted)', border: 'none' }}>
          Skip — Use Local Mode
        </button>
      </div>
    </div>
  );
}

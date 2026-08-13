import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { saveTrade, getChecklist, getTrades, getAccounts } from '../lib/storage';

const SESSIONS = {
  Tokyo: { label: 'Tokyo', time: '5:30 AM - 11:30 AM IST' },
  London: { label: 'London', time: '12:00 PM - 1:00 PM IST' },
  'New York': { label: 'New York', time: '1:00 PM - 7:00 PM IST' },
  Asian: { label: 'Asian', time: '7:00 PM - 1:30 AM IST' },
  Overlap: { label: 'Overlap (LN+NY)', time: '1:00 PM - 7:00 PM IST' },
};

const EMOTIONS = ['Calm', 'Anxious', 'Greedy', 'Fearful', 'Confident', 'Frustrated', 'Neutral', 'Excited', 'Bored'];
const MISTAKES = ['Overtrading', 'Chasing', 'Revenge Trading', 'FOMO', 'Moving Stop Loss', 'Ignoring Plan', 'Over-leveraging', 'No Stop Loss'];
const TIMEFRAMES = ['1M', '5M', '15M', '30M', '1H', '4H', 'Daily', 'Weekly'];

function detectSession(timeStr) {
  if (!timeStr) return 'None';
  const [h, m] = timeStr.split(':').map(Number);
  const t = h * 60 + (m || 0);
  if (t >= 330 && t < 690) return 'Tokyo';
  if (t >= 780 && t < 1140) return 'Overlap';
  if (t >= 720 && t < 780) return 'London';
  if (t >= 1140 || t < 90) return 'Asian';
  return 'None';
}

function getTagKey(type) {
  return `tj_saved_${type}`;
}

const defaultForm = {
  accountId: '', asset: '', type: 'Buy', entryPrice: '', exitPrice: '',
  quantity: '', commission: '0', date: new Date().toISOString().split('T')[0],
  entryTime: '', exitTime: '', strategy: '', setup: '',
  timeframe: '1H', session: 'auto', emotionBefore: 'Neutral',
  emotionAfter: 'Neutral', confidence: 3, discipline: 3,
  notes: '', lessons: '', stopLoss: '', takeProfit: '',
};

export default function TradeEntry() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const editTrade = location.state?.edit;
  const duplicateTrade = location.state?.duplicate;
  const prefill = editTrade || duplicateTrade;

  const [form, setForm] = useState(() => {
    if (prefill) {
      return {
        ...defaultForm,
        accountId: prefill.accountId || state.accounts[0]?.id || 'default',
        asset: prefill.asset || '',
        type: prefill.type || 'Buy',
        entryPrice: prefill.entryPrice?.toString() || '',
        exitPrice: prefill.exitPrice?.toString() || '',
        quantity: prefill.quantity?.toString() || '',
        commission: prefill.commission?.toString() || '0',
        date: prefill.date || new Date().toISOString().split('T')[0],
        entryTime: prefill.entryTime || '',
        exitTime: prefill.exitTime || '',
        strategy: prefill.strategy === 'None' ? '' : prefill.strategy || '',
        setup: prefill.setup === 'None' ? '' : prefill.setup || '',
        timeframe: prefill.timeframe || '1H',
        session: prefill.session || 'auto',
        emotionBefore: prefill.emotionBefore || 'Neutral',
        emotionAfter: prefill.emotionAfter || 'Neutral',
        confidence: prefill.confidence || 3,
        discipline: prefill.discipline || 3,
        notes: prefill.notes || '',
        lessons: prefill.lessons || '',
        stopLoss: prefill.stopLoss?.toString() || '',
        takeProfit: prefill.takeProfit?.toString() || '',
        _editId: editTrade?.id || null,
      };
    }
    return { ...defaultForm, accountId: state.accounts[0]?.id || 'default' };
  });

  const [mistakes, setMistakes] = useState(prefill?.mistakes || []);
  const [screenshot, setScreenshot] = useState(prefill?.screenshotUrl || '');
  const [savedStrategies, setSavedStrategies] = useState([]);
  const [savedSetups, setSavedSetups] = useState([]);
  const [strategyInput, setStrategyInput] = useState('');
  const [setupInput, setSetupInput] = useState('');
  const [checklist, setChecklist] = useState([]);
  const [isDragOver, setIsDragOver] = useState(false);

  useEffect(() => {
    setSavedStrategies(JSON.parse(localStorage.getItem(getTagKey('strategies')) || '[]'));
    setSavedSetups(JSON.parse(localStorage.getItem(getTagKey('setups')) || '[]'));
    getChecklist().then(setChecklist);
  }, []);

  const update = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

  const addTag = (type, val, setVal, saved, setSaved) => {
    if (val.trim() && !saved.includes(val.trim())) {
      const next = [...saved, val.trim()];
      setSaved(next);
      localStorage.setItem(getTagKey(type), JSON.stringify(next));
      setVal('');
    }
  };

  const removeTag = (type, val, saved, setSaved) => {
    const next = saved.filter(x => x !== val);
    setSaved(next);
    localStorage.setItem(getTagKey(type), JSON.stringify(next));
  };

  const processFile = (file) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { alert('Max 2MB'); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setScreenshot(ev.target.result);
    reader.readAsDataURL(file);
  };

  const handleScreenshot = (e) => {
    processFile(e.target.files?.[0]);
  };

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = (e) => { e.preventDefault(); setIsDragOver(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith('image/')) processFile(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ep = parseFloat(form.entryPrice) || 0;
    const xp = parseFloat(form.exitPrice) || 0;
    const qty = parseFloat(form.quantity) || 0;
    const comm = parseFloat(form.commission) || 0;
    let pnl = form.type === 'Buy' ? (xp - ep) * qty - comm : (ep - xp) * qty - comm;
    let result = 'Break-even';
    if (pnl > 0.05) result = 'Win';
    else if (pnl < -0.05) result = 'Loss';

    let session = form.session;
    if (session === 'auto') session = detectSession(form.entryTime);

    const trade = {
      ...form, id: form._editId || undefined, entryPrice: ep, exitPrice: xp, quantity: qty,
      commission: comm, pnl, result, session, rMultiple: 0,
      strategy: form.strategy || 'None', setup: form.setup || 'None',
      mistakes, screenshotUrl: screenshot,
      entryTime: form.entryTime, exitTime: form.exitTime,
    };

    await saveTrade(trade);
    dispatch({ type: 'SET_NOTIFICATION', payload: { message: form._editId ? 'Trade updated!' : 'Trade logged successfully!', type: 'success' } });
    const [accounts, allTrades] = await Promise.all([getAccounts(), getTrades()]);
    dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
    dispatch({ type: 'SET_ALL_TRADES', payload: allTrades });
    navigate('/history');
  };

  return (
    <div>
      <div className="card-premium mb-4">
        <div className="card-title-bar">
          <h3><i className="fa-solid fa-circle-plus"></i> {form._editId ? 'Edit Trade' : 'Journal New Trade'}</h3>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Type Toggle */}
          <div className="flex gap-2 mb-4" style={{ maxWidth: '300px' }}>
            <button type="button" className={`toggle-btn ${form.type === 'Buy' ? 'active-buy' : ''}`} onClick={() => update('type', 'Buy')}>BUY</button>
            <button type="button" className={`toggle-btn ${form.type === 'Sell' ? 'active-sell' : ''}`} onClick={() => update('type', 'Sell')}>SELL</button>
          </div>

          <div className="grid-cols-4 mb-4" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Account</label>
              <select className="input-control" value={form.accountId} onChange={e => update('accountId', e.target.value)}>
                {state.accounts.filter(a => !a.archived).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Asset</label>
              <input className="input-control" placeholder="EURUSD" value={form.asset} onChange={e => update('asset', e.target.value.toUpperCase())} required />
            </div>
            <div className="form-group">
              <label>Date</label>
              <input className="input-control" type="date" value={form.date} onChange={e => update('date', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Timeframe</label>
              <select className="input-control" value={form.timeframe} onChange={e => update('timeframe', e.target.value)}>
                {TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}
              </select>
            </div>
          </div>

          <div className="grid-cols-4 mb-4" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Entry Price</label>
              <input className="input-control" type="number" step="any" value={form.entryPrice} onChange={e => update('entryPrice', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Exit Price</label>
              <input className="input-control" type="number" step="any" value={form.exitPrice} onChange={e => update('exitPrice', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Quantity</label>
              <input className="input-control" type="number" step="any" value={form.quantity} onChange={e => update('quantity', e.target.value)} required />
            </div>
            <div className="form-group">
              <label>Commission</label>
              <input className="input-control" type="number" step="any" value={form.commission} onChange={e => update('commission', e.target.value)} />
            </div>
          </div>

          <div className="grid-cols-4 mb-4" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Entry Time</label>
              <input className="input-control" type="time" value={form.entryTime} onChange={e => update('entryTime', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Exit Time</label>
              <input className="input-control" type="time" value={form.exitTime} onChange={e => update('exitTime', e.target.value)} />
            </div>
            <div className="form-group">
              <label>Session</label>
              <select className="input-control" value={form.session} onChange={e => update('session', e.target.value)}>
                <option value="auto">Auto-detect</option>
                {Object.entries(SESSIONS).map(([k, v]) => <option key={k} value={k}>{v.label} ({v.time})</option>)}
                <option value="None">Not Selected</option>
              </select>
            </div>
            <div className="form-group">
              <label>Stop Loss</label>
              <input className="input-control" type="number" step="any" value={form.stopLoss} onChange={e => update('stopLoss', e.target.value)} />
            </div>
          </div>

          {/* Strategy & Setup Tags */}
          <div className="grid-cols-2 mb-4" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Strategy</label>
              <div className="flex gap-2">
                <input className="input-control" value={strategyInput} onChange={e => setStrategyInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('strategies', strategyInput, setStrategyInput, savedStrategies, setSavedStrategies))} placeholder="Type strategy..." />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addTag('strategies', strategyInput, setStrategyInput, savedStrategies, setSavedStrategies)}>Add</button>
              </div>
              <div className="saved-tags-container">
                {savedStrategies.map(s => (
                  <span key={s} className={`tag-chip ${form.strategy === s ? 'active' : ''}`} onClick={() => update('strategy', s)}>
                    {s} <span className="tag-delete" onClick={(e) => { e.stopPropagation(); removeTag('strategies', s, savedStrategies, setSavedStrategies); }}>&times;</span>
                  </span>
                ))}
                {savedStrategies.length === 0 && <span className="no-tags-msg">No strategies yet</span>}
              </div>
            </div>
            <div className="form-group">
              <label>Setup</label>
              <div className="flex gap-2">
                <input className="input-control" value={setupInput} onChange={e => setSetupInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addTag('setups', setupInput, setSetupInput, savedSetups, setSavedSetups))} placeholder="Type setup..." />
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => addTag('setups', setupInput, setSetupInput, savedSetups, setSavedSetups)}>Add</button>
              </div>
              <div className="saved-tags-container">
                {savedSetups.map(s => (
                  <span key={s} className={`tag-chip ${form.setup === s ? 'active' : ''}`} onClick={() => update('setup', s)}>
                    {s} <span className="tag-delete" onClick={(e) => { e.stopPropagation(); removeTag('setups', s, savedSetups, setSavedSetups); }}>&times;</span>
                  </span>
                ))}
                {savedSetups.length === 0 && <span className="no-tags-msg">No setups yet</span>}
              </div>
            </div>
          </div>

          {/* Emotions & Ratings */}
          <div className="grid-cols-4 mb-4" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Emotion Before</label>
              <select className="input-control" value={form.emotionBefore} onChange={e => update('emotionBefore', e.target.value)}>
                {EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Emotion After</label>
              <select className="input-control" value={form.emotionAfter} onChange={e => update('emotionAfter', e.target.value)}>
                {EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Confidence: {form.confidence}/5</label>
              <input type="range" min="1" max="5" value={form.confidence} onChange={e => update('confidence', parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
            </div>
            <div className="form-group">
              <label>Discipline: {form.discipline}/5</label>
              <input type="range" min="1" max="5" value={form.discipline} onChange={e => update('discipline', parseInt(e.target.value))} style={{ width: '100%', accentColor: 'var(--primary)' }} />
            </div>
          </div>

          {/* Notes & Lessons */}
          <div className="grid-cols-2 mb-4" style={{ gap: '12px' }}>
            <div className="form-group">
              <label>Trade Notes</label>
              <textarea className="input-control" rows="3" value={form.notes} onChange={e => update('notes', e.target.value)} placeholder="What was your analysis?"></textarea>
            </div>
            <div className="form-group">
              <label>Lessons Learned</label>
              <textarea className="input-control" rows="3" value={form.lessons} onChange={e => update('lessons', e.target.value)} placeholder="What did you learn?"></textarea>
            </div>
          </div>

          {/* Mistakes */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-light" style={{ display: 'block', marginBottom: '8px' }}>Common Mistakes</label>
            <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
              {MISTAKES.map(m => (
                <label key={m} className="flex align-center gap-1 text-xs" style={{ cursor: 'pointer' }}>
                  <input type="checkbox" checked={mistakes.includes(m)} onChange={() => setMistakes(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m])} />
                  {m}
                </label>
              ))}
            </div>
          </div>

          {/* Screenshot - Drag & Drop */}
          <div className="mb-4">
            <label className="text-sm font-semibold text-light" style={{ display: 'block', marginBottom: '8px' }}>Trade Screenshot</label>
            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              style={{
                border: `2px dashed ${isDragOver ? 'var(--primary)' : 'var(--card-border)'}`,
                borderRadius: '12px',
                padding: screenshot ? '12px' : '40px 20px',
                textAlign: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s',
                background: isDragOver ? 'rgba(99,102,241,0.05)' : 'transparent',
              }}
            >
              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleScreenshot} style={{ display: 'none' }} />
              {screenshot ? (
                <div style={{ position: 'relative', maxWidth: '400px', margin: '0 auto' }}>
                  <img src={screenshot} alt="Screenshot" style={{ width: '100%', borderRadius: '8px' }} />
                  <button type="button" className="screenshot-remove-btn" onClick={(e) => { e.stopPropagation(); setScreenshot(''); }}>&times;</button>
                </div>
              ) : (
                <>
                  <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2rem', color: 'var(--primary)', marginBottom: '12px', display: 'block' }}></i>
                  <p className="font-semibold text-light" style={{ marginBottom: '4px' }}>Click to upload or Drag & Drop screenshot</p>
                  <p className="text-xs text-muted">Supports PNG, JPG, JPEG. Max size 2MB</p>
                </>
              )}
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }}>
            <i className="fa-solid fa-save"></i> {form._editId ? 'Update Trade' : 'Save Trade Entry'}
          </button>
        </form>
      </div>
    </div>
  );
}

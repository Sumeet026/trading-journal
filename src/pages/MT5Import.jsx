import { useEffect, useMemo, useRef, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { saveTrade, getTrades, getAccounts } from '../lib/storage';
import {
  reconcileDeals,
  markDuplicates,
  refreshRow,
  validateSelection,
  toTradeRecord,
  summarize,
  EMOTIONS,
  MISTAKES,
} from '../lib/mt5Import';

const MAX_SHOTS = 4;
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED = ['image/png', 'image/jpeg'];

function stripDataUrl(url) {
  return String(url).replace(/^data:[^,]+,/, '');
}

function readAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('This file is not a readable image.'));
    img.src = src;
  });
}

function drawScaled(img, scale, quality) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(img.width * scale));
  canvas.height = Math.max(1, Math.round(img.height * scale));
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', quality);
}

async function prepareImage(file, targetBytes) {
  const raw = await readAsDataUrl(file);
  const byteLength = Math.floor((raw.length - (raw.indexOf(',') + 1)) * 0.75);
  if (byteLength <= targetBytes) {
    return { dataUrl: raw, mimeType: file.type, name: file.name };
  }
  const img = await loadImage(raw);
  const maxDim = Math.max(img.width, img.height);
  let scale = Math.min(1, 2400 / maxDim);
  let quality = 0.9;
  let out = drawScaled(img, scale, quality);
  let guard = 0;
  while (out.length * 0.75 > targetBytes && guard < 8) {
    guard += 1;
    if (quality > 0.55) quality -= 0.1;
    else scale *= 0.8;
    out = drawScaled(img, scale, quality);
  }
  return { dataUrl: out, mimeType: 'image/jpeg', name: file.name };
}

function defaultSelected(row) {
  const critical = !!row.duplicate
    || !!row.isOpen
    || row.errors.length > 0
    || row.reviewReasons.some(r =>
      /no matching entry|no exit deal|could not classify|duplicate|profit not visible|symbol missing/i.test(r));
  return !critical;
}

function makeError(code, message) {
  const err = new Error(message);
  err.code = code;
  return err;
}

const ERROR_HINTS = {
  NO_API_KEY: 'Fix: set MT5_AI_API_KEY in Vercel \u2192 Project \u2192 Settings \u2192 Environment Variables (or in a local .env file for npm run dev), then redeploy.',
  UNAUTHORIZED: 'Your session could not be verified. Sign out and sign back in, then retry.',
  RATE_LIMITED: 'Too many AI requests in a short time. Wait a minute and retry.',
  INVALID_IMAGE: 'Only PNG and JPG screenshots up to 5MB are supported.',
  AI_AUTH: 'The server AI key was rejected. Update MT5_AI_API_KEY.',
  AI_RATE_LIMITED: 'The AI provider is busy. Wait a minute and retry.',
  NETWORK: 'Could not reach the server, or the AI request timed out. Check your connection and retry.',
};

export default function MT5Import() {
  const { state, dispatch } = useApp();
  const fileInputRef = useRef(null);
  const dropRef = useRef(null);

  const [shots, setShots] = useState([]);
  const [status, setStatus] = useState('idle');
  const [step, setStep] = useState('');
  const [error, setError] = useState(null);
  const [rows, setRows] = useState([]);
  const [meta, setMeta] = useState(null);
  const [accountId, setAccountId] = useState(
    state.activeAccountId !== 'all' ? state.activeAccountId : (state.accounts[0]?.id || 'default')
  );
  const [dragOver, setDragOver] = useState(false);
  const [showRaw, setShowRaw] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingImport, setPendingImport] = useState([]);
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [savedStrategies, setSavedStrategies] = useState([]);

  useEffect(() => {
    try {
      setSavedStrategies(JSON.parse(localStorage.getItem('tj_saved_strategies') || '[]'));
    } catch {
      setSavedStrategies([]);
    }
  }, []);

  const summary = useMemo(() => summarize(rows), [rows]);
  const allRawDeals = useMemo(() => rows.flatMap(r => r._deals || []), [rows]);

  const notify = (message, type = 'info') =>
    dispatch({ type: 'SET_NOTIFICATION', payload: { message, type } });

  const resetAll = () => {
    setShots([]);
    setRows([]);
    setMeta(null);
    setError(null);
    setStatus('idle');
    setStep('');
    setImportedCount(0);
    setShowRaw(false);
  };

  const addFiles = async (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    for (const f of files) {
      if (!ACCEPTED.includes(f.type)) {
        setError({ code: 'INVALID_IMAGE', message: `"${f.name}" is not a PNG or JPG screenshot.` });
        return;
      }
      if (f.size > MAX_FILE_SIZE) {
        setError({ code: 'INVALID_IMAGE', message: `"${f.name}" is larger than 5MB. Crop or resize it.` });
        return;
      }
    }
    setError(null);
    const room = MAX_SHOTS - shots.length;
    if (room <= 0) {
      setError({ code: 'INVALID_IMAGE', message: `Maximum ${MAX_SHOTS} screenshots at a time.` });
      return;
    }
    const accepted = files.slice(0, room);
    try {
      const totalCount = shots.length + accepted.length;
      const targetBytes = Math.min(3_500_000, Math.floor(3_400_000 / totalCount));
      const prepared = [];
      for (const f of accepted) prepared.push(await prepareImage(f, targetBytes));
      const next = [...shots, ...prepared];
      setShots(next);
      setStatus('idle');
      setRows([]);
      setMeta(null);
      setImportedCount(0);
      runExtraction(next);
    } catch (e) {
      setError({ code: 'INVALID_IMAGE', message: e.message || 'Could not read the screenshot.' });
    }
  };

  const runExtraction = async (listArg) => {
    const list = listArg || shots;
    if (!list.length) return;
    setStatus('processing');
    setError(null);
    setStep('Uploading screenshot\u2026');
    try {
      let token = null;
      if (state.user && typeof state.user.getIdToken === 'function') {
        try { token = await state.user.getIdToken(); } catch { token = null; }
      }
      const res = await fetch('/api/extract-trades', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          images: list.map(s => ({ data: stripDataUrl(s.dataUrl), mimeType: s.mimeType })),
        }),
      });
      setStep('Reading trade rows with AI\u2026');
      let data = null;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok || !data || !data.ok) {
        throw makeError(data?.code || `HTTP_${res.status}`, data?.error || 'Extraction failed on the server.');
      }
      setStep('Matching entry and exit deals\u2026');
      const deals = Array.isArray(data.deals) ? data.deals : [];
      const { trades, ignoredRows, totalDeals } = reconcileDeals(deals);
      markDuplicates(state.allTrades, trades);
      trades.forEach(r => { r.selected = defaultSelected(r); });
      setMeta({
        pageType: data.pageType || 'unreadable',
        warnings: data.warnings || [],
        model: data.model || '',
        currency: data.accountCurrency || '',
        totalDeals,
        ignoredRows: ignoredRows || [],
      });
      setRows(trades);
      setStatus('done');
      setStep('');
      if (!trades.length) {
        notify('No trade rows found in the screenshot.', 'warning');
      }
    } catch (e) {
      setStatus('error');
      setStep('');
      setError({
        code: e.code || 'NETWORK',
        message: e.message || 'Could not reach the AI service.',
      });
    }
  };

  const updateRow = (index, patch) => {
    setRows(prev => prev.map((row, i) => {
      if (i !== index) return row;
      const next = { ...row, ...patch };
      return refreshRow(next);
    }));
  };

  const toggleRow = (index) => {
    const row = rows[index];
    if (!row) return;
    if (!row.selected && (row.duplicate || row.isOpen)) {
      const msg = row.duplicate === 'existing'
        ? 'This trade already exists in your journal. Import it again as a NEW separate record?'
        : row.duplicate === 'batch'
          ? 'This row duplicates another row from the same screenshot. Import it anyway?'
          : 'This deal has no exit yet (open position). Import it as an open journal entry?';
      if (!window.confirm(msg)) return;
    }
    updateRow(index, { selected: !row.selected });
  };

  const toggleSelectAll = (flag) => {
    setRows(prev => prev.map(r => ({
      ...r,
      selected: flag ? (!r.duplicate && !r.isOpen && r.errors.length === 0) : false,
    })));
  };

  const updateField = (index, key, value) => {
    updateRow(index, { [key]: value });
  };

  const toggleMistake = (index, value) => {
    const row = rows[index];
    if (!row) return;
    const list = Array.isArray(row.mistakes) ? row.mistakes : [];
    updateRow(index, {
      mistakes: list.includes(value) ? list.filter(m => m !== value) : [...list, value],
    });
  };

  const toggleReviewFlag = (index, checked) => {
    const row = rows[index];
    if (!row) return;
    let reasons = Array.isArray(row.reviewReasons) ? [...row.reviewReasons] : [];
    if (checked) {
      if (!reasons.length) reasons = ['Flagged manually for review'];
    } else {
      reasons = reasons.filter(r => r !== 'Flagged manually for review');
    }
    updateRow(index, { needsReview: checked, reviewReasons: reasons });
  };

  const startImport = () => {
    const { ready, blocked } = validateSelection(rows);
    setRows([...rows]);
    if (blocked.length) {
      notify(`${blocked.length} row${blocked.length > 1 ? 's' : ''} have missing data and were deselected. Fix them first.`, 'warning');
    }
    if (!ready.length) {
      notify('No valid trades selected for import.', 'warning');
      return;
    }
    setPendingImport(ready.map(r => r.key));
    setConfirmOpen(true);
  };

  const confirmImport = async () => {
    const keys = new Set(pendingImport);
    const toImport = rows.filter(r => keys.has(r.key) && r.selected);
    if (!toImport.length) {
      setConfirmOpen(false);
      return;
    }
    setImporting(true);
    let okCount = 0;
    let failed = 0;
    for (const row of toImport) {
      try {
        await saveTrade(toTradeRecord(row, accountId));
        okCount += 1;
      } catch {
        failed += 1;
      }
    }
    try {
      const [accounts, allTrades] = await Promise.all([getAccounts(), getTrades()]);
      dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
      dispatch({ type: 'SET_ALL_TRADES', payload: allTrades });
    } catch {
      notify('Trades saved but the dashboard refresh failed. Reload the page.', 'warning');
    }
    const importedKeys = new Set(toImport.map(r => r.key));
    setRows(prev => prev.filter(r => !importedKeys.has(r.key)));
    setImportedCount(prev => prev + okCount);
    setPendingImport([]);
    setConfirmOpen(false);
    setImporting(false);
    if (failed > 0) {
      notify(`${okCount} imported, ${failed} failed.`, 'warning');
    } else {
      notify(`${okCount} trade${okCount > 1 ? 's' : ''} imported successfully!`, 'success');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  };

  const accountName =
    state.accounts.find(a => a.id === accountId)?.name
    || state.accounts[0]?.name
    || 'Default account';

  const suspiciousPage = meta && !['deals', 'positions', 'report'].includes(meta.pageType);

  return (
    <div>
      <div className="card-premium mb-4">
        <div className="card-title-bar">
          <h3><i className="fa-solid fa-wand-magic-sparkles"></i> AI MT5 Screenshot Importer</h3>
          {shots.length > 0 && (
            <button className="btn btn-secondary btn-sm" onClick={resetAll}>
              <i className="fa-solid fa-rotate-left"></i> Start over
            </button>
          )}
        </div>

        <p className="text-xs text-muted mb-4">
          Upload the <strong className="text-light">History / Deals</strong> tab screenshot from MetaTrader 5.
          AI extracts every visible deal, merges entry and exit rows into trades, and lets you review everything before importing.
          Supports PNG, JPG, JPEG. Up to {MAX_SHOTS} screenshots per batch.
        </p>

        <div
          ref={dropRef}
          className={`screenshot-upload-area ${dragOver ? 'mt5-dropzone-active' : ''}`}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={e => { e.preventDefault(); setDragOver(false); }}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".png,.jpg,.jpeg,image/png,image/jpeg"
            multiple
            style={{ display: 'none' }}
            onChange={e => { addFiles(e.target.files); e.target.value = ''; }}
          />
          <i className="fa-solid fa-cloud-arrow-up" style={{ fontSize: '2rem', color: 'var(--primary)', display: 'block', marginBottom: '10px' }}></i>
          <p className="font-semibold text-light" style={{ marginBottom: '4px' }}>
            {shots.length ? `${shots.length} screenshot${shots.length > 1 ? 's' : ''} ready` : 'Click to upload or drag & drop your MT5 screenshot'}
          </p>
          <p className="text-xs text-muted">History &bull; Deals tab &bull; PNG or JPG &bull; max 5MB each</p>
        </div>

        {shots.length > 0 && (
          <div className="mt5-shots">
            {shots.map((s, i) => (
              <div className="mt5-shot-thumb" key={`${s.name}-${i}`}>
                <img src={s.dataUrl} alt={s.name} />
                <button
                  className="screenshot-remove-btn"
                  type="button"
                  title="Remove"
                  onClick={e => {
                    e.stopPropagation();
                    const next = shots.filter((_, idx) => idx !== i);
                    setShots(next);
                    if (!next.length) resetAll();
                  }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>
        )}

        {status === 'processing' && (
          <div className="mt5-processing">
            <div className="mt5-spinner"></div>
            <div>
              <p className="font-semibold text-light" style={{ marginBottom: '2px' }}>
                {step || 'AI is reading your screenshot\u2026'}
              </p>
              <p className="text-xs text-muted">Extracting deals, matching entry/exit rows and validating values.</p>
            </div>
          </div>
        )}

        {status !== 'processing' && shots.length > 0 && status !== 'done' && (
          <div className="mt-4">
            <button className="btn btn-primary" onClick={() => runExtraction()} disabled={status === 'processing'}>
              <i className="fa-solid fa-wand-magic-sparkles"></i> Extract with AI
            </button>
          </div>
        )}

        {status === 'done' && shots.length > 0 && (
          <div className="mt-4 flex gap-2" style={{ flexWrap: 'wrap' }}>
            <button className="btn btn-secondary btn-sm" onClick={() => runExtraction()}>
              <i className="fa-solid fa-rotate"></i> Re-run extraction
            </button>
            <span className="text-xs text-muted" style={{ alignSelf: 'center' }}>
              {meta?.model ? `AI model: ${meta.model}` : ''}
            </span>
          </div>
        )}
      </div>

      {status === 'error' && error && (
        <div className="card-premium mb-4">
          <div className="mt5-banner mt5-banner-error">
            <div className="flex align-center gap-2">
              <i className="fa-solid fa-triangle-exclamation"></i>
              <strong>Extraction failed</strong>
            </div>
            <p className="text-sm mt-2">{error.message}</p>
            {ERROR_HINTS[error.code] && <p className="text-xs mt-2 text-warning">{ERROR_HINTS[error.code]}</p>}
          </div>
          <div className="mt-4">
            <button className="btn btn-primary btn-sm" onClick={() => runExtraction()}>
              <i className="fa-solid fa-rotate"></i> Retry
            </button>
          </div>
        </div>
      )}

      {status === 'done' && meta && (
        <div className="card-premium mb-4">
          <div className="card-title-bar" style={{ marginBottom: '12px' }}>
            <h3><i className="fa-solid fa-list-check"></i> Extraction Summary</h3>
          </div>
          {suspiciousPage && (
            <div className="mt5-banner mt5-banner-warn mb-4">
              <i className="fa-solid fa-circle-info"></i>
              {' '}              This screenshot looks like "<strong>{meta.pageType}</strong>" rather than the MT5 Deals history. Results may be incomplete &mdash; double-check every row.
            </div>
          )}
          {meta.warnings.length > 0 && (
            <ul className="mt5-warnings mb-4">
              {meta.warnings.map((w, i) => <li key={i}><i className="fa-solid fa-circle-info"></i> {w}</li>)}
            </ul>
          )}
          <div className="mt5-summary-bar">
            <span><strong>{meta.totalDeals}</strong> deals read</span>
            <span><strong>{summary.total}</strong> trades found</span>
            <span><strong>{summary.selected}</strong> selected</span>
            {summary.needsReview > 0 && <span className="text-warning"><strong>{summary.needsReview}</strong> need review</span>}
            {summary.duplicates > 0 && <span className="text-danger"><strong>{summary.duplicates}</strong> duplicates</span>}
            {summary.open > 0 && <span><strong>{summary.open}</strong> open</span>}
            {meta.ignoredRows.length > 0 && (
              <button className="link-btn text-xs" type="button" onClick={() => setShowRaw(v => !v)}>
                {meta.ignoredRows.length} non-trade rows ignored
              </button>
            )}
          </div>
        </div>
      )}

      {status === 'done' && meta && rows.length === 0 && importedCount === 0 && (
        <div className="card-premium mb-4">
          <div className="mt5-banner mt5-banner-warn">
            <div className="flex align-center gap-2">
              <i className="fa-solid fa-eye-slash"></i>
              <strong>No trade rows could be read</strong>
            </div>
            <ul className="mt5-tips">
              <li>Capture the whole History table including the header row and profit column.</li>
              <li>Make sure the terminal is on the History tab with Deals rows visible.</li>
              <li>Avoid blurred, tilted or heavily zoomed-out screenshots.</li>
              <li>Try a tighter crop around the table, or upload a second screenshot.</li>
            </ul>
          </div>
        </div>
      )}

      {importedCount > 0 && (
        <div className="card-premium mb-4">
          <div className="mt5-banner mt5-banner-success">
            <div className="flex align-center gap-2">
              <i className="fa-solid fa-circle-check"></i>
              <strong>{importedCount} trade{importedCount > 1 ? 's' : ''} imported into {accountName}.</strong>
            </div>
            <NavLink to="/history" className="btn btn-success btn-sm mt-2">
              <i className="fa-solid fa-clock-rotate-left"></i> View Trade History
            </NavLink>
          </div>
        </div>
      )}

      {rows.length > 0 && (
        <div className="card-premium">
          <div className="card-title-bar" style={{ flexWrap: 'wrap', gap: '10px' }}>
            <h3><i className="fa-solid fa-table-list"></i> Review Extracted Trades</h3>
            <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
              <select
                className="input-control"
                style={{ maxWidth: '220px' }}
                value={accountId}
                onChange={e => setAccountId(e.target.value)}
                title="Import into this account"
              >
                {state.accounts.filter(a => !a.archived).map(a => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <button className="btn btn-secondary btn-sm" onClick={() => toggleSelectAll(true)}>Select valid</button>
              <button className="btn btn-secondary btn-sm" onClick={() => toggleSelectAll(false)}>Clear</button>
            </div>
          </div>

          <div className="table-wrapper">
            <table className="table-custom mt5-table">
              <thead>
                <tr>
                  <th style={{ width: '34px' }}>
                    <input
                      type="checkbox"
                      checked={rows.length > 0 && rows.every(r => r.selected)}
                      onChange={e => toggleSelectAll(e.target.checked)}
                      title="Select all valid rows"
                    />
                  </th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Time</th>
                  <th>Symbol</th>
                  <th>Dir</th>
                  <th>Entry</th>
                  <th>Exit</th>
                  <th>Lots</th>
                  <th>Comm.</th>
                  <th>Swap</th>
                  <th>P&amp;L</th>
                  <th style={{ width: '40px' }}></th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <RowWithDetail
                    key={row.key}
                    row={row}
                    index={i}
                    savedStrategies={savedStrategies}
                    onToggle={() => toggleRow(i)}
                    onUpdate={patch => updateRow(i, patch)}
                    onField={(key, val) => updateField(i, key, val)}
                    onMistake={val => toggleMistake(i, val)}
                    onReviewFlag={checked => toggleReviewFlag(i, checked)}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt5-action-bar">
            <div className="text-xs text-muted">
              <span><strong className="text-light">{summary.selected}</strong> of {summary.total} selected</span>
              <span className="ml-2">Selected P&amp;L: <strong className={summary.selectedPnl >= 0 ? 'text-success' : 'text-danger'}>
                {summary.selectedPnl >= 0 ? '+' : '-'}${Math.abs(summary.selectedPnl).toFixed(2)}
              </strong></span>
              <span className="ml-2">Importing into: <strong className="text-light">{accountName}</strong></span>
            </div>
            <button className="btn btn-primary" onClick={startImport} disabled={importing || summary.selected === 0}>
              <i className="fa-solid fa-file-import"></i> Import Selected Trades ({summary.selected})
            </button>
          </div>

          <div className="mt-4">
            <button className="link-btn text-xs" type="button" onClick={() => setShowRaw(v => !v)}>
              <i className={`fa-solid ${showRaw ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>{' '}
              {showRaw ? 'Hide' : 'View'} source deal rows ({allRawDeals.length})
            </button>
          </div>

          {showRaw && (
            <div className="mt5-raw">
              <div className="table-wrapper">
                <table className="table-custom mt5-table">
                  <thead>
                    <tr>
                      <th>Time</th><th>Type</th><th>Role</th><th>Symbol</th><th>Vol</th>
                      <th>Price</th><th>Comm</th><th>Swap</th><th>Profit</th><th>Ticket</th><th>Conf.</th><th>Raw text</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allRawDeals.slice(0, 150).map(d => (
                      <tr key={`raw-${d.index}`}>
                        <td className="text-xs">{d.time ? `${d.time.date} ${d.time.time}` : '\u2014'}</td>
                        <td className="text-xs">{d.type || '\u2014'}</td>
                        <td className="text-xs">{d.__role || '\u2014'}</td>
                        <td className="text-xs">{d.symbol || '\u2014'}</td>
                        <td className="text-xs">{d.volume ?? '\u2014'}</td>
                        <td className="text-xs">{d.price ?? '\u2014'}</td>
                        <td className="text-xs">{d.commission ?? '\u2014'}</td>
                        <td className="text-xs">{d.swap ?? '\u2014'}</td>
                        <td className="text-xs">{d.profit ?? '\u2014'}</td>
                        <td className="text-xs">{d.ticket || '\u2014'}</td>
                        <td className="text-xs">{d.confidence !== null ? `${Math.round(d.confidence * 100)}%` : '\u2014'}</td>
                        <td className="text-xs text-muted" style={{ whiteSpace: 'normal', maxWidth: '380px' }}>{d.raw || '\u2014'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {meta?.ignoredRows?.length > 0 && (
                <p className="text-xs text-muted mt-2">
                  Ignored non-trade rows: {meta.ignoredRows.map(r => `${r.type || 'row'}${r.symbol ? ` ${r.symbol}` : ''}`).slice(0, 10).join('; ')}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {confirmOpen && (
        <div className="modal-overlay active" onClick={() => !importing && setConfirmOpen(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3><i className="fa-solid fa-file-import"></i> Confirm Import</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setConfirmOpen(false)} disabled={importing}>&times;</button>
            </div>
            <div className="modal-body">
              <p className="text-sm mb-4">
                Import <strong className="text-accent">{pendingImport.length}</strong> trade{pendingImport.length > 1 ? 's' : ''} into{' '}
                <strong className="text-light">{accountName}</strong>? Existing records will never be overwritten &mdash; these are added as new trades.
              </p>
              <div className="mt5-confirm-list">
                {rows.filter(r => pendingImport.includes(r.key)).map(r => (
                  <div className="mt5-confirm-item" key={r.key}>
                    <span className="text-xs text-muted">{r.date}</span>
                    <strong className="text-accent text-xs">{r.asset}</strong>
                    <span className={`text-xs ${r.type === 'Buy' ? 'text-success' : 'text-danger'}`}>{r.type.toUpperCase()}</span>
                    <span className="text-xs text-muted">{r.quantity} lots</span>
                    <span className={`text-xs font-bold ${r.pnl >= 0 ? 'text-success' : 'text-danger'}`}>
                      {r.pnl >= 0 ? '+' : '-'}${Math.abs(r.pnl).toFixed(2)}
                    </span>
                    {r.needsReview && <span className="badge badge-breakeven">review</span>}
                    {r.duplicate && <span className="badge badge-loss">duplicate</span>}
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted mt-4">
                You can add strategy, entry reason, LQ, POI and notes to any trade later from Trade History &rarr; Edit.
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setConfirmOpen(false)} disabled={importing}>Cancel</button>
              <button className="btn btn-primary" onClick={confirmImport} disabled={importing}>
                {importing ? <><i className="fa-solid fa-spinner fa-spin"></i> Importing&hellip;</> : <><i className="fa-solid fa-check"></i> Import {pendingImport.length} Trades</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function RowWithDetail({ row, index, savedStrategies, onToggle, onUpdate, onField, onMistake, onReviewFlag }) {
  const colSpan = 13;
  const badge = row.errors.length
    ? { cls: 'badge-loss', text: 'needs fix' }
    : row.duplicate
      ? { cls: 'badge-loss', text: 'duplicate' }
      : row.isOpen
        ? { cls: 'badge-breakeven', text: 'open' }
        : row.needsReview
          ? { cls: 'badge-breakeven', text: 'review' }
          : { cls: 'badge-win', text: 'ready' };

  const reasons = (row.reviewReasons || []).concat(row.errors || []);

  return (
    <>
      <tr className={row.selected ? 'mt5-row-selected' : ''}>
        <td>
          <input type="checkbox" checked={!!row.selected} onChange={onToggle} />
        </td>
        <td>
          <div className="mt5-status-cell">
            <span className={`badge ${badge.cls}`}>{badge.text}</span>
            <span className={`badge ${row.result === 'Win' ? 'badge-win' : row.result === 'Loss' ? 'badge-loss' : 'badge-breakeven'}`}>
              {row.result}
            </span>
          </div>
        </td>
        <td>
          <input
            className="input-control mt5-cell-input"
            type="date"
            value={row.date || ''}
            onChange={e => onField('date', e.target.value)}
          />
        </td>
        <td>
          <input
            className="input-control mt5-cell-input"
            type="time"
            value={row.entryTime || row.time || ''}
            onChange={e => onField('entryTime', e.target.value)}
          />
        </td>
        <td>
          <input
            className="input-control mt5-cell-input"
            style={{ textTransform: 'uppercase' }}
            value={row.asset || ''}
            onChange={e => onField('asset', e.target.value.toUpperCase())}
            placeholder="SYMBOL"
          />
        </td>
        <td>
          <select
            className="input-control mt5-cell-input"
            value={row.type}
            onChange={e => onField('type', e.target.value)}
          >
            <option value="Buy">BUY</option>
            <option value="Sell">SELL</option>
          </select>
        </td>
        <td>
          <input
            className="input-control mt5-cell-input"
            type="number"
            step="any"
            value={row.entryPrice ?? ''}
            onChange={e => onField('entryPrice', e.target.value === '' ? null : Number(e.target.value))}
          />
        </td>
        <td>
          <input
            className="input-control mt5-cell-input"
            type="number"
            step="any"
            value={row.exitPrice ?? ''}
            onChange={e => onField('exitPrice', e.target.value === '' ? null : Number(e.target.value))}
          />
        </td>
        <td>
          <input
            className="input-control mt5-cell-input"
            type="number"
            step="any"
            min="0"
            value={row.quantity ?? ''}
            onChange={e => onField('quantity', e.target.value === '' ? 0 : Number(e.target.value))}
          />
        </td>
        <td>
          <input
            className="input-control mt5-cell-input"
            type="number"
            step="any"
            value={row.commission ?? 0}
            onChange={e => onField('commission', Number(e.target.value) || 0)}
          />
        </td>
        <td>
          <input
            className="input-control mt5-cell-input"
            type="number"
            step="any"
            value={row.swap ?? 0}
            onChange={e => onField('swap', Number(e.target.value) || 0)}
          />
        </td>
        <td>
          <input
            className="input-control mt5-cell-input font-bold"
            type="number"
            step="any"
            style={{ color: row.pnl >= 0 ? 'var(--success)' : 'var(--danger)' }}
            value={row.pnl ?? 0}
            onChange={e => onField('pnl', Number(e.target.value) || 0)}
          />
        </td>
        <td>
          <button
            className="btn btn-sm btn-icon btn-secondary"
            onClick={() => onUpdate({ expanded: !row.expanded })}
            title={row.expanded ? 'Hide details' : 'Edit details & notes'}
          >
            <i className={`fa-solid ${row.expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`}></i>
          </button>
        </td>
      </tr>

      {row.expanded && (
        <tr className="mt5-detail-row">
          <td colSpan={colSpan}>
            <div className="mt5-detail-panel">
              {reasons.length > 0 && (
                <div className="mt5-review-box">
                  <div className="flex align-center gap-2 mb-2">
                    <i className="fa-solid fa-triangle-exclamation text-warning"></i>
                    <strong className="text-sm text-warning">Review notes</strong>
                  </div>
                  <ul>
                    {reasons.map((r, i) => <li key={i} className="text-xs">{r}</li>)}
                  </ul>
                </div>
              )}

              <div className="grid-cols-4" style={{ gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label>Stop Loss</label>
                  <input
                    className="input-control"
                    type="number"
                    step="any"
                    value={row.stopLoss ?? ''}
                    onChange={e => onField('stopLoss', e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="Not visible"
                  />
                </div>
                <div className="form-group">
                  <label>Take Profit</label>
                  <input
                    className="input-control"
                    type="number"
                    step="any"
                    value={row.takeProfit ?? ''}
                    onChange={e => onField('takeProfit', e.target.value === '' ? null : Number(e.target.value))}
                    placeholder="Not visible"
                  />
                </div>
                <div className="form-group">
                  <label>Exit Time</label>
                  <input
                    className="input-control"
                    type="time"
                    value={row.exitTime || ''}
                    onChange={e => onField('exitTime', e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label>R-Multiple</label>
                  <input className="input-control" value={row.rMultiple ? `${row.rMultiple}R` : '\u2014'} readOnly />
                </div>
              </div>

              <div className="grid-cols-4" style={{ gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label>Trade Entry Reason</label>
                  <textarea
                    className="input-control"
                    rows="2"
                    value={row.entryReason || ''}
                    onChange={e => onField('entryReason', e.target.value)}
                    placeholder="Why did you take this trade?"
                  />
                </div>
                <div className="form-group">
                  <label>Strategy</label>
                  <input
                    className="input-control"
                    value={row.strategy || ''}
                    onChange={e => onField('strategy', e.target.value)}
                    placeholder="Strategy name"
                    list={`strat-list-${index}`}
                  />
                  <datalist id={`strat-list-${index}`}>
                    {savedStrategies.map(s => <option key={s} value={s} />)}
                  </datalist>
                  <div className="saved-tags-container">
                    {savedStrategies.slice(0, 12).map(s => (
                      <span
                        key={s}
                        className={`tag-chip ${row.strategy === s ? 'active' : ''}`}
                        onClick={() => onField('strategy', s)}
                      >
                        {s}
                      </span>
                    ))}
                    {savedStrategies.length === 0 && <span className="no-tags-msg">No saved strategies</span>}
                  </div>
                </div>
                <div className="form-group">
                  <label>Liquidity / LQ</label>
                  <input
                    className="input-control"
                    value={row.liquidity || ''}
                    onChange={e => onField('liquidity', e.target.value)}
                    placeholder="e.g. Asian session LQ"
                  />
                </div>
                <div className="form-group">
                  <label>Point of Interest (POI)</label>
                  <input
                    className="input-control"
                    value={row.poi || ''}
                    onChange={e => onField('poi', e.target.value)}
                    placeholder="e.g. 1H FVG"
                  />
                </div>
              </div>

              <div className="grid-cols-4" style={{ gap: '12px', marginBottom: '12px' }}>
                <div className="form-group">
                  <label>Setup Confirmation</label>
                  <input
                    className="input-control"
                    value={row.setupConfirmation || ''}
                    onChange={e => onField('setupConfirmation', e.target.value)}
                    placeholder="What confirmed the entry?"
                  />
                </div>
                <div className="form-group">
                  <label>Emotion Before</label>
                  <select
                    className="input-control"
                    value={row.emotionBefore || 'Neutral'}
                    onChange={e => onField('emotionBefore', e.target.value)}
                  >
                    {EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label>Emotion After</label>
                  <select
                    className="input-control"
                    value={row.emotionAfter || 'Neutral'}
                    onChange={e => onField('emotionAfter', e.target.value)}
                  >
                    {EMOTIONS.map(em => <option key={em} value={em}>{em}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="flex align-center gap-2" style={{ cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={!!row.needsReview}
                      onChange={e => onReviewFlag(e.target.checked)}
                    />
                    Mark for manual review
                  </label>
                  <span className="text-xs text-muted">Use when values look wrong or incomplete.</span>
                </div>
              </div>

              <div className="mb-3">
                <label className="text-xs font-semibold text-light" style={{ display: 'block', marginBottom: '6px' }}>Mistakes</label>
                <div className="flex gap-2" style={{ flexWrap: 'wrap' }}>
                  {MISTAKES.map(m => (
                    <label key={m} className="flex align-center gap-1 text-xs" style={{ cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={(row.mistakes || []).includes(m)}
                        onChange={() => onMistake(m)}
                      />
                      {m}
                    </label>
                  ))}
                </div>
              </div>

              <div className="form-group">
                <label>Additional Notes</label>
                <textarea
                  className="input-control"
                  rows="2"
                  value={row.notes || ''}
                  onChange={e => onField('notes', e.target.value)}
                  placeholder="Observations, journal notes..."
                />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

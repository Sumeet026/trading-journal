import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { deleteTrade, getTrades, getAccounts } from '../lib/storage';

export default function TradeHistory() {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('table');
  const [filters, setFilters] = useState({ search: '', account: 'all', result: 'all', strategy: 'all', timeframe: 'all', session: 'all', dateFrom: '', dateTo: '' });
  const [detailTrade, setDetailTrade] = useState(null);

  const strategies = useMemo(() => {
    const s = new Set();
    state.allTrades.forEach(t => { if (t.strategy && t.strategy !== 'None') s.add(t.strategy); });
    return [...s];
  }, [state.allTrades]);

  const filtered = useMemo(() => {
    return state.allTrades.filter(t => {
      const s = filters.search.toLowerCase();
      if (s && !t.asset?.toLowerCase().includes(s) && !t.strategy?.toLowerCase().includes(s) && !t.notes?.toLowerCase().includes(s)) return false;
      if (filters.account !== 'all' && t.accountId !== filters.account) return false;
      if (filters.result !== 'all' && t.result !== filters.result) return false;
      if (filters.strategy !== 'all' && t.strategy !== filters.strategy) return false;
      if (filters.timeframe !== 'all' && t.timeframe !== filters.timeframe) return false;
      if (filters.session !== 'all' && (t.session || 'None') !== filters.session) return false;
      if (filters.dateFrom) {
        const tradeDate = new Date(t.date);
        if (tradeDate < new Date(filters.dateFrom)) return false;
      }
      if (filters.dateTo) {
        const tradeDate = new Date(t.date);
        if (tradeDate > new Date(filters.dateTo)) return false;
      }
      return true;
    });
  }, [state.allTrades, filters]);

  const updateFilter = (key, val) => setFilters(prev => ({ ...prev, [key]: val }));

  const getSym = (accId) => {
    const acc = state.accounts.find(a => a.id === accId);
    return acc?.currency === 'EUR' ? '€' : acc?.currency === 'GBP' ? '£' : acc?.currency === 'INR' ? '₹' : '$';
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this trade?')) return;
    await deleteTrade(id);
    const [accounts, allTrades] = await Promise.all([getAccounts(), getTrades()]);
    dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
    dispatch({ type: 'SET_ALL_TRADES', payload: allTrades });
    dispatch({ type: 'SET_NOTIFICATION', payload: { message: 'Trade deleted.', type: 'warning' } });
  };

  const handleDuplicate = (trade) => {
    navigate('/entry', { state: { duplicate: trade } });
  };

  return (
    <div>
      {/* Filters */}
      <div className="card-premium mb-4">
        <div className="flex gap-2" style={{ flexWrap: 'wrap', alignItems: 'center' }}>
          <input className="input-control" placeholder="Search asset, strategy..." style={{ maxWidth: '200px' }} value={filters.search} onChange={e => updateFilter('search', e.target.value)} />
          <select className="input-control" style={{ maxWidth: '160px' }} value={filters.account} onChange={e => updateFilter('account', e.target.value)}>
            <option value="all">All Accounts</option>
            {state.accounts.filter(a => !a.archived).map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <select className="input-control" style={{ maxWidth: '130px' }} value={filters.result} onChange={e => updateFilter('result', e.target.value)}>
            <option value="all">All Results</option>
            <option value="Win">Win</option>
            <option value="Loss">Loss</option>
            <option value="Break-even">Break-even</option>
          </select>
          <select className="input-control" style={{ maxWidth: '150px' }} value={filters.strategy} onChange={e => updateFilter('strategy', e.target.value)}>
            <option value="all">All Strategies</option>
            {strategies.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select className="input-control" style={{ maxWidth: '130px' }} value={filters.timeframe} onChange={e => updateFilter('timeframe', e.target.value)}>
            <option value="all">All Timeframes</option>
            {['1M', '5M', '15M', '30M', '1H', '4H', 'Daily', 'Weekly'].map(tf => <option key={tf} value={tf}>{tf}</option>)}
          </select>
          <select className="input-control" style={{ maxWidth: '150px' }} value={filters.session} onChange={e => updateFilter('session', e.target.value)}>
            <option value="all">All Sessions</option>
            {['Tokyo', 'London', 'New York', 'Asian', 'Overlap', 'None'].map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input-control" type="date" style={{ maxWidth: '150px' }} value={filters.dateFrom} onChange={e => updateFilter('dateFrom', e.target.value)} title="From date" />
          <input className="input-control" type="date" style={{ maxWidth: '150px' }} value={filters.dateTo} onChange={e => updateFilter('dateTo', e.target.value)} title="To date" />
          <div className="history-toggle-container">
            <button className={`history-toggle-btn ${viewMode === 'table' ? 'active' : ''}`} onClick={() => setViewMode('table')}><i className="fa-solid fa-table"></i></button>
            <button className={`history-toggle-btn ${viewMode === 'card' ? 'active' : ''}`} onClick={() => setViewMode('card')}><i className="fa-solid fa-grip"></i></button>
          </div>
        </div>
      </div>

      <p className="text-xs text-muted mb-2">{filtered.length} trade{filtered.length !== 1 ? 's' : ''} found</p>

      {/* Table View */}
      {viewMode === 'table' && (
        <div className="table-wrapper">
          <table className="table-custom">
            <thead>
              <tr>
                <th>Date</th><th>Account</th><th>Asset</th><th>Dir</th><th>Session</th>
                <th>Entry</th><th>Exit</th><th>Qty</th><th>Result</th><th>PnL</th><th>R</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan="12" className="text-center text-muted">No trades match filters.</td></tr>
              ) : filtered.map(t => {
                const sym = getSym(t.accountId);
                const accName = state.accounts.find(a => a.id === t.accountId)?.name || 'Unknown';
                return (
                  <tr key={t.id}>
                    <td>{t.date} <span className="text-xs text-muted">{t.entryTime || t.time || ''}</span></td>
                    <td><span className="text-xs text-light font-semibold">{accName}</span></td>
                    <td><strong className="text-accent">{t.asset}</strong></td>
                    <td><span className={t.type === 'Buy' ? 'text-success' : 'text-danger'} style={{ fontWeight: 700, fontSize: '0.75rem' }}>{t.type?.toUpperCase()}</span></td>
                    <td><span className="badge badge-win text-xs">{t.session || 'None'}</span></td>
                    <td>{sym}{t.entryPrice}</td>
                    <td>{sym}{t.exitPrice}</td>
                    <td>{t.quantity}</td>
                    <td><span className={`badge ${t.result === 'Win' ? 'badge-win' : t.result === 'Loss' ? 'badge-loss' : 'badge-breakeven'}`}>{t.result}</span></td>
                    <td className={`${t.pnl >= 0 ? 'text-success' : 'text-danger'}`} style={{ fontWeight: 700 }}>{t.pnl >= 0 ? '+' : '-'}{sym}{Math.abs(t.pnl).toFixed(2)}</td>
                    <td className="font-semibold text-accent">{t.rMultiple ? t.rMultiple.toFixed(2) + 'R' : '-'}</td>
                    <td>
                      <div className="flex gap-2">
                        <button className="btn btn-sm btn-icon btn-secondary" onClick={() => setDetailTrade(t)} title="View"><i className="fa fa-eye"></i></button>
                        <button className="btn btn-sm btn-icon btn-secondary" onClick={() => navigate('/entry', { state: { edit: t } })} title="Edit"><i className="fa fa-edit"></i></button>
                        <button className="btn btn-sm btn-icon btn-secondary" onClick={() => handleDuplicate(t)} title="Duplicate"><i className="fa fa-copy"></i></button>
                        <button className="btn btn-sm btn-icon btn-secondary text-danger" onClick={() => handleDelete(t.id)} title="Delete"><i className="fa fa-trash-can"></i></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Card View */}
      {viewMode === 'card' && (
        <div className="cards-view-grid">
          {filtered.length === 0 ? (
            <div className="text-center text-muted p-4">No trades match filters.</div>
          ) : filtered.map(t => {
            const sym = getSym(t.accountId);
            const accName = state.accounts.find(a => a.id === t.accountId)?.name || 'Unknown';
            return (
              <div key={t.id} className="trade-card">
                <div className="flex justify-between align-center">
                  <div>
                    <strong className="text-accent text-lg">{t.asset}</strong>
                    <span className="text-xs text-muted ml-2">{t.date}</span>
                  </div>
                  <span className={`badge ${t.result === 'Win' ? 'badge-win' : t.result === 'Loss' ? 'badge-loss' : 'badge-breakeven'}`}>{t.result}</span>
                </div>
                <div className="grid-cols-2 text-xs py-2" style={{ borderTop: '1px solid var(--card-border)', borderBottom: '1px solid var(--card-border)', gap: '4px' }}>
                  <div><span className="text-muted">Account:</span> <strong>{accName}</strong></div>
                  <div><span className="text-muted">Dir:</span> <strong className={t.type === 'Buy' ? 'text-success' : 'text-danger'}>{t.type?.toUpperCase()}</strong></div>
                  <div><span className="text-muted">Entry:</span> <strong>{sym}{t.entryPrice}</strong></div>
                  <div><span className="text-muted">Exit:</span> <strong>{sym}{t.exitPrice}</strong></div>
                  <div><span className="text-muted">Session:</span> <strong className="text-accent">{t.session || 'None'}</strong></div>
                  <div><span className="text-muted">R:</span> <strong>{t.rMultiple ? t.rMultiple.toFixed(2) + 'R' : '-'}</strong></div>
                </div>
                <div className="flex justify-between align-center mt-2">
                  <span className={`text-lg font-bold ${t.pnl >= 0 ? 'text-success' : 'text-danger'}`}>{t.pnl >= 0 ? '+' : '-'}{sym}{Math.abs(t.pnl).toFixed(2)}</span>
                  <div className="flex gap-2">
                    <button className="btn btn-sm btn-icon btn-secondary" onClick={() => setDetailTrade(t)}><i className="fa fa-eye"></i></button>
                    <button className="btn btn-sm btn-icon btn-secondary" onClick={() => navigate('/entry', { state: { edit: t } })}><i className="fa fa-edit"></i></button>
                    <button className="btn btn-sm btn-icon btn-secondary text-danger" onClick={() => handleDelete(t.id)}><i className="fa fa-trash-can"></i></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailTrade && (
        <div className="modal-overlay active" onClick={() => setDetailTrade(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Trade Details: {detailTrade.asset} {detailTrade.type?.toUpperCase()}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setDetailTrade(null)}>&times;</button>
            </div>
            <div className="modal-body">
              <div className="grid-cols-2" style={{ gap: '12px' }}>
                {[
                  ['Result', <span className={`badge ${detailTrade.result === 'Win' ? 'badge-win' : detailTrade.result === 'Loss' ? 'badge-loss' : 'badge-breakeven'}`}>{detailTrade.result}</span>],
                  ['PnL', <span className={detailTrade.pnl >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>{detailTrade.pnl >= 0 ? '+' : '-'}${Math.abs(detailTrade.pnl).toFixed(2)}</span>],
                  ['Account', state.accounts.find(a => a.id === detailTrade.accountId)?.name || 'Unknown'],
                  ['Direction', <span className={detailTrade.type === 'Buy' ? 'text-success' : 'text-danger'} style={{ fontWeight: 600 }}>{detailTrade.type?.toUpperCase()}</span>],
                  ['Entry Price', detailTrade.entryPrice],
                  ['Exit Price', detailTrade.exitPrice],
                  ['Quantity', detailTrade.quantity],
                  ['Session', detailTrade.session || 'None'],
                  ['Strategy', detailTrade.strategy || 'None'],
                  ['Setup', detailTrade.setup || 'None'],
                  ['Timeframe', detailTrade.timeframe],
                  ['Entry Time', detailTrade.entryTime || 'Not recorded'],
                  ['Exit Time', detailTrade.exitTime || 'Not recorded'],
                  ['Emotions', `${detailTrade.emotionBefore || '-'} → ${detailTrade.emotionAfter || '-'}`],
                ].map(([label, val], i) => (
                  <div key={i}>
                    <span className="text-xs text-muted">{label}:</span>
                    <div className="font-semibold text-sm">{val}</div>
                  </div>
                ))}
              </div>
              {detailTrade.notes && <div className="mt-4"><span className="text-xs text-muted">Notes:</span><p className="text-sm">{detailTrade.notes}</p></div>}
              {detailTrade.screenshotUrl && <div className="mt-4"><img src={detailTrade.screenshotUrl} alt="Screenshot" style={{ width: '100%', borderRadius: '8px' }} /></div>}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => { setDetailTrade(null); handleDuplicate(detailTrade); }}>Duplicate</button>
              <button className="btn btn-primary" onClick={() => { setDetailTrade(null); navigate('/entry', { state: { edit: detailTrade } }); }}>Edit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

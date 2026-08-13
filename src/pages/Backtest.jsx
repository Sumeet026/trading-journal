import { useState, useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { saveBacktest, deleteBacktest, getBacktests } from '../lib/storage';

const TIMEFRAMES = ['1M', '5M', '15M', '30M', '1H', '4H', 'Daily', 'Weekly'];

export default function Backtest() {
  const { state, dispatch } = useApp();
  const [form, setForm] = useState({ asset: '', type: 'Buy', entryPrice: '', exitPrice: '', quantity: '', strategy: '', timeframe: '1H', result: 'Break-even', pnl: '', notes: '', date: new Date().toISOString().split('T')[0] });
  const [editId, setEditId] = useState(null);
  const [search, setSearch] = useState('');
  const [filterResult, setFilterResult] = useState('all');

  const backtests = useMemo(() => {
    return (state.backtests || []).filter(bt => {
      if (filterResult !== 'all' && bt.result !== filterResult) return false;
      if (search && !bt.asset?.toLowerCase().includes(search.toLowerCase()) && !bt.strategy?.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [state.backtests, search, filterResult]);

  const stats = useMemo(() => {
    const bt = state.backtests || [];
    const wins = bt.filter(t => t.result === 'Win').length;
    const losses = bt.filter(t => t.result === 'Loss').length;
    const wr = (wins + losses) ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';
    const avgR = bt.length ? (bt.reduce((s, t) => s + (t.rMultiple || 0), 0) / bt.length).toFixed(2) : '0.00';
    return { total: bt.length, wr, avgR };
  }, [state.backtests]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const ep = parseFloat(form.entryPrice) || 0;
    const xp = parseFloat(form.exitPrice) || 0;
    const qty = parseFloat(form.quantity) || 0;
    let pnl = form.type === 'Buy' ? (xp - ep) * qty : (ep - xp) * qty;
    let result = 'Break-even';
    if (pnl > 0.05) result = 'Win';
    else if (pnl < -0.05) result = 'Loss';
    const bt = { ...form, id: editId, entryPrice: ep, exitPrice: xp, quantity: qty, pnl, result, rMultiple: 0 };
    await saveBacktest(bt);
    const backtests = await getBacktests();
    dispatch({ type: 'SET_BACKTESTS', payload: backtests });
    setForm({ asset: '', type: 'Buy', entryPrice: '', exitPrice: '', quantity: '', strategy: '', timeframe: '1H', result: 'Break-even', pnl: '', notes: '', date: new Date().toISOString().split('T')[0] });
    setEditId(null);
    dispatch({ type: 'SET_NOTIFICATION', payload: { message: 'Backtest saved!', type: 'success' } });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete backtest?')) return;
    await deleteBacktest(id);
    const backtests = await getBacktests();
    dispatch({ type: 'SET_BACKTESTS', payload: backtests });
  };

  const handleEdit = (bt) => {
    setForm({ asset: bt.asset, type: bt.type, entryPrice: bt.entryPrice?.toString(), exitPrice: bt.exitPrice?.toString(), quantity: bt.quantity?.toString(), strategy: bt.strategy, timeframe: bt.timeframe, result: bt.result, pnl: bt.pnl?.toString(), notes: bt.notes, date: bt.date });
    setEditId(bt.id);
  };

  return (
    <div>
      <div className="grid-cols-12" style={{ gap: '20px' }}>
        {/* Form */}
        <div className="card-premium col-span-5">
          <div className="card-title-bar"><h3><i className="fa-solid fa-flask"></i> {editId ? 'Edit Backtest' : 'Log Backtest'}</h3></div>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="grid-cols-2" style={{ gap: '10px' }}>
              <div className="form-group"><label>Asset</label><input className="input-control" value={form.asset} onChange={e => setForm(p => ({ ...p, asset: e.target.value.toUpperCase() }))} required /></div>
              <div className="form-group"><label>Date</label><input className="input-control" type="date" value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2">
              <button type="button" className={`toggle-btn ${form.type === 'Buy' ? 'active-buy' : ''}`} onClick={() => setForm(p => ({ ...p, type: 'Buy' }))} style={{ flex: 1 }}>BUY</button>
              <button type="button" className={`toggle-btn ${form.type === 'Sell' ? 'active-sell' : ''}`} onClick={() => setForm(p => ({ ...p, type: 'Sell' }))} style={{ flex: 1 }}>SELL</button>
            </div>
            <div className="grid-cols-2" style={{ gap: '10px' }}>
              <div className="form-group"><label>Entry</label><input className="input-control" type="number" step="any" value={form.entryPrice} onChange={e => setForm(p => ({ ...p, entryPrice: e.target.value }))} required /></div>
              <div className="form-group"><label>Exit</label><input className="input-control" type="number" step="any" value={form.exitPrice} onChange={e => setForm(p => ({ ...p, exitPrice: e.target.value }))} required /></div>
            </div>
            <div className="grid-cols-2" style={{ gap: '10px' }}>
              <div className="form-group"><label>Quantity</label><input className="input-control" type="number" step="any" value={form.quantity} onChange={e => setForm(p => ({ ...p, quantity: e.target.value }))} required /></div>
              <div className="form-group"><label>Timeframe</label><select className="input-control" value={form.timeframe} onChange={e => setForm(p => ({ ...p, timeframe: e.target.value }))}>{TIMEFRAMES.map(tf => <option key={tf} value={tf}>{tf}</option>)}</select></div>
            </div>
            <div className="form-group"><label>Strategy</label><input className="input-control" value={form.strategy} onChange={e => setForm(p => ({ ...p, strategy: e.target.value }))} /></div>
            <div className="form-group"><label>Notes</label><textarea className="input-control" rows="2" value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}></textarea></div>
            <button className="btn btn-primary" type="submit"><i className="fa-solid fa-save"></i> {editId ? 'Update' : 'Save'}</button>
          </form>
        </div>

        {/* Stats + History */}
        <div className="card-premium col-span-7">
          <div className="card-title-bar">
            <h3><i className="fa-solid fa-chart-simple"></i> Backtest History</h3>
            <div className="flex gap-2">
              <input className="input-control" placeholder="Search..." style={{ maxWidth: '140px' }} value={search} onChange={e => setSearch(e.target.value)} />
              <select className="input-control" style={{ maxWidth: '120px' }} value={filterResult} onChange={e => setFilterResult(e.target.value)}>
                <option value="all">All</option><option value="Win">Win</option><option value="Loss">Loss</option>
              </select>
            </div>
          </div>

          <div className="grid-cols-3 mb-3" style={{ gap: '8px' }}>
            <div className="calc-box text-center"><div className="text-xs text-muted">Total</div><div className="font-bold">{stats.total}</div></div>
            <div className="calc-box text-center"><div className="text-xs text-muted">Win Rate</div><div className="font-bold">{stats.wr}%</div></div>
            <div className="calc-box text-center"><div className="text-xs text-muted">Avg R</div><div className="font-bold">{stats.avgR}R</div></div>
          </div>

          <div className="table-wrapper" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <table className="table-custom">
              <thead><tr><th>Date</th><th>Asset</th><th>Dir</th><th>Entry</th><th>Exit</th><th>Result</th><th>PnL</th><th></th></tr></thead>
              <tbody>
                {backtests.length === 0 ? <tr><td colSpan="8" className="text-center text-muted">No backtests.</td></tr> : backtests.map(bt => (
                  <tr key={bt.id}>
                    <td>{bt.date}</td>
                    <td><strong className="text-accent">{bt.asset}</strong></td>
                    <td className={bt.type === 'Buy' ? 'text-success' : 'text-danger'} style={{ fontWeight: 600 }}>{bt.type}</td>
                    <td>{bt.entryPrice}</td><td>{bt.exitPrice}</td>
                    <td><span className={`badge ${bt.result === 'Win' ? 'badge-win' : bt.result === 'Loss' ? 'badge-loss' : 'badge-breakeven'}`}>{bt.result}</span></td>
                    <td className={bt.pnl >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>{bt.pnl >= 0 ? '+' : ''}{bt.pnl?.toFixed(2)}</td>
                    <td>
                      <div className="flex gap-1">
                        <button className="btn btn-sm btn-icon btn-secondary" onClick={() => handleEdit(bt)}><i className="fa fa-edit"></i></button>
                        <button className="btn btn-sm btn-icon btn-secondary text-danger" onClick={() => handleDelete(bt.id)}><i className="fa fa-trash-can"></i></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

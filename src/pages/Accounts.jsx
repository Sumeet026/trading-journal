import { useState } from 'react';
import { useApp } from '../context/AppContext';
import { saveAccount, deleteAccount, archiveAccount, getAccounts, getTrades } from '../lib/storage';

export default function Accounts() {
  const { state, dispatch } = useApp();
  const [showModal, setShowModal] = useState(false);
  const [editAcc, setEditAcc] = useState(null);
  const [form, setForm] = useState({ name: '', type: 'Forex', balance: '', currency: 'USD' });
  const [showArchived, setShowArchived] = useState(false);

  const [adjustForm, setAdjustForm] = useState({ accountId: '', type: 'Deposit', amount: '', note: '' });
  const [quickAction, setQuickAction] = useState({ accId: null, type: 'Deposit' });

  const activeAccounts = state.accounts.filter(a => !a.archived);
  const archivedAccounts = state.accounts.filter(a => a.archived);

  const openAdd = () => { setEditAcc(null); setForm({ name: '', type: 'Forex', balance: '', currency: 'USD' }); setShowModal(true); };
  const openEdit = (acc) => { setEditAcc(acc); setForm({ name: acc.name, type: acc.type, balance: acc.balance?.toString() || '', currency: acc.currency }); setShowModal(true); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const acc = { ...form, id: editAcc?.id, balance: parseFloat(form.balance) || 0, transactions: editAcc?.transactions || [] };
    await saveAccount(acc);
    const accounts = await getAccounts();
    dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
    setShowModal(false);
    dispatch({ type: 'SET_NOTIFICATION', payload: { message: editAcc ? 'Account updated!' : 'Account created!', type: 'success' } });
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete account and all its trades?')) return;
    await deleteAccount(id);
    const [accounts, allTrades] = await Promise.all([getAccounts(), getTrades()]);
    dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
    dispatch({ type: 'SET_ALL_TRADES', payload: allTrades });
  };

  const handleArchive = async (id, archived) => {
    await archiveAccount(id, archived);
    const accounts = await getAccounts();
    dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
  };

  const getAccountStats = (acc) => {
    const trades = state.allTrades.filter(t => t.accountId === acc.id);
    const totalPnL = trades.reduce((s, t) => s + (t.pnl || 0), 0);
    const liveBalance = (acc.balance || 0) + totalPnL;
    const netPerf = acc.balance ? ((totalPnL / acc.balance) * 100).toFixed(2) : '0.00';
    const wins = trades.filter(t => t.result === 'Win').length;
    const losses = trades.filter(t => t.result === 'Loss').length;
    const winRate = (wins + losses) ? ((wins / (wins + losses)) * 100).toFixed(1) : '0.0';
    return { liveBalance, netPerf, totalPnL, tradeCount: trades.length, winRate, wins, losses };
  };

  const getSym = (currency) => {
    return currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'INR' ? '₹' : '$';
  };

  const openQuickAction = (accId, type) => {
    setQuickAction({ accId, type });
    setAdjustForm({ accountId: accId, type, amount: '', note: '' });
  };

  const handleAdjust = async (e) => {
    e.preventDefault();
    const amt = parseFloat(adjustForm.amount) || 0;
    if (amt <= 0) return;

    const acc = state.accounts.find(a => a.id === adjustForm.accountId);
    if (!acc) return;

    const newBalance = adjustForm.type === 'Deposit' ? acc.balance + amt : acc.balance - amt;
    const tx = { date: new Date().toISOString().split('T')[0], type: adjustForm.type.toLowerCase(), amount: amt, note: adjustForm.note || '' };

    await saveAccount({ ...acc, balance: newBalance, transactions: [...(acc.transactions || []), tx] });
    const accounts = await getAccounts();
    dispatch({ type: 'SET_ACCOUNTS', payload: accounts });
    setAdjustForm({ accountId: '', type: 'Deposit', amount: '', note: '' });
    setQuickAction({ accId: null, type: 'Deposit' });
    dispatch({ type: 'SET_NOTIFICATION', payload: { message: `${adjustForm.type} of $${amt.toFixed(2)} recorded.`, type: 'success' } });
  };

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: '20px', alignItems: 'start' }}>
        {/* Left: Account Cards */}
        <div>
          <div className="flex justify-between align-center mb-4">
            <h3 className="text-lg font-semibold"><i className="fa-solid fa-wallet" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>Trading Accounts</h3>
            <button className="btn btn-primary" onClick={openAdd}><i className="fa-solid fa-plus"></i> New Account</button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {activeAccounts.length === 0 ? (
              <p className="text-muted" style={{ gridColumn: '1 / -1' }}>No accounts. Create one to get started.</p>
            ) : activeAccounts.map(acc => {
              const stats = getAccountStats(acc);
              const sym = getSym(acc.currency);
              return (
                <div key={acc.id} className="card-premium" style={{ position: 'relative' }}>
                  <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '4px' }}>
                    <button className="btn btn-sm btn-icon btn-secondary" onClick={() => openEdit(acc)} title="Edit"><i className="fa fa-edit"></i></button>
                    <button className="btn btn-sm btn-icon btn-secondary text-danger" onClick={() => handleDelete(acc.id)} title="Delete"><i className="fa fa-trash-can"></i></button>
                  </div>

                  <div style={{ marginBottom: '4px' }}>
                    <strong style={{ fontSize: '1rem', color: 'var(--text)' }}>{acc.name}</strong>
                  </div>
                  <div style={{ marginBottom: '12px' }}>
                    <span className="badge" style={{ background: 'rgba(99,102,241,0.15)', color: 'var(--primary)', fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>{(acc.type || 'Forex').toUpperCase()}</span>
                  </div>

                  <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Current Balance</div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: stats.liveBalance >= (acc.balance || 0) ? 'var(--success)' : 'var(--danger)', marginBottom: '4px' }}>{sym}{stats.liveBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  <div style={{ fontSize: '0.75rem', color: parseFloat(stats.netPerf) >= 0 ? 'var(--success)' : 'var(--danger)', marginBottom: '16px' }}>
                    {parseFloat(stats.netPerf) >= 0 ? '+' : ''}{stats.netPerf}% net performance
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <button className="btn btn-secondary btn-sm" onClick={() => openQuickAction(acc.id, 'Deposit')} style={{ justifyContent: 'center' }}>
                      <i className="fa-solid fa-plus" style={{ marginRight: '4px' }}></i> Deposit
                    </button>
                    <button className="btn btn-secondary btn-sm" onClick={() => openQuickAction(acc.id, 'Withdraw')} style={{ justifyContent: 'center' }}>
                      <i className="fa-solid fa-minus" style={{ marginRight: '4px' }}></i> Withdraw
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Transaction History */}
          {activeAccounts.some(a => a.transactions?.length > 0) && (
            <div className="card-premium mt-4">
              <div className="card-title-bar"><h3><i className="fa-solid fa-clock-rotate-left"></i> Transaction History</h3></div>
              <div style={{ maxHeight: '250px', overflowY: 'auto' }}>
                {activeAccounts.flatMap(a => (a.transactions || []).map(tx => ({ ...tx, accountName: a.name, accountCurrency: a.currency })))
                  .sort((a, b) => new Date(b.date) - new Date(a.date))
                  .slice(0, 20)
                  .map((tx, i) => (
                    <div key={i} className="flex justify-between align-center" style={{ padding: '8px 0', borderBottom: '1px solid var(--card-border)' }}>
                      <div>
                        <div className="text-sm font-semibold">{tx.accountName}</div>
                        <div className="text-xs text-muted">{tx.date}{tx.note ? ` - ${tx.note}` : ''}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className={`badge ${tx.type === 'deposit' ? 'badge-win' : 'badge-loss'}`} style={{ fontSize: '0.65rem' }}>{tx.type}</span>
                        <span className={`font-bold ${tx.type === 'deposit' ? 'text-success' : 'text-danger'}`}>{tx.type === 'deposit' ? '+' : '-'}{getSym(tx.accountCurrency)}{tx.amount.toLocaleString()}</span>
                      </div>
                    </div>
                  ))
                }
              </div>
            </div>
          )}

          {/* Archived */}
          {archivedAccounts.length > 0 && (
            <div className="mt-4">
              <button className="btn btn-sm btn-secondary mb-2" onClick={() => setShowArchived(!showArchived)}>
                <i className="fa-solid fa-box-archive"></i> Archived ({archivedAccounts.length}) {showArchived ? '▲' : '▼'}
              </button>
              {showArchived && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  {archivedAccounts.map(acc => (
                    <div key={acc.id} className="card-premium" style={{ opacity: 0.6 }}>
                      <strong>{acc.name}</strong>
                      <div className="text-xs text-muted">${(acc.balance || 0).toLocaleString()}</div>
                      <div className="flex gap-2 mt-2">
                        <button className="btn btn-sm btn-secondary" onClick={() => handleArchive(acc.id, false)}>Restore</button>
                        <button className="btn btn-sm btn-secondary text-danger" onClick={() => handleDelete(acc.id)}>Delete</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Adjust Balance + Strategy Performance */}
        <div>
          <div className="card-premium">
            <div className="card-title-bar"><h3><i className="fa-solid fa-sliders"></i> Adjust Balance</h3></div>
            <form onSubmit={handleAdjust} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div className="form-group">
                <label>Account</label>
                <select className="input-control" value={adjustForm.accountId} onChange={e => setAdjustForm(p => ({ ...p, accountId: e.target.value }))} required>
                  <option value="">Select Account</option>
                  {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Transaction Type</label>
                <select className="input-control" value={adjustForm.type} onChange={e => setAdjustForm(p => ({ ...p, type: e.target.value }))}>
                  <option>Deposit</option>
                  <option>Withdraw</option>
                </select>
              </div>
              <div className="form-group">
                <label>Amount ({adjustForm.accountId ? getSym(state.accounts.find(a => a.id === adjustForm.accountId)?.currency) : '$'})</label>
                <input className="input-control" type="number" step="any" min="0" placeholder="1000.00" value={adjustForm.amount} onChange={e => setAdjustForm(p => ({ ...p, amount: e.target.value }))} required />
              </div>
              <div className="form-group">
                <label>Memo / Notes</label>
                <input className="input-control" placeholder="Funding my account" value={adjustForm.note} onChange={e => setAdjustForm(p => ({ ...p, note: e.target.value }))} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ width: '100%', justifyContent: 'center' }}>Post Transaction</button>
            </form>
          </div>
      </div>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay active" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h3>{editAcc ? 'Edit Account' : 'New Account'}</h3>
              <button className="btn btn-sm btn-secondary" onClick={() => setShowModal(false)}>&times;</button>
            </div>
            <div className="modal-body">
              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div className="form-group">
                  <label>Account Name</label>
                  <input className="input-control" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Type</label>
                  <select className="input-control" value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>
                    <option>Forex</option><option>Stocks</option><option>Crypto</option><option>Futures</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Balance</label>
                  <input className="input-control" type="number" step="any" value={form.balance} onChange={e => setForm(p => ({ ...p, balance: e.target.value }))} required />
                </div>
                <div className="form-group">
                  <label>Currency</label>
                  <select className="input-control" value={form.currency} onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}>
                    <option>USD</option><option>EUR</option><option>GBP</option><option>INR</option>
                  </select>
                </div>
                <button className="btn btn-primary" type="submit">{editAcc ? 'Update' : 'Create'} Account</button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

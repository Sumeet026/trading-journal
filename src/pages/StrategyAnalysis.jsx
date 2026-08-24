import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export default function StrategyAnalysis() {
  const { state } = useApp();
  const navigate = useNavigate();
  const [selectedAccount, setSelectedAccount] = useState('all');
  const [expandedStrategy, setExpandedStrategy] = useState(null);

  const activeAccounts = state.accounts.filter(a => !a.archived);

  const filteredTrades = useMemo(() => {
    if (selectedAccount === 'all') return state.allTrades;
    return state.allTrades.filter(t => t.accountId === selectedAccount);
  }, [state.allTrades, selectedAccount]);

  const strategyData = useMemo(() => {
    const map = {};
    filteredTrades.forEach(t => {
      const s = t.strategy || 'None';
      if (!map[s]) map[s] = {
        name: s, trades: 0, wins: 0, losses: 0, breakEven: 0,
        pnl: 0, longs: 0, shorts: 0, longPnl: 0, shortPnl: 0,
        longWins: 0, shortWins: 0, bestTrade: null, worstTrade: null,
        avgPnL: 0, setups: {}, recentTrades: []
      };
      const d = map[s];
      d.trades++;
      if (t.result === 'Win') d.wins++;
      else if (t.result === 'Loss') d.losses++;
      else d.breakEven++;
      d.pnl += t.pnl || 0;
      if (t.type === 'Buy') { d.longs++; d.longPnl += t.pnl || 0; if (t.result === 'Win') d.longWins++; }
      else { d.shorts++; d.shortPnl += t.pnl || 0; if (t.result === 'Win') d.shortWins++; }
      if (!d.bestTrade || (t.pnl || 0) > (d.bestTrade.pnl || 0)) d.bestTrade = t;
      if (!d.worstTrade || (t.pnl || 0) < (d.worstTrade.pnl || 0)) d.worstTrade = t;
      const setup = t.setup || 'None';
      if (!d.setups[setup]) d.setups[setup] = { count: 0, wins: 0, pnl: 0 };
      d.setups[setup].count++;
      if (t.result === 'Win') d.setups[setup].wins++;
      d.setups[setup].pnl += t.pnl || 0;
      d.recentTrades.push(t);
    });
    Object.values(map).forEach(d => {
      d.avgPnL = d.trades ? d.pnl / d.trades : 0;
      d.winRate = (d.wins + d.losses) ? (d.wins / (d.wins + d.losses) * 100) : 0;
      d.longWinRate = d.longs ? (d.longWins / d.longs * 100) : 0;
      d.shortWinRate = d.shorts ? (d.shortWins / d.shorts * 100) : 0;
      d.recentTrades = d.recentTrades.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    });
    return Object.values(map).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  const overallStats = useMemo(() => {
    const totalTrades = filteredTrades.length;
    const wins = filteredTrades.filter(t => t.result === 'Win').length;
    const losses = filteredTrades.filter(t => t.result === 'Loss').length;
    const totalPnL = filteredTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const totalLongs = filteredTrades.filter(t => t.type === 'Buy').length;
    const totalShorts = filteredTrades.filter(t => t.type !== 'Buy').length;
    const winRate = (wins + losses) ? (wins / (wins + losses) * 100) : 0;
    const bestStrategy = strategyData.length ? strategyData.reduce((a, b) => a.pnl > b.pnl ? a : b) : null;
    const worstStrategy = strategyData.length ? strategyData.reduce((a, b) => a.pnl < b.pnl ? a : b) : null;
    return { totalTrades, wins, losses, totalPnL, totalLongs, totalShorts, winRate, bestStrategy, worstStrategy, strategyCount: strategyData.length };
  }, [filteredTrades, strategyData]);

  const getSym = (accId) => {
    const acc = state.accounts.find(a => a.id === accId);
    return acc?.currency === 'EUR' ? '€' : acc?.currency === 'GBP' ? '£' : acc?.currency === 'INR' ? '₹' : '$';
  };

  return (
    <div>
      {/* Header + Account Filter */}
      <div className="flex justify-between align-center mb-4">
        <h3 className="text-lg font-semibold"><i className="fa-solid fa-chess" style={{ color: 'var(--primary)', marginRight: '8px' }}></i>Strategy Analysis</h3>
        <select className="input-control" style={{ maxWidth: '200px' }} value={selectedAccount} onChange={e => setSelectedAccount(e.target.value)}>
          <option value="all">All Accounts</option>
          {activeAccounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      {/* Overall Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '12px', marginBottom: '20px' }}>
        {[
          { label: 'Total Strategies', value: overallStats.strategyCount, cls: 'text-accent' },
          { label: 'Total Trades', value: overallStats.totalTrades, cls: 'text-light' },
          { label: 'Win Rate', value: `${overallStats.winRate.toFixed(1)}%`, cls: overallStats.winRate >= 50 ? 'text-success' : 'text-danger' },
          { label: 'Total PnL', value: `${overallStats.totalPnL >= 0 ? '+' : '-'}$${Math.abs(overallStats.totalPnL).toFixed(2)}`, cls: overallStats.totalPnL >= 0 ? 'text-success' : 'text-danger' },
          { label: 'Long / Short', value: `${overallStats.totalLongs} / ${overallStats.totalShorts}`, cls: 'text-light' },
          { label: 'Best Strategy', value: overallStats.bestStrategy?.name || '-', cls: 'text-success' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <span className="stat-label">{s.label}</span>
            <span className={`stat-value ${s.cls}`} style={{ fontSize: '0.9rem' }}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Strategy Table */}
      <div className="card-premium mb-4">
        <div className="card-title-bar"><h3><i className="fa-solid fa-table"></i> Strategy Breakdown</h3></div>
        {strategyData.length === 0 ? (
          <p className="text-xs text-muted p-3">No strategy data yet. Add strategies to your trades.</p>
        ) : (
          <div className="table-wrapper">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Strategy</th>
                  <th>Trades</th>
                  <th>Wins</th>
                  <th>Losses</th>
                  <th>Win Rate</th>
                  <th>Long</th>
                  <th>Short</th>
                  <th>Avg PnL</th>
                  <th>Total PnL</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {strategyData.map(s => (
                  <>
                    <tr key={s.name} style={{ cursor: 'pointer' }} onClick={() => setExpandedStrategy(expandedStrategy === s.name ? null : s.name)}>
                      <td><strong className="text-accent">{s.name}</strong></td>
                      <td>{s.trades}</td>
                      <td className="text-success">{s.wins}</td>
                      <td className="text-danger">{s.losses}</td>
                      <td className={s.winRate >= 50 ? 'text-success' : 'text-danger'} style={{ fontWeight: 600 }}>{s.winRate.toFixed(1)}%</td>
                      <td style={{ fontSize: '0.75rem' }}>
                        <span className="text-success">{s.longs}</span>
                        <span className="text-muted"> ({s.longWinRate.toFixed(0)}%)</span>
                      </td>
                      <td style={{ fontSize: '0.75rem' }}>
                        <span className="text-danger">{s.shorts}</span>
                        <span className="text-muted"> ({s.shortWinRate.toFixed(0)}%)</span>
                      </td>
                      <td className={s.avgPnL >= 0 ? 'text-success' : 'text-danger'}>${s.avgPnL.toFixed(2)}</td>
                      <td className={s.pnl >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>{s.pnl >= 0 ? '+' : '-'}${Math.abs(s.pnl).toFixed(2)}</td>
                      <td><i className={`fa-solid fa-chevron-${expandedStrategy === s.name ? 'up' : 'down'} text-muted`} style={{ fontSize: '0.7rem' }}></i></td>
                    </tr>
                    {expandedStrategy === s.name && (
                      <tr key={`${s.name}-detail`}>
                        <td colSpan="10" style={{ padding: '12px 16px', background: 'rgba(255,255,255,0.02)' }}>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                            {/* Direction Stats */}
                            <div>
                              <div className="text-xs text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Direction Performance</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <div className="flex justify-between text-sm">
                                  <span className="text-success">Long (Buy)</span>
                                  <span>{s.longs} trades | {s.longWinRate.toFixed(1)}% WR | <span className={s.longPnl >= 0 ? 'text-success' : 'text-danger'}>{s.longPnl >= 0 ? '+' : '-'}${Math.abs(s.longPnl).toFixed(2)}</span></span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-danger">Short (Sell)</span>
                                  <span>{s.shorts} trades | {s.shortWinRate.toFixed(1)}% WR | <span className={s.shortPnl >= 0 ? 'text-success' : 'text-danger'}>{s.shortPnl >= 0 ? '+' : '-'}${Math.abs(s.shortPnl).toFixed(2)}</span></span>
                                </div>
                              </div>
                            </div>

                            {/* Best / Worst */}
                            <div>
                              <div className="text-xs text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Best / Worst Trade</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {s.bestTrade && (
                                  <div className="text-sm">
                                    <span className="text-success">Best:</span> {s.bestTrade.asset} | +${(s.bestTrade.pnl || 0).toFixed(2)}
                                  </div>
                                )}
                                {s.worstTrade && (
                                  <div className="text-sm">
                                    <span className="text-danger">Worst:</span> {s.worstTrade.asset} | -${Math.abs(s.worstTrade.pnl || 0).toFixed(2)}
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Setups */}
                            <div>
                              <div className="text-xs text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Setups Used</div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                {Object.entries(s.setups).map(([name, data]) => (
                                  <div key={name} className="flex justify-between text-xs">
                                    <span className="text-accent">{name}</span>
                                    <span>{data.count} trades | {data.count ? ((data.wins / data.count) * 100).toFixed(0) : 0}% WR</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>

                          {/* Recent Trades */}
                          <div style={{ marginTop: '12px', borderTop: '1px solid var(--card-border)', paddingTop: '12px' }}>
                            <div className="text-xs text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>Recent Trades</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                              {s.recentTrades.map(t => (
                                <div key={t.id} className="flex gap-2 align-center" style={{ background: 'rgba(255,255,255,0.03)', padding: '4px 10px', borderRadius: '6px', fontSize: '0.75rem' }}>
                                  <span className="text-muted">{t.date}</span>
                                  <strong className="text-accent">{t.asset}</strong>
                                  <span className={t.type === 'Buy' ? 'text-success' : 'text-danger'}>{t.type?.toUpperCase()}</span>
                                  <span className={t.pnl >= 0 ? 'text-success' : 'text-danger'}>{t.pnl >= 0 ? '+' : '-'}${Math.abs(t.pnl || 0).toFixed(2)}</span>
                                  <button className="btn btn-sm btn-icon btn-secondary" style={{ padding: '2px 4px' }} onClick={(e) => { e.stopPropagation(); navigate('/entry', { state: { edit: t } }); }} title="View Trade"><i className="fa fa-eye" style={{ fontSize: '0.6rem' }}></i></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Per-Account Strategy Breakdown */}
      {selectedAccount === 'all' && activeAccounts.length > 1 && (
        <div className="card-premium">
          <div className="card-title-bar"><h3><i className="fa-solid fa-layer-group"></i> Per-Account Strategy Overview</h3></div>
          <div className="table-wrapper">
            <table className="table-custom">
              <thead>
                <tr>
                  <th>Account</th>
                  <th>Strategies Used</th>
                  <th>Total Trades</th>
                  <th>Win Rate</th>
                  <th>Long / Short</th>
                  <th>Total PnL</th>
                </tr>
              </thead>
              <tbody>
                {activeAccounts.map(acc => {
                  const accTrades = state.allTrades.filter(t => t.accountId === acc.id);
                  const accStrategies = new Set(accTrades.map(t => t.strategy || 'None'));
                  const accWins = accTrades.filter(t => t.result === 'Win').length;
                  const accLosses = accTrades.filter(t => t.result === 'Loss').length;
                  const accWR = (accWins + accLosses) ? (accWins / (accWins + accLosses) * 100) : 0;
                  const accPnL = accTrades.reduce((s, t) => s + (t.pnl || 0), 0);
                  const accLongs = accTrades.filter(t => t.type === 'Buy').length;
                  const accShorts = accTrades.filter(t => t.type !== 'Buy').length;
                  return (
                    <tr key={acc.id}>
                      <td><strong className="text-accent">{acc.name}</strong></td>
                      <td>{accStrategies.size}</td>
                      <td>{accTrades.length}</td>
                      <td className={accWR >= 50 ? 'text-success' : 'text-danger'}>{accWR.toFixed(1)}%</td>
                      <td><span className="text-success">{accLongs}</span> / <span className="text-danger">{accShorts}</span></td>
                      <td className={accPnL >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>{accPnL >= 0 ? '+' : '-'}${Math.abs(accPnL).toFixed(2)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

import { useMemo, useState, useEffect, useCallback } from 'react';
import { useApp } from '../context/AppContext';
import { saveChecklist } from '../lib/storage';
import { Line, Doughnut } from 'react-chartjs-2';
import '../lib/chartConfig';

const SESSION_CLOCKS = [
  { name: 'Sydney', tz: 'Australia/Sydney', openH: 22, closeH: 7, utc: true },
  { name: 'Tokyo', tz: 'Asia/Tokyo', openH: 0, closeH: 9, utc: true },
  { name: 'London', tz: 'Europe/London', openH: 8, closeH: 17, utc: true },
  { name: 'New York', tz: 'America/New_York', openH: 13, closeH: 22, utc: true },
];

function isSessionOpen(session, now) {
  const utcH = now.getUTCHours();
  if (session.openH < session.closeH) {
    return utcH >= session.openH && utcH < session.closeH;
  }
  return utcH >= session.openH || utcH < session.closeH;
}

function getSessionLocalTime(session) {
  return new Date().toLocaleTimeString('en-US', { timeZone: session.tz, hour: '2-digit', minute: '2-digit', hour12: true });
}

export default function Dashboard() {
  const { state, dispatch } = useApp();
  const { trades: filteredTrades, allTrades, accounts, checklist, activeAccountId } = state;

  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const stats = useMemo(() => {
    if (!filteredTrades.length) return null;
    const wins = filteredTrades.filter(t => t.result === 'Win');
    const losses = filteredTrades.filter(t => t.result === 'Loss');
    const today = new Date().toISOString().split('T')[0];
    const todayTrades = filteredTrades.filter(t => t.date === today);
    const todayPnL = todayTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const totalPnL = filteredTrades.reduce((s, t) => s + (t.pnl || 0), 0);
    const grossProfit = wins.reduce((s, t) => s + (t.pnl || 0), 0);
    const grossLoss = losses.reduce((s, t) => s + Math.abs(t.pnl || 0), 0);
    const winRate = filteredTrades.length ? ((wins.length / (wins.length + losses.length)) * 100) : 0;
    const profitFactor = grossLoss ? grossProfit / grossLoss : grossProfit ? 99.9 : 0;
    const baseBalance = activeAccountId !== 'all'
      ? (accounts.find(a => a.id === activeAccountId)?.balance || 0)
      : accounts.reduce((s, a) => s + (a.balance || 0), 0);
    const balance = baseBalance + totalPnL;
    const bestTrade = filteredTrades.reduce((best, t) => (t.pnl > (best?.pnl || -Infinity)) ? t : best, null);
    const worstTrade = filteredTrades.reduce((worst, t) => (t.pnl < (worst?.pnl || Infinity)) ? t : worst, null);

    let maxDD = 0, peak = 0;
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    let cum = balance || 10000;
    sorted.forEach(t => {
      cum += t.pnl || 0;
      if (cum > peak) peak = cum;
      const dd = peak ? ((peak - cum) / peak) * 100 : 0;
      if (dd > maxDD) maxDD = dd;
    });

    let streak = 0, streakType = '';
    for (let i = 0; i < sorted.length; i++) {
      const r = sorted[i].result;
      if (i === 0) { streakType = r; streak = 1; }
      else if (r === streakType) streak++;
      else break;
    }

    const roi = balance ? ((totalPnL / balance) * 100) : 0;
    const avgPnL = filteredTrades.length ? totalPnL / filteredTrades.length : 0;

    return {
      todayPnL, totalPnL, balance, winRate, profitFactor,
      totalTrades: filteredTrades.length, wins: wins.length, losses: losses.length,
      bestTrade, worstTrade, maxDD: maxDD.toFixed(1), streak: `${streak} ${streakType}`,
      roi: roi.toFixed(1), avgPnL
    };
  }, [filteredTrades, accounts, activeAccountId]);

  const equityData = useMemo(() => {
    if (!filteredTrades.length) return null;
    const sorted = [...filteredTrades].sort((a, b) => new Date(a.date) - new Date(b.date));
    const baseBalance = activeAccountId !== 'all'
      ? (accounts.find(a => a.id === activeAccountId)?.balance || 0)
      : accounts.reduce((s, a) => s + (a.balance || 0), 0);
    let cum = baseBalance || 10000;
    const labels = [];
    const data = [cum];
    sorted.forEach(t => {
      cum += t.pnl || 0;
      labels.push(t.date);
      data.push(cum);
    });
    return {
      labels: ['Start', ...labels],
      datasets: [{
        label: 'Equity',
        data,
        borderColor: '#6366f1',
        backgroundColor: 'rgba(99,102,241,0.1)',
        fill: true,
        tension: 0.3,
        pointRadius: 0,
      }]
    };
  }, [filteredTrades, accounts, activeAccountId]);

  const winLossData = useMemo(() => {
    if (!filteredTrades.length) return null;
    const wins = filteredTrades.filter(t => t.result === 'Win').length;
    const losses = filteredTrades.filter(t => t.result === 'Loss').length;
    const be = filteredTrades.filter(t => t.result === 'Break-even').length;
    return {
      labels: ['Wins', 'Losses', 'Break-even'],
      datasets: [{
        data: [wins, losses, be],
        backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
        borderWidth: 0,
      }]
    };
  }, [filteredTrades]);

  const heatmapData = useMemo(() => {
    if (!filteredTrades.length) return [];
    const daily = {};
    filteredTrades.forEach(t => {
      daily[t.date] = (daily[t.date] || 0) + (t.pnl || 0);
    });
    const cells = [];
    const today = new Date();
    for (let i = 48; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      cells.push({ date: key, pnl: daily[key] || 0, hasTrades: !!daily[key] });
    }
    return cells;
  }, [filteredTrades]);

  const sessionPerf = useMemo(() => {
    if (!filteredTrades.length) return [];
    const sessions = { Tokyo: { w: 0, l: 0, pnl: 0 }, London: { w: 0, l: 0, pnl: 0 }, 'New York': { w: 0, l: 0, pnl: 0 }, Asian: { w: 0, l: 0, pnl: 0 }, Overlap: { w: 0, l: 0, pnl: 0 } };
    filteredTrades.forEach(t => {
      const s = t.session;
      if (s && sessions[s]) {
        if (t.result === 'Win') sessions[s].w++;
        else if (t.result === 'Loss') sessions[s].l++;
        sessions[s].pnl += t.pnl || 0;
      }
    });
    return Object.entries(sessions).map(([name, d]) => ({
      name, ...d, total: d.w + d.l, wr: (d.w + d.l) ? ((d.w / (d.w + d.l)) * 100).toFixed(1) : '0.0'
    }));
  }, [filteredTrades]);

  const strategyPerf = useMemo(() => {
    if (!filteredTrades.length) return [];
    const map = {};
    filteredTrades.forEach(t => {
      const s = t.strategy || 'None';
      if (!map[s]) map[s] = { name: s, trades: 0, wins: 0, losses: 0, pnl: 0 };
      map[s].trades++;
      if (t.result === 'Win') map[s].wins++;
      else if (t.result === 'Loss') map[s].losses++;
      map[s].pnl += t.pnl || 0;
    });
    return Object.values(map).sort((a, b) => b.pnl - a.pnl);
  }, [filteredTrades]);

  const handleChecklistToggle = useCallback(async (itemId) => {
    const updated = checklist.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    dispatch({ type: 'SET_CHECKLIST', payload: updated });
    await saveChecklist(updated);
  }, [checklist, dispatch]);

  const getSym = (accId) => {
    const acc = accounts.find(a => a.id === accId);
    return acc?.currency === 'EUR' ? '€' : acc?.currency === 'GBP' ? '£' : acc?.currency === 'INR' ? '₹' : '$';
  };

  if (!stats) {
    return (
      <div className="text-center text-muted p-4" style={{ paddingTop: '80px' }}>
        <i className="fa-solid fa-chart-line" style={{ fontSize: '3rem', color: 'var(--primary)', marginBottom: '16px' }}></i>
        <h3>No trades yet</h3>
        <p>Start logging trades to see your dashboard.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Row 1: Core Stats */}
      <div className="grid-cols-4 mb-4">
        {[
          { label: "Today's PnL", value: `${stats.todayPnL >= 0 ? '+' : '-'}$${Math.abs(stats.todayPnL).toFixed(2)}`, cls: stats.todayPnL >= 0 ? 'text-success' : 'text-danger', icon: 'fa-calendar-day' },
          { label: 'Total PnL', value: `${stats.totalPnL >= 0 ? '+' : '-'}$${Math.abs(stats.totalPnL).toFixed(2)}`, cls: stats.totalPnL >= 0 ? 'text-success' : 'text-danger', icon: 'fa-sack-dollar' },
          { label: 'Balance', value: `$${stats.balance.toLocaleString()}`, cls: 'text-accent', icon: 'fa-wallet' },
          { label: 'Win Rate', value: `${stats.winRate.toFixed(1)}%`, cls: stats.winRate >= 50 ? 'text-success' : 'text-danger', icon: 'fa-bullseye' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <i className={`fa-solid ${s.icon} stat-icon`}></i>
            <span className="stat-label">{s.label}</span>
            <span className={`stat-value ${s.cls}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Row 2: Extended Stats */}
      <div className="grid-cols-4 mb-4">
        {[
          { label: 'Total Trades', value: stats.totalTrades, cls: 'text-light' },
          { label: 'Win / Loss', value: `${stats.wins} / ${stats.losses}`, cls: 'text-light' },
          { label: 'Profit Factor', value: stats.profitFactor.toFixed(2), cls: stats.profitFactor >= 1 ? 'text-success' : 'text-danger' },
          { label: 'Max Drawdown', value: `${stats.maxDD}%`, cls: 'text-danger' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <span className="stat-label">{s.label}</span>
            <span className={`stat-value ${s.cls}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Row 3: More Stats */}
      <div className="grid-cols-4 mb-4">
        {[
          { label: 'Best Trade', value: stats.bestTrade ? `${getSym(stats.bestTrade.accountId)}${Math.abs(stats.bestTrade.pnl).toFixed(2)}` : '-', cls: 'text-success' },
          { label: 'Worst Trade', value: stats.worstTrade ? `${getSym(stats.worstTrade.accountId)}${Math.abs(stats.worstTrade.pnl).toFixed(2)}` : '-', cls: 'text-danger' },
          { label: 'Current Streak', value: stats.streak, cls: 'text-light' },
          { label: 'ROI', value: `${stats.roi}%`, cls: parseFloat(stats.roi) >= 0 ? 'text-success' : 'text-danger' },
        ].map((s, i) => (
          <div key={i} className="stat-card">
            <span className="stat-label">{s.label}</span>
            <span className={`stat-value ${s.cls}`}>{s.value}</span>
          </div>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid-cols-12 mb-4">
        <div className="card-premium col-span-8">
          <div className="card-title-bar">
            <h3><i className="fa-solid fa-chart-line"></i> Equity Curve</h3>
          </div>
          <div className="chart-container-wrapper">
            {equityData && <Line data={equityData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { display: false }, y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#64748b' } } } }} />}
          </div>
        </div>
        <div className="card-premium col-span-4">
          <div className="card-title-bar">
            <h3><i className="fa-solid fa-chart-pie"></i> Win / Loss</h3>
          </div>
          <div className="chart-container-wrapper" style={{ height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {winLossData && <Doughnut data={winLossData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: '#94a3b8' } } }, cutout: '65%' }} />}
          </div>
        </div>
      </div>

      {/* Session Performance + Clocks */}
      <div className="grid-cols-2 mb-4">
        <div className="card-premium">
          <div className="card-title-bar"><h3><i className="fa-solid fa-layer-group"></i> Session Performance</h3></div>
          <div className="table-wrapper">
            <table className="table-custom">
              <thead><tr><th>Session</th><th>Trades</th><th>Win Rate</th><th>PnL</th></tr></thead>
              <tbody>
                {sessionPerf.map(s => (
                  <tr key={s.name}>
                    <td className="font-semibold">{s.name}</td>
                    <td>{s.total}</td>
                    <td className={parseFloat(s.wr) >= 50 ? 'text-success' : 'text-danger'}>{s.wr}%</td>
                    <td className={s.pnl >= 0 ? 'text-success' : 'text-danger'}>{s.pnl >= 0 ? '+' : '-'}${Math.abs(s.pnl).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card-premium">
          <div className="card-title-bar"><h3><i className="fa-solid fa-clock"></i> Session Clocks (IST)</h3></div>
          <div className="grid-cols-2" style={{ gap: '12px' }}>
            {SESSION_CLOCKS.map(sc => {
              const open = isSessionOpen(sc, now);
              return (
                <div key={sc.name} className={`calc-box ${open ? 'session-open' : ''}`}>
                  <div className="flex justify-between align-center">
                    <span className="font-semibold text-sm">{sc.name}</span>
                    <span className={`badge ${open ? 'badge-win' : 'badge-loss'}`}>{open ? 'OPEN' : 'CLOSED'}</span>
                  </div>
                  <div className="text-xs text-muted mt-1">{getSessionLocalTime(sc)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Strategy Performance */}
      <div className="card-premium mb-4">
        <div className="card-title-bar"><h3><i className="fa-solid fa-chess"></i> Strategy Performance</h3></div>
        {strategyPerf.length === 0 ? (
          <p className="text-xs text-muted">No strategy data yet.</p>
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
                  <th>PnL</th>
                  <th style={{ width: '120px' }}>Performance</th>
                </tr>
              </thead>
              <tbody>
                {strategyPerf.map(s => {
                  const wr = (s.wins + s.losses) ? ((s.wins / (s.wins + s.losses)) * 100) : 0;
                  return (
                    <tr key={s.name}>
                      <td><strong className="text-accent">{s.name}</strong></td>
                      <td>{s.trades}</td>
                      <td className="text-success">{s.wins}</td>
                      <td className="text-danger">{s.losses}</td>
                      <td className={wr >= 50 ? 'text-success' : 'text-danger'} style={{ fontWeight: 600 }}>{wr.toFixed(1)}%</td>
                      <td className={s.pnl >= 0 ? 'text-success' : 'text-danger'} style={{ fontWeight: 700 }}>{s.pnl >= 0 ? '+' : '-'}${Math.abs(s.pnl).toFixed(2)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ background: wr >= 50 ? 'var(--success)' : 'var(--danger)', height: '100%', width: `${wr}%`, borderRadius: '3px', transition: 'width 0.3s' }}></div>
                          </div>
                          <span className="text-xs text-muted" style={{ minWidth: '30px' }}>{wr.toFixed(0)}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Heatmap + Checklist + Goals */}
      <div className="grid-cols-12">
        <div className="card-premium col-span-6">
          <div className="card-title-bar"><h3><i className="fa-solid fa-fire"></i> Activity Heatmap</h3></div>
          <div className="heatmap-grid">
            {heatmapData.map((cell, i) => {
              const maxPnl = Math.max(...heatmapData.map(c => Math.abs(c.pnl)), 1);
              const intensity = cell.hasTrades ? Math.min(Math.abs(cell.pnl) / maxPnl, 1) : 0;
              const bg = !cell.hasTrades ? 'rgba(255,255,255,0.03)' : cell.pnl >= 0
                ? `rgba(16,185,129,${0.1 + intensity * 0.5})`
                : `rgba(239,68,68,${0.1 + intensity * 0.5})`;
              return (
                <div key={i} className="heatmap-cell" style={{ backgroundColor: bg }} title={`${cell.date}: ${cell.pnl >= 0 ? '+' : ''}$${cell.pnl.toFixed(2)}`}>
                  <span className="heatmap-tooltip">{cell.date}: ${cell.pnl.toFixed(2)}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="card-premium col-span-3">
          <div className="card-title-bar"><h3><i className="fa-solid fa-list-check"></i> Checklist</h3></div>
          {checklist.length === 0 ? (
            <p className="text-xs text-muted">No checklist items.</p>
          ) : checklist.map(item => (
            <div key={item.id} className={`checklist-item ${item.completed ? 'completed' : ''}`}>
              <input type="checkbox" className="checklist-checkbox" checked={item.completed} onChange={() => handleChecklistToggle(item.id)} />
              <span className="checklist-text">{item.task}</span>
            </div>
          ))}
        </div>

        <div className="card-premium col-span-3">
          <div className="card-title-bar"><h3><i className="fa-solid fa-bullseye"></i> Goals</h3></div>
          {state.goals.length === 0 ? (
            <p className="text-xs text-muted">No goals set.</p>
          ) : state.goals.map(goal => {
            const pct = Math.min((goal.current / goal.target) * 100, 100);
            const done = goal.current >= goal.target;
            return (
              <div key={goal.id} className="flex flex-col text-xs mt-1">
                <div className="flex justify-between font-semibold">
                  <span>{goal.title}</span>
                  <span className={done ? 'text-success' : 'text-accent'}>{goal.current}/{goal.target}</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.05)', height: '4px', borderRadius: '2px', marginTop: '4px' }}>
                  <div style={{ background: done ? 'var(--success)' : 'var(--primary)', height: '100%', width: `${pct}%`, borderRadius: '2px' }}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

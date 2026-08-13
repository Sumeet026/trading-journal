import { useMemo } from 'react';
import { Doughnut, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Tooltip,
  Legend,
} from 'chart.js';
import { useApp } from '../context/AppContext';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Tooltip, Legend);

const SESSIONS = {
  Tokyo: { label: 'Tokyo', time: '5:30–11:30 IST', color: '#6366f1' },
  London: { label: 'London', time: '12:00–19:00 IST', color: '#10b981' },
  'New York': { label: 'New York', time: '13:00–19:00 IST', color: '#f59e0b' },
  Asian: { label: 'Asian/Osaka', time: '19:00–1:30 IST', color: '#ef4444' },
  Overlap: { label: 'London-NY Overlap', time: '13:00–19:00 IST', color: '#ec4899' },
};

function calculateSessionStats(trades) {
  const stats = {};
  Object.keys(SESSIONS).forEach((s) => {
    stats[s] = { wins: 0, losses: 0, breakeven: 0, totalPnl: 0, trades: 0, strategies: {} };
  });

  trades.forEach((t) => {
    const session = t.session || 'None';
    if (!stats[session]) {
      stats[session] = { wins: 0, losses: 0, breakeven: 0, totalPnl: 0, trades: 0, strategies: {} };
    }
    stats[session].trades++;
    if (t.result === 'Win') stats[session].wins++;
    else if (t.result === 'Loss') stats[session].losses++;
    else stats[session].breakeven++;
    stats[session].totalPnl += t.pnl;

    const strat = t.strategy || 'None';
    if (!stats[session].strategies[strat]) {
      stats[session].strategies[strat] = { wins: 0, losses: 0, pnl: 0, trades: 0 };
    }
    stats[session].strategies[strat].trades++;
    stats[session].strategies[strat].pnl += t.pnl;
    if (t.result === 'Win') stats[session].strategies[strat].wins++;
    else if (t.result === 'Loss') stats[session].strategies[strat].losses++;
  });

  return stats;
}

const chartThemeOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: { color: '#94a3b8', font: { family: "'Inter', sans-serif", size: 12 } },
    },
    tooltip: {
      backgroundColor: '#12161f',
      titleColor: '#f8fafc',
      bodyColor: '#94a3b8',
      borderColor: '#1f2635',
      borderWidth: 1,
      padding: 10,
      cornerRadius: 6,
      displayColors: true,
    },
  },
};

const styles = {
  page: { padding: '24px', minHeight: '100vh', color: '#f8fafc' },
  emptyState: { textAlign: 'center', padding: '60px 20px', color: '#64748b', fontSize: '14px' },
  statGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
    gap: '16px',
    marginBottom: '28px',
  },
  statCard: {
    background: '#0f131a',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '20px',
  },
  statLabel: { fontSize: '12px', color: '#64748b', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' },
  statValue: { fontSize: '22px', fontWeight: 700 },
  statSub: { fontSize: '12px', color: '#94a3b8', marginTop: '4px' },
  sectionTitle: { fontSize: '16px', fontWeight: 600, color: '#f8fafc', marginBottom: '14px', marginTop: '32px' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: {
    textAlign: 'left',
    padding: '10px 12px',
    borderBottom: '1px solid rgba(255,255,255,0.06)',
    color: '#64748b',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    fontWeight: 600,
  },
  td: { padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)' },
  badge: (color) => ({
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 600,
    background: `${color}22`,
    color: color,
    border: `1px solid ${color}44`,
  }),
  untaggedRow: { background: 'rgba(245,158,11,0.05)' },
  matrixScroll: { overflowX: 'auto' },
  chartRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
    gap: '20px',
    marginBottom: '28px',
  },
  chartCard: {
    background: '#0f131a',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '20px',
  },
  chartTitle: { fontSize: '13px', fontWeight: 600, color: '#94a3b8', marginBottom: '16px' },
  chartWrap: { height: '280px', position: 'relative' },
  recCard: (type) => {
    const colors = {
      success: { bg: 'rgba(16,185,129,0.08)', border: '#10b981' },
      danger: { bg: 'rgba(239,68,68,0.08)', border: '#ef4444' },
      info: { bg: 'rgba(99,102,241,0.08)', border: '#6366f1' },
    };
    const c = colors[type] || colors.info;
    return {
      display: 'flex',
      gap: '12px',
      padding: '12px 16px',
      borderRadius: '10px',
      fontSize: '13px',
      background: c.bg,
      borderLeft: `3px solid ${c.border}`,
      color: '#cbd5e1',
      marginBottom: '10px',
    };
  },
  recIcon: (type) => ({
    flexShrink: 0,
    width: '18px',
    height: '18px',
    marginTop: '1px',
    color: type === 'success' ? '#10b981' : type === 'danger' ? '#ef4444' : '#6366f1',
  }),
};

function formatPnl(val) {
  const prefix = val >= 0 ? '+' : '-';
  return `${prefix}$${Math.abs(val).toFixed(2)}`;
}

function PnlText({ value, style }) {
  return (
    <span style={{ color: value >= 0 ? '#10b981' : '#ef4444', ...style }}>
      {formatPnl(value)}
    </span>
  );
}

function WrText({ value, style }) {
  return (
    <span style={{ color: value >= 50 ? '#10b981' : '#ef4444', fontWeight: 700, ...style }}>
      {value.toFixed(1)}%
    </span>
  );
}

export default function SessionAnalysis() {
  const { state } = useApp();
  const trades = state.allTrades;

  const stats = useMemo(() => {
    if (!trades.length) return null;
    return calculateSessionStats(trades);
  }, [trades]);

  const summary = useMemo(() => {
    if (!stats) return null;

    let bestSession = null;
    let bestWinRate = -1;
    let worstSession = null;
    let worstWinRate = 101;
    let bestPnlSession = null;
    let bestPnl = -Infinity;
    let totalPnl = 0;
    let totalTrades = 0;

    Object.entries(SESSIONS).forEach(([key]) => {
      const s = stats[key];
      if (!s || s.trades === 0) return;
      const wr = (s.wins / s.trades) * 100;
      if (wr > bestWinRate) { bestWinRate = wr; bestSession = key; }
      if (wr < worstWinRate) { worstWinRate = wr; worstSession = key; }
      if (s.totalPnl > bestPnl) { bestPnl = s.totalPnl; bestPnlSession = key; }
      totalPnl += s.totalPnl;
      totalTrades += s.trades;
    });

    const avgPnl = totalTrades ? totalPnl / totalTrades : 0;
    const noneTrades = (stats['None'] && stats['None'].trades) || 0;

    return {
      bestSession, bestWinRate,
      worstSession, worstWinRate,
      bestPnlSession, bestPnl,
      totalPnl, totalTrades, avgPnl,
      noneTrades,
    };
  }, [stats]);

  const doughnutData = useMemo(() => {
    if (!stats) return null;
    const labels = [];
    const winRates = [];
    const colors = [];

    Object.entries(SESSIONS).forEach(([key, sess]) => {
      const s = stats[key];
      if (s && s.trades > 0) {
        labels.push(sess.label);
        const wr = (s.wins / s.trades) * 100;
        winRates.push(parseFloat(wr.toFixed(1)));
        colors.push(sess.color);
      }
    });

    if (!labels.length) {
      labels.push('No Data');
      winRates.push(1);
      colors.push('rgba(255,255,255,0.1)');
    }

    return {
      labels,
      datasets: [{ data: winRates, backgroundColor: colors, borderColor: '#12161f', borderWidth: 2 }],
    };
  }, [stats]);

  const doughnutOptions = useMemo(() => ({
    ...chartThemeOptions,
    plugins: {
      ...chartThemeOptions.plugins,
      legend: { ...chartThemeOptions.plugins.legend, position: 'bottom' },
      tooltip: {
        ...chartThemeOptions.plugins.tooltip,
        callbacks: {
          label: (ctx) => `${ctx.label}: ${ctx.parsed}% Win Rate`,
        },
      },
    },
    cutout: '65%',
  }), []);

  const barData = useMemo(() => {
    if (!stats) return null;
    const labels = [];
    const pnlValues = [];
    const bgColors = [];

    Object.entries(SESSIONS).forEach(([key, sess]) => {
      const s = stats[key];
      if (s && s.trades > 0) {
        labels.push(sess.label);
        pnlValues.push(parseFloat(s.totalPnl.toFixed(2)));
        bgColors.push(s.totalPnl >= 0 ? 'rgba(16,185,129,0.7)' : 'rgba(239,68,68,0.7)');
      }
    });

    return {
      labels,
      datasets: [{ label: 'Net PnL', data: pnlValues, backgroundColor: bgColors, borderRadius: 6 }],
    };
  }, [stats]);

  const barOptions = useMemo(() => ({
    ...chartThemeOptions,
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#94a3b8', font: { size: 10 } },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: {
          color: '#94a3b8',
          font: { size: 10 },
          callback: (v) => (v >= 0 ? '$' + v : '-$' + Math.abs(v)),
        },
      },
    },
    plugins: {
      ...chartThemeOptions.plugins,
      tooltip: {
        ...chartThemeOptions.plugins.tooltip,
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y;
            return `Net: ${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)}`;
          },
        },
      },
    },
  }), []);

  const strategyMatrix = useMemo(() => {
    if (!stats) return { rows: [], hasData: false };
    const allStrategies = new Set();
    Object.values(stats).forEach((s) => {
      if (s.strategies) {
        Object.keys(s.strategies).forEach((strat) => {
          if (strat !== 'None') allStrategies.add(strat);
        });
      }
    });

    if (!allStrategies.size) return { rows: [], hasData: false };

    const rows = [];
    allStrategies.forEach((strat) => {
      const cells = Object.keys(SESSIONS).map((key) => {
        const s = stats[key];
        const stratData = s && s.strategies ? s.strategies[strat] : null;
        if (stratData && stratData.trades > 0) {
          const wr = (stratData.wins / stratData.trades) * 100;
          return { wr, count: stratData.trades };
        }
        return null;
      });
      rows.push({ strategy: strat, cells });
    });

    return { rows, hasData: true };
  }, [stats]);

  const recommendations = useMemo(() => {
    if (!stats) return [];
    const recs = [];

    Object.entries(SESSIONS).forEach(([key, sess]) => {
      const s = stats[key];
      if (!s || s.trades < 3) return;
      const wr = (s.wins / s.trades) * 100;
      const avgPnl = s.totalPnl / s.trades;

      if (wr >= 60) {
        recs.push({
          type: 'success',
          icon: '🏆',
          text: (
            <>
              <strong>{sess.label}</strong> is your best session with{' '}
              <span style={{ color: '#10b981', fontWeight: 700 }}>{wr.toFixed(1)}% win rate</span>{' '}
              and avg PnL of ${avgPnl.toFixed(2)}. Focus more time here!
            </>
          ),
        });
      } else if (wr < 40) {
        recs.push({
          type: 'danger',
          icon: '⚠️',
          text: (
            <>
              <strong>{sess.label}</strong> has a low win rate of{' '}
              <span style={{ color: '#ef4444', fontWeight: 700 }}>{wr.toFixed(1)}%</span>.
              Consider reducing position size or avoiding this session.
            </>
          ),
        });
      }

      if (s.strategies) {
        Object.entries(s.strategies).forEach(([stratName, stratData]) => {
          if (stratData.trades >= 3) {
            const stratWr = (stratData.wins / stratData.trades) * 100;
            if (stratWr >= 70) {
              recs.push({
                type: 'success',
                icon: '♟️',
                text: (
                  <>
                    Strategy "<strong>{stratName}</strong>" in <strong>{sess.label}</strong> has an excellent{' '}
                    <span style={{ color: '#10b981', fontWeight: 700 }}>{stratWr.toFixed(1)}% win rate</span>.
                    This is your edge!
                  </>
                ),
              });
            }
          }
        });
      }
    });

    const hasAnySession = Object.keys(SESSIONS).some((k) => stats[k] && stats[k].trades > 0);
    if (!hasAnySession) {
      recs.push({
        type: 'info',
        icon: '💡',
        text: 'Start tagging each trade with a session (Tokyo/London/NY/Asian) to unlock session-based performance insights.',
      });
    }

    if (stats.Overlap && stats.Overlap.trades >= 3) {
      const overlapWr = (stats.Overlap.wins / stats.Overlap.trades) * 100;
      recs.push({
        type: 'info',
        icon: '↔️',
        text: (
          <>
            London-NY Overlap session: <strong>{stats.Overlap.trades} trades</strong> with{' '}
            <span style={{ color: overlapWr >= 50 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
              {overlapWr.toFixed(1)}% win rate
            </span>.
            This is typically the most volatile session.
          </>
        ),
      });
    }

    if (!recs.length) {
      recs.push({
        type: 'info',
        icon: '💡',
        text: 'Add at least 3 trades per session to get personalized recommendations.',
      });
    }

    return recs;
  }, [stats]);

  if (!trades.length) {
    return (
      <div style={styles.page}>
        <div style={styles.emptyState}>
          <p>No trades logged yet. Add trades with session data to see analysis.</p>
        </div>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div style={styles.page}>
      <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: '#f8fafc' }}>
        Session Analysis
      </h2>

      <div style={styles.statGrid}>
        <div style={styles.statCard}>
          <div style={styles.statLabel}>Best Session (by Win Rate)</div>
          <div style={{ ...styles.statValue, color: '#10b981' }}>
            {summary.bestSession ? SESSIONS[summary.bestSession].label : '--'}
          </div>
          <div style={styles.statSub}>
            {summary.bestSession
              ? `${summary.bestWinRate.toFixed(1)}% win rate`
              : summary.noneTrades > 0
                ? `${summary.noneTrades} trades need session tag`
                : 'No data yet'}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Best Session (by PnL)</div>
          <div style={{ ...styles.statValue, color: summary.bestPnl >= 0 ? '#10b981' : '#ef4444' }}>
            {summary.bestPnlSession ? formatPnl(summary.bestPnl) : '$0.00'}
          </div>
          <div style={styles.statSub}>
            {summary.bestPnlSession
              ? `${stats[summary.bestPnlSession].trades} trades`
              : '0 trades'}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Worst Session (by Win Rate)</div>
          <div style={{ ...styles.statValue, color: '#ef4444' }}>
            {summary.worstSession ? SESSIONS[summary.worstSession].label : '--'}
          </div>
          <div style={styles.statSub}>
            {summary.worstSession
              ? `${summary.worstWinRate.toFixed(1)}% win rate`
              : 'No data yet'}
          </div>
        </div>

        <div style={styles.statCard}>
          <div style={styles.statLabel}>Average Session PnL</div>
          <div style={{ ...styles.statValue, color: summary.avgPnl >= 0 ? '#10b981' : '#ef4444' }}>
            {formatPnl(summary.avgPnl)}
          </div>
          <div style={styles.statSub}>{summary.totalTrades} total trades</div>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Session Performance</h3>
      <div style={{ overflowX: 'auto' }}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Session</th>
              <th style={styles.th}>IST Time</th>
              <th style={styles.th}>Trades</th>
              <th style={styles.th}>Wins</th>
              <th style={styles.th}>Win Rate</th>
              <th style={styles.th}>Total PnL</th>
              <th style={styles.th}>Avg PnL</th>
              <th style={styles.th}>Best Strategy</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(SESSIONS).map(([key, sess]) => {
              const s = stats[key];
              const tCount = s ? s.trades : 0;
              const wins = s ? s.wins : 0;
              const wr = tCount ? (wins / tCount) * 100 : 0;
              const pnl = s ? s.totalPnl : 0;
              const avgPnl = tCount ? pnl / tCount : 0;

              let bestStrat = '--';
              let bestStratPnl = -Infinity;
              if (s && s.strategies) {
                Object.entries(s.strategies).forEach(([stratName, stratData]) => {
                  if (stratData.pnl > bestStratPnl && stratName !== 'None') {
                    bestStratPnl = stratData.pnl;
                    bestStrat = stratName;
                  }
                });
              }

              return (
                <tr key={key}>
                  <td style={styles.td}>
                    <span style={styles.badge(sess.color)}>{sess.label}</span>
                  </td>
                  <td style={{ ...styles.td, fontSize: '12px', color: '#64748b' }}>{sess.time}</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{tCount}</td>
                  <td style={{ ...styles.td, fontWeight: 600, color: '#10b981' }}>{wins}</td>
                  <td style={styles.td}><WrText value={wr} /></td>
                  <td style={styles.td}><PnlText value={pnl} style={{ fontWeight: 700 }} /></td>
                  <td style={styles.td}><PnlText value={avgPnl} style={{ fontSize: '12px' }} /></td>
                  <td style={{ ...styles.td, color: '#6366f1', fontWeight: 600 }}>{bestStrat}</td>
                </tr>
              );
            })}

            {stats['None'] && stats['None'].trades > 0 && (() => {
              const ns = stats['None'];
              const tCount = ns.trades;
              const wins = ns.wins;
              const wr = tCount ? (wins / tCount) * 100 : 0;
              const pnl = ns.totalPnl;
              const avgPnl = tCount ? pnl / tCount : 0;

              return (
                <tr style={styles.untaggedRow}>
                  <td style={styles.td}>
                    <span style={styles.badge('#f59e0b')}>⚠ Untagged</span>
                  </td>
                  <td style={{ ...styles.td, fontSize: '12px', color: '#f59e0b' }}>Needs session tag</td>
                  <td style={{ ...styles.td, fontWeight: 600 }}>{tCount}</td>
                  <td style={{ ...styles.td, fontWeight: 600, color: '#10b981' }}>{wins}</td>
                  <td style={styles.td}><WrText value={wr} /></td>
                  <td style={styles.td}><PnlText value={pnl} style={{ fontWeight: 700 }} /></td>
                  <td style={styles.td}><PnlText value={avgPnl} style={{ fontSize: '12px' }} /></td>
                  <td style={{ ...styles.td, color: '#f59e0b', fontSize: '12px' }}>Edit trades to add session</td>
                </tr>
              );
            })()}
          </tbody>
        </table>
      </div>

      <h3 style={styles.sectionTitle}>Strategy × Session Matrix</h3>
      <div style={styles.matrixScroll}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Strategy</th>
              {Object.values(SESSIONS).map((sess) => (
                <th key={sess.label} style={{ ...styles.th, textAlign: 'center' }}>{sess.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {!strategyMatrix.hasData ? (
              <tr>
                <td colSpan={Object.keys(SESSIONS).length + 1} style={{ ...styles.td, textAlign: 'center', color: '#64748b', padding: '20px' }}>
                  No strategy data available.
                </td>
              </tr>
            ) : (
              strategyMatrix.rows.map((row) => (
                <tr key={row.strategy}>
                  <td style={{ ...styles.td, fontWeight: 600, color: '#6366f1' }}>{row.strategy}</td>
                  {row.cells.map((cell, i) => (
                    <td key={i} style={{ ...styles.td, textAlign: 'center' }}>
                      {cell ? (
                        <>
                          <span style={{ color: cell.wr >= 50 ? '#10b981' : '#ef4444', fontWeight: 700 }}>
                            {cell.wr.toFixed(0)}%
                          </span>{' '}
                          <span style={{ fontSize: '11px', color: '#64748b' }}>({cell.count})</span>
                        </>
                      ) : (
                        <span style={{ color: '#64748b' }}>-</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <h3 style={styles.sectionTitle}>Session Charts</h3>
      <div style={styles.chartRow}>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Session Win Rate</div>
          <div style={styles.chartWrap}>
            {doughnutData && <Doughnut data={doughnutData} options={doughnutOptions} />}
          </div>
        </div>
        <div style={styles.chartCard}>
          <div style={styles.chartTitle}>Session PnL</div>
          <div style={styles.chartWrap}>
            {barData && <Bar data={barData} options={barOptions} />}
          </div>
        </div>
      </div>

      <h3 style={styles.sectionTitle}>Smart Recommendations</h3>
      <div>
        {recommendations.map((rec, i) => (
          <div key={i} style={styles.recCard(rec.type)}>
            <span style={styles.recIcon(rec.type)}>{rec.icon}</span>
            <span>{rec.text}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

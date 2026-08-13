import { useState, useMemo, useCallback } from 'react';
import { useApp } from '../context/AppContext';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_HEADERS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function groupByDate(trades) {
  const map = {};
  trades.forEach((t) => {
    if (!t.date) return;
    if (!map[t.date]) {
      map[t.date] = { pnl: 0, trades: [] };
    }
    map[t.date].pnl += t.pnl;
    map[t.date].trades.push(t);
  });
  return map;
}

function formatPnl(val) {
  const prefix = val >= 0 ? '+' : '-';
  return `${prefix}$${Math.abs(val).toFixed(2)}`;
}

const styles = {
  page: { padding: '24px', minHeight: '100vh', color: '#f8fafc' },
  navRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '20px',
    marginBottom: '24px',
  },
  navBtn: {
    background: '#1a1f2e',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#94a3b8',
    width: '36px',
    height: '36px',
    borderRadius: '8px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    transition: 'all 0.15s',
  },
  navTitle: { fontSize: '18px', fontWeight: 700, color: '#f8fafc', minWidth: '180px', textAlign: 'center' },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, 1fr)',
    gap: '4px',
    marginBottom: '24px',
  },
  dayHeader: {
    textAlign: 'center',
    fontSize: '11px',
    fontWeight: 600,
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    padding: '8px 0',
  },
  cell: {
    minHeight: '90px',
    borderRadius: '8px',
    padding: '8px',
    position: 'relative',
    transition: 'all 0.15s',
  },
  cellEmpty: {
    minHeight: '90px',
    borderRadius: '8px',
    padding: '8px',
    opacity: 0.3,
  },
  cellDay: { fontSize: '13px', fontWeight: 600, color: '#cbd5e1', marginBottom: '4px' },
  cellPnl: { fontSize: '12px', fontWeight: 700, marginBottom: '2px' },
  cellCount: { fontSize: '10px', color: '#64748b' },
  summaryBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: '#0f131a',
    border: '1px solid rgba(255,255,255,0.05)',
    borderRadius: '12px',
    padding: '16px 24px',
    marginBottom: '24px',
  },
  summaryCol: { textAlign: 'center' },
  summaryLabel: { fontSize: '11px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' },
  summaryValue: { fontSize: '20px', fontWeight: 700, marginTop: '4px' },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.6)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    background: '#12161f',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '16px',
    padding: '24px',
    width: '90%',
    maxWidth: '560px',
    maxHeight: '80vh',
    overflow: 'auto',
    color: '#f8fafc',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '16px',
  },
  modalTitle: { fontSize: '16px', fontWeight: 700 },
  modalClose: {
    background: 'none',
    border: 'none',
    color: '#64748b',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px 8px',
    borderRadius: '6px',
    transition: 'color 0.15s',
  },
  tradeRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '10px 12px',
    borderRadius: '8px',
    marginBottom: '6px',
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.04)',
  },
  tradeAsset: { fontWeight: 600, fontSize: '14px', color: '#f8fafc' },
  tradeDetail: { fontSize: '12px', color: '#64748b' },
  tradeRight: { textAlign: 'right' },
  resultBadge: (result) => ({
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    background: result === 'Win' ? 'rgba(16,185,129,0.15)' : result === 'Loss' ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
    color: result === 'Win' ? '#10b981' : result === 'Loss' ? '#ef4444' : '#f59e0b',
  }),
  inspectBtn: {
    marginTop: '6px',
    padding: '4px 10px',
    fontSize: '11px',
    fontWeight: 600,
    background: 'rgba(99,102,241,0.15)',
    color: '#6366f1',
    border: '1px solid rgba(99,102,241,0.3)',
    borderRadius: '6px',
    cursor: 'pointer',
  },
  emptyModal: { textAlign: 'center', padding: '20px', color: '#64748b', fontSize: '13px' },
};

export default function Calendar() {
  const { state } = useApp();
  const trades = state.allTrades;

  const [year, setYear] = useState(() => new Date().getFullYear());
  const [month, setMonth] = useState(() => new Date().getMonth());
  const todayStr = useMemo(() => {
    const n = new Date();
    return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`;
  }, []);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedTrades, setSelectedTrades] = useState([]);

  const groupedData = useMemo(() => groupByDate(trades), [trades]);

  const calendarDays = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // JS getDay(): 0=Sun, 1=Mon, ... 6=Sat. We want Mon=0, Sun=6
    let startIdx = firstDay.getDay() - 1;
    if (startIdx < 0) startIdx = 6;

    const cells = [];

    for (let i = startIdx - 1; i >= 0; i--) {
      cells.push({ day: prevMonthDays - i, empty: true, dateStr: null });
    }

    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const dayData = groupedData[dateStr];
      const cellDateStr = dateStr;
      const isToday = cellDateStr === todayStr;
      cells.push({ day: d, empty: false, dateStr, dayData, isToday });
    }

    const remaining = 42 - cells.length;
    for (let d = 1; d <= remaining; d++) {
      cells.push({ day: d, empty: true, dateStr: null });
    }

    return cells;
  }, [year, month, groupedData, todayStr]);

  const monthStats = useMemo(() => {
    const monthStart = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    const monthEnd = `${year}-${String(month + 1).padStart(2, '0')}-${String(totalDaysInMonth).padStart(2, '0')}`;

    const monthTrades = trades.filter((t) => t.date >= monthStart && t.date <= monthEnd);
    let pnl = 0;
    let wins = 0;
    monthTrades.forEach((t) => {
      pnl += t.pnl;
      if (t.result === 'Win') wins++;
    });
    const total = monthTrades.length;
    const winRate = total ? ((wins / total) * 100).toFixed(1) : '0.0';
    return { pnl, total, winRate };
  }, [year, month, trades]);

  const handlePrevMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 0) {
        setYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const handleNextMonth = useCallback(() => {
    setMonth((m) => {
      if (m === 11) {
        setYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const handleDayClick = useCallback((dateStr, dayTrades) => {
    setSelectedDate(dateStr);
    setSelectedTrades(dayTrades);
  }, []);

  const closeModal = useCallback(() => {
    setSelectedDate(null);
    setSelectedTrades([]);
  }, []);

  return (
    <div style={styles.page}>
      <div style={styles.navRow}>
        <button style={styles.navBtn} onClick={handlePrevMonth}>&#8249;</button>
        <div style={styles.navTitle}>{MONTH_NAMES[month]} {year}</div>
        <button style={styles.navBtn} onClick={handleNextMonth}>&#8250;</button>
      </div>

      <div style={styles.summaryBar}>
        <div style={styles.summaryCol}>
          <div style={styles.summaryLabel}>Monthly Net P&L</div>
          <div style={{ ...styles.summaryValue, color: monthStats.pnl >= 0 ? '#10b981' : '#ef4444' }}>
            {formatPnl(monthStats.pnl)}
          </div>
        </div>
        <div style={styles.summaryCol}>
          <div style={styles.summaryLabel}>Trades</div>
          <div style={{ ...styles.summaryValue, color: '#f8fafc' }}>{monthStats.total}</div>
        </div>
        <div style={styles.summaryCol}>
          <div style={styles.summaryLabel}>Win Rate</div>
          <div style={{ ...styles.summaryValue, color: '#6366f1' }}>{monthStats.winRate}%</div>
        </div>
      </div>

      <div style={styles.grid}>
        {DAY_HEADERS.map((d) => (
          <div key={d} style={styles.dayHeader}>{d}</div>
        ))}

        {calendarDays.map((cell, i) => {
          if (cell.empty) {
            return (
              <div key={`empty-${i}`} style={styles.cellEmpty}>
                <span style={{ fontSize: '12px', color: '#4a5568' }}>{cell.day}</span>
              </div>
            );
          }

          const dayData = cell.dayData;
          const hasTrades = !!dayData;
          const netPnl = dayData ? dayData.pnl : 0;
          const count = dayData ? dayData.trades.length : 0;

          let bgColor = 'transparent';
          let borderStyle = '1px solid transparent';
          if (cell.isToday) {
            borderStyle = '2px solid #6366f1';
          }
          if (hasTrades) {
            if (netPnl > 0.01) bgColor = 'rgba(16,185,129,0.08)';
            else if (netPnl < -0.01) bgColor = 'rgba(239,68,68,0.08)';
            else bgColor = 'rgba(245,158,11,0.06)';
          }

          return (
            <div
              key={cell.dateStr}
              style={{
                ...styles.cell,
                background: bgColor,
                border: borderStyle,
                cursor: hasTrades ? 'pointer' : 'default',
              }}
              onClick={() => hasTrades && handleDayClick(cell.dateStr, dayData.trades)}
              onMouseEnter={(e) => {
                if (hasTrades) e.currentTarget.style.opacity = '0.85';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              <div style={{
                ...styles.cellDay,
                color: cell.isToday ? '#6366f1' : '#cbd5e1',
                fontWeight: cell.isToday ? 800 : 600,
              }}>
                {cell.day}
              </div>
              {hasTrades && (
                <>
                  <div style={{
                    ...styles.cellPnl,
                    color: netPnl > 0 ? '#10b981' : netPnl < 0 ? '#ef4444' : '#f59e0b',
                  }}>
                    {formatPnl(netPnl)}
                  </div>
                  <div style={styles.cellCount}>
                    {count} {count === 1 ? 'trade' : 'trades'}
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div style={styles.modalOverlay} onClick={closeModal}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <div style={styles.modalTitle}>Trades on {selectedDate}</div>
              <button style={styles.modalClose} onClick={closeModal}>&times;</button>
            </div>

            {selectedTrades.length === 0 ? (
              <div style={styles.emptyModal}>No trades on this day.</div>
            ) : (
              selectedTrades.map((t) => (
                <div key={t.id} style={styles.tradeRow}>
                  <div>
                    <div style={styles.tradeAsset}>{t.asset}</div>
                    <div style={styles.tradeDetail}>
                      {t.type} &middot; {t.time || 'No time'}
                    </div>
                    <div style={{ marginTop: '4px' }}>
                      <span style={styles.resultBadge(t.result)}>{t.result}</span>
                    </div>
                  </div>
                  <div style={styles.tradeRight}>
                    <div style={{ ...styles.cellPnl, fontSize: '14px', color: t.pnl >= 0 ? '#10b981' : '#ef4444' }}>
                      {formatPnl(t.pnl)}
                    </div>
                    <button
                      style={styles.inspectBtn}
                      onClick={() => {
                        closeModal();
                        // Navigate to trade detail if needed
                      }}
                    >
                      Inspect
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

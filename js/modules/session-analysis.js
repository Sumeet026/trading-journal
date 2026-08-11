import { state, els, showNotification } from './core.js';
import { renderSessionWinRateChart, renderSessionPnlChart, calculateSessionStats, SESSIONS } from '../chart.js';

// --- RENDER SESSION ANALYSIS PAGE ---
export function renderSessionAnalysis() {
  const trades = state.trades;
  if (trades.length === 0) {
    if (els.sessionTableBody) els.sessionTableBody.innerHTML = `<tr><td colspan="8" class="text-center text-muted p-4">No trades logged yet. Add trades with session data to see analysis.</td></tr>`;
    if (els.sessionRecommendationsList) els.sessionRecommendationsList.innerHTML = `<div class="text-xs text-muted">Add trades with session data to get personalized recommendations.</div>`;
    return;
  }

  const stats = calculateSessionStats(trades);
  
  // Check if any trades have session data
  let hasSessionData = false;
  Object.keys(SESSIONS).forEach(key => {
    if (stats[key] && stats[key].trades > 0) hasSessionData = true;
  });
  
  // Also check for "None" session trades
  const noneSessionTrades = trades.filter(t => !t.session || t.session === "None");
  const hasNoneSession = noneSessionTrades.length > 0;
  
  // Find best and worst sessions (only from tagged sessions)
  let bestSession = null;
  let bestWinRate = -1;
  let worstSession = null;
  let worstWinRate = 101;
  let bestPnlSession = null;
  let bestPnl = -Infinity;

  Object.entries(SESSIONS).forEach(([key, sess]) => {
    const s = stats[key];
    if (!s || s.trades === 0) return;
    const wr = (s.wins / s.trades) * 100;
    if (wr > bestWinRate) { bestWinRate = wr; bestSession = key; }
    if (wr < worstWinRate) { worstWinRate = wr; worstSession = key; }
    if (s.totalPnl > bestPnl) { bestPnl = s.totalPnl; bestPnlSession = key; }
  });

  // Update stat cards
  if (els.sessionBest) {
    els.sessionBest.innerText = bestSession ? SESSIONS[bestSession].label : "--";
    els.sessionBestInfo.innerText = bestSession ? `${bestWinRate.toFixed(1)}% win rate` : (hasNoneSession ? `${noneSessionTrades.length} trades need session tag` : "No data yet");
  }
  if (els.sessionBestPnl) {
    const s = bestPnlSession ? stats[bestPnlSession] : null;
    els.sessionBestPnl.innerText = s ? (s.totalPnl >= 0 ? '+' : '-') + '$' + Math.abs(s.totalPnl).toFixed(2) : "$0.00";
    els.sessionBestTrades.innerText = s ? `${s.trades} trades` : "0 trades";
  }
  if (els.sessionWorst) {
    els.sessionWorst.innerText = worstSession ? SESSIONS[worstSession].label : "--";
    els.sessionWorstInfo.innerText = worstSession ? `${worstWinRate.toFixed(1)}% win rate` : "No data yet";
  }

  // Total stats
  let totalPnl = 0;
  let totalTrades = 0;
  Object.values(stats).forEach(s => {
    totalPnl += s.totalPnl;
    totalTrades += s.trades;
  });
  const avgPnl = totalTrades ? totalPnl / totalTrades : 0;

  if (els.sessionAvgPnl) {
    els.sessionAvgPnl.innerText = (avgPnl >= 0 ? '+' : '-') + '$' + Math.abs(avgPnl).toFixed(2);
  }
  if (els.sessionTotalTrades) {
    els.sessionTotalTrades.innerText = `${totalTrades} total trades`;
  }

  // Render Performance Table
  renderSessionPerformanceTable(stats);
  
  // Render Strategy Matrix
  renderStrategyMatrix(stats);

  // Render Charts
  renderSessionWinRateChart("sessionWinRateChart", trades);
  renderSessionPnlChart("sessionPnlChart", trades);

  // Render Recommendations
  renderSessionRecommendations(stats, trades);
}

function renderSessionPerformanceTable(stats) {
  if (!els.sessionTableBody) return;
  els.sessionTableBody.innerHTML = "";

  Object.entries(SESSIONS).forEach(([key, sess]) => {
    const s = stats[key];
    const trades = s ? s.trades : 0;
    const wins = s ? s.wins : 0;
    const wr = trades ? ((wins / trades) * 100).toFixed(1) : "0.0";
    const pnl = s ? s.totalPnl : 0;
    const avgPnl = trades ? (pnl / trades) : 0;

    // Find best strategy for this session
    let bestStrat = "--";
    let bestStratPnl = -Infinity;
    if (s && s.strategies) {
      Object.entries(s.strategies).forEach(([stratName, stratData]) => {
        if (stratData.pnl > bestStratPnl && stratName !== "None") {
          bestStratPnl = stratData.pnl;
          bestStrat = stratName;
        }
      });
    }

    const wrColor = parseFloat(wr) >= 50 ? "text-success" : "text-danger";
    const pnlColor = pnl >= 0 ? "text-success" : "text-danger";

    els.sessionTableBody.innerHTML += `
      <tr>
        <td><span class="badge" style="background: ${sess.color}22; color: ${sess.color}; border: 1px solid ${sess.color}44;">${sess.label}</span></td>
        <td class="text-xs text-muted">${sess.time}</td>
        <td class="font-semibold">${trades}</td>
        <td class="font-semibold text-success">${wins}</td>
        <td class="font-bold ${wrColor}">${wr}%</td>
        <td class="font-bold ${pnlColor}">${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}</td>
        <td class="text-sm ${avgPnl >= 0 ? 'text-success' : 'text-danger'}">${avgPnl >= 0 ? '+' : '-'}$${Math.abs(avgPnl).toFixed(2)}</td>
        <td class="text-accent font-semibold">${bestStrat}</td>
      </tr>
    `;
  });

  // Show "Untagged" row for trades without session
  const noneStats = stats["None"];
  if (noneStats && noneStats.trades > 0) {
    const trades = noneStats.trades;
    const wins = noneStats.wins;
    const wr = trades ? ((wins / trades) * 100).toFixed(1) : "0.0";
    const pnl = noneStats.totalPnl;
    const avgPnl = trades ? (pnl / trades) : 0;
    const wrColor = parseFloat(wr) >= 50 ? "text-success" : "text-danger";
    const pnlColor = pnl >= 0 ? "text-success" : "text-danger";

    els.sessionTableBody.innerHTML += `
      <tr style="background: rgba(245,158,11,0.05);">
        <td><span class="badge" style="background: rgba(245,158,11,0.15); color: #f59e0b; border: 1px solid rgba(245,158,11,0.3);"><i class="fa fa-exclamation-triangle mr-1"></i> Untagged</span></td>
        <td class="text-xs text-warning">Needs session tag</td>
        <td class="font-semibold">${trades}</td>
        <td class="font-semibold text-success">${wins}</td>
        <td class="font-bold ${wrColor}">${wr}%</td>
        <td class="font-bold ${pnlColor}">${pnl >= 0 ? '+' : '-'}$${Math.abs(pnl).toFixed(2)}</td>
        <td class="text-sm ${avgPnl >= 0 ? 'text-success' : 'text-danger'}">${avgPnl >= 0 ? '+' : '-'}$${Math.abs(avgPnl).toFixed(2)}</td>
        <td class="text-warning text-xs">Edit trades to add session</td>
      </tr>
    `;
  }
}

function renderStrategyMatrix(stats) {
  if (!els.strategyMatrixBody) return;
  els.strategyMatrixBody.innerHTML = "";

  // Collect all unique strategies
  const allStrategies = new Set();
  Object.values(stats).forEach(s => {
    if (s.strategies) {
      Object.keys(s.strategies).forEach(strat => {
        if (strat !== "None") allStrategies.add(strat);
      });
    }
  });

  if (allStrategies.size === 0) {
    els.strategyMatrixBody.innerHTML = `<tr><td colspan="5" class="text-center text-muted p-3">No strategy data available.</td></tr>`;
    return;
  }

  allStrategies.forEach(strat => {
    let row = `<td class="font-semibold text-accent">${strat}</td>`;
    Object.keys(SESSIONS).forEach(key => {
      const s = stats[key];
      const stratData = s && s.strategies ? s.strategies[strat] : null;
      if (stratData && stratData.trades > 0) {
        const wr = ((stratData.wins / stratData.trades) * 100).toFixed(0);
        const pnl = stratData.pnl;
        const color = parseFloat(wr) >= 50 ? "text-success" : "text-danger";
        row += `<td class="text-center"><span class="${color} font-bold">${wr}%</span> <span class="text-xs text-muted">(${stratData.trades})</span></td>`;
      } else {
        row += `<td class="text-center text-muted">-</td>`;
      }
    });
    els.strategyMatrixBody.innerHTML += `<tr>${row}</tr>`;
  });
}

function renderSessionRecommendations(stats, trades) {
  if (!els.sessionRecommendationsList) return;
  els.sessionRecommendationsList.innerHTML = "";

  const recommendations = [];

  // Analyze each session
  Object.entries(SESSIONS).forEach(([key, sess]) => {
    const s = stats[key];
    if (!s || s.trades < 3) return;

    const wr = (s.wins / s.trades) * 100;
    const avgPnl = s.totalPnl / s.trades;

    if (wr >= 60) {
      recommendations.push({
        type: "success",
        icon: "fa-trophy",
        text: `<strong>${sess.label}</strong> is your best session with <span class="text-success font-bold">${wr.toFixed(1)}% win rate</span> and avg PnL of $${avgPnl.toFixed(2)}. Focus more time here!`
      });
    } else if (wr < 40) {
      recommendations.push({
        type: "danger",
        icon: "fa-triangle-exclamation",
        text: `<strong>${sess.label}</strong> has a low win rate of <span class="text-danger font-bold">${wr.toFixed(1)}%</span>. Consider reducing position size or avoiding this session.`
      });
    }

    // Strategy recommendations per session
    if (s.strategies) {
      Object.entries(s.strategies).forEach(([stratName, stratData]) => {
        if (stratData.trades >= 3) {
          const stratWr = (stratData.wins / stratData.trades) * 100;
          if (stratWr >= 70) {
            recommendations.push({
              type: "success",
              icon: "fa-chess",
              text: `Strategy "<strong>${stratName}</strong>" in <strong>${sess.label}</strong> has an excellent <span class="text-success font-bold">${stratWr.toFixed(1)}% win rate</span>. This is your edge!`
            });
          }
        }
      });
    }
  });

  // General session timing recommendations
  const hasTokyo = stats.Tokyo && stats.Tokyo.trades > 0;
  const hasLondon = stats.London && stats.London.trades > 0;
  const hasNY = stats["New York"] && stats["New York"].trades > 0;
  const hasAsian = stats.Asian && stats.Asian.trades > 0;

  if (!hasTokyo && !hasLondon && !hasNY && !hasAsian) {
    recommendations.push({
      type: "info",
      icon: "fa-info-circle",
      text: "Start tagging each trade with a session (Tokyo/London/NY/Asian) to unlock session-based performance insights."
    });
  }

  // Overlap analysis
  if (stats.Overlap && stats.Overlap.trades >= 3) {
    const overlapWr = (stats.Overlap.wins / stats.Overlap.trades) * 100;
    recommendations.push({
      type: "info",
      icon: "fa-arrows-left-right",
      text: `London-NY Overlap session: <strong>${stats.Overlap.trades} trades</strong> with <span class="${overlapWr >= 50 ? 'text-success' : 'text-danger'} font-bold">${overlapWr.toFixed(1)}% win rate</span>. This is typically the most volatile session.`
    });
  }

  if (recommendations.length === 0) {
    recommendations.push({
      type: "info",
      icon: "fa-info-circle",
      text: "Add at least 3 trades per session to get personalized recommendations."
    });
  }

  recommendations.forEach(rec => {
    const bgColor = rec.type === "success" ? "rgba(16,185,129,0.08)" : rec.type === "danger" ? "rgba(239,68,68,0.08)" : "rgba(99,102,241,0.08)";
    const borderColor = rec.type === "success" ? "var(--success)" : rec.type === "danger" ? "var(--danger)" : "var(--primary)";

    els.sessionRecommendationsList.innerHTML += `
      <div class="flex gap-3 p-3 rounded-xl text-sm text-light" style="background: ${bgColor}; border-left: 3px solid ${borderColor};">
        <i class="fa-solid ${rec.icon}" style="color: ${borderColor}; margin-top: 2px;"></i>
        <span>${rec.text}</span>
      </div>
    `;
  });
}

// --- RENDER DASHBOARD SESSION SUMMARY ---
export function renderDashboardSessionSummary() {
  const trades = state.trades;
  if (trades.length === 0) return;

  const stats = calculateSessionStats(trades);

  Object.entries(SESSIONS).forEach(([key, sess]) => {
    const s = stats[key];
    const wrEl = document.getElementById(`dash${key === "New York" ? "NewYork" : key}Wr`);
    const pnlEl = document.getElementById(`dash${key === "New York" ? "NewYork" : key}Pnl`);

    if (wrEl && pnlEl && s && s.trades > 0) {
      const wr = ((s.wins / s.trades) * 100).toFixed(1);
      wrEl.innerText = wr + "%";
      wrEl.className = `text-lg font-bold ${parseFloat(wr) >= 50 ? 'text-success' : 'text-danger'}`;
      pnlEl.innerText = (s.totalPnl >= 0 ? '+' : '-') + '$' + Math.abs(s.totalPnl).toFixed(2);
      pnlEl.className = `text-xs ${s.totalPnl >= 0 ? 'text-success' : 'text-danger'}`;
    }
  });
}

// --- INIT ---
export function initSessionAnalysis() {
  // Session analysis is rendered on demand
}

export { calculateSessionStats, SESSIONS };

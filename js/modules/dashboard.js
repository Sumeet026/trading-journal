import { state, els, getAccountCurrency, getCurrencySymbol, showNotification } from './core.js';
import { renderEquityCurve, renderWinLossPie } from '../chart.js';
import { renderDashboardSessionSummary } from './session-analysis.js';
import { switchTab } from './navigation.js';

// --- RENDER PAGE: DASHBOARD ---
export function renderDashboard() {
  // Calculate P&L Stats
  const activeAccId = state.activeAccountId;
  let startingBalance = 0;
  let transactionBalanceAdjustments = 0;
  let displayCurrency = "USD";

  if (activeAccId === "all") {
    state.accounts.forEach(a => {
      startingBalance += a.balance;
      if (a.transactions) {
        a.transactions.forEach(t => {
          if (t.type === "deposit") transactionBalanceAdjustments += t.amount;
          else transactionBalanceAdjustments -= t.amount;
        });
      }
    });
    // Use first account's currency or default
    if (state.accounts.length > 0) {
      displayCurrency = state.accounts[0].currency || "USD";
    }
  } else {
    const activeAcc = state.accounts.find(a => a.id === activeAccId);
    if (activeAcc) {
      startingBalance = activeAcc.balance;
      displayCurrency = activeAcc.currency || "USD";
      if (activeAcc.transactions) {
        activeAcc.transactions.forEach(t => {
          if (t.type === "deposit") transactionBalanceAdjustments += t.amount;
          else transactionBalanceAdjustments -= t.amount;
        });
      }
    }
  }

  const sym = getCurrencySymbol(displayCurrency);

  // Total Trades
  const totalTradesCount = state.trades.length;
  els.statTotalTrades.innerText = totalTradesCount;

  // P&L Sums
  let netPnL = 0;
  let wins = 0;
  let losses = 0;
  let breakeven = 0;
  let bestPnL = 0;
  let bestTradeAsset = "-";
  let worstPnL = 0;
  let worstTradeAsset = "-";
  let grossProfit = 0;
  let grossLoss = 0;

  // Today P&L
  let todayPnL = 0;
  const todayStr = new Date().toISOString().split("T")[0];

  let totalRMultiple = 0;
  let tradesWithRMultipleCount = 0;

  state.trades.forEach(t => {
    netPnL += t.pnl;
    if (t.pnl > 0) grossProfit += t.pnl;
    else if (t.pnl < 0) grossLoss += Math.abs(t.pnl);

    if (t.result === "Win") wins++;
    else if (t.result === "Loss") losses++;
    else breakeven++;

    // Best/Worst
    if (t.pnl > bestPnL) {
      bestPnL = t.pnl;
      bestTradeAsset = t.asset;
    }
    if (t.pnl < worstPnL) {
      worstPnL = t.pnl;
      worstTradeAsset = t.asset;
    }

    // Today's
    if (t.date === todayStr) {
      todayPnL += t.pnl;
    }

    // RMultiple sum
    if (t.rMultiple) {
      totalRMultiple += t.rMultiple;
      tradesWithRMultipleCount++;
    }
  });

  // Calculate final growth and balance values
  const currentBalance = startingBalance + transactionBalanceAdjustments + netPnL;
  const growthPercent = startingBalance ? (netPnL / startingBalance) * 100 : 0;
  const winRate = totalTradesCount ? (wins / totalTradesCount) * 100 : 0;
  const avgRMultiple = tradesWithRMultipleCount ? totalRMultiple / tradesWithRMultipleCount : 0;

  // Bind values to DOM
  // Today P&L
  els.statTodayPnL.innerText = todayPnL >= 0 ? "+" + sym + todayPnL.toFixed(2) : "-" + sym + Math.abs(todayPnL).toFixed(2);
  els.statTodayPnL.className = todayPnL >= 0 ? "stat-value text-success" : "stat-value text-danger";
  const todayGrowthPct = currentBalance ? (todayPnL / currentBalance) * 100 : 0;
  els.statTodayTrend.innerHTML = todayPnL >= 0
    ? `<i class="fa fa-caret-up"></i> +${todayGrowthPct.toFixed(2)}%`
    : `<i class="fa fa-caret-down"></i> -${Math.abs(todayGrowthPct).toFixed(2)}%`;
  els.statTodayTrend.className = todayPnL >= 0 ? "stat-trend text-success" : "stat-trend text-danger";

  // Total P&L
  els.statTotalPnL.innerText = netPnL >= 0 ? "+" + sym + netPnL.toFixed(2) : "-" + sym + Math.abs(netPnL).toFixed(2);
  els.statTotalPnL.className = netPnL >= 0 ? "stat-value text-success" : "stat-value text-danger";
  els.statTotalTrend.innerHTML = netPnL >= 0
    ? `<i class="fa fa-caret-up"></i> +${growthPercent.toFixed(1)}%`
    : `<i class="fa fa-caret-down"></i> -${Math.abs(growthPercent).toFixed(1)}%`;
  els.statTotalTrend.className = netPnL >= 0 ? "stat-trend text-success" : "stat-trend text-danger";

  // Balance
  els.statBalance.innerText = sym + currentBalance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  els.statGrowthTrend.innerHTML = `<i class="fa fa-scale-balanced"></i> ${growthPercent >= 0 ? '+' : ''}${growthPercent.toFixed(1)}% net growth`;

  // Win Rate
  els.statWinRate.innerText = winRate.toFixed(1) + "%";
  els.statWinLossRatio.innerText = `Wins: ${wins} | Losses: ${losses}`;

  // Break-even and R stats
  els.statBreakEvenCount.innerText = `${breakeven} break-evens`;
  els.statRiskReward.innerText = `Avg R: ${avgRMultiple.toFixed(2)}R`;
  els.statAvgRMultiple.innerText = `From ${tradesWithRMultipleCount} rated trades`;

  // Best/Worst
  els.statBestTrade.innerText = "+" + sym + bestPnL.toFixed(2);
  els.statBestTradeAsset.innerText = bestPnL > 0 ? bestTradeAsset : "-";
  els.statWorstTrade.innerText = worstPnL < 0 ? "-" + sym + Math.abs(worstPnL).toFixed(2) : sym + "0.00";
  els.statWorstTradeAsset.innerText = worstPnL < 0 ? worstTradeAsset : "-";

  // --- CALC PREMIUM INSTITUTIONAL METRICS ---
  // 1. Profit Factor
  const profitFactor = grossLoss ? grossProfit / grossLoss : (grossProfit ? 99.9 : 0);
  els.statProfitFactor.innerText = profitFactor.toFixed(2);
  els.statProfitFactor.className = profitFactor >= 1.5 ? "stat-value text-success" : profitFactor >= 1.0 ? "stat-value text-warning" : "stat-value text-danger";

  // 2. Max Drawdown
  let tempBal = startingBalance + transactionBalanceAdjustments;
  let peakBal = tempBal;
  let maxDrawdown = 0;
  const chronoTrades = [...state.trades].sort((a, b) => new Date(a.date + "T" + (a.time || "00:00")) - new Date(b.date + "T" + (b.time || "00:00")));

  chronoTrades.forEach(t => {
    tempBal += t.pnl;
    if (tempBal > peakBal) peakBal = tempBal;
    const dd = peakBal - tempBal;
    if (dd > maxDrawdown) maxDrawdown = dd;
  });
  els.statMaxDrawdown.innerText = `$${maxDrawdown.toFixed(2)}`;

  // 3. Current active streak
  let activeStreakType = "Wins";
  let activeStreakVal = 0;
  if (chronoTrades.length > 0) {
    const lastTrade = chronoTrades[chronoTrades.length - 1];
    if (lastTrade.pnl > 0) {
      activeStreakType = "Wins";
      for (let idx = chronoTrades.length - 1; idx >= 0; idx--) {
        if (chronoTrades[idx].pnl > 0) activeStreakVal++;
        else if (chronoTrades[idx].pnl < 0) break;
      }
    } else if (lastTrade.pnl < 0) {
      activeStreakType = "Losses";
      for (let idx = chronoTrades.length - 1; idx >= 0; idx--) {
        if (chronoTrades[idx].pnl < 0) activeStreakVal++;
        else if (chronoTrades[idx].pnl > 0) break;
      }
    }
  }
  els.statStreak.innerText = `${activeStreakVal} ${activeStreakType}`;
  els.statStreak.className = activeStreakType === "Wins" && activeStreakVal > 0 ? "stat-value text-success" : activeStreakVal > 0 ? "stat-value text-danger" : "stat-value text-muted";

  // 4. Return on Investment ROI
  const roi = startingBalance ? (netPnL / startingBalance) * 100 : 0;
  els.statRoi.innerText = `${roi >= 0 ? '+' : ''}${roi.toFixed(1)}%`;
  els.statRoi.className = roi >= 0 ? "stat-value text-success" : "stat-value text-danger";

  // Render recent trades table (limit to 5)
  els.dashTradesTable.innerHTML = "";
  const recentTrades = [...state.trades].slice(0, 5);
  if (recentTrades.length === 0) {
    els.dashTradesTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No trades logged yet.</td></tr>`;
  } else {
    recentTrades.forEach(t => {
      let badgeClass = "badge-breakeven";
      if (t.result === "Win") badgeClass = "badge-win";
      else if (t.result === "Loss") badgeClass = "badge-loss";

      els.dashTradesTable.innerHTML += `
        <tr style="cursor:pointer;" onclick="openTradeDetails('${t.id}')">
          <td>${t.date}</td>
          <td><strong class="text-accent">${t.asset}</strong></td>
          <td><span class="${t.type === 'Buy' ? 'text-success' : 'text-danger'} font-semibold">${t.type.toUpperCase()}</span></td>
          <td><span class="badge ${badgeClass}">${t.result}</span></td>
          <td class="${t.pnl >= 0 ? 'text-success' : 'text-danger'} font-semibold">
            ${t.pnl >= 0 ? '+' : '-'}$${Math.abs(t.pnl).toFixed(2)}
          </td>
        </tr>
      `;
    });
  }

  // Draw Heatmap Grid
  renderHeatmap();
  
  // Render Session Summary on Dashboard
  renderDashboardSessionSummary();
  
  // Render Strategy Performance Summary
  renderDashboardStrategySummary();
  
  // Render Trading Quality Score
  renderDashboardQualityScore();
  
  // Render All Trades List
  renderDashboardAllTrades();
}

// Render Dashboard Charts
export function renderDashboardCharts() {
  const activeAccId = state.activeAccountId;
  let startBal = 10000;
  if (activeAccId !== "all") {
    const acc = state.accounts.find(a => a.id === activeAccId);
    if (acc) startBal = acc.balance;
  } else {
    startBal = state.accounts.reduce((sum, a) => sum + a.balance, 0);
  }

  renderEquityCurve("dashEquityChart", state.trades, startBal);
  renderWinLossPie("dashWinLossChart", state.trades);
}

// Draw Dashboard performance Heatmap (grids of colored cells)
export function renderHeatmap() {
  els.dashHeatmap.innerHTML = "";

  // Compute daily P&Ls for the last 49 days (7 weeks)
  const dailyPnLs = {};
  state.trades.forEach(t => {
    dailyPnLs[t.date] = (dailyPnLs[t.date] || 0) + t.pnl;
  });

  const cellsCount = 49;
  const today = new Date();

  // Fill cells from oldest to newest (49 days ago to today)
  for (let i = cellsCount - 1; i >= 0; i--) {
    const dateObj = new Date(today);
    dateObj.setDate(today.getDate() - i);
    const dateString = dateObj.toISOString().split("T")[0];
    const dayPnl = dailyPnLs[dateString] || 0;

    let cellColor = "rgba(255,255,255,0.02)"; // No trades
    if (dayPnl > 200) cellColor = "rgba(16, 185, 129, 0.9)"; // Strong Win
    else if (dayPnl > 50) cellColor = "rgba(16, 185, 129, 0.6)"; // Medium Win
    else if (dayPnl > 0.01) cellColor = "rgba(16, 185, 129, 0.3)"; // Small Win
    else if (dayPnl < -200) cellColor = "rgba(239, 68, 68, 0.9)"; // Strong Loss
    else if (dayPnl < -50) cellColor = "rgba(239, 68, 68, 0.6)"; // Medium Loss
    else if (dayPnl < -0.01) cellColor = "rgba(239, 68, 68, 0.3)"; // Small Loss

    els.dashHeatmap.innerHTML += `
      <div class="heatmap-cell" style="background-color: ${cellColor};" onclick="switchTab('calendarPage')">
        <div class="heatmap-tooltip">
          ${dateString}: ${dayPnl >= 0 ? '+' : '-'}$${Math.abs(dayPnl).toFixed(2)}
        </div>
      </div>
    `;
  }
}

// --- RENDER DASHBOARD WIDGETS (Economic Calendar & Session Clocks) ---
export function renderDashboardWidgets() {
  renderEconomicCalendar();
  renderSessionClocks();
  updateLiveClock();
}

export async function renderEconomicCalendar() {
  if (!els.econCalendarList) return;

  // Try fetching live data from free ForexFactory mirror
  let events = [];
  try {
    const resp = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json");
    if (resp.ok) {
      const allEvents = await resp.json();
      // Filter only high/medium impact events from today and next 3 days
      const now = new Date();
      const cutoff = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      events = allEvents
        .filter(e => {
          const d = new Date(e.date * 1000);
          return d >= now && d <= cutoff && (e.impact === "High" || e.impact === "Medium");
        })
        .slice(0, 8)
        .map(e => ({
          time: new Date(e.date * 1000).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: false }),
          currency: e.currency || "USD",
          impact: e.impact.toLowerCase(),
          event: e.title
        }));
    }
  } catch (err) {
    // API failed, use fallback static data
  }

  // Fallback static data if API fails or returns empty
  if (events.length === 0) {
    events = [
      { time: "08:30", currency: "USD", impact: "high", event: "CPI (Consumer Price Index)" },
      { time: "10:00", currency: "USD", impact: "medium", event: "CB Consumer Confidence" },
      { time: "13:15", currency: "USD", impact: "high", event: "FOMC Interest Rate Decision" },
      { time: "14:30", currency: "USD", impact: "medium", event: "Unemployment Claims" },
      { time: "04:30", currency: "GBP", impact: "high", event: "GDP Quarter-over-Quarter" },
      { time: "07:45", currency: "EUR", impact: "medium", event: "ECB Press Conference" },
      { time: "19:50", currency: "JPY", impact: "medium", event: "BOJ Policy Rate" },
      { time: "21:30", currency: "AUD", impact: "low", event: "Employment Change" }
    ];
    // Mark badge as fallback
    const badge = document.getElementById("econCalendarBadge");
    if (badge) badge.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 6px; margin-right: 4px;"></i> SAMPLE DATA';
  } else {
    const badge = document.getElementById("econCalendarBadge");
    if (badge) badge.innerHTML = '<i class="fa-solid fa-circle" style="font-size: 6px; margin-right: 4px;"></i> LIVE';
  }

  els.econCalendarList.innerHTML = "";
  events.forEach(ev => {
    let impactColor = "var(--success)";
    let impactBg = "rgba(16,185,129,0.1)";
    if (ev.impact === "high") { impactColor = "var(--danger)"; impactBg = "rgba(239,68,68,0.1)"; }
    else if (ev.impact === "medium") { impactColor = "var(--warning)"; impactBg = "rgba(245,158,11,0.1)"; }

    els.econCalendarList.innerHTML += `
      <div class="flex align-center gap-3 p-3 rounded-xl" style="background: ${impactBg}; border-left: 3px solid ${impactColor}; border: 1px solid ${impactColor}22;">
        <div class="flex flex-col" style="min-width: 60px;">
          <span class="text-xs font-bold" style="color: ${impactColor};">${ev.time}</span>
          <span class="text-xs text-muted">${ev.currency}</span>
        </div>
        <div class="flex flex-col" style="flex:1;">
          <span class="text-sm font-semibold text-light">${ev.event}</span>
          <span class="text-xs text-muted">${ev.impact.charAt(0).toUpperCase() + ev.impact.slice(1)} Impact</span>
        </div>
        <span class="badge" style="background: ${impactBg}; color: ${impactColor}; border: 1px solid ${impactColor}33; font-size: 0.65rem;">${ev.impact.toUpperCase()}</span>
      </div>
    `;
  });
}

export function renderSessionClocks() {
  const now = new Date();
  const utcHour = now.getUTCHours();
  const utcMin = now.getUTCMinutes();
  const utcTotalMin = utcHour * 60 + utcMin;

  const sessions = [
    { id: "badgeSydney", cardId: "clockSydney", start: 22*60, end: 7*60, name: "Sydney" },
    { id: "badgeTokyo", cardId: "clockTokyo", start: 0, end: 9*60, name: "Tokyo" },
    { id: "badgeLondon", cardId: "clockLondon", start: 8*60, end: 17*60, name: "London" },
    { id: "badgeNewYork", cardId: "clockNewYork", start: 13*60, end: 22*60, name: "New York" }
  ];

  let activeSessions = 0;
  sessions.forEach(s => {
    const badge = document.getElementById(s.id);
    const card = document.getElementById(s.cardId);
    if (!badge) return;
    let isOpen = false;
    if (s.start < s.end) {
      isOpen = utcTotalMin >= s.start && utcTotalMin < s.end;
    } else {
      isOpen = utcTotalMin >= s.start || utcTotalMin < s.end;
    }
    if (isOpen) {
      activeSessions++;
      badge.innerText = "OPEN";
      badge.style.background = "rgba(16,185,129,0.15)";
      badge.style.color = "var(--success)";
      badge.style.fontWeight = "700";
      if (card) card.classList.add("session-open");
    } else {
      badge.innerText = "Closed";
      badge.style.background = "rgba(255,255,255,0.05)";
      badge.style.color = "var(--text-muted)";
      badge.style.fontWeight = "500";
      if (card) card.classList.remove("session-open");
    }
  });

  const clockStatus = document.getElementById("forexClockStatus");
  if (clockStatus) {
    clockStatus.innerText = activeSessions > 0 ? `${activeSessions} Session${activeSessions > 1 ? 's' : ''} Active` : "All Sessions Closed";
    clockStatus.className = activeSessions > 0 ? "text-xs font-semibold text-success" : "text-xs text-muted";
  }
}

export function updateLiveClock() {
  const now = new Date();
  const timeStr = now.toLocaleTimeString('en-US', { hour12: true });
  if (els.headerLiveTime) els.headerLiveTime.innerText = timeStr;
}

// --- RENDER STRATEGY PERFORMANCE SUMMARY ON DASHBOARD ---
export function renderDashboardStrategySummary() {
  const tbody = document.getElementById("dashStrategyBody");
  if (!tbody) return;
  
  const trades = state.trades;
  if (trades.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No trades logged yet.</td></tr>`;
    return;
  }

  // Group by strategy
  const strategies = {};
  trades.forEach(t => {
    const strat = t.strategy || "None";
    if (!strategies[strat]) {
      strategies[strat] = { wins: 0, losses: 0, breakeven: 0, totalPnl: 0, trades: 0 };
    }
    strategies[strat].trades++;
    if (t.result === "Win") strategies[strat].wins++;
    else if (t.result === "Loss") strategies[strat].losses++;
    else strategies[strat].breakeven++;
    strategies[strat].totalPnl += t.pnl;
  });

  // Sort by total PnL descending
  const sorted = Object.entries(strategies).sort((a, b) => b[1].totalPnl - a[1].totalPnl);

  tbody.innerHTML = "";
  sorted.forEach(([name, s]) => {
    const wr = s.trades ? ((s.wins / s.trades) * 100).toFixed(1) : "0.0";
    const avgPnl = s.trades ? (s.totalPnl / s.trades) : 0;
    const wrNum = parseFloat(wr);
    
    let statusBadge = "";
    if (wrNum >= 60) statusBadge = `<span class="badge badge-win" style="font-size:0.65rem;">PROFITABLE</span>`;
    else if (wrNum >= 50) statusBadge = `<span class="badge" style="background:rgba(245,158,11,0.15);color:#f59e0b;font-size:0.65rem;">BREAKEVEN</span>`;
    else statusBadge = `<span class="badge badge-loss" style="font-size:0.65rem;">LOSING</span>`;

    const pnlColor = s.totalPnl >= 0 ? "text-success" : "text-danger";
    const wrColor = wrNum >= 50 ? "text-success" : "text-danger";

    tbody.innerHTML += `
      <tr>
        <td><strong class="text-accent">${name}</strong></td>
        <td class="font-semibold">${s.trades}</td>
        <td class="font-semibold text-success">${s.wins}</td>
        <td class="font-bold ${wrColor}">${wr}%</td>
        <td class="font-bold ${pnlColor}">${s.totalPnl >= 0 ? '+' : '-'}$${Math.abs(s.totalPnl).toFixed(2)}</td>
        <td class="text-sm ${avgPnl >= 0 ? 'text-success' : 'text-danger'}">${avgPnl >= 0 ? '+' : '-'}$${Math.abs(avgPnl).toFixed(2)}</td>
        <td>${statusBadge}</td>
      </tr>
    `;
  });
}

// --- RENDER TRADING QUALITY SCORE ON DASHBOARD ---
export function renderDashboardQualityScore() {
  const trades = state.trades;
  if (trades.length === 0) return;

  const wins = trades.filter(t => t.result === "Win").length;
  const losses = trades.filter(t => t.result === "Loss").length;
  const total = wins + losses;
  const winRate = total ? (wins / total) * 100 : 0;

  // Profit Factor
  let grossProfit = 0;
  let grossLoss = 0;
  trades.forEach(t => {
    if (t.pnl > 0) grossProfit += t.pnl;
    else if (t.pnl < 0) grossLoss += Math.abs(t.pnl);
  });
  const profitFactor = grossLoss ? grossProfit / grossLoss : (grossProfit ? 99.9 : 0);

  // Avg Win vs Avg Loss
  const avgWin = wins ? grossProfit / wins : 0;
  const avgLoss = losses ? grossLoss / losses : 0;
  const riskRewardRatio = avgLoss ? avgWin / avgLoss : 0;

  // Discipline Score
  const disciplineTrades = trades.filter(t => t.discipline);
  const avgDiscipline = disciplineTrades.length ? disciplineTrades.reduce((s, t) => s + t.discipline, 0) / disciplineTrades.length : 0;

  // Mistake Rate
  const tradesWithMistakes = trades.filter(t => t.mistakes && t.mistakes.length > 0).length;
  const mistakeRate = trades.length ? (tradesWithMistakes / trades.length) * 100 : 0;

  // Overall Score (0-100)
  let score = 0;
  // Win Rate (30 points)
  score += Math.min((winRate / 60) * 30, 30);
  // Profit Factor (25 points)
  score += Math.min((profitFactor / 2) * 25, 25);
  // Risk Reward (25 points)
  score += Math.min((riskRewardRatio / 2) * 25, 25);
  // Discipline (10 points)
  score += (avgDiscipline / 5) * 10;
  // Low Mistakes (10 points)
  score += Math.max(10 - (mistakeRate / 10), 0);

  // Update DOM
  const qwWinRate = document.getElementById("qwWinRate");
  const qwProfitFactor = document.getElementById("qwProfitFactor");
  const qwRiskReward = document.getElementById("qwRiskReward");
  const qwDiscipline = document.getElementById("qwDiscipline");
  const qwMistakes = document.getElementById("qwMistakes");
  const qwOverall = document.getElementById("qwOverall");
  const qwVerdict = document.getElementById("qwVerdict");
  const qwOverallBox = document.getElementById("qwOverallBox");

  if (qwWinRate) {
    qwWinRate.innerText = winRate.toFixed(1) + "%";
    qwWinRate.className = `font-bold ${winRate >= 50 ? 'text-success' : 'text-danger'}`;
  }
  if (qwProfitFactor) {
    qwProfitFactor.innerText = profitFactor.toFixed(2);
    qwProfitFactor.className = `font-bold ${profitFactor >= 1.5 ? 'text-success' : profitFactor >= 1 ? 'text-warning' : 'text-danger'}`;
  }
  if (qwRiskReward) {
    qwRiskReward.innerText = riskRewardRatio.toFixed(2) + "R";
    qwRiskReward.className = `font-bold ${riskRewardRatio >= 1.5 ? 'text-success' : riskRewardRatio >= 1 ? 'text-warning' : 'text-danger'}`;
  }
  if (qwDiscipline) {
    qwDiscipline.innerText = avgDiscipline.toFixed(1) + "/5";
    qwDiscipline.className = `font-bold ${avgDiscipline >= 4 ? 'text-success' : avgDiscipline >= 3 ? 'text-warning' : 'text-danger'}`;
  }
  if (qwMistakes) {
    qwMistakes.innerText = mistakeRate.toFixed(0) + "%";
    qwMistakes.className = `font-bold ${mistakeRate <= 20 ? 'text-success' : mistakeRate <= 40 ? 'text-warning' : 'text-danger'}`;
  }
  if (qwOverall) {
    qwOverall.innerText = score.toFixed(0) + "/100";
    if (score >= 70) {
      qwOverall.className = "text-2xl font-bold text-success";
      qwVerdict.innerText = "Great trading! Keep it up!";
      qwOverallBox.style.background = "rgba(16,185,129,0.1)";
      qwOverallBox.style.borderColor = "rgba(16,185,129,0.3)";
    } else if (score >= 50) {
      qwOverall.className = "text-2xl font-bold text-warning";
      qwVerdict.innerText = "Decent. Room for improvement.";
      qwOverallBox.style.background = "rgba(245,158,11,0.1)";
      qwOverallBox.style.borderColor = "rgba(245,158,11,0.3)";
    } else {
      qwOverall.className = "text-2xl font-bold text-danger";
      qwVerdict.innerText = "Focus on discipline & strategy.";
      qwOverallBox.style.background = "rgba(239,68,68,0.1)";
      qwOverallBox.style.borderColor = "rgba(239,68,68,0.3)";
    }
  }
}

// --- RENDER ALL TRADES LIST ON DASHBOARD ---
export function renderDashboardAllTrades() {
  const tbody = document.getElementById("dashAllTradesBody");
  if (!tbody) return;

  const trades = state.trades;
  if (trades.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted">No trades logged yet.</td></tr>`;
    return;
  }

  // Sort by date descending (newest first)
  const sorted = [...trades].sort((a, b) => new Date(b.date) - new Date(a.date));

  tbody.innerHTML = "";
  sorted.forEach((t, idx) => {
    let badgeClass = "badge-breakeven";
    if (t.result === "Win") badgeClass = "badge-win";
    else if (t.result === "Loss") badgeClass = "badge-loss";

    const sessionName = t.session || "None";
    const stratName = t.strategy || "None";

    tbody.innerHTML += `
      <tr style="cursor:pointer;" onclick="openTradeDetails('${t.id}')">
        <td class="text-xs text-muted">${sorted.length - idx}</td>
        <td class="text-xs">${t.date}</td>
        <td><strong class="text-accent">${t.asset}</strong></td>
        <td><span class="${t.type === 'Buy' ? 'text-success' : 'text-danger'} font-bold text-xs">${t.type.toUpperCase()}</span></td>
        <td class="text-xs">${stratName}</td>
        <td class="text-xs">${sessionName}</td>
        <td><span class="badge ${badgeClass}" style="font-size:0.65rem;">${t.result}</span></td>
        <td class="${t.pnl >= 0 ? 'text-success' : 'text-danger'} font-bold text-sm">
          ${t.pnl >= 0 ? '+' : '-'}$${Math.abs(t.pnl).toFixed(2)}
        </td>
      </tr>
    `;
  });
}

// --- SETUP DASHBOARD EVENT LISTENERS ---
export function setupDashboardListeners() {
  if (els.dashViewAllTradesBtn) {
    els.dashViewAllTradesBtn.addEventListener("click", () => {
      switchTab("historyPage");
    });
  }
}

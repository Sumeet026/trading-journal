import { state, els, getAccountCurrency, showNotification, exportTradesCsv } from './core.js';
import {
  drawMonteCarloSimulation,
  renderPortfolioAllocation,
  renderDrawdownCurve,
  renderHourlyPnL,
  renderDayOfWeekPnL
} from '../chart.js';

export function initAnalytics() {
  els.exportCsvBtn.addEventListener("click", () => {
    exportTradesCsv();
  });

  els.exportPdfBtn.addEventListener("click", () => {
    showNotification("Preparing report... Opening system print dialog for PDF saving.", "info");
    window.print();
  });

  if (els.runMonteCarloBtn) {
    els.runMonteCarloBtn.addEventListener("click", () => {
      let startBal = 10000;
      if (state.activeAccountId !== "all") {
        const acc = state.accounts.find(a => a.id === state.activeAccountId);
        if (acc) startBal = acc.balance;
      } else {
        startBal = state.accounts.reduce((sum, a) => sum + a.balance, 0);
      }
      drawMonteCarloSimulation("chartMonteCarlo", state.trades, startBal);
      showNotification("Monte Carlo simulation re-run with fresh randomized paths.", "info");
    });
  }
}

export function renderAnalyticsReports() {
  const activeAccId = state.activeAccountId;

  let grossProfit = 0;
  let grossLoss = 0;
  let winsCount = 0;
  let lossesCount = 0;
  let maxDrawdown = 0;

  let winStreak = 0;
  let lossStreak = 0;
  let tempWinStreak = 0;
  let tempLossStreak = 0;

  const dailyPnLs = {};

  const chronoTrades = [...state.trades].sort((a, b) => new Date(a.date + "T" + (a.time || "00:00")) - new Date(b.date + "T" + (b.time || "00:00")));

  let startBal = 10000;
  if (activeAccId !== "all") {
    const acc = state.accounts.find(a => a.id === activeAccId);
    if (acc) startBal = acc.balance;
  } else {
    startBal = state.accounts.reduce((sum, a) => sum + a.balance, 0);
  }

  let currentBalance = startBal;
  let peakBalance = startBal;

  chronoTrades.forEach(t => {
    if (t.pnl > 0) {
      grossProfit += t.pnl;
      winsCount++;
      tempWinStreak++;
      if (tempLossStreak > lossStreak) lossStreak = tempLossStreak;
      tempLossStreak = 0;
    } else if (t.pnl < 0) {
      grossLoss += Math.abs(t.pnl);
      lossesCount++;
      tempLossStreak++;
      if (tempWinStreak > winStreak) winStreak = tempWinStreak;
      tempWinStreak = 0;
    } else {
      if (tempWinStreak > winStreak) winStreak = tempWinStreak;
      if (tempLossStreak > lossStreak) lossStreak = tempLossStreak;
      tempWinStreak = 0;
      tempLossStreak = 0;
    }

    currentBalance += t.pnl;
    if (currentBalance > peakBalance) {
      peakBalance = currentBalance;
    } else {
      const dd = peakBalance - currentBalance;
      if (dd > maxDrawdown) maxDrawdown = dd;
    }

    dailyPnLs[t.date] = (dailyPnLs[t.date] || 0) + t.pnl;
  });

  if (tempWinStreak > winStreak) winStreak = tempWinStreak;
  if (tempLossStreak > lossStreak) lossStreak = tempLossStreak;

  const profitFactor = grossLoss ? grossProfit / grossLoss : (grossProfit ? 99.9 : 0);
  els.reportProfitFactor.innerText = profitFactor.toFixed(2);

  const avgWin = winsCount ? grossProfit / winsCount : 0;
  const avgLoss = lossesCount ? grossLoss / lossesCount : 0;
  const winLossRatio = avgLoss ? avgWin / avgLoss : 0;

  els.reportAvgWinLoss.innerText = `+$${avgWin.toFixed(2)} / -$${avgLoss.toFixed(2)}`;
  els.reportAvgWinLossRatio.innerText = `Win/Loss Ratio: ${winLossRatio.toFixed(2)}`;

  els.reportStreaks.innerText = `Wins: ${winStreak} | Losses: ${lossStreak}`;
  els.reportMaxDrawdown.innerText = `$${maxDrawdown.toFixed(2)}`;

  let bestDayKey = "-";
  let bestDayVal = 0;
  let worstDayKey = "-";
  let worstDayVal = 0;

  Object.keys(dailyPnLs).forEach(d => {
    const val = dailyPnLs[d];
    if (val > bestDayVal) {
      bestDayVal = val;
      bestDayKey = d;
    }
    if (val < worstDayVal) {
      worstDayVal = val;
      worstDayKey = d;
    }
  });

  els.reportBestDay.innerText = bestDayKey;
  els.reportBestDayAmount.innerText = `+$${bestDayVal.toFixed(2)}`;
  els.reportWorstDay.innerText = worstDayKey;
  els.reportWorstDayAmount.innerText = `-$${Math.abs(worstDayVal).toFixed(2)}`;

  const stratPerformance = {};
  state.trades.forEach(t => {
    const s = t.strategy || "No Strategy";
    stratPerformance[s] = (stratPerformance[s] || 0) + t.pnl;
  });

  let bestStrat = "-";
  let bestStratPnl = 0;
  Object.keys(stratPerformance).forEach(s => {
    if (stratPerformance[s] > bestStratPnl) {
      bestStratPnl = stratPerformance[s];
      bestStrat = s;
    }
  });

  els.reportBestStrategy.innerText = bestStrat;
  els.reportBestStrategyAmount.innerText = `+$${bestStratPnl.toFixed(2)} total`;

  drawMonteCarloSimulation("chartMonteCarlo", state.trades, startBal);
  renderPortfolioAllocation("chartPortfolioAllocation", state.accounts);
  renderDrawdownCurve("chartDrawdownCurve", state.trades, startBal);
  renderHourlyPnL("chartHourlyPnL", state.trades);
  renderDayOfWeekPnL("chartDayOfWeekPnL", state.trades);
}

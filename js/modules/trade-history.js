import { state, els, showNotification, getCurrencySymbol, getAccountCurrency } from './core.js';
import { deleteTrade, getTrades } from '../storage.js';
import { loadInitialData } from './core.js';
import { switchTab } from './navigation.js';

function triggerHistoryFilter() {
  renderHistoryPage();
}

function setupFilterListeners() {
  els.filterSearch.addEventListener("input", triggerHistoryFilter);
  els.filterAccount.addEventListener("change", triggerHistoryFilter);
  els.filterResult.addEventListener("change", triggerHistoryFilter);
  els.filterStrategy.addEventListener("change", triggerHistoryFilter);
  els.filterTimeframe.addEventListener("change", triggerHistoryFilter);
  els.filterSession.addEventListener("change", triggerHistoryFilter);
}

function setupViewModeToggle() {
  els.viewModeTable.addEventListener("click", () => {
    els.viewModeTable.classList.add("active");
    els.viewModeCard.classList.remove("active");
    els.historyTableView.style.display = "block";
    els.historyCardView.style.display = "none";
  });

  els.viewModeCard.addEventListener("click", () => {
    els.viewModeCard.classList.add("active");
    els.viewModeTable.classList.remove("active");
    els.historyTableView.style.display = "none";
    els.historyCardView.style.display = "grid";
  });
}

// --- RENDER PAGE: HISTORY ---
export function renderHistoryPage() {
  const searchVal = els.filterSearch.value.toLowerCase();
  const accVal = els.filterAccount.value;
  const resVal = els.filterResult.value;
  const stratVal = els.filterStrategy.value;
  const tfVal = els.filterTimeframe.value;
  const sessVal = els.filterSession.value;

  // Extract Strategy lists for filter dropdown
  const strategies = new Set();
  state.allTrades.forEach(t => {
    if (t.strategy && t.strategy !== "None") strategies.add(t.strategy);
  });
  
  // Re-fill Strategy Dropdown Filter
  const currentFilterStrat = els.filterStrategy.value;
  els.filterStrategy.innerHTML = '<option value="all">All Strategies</option>';
  strategies.forEach(s => {
    els.filterStrategy.innerHTML += `<option value="${s}">${s}</option>`;
  });
  els.filterStrategy.value = currentFilterStrat;

  // Filter local trades list
  const filtered = state.allTrades.filter(t => {
    const matchesSearch = !searchVal || 
      t.asset.toLowerCase().includes(searchVal) || 
      (t.strategy && t.strategy.toLowerCase().includes(searchVal)) || 
      (t.setup && t.setup.toLowerCase().includes(searchVal)) || 
      (t.notes && t.notes.toLowerCase().includes(searchVal));
    const matchesAccount = accVal === "all" || t.accountId === accVal;
    const matchesResult = resVal === "all" || t.result === resVal;
    const matchesStrategy = stratVal === "all" || t.strategy === stratVal;
    const matchesTimeframe = tfVal === "all" || t.timeframe === tfVal;
    const matchesSession = sessVal === "all" || (t.session || "None") === sessVal;

    return matchesSearch && matchesAccount && matchesResult && matchesStrategy && matchesTimeframe && matchesSession;
  });

  // 1. Render Table View
  els.historyTable.innerHTML = "";
  if (filtered.length === 0) {
    els.historyTable.innerHTML = `<tr><td colspan="12" class="text-center text-muted">No trades match the selected filters.</td></tr>`;
  } else {
    filtered.forEach(t => {
      let badgeClass = "badge-breakeven";
      if (t.result === "Win") badgeClass = "badge-win";
      else if (t.result === "Loss") badgeClass = "badge-loss";

      const accountName = state.accounts.find(a => a.id === t.accountId)?.name || "Unknown";
      const tSym = getCurrencySymbol(getAccountCurrency(t.accountId));
      const sessionName = t.session || "None";

      els.historyTable.innerHTML += `
        <tr>
          <td>${t.date} <span class="text-xs text-muted">${t.entryTime || t.time || ''}</span></td>
          <td><span class="text-xs text-light font-semibold">${accountName}</span></td>
          <td><strong class="text-accent">${t.asset}</strong></td>
          <td><span class="${t.type === 'Buy' ? 'text-success' : 'text-danger'} font-bold text-xs">${t.type.toUpperCase()}</span></td>
          <td><span class="badge badge-win text-xs">${sessionName}</span></td>
          <td>${tSym}${t.entryPrice.toFixed(5).replace(/\.?0+$/, '')}</td>
          <td>${tSym}${t.exitPrice.toFixed(5).replace(/\.?0+$/, '')}</td>
          <td>${t.quantity.toLocaleString()}</td>
          <td><span class="badge ${badgeClass}">${t.result}</span></td>
          <td class="${t.pnl >= 0 ? 'text-success' : 'text-danger'} font-bold">
            ${t.pnl >= 0 ? '+' : '-'}${tSym}${Math.abs(t.pnl).toFixed(2)}
          </td>
          <td class="font-semibold text-accent">${t.rMultiple ? t.rMultiple.toFixed(2) + 'R' : '-'}</td>
          <td>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-icon btn-secondary" onclick="openTradeDetails('${t.id}')" title="Inspect"><i class="fa fa-eye"></i></button>
              <button class="btn btn-sm btn-icon btn-secondary" onclick="duplicateTradeTrigger('${t.id}')" title="Duplicate"><i class="fa fa-copy"></i></button>
              <button class="btn btn-sm btn-icon btn-secondary" onclick="loadTradeIntoForm('${t.id}')" title="Edit"><i class="fa fa-edit"></i></button>
              <button class="btn btn-sm btn-icon btn-secondary text-danger" onclick="deleteTradeTrigger('${t.id}')" title="Delete"><i class="fa fa-trash-can"></i></button>
            </div>
          </td>
        </tr>
      `;
    });
  }

  // 2. Render Cards View
  els.historyCardView.innerHTML = "";
  if (filtered.length === 0) {
    els.historyCardView.innerHTML = `<div class="col-span-12 text-center text-muted p-4">No trades match current filters.</div>`;
  } else {
    filtered.forEach(t => {
      let badgeClass = "badge-breakeven";
      if (t.result === "Win") badgeClass = "badge-win";
      else if (t.result === "Loss") badgeClass = "badge-loss";

      const accountName = state.accounts.find(a => a.id === t.accountId)?.name || "Unknown";

      els.historyCardView.innerHTML += `
        <div class="trade-card">
          <div class="flex justify-between align-center">
            <div>
              <strong class="text-accent text-lg">${t.asset}</strong>
              <span class="text-xs text-muted ml-2">${t.date}</span>
            </div>
            <span class="badge ${badgeClass}">${t.result}</span>
          </div>

          <div class="grid-cols-2 text-xs py-2 border-bottom border-top" style="border-top:1px solid var(--card-border); border-bottom:1px solid var(--card-border);">
            <div><span class="text-muted">Account:</span> <span class="font-bold">${accountName}</span></div>
            <div><span class="text-muted">Direction:</span> <span class="font-bold ${t.type === 'Buy' ? 'text-success' : 'text-danger'}">${t.type.toUpperCase()}</span></div>
            <div><span class="text-muted">Entry:</span> <strong>$${t.entryPrice}</strong></div>
            <div><span class="text-muted">Exit:</span> <strong>$${t.exitPrice}</strong></div>
            <div><span class="text-muted">Strategy:</span> <span class="font-bold text-accent">${t.strategy}</span></div>
            <div><span class="text-muted">Session:</span> <span class="font-bold text-accent">${t.session || 'None'}</span></div>
            <div><span class="text-muted">R Multiple:</span> <strong class="text-light">${t.rMultiple ? t.rMultiple.toFixed(2) + 'R' : '-'}</strong></div>
          </div>

          <div class="flex justify-between align-center mt-2">
            <span class="text-lg font-bold ${t.pnl >= 0 ? 'text-success' : 'text-danger'}">
              ${t.pnl >= 0 ? '+' : '-'}$${Math.abs(t.pnl).toFixed(2)}
            </span>
            <div class="flex gap-2">
              <button class="btn btn-sm btn-icon btn-secondary" onclick="openTradeDetails('${t.id}')" title="Details"><i class="fa fa-eye"></i></button>
              <button class="btn btn-sm btn-icon btn-secondary" onclick="loadTradeIntoForm('${t.id}')" title="Edit"><i class="fa fa-edit"></i></button>
            </div>
          </div>
        </div>
      `;
    });
  }
}

window.deleteTradeTrigger = async function(tradeId) {
  if (confirm("Are you sure you want to delete this trade?")) {
    await deleteTrade(tradeId);
    showNotification("Trade deleted successfully.", "warning");
    await loadInitialData();
  }
};

window.duplicateTradeTrigger = function(tradeId) {
  const trade = state.allTrades.find(t => t.id === tradeId);
  if (trade) {
    window.resetTradeForm();
    els.tradeAccount.value = trade.accountId;
    els.tradeAsset.value = trade.asset;
    window.setTradeType(trade.type);
    els.tradeEntryPrice.value = trade.entryPrice;
    els.tradeExitPrice.value = trade.exitPrice;
    els.tradeQuantity.value = trade.quantity;
    els.tradeCommission.value = trade.commission || 0;
    els.tradeDate.value = trade.date;
    els.tradeEntryTime.value = trade.entryTime || "";
    els.tradeExitTime.value = trade.exitTime || "";
    els.tradeStrategy.value = trade.strategy || "";
    els.tradeSetup.value = trade.setup || "";
    window.renderStrategies();
    window.renderSetups();
    els.tradeTimeframe.value = trade.timeframe;
    els.tradeSession.value = trade.session || "None";
    
    showNotification("Trade properties duplicated into entry form.", "info");
    switchTab("entryPage");
  }
};

export function initTradeHistory() {
  setupFilterListeners();
  setupViewModeToggle();
}

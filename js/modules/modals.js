import { state, els, showNotification, loadInitialData, getAccountCurrency, getCurrencySymbol } from './core.js';
import { deleteTrade } from '../storage.js';

export function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.add("active");
}

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
};

export const closeModal = window.closeModal;

export function openTradeDetails(tradeId) {
  const t = state.allTrades.find(tr => tr.id === tradeId);
  if (!t) return;

  const accountName = state.accounts.find(a => a.id === t.accountId)?.name || "Unknown";

  els.detailHeaderTitle.innerText = `Trade Details: ${t.asset} ${t.type.toUpperCase()}`;

  let badgeClass = "badge-breakeven";
  if (t.result === "Win") badgeClass = "badge-win";
  else if (t.result === "Loss") badgeClass = "badge-loss";

  els.detailResultBadge.className = `badge ${badgeClass}`;
  els.detailResultBadge.innerText = t.result;

  const dSym = getCurrencySymbol(getAccountCurrency(t.accountId));
  els.detailPnl.innerText = (t.pnl >= 0 ? '+' : '-') + dSym + Math.abs(t.pnl).toFixed(2);
  els.detailPnl.className = "text-lg font-bold " + (t.pnl >= 0 ? 'text-success' : 'text-danger');

  els.detailRMultiple.innerText = t.rMultiple ? (t.rMultiple >= 0 ? '+' : '-') + Math.abs(t.rMultiple).toFixed(2) + "R" : "-";

  els.detailAccount.innerText = accountName;
  els.detailDirection.innerText = t.type.toUpperCase();
  els.detailDirection.className = "font-semibold " + (t.type === "Buy" ? "text-success" : "text-danger");
  els.detailAsset.innerText = t.asset;
  els.detailQuantity.innerText = t.quantity.toLocaleString();
  els.detailEntryPrice.innerText = dSym + t.entryPrice;
  els.detailExitPrice.innerText = dSym + t.exitPrice;
  els.detailFees.innerText = `${dSym}${t.commission || '0'}`;

  els.detailStrategy.innerText = t.strategy || "None Tagged";
  els.detailSetup.innerText = t.setup || "None Specified";
  els.detailTimeframe.innerText = t.timeframe || "1H";
  els.detailEmotionBefore.innerText = t.emotionBefore || "Calm";
  els.detailEmotionAfter.innerText = t.emotionAfter || "Calm";
  els.detailRatings.innerText = `Confidence: ${t.confidence}/5 | Discipline: ${t.discipline}/5`;

  els.detailNotes.innerText = t.notes || "No narrative logged.";
  els.detailLessons.innerText = t.lessons || "No takeaways logged.";

  els.detailMistakes.innerHTML = "";
  if (t.mistakes && t.mistakes.length > 0) {
    t.mistakes.forEach(m => {
      els.detailMistakes.innerHTML += `<span class="badge badge-loss text-xs mr-1">${m}</span>`;
    });
  } else {
    els.detailMistakes.innerHTML = `<span class="text-xs text-muted">No mistakes registered. Clean execution!</span>`;
  }

  if (t.screenshotUrl) {
    els.detailScreenshotSection.style.display = "flex";
    els.detailScreenshotImg.src = t.screenshotUrl;
  } else {
    els.detailScreenshotSection.style.display = "none";
  }

  els.detailEditBtn.setAttribute("data-id", t.id);
  els.detailDeleteBtn.setAttribute("data-id", t.id);

  openModal("tradeDetailsModal");
}

window.openTradeDetails = openTradeDetails;

export function openCalendarDayTrades(dateStr, dayTrades) {
  els.calendarDayModalTitle.innerText = `Trades executed on: ${dateStr}`;

  els.calendarDayTable.innerHTML = "";
  if (dayTrades.length === 0) {
    els.calendarDayTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No trades recorded on this day.</td></tr>`;
  } else {
    dayTrades.forEach(t => {
      let badgeClass = "badge-breakeven";
      if (t.result === "Win") badgeClass = "badge-win";
      else if (t.result === "Loss") badgeClass = "badge-loss";

      els.calendarDayTable.innerHTML += `
        <tr>
          <td><strong class="text-accent">${t.asset}</strong></td>
          <td><span class="${t.type === 'Buy' ? 'text-success' : 'text-danger'} font-semibold">${t.type.toUpperCase()}</span></td>
          <td><span class="badge ${badgeClass}">${t.result}</span></td>
          <td class="${t.pnl >= 0 ? 'text-success' : 'text-danger'} font-bold">
            ${t.pnl >= 0 ? '+' : '-'}$${Math.abs(t.pnl).toFixed(2)}
          </td>
          <td>
            <button class="btn btn-sm btn-secondary" onclick="closeModal('calendarDayModal'); openTradeDetails('${t.id}')">Inspect</button>
          </td>
        </tr>
      `;
    });
  }

  openModal("calendarDayModal");
}

window.openCalendarDayTrades = openCalendarDayTrades;

export function initModals() {
  els.detailEditBtn.addEventListener("click", () => {
    const tradeId = els.detailEditBtn.getAttribute("data-id");
    closeModal("tradeDetailsModal");
    window.loadTradeIntoForm(tradeId);
  });

  els.detailDeleteBtn.addEventListener("click", async () => {
    const tradeId = els.detailDeleteBtn.getAttribute("data-id");
    if (confirm("Are you sure you want to delete this trade?")) {
      await deleteTrade(tradeId);
      showNotification("Trade deleted successfully.", "warning");
      closeModal("tradeDetailsModal");
      await loadInitialData();
    }
  });
}

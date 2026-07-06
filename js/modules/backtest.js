import { state, els, showNotification } from './core.js';
import { getBacktests, saveBacktest, deleteBacktest } from '../storage.js';
import { renderBtWinLossPie, renderBtStrategyPerformance } from '../chart.js';

let btBacktests = [];

window.setBtType = function(type) {
  els.btType.value = type;
  if (type === "Buy") {
    els.btTypeBuy.className = "toggle-btn active-buy";
    els.btTypeSell.className = "toggle-btn";
  } else {
    els.btTypeBuy.className = "toggle-btn";
    els.btTypeSell.className = "toggle-btn active-sell";
  }
};

export async function renderBacktestPage() {
  btBacktests = await getBacktests();
  renderBacktestStats();
  renderBacktestHistory();
  renderBacktestCharts();
}

function renderBacktestStats() {
  const total = btBacktests.length;
  const wins = btBacktests.filter(b => b.result === "Win").length;
  const losses = btBacktests.filter(b => b.result === "Loss").length;
  const winRate = total > 0 ? ((wins / total) * 100).toFixed(1) : "0.0";
  const rMultiples = btBacktests.map(b => parseFloat(b.rMultiple) || 0);
  const avgR = rMultiples.length > 0 ? (rMultiples.reduce((a, b) => a + b, 0) / rMultiples.length).toFixed(2) : "0.00";
  const grossProfit = btBacktests.filter(b => b.result === "Win").reduce((s, b) => s + (parseFloat(b.rMultiple) || 0), 0);
  const grossLoss = Math.abs(btBacktests.filter(b => b.result === "Loss").reduce((s, b) => s + (parseFloat(b.rMultiple) || 0), 0));
  const pf = grossLoss > 0 ? (grossProfit / grossLoss).toFixed(2) : grossProfit > 0 ? "∞" : "0.00";

  els.btStatTotal.textContent = total;
  els.btStatWinRate.textContent = winRate + "%";
  els.btStatAvgR.textContent = avgR + "R";
  els.btStatPF.textContent = pf;

  if (parseFloat(winRate) >= 55) {
    els.btStatWinRate.className = "stat-value text-success";
  } else if (parseFloat(winRate) >= 40) {
    els.btStatWinRate.className = "stat-value text-warning";
  } else {
    els.btStatWinRate.className = "stat-value text-danger";
  }
}

function renderBacktestHistory() {
  const search = (els.btSearchInput?.value || "").toLowerCase();
  const filter = els.btFilterResult?.value || "all";

  let filtered = btBacktests;
  if (search) {
    filtered = filtered.filter(b =>
      (b.asset || "").toLowerCase().includes(search) ||
      (b.strategy || "").toLowerCase().includes(search) ||
      (b.notes || "").toLowerCase().includes(search)
    );
  }
  if (filter !== "all") {
    filtered = filtered.filter(b => b.result === filter);
  }

  if (filtered.length === 0) {
    els.btHistoryBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted p-4">No backtests found.</td></tr>';
    return;
  }

  els.btHistoryBody.innerHTML = filtered.map(b => {
    const resultBadge = b.result === "Win" ? "badge-win" : b.result === "Loss" ? "badge-loss" : "badge-breakeven";
    const rColor = (parseFloat(b.rMultiple) || 0) > 0 ? "text-success" : (parseFloat(b.rMultiple) || 0) < 0 ? "text-danger" : "text-warning";
    return `<tr>
      <td class="text-xs">${b.date || "-"}</td>
      <td><span class="font-semibold">${b.asset || "-"}</span></td>
      <td class="text-xs">${b.strategy || "-"}</td>
      <td class="text-xs">${b.type || "-"}</td>
      <td><span class="badge ${resultBadge}">${b.result}</span></td>
      <td class="font-bold ${rColor}">${b.rMultiple ? b.rMultiple + "R" : "-"}</td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="editBtEntry('${b.id}')" title="Edit"><i class="fa fa-pen"></i></button>
        <button class="btn btn-sm btn-danger" onclick="deleteBtEntry('${b.id}')" title="Delete"><i class="fa fa-trash"></i></button>
        ${b.screenshotUrl ? `<button class="btn btn-sm btn-secondary" onclick="viewBtScreenshot('${b.id}')" title="Screenshot"><i class="fa fa-image"></i></button>` : ""}
      </td>
    </tr>`;
  }).join("");
}

function renderBacktestCharts() {
  const wins = btBacktests.filter(b => b.result === "Win").length;
  const losses = btBacktests.filter(b => b.result === "Loss").length;
  const be = btBacktests.filter(b => b.result === "Break-even").length;
  renderBtWinLossPie(wins, losses, be);

  const stratMap = {};
  btBacktests.forEach(b => {
    const s = b.strategy || "None";
    if (!stratMap[s]) stratMap[s] = { wins: 0, losses: 0, total: 0 };
    stratMap[s].total++;
    if (b.result === "Win") stratMap[s].wins++;
    else if (b.result === "Loss") stratMap[s].losses++;
  });
  const stratLabels = Object.keys(stratMap);
  const stratWins = stratLabels.map(s => stratMap[s].wins);
  const stratLosses = stratLabels.map(s => stratMap[s].losses);
  renderBtStrategyPerformance(stratLabels, stratWins, stratLosses);
}

function initBacktestForm() {
  els.backtestForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const btData = {
      id: els.btEditId.value || undefined,
      asset: els.btAsset.value,
      type: els.btType.value,
      entryPrice: els.btEntryPrice.value,
      exitPrice: els.btExitPrice.value,
      stopLoss: els.btStopLoss.value,
      takeProfit: els.btTakeProfit.value,
      quantity: els.btQuantity.value,
      strategy: els.btStrategy.value,
      timeframe: els.btTimeframe.value,
      result: els.btResult.value,
      rMultiple: els.btRMultiple.value,
      notes: els.btNotes.value,
      screenshotUrl: els.btScreenshotPreview.src && els.btScreenshotPreview.src.startsWith("data:") ? els.btScreenshotPreview.src : ""
    };

    await saveBacktest(btData);
    showNotification("Backtest saved!", "success");
    resetBtForm();
    renderBacktestPage();
  });
}

function resetBtForm() {
  els.backtestForm.reset();
  els.btEditId.value = "";
  els.btFormTitle.innerHTML = '<i class="fa-solid fa-plus-circle text-accent"></i> Log Backtest';
  els.btSaveBtn.innerHTML = '<i class="fa fa-save"></i> Save Backtest';
  setBtType("Buy");
  els.btScreenshotPreview.src = "";
  els.btScreenshotPreviewWrapper.style.display = "none";
  els.btDropZone.style.display = "block";
  els.btScreenshot.value = "";
}

window.editBtEntry = async function(id) {
  const bt = btBacktests.find(b => b.id === id);
  if (!bt) return;
  els.btEditId.value = bt.id;
  els.btAsset.value = bt.asset || "";
  els.btType.value = bt.type || "Buy";
  setBtType(bt.type || "Buy");
  els.btEntryPrice.value = bt.entryPrice || "";
  els.btExitPrice.value = bt.exitPrice || "";
  els.btStopLoss.value = bt.stopLoss || "";
  els.btTakeProfit.value = bt.takeProfit || "";
  els.btQuantity.value = bt.quantity || "";
  els.btStrategy.value = bt.strategy || "";
  els.btTimeframe.value = bt.timeframe || "1H";
  els.btResult.value = bt.result || "Win";
  els.btRMultiple.value = bt.rMultiple || "";
  els.btNotes.value = bt.notes || "";
  if (bt.screenshotUrl) {
    els.btScreenshotPreview.src = bt.screenshotUrl;
    els.btScreenshotPreviewWrapper.style.display = "block";
    els.btDropZone.style.display = "none";
  }
  els.btFormTitle.innerHTML = '<i class="fa-solid fa-pen text-warning"></i> Edit Backtest';
  els.btSaveBtn.innerHTML = '<i class="fa fa-save"></i> Update Backtest';
  window.scrollTo({ top: 0, behavior: "smooth" });
};

window.deleteBtEntry = async function(id) {
  if (!confirm("Delete this backtest entry?")) return;
  await deleteBacktest(id);
  showNotification("Backtest deleted.", "info");
  renderBacktestPage();
};

window.viewBtScreenshot = function(id) {
  const bt = btBacktests.find(b => b.id === id);
  if (bt && bt.screenshotUrl) {
    const win = window.open("", "_blank", "width=900,height=700");
    win.document.write(`<html><head><title>Backtest Screenshot - ${bt.asset}</title><style>body{margin:0;background:#111;display:flex;justify-content:center;align-items:center;height:100vh;}img{max-width:95%;max-height:95vh;border-radius:8px;}</style></head><body><img src="${bt.screenshotUrl}"></body></html>`);
  }
};

function handleBtScreenshot(file) {
  if (file.size > 2 * 1024 * 1024) {
    showNotification("Image exceeds 2MB limit.", "danger");
    return;
  }
  const reader = new FileReader();
  reader.onload = function(e) {
    els.btScreenshotPreview.src = e.target.result;
    els.btScreenshotPreviewWrapper.style.display = "block";
    els.btDropZone.style.display = "none";
  };
  reader.readAsDataURL(file);
}

export function initBacktest() {
  initBacktestForm();

  els.resetBtFormBtn.addEventListener("click", resetBtForm);

  els.btSearchInput.addEventListener("input", () => renderBacktestHistory());
  els.btFilterResult.addEventListener("change", () => renderBacktestHistory());

  els.btDropZone.addEventListener("click", () => els.btScreenshot.click());
  els.btScreenshot.addEventListener("change", (e) => {
    if (e.target.files.length) handleBtScreenshot(e.target.files[0]);
  });
  els.btDropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.btDropZone.style.borderColor = "var(--primary)";
  });
  els.btDropZone.addEventListener("dragleave", () => {
    els.btDropZone.style.borderColor = "var(--card-border)";
  });
  els.btDropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    els.btDropZone.style.borderColor = "var(--card-border)";
    if (e.dataTransfer.files.length) handleBtScreenshot(e.dataTransfer.files[0]);
  });
  els.btRemoveScreenshotBtn.addEventListener("click", () => {
    els.btScreenshotPreview.src = "";
    els.btScreenshotPreviewWrapper.style.display = "none";
    els.btDropZone.style.display = "block";
    els.btScreenshot.value = "";
  });
}

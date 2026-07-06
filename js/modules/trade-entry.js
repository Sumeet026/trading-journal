import { state, els, showNotification, flashSaveIndicator } from './core.js';
import {
  saveTrade,
  getChecklist,
  saveChecklist,
  getGoals,
  saveGoal
} from '../storage.js';
import { switchTab } from './navigation.js';
import { loadInitialData } from './core.js';

// --- MODAL HELPERS ---
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove("active");
}

// --- CUSTOM TAG INPUT SYSTEM (Strategy & Setup) ---
function getStrategyKey() {
  return `tj_${state.user ? state.user.uid + '_' : ''}saved_strategies`;
}
function getSetupKey() {
  return `tj_${state.user ? state.user.uid + '_' : ''}saved_setups`;
}
let savedStrategies = JSON.parse(localStorage.getItem(getStrategyKey()) || "[]");
let savedSetups = JSON.parse(localStorage.getItem(getSetupKey()) || "[]");

function reloadCustomTags() {
  savedStrategies = JSON.parse(localStorage.getItem(getStrategyKey()) || "[]");
  savedSetups = JSON.parse(localStorage.getItem(getSetupKey()) || "[]");
  renderStrategies();
  renderSetups();
}

function initCustomTagSystem() {
  renderStrategies();
  renderSetups();

  els.addStrategyBtn.addEventListener("click", () => {
    const val = els.strategyInput.value.trim();
    if (val && !savedStrategies.includes(val)) {
      savedStrategies.push(val);
      localStorage.setItem(getStrategyKey(), JSON.stringify(savedStrategies));
      els.strategyInput.value = "";
      renderStrategies();
    }
  });

  els.strategyInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      els.addStrategyBtn.click();
    }
  });

  els.addSetupBtn.addEventListener("click", () => {
    const val = els.setupInput.value.trim();
    if (val && !savedSetups.includes(val)) {
      savedSetups.push(val);
      localStorage.setItem(getSetupKey(), JSON.stringify(savedSetups));
      els.setupInput.value = "";
      renderSetups();
    }
  });

  els.setupInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      els.addSetupBtn.click();
    }
  });
}

function renderStrategies() {
  els.savedStrategies.innerHTML = "";
  if (savedStrategies.length === 0) {
    els.savedStrategies.innerHTML = '<span class="no-tags-msg">No strategies added yet. Type and click Add.</span>';
    return;
  }
  savedStrategies.forEach(s => {
    const isActive = els.tradeStrategy.value === s ? "active" : "";
    const chip = document.createElement("span");
    chip.className = `tag-chip ${isActive}`;
    chip.innerHTML = `${s} <span class="tag-delete" data-val="${s}">&times;</span>`;
    chip.addEventListener("click", (e) => {
      if (e.target.classList.contains("tag-delete")) {
        savedStrategies = savedStrategies.filter(x => x !== e.target.dataset.val);
        localStorage.setItem(getStrategyKey(), JSON.stringify(savedStrategies));
        renderStrategies();
      } else {
        els.tradeStrategy.value = s;
        renderStrategies();
      }
    });
    els.savedStrategies.appendChild(chip);
  });
}

function renderSetups() {
  els.savedSetups.innerHTML = "";
  if (savedSetups.length === 0) {
    els.savedSetups.innerHTML = '<span class="no-tags-msg">No setups added yet. Type and click Add.</span>';
    return;
  }
  savedSetups.forEach(s => {
    const isActive = els.tradeSetup.value === s ? "active" : "";
    const chip = document.createElement("span");
    chip.className = `tag-chip ${isActive}`;
    chip.innerHTML = `${s} <span class="tag-delete" data-val="${s}">&times;</span>`;
    chip.addEventListener("click", (e) => {
      if (e.target.classList.contains("tag-delete")) {
        savedSetups = savedSetups.filter(x => x !== e.target.dataset.val);
        localStorage.setItem(getSetupKey(), JSON.stringify(savedSetups));
        renderSetups();
      } else {
        els.tradeSetup.value = s;
        renderSetups();
      }
    });
    els.savedSetups.appendChild(chip);
  });
}

// --- SET TRADE TYPE ---
window.setTradeType = function(type) {
  state.activeTradeType = type;
  els.tradeType.value = type;
  if (type === "Buy") {
    els.typeBuy.className = "toggle-btn active-buy";
    els.typeSell.className = "toggle-btn";
  } else {
    els.typeBuy.className = "toggle-btn";
    els.typeSell.className = "toggle-btn active-sell";
  }
};

// --- POSITION SIZE CALCULATOR ---
window.calculatePositionSize = function() {
  const balance = parseFloat(els.calcBalance.value) || 0;
  const riskPct = parseFloat(els.calcRisk.value) || 0;
  const stopLoss = parseFloat(els.calcStopLoss.value) || 0;
  const pipVal = parseFloat(els.calcPipVal.value) || 10;

  if (balance <= 0 || riskPct <= 0 || stopLoss <= 0) {
    showNotification("Invalid inputs in position calculator.", "warning");
    return;
  }

  const riskAmount = balance * (riskPct / 100);
  const positionSize = riskAmount / (stopLoss * pipVal);

  els.calcRiskAmount.innerText = "$" + riskAmount.toFixed(2);
  els.calcPositionSize.innerText = positionSize.toFixed(2) + " Lots/Units";
};

// --- SCREENSHOT HANDLER ---
function handleScreenshotFile(file) {
  if (file.size > 2 * 1024 * 1024) {
    showNotification("Image exceeds 2MB limit.", "danger");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    els.screenshotPreview.src = e.target.result;
    els.screenshotPreviewWrapper.style.display = "block";
    els.dropZone.style.display = "none";
  };
  reader.readAsDataURL(file);
}

// --- LOAD TRADE INTO FORM ---
window.loadTradeIntoForm = function(tradeId) {
  const trade = state.allTrades.find(t => t.id === tradeId);
  if (!trade) return;

  closeModal("tradeDetailsModal");
  resetTradeForm();

  els.tradeFormTitle.innerHTML = `<i class="fa-solid fa-edit"></i> Edit Trade: ${trade.asset}`;
  els.editTradeId.value = trade.id;
  els.tradeAccount.value = trade.accountId;
  els.tradeAsset.value = trade.asset;
  setTradeType(trade.type);
  els.tradeEntryPrice.value = trade.entryPrice;
  els.tradeExitPrice.value = trade.exitPrice;
  els.tradeQuantity.value = trade.quantity;
  els.tradeCommission.value = trade.commission || 0;
  els.tradeDate.value = trade.date;
  els.tradeStrategy.value = trade.strategy || "";
  els.tradeSetup.value = trade.setup || "";
  renderStrategies();
  renderSetups();
  els.tradeTimeframe.value = trade.timeframe;
  els.tradeEmotionBefore.value = trade.emotionBefore;
  els.tradeEmotionAfter.value = trade.emotionAfter;
  els.tradeConfidence.value = trade.confidence;
  els.tradeDiscipline.value = trade.discipline;
  els.tradeNotes.value = trade.notes;
  els.tradeLessons.value = trade.lessons;

  if (trade.mistakes) {
    trade.mistakes.forEach(m => {
      const cb = document.querySelector(`input[name='mistakesCheck'][value='${m}']`);
      if (cb) cb.checked = true;
    });
  }

  if (trade.screenshotUrl) {
    els.screenshotPreview.src = trade.screenshotUrl;
    els.screenshotPreviewWrapper.style.display = "block";
    els.dropZone.style.display = "none";
  }

  els.saveTradeSubmitBtn.innerHTML = '<i class="fa fa-save"></i> Update Trade Entry';

  switchTab("entryPage");
  showNotification("Loaded trade details into editor form.", "info");
};

// --- RESET TRADE FORM ---
function resetTradeForm() {
  els.tradeFormTitle.innerHTML = `<i class="fa-solid fa-circle-plus"></i> Journal New Trade`;
  els.editTradeId.value = "";
  els.tradeForm.reset();
  setTradeType("Buy");
  els.tradeDate.value = new Date().toISOString().split("T")[0];

  els.tradeStrategy.value = "";
  els.tradeSetup.value = "";
  renderStrategies();
  renderSetups();

  els.screenshotPreview.src = "";
  els.screenshotPreviewWrapper.style.display = "none";
  els.dropZone.style.display = "block";
  els.tradeScreenshot.value = "";

  document.querySelectorAll("input[name='mistakesCheck']:checked").forEach(cb => {
    cb.checked = false;
  });

  els.saveTradeSubmitBtn.innerHTML = '<i class="fa fa-save"></i> Save Trade Entry';
}

// --- RENDER CHECKLIST SECTION ---
function renderChecklistSection() {
  const items = state.checklist;

  const drawHtml = (container) => {
    container.innerHTML = "";
    if (items.length === 0) {
      container.innerHTML = `<span class="text-xs text-muted">No checklist tasks loaded.</span>`;
      return;
    }

    items.forEach(item => {
      container.innerHTML += `
        <div class="checklist-item ${item.completed ? 'completed' : ''}">
          <input type="checkbox" class="checklist-checkbox" ${item.completed ? 'checked' : ''} onclick="toggleChecklistItem('${item.id}')">
          <span class="checklist-text" onclick="toggleChecklistItem('${item.id}')">${item.task}</span>
        </div>
      `;
    });
  };

  if (els.dashChecklist) drawHtml(els.dashChecklist);
  if (els.entryChecklist) drawHtml(els.entryChecklist);
}

// --- TOGGLE CHECKLIST ITEM ---
window.toggleChecklistItem = async function(itemId) {
  const index = state.checklist.findIndex(i => i.id === itemId);
  if (index >= 0) {
    state.checklist[index].completed = !state.checklist[index].completed;
    await saveChecklist(state.checklist);
    renderChecklistSection();
  }
};

// --- RENDER GOALS SECTION ---
function renderGoalsSection() {
  els.dashGoals.innerHTML = "";
  if (state.goals.length === 0) {
    els.dashGoals.innerHTML = `<span class="text-xs text-muted">No trading goals set.</span>`;
    return;
  }

  const wins = state.trades.filter(t => t.result === "Win").length;
  const losses = state.trades.filter(t => t.result === "Loss").length;
  const total = wins + losses;

  const winRateVal = total ? (wins / total) * 100 : 0;

  let grossProfit = 0;
  let grossLoss = 0;
  state.trades.forEach(t => {
    if (t.pnl > 0) grossProfit += t.pnl;
    else grossLoss += Math.abs(t.pnl);
  });
  const profitFactorVal = grossLoss ? grossProfit / grossLoss : (grossProfit ? 99.9 : 0);

  state.goals.forEach(async (goal) => {
    let currentVal = 0;

    if (goal.id === "g1") {
      currentVal = winRateVal;
      goal.current = parseFloat(winRateVal.toFixed(1));
    } else if (goal.id === "g2") {
      currentVal = profitFactorVal;
      goal.current = parseFloat(profitFactorVal.toFixed(2));
    } else if (goal.id === "g3") {
      currentVal = state.trades.filter(t => t.discipline >= 4).length;
      goal.current = currentVal;
    }

    const pct = Math.min((goal.current / goal.target) * 100, 100);
    const completed = goal.current >= goal.target;

    if (completed !== goal.completed) {
      goal.completed = completed;
      await saveGoal(goal);
    }

    els.dashGoals.innerHTML += `
      <div class="flex flex-col text-xs mt-1">
        <div class="flex justify-between font-semibold">
          <span>${goal.title}</span>
          <span class="${completed ? 'text-success' : 'text-accent'}">${goal.current}/${goal.target}</span>
        </div>
        <div style="background: rgba(255,255,255,0.05); height: 4px; border-radius:2px; margin-top:2px;">
          <div style="background: ${completed ? 'var(--success)' : 'var(--primary)'}; height: 100%; width: ${pct}%; border-radius:2px;"></div>
        </div>
      </div>
    `;
  });
}

// --- DELETE / DUPLICATE triggers exposed to window for inline onclick in trade-history.js ---
// (Canonical definitions live in modals.js / trade-history.js — do NOT redefine here)

// --- INIT TRADE ENTRY: Wire up ALL event listeners ---
function initTradeEntry() {
  // Quick Trade Button in Header
  els.headerQuickAddBtn.addEventListener("click", () => {
    resetTradeForm();
    switchTab("entryPage");
  });

  // Reset/Clear Trade Form button
  els.resetTradeFormBtn.addEventListener("click", () => {
    resetTradeForm();
  });

  // Trade Form submit
  els.tradeForm.addEventListener("submit", async () => {
    const entryPrice = parseFloat(els.tradeEntryPrice.value);
    const exitPrice = parseFloat(els.tradeExitPrice.value);
    const qty = parseFloat(els.tradeQuantity.value);
    const comm = parseFloat(els.tradeCommission.value) || 0;
    const type = els.tradeType.value;

    let pnl = 0;
    if (type === "Buy") {
      pnl = (exitPrice - entryPrice) * qty - comm;
    } else {
      pnl = (entryPrice - exitPrice) * qty - comm;
    }

    let result = "Break-even";
    if (pnl > 0.05) result = "Win";
    else if (pnl < -0.05) result = "Loss";

    const mistakes = [];
    document.querySelectorAll("input[name='mistakesCheck']:checked").forEach(cb => {
      mistakes.push(cb.value);
    });

    const tradeId = els.editTradeId.value || null;
    const tradeData = {
      id: tradeId,
      accountId: els.tradeAccount.value,
      asset: els.tradeAsset.value,
      type,
      entryPrice,
      exitPrice,
      quantity: qty,
      commission: comm,
      pnl,
      rMultiple: 0,
      result,
      date: els.tradeDate.value,
      strategy: els.tradeStrategy.value || "None",
      setup: els.tradeSetup.value || "None",
      timeframe: els.tradeTimeframe.value,
      emotionBefore: els.tradeEmotionBefore.value,
      emotionAfter: els.tradeEmotionAfter.value,
      confidence: parseInt(els.tradeConfidence.value),
      discipline: parseInt(els.tradeDiscipline.value),
      notes: els.tradeNotes.value,
      mistakes,
      lessons: els.tradeLessons.value,
      screenshotUrl: els.screenshotPreview.src && els.screenshotPreview.src.startsWith("data:") ? els.screenshotPreview.src : (tradeId ? state.allTrades.find(t => t.id === tradeId)?.screenshotUrl : "")
    };

    await saveTrade(tradeData);
    showNotification(`Trade ${tradeId ? 'updated' : 'logged'} successfully!`, "success");
    resetTradeForm();
    await loadInitialData();
    switchTab("historyPage");
  });

  // Screenshot: dropZone click
  els.dropZone.addEventListener("click", () => {
    els.tradeScreenshot.click();
  });

  // Screenshot: dragover
  els.dropZone.addEventListener("dragover", (e) => {
    e.preventDefault();
    els.dropZone.style.borderColor = "var(--primary)";
  });

  // Screenshot: dragleave
  els.dropZone.addEventListener("dragleave", () => {
    els.dropZone.style.borderColor = "var(--card-border)";
  });

  // Screenshot: drop
  els.dropZone.addEventListener("drop", (e) => {
    e.preventDefault();
    els.dropZone.style.borderColor = "var(--card-border)";
    if (e.dataTransfer.files.length) {
      handleScreenshotFile(e.dataTransfer.files[0]);
    }
  });

  // Screenshot: file change
  els.tradeScreenshot.addEventListener("change", (e) => {
    if (e.target.files.length) {
      handleScreenshotFile(e.target.files[0]);
    }
  });

  // Screenshot: remove
  els.removeScreenshotBtn.addEventListener("click", () => {
    els.screenshotPreview.src = "";
    els.screenshotPreviewWrapper.style.display = "none";
    els.dropZone.style.display = "block";
    els.tradeScreenshot.value = "";
  });

  // Detail Edit button
  els.detailEditBtn.addEventListener("click", () => {
    const tradeId = els.detailEditBtn.getAttribute("data-id");
    closeModal("tradeDetailsModal");
    loadTradeIntoForm(tradeId);
  });

  // Detail Delete button
  els.detailDeleteBtn.addEventListener("click", async () => {
    const tradeId = els.detailDeleteBtn.getAttribute("data-id");
    if (confirm("Are you sure you want to delete this trade?")) {
      const { deleteTrade } = await import('../storage.js');
      await deleteTrade(tradeId);
      showNotification("Trade deleted successfully.", "warning");
      closeModal("tradeDetailsModal");
      await loadInitialData();
    }
  });

  // Expose closeModal globally for inline onclick handlers
  window.closeModal = closeModal;
  window.resetTradeForm = resetTradeForm;
  window.renderStrategies = renderStrategies;
  window.renderSetups = renderSetups;

  // Initialize custom tag system
  initCustomTagSystem();
}

export {
  initTradeEntry,
  initCustomTagSystem,
  reloadCustomTags,
  renderChecklistSection,
  renderGoalsSection,
  resetTradeForm
};

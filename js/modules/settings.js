import { state, els, showNotification, loadInitialData } from './core.js';
import {
  exportData,
  importData,
  syncLocalDataToFirestore,
  getFirebaseLogs,
  clearFirebaseLogs,
  pushLocalToFirebase,
  pullFirebaseToLocal
} from '../storage.js';
import { showAuthScreen } from './auth.js';

export function renderDataDiagnostics() {
  if (!els.dataDiagnosticsPanel) return;

  const localAccounts = JSON.parse(localStorage.getItem(`tj_${state.user ? state.user.uid + '_' : ''}accounts`) || "[]");
  const localTrades = JSON.parse(localStorage.getItem(`tj_${state.user ? state.user.uid + '_' : ''}trades`) || "[]");
  const localNotes = JSON.parse(localStorage.getItem(`tj_${state.user ? state.user.uid + '_' : ''}notes`) || "[]");

  const mode = state.isLocalMode ? "LocalStorage" : (state.user ? "Firebase Cloud" : "Unknown");
  const modeColor = state.isLocalMode ? "text-warning" : (state.user ? "text-success" : "text-danger");
  const userEmail = state.user ? state.user.email : "Not logged in";

  let html = `
    <div class="flex justify-between align-center p-3 rounded-xl" style="background: rgba(255,255,255,0.02); border: 1px solid var(--card-border);">
      <div class="flex flex-col">
        <span class="text-xs text-muted">Active Mode</span>
        <span class="font-bold ${modeColor}">${mode}</span>
      </div>
      <div class="flex flex-col" style="text-align: right;">
        <span class="text-xs text-muted">User</span>
        <span class="font-semibold text-light">${userEmail}</span>
      </div>
    </div>
    <div class="text-xs font-bold text-muted mt-2 mb-1">LOCAL BROWSER CACHE:</div>
    <div class="grid-cols-3 gap-2">
      <div class="p-2 rounded text-center" style="background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.1);">
        <div class="font-bold text-accent">${localTrades.length}</div>
        <div class="text-xs text-muted">Trades</div>
      </div>
      <div class="p-2 rounded text-center" style="background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.1);">
        <div class="font-bold text-success">${localAccounts.length}</div>
        <div class="text-xs text-muted">Accounts</div>
      </div>
      <div class="p-2 rounded text-center" style="background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.1);">
        <div class="font-bold text-warning">${localNotes.length}</div>
        <div class="text-xs text-muted">Notes</div>
      </div>
    </div>
    <div class="text-xs font-bold text-muted mt-3 mb-1">FIREBASE CLOUD:</div>
    <div class="grid-cols-3 gap-2">
      <div class="p-2 rounded text-center" style="background: rgba(99,102,241,0.05); border: 1px solid rgba(99,102,241,0.1);">
        <div class="font-bold text-accent">${state.allTrades.length}</div>
        <div class="text-xs text-muted">Trades</div>
      </div>
      <div class="p-2 rounded text-center" style="background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.1);">
        <div class="font-bold text-success">${state.accounts.length}</div>
        <div class="text-xs text-muted">Accounts</div>
      </div>
      <div class="p-2 rounded text-center" style="background: rgba(245,158,11,0.05); border: 1px solid rgba(245,158,11,0.1);">
        <div class="font-bold text-warning">${state.notes.length}</div>
        <div class="text-xs text-muted">Notes</div>
      </div>
    </div>
  `;

  const localTotal = localTrades.length + localAccounts.length + localNotes.length;
  const cloudTotal = state.allTrades.length + state.accounts.length + state.notes.length;
  if (localTotal > 0 && cloudTotal === 0 && !state.isLocalMode) {
    html += `
      <div class="p-3 rounded-xl mt-3" style="background: rgba(239,68,68,0.08); border: 1px solid rgba(239,68,68,0.2);">
        <span class="font-semibold text-danger text-sm"><i class="fa fa-triangle-exclamation"></i> Data mismatch: Local has ${localTotal} items, Firebase is empty. Use "Push Local → Firebase" to sync.</span>
      </div>
    `;
  } else if (localTotal > 0 && cloudTotal > 0) {
    html += `
      <div class="p-3 rounded-xl mt-3" style="background: rgba(16,185,129,0.08); border: 1px solid rgba(16,185,129,0.2);">
        <span class="font-semibold text-success text-sm"><i class="fa fa-circle-check"></i> Data synced: ${cloudTotal} items in Firebase, ${localTotal} in local cache.</span>
      </div>
    `;
  }

  els.dataDiagnosticsPanel.innerHTML = html;
}

export function renderFirebaseLogs() {
  if (!els.firebaseLogsPanel) return;
  const logs = getFirebaseLogs();
  if (logs.length === 0) {
    els.firebaseLogsPanel.innerHTML = `<div class="text-xs text-muted p-2">No Firebase operations logged yet. Data is being saved dual-write (Firebase + Local).</div>`;
    return;
  }
  els.firebaseLogsPanel.innerHTML = "";
  let hasPermissionError = false;
  logs.forEach(log => {
    const statusColor = log.status === "ok" ? "text-success" : "text-danger";
    const statusIcon = log.status === "ok" ? "fa-check-circle" : "fa-xmark-circle";
    if (log.detail && log.detail.toLowerCase().includes("permission")) {
      hasPermissionError = true;
    }
    els.firebaseLogsPanel.innerHTML += `
      <div class="flex align-center gap-2 p-1" style="border-bottom: 1px solid var(--card-border);">
        <span class="text-muted" style="min-width: 65px;">${log.time}</span>
        <i class="fa ${statusIcon} ${statusColor}" style="font-size: 10px;"></i>
        <span class="font-semibold text-light">${log.action}</span>
        <span class="text-muted text-xs" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${log.detail}</span>
      </div>
    `;
  });
  const rulesFixPanel = document.getElementById("firestoreRulesFix");
  if (rulesFixPanel) {
    rulesFixPanel.style.display = hasPermissionError ? "block" : "none";
  }
}

export function initSettings() {
  if (els.openAuthModalBtn) {
    els.openAuthModalBtn.addEventListener("click", () => {
      showAuthScreen();
    });
  }

  if (els.syncFirebaseBtn) {
    els.syncFirebaseBtn.addEventListener("click", async () => {
      els.syncFirebaseBtn.disabled = true;
      els.syncFirebaseBtn.innerHTML = '<i class="fa fa-sync fa-spin"></i> Syncing...';

      const synced = await syncLocalDataToFirestore();
      if (synced) {
        showNotification("Data successfully synced with Firebase!", "success");
        await loadInitialData();
      } else {
        showNotification("Sync failed. Check database permissions.", "danger");
      }

      els.syncFirebaseBtn.disabled = false;
      els.syncFirebaseBtn.innerHTML = '<i class="fa fa-sync"></i> Sync Data Now';
    });
  }

  els.settingsExportBackupBtn.addEventListener("click", async () => {
    const data = await exportData();
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(data, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", `apex_trader_backup_${new Date().toISOString().split("T")[0]}.json`);
    dlAnchorElem.click();
    showNotification("Data backup file exported.", "info");
  });

  els.settingsImportBackupFile.addEventListener("change", (e) => {
    const fileReader = new FileReader();
    fileReader.onload = async function (event) {
      try {
        const importedJson = JSON.parse(event.target.result);
        const success = await importData(importedJson);
        if (success) {
          showNotification("Data backup successfully restored!", "success");
          await loadInitialData();
        }
      } catch (err) {
        showNotification("Failed to parse JSON file.", "danger");
      }
    };
    if (e.target.files.length) {
      fileReader.readAsText(e.target.files[0]);
    }
  });

  els.resetAllDataBtn.addEventListener("click", () => {
    if (confirm("WARNING: This will permanently delete all trades, accounts, and journal notes. Proceed?")) {
      localStorage.clear();
      showNotification("All database local caches cleared.", "warning");
      location.reload();
    }
  });

  if (els.refreshFirebaseLogsBtn) {
    els.refreshFirebaseLogsBtn.addEventListener("click", () => renderFirebaseLogs());
  }
  if (els.clearFirebaseLogsBtn) {
    els.clearFirebaseLogsBtn.addEventListener("click", () => {
      clearFirebaseLogs();
      renderFirebaseLogs();
    });
  }

  if (els.pushToFirebaseBtn) {
    els.pushToFirebaseBtn.addEventListener("click", async () => {
      els.pushToFirebaseBtn.disabled = true;
      els.pushToFirebaseBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Pushing...';
      const result = await pushLocalToFirebase();
      if (result.ok) {
        showNotification(`Pushed ${result.count} items to Firebase successfully!`, "success");
      } else {
        showNotification(`Push completed with ${result.errors.length} errors. Check logs.`, "warning");
      }
      els.pushToFirebaseBtn.disabled = false;
      els.pushToFirebaseBtn.innerHTML = '<i class="fa fa-cloud-arrow-up"></i> Push Local → Firebase';
      renderFirebaseLogs();
    });
  }
  if (els.pullFromFirebaseBtn) {
    els.pullFromFirebaseBtn.addEventListener("click", async () => {
      els.pullFromFirebaseBtn.disabled = true;
      els.pullFromFirebaseBtn.innerHTML = '<i class="fa fa-spinner fa-spin"></i> Pulling...';
      const result = await pullFirebaseToLocal();
      if (result.ok) {
        showNotification(`Pulled and merged ${result.count} items from Firebase!`, "success");
        await loadInitialData();
      } else {
        showNotification(`Pull completed with ${result.errors.length} errors. Check logs.`, "warning");
      }
      els.pullFromFirebaseBtn.disabled = false;
      els.pullFromFirebaseBtn.innerHTML = '<i class="fa fa-cloud-arrow-down"></i> Pull Firebase → Local';
      renderFirebaseLogs();
    });
  }
}

import { state, els, showNotification, loadInitialData, getCurrencySymbol } from './core.js';
import { saveAccount, deleteAccount, archiveAccount } from '../storage.js';
import { openModal, closeModal } from './modals.js';

export function renderAccountsPage() {
  const activeAccounts = state.accounts.filter(a => !a.archived);
  const archivedAccounts = state.accounts.filter(a => a.archived);

  els.accountsGrid.innerHTML = "";
  if (activeAccounts.length === 0) {
    els.accountsGrid.innerHTML = `<div class="col-span-2 text-center text-muted p-4">No active accounts. Create one or restore from archive.</div>`;
  }

  activeAccounts.forEach(acc => {
    const accTrades = state.allTrades.filter(t => t.accountId === acc.id);
    const tradesPnl = accTrades.reduce((sum, t) => sum + t.pnl, 0);

    let netTx = 0;
    if (acc.transactions) {
      acc.transactions.forEach(t => {
        if (t.type === "deposit") netTx += t.amount;
        else netTx -= t.amount;
      });
    }

    const currentBal = acc.balance + netTx + tradesPnl;
    const growth = acc.balance ? (tradesPnl / acc.balance) * 100 : 0;
    const valClass = currentBal >= 0 ? "text-success" : "text-danger";
    const sym = getCurrencySymbol(acc.currency);

    els.accountsGrid.innerHTML += `
      <div class="card-premium">
        <div class="flex justify-between align-center mb-3">
          <div>
            <h4 class="text-lg font-bold">${acc.name}</h4>
            <span class="badge ${growth >= 0 ? 'badge-win' : 'badge-loss'}">${acc.type}</span>
          </div>
          <div class="flex gap-1">
            <button class="btn btn-sm btn-icon btn-secondary" onclick="archiveAccountTrigger('${acc.id}', true)" title="Archive Account">
              <i class="fa fa-box-archive"></i>
            </button>
            <button class="btn btn-sm btn-icon btn-secondary text-danger" onclick="deleteAccountTrigger('${acc.id}')" title="Delete Account">
              <i class="fa fa-trash-can"></i>
            </button>
          </div>
        </div>
        <div class="mb-4">
          <span class="text-xs text-muted">CURRENT BALANCE</span>
          <h2 class="text-xl font-extrabold ${valClass}">${sym}${currentBal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</h2>
          <span class="text-xs text-light">${growth >= 0 ? '+' : ''}${growth.toFixed(2)}% net performance</span>
        </div>
        <div class="flex gap-2">
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="openBalanceAdjustment('${acc.id}', 'deposit')">
            <i class="fa fa-plus"></i> Deposit
          </button>
          <button class="btn btn-secondary btn-sm" style="flex:1;" onclick="openBalanceAdjustment('${acc.id}', 'withdrawal')">
            <i class="fa fa-minus"></i> Withdraw
          </button>
        </div>
      </div>
    `;
  });

  const archivedSection = document.getElementById("archivedAccountsSection");
  const archivedGrid = document.getElementById("archivedAccountsGrid");
  if (archivedSection && archivedGrid) {
    if (archivedAccounts.length > 0 && state.showArchived) {
      archivedSection.style.display = "block";
      archivedGrid.innerHTML = "";
      archivedAccounts.forEach(acc => {
        archivedGrid.innerHTML += `
          <div class="card-premium" style="opacity: 0.7;">
            <div class="flex justify-between align-center mb-2">
              <div>
                <h4 class="text-sm font-bold">${acc.name}</h4>
                <span class="badge badge-breakeven text-xs">${acc.type}</span>
                <span class="badge badge-loss text-xs ml-1">Archived</span>
              </div>
              <div class="flex gap-1">
                <button class="btn btn-sm btn-icon btn-secondary" onclick="archiveAccountTrigger('${acc.id}', false)" title="Restore">
                  <i class="fa fa-rotate-left"></i>
                </button>
                <button class="btn btn-sm btn-icon btn-secondary text-danger" onclick="deleteAccountTrigger('${acc.id}')" title="Delete">
                  <i class="fa fa-trash-can"></i>
                </button>
              </div>
            </div>
            <span class="text-xs text-muted">Balance: ${getCurrencySymbol(acc.currency)}${acc.balance.toLocaleString()}</span>
          </div>
        `;
      });
    } else {
      archivedSection.style.display = archivedAccounts.length > 0 ? "block" : "none";
      if (archivedAccounts.length > 0) {
        archivedGrid.innerHTML = `<span class="text-xs text-muted">${archivedAccounts.length} archived account(s). Click "Show Archived" to view.</span>`;
      }
    }
  }

  els.transactionsTable.innerHTML = "";
  let transFound = false;
  state.accounts.forEach(acc => {
    if (acc.transactions) {
      acc.transactions.forEach(tx => {
        transFound = true;
        els.transactionsTable.innerHTML += `
          <tr>
            <td>${tx.date}</td>
            <td><strong>${acc.name}</strong></td>
            <td><span class="badge ${tx.type === 'deposit' ? 'badge-win' : 'badge-loss'}">${tx.type.toUpperCase()}</span></td>
            <td class="${tx.type === 'deposit' ? 'text-success' : 'text-danger'} font-bold">
              ${tx.type === 'deposit' ? '+' : '-'}$${tx.amount.toFixed(2)}
            </td>
            <td>${tx.note || '-'}</td>
          </tr>
        `;
      });
    }
  });

  if (!transFound) {
    els.transactionsTable.innerHTML = `<tr><td colspan="5" class="text-center text-muted">No funding adjustments logged yet.</td></tr>`;
  }
}

window.deleteAccountTrigger = async function(accountId) {
  if (state.accounts.length <= 1) {
    showNotification("You must maintain at least one trading account.", "warning");
    return;
  }
  if (confirm("WARNING: Deleting this account will permanently delete all of its associated trades and funding transactions. Proceed?")) {
    await deleteAccount(accountId);
    showNotification("Account deleted successfully.", "warning");
    await loadInitialData();
  }
};

window.archiveAccountTrigger = async function(accountId, archived) {
  await archiveAccount(accountId, archived);
  showNotification(archived ? "Account archived. It won't appear in main views." : "Account restored to active.", "success");
  await loadInitialData();
};

window.toggleArchivedView = function() {
  state.showArchived = !state.showArchived;
  const btn = document.getElementById("toggleArchivedBtn");
  if (btn) {
    btn.innerHTML = state.showArchived
      ? '<i class="fa fa-eye-slash"></i> Hide Archived'
      : '<i class="fa fa-eye"></i> Show Archived';
  }
  renderAccountsPage();
};

window.openBalanceAdjustment = function(accountId, type) {
  els.txAccount.value = accountId;
  els.txType.value = type;
  els.txAmount.value = "";
  els.txNote.value = "";
  els.txAmount.focus();
};

export function initAccounts() {
  els.openAddAccountModalBtn.addEventListener("click", () => {
    els.editAccountId.value = "";
    els.accountForm.reset();
    els.accountForm.querySelector("button[type='submit']").innerText = "Create Account";
    openModal("accountModal");
  });

  els.accountForm.addEventListener("submit", async () => {
    const accId = els.editAccountId.value || null;
    const newAcc = {
      id: accId,
      name: els.accName.value,
      type: els.accType.value,
      balance: parseFloat(els.accBalance.value),
      currency: els.accCurrency.value
    };

    const saved = await saveAccount(newAcc);
    showNotification(`Account ${accId ? 'updated' : 'created'} successfully!`, "success");
    closeModal("accountModal");

    await loadInitialData();
  });

  els.transactionForm.addEventListener("submit", async () => {
    const accId = els.txAccount.value;
    const type = els.txType.value;
    const amount = parseFloat(els.txAmount.value);
    const note = els.txNote.value;

    const accountIndex = state.accounts.findIndex(a => a.id === accId);
    if (accountIndex >= 0) {
      const acc = state.accounts[accountIndex];
      if (!acc.transactions) acc.transactions = [];

      acc.transactions.push({
        date: new Date().toISOString().split("T")[0],
        type,
        amount,
        note
      });

      await saveAccount(acc);
      showNotification(`Posted ${type} of $${amount.toFixed(2)} successfully!`, "success");
      els.transactionForm.reset();
      await loadInitialData();
    }
  });
}

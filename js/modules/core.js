import {
  auth,
  isFirebaseEnabled,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
  sendPasswordResetEmail,
  sendEmailVerification,
  GoogleAuthProvider,
  signInWithPopup
} from "../firebase.js";

import {
  getAccounts,
  saveAccount,
  deleteAccount,
  archiveAccount,
  getTrades,
  saveTrade,
  deleteTrade,
  getNotes,
  saveNote,
  deleteNote,
  getGoals,
  saveGoal,
  deleteGoal,
  getChecklist,
  saveChecklist,
  exportData,
  importData,
  syncLocalDataToFirestore,
  getFirebaseLogs,
  clearFirebaseLogs,
  pushLocalToFirebase,
  pullFirebaseToLocal,
  migrateToUserScopedStorage,
  clearUserScopedStorage,
  getBacktests,
  saveBacktest,
  deleteBacktest
} from "../storage.js";

import {
  renderEquityCurve,
  renderDailyPnL,
  renderWeeklyPnL,
  renderMonthlyPnL,
  renderWinLossPie,
  renderStrategyPerformance,
  renderPnLDistribution,
  renderDrawdownCurve,
  renderPortfolioAllocation,
  renderHourlyPnL,
  renderDayOfWeekPnL,
  renderPsychologyScore,
  drawMonteCarloSimulation,
  renderBtWinLossPie,
  renderBtStrategyPerformance
} from "../chart.js";

import {
  renderCalendar
} from "../calendar.js";

// --- GLOBAL APPLICATION STATE ---
export let state = {
  user: null,
  isLocalMode: false,
  accounts: [],
  activeAccountId: "all",
  trades: [],      // Filtered trades for active account
  allTrades: [],   // Unfiltered trades for all accounts
  notes: [],
  goals: [],
  checklist: [],
  currentTab: "dashboardPage",
  activeTradeType: "Buy",
  dateFrom: "",
  dateTo: "",
  showArchived: false
};

// --- CURRENCY SYMBOL MAPPING ---
export const currencySymbols = {
  "USD": "$",
  "EUR": "€",
  "GBP": "£",
  "INR": "₹"
};

export function getCurrencySymbol(currency) {
  return currencySymbols[currency] || "$";
}

export function getAccountCurrency(accountId) {
  const acc = state.accounts.find(a => a.id === accountId);
  return acc ? (acc.currency || "USD") : "USD";
}

// --- SAFE DOM HELPER ---
function $(id) { return document.getElementById(id); }
function $tbody(id) { const el = $(id); return el ? el.querySelector("tbody") : null; }

// --- DOM ELEMENTS REFERENCE ---
export const els = {
  authOverlay: document.getElementById("authOverlay"),
  authForm: document.getElementById("authForm"),
  authTitle: document.getElementById("authTitle"),
  authSubtitle: document.getElementById("authSubtitle"),
  authSubmitBtn: document.getElementById("authSubmitBtn"),
  authSwitchBtn: document.getElementById("authSwitchBtn"),
  authSwitchText: document.getElementById("authSwitchText"),
  nameGroup: document.getElementById("nameGroup"),
  authName: document.getElementById("authName"),
  authEmail: document.getElementById("authEmail"),
  authPassword: document.getElementById("authPassword"),
  authRemember: document.getElementById("authRemember"),
  forgotPasswordBtn: document.getElementById("forgotPasswordBtn"),
  
  emailVerifyOverlay: document.getElementById("emailVerifyOverlay"),
  verifyEmailDisplay: document.getElementById("verifyEmailDisplay"),
  resendVerifyBtn: document.getElementById("resendVerifyBtn"),
  checkVerifyBtn: document.getElementById("checkVerifyBtn"),
  logoutFromVerifyBtn: document.getElementById("logoutFromVerifyBtn"),
  verifyStatusMsg: document.getElementById("verifyStatusMsg"),
  
  appMain: document.getElementById("appMain"),
  headerTitle: document.getElementById("headerTitle"),
  globalAccountSelector: document.getElementById("globalAccountSelector"),
  headerQuickAddBtn: document.getElementById("headerQuickAddBtn"),
  logoutBtn: document.getElementById("logoutBtn"),
  avatarInitial: document.getElementById("avatarInitial"),
  profileName: document.getElementById("profileName"),
  profileEmail: document.getElementById("profileEmail"),
  
  // Dashboard elements
  statTodayPnL: document.getElementById("statTodayPnL"),
  statTodayTrend: document.getElementById("statTodayTrend"),
  statTotalPnL: document.getElementById("statTotalPnL"),
  statTotalTrend: document.getElementById("statTotalTrend"),
  statBalance: document.getElementById("statBalance"),
  statGrowthTrend: document.getElementById("statGrowthTrend"),
  statWinRate: document.getElementById("statWinRate"),
  statWinLossRatio: document.getElementById("statWinLossRatio"),
  statTotalTrades: document.getElementById("statTotalTrades"),
  statBreakEvenCount: document.getElementById("statBreakEvenCount"),
  statRiskReward: document.getElementById("statRiskReward"),
  statAvgRMultiple: document.getElementById("statAvgRMultiple"),
  statBestTrade: document.getElementById("statBestTrade"),
  statBestTradeAsset: document.getElementById("statBestTradeAsset"),
  statWorstTrade: document.getElementById("statWorstTrade"),
  statWorstTradeAsset: document.getElementById("statWorstTradeAsset"),
  
  // Added stats metrics
  statProfitFactor: document.getElementById("statProfitFactor"),
  statMaxDrawdown: document.getElementById("statMaxDrawdown"),
  statStreak: document.getElementById("statStreak"),
  statRoi: document.getElementById("statRoi"),
  
  // News Calendar and Clocks
  econCalendarList: document.getElementById("econCalendarList"),
  headerLiveTime: document.getElementById("headerLiveTime"),
  badgeSydney: document.getElementById("badgeSydney"),
  badgeTokyo: document.getElementById("badgeTokyo"),
  badgeLondon: document.getElementById("badgeLondon"),
  badgeNewYork: document.getElementById("badgeNewYork"),
  dashAiCoachMessage: document.getElementById("dashAiCoachMessage"),
  
  dashTradesTable: $tbody("dashTradesTable"),
  dashHeatmap: document.getElementById("dashHeatmap"),
  dashChecklist: document.getElementById("dashChecklist"),
  dashGoals: document.getElementById("dashGoals"),
  dashViewAllTradesBtn: document.getElementById("dashViewAllTradesBtn"),
  
  // Accounts page elements
  accountsGrid: document.getElementById("accountsGrid"),
  txAccount: document.getElementById("txAccount"),
  txType: document.getElementById("txType"),
  txAmount: document.getElementById("txAmount"),
  txNote: document.getElementById("txNote"),
  transactionForm: document.getElementById("transactionForm"),
  transactionsTable: $tbody("transactionsTable"),
  openAddAccountModalBtn: document.getElementById("openAddAccountModalBtn"),
  
  // Journal Entry Form elements
  tradeFormTitle: document.getElementById("tradeFormTitle"),
  tradeForm: document.getElementById("tradeForm"),
  editTradeId: document.getElementById("editTradeId"),
  tradeAccount: document.getElementById("tradeAccount"),
  tradeAsset: document.getElementById("tradeAsset"),
  tradeType: document.getElementById("tradeType"),
  typeBuy: document.getElementById("typeBuy"),
  typeSell: document.getElementById("typeSell"),
  tradeEntryPrice: document.getElementById("tradeEntryPrice"),
  tradeExitPrice: document.getElementById("tradeExitPrice"),
  tradeQuantity: document.getElementById("tradeQuantity"),
  tradeCommission: document.getElementById("tradeCommission"),
  tradeDate: document.getElementById("tradeDate"),
  tradeStrategy: document.getElementById("tradeStrategy"),
  tradeSetup: document.getElementById("tradeSetup"),
  strategyInput: document.getElementById("strategyInput"),
  setupInput: document.getElementById("setupInput"),
  addStrategyBtn: document.getElementById("addStrategyBtn"),
  addSetupBtn: document.getElementById("addSetupBtn"),
  savedStrategies: document.getElementById("savedStrategies"),
  savedSetups: document.getElementById("savedSetups"),
  tradeTimeframe: document.getElementById("tradeTimeframe"),
  tradeEmotionBefore: document.getElementById("tradeEmotionBefore"),
  tradeEmotionAfter: document.getElementById("tradeEmotionAfter"),
  tradeConfidence: document.getElementById("tradeConfidence"),
  tradeDiscipline: document.getElementById("tradeDiscipline"),
  tradeNotes: document.getElementById("tradeNotes"),
  tradeLessons: document.getElementById("tradeLessons"),
  tradeScreenshot: document.getElementById("tradeScreenshot"),
  dropZone: document.getElementById("dropZone"),
  screenshotPreviewWrapper: document.getElementById("screenshotPreviewWrapper"),
  screenshotPreview: document.getElementById("screenshotPreview"),
  removeScreenshotBtn: document.getElementById("removeScreenshotBtn"),
  saveTradeSubmitBtn: document.getElementById("saveTradeSubmitBtn"),
  resetTradeFormBtn: document.getElementById("resetTradeFormBtn"),
  entryChecklist: document.getElementById("entryChecklist"),
  
  // Position Calculator elements
  calcBalance: document.getElementById("calcBalance"),
  calcRisk: document.getElementById("calcRisk"),
  calcStopLoss: document.getElementById("calcStopLoss"),
  calcPipVal: document.getElementById("calcPipVal"),
  calcRiskAmount: document.getElementById("calcRiskAmount"),
  calcPositionSize: document.getElementById("calcPositionSize"),
  
  // Trade History elements
  filterSearch: document.getElementById("filterSearch"),
  filterAccount: document.getElementById("filterAccount"),
  filterResult: document.getElementById("filterResult"),
  filterStrategy: document.getElementById("filterStrategy"),
  filterTimeframe: document.getElementById("filterTimeframe"),
  viewModeTable: document.getElementById("viewModeTable"),
  viewModeCard: document.getElementById("viewModeCard"),
  historyTableView: document.getElementById("historyTableView"),
  historyCardView: document.getElementById("historyCardView"),
  historyTable: $tbody("historyTable"),
  
  // Analytics Reports elements
  reportProfitFactor: document.getElementById("reportProfitFactor"),
  reportAvgWinLoss: document.getElementById("reportAvgWinLoss"),
  reportAvgWinLossRatio: document.getElementById("reportAvgWinLossRatio"),
  reportMaxDrawdown: document.getElementById("reportMaxDrawdown"),
  reportStreaks: document.getElementById("reportStreaks"),
  reportBestDay: document.getElementById("reportBestDay"),
  reportBestDayAmount: document.getElementById("reportBestDayAmount"),
  reportWorstDay: document.getElementById("reportWorstDay"),
  reportWorstDayAmount: document.getElementById("reportWorstDayAmount"),
  reportBestStrategy: document.getElementById("reportBestStrategy"),
  reportBestStrategyAmount: document.getElementById("reportBestStrategyAmount"),
  exportCsvBtn: document.getElementById("exportCsvBtn"),
  exportPdfBtn: document.getElementById("exportPdfBtn"),
  
  // Notes / Daily Log elements
  noteFormTitle: document.getElementById("noteFormTitle"),
  noteForm: document.getElementById("noteForm"),
  editNoteId: document.getElementById("editNoteId"),
  noteDate: document.getElementById("noteDate"),
  noteTitle: document.getElementById("noteTitle"),
  noteCategory: document.getElementById("noteCategory"),
  noteContent: document.getElementById("noteContent"),
  noteTags: document.getElementById("noteTags"),
  clearNoteFormBtn: document.getElementById("clearNoteFormBtn"),
  searchNotes: document.getElementById("searchNotes"),
  filterNotesCategory: document.getElementById("filterNotesCategory"),
  notesTimeline: document.getElementById("notesTimeline"),
  
  // Settings page elements
  profileForm: document.getElementById("profileForm"),
  profileInputName: document.getElementById("profileInputName"),
  profileInputEmail: document.getElementById("profileInputEmail"),
  connectionModeText: document.getElementById("connectionModeText"),
  firebaseConnectionBadge: document.getElementById("firebaseConnectionBadge"),
  openAuthModalBtn: document.getElementById("openAuthModalBtn"),
  syncFirebaseBtn: document.getElementById("syncFirebaseBtn"),
  settingsExportBackupBtn: document.getElementById("settingsExportBackupBtn"),
  settingsImportBackupFile: document.getElementById("settingsImportBackupFile"),
  resetAllDataBtn: document.getElementById("resetAllDataBtn"),
  
  // Modals overlays
  accountModal: document.getElementById("accountModal"),
  accountForm: document.getElementById("accountForm"),
  editAccountId: document.getElementById("editAccountId"),
  accName: document.getElementById("accName"),
  accType: document.getElementById("accType"),
  accBalance: document.getElementById("accBalance"),
  accCurrency: document.getElementById("accCurrency"),
  
  tradeDetailsModal: document.getElementById("tradeDetailsModal"),
  detailHeaderTitle: document.getElementById("detailHeaderTitle"),
  detailResultBadge: document.getElementById("detailResultBadge"),
  detailPnl: document.getElementById("detailPnl"),
  detailRMultiple: document.getElementById("detailRMultiple"),
  detailAccount: document.getElementById("detailAccount"),
  detailDirection: document.getElementById("detailDirection"),
  detailAsset: document.getElementById("detailAsset"),
  detailQuantity: document.getElementById("detailQuantity"),
  detailEntryPrice: document.getElementById("detailEntryPrice"),
  detailExitPrice: document.getElementById("detailExitPrice"),
  detailFees: document.getElementById("detailFees"),
  detailStrategy: document.getElementById("detailStrategy"),
  detailSetup: document.getElementById("detailSetup"),
  detailTimeframe: document.getElementById("detailTimeframe"),
  detailEmotionBefore: document.getElementById("detailEmotionBefore"),
  detailEmotionAfter: document.getElementById("detailEmotionAfter"),
  detailRatings: document.getElementById("detailRatings"),
  detailNotes: document.getElementById("detailNotes"),
  detailMistakes: document.getElementById("detailMistakes"),
  detailLessons: document.getElementById("detailLessons"),
  detailScreenshotSection: document.getElementById("detailScreenshotSection"),
  detailScreenshotImg: document.getElementById("detailScreenshotImg"),
  detailEditBtn: document.getElementById("detailEditBtn"),
  detailDeleteBtn: document.getElementById("detailDeleteBtn"),
  
  calendarDayModal: document.getElementById("calendarDayModal"),
  calendarDayModalTitle: document.getElementById("calendarDayModalTitle"),
  calendarDayTable: $tbody("calendarDayTable"),
  
  // AI Coach elements
  aiInsightsPanel: document.getElementById("aiInsightsPanel"),
  aiChatBox: document.getElementById("aiChatBox"),
  aiChatForm: document.getElementById("aiChatForm"),
  aiChatInput: document.getElementById("aiChatInput"),
  aiChatSendBtn: document.getElementById("aiChatSendBtn"),
  
  // Psychology Hub elements
  psyConsistency: document.getElementById("psyConsistency"),
  psyDiscipline: document.getElementById("psyDiscipline"),
  psyMistakes: document.getElementById("psyMistakes"),
  psyPeak: document.getElementById("psyPeak"),
  psyBreachCount: document.getElementById("psyBreachCount"),
  psyEmotionTable: $tbody("psyEmotionTable"),
  psyBreachesLog: document.getElementById("psyBreachesLog"),
  psyLessonsList: document.getElementById("psyLessonsList"),
  
  // Floating AI Coach elements
  floatingAiPanel: document.getElementById("floatingAiPanel"),
  floatingAiInput: document.getElementById("floatingAiInput"),
  floatingAiForm: document.getElementById("floatingAiForm"),
  closeFloatingAiBtn: document.getElementById("closeFloatingAiBtn"),
  floatingTriggerBubble: document.getElementById("floatingTriggerBubble"),
  
  // Extra elements
  googleLoginBtn: document.getElementById("googleLoginBtn"),
  themeSelectorContainer: document.getElementById("themeSelectorContainer"),
  runMonteCarloBtn: document.getElementById("runMonteCarloBtn"),
  
  notificationBanner: document.getElementById("notificationBanner"),
  notificationIcon: document.getElementById("notificationIcon"),
  notificationMessage: document.getElementById("notificationMessage"),
  dataDiagnosticsPanel: document.getElementById("dataDiagnosticsPanel"),
  dateFilterFrom: document.getElementById("dateFilterFrom"),
  dateFilterTo: document.getElementById("dateFilterTo"),
  clearDateFilter: document.getElementById("clearDateFilter"),
  liveSaveIndicator: document.getElementById("liveSaveIndicator"),
  firebaseLogsPanel: document.getElementById("firebaseLogsPanel"),
  refreshFirebaseLogsBtn: document.getElementById("refreshFirebaseLogsBtn"),
  clearFirebaseLogsBtn: document.getElementById("clearFirebaseLogsBtn"),
  pushToFirebaseBtn: document.getElementById("pushToFirebaseBtn"),
  pullFromFirebaseBtn: document.getElementById("pullFromFirebaseBtn"),

  // Backtest Journal elements
  backtestForm: document.getElementById("backtestForm"),
  btFormTitle: document.getElementById("btFormTitle"),
  btEditId: document.getElementById("btEditId"),
  btAsset: document.getElementById("btAsset"),
  btType: document.getElementById("btType"),
  btTypeBuy: document.getElementById("btTypeBuy"),
  btTypeSell: document.getElementById("btTypeSell"),
  btEntryPrice: document.getElementById("btEntryPrice"),
  btExitPrice: document.getElementById("btExitPrice"),
  btStopLoss: document.getElementById("btStopLoss"),
  btTakeProfit: document.getElementById("btTakeProfit"),
  btQuantity: document.getElementById("btQuantity"),
  btStrategy: document.getElementById("btStrategy"),
  btTimeframe: document.getElementById("btTimeframe"),
  btResult: document.getElementById("btResult"),
  btRMultiple: document.getElementById("btRMultiple"),
  btNotes: document.getElementById("btNotes"),
  btScreenshot: document.getElementById("btScreenshot"),
  btDropZone: document.getElementById("btDropZone"),
  btScreenshotPreviewWrapper: document.getElementById("btScreenshotPreviewWrapper"),
  btScreenshotPreview: document.getElementById("btScreenshotPreview"),
  btRemoveScreenshotBtn: document.getElementById("btRemoveScreenshotBtn"),
  btSaveBtn: document.getElementById("btSaveBtn"),
  resetBtFormBtn: document.getElementById("resetBtFormBtn"),
  btSearchInput: document.getElementById("btSearchInput"),
  btFilterResult: document.getElementById("btFilterResult"),
  btHistoryBody: document.getElementById("btHistoryBody"),
  btStatTotal: document.getElementById("btStatTotal"),
  btStatWinRate: document.getElementById("btStatWinRate"),
  btStatAvgR: document.getElementById("btStatAvgR"),
  btStatPF: document.getElementById("btStatPF")
};

// --- APP NOTIFICATIONS HELPER ---
let notificationTimeout;
export function showNotification(message, type = "info") {
  const banner = els.notificationBanner;
  const icon = els.notificationIcon;
  const msg = els.notificationMessage;

  msg.innerText = message;
  
  // Set class based on type
  banner.className = `notification-banner active ${type}`;
  
  // Set icon based on type
  if (type === "success") {
    icon.className = "fa-solid fa-circle-check text-success";
    flashSaveIndicator();
  } else if (type === "danger") {
    icon.className = "fa-solid fa-circle-xmark text-danger";
  } else if (type === "warning") {
    icon.className = "fa-solid fa-triangle-exclamation text-warning";
  } else {
    icon.className = "fa-solid fa-circle-info text-accent";
  }

  clearTimeout(notificationTimeout);
  notificationTimeout = setTimeout(() => {
    banner.classList.remove("active");
  }, 4000);
}

export function flashSaveIndicator() {
  if (!els.liveSaveIndicator) return;
  els.liveSaveIndicator.style.background = "rgba(16,185,129,0.3)";
  els.liveSaveIndicator.style.boxShadow = "0 0 12px rgba(16,185,129,0.4)";
  setTimeout(() => {
    els.liveSaveIndicator.style.background = "rgba(16,185,129,0.1)";
    els.liveSaveIndicator.style.boxShadow = "none";
  }, 800);
}

// --- EXPORT TO CSV ENGINE ---
export function exportTradesCsv() {
  if (state.trades.length === 0) {
    showNotification("No trades to export.", "warning");
    return;
  }

  const csvRows = [
    ["Date", "Time", "Asset", "Type", "Entry Price", "Exit Price", "Quantity", "Stop Loss", "Take Profit", "Commission", "Swap", "PnL", "R-Multiple", "Result", "Strategy", "Setup", "Market Condition", "Timeframe", "Emotion Before", "Emotion After", "Confidence", "Discipline", "Notes", "Lessons", "Mistakes"]
  ];

  state.trades.forEach(t => {
    csvRows.push([
      t.date,
      t.time || "",
      t.asset,
      t.type,
      t.entryPrice,
      t.exitPrice,
      t.quantity,
      t.stopLoss || "",
      t.takeProfit || "",
      t.commission || 0,
      t.swap || 0,
      t.pnl,
      t.rMultiple || "",
      t.result,
      t.strategy || "",
      t.setup || "",
      t.marketCondition || "",
      t.timeframe || "",
      t.emotionBefore || "",
      t.emotionAfter || "",
      t.confidence || "",
      t.discipline || "",
      `"${(t.notes || "").replace(/"/g, '""')}"`,
      `"${(t.lessons || "").replace(/"/g, '""')}"`,
      `"${(t.mistakes || []).join(',')}"`
    ]);
  });

  const csvContent = "data:text/csv;charset=utf-8," + csvRows.map(e => e.join(",")).join("\n");
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `trading_journal_export_${new Date().toISOString().split("T")[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showNotification("CSV export download started.", "success");
}

// --- POPULATE DROPDOWN SELECTORS ---
export function populateSelectors() {
  // Clear selectors
  els.globalAccountSelector.innerHTML = '<option value="all">Combined (All Accounts)</option>';
  els.tradeAccount.innerHTML = '';
  els.txAccount.innerHTML = '';
  els.filterAccount.innerHTML = '<option value="all">All Accounts</option>';

  const activeAccounts = state.accounts.filter(a => !a.archived);

  activeAccounts.forEach(acc => {
    const opt = `<option value="${acc.id}">${acc.name} (${acc.currency || 'USD'})</option>`;
    els.globalAccountSelector.innerHTML += opt;
    els.tradeAccount.innerHTML += opt;
    els.txAccount.innerHTML += opt;
    els.filterAccount.innerHTML += opt;
  });

  // Restore selector state
  els.globalAccountSelector.value = state.activeAccountId;
}

// --- FILTER DATA AND REFRESH ---
// NOTE: This function calls render* functions that must be provided by the importing module.
// Set core.refreshCallbacks before calling this function.
export const refreshCallbacks = {
  renderDashboard: null,
  renderAccountsPage: null,
  renderHistoryPage: null,
  renderNotesTimeline: null,
  renderChecklistSection: null,
  renderGoalsSection: null,
  renderDashboardCharts: null,
  renderDashboardWidgets: null,
  renderAnalyticsReports: null,
  openCalendarDayTrades: null
};

export function filterDataAndRefresh() {
  const accId = state.activeAccountId;
  const archivedIds = new Set(state.accounts.filter(a => a.archived).map(a => a.id));
  
  if (accId === "all") {
    state.trades = state.allTrades.filter(t => !archivedIds.has(t.accountId));
  } else {
    state.trades = state.allTrades.filter(t => t.accountId === accId);
  }

  // Apply date range filter
  if (state.dateFrom) {
    state.trades = state.trades.filter(t => t.date >= state.dateFrom);
  }
  if (state.dateTo) {
    state.trades = state.trades.filter(t => t.date <= state.dateTo);
  }

  // Refresh active pages visual
  const cb = refreshCallbacks;
  if (cb.renderDashboard) cb.renderDashboard();
  if (cb.renderAccountsPage) cb.renderAccountsPage();
  if (cb.renderHistoryPage) cb.renderHistoryPage();
  if (cb.renderNotesTimeline) cb.renderNotesTimeline();
  if (cb.renderChecklistSection) cb.renderChecklistSection();
  if (cb.renderGoalsSection) cb.renderGoalsSection();
  
  if (state.currentTab === "dashboardPage") {
    if (cb.renderDashboardCharts) cb.renderDashboardCharts();
    if (cb.renderDashboardWidgets) cb.renderDashboardWidgets();
  } else if (state.currentTab === "analyticsPage") {
    if (cb.renderAnalyticsReports) cb.renderAnalyticsReports();
  } else if (state.currentTab === "calendarPage") {
    const today = new Date();
    const calCurrency = state.activeAccountId !== "all" ? getAccountCurrency(state.activeAccountId) : (state.accounts[0]?.currency || "USD");
    renderCalendar("calendarContainer", today.getFullYear(), today.getMonth(), state.allTrades, cb.openCalendarDayTrades, calCurrency);
  }
}

// --- THEME MANAGEMENT ---
export const THEMES = {
  navy: { label: "TradingView Navy", cssVars: {} }, // uses :root defaults
  emerald: {
    label: "Emerald Forest",
    cssVars: {
      "--primary": "#10b981", "--primary-hover": "#059669", "--primary-glow": "rgba(16,185,129,0.15)",
      "--bg-dark": "#050f0a", "--bg-card": "#0a1a12", "--bg-card-hover": "#0f2519",
      "--card-border": "rgba(16,185,129,0.08)", "--card-border-hover": "rgba(16,185,129,0.25)",
      "--success": "#34d399", "--success-bg": "rgba(52,211,153,0.08)", "--success-border": "rgba(52,211,153,0.2)",
      "--danger": "#f87171", "--danger-bg": "rgba(248,113,113,0.08)", "--danger-border": "rgba(248,113,113,0.2)",
      "--warning": "#fbbf24", "--warning-bg": "rgba(251,191,36,0.08)", "--warning-border": "rgba(251,191,36,0.2)"
    }
  },
  cyberpunk: {
    label: "Cyberpunk Neon",
    cssVars: {
      "--primary": "#f59e0b", "--primary-hover": "#d97706", "--primary-glow": "rgba(245,158,11,0.15)",
      "--bg-dark": "#0a0800", "--bg-card": "#1a1408", "--bg-card-hover": "#251e0f",
      "--card-border": "rgba(245,158,11,0.08)", "--card-border-hover": "rgba(245,158,11,0.25)",
      "--success": "#34d399", "--success-bg": "rgba(52,211,153,0.08)", "--success-border": "rgba(52,211,153,0.2)",
      "--danger": "#f87171", "--danger-bg": "rgba(248,113,113,0.08)", "--danger-border": "rgba(248,113,113,0.2)",
      "--warning": "#fbbf24", "--warning-bg": "rgba(251,191,36,0.08)", "--warning-border": "rgba(251,191,36,0.2)"
    }
  },
  amethyst: {
    label: "Amethyst Void",
    cssVars: {
      "--primary": "#a855f7", "--primary-hover": "#9333ea", "--primary-glow": "rgba(168,85,247,0.15)",
      "--bg-dark": "#0a060f", "--bg-card": "#150d1e", "--bg-card-hover": "#1e1428",
      "--card-border": "rgba(168,85,247,0.08)", "--card-border-hover": "rgba(168,85,247,0.25)",
      "--success": "#34d399", "--success-bg": "rgba(52,211,153,0.08)", "--success-border": "rgba(52,211,153,0.2)",
      "--danger": "#f87171", "--danger-bg": "rgba(248,113,113,0.08)", "--danger-border": "rgba(248,113,113,0.2)",
      "--warning": "#fbbf24", "--warning-bg": "rgba(251,191,36,0.08)", "--warning-border": "rgba(251,191,36,0.2)"
    }
  }
};

export function initThemes() {
  const saved = localStorage.getItem("tj_theme") || "navy";
  applyTheme(saved);

  const btnMap = {
    navy: document.getElementById("btnThemeNavy"),
    emerald: document.getElementById("btnThemeEmerald"),
    cyberpunk: document.getElementById("btnThemeCyberpunk"),
    amethyst: document.getElementById("btnThemeAmethyst")
  };

  Object.entries(btnMap).forEach(([key, btn]) => {
    if (!btn) return;
    btn.addEventListener("click", () => {
      localStorage.setItem("tj_theme", key);
      applyTheme(key);
      // Update active button
      Object.values(btnMap).forEach(b => b && b.classList.remove("active-theme"));
      btn.classList.add("active-theme");
    });
  });

  // Mark saved theme as active
  Object.values(btnMap).forEach(b => b && b.classList.remove("active-theme"));
  if (btnMap[saved]) btnMap[saved].classList.add("active-theme");
}

export function applyTheme(themeKey) {
  const root = document.documentElement;
  // Reset to defaults first
  root.removeAttribute("data-theme");
  // Remove inline CSS vars
  root.style.cssText = "";

  if (themeKey && THEMES[themeKey] && Object.keys(THEMES[themeKey].cssVars).length > 0) {
    root.setAttribute("data-theme", themeKey);
    // Apply via CSS variables for full control
    Object.entries(THEMES[themeKey].cssVars).forEach(([prop, val]) => {
      root.style.setProperty(prop, val);
    });
  }
}

// --- CORE APP DATA INITIALIZER ---
// NOTE: This function calls switchTab, reloadCustomTags, and render* functions
// that must be provided by the importing module.
// Set core.initCallbacks before calling this function.
export const initCallbacks = {
  switchTab: null,
  reloadCustomTags: null
};

export async function initAppUI() {
  els.appMain.style.display = "flex";
  
  // Display Username and Connection mode details
  const localName = localStorage.getItem(`tj_${state.user ? state.user.uid + '_' : ''}user_name`) || "Guest Trader";
  els.profileInputName.value = localName;

  if (state.user) {
    els.profileName.innerText = state.user.displayName || state.user.email.split("@")[0];
    els.profileEmail.innerText = state.user.email;
    els.avatarInitial.innerText = (state.user.displayName || state.user.email).charAt(0).toUpperCase();
    els.profileInputEmail.value = state.user.email;
    
    if (els.connectionModeText) {
      els.connectionModeText.innerText = "Firebase Cloud Sync Mode";
      els.connectionModeText.className = "font-semibold text-success";
    }
    if (els.firebaseConnectionBadge) {
      els.firebaseConnectionBadge.className = "badge badge-win";
      els.firebaseConnectionBadge.innerText = "Firebase Connected";
    }
    if (els.openAuthModalBtn) els.openAuthModalBtn.style.display = "none";
    if (els.syncFirebaseBtn) els.syncFirebaseBtn.style.display = "inline-block";
  } else {
    els.profileName.innerText = localName;
    els.profileEmail.innerText = "Local Sandbox Mode";
    els.avatarInitial.innerText = localName.charAt(0).toUpperCase();
    els.profileInputEmail.value = "local_sandbox@offline";
    
    if (els.connectionModeText) {
      els.connectionModeText.innerText = "LocalStorage Sandbox Mode";
      els.connectionModeText.className = "font-semibold text-warning";
    }
    if (els.firebaseConnectionBadge) {
      els.firebaseConnectionBadge.className = "badge badge-loss";
      els.firebaseConnectionBadge.innerText = "Firebase Offline";
    }
    if (els.openAuthModalBtn) els.openAuthModalBtn.style.display = "inline-block";
    if (els.syncFirebaseBtn) els.syncFirebaseBtn.style.display = "none";
  }

  // Load database items
  await loadInitialData();
  if (initCallbacks.reloadCustomTags) initCallbacks.reloadCustomTags();
  if (initCallbacks.switchTab) initCallbacks.switchTab("dashboardPage");
  
  // Initialize theme
  initThemes();
}

export async function loadInitialData() {
  state.accounts = await getAccounts();
  state.allTrades = await getTrades("all");
  state.notes = await getNotes();
  state.goals = await getGoals();
  state.checklist = await getChecklist();

  // Populate Dropdown Selectors
  populateSelectors();
  
  // Filter by currently selected account
  filterDataAndRefresh();
}

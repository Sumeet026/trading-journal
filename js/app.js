// ==============================
// APEX TRADER - Main Entry Point
// Modular architecture - each feature in js/modules/
// ==============================
console.log("[ApexTrader] Module loading...");

import { state, els, initAppUI, loadInitialData, filterDataAndRefresh, showNotification, flashSaveIndicator, initThemes, initCallbacks, refreshCallbacks } from "./modules/core.js";
import { initAuth, checkAuthSession } from "./modules/auth.js";
import { setupNavigation, setupMobileSidebar, setupMobileFilterToggle, switchTab, registerPageRenderers } from "./modules/navigation.js";
import { renderDashboard, renderDashboardCharts, renderDashboardWidgets, renderHeatmap, renderEconomicCalendar, renderSessionClocks, updateLiveClock, setupDashboardListeners } from "./modules/dashboard.js";
import { initTradeEntry, initCustomTagSystem, reloadCustomTags, renderChecklistSection, renderGoalsSection } from "./modules/trade-entry.js";
import { initTradeHistory, renderHistoryPage } from "./modules/trade-history.js";
import { initBacktest, renderBacktestPage } from "./modules/backtest.js";
import { initNotes, renderNotesTimeline } from "./modules/notes.js";
import { initAccounts, renderAccountsPage } from "./modules/accounts.js";
import { initSettings, renderDataDiagnostics, renderFirebaseLogs } from "./modules/settings.js";
import { initModals, openTradeDetails, openCalendarDayTrades } from "./modules/modals.js";
import { getAccountCurrency } from "./modules/core.js";
import { renderCalendar } from "./calendar.js";
import { initSessionAnalysis, renderSessionAnalysis, renderDashboardSessionSummary } from "./modules/session-analysis.js";

// --- Register page renderers for navigation ---
registerPageRenderers({
  dashboardPage: () => {
    renderDashboardCharts();
    renderDashboardWidgets();
  },
  sessionPage: () => renderSessionAnalysis(),
  backtestPage: () => renderBacktestPage(),
  calendarPage: () => {
    const today = new Date();
    const calCurrency = state.activeAccountId !== "all" ? getAccountCurrency(state.activeAccountId) : (state.accounts[0]?.currency || "USD");
    renderCalendar("calendarContainer", today.getFullYear(), today.getMonth(), state.allTrades, openCalendarDayTrades, calCurrency);
  },
  settingsPage: () => {
    renderDataDiagnostics();
    renderFirebaseLogs();
  },
  historyPage: () => renderHistoryPage(),
  notesPage: () => renderNotesTimeline(),
  accountsPage: () => renderAccountsPage(),
  entryPage: () => {
    reloadCustomTags();
    renderChecklistSection();
    renderGoalsSection();
  }
});

// Make functions available globally for HTML onclick handlers
// closeModal is defined in modals.js and attached to window

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  try {
    console.log("[ApexTrader] DOMContentLoaded fired. Initializing...");
    // Core navigation
    setupNavigation();
    setupMobileSidebar();
    setupMobileFilterToggle();

    // Initialize all modules
    initAuth();
    initTradeEntry();
    initTradeHistory();
    initBacktest();
    initNotes();
    initAccounts();
    initSettings();
    initModals();
    initSessionAnalysis();
    setupDashboardListeners();

    // Custom tags + auth session
    initCustomTagSystem();

    // Set core callbacks
    initCallbacks.reloadCustomTags = reloadCustomTags;
    initCallbacks.switchTab = switchTab;

    // Set refresh callbacks for filterDataAndRefresh
    refreshCallbacks.renderDashboard = renderDashboard;
    refreshCallbacks.renderAccountsPage = renderAccountsPage;
    refreshCallbacks.renderHistoryPage = renderHistoryPage;
    refreshCallbacks.renderNotesTimeline = renderNotesTimeline;
    refreshCallbacks.renderChecklistSection = renderChecklistSection;
    refreshCallbacks.renderGoalsSection = renderGoalsSection;
    refreshCallbacks.renderDashboardCharts = renderDashboardCharts;
    refreshCallbacks.renderDashboardWidgets = renderDashboardWidgets;
    refreshCallbacks.openCalendarDayTrades = openCalendarDayTrades;

    checkAuthSession();

    // Live clock
    setInterval(updateLiveClock, 1000);
    setInterval(renderSessionClocks, 60000);
    console.log("[ApexTrader] Initialization complete.");
  } catch (err) {
    console.error("[ApexTrader] Initialization error:", err);
  }
});

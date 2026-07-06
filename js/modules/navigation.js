import { state, els, getAccountCurrency } from './core.js';

// Page renderer callbacks - registered via registerPageRenderers
let pageRenderers = {};

export function registerPageRenderers(renderers) {
  pageRenderers = { ...pageRenderers, ...renderers };
}

// Set up Mobile Sidebar Toggle
export function setupMobileSidebar() {
  const sidebarToggle = document.getElementById("sidebarToggle");
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");

  if (sidebarToggle && sidebar && sidebarOverlay) {
    sidebarToggle.addEventListener("click", () => {
      sidebar.classList.toggle("active");
      sidebarOverlay.classList.toggle("active");
      document.body.style.overflow = sidebar.classList.contains("active") ? "hidden" : "";
    });

    sidebarOverlay.addEventListener("click", () => {
      sidebar.classList.remove("active");
      sidebarOverlay.classList.remove("active");
      document.body.style.overflow = "";
    });
  }
}

// Set up Mobile Filter Toggle
export function setupMobileFilterToggle() {
  const filterToggle = document.getElementById("mobileFilterToggle");
  const filtersRow = document.querySelector(".header-filters-row");

  if (filterToggle && filtersRow) {
    filterToggle.addEventListener("click", () => {
      filtersRow.classList.toggle("active");
    });

    // Close filters when clicking outside
    document.addEventListener("click", (e) => {
      if (!filterToggle.contains(e.target) && !filtersRow.contains(e.target)) {
        filtersRow.classList.remove("active");
      }
    });
  }
}

// Set up App Tab Navigation
export function setupNavigation() {
  document.querySelectorAll(".sidebar-item").forEach(item => {
    item.addEventListener("click", (e) => {
      e.preventDefault();
      const targetPageId = item.getAttribute("data-target");
      switchTab(targetPageId);
    });
  });
}

export function switchTab(pageId) {
  state.currentTab = pageId;

  // Close mobile sidebar if open
  const sidebar = document.querySelector(".sidebar");
  const sidebarOverlay = document.getElementById("sidebarOverlay");
  if (sidebar) sidebar.classList.remove("active");
  if (sidebarOverlay) sidebarOverlay.classList.remove("active");
  document.body.style.overflow = "";
  
  // Hide active page
  document.querySelectorAll(".page-container").forEach(page => {
    page.classList.remove("active");
  });
  
  // Show target page
  const targetPage = document.getElementById(pageId);
  if (targetPage) targetPage.classList.add("active");

  // Update sidebar active status
  document.querySelectorAll(".sidebar-item").forEach(item => {
    if (item.getAttribute("data-target") === pageId) {
      item.classList.add("active");
    } else {
      item.classList.remove("active");
    }
  });

  // Update Header Title
  const menuLabels = {
    dashboardPage: "Dashboard",
    accountsPage: "Accounts & Balances",
    entryPage: "Journal Trade Entry",
    historyPage: "Trade History Log",
    backtestPage: "Backtest Journal",
    analyticsPage: "Advanced Analytics Hub",
    aiCoachPage: "AI Trading Coach Hub",
    psychologyPage: "Psychology & Discipline Hub",
    notesPage: "Daily Journal Notes",
    calendarPage: "Trading Calendar",
    settingsPage: "Settings & Appearance"
  };
  els.headerTitle.innerText = menuLabels[pageId] || "Trading Operating System";

  // Re-trigger page renders via registered callbacks
  if (pageRenderers[pageId]) {
    pageRenderers[pageId]();
  }
}

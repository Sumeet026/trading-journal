// Charting engine for the Trading Journal (using Chart.js)

// Shared options for a premium, clean dark theme look
const chartThemeOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: "#94a3b8",
        font: { family: "'Inter', sans-serif", size: 12 }
      }
    },
    tooltip: {
      backgroundColor: "#12161f",
      titleColor: "#f8fafc",
      bodyColor: "#94a3b8",
      borderColor: "#1f2635",
      borderWidth: 1,
      padding: 10,
      cornerRadius: 6,
      displayColors: true,
      callbacks: {
        label: function (context) {
          let label = context.dataset.label || "";
          if (label) label += ": ";
          if (context.parsed.y !== undefined) {
            const val = context.parsed.y;
            label += val >= 0 ? "+$" + val.toFixed(2) : "-$" + Math.abs(val).toFixed(2);
          } else if (context.parsed !== undefined) {
            label += context.parsed;
          }
          return label;
        }
      }
    }
  },
  scales: {
    x: {
      grid: { color: "rgba(255, 255, 255, 0.04)" },
      ticks: {
        color: "#94a3b8",
        font: { family: "'Inter', sans-serif", size: 10 }
      }
    },
    y: {
      grid: { color: "rgba(255, 255, 255, 0.04)" },
      ticks: {
        color: "#94a3b8",
        font: { family: "'Inter', sans-serif", size: 10 },
        callback: function (value) {
          return value >= 0 ? "$" + value : "-$" + Math.abs(value);
        }
      }
    }
  }
};

// Store chart instances to destroy them before re-rendering
const charts = {};

function destroyChartIfExists(canvasId) {
  if (charts[canvasId]) {
    charts[canvasId].destroy();
    delete charts[canvasId];
  }
}

// 1. EQUITY CURVE CHART (Cumulative PnL)
export function renderEquityCurve(canvasId, trades, initialBalance = 0) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Sort trades chronologically for equity curve
  const sortedTrades = [...trades].sort((a, b) => new Date(a.date + "T" + (a.time || "00:00")) - new Date(b.date + "T" + (b.time || "00:00")));
  
  let currentBalance = initialBalance;
  const balanceData = [currentBalance];
  const labels = ["Start"];

  sortedTrades.forEach((t, i) => {
    currentBalance += t.pnl;
    balanceData.push(currentBalance);
    labels.push(`#${i + 1} (${t.asset})`);
  });

  const isProfit = currentBalance >= initialBalance;
  const strokeColor = isProfit ? "#10b981" : "#ef4444";
  const fillColor = isProfit ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)";

  charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Account Balance",
        data: balanceData,
        borderColor: strokeColor,
        backgroundColor: fillColor,
        fill: true,
        borderWidth: 2,
        tension: 0.15,
        pointBackgroundColor: strokeColor,
        pointHoverRadius: 6
      }]
    },
    options: {
      ...chartThemeOptions,
      scales: {
        x: chartThemeOptions.scales.x,
        y: {
          ...chartThemeOptions.scales.y,
          ticks: {
            ...chartThemeOptions.scales.y.ticks,
            callback: value => "$" + value.toLocaleString()
          }
        }
      }
    }
  });
}

// 2. DAILY P&L BAR CHART
export function renderDailyPnL(canvasId, trades) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const dailyPnL = {};
  trades.forEach(t => {
    dailyPnL[t.date] = (dailyPnL[t.date] || 0) + t.pnl;
  });

  // Sort dates
  const sortedDates = Object.keys(dailyPnL).sort((a, b) => new Date(a) - new Date(b));
  // Take last 15 days to avoid clutter, or all if small
  const displayDates = sortedDates.slice(-15);
  const pnlValues = displayDates.map(d => dailyPnL[d]);
  const backgroundColors = pnlValues.map(v => v >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)");
  const borderColors = pnlValues.map(v => v >= 0 ? "#10b981" : "#ef4444");

  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: displayDates.map(d => {
        const parts = d.split("-");
        return parts.length === 3 ? `${parts[1]}/${parts[2]}` : d; // MM/DD
      }),
      datasets: [{
        label: "Daily P&L",
        data: pnlValues,
        backgroundColor: backgroundColors,
        borderColor: borderColors,
        borderWidth: 1,
        borderRadius: 4
      }]
    },
    options: chartThemeOptions
  });
}

// 3. WEEKLY PERFORMANCE CHART
export function renderWeeklyPnL(canvasId, trades) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const weeklyPnL = {};
  trades.forEach(t => {
    const dateObj = new Date(t.date);
    // Simple week identifier (Year - WeekNo)
    const oneJan = new Date(dateObj.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((dateObj - oneJan) / (24 * 60 * 60 * 1000));
    const weekNo = Math.ceil((dateObj.getDay() + 1 + numberOfDays) / 7);
    const key = `${dateObj.getFullYear()}-W${weekNo}`;
    
    weeklyPnL[key] = (weeklyPnL[key] || 0) + t.pnl;
  });

  const sortedWeeks = Object.keys(weeklyPnL).sort();
  const displayWeeks = sortedWeeks.slice(-10); // Last 10 weeks
  const pnlValues = displayWeeks.map(w => weeklyPnL[w]);
  const backgroundColors = pnlValues.map(v => v >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)");

  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: displayWeeks.map(w => w.split("-")[1]), // Show "W12" instead of "2026-W12"
      datasets: [{
        label: "Weekly P&L",
        data: pnlValues,
        backgroundColor: backgroundColors,
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: chartThemeOptions
  });
}

// 4. MONTHLY PERFORMANCE CHART
export function renderMonthlyPnL(canvasId, trades) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthlyPnL = {};

  trades.forEach(t => {
    const parts = t.date.split("-"); // YYYY-MM-DD
    if (parts.length === 3) {
      const monthIdx = parseInt(parts[1]) - 1;
      const key = `${parts[0]}-${months[monthIdx]}`;
      monthlyPnL[key] = (monthlyPnL[key] || 0) + t.pnl;
    }
  });

  const sortedMonths = Object.keys(monthlyPnL).sort((a, b) => {
    const aParts = a.split("-");
    const bParts = b.split("-");
    if (aParts[0] !== bParts[0]) return parseInt(aParts[0]) - parseInt(bParts[0]);
    return months.indexOf(aParts[1]) - months.indexOf(bParts[1]);
  });

  const pnlValues = sortedMonths.map(m => monthlyPnL[m]);
  const backgroundColors = pnlValues.map(v => v >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)");

  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedMonths,
      datasets: [{
        label: "Monthly P&L",
        data: pnlValues,
        backgroundColor: backgroundColors,
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: chartThemeOptions
  });
}

// 5. WIN VS LOSS PIE CHART
export function renderWinLossPie(canvasId, trades) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  let wins = 0;
  let losses = 0;
  let breakeven = 0;

  trades.forEach(t => {
    if (t.result === "Win") wins++;
    else if (t.result === "Loss") losses++;
    else breakeven++;
  });

  charts[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: ["Wins", "Losses", "Break-even"],
      datasets: [{
        data: [wins, losses, breakeven],
        backgroundColor: ["#10b981", "#ef4444", "#eab308"],
        borderColor: "#12161f",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            color: "#94a3b8",
            font: { family: "'Inter', sans-serif", size: 12 }
          }
        },
        tooltip: {
          backgroundColor: "#12161f",
          titleColor: "#f8fafc",
          bodyColor: "#94a3b8",
          borderColor: "#1f2635",
          borderWidth: 1,
          padding: 10,
          cornerRadius: 6,
          callbacks: {
            label: function (context) {
              const total = context.dataset.data.reduce((a, b) => a + b, 0);
              const val = context.parsed;
              const pct = total ? ((val / total) * 100).toFixed(1) : 0;
              return `${context.label}: ${val} (${pct}%)`;
            }
          }
        }
      },
      cutout: "70%"
    }
  });
}

// 6. STRATEGY PERFORMANCE CHART (Horizontal Bar)
export function renderStrategyPerformance(canvasId, trades) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const strategies = {};
  trades.forEach(t => {
    const strat = t.strategy || "No Strategy";
    strategies[strat] = (strategies[strat] || 0) + t.pnl;
  });

  // Sort strategies by absolute performance
  const sortedStrats = Object.keys(strategies).sort((a, b) => strategies[b] - strategies[a]);
  const pnlValues = sortedStrats.map(s => strategies[s]);
  const backgroundColors = pnlValues.map(v => v >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)");

  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: sortedStrats,
      datasets: [{
        label: "PnL by Strategy",
        data: pnlValues,
        backgroundColor: backgroundColors,
        borderRadius: 4
      }]
    },
    options: {
      ...chartThemeOptions,
      indexAxis: "y", // Make it horizontal!
      scales: {
        x: chartThemeOptions.scales.y, // Swapped ticks
        y: chartThemeOptions.scales.x
      }
    }
  });
}

// 7. P&L DISTRIBUTION HISTOGRAM/BAR
export function renderPnLDistribution(canvasId, trades) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const brackets = [
    { label: "< -$200", filter: val => val < -200, count: 0, color: "rgba(239, 68, 68, 0.9)" },
    { label: "-$200 to -$50", filter: val => val >= -200 && val < -50, count: 0, color: "rgba(239, 68, 68, 0.6)" },
    { label: "-$50 to $0", filter: val => val >= -50 && val < 0, count: 0, color: "rgba(239, 68, 68, 0.35)" },
    { label: "$0 to $50", filter: val => val >= 0 && val <= 50, count: 0, color: "rgba(16, 185, 129, 0.35)" },
    { label: "$50 to $200", filter: val => val > 50 && val <= 200, count: 0, color: "rgba(16, 185, 129, 0.6)" },
    { label: "> $200", filter: val => val > 200, count: 0, color: "rgba(16, 185, 129, 0.9)" }
  ];

  trades.forEach(t => {
    for (const b of brackets) {
      if (b.filter(t.pnl)) {
        b.count++;
        break;
      }
    }
  });

  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: brackets.map(b => b.label),
      datasets: [{
        label: "Number of Trades",
        data: brackets.map(b => b.count),
        backgroundColor: brackets.map(b => b.color),
        borderWidth: 0,
        borderRadius: 4
      }]
    },
    options: {
      ...chartThemeOptions,
      scales: {
        x: chartThemeOptions.scales.x,
        y: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: {
            color: "#94a3b8",
            font: { family: "'Inter', sans-serif", size: 10 },
            stepSize: 1
          }
        }
      },
      plugins: {
        ...chartThemeOptions.plugins,
        tooltip: {
          ...chartThemeOptions.plugins.tooltip,
          callbacks: {
            label: function (context) {
              return `${context.parsed.y} trades`;
            }
          }
        }
      }
    }
  });
}

// 8. PORTFOLIO ALLOCATION DOUGHNUT CHART
export function renderPortfolioAllocation(canvasId, accounts) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const allocation = {};
  let totalBalance = 0;
  
  accounts.forEach(a => {
    const type = a.type || "Forex";
    allocation[type] = (allocation[type] || 0) + parseFloat(a.balance);
    totalBalance += parseFloat(a.balance);
  });

  const labels = Object.keys(allocation);
  const data = labels.map(l => allocation[l]);
  
  // Custom vibrant theme colors
  const backgroundColors = ["#6366f1", "#10b981", "#f59e0b", "#06b6d4", "#ec4899", "#8b5cf6"];

  charts[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: data,
        backgroundColor: backgroundColors.slice(0, labels.length),
        borderColor: "#12161f",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "right",
          labels: {
            color: "#94a3b8",
            font: { family: "'Inter', sans-serif", size: 11 }
          }
        },
        tooltip: {
          backgroundColor: "#12161f",
          bodyColor: "#94a3b8",
          borderColor: "#1f2635",
          borderWidth: 1,
          callbacks: {
            label: function (context) {
              const val = context.parsed;
              const pct = totalBalance ? ((val / totalBalance) * 100).toFixed(1) : 0;
              return `${context.label}: $${val.toLocaleString()} (${pct}%)`;
            }
          }
        }
      },
      cutout: "60%"
    }
  });
}

// 9. DRAWDOWN PERCENTAGE CHART
export function renderDrawdownCurve(canvasId, trades, initialBalance = 10000) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const sortedTrades = [...trades].sort((a, b) => new Date(a.date + "T" + (a.time || "00:00")) - new Date(b.date + "T" + (b.time || "00:00")));
  
  let currentBalance = initialBalance;
  let peakBalance = initialBalance;
  const drawdownData = [0];
  const labels = ["Start"];

  sortedTrades.forEach((t, i) => {
    currentBalance += t.pnl;
    if (currentBalance > peakBalance) {
      peakBalance = currentBalance;
    }
    const drawdownPct = peakBalance > 0 ? ((peakBalance - currentBalance) / peakBalance) * 100 : 0;
    drawdownData.push(drawdownPct);
    labels.push(`#${i + 1}`);
  });

  charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: "Drawdown %",
        data: drawdownData,
        borderColor: "#ef4444",
        backgroundColor: "rgba(239, 68, 68, 0.08)",
        fill: true,
        borderWidth: 2,
        tension: 0.15,
        pointBackgroundColor: "#ef4444",
        pointHoverRadius: 6
      }]
    },
    options: {
      ...chartThemeOptions,
      scales: {
        x: chartThemeOptions.scales.x,
        y: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: {
            color: "#94a3b8",
            callback: value => value.toFixed(1) + "%"
          }
        }
      },
      plugins: {
        ...chartThemeOptions.plugins,
        tooltip: {
          ...chartThemeOptions.plugins.tooltip,
          callbacks: {
            label: function (context) {
              return `Drawdown: ${context.parsed.y.toFixed(2)}%`;
            }
          }
        }
      }
    }
  });
}

// 10. HOURLY PROFITABILITY CHART
export function renderHourlyPnL(canvasId, trades) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const hourlyPnL = Array(24).fill(0);
  const hourlyCount = Array(24).fill(0);

  trades.forEach(t => {
    if (t.time) {
      const hour = parseInt(t.time.split(":")[0]);
      if (!isNaN(hour) && hour >= 0 && hour < 24) {
        hourlyPnL[hour] += t.pnl;
        hourlyCount[hour]++;
      }
    }
  });

  // Filter hours that actually have trades to make chart clean
  const labels = [];
  const pnlData = [];
  const counts = [];
  
  for (let h = 0; h < 24; h++) {
    if (hourlyCount[h] > 0) {
      const displayHour = h === 0 ? "12 AM" : h === 12 ? "12 PM" : h > 12 ? `${h - 12} PM` : `${h} AM`;
      labels.push(displayHour);
      pnlData.push(hourlyPnL[h]);
      counts.push(hourlyCount[h]);
    }
  }

  const backgroundColors = pnlData.map(v => v >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)");

  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Net Profit / Loss",
        data: pnlData,
        backgroundColor: backgroundColors,
        borderRadius: 4
      }]
    },
    options: {
      ...chartThemeOptions,
      plugins: {
        ...chartThemeOptions.plugins,
        tooltip: {
          ...chartThemeOptions.plugins.tooltip,
          callbacks: {
            label: function (context) {
              const hourIndex = context.dataIndex;
              const val = context.parsed.y;
              return `Net: ${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)} (${counts[hourIndex]} trades)`;
            }
          }
        }
      }
    }
  });
}

// 11. DAY-OF-WEEK PERFORMANCE CHART
export function renderDayOfWeekPnL(canvasId, trades) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const dayPnL = Array(7).fill(0);
  const dayCount = Array(7).fill(0);

  trades.forEach(t => {
    const dateObj = new Date(t.date + "T00:00:00");
    const dayIndex = dateObj.getDay();
    if (!isNaN(dayIndex)) {
      dayPnL[dayIndex] += t.pnl;
      dayCount[dayIndex]++;
    }
  });

  // Skip Sunday/Saturday if no trades occurred to make dashboard clean
  const displayDays = [];
  const displayPnL = [];
  const displayCount = [];

  for (let i = 0; i < 7; i++) {
    if (dayCount[i] > 0 || (i > 0 && i < 6)) { // Keep weekdays anyway
      displayDays.push(days[i]);
      displayPnL.push(dayPnL[i]);
      displayCount.push(dayCount[i]);
    }
  }

  const backgroundColors = displayPnL.map(v => v >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)");

  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: displayDays,
      datasets: [{
        label: "Profit / Loss",
        data: displayPnL,
        backgroundColor: backgroundColors,
        borderRadius: 4
      }]
    },
    options: {
      ...chartThemeOptions,
      plugins: {
        ...chartThemeOptions.plugins,
        tooltip: {
          ...chartThemeOptions.plugins.tooltip,
          callbacks: {
            label: function (context) {
              const idx = context.dataIndex;
              const val = context.parsed.y;
              return `Net: ${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)} (${displayCount[idx]} trades)`;
            }
          }
        }
      }
    }
  });
}

// 12. PSYCHOLOGICAL RATINGS OVER TIME
export function renderPsychologyScore(canvasId, trades) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const sortedTrades = [...trades].sort((a, b) => new Date(a.date + "T" + (a.time || "00:00")) - new Date(b.date + "T" + (b.time || "00:00")));
  const displayTrades = sortedTrades.slice(-20); // Last 20 trades

  const labels = displayTrades.map((t, idx) => `#${idx+1} (${t.asset})`);
  const disciplineData = displayTrades.map(t => t.discipline || 3);
  const confidenceData = displayTrades.map(t => t.confidence || 3);

  charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Discipline Execution (1-5)",
          data: disciplineData,
          borderColor: "#10b981",
          backgroundColor: "rgba(16, 185, 129, 0.05)",
          borderWidth: 2,
          tension: 0.2,
          pointBackgroundColor: "#10b981"
        },
        {
          label: "Trade Confidence (1-5)",
          data: confidenceData,
          borderColor: "#f59e0b",
          backgroundColor: "rgba(245, 158, 11, 0.05)",
          borderWidth: 2,
          tension: 0.2,
          pointBackgroundColor: "#f59e0b"
        }
      ]
    },
    options: {
      ...chartThemeOptions,
      scales: {
        x: chartThemeOptions.scales.x,
        y: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: {
            color: "#94a3b8",
            stepSize: 1,
            callback: value => value
          },
          min: 1,
          max: 5
        }
      },
      plugins: {
        ...chartThemeOptions.plugins,
        tooltip: {
          ...chartThemeOptions.plugins.tooltip,
          callbacks: {
            label: function (context) {
              return `${context.dataset.label}: ${context.parsed.y}/5`;
            }
          }
        }
      }
    }
  });
}

// 13. MONTE CARLO SIMULATOR (100 PATHS)
export function drawMonteCarloSimulation(canvasId, trades, initialBalance = 10000) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // 1. Gather historical statistics or use defaults
  const wins = trades.filter(t => t.result === "Win");
  const losses = trades.filter(t => t.result === "Loss");
  const total = wins.length + losses.length;

  let winRate = 0.50;
  let avgWin = 150;
  let avgLoss = 100;

  if (total >= 5) {
    winRate = wins.length / total;
    avgWin = wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length;
    avgLoss = losses.length ? losses.reduce((sum, t) => sum + Math.abs(t.pnl), 0) / losses.length : 100;
  }

  // 2. Generate 50 Monte Carlo paths of 30 trades each
  const pathCount = 50;
  const stepCount = 30;
  const datasets = [];

  // Generate a distinct color palette
  const getRandomColor = (idx) => {
    const hue = (idx * 137.5) % 360; // Golden angle spread
    return `hsla(${hue}, 70%, 55%, 0.25)`;
  };

  for (let p = 0; p < pathCount; p++) {
    let balance = initialBalance;
    const pathPoints = [balance];

    for (let s = 1; s <= stepCount; s++) {
      if (Math.random() < winRate) {
        // Add random win around avgWin (with 25% uniform variance)
        const variance = (Math.random() * 0.5) + 0.75; // 0.75 to 1.25
        balance += avgWin * variance;
      } else {
        // Subtract random loss around avgLoss
        const variance = (Math.random() * 0.5) + 0.75;
        balance -= avgLoss * variance;
      }
      pathPoints.push(balance);
    }

    datasets.push({
      label: `Path ${p + 1}`,
      data: pathPoints,
      borderColor: getRandomColor(p),
      borderWidth: 1,
      pointRadius: 0,
      fill: false,
      tension: 0.1
    });
  }

  // Add a thick "Expected Average" path
  const expectedPath = [initialBalance];
  const winExpectancy = winRate * avgWin - (1 - winRate) * avgLoss;
  let expectedBalance = initialBalance;
  for (let s = 1; s <= stepCount; s++) {
    expectedBalance += winExpectancy;
    expectedPath.push(expectedBalance);
  }

  datasets.push({
    label: "Mathematical Expectancy Path",
    data: expectedPath,
    borderColor: "#6366f1",
    borderWidth: 3,
    pointRadius: 0,
    fill: false,
    tension: 0.05
  });

  const labels = Array.from({ length: stepCount + 1 }, (_, i) => `Trade ${i}`);

  charts[canvasId] = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: datasets
    },
    options: {
      ...chartThemeOptions,
      plugins: {
        legend: {
          display: false // Hide legend to prevent 50+ lines clutter
        },
        tooltip: {
          ...chartThemeOptions.plugins.tooltip,
          callbacks: {
            label: function (context) {
              if (context.datasetIndex === datasets.length - 1) {
                return `Mathematical Expectancy: $${context.parsed.y.toFixed(2)}`;
              }
              return `Path Value: $${context.parsed.y.toFixed(2)}`;
            }
          }
        }
      },
      scales: {
        x: chartThemeOptions.scales.x,
        y: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: {
            color: "#94a3b8",
            callback: value => "$" + value.toLocaleString()
          }
        }
      }
    }
  });
}

// ==============================
// --- BACKTEST CHARTS ---
// ==============================
export function renderBtWinLossPie(wins, losses, breakEven) {
  destroyChartIfExists("btWinLossChart");
  const canvas = document.getElementById("btWinLossChart");
  if (!canvas) return;

  const total = wins + losses + breakEven;
  if (total === 0) return;

  charts["btWinLossChart"] = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Wins", "Losses", "Break-even"],
      datasets: [{
        data: [wins, losses, breakEven],
        backgroundColor: ["rgba(16, 185, 129, 0.8)", "rgba(239, 68, 68, 0.8)", "rgba(245, 158, 11, 0.8)"],
        borderColor: ["#10b981", "#ef4444", "#f59e0b"],
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "65%",
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#94a3b8", font: { size: 11 }, padding: 12 }
        },
        tooltip: {
          backgroundColor: "#12161f",
          titleColor: "#f8fafc",
          bodyColor: "#94a3b8",
          callbacks: {
            label: function(ctx) {
              const pct = total > 0 ? ((ctx.raw / total) * 100).toFixed(1) : 0;
              return `${ctx.label}: ${ctx.raw} (${pct}%)`;
            }
          }
        }
      }
    }
  });
}

export function renderBtStrategyPerformance(labels, wins, losses) {
  destroyChartIfExists("btStrategyChart");
  const canvas = document.getElementById("btStrategyChart");
  if (!canvas) return;

  if (labels.length === 0) return;

  charts["btStrategyChart"] = new Chart(canvas, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Wins",
          data: wins,
          backgroundColor: "rgba(16, 185, 129, 0.7)",
          borderColor: "#10b981",
          borderWidth: 1,
          borderRadius: 4
        },
        {
          label: "Losses",
          data: losses,
          backgroundColor: "rgba(239, 68, 68, 0.7)",
          borderColor: "#ef4444",
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: "y",
      plugins: {
        legend: {
          labels: { color: "#94a3b8", font: { size: 11 } }
        },
        tooltip: {
          backgroundColor: "#12161f",
          titleColor: "#f8fafc",
          bodyColor: "#94a3b8"
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#94a3b8", stepSize: 1 }
        },
        y: {
          grid: { color: "rgba(255, 255, 255, 0.04)" },
          ticks: { color: "#94a3b8" }
        }
      }
    }
  });
}

// ==============================
// --- SESSION ANALYSIS CHARTS ---
// ==============================

// SESSION DEFINITIONS (IST times)
export const SESSIONS = {
  Tokyo: { label: "Tokyo", time: "5:30-11:30 IST", color: "#6366f1", startHour: 5.5, endHour: 11.5 },
  London: { label: "London", time: "12:00-19:00 IST", color: "#10b981", startHour: 12, endHour: 19 },
  "New York": { label: "New York", time: "13:00-19:00 IST", color: "#f59e0b", startHour: 13, endHour: 19 },
  Asian: { label: "Asian/Osaka", time: "19:00-1:30 IST", color: "#ef4444", startHour: 19, endHour: 25.5 },
  Overlap: { label: "London-NY Overlap", time: "13:00-19:00 IST", color: "#ec4899", startHour: 13, endHour: 19 }
};

// Helper: Calculate session stats from trades
export function calculateSessionStats(trades) {
  const stats = {};
  Object.keys(SESSIONS).forEach(s => {
    stats[s] = { wins: 0, losses: 0, breakeven: 0, totalPnl: 0, trades: 0, strategies: {} };
  });

  trades.forEach(t => {
    const session = t.session || "None";
    if (!stats[session]) {
      stats[session] = { wins: 0, losses: 0, breakeven: 0, totalPnl: 0, trades: 0, strategies: {} };
    }
    stats[session].trades++;
    if (t.result === "Win") stats[session].wins++;
    else if (t.result === "Loss") stats[session].losses++;
    else stats[session].breakeven++;
    stats[session].totalPnl += t.pnl;

    // Track strategy performance per session
    const strat = t.strategy || "None";
    if (!stats[session].strategies[strat]) {
      stats[session].strategies[strat] = { wins: 0, losses: 0, pnl: 0, trades: 0 };
    }
    stats[session].strategies[strat].trades++;
    stats[session].strategies[strat].pnl += t.pnl;
    if (t.result === "Win") stats[session].strategies[strat].wins++;
    else if (t.result === "Loss") stats[session].strategies[strat].losses++;
  });

  return stats;
}

// 14. SESSION WIN RATE DOUGHNUT CHART
export function renderSessionWinRateChart(canvasId, trades) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const stats = calculateSessionStats(trades);
  const labels = [];
  const winRates = [];
  const colors = [];

  Object.entries(SESSIONS).forEach(([key, sess]) => {
    const s = stats[key];
    if (s && s.trades > 0) {
      labels.push(sess.label);
      const wr = s.trades ? ((s.wins / s.trades) * 100) : 0;
      winRates.push(parseFloat(wr.toFixed(1)));
      colors.push(sess.color);
    }
  });

  if (labels.length === 0) {
    labels.push("No Data");
    winRates.push(1);
    colors.push("rgba(255,255,255,0.1)");
  }

  charts[canvasId] = new Chart(ctx, {
    type: "doughnut",
    data: {
      labels: labels,
      datasets: [{
        data: winRates,
        backgroundColor: colors,
        borderColor: "#12161f",
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom",
          labels: { color: "#94a3b8", font: { family: "'Inter', sans-serif", size: 11 } }
        },
        tooltip: {
          backgroundColor: "#12161f",
          bodyColor: "#94a3b8",
          callbacks: {
            label: function(context) {
              return `${context.label}: ${context.parsed}% Win Rate`;
            }
          }
        }
      },
      cutout: "65%"
    }
  });
}

// 15. SESSION PNL BAR CHART
export function renderSessionPnlChart(canvasId, trades) {
  destroyChartIfExists(canvasId);
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  const stats = calculateSessionStats(trades);
  const labels = [];
  const pnlValues = [];
  const bgColors = [];

  Object.entries(SESSIONS).forEach(([key, sess]) => {
    const s = stats[key];
    if (s && s.trades > 0) {
      labels.push(sess.label);
      pnlValues.push(parseFloat(s.totalPnl.toFixed(2)));
      bgColors.push(s.totalPnl >= 0 ? "rgba(16, 185, 129, 0.7)" : "rgba(239, 68, 68, 0.7)");
    }
  });

  charts[canvasId] = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: "Net PnL",
        data: pnlValues,
        backgroundColor: bgColors,
        borderRadius: 6
      }]
    },
    options: {
      ...chartThemeOptions,
      plugins: {
        ...chartThemeOptions.plugins,
        tooltip: {
          ...chartThemeOptions.plugins.tooltip,
          callbacks: {
            label: function(context) {
              const val = context.parsed.y;
              return `Net: ${val >= 0 ? '+' : '-'}$${Math.abs(val).toFixed(2)}`;
            }
          }
        }
      }
    }
  });
}
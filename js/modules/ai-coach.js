import { state, els } from './core.js';
import { renderPsychologyScore } from '../chart.js';
import { switchTab } from './navigation.js';

// --- RENDER PAGE: AI COACH HUB ---
export function renderAiCoachPage() {
  if (!els.aiInsightsPanel) return;

  const trades = state.trades;
  const totalTrades = trades.length;
  let html = "";

  if (totalTrades < 3) {
    html = `<div class="text-xs text-muted py-2">Need at least 3 trades for behavioral analysis. Currently tracking ${totalTrades} trade${totalTrades !== 1 ? 's' : ''}.</div>`;
  } else {
    // Win rate analysis
    const wins = trades.filter(t => t.result === "Win").length;
    const winRate = ((wins / totalTrades) * 100).toFixed(1);
    html += `<div class="flex justify-between text-sm p-2 rounded" style="background: rgba(16,185,129,0.05);"><span class="text-muted">Win Rate</span><span class="font-bold text-success">${winRate}%</span></div>`;

    // Discipline analysis
    const avgDiscipline = trades.reduce((sum, t) => sum + (t.discipline || 3), 0) / totalTrades;
    let discLabel = avgDiscipline >= 4 ? "Excellent" : avgDiscipline >= 3 ? "Good" : avgDiscipline >= 2 ? "Needs Work" : "Critical";
    let discColor = avgDiscipline >= 4 ? "text-success" : avgDiscipline >= 3 ? "text-accent" : avgDiscipline >= 2 ? "text-warning" : "text-danger";
    html += `<div class="flex justify-between text-sm p-2 rounded" style="background: rgba(99,102,241,0.05);"><span class="text-muted">Avg Discipline</span><span class="font-bold ${discColor}">${avgDiscipline.toFixed(1)}/5 (${discLabel})</span></div>`;

    // Revenge trading detection
    let consecLosses = 0;
    let revengeTrades = 0;
    trades.forEach(t => {
      if (t.result === "Loss") {
        consecLosses++;
        if (consecLosses >= 3) revengeTrades++;
      } else {
        consecLosses = 0;
      }
    });
    if (revengeTrades > 0) {
      html += `<div class="flex justify-between text-sm p-2 rounded" style="background: rgba(239,68,68,0.05);"><span class="text-muted">Revenge Trade Signals</span><span class="font-bold text-danger">${revengeTrades} detected</span></div>`;
    }

    // Best strategy
    const stratPerf = {};
    trades.forEach(t => {
      const s = t.strategy || "None";
      if (!stratPerf[s]) stratPerf[s] = { pnl: 0, count: 0, wins: 0 };
      stratPerf[s].pnl += t.pnl;
      stratPerf[s].count++;
      if (t.result === "Win") stratPerf[s].wins++;
    });
    let bestStrat = "-", bestPnl = -Infinity;
    Object.keys(stratPerf).forEach(s => {
      if (stratPerf[s].pnl > bestPnl) { bestPnl = stratPerf[s].pnl; bestStrat = s; }
    });
    if (bestStrat !== "-") {
      const sWinRate = ((stratPerf[bestStrat].wins / stratPerf[bestStrat].count) * 100).toFixed(0);
      html += `<div class="flex justify-between text-sm p-2 rounded" style="background: rgba(245,158,11,0.05);"><span class="text-muted">Top Strategy</span><span class="font-bold text-warning">${bestStrat} (${sWinRate}% WR)</span></div>`;
    }

    // Worst emotion
    const emotionLosses = {};
    trades.filter(t => t.result === "Loss").forEach(t => {
      const e = t.emotionBefore || "Calm";
      emotionLosses[e] = (emotionLosses[e] || 0) + 1;
    });
    let worstEmotion = "-", worstCount = 0;
    Object.keys(emotionLosses).forEach(e => {
      if (emotionLosses[e] > worstCount) { worstCount = emotionLosses[e]; worstEmotion = e; }
    });
    if (worstEmotion !== "-") {
      html += `<div class="flex justify-between text-sm p-2 rounded" style="background: rgba(239,68,68,0.05);"><span class="text-muted">Riskiest Emotion</span><span class="font-bold text-danger">${worstEmotion} (${worstCount} losses)</span></div>`;
    }
  }

  els.aiInsightsPanel.innerHTML = html;
}

// Simple AI Chat responses based on trade data
function handleAiChat(userMessage) {
  if (!els.aiChatBox) return;
  const msg = userMessage.toLowerCase();
  const trades = state.trades;
  let response = "";

  if (trades.length < 3) {
    response = "I need at least 3 trades logged to provide meaningful analysis. Keep tracking your trades!";
  } else if (msg.includes("revenge") || msg.includes("losing streak")) {
    let consecLosses = 0, maxConsec = 0;
    trades.forEach(t => {
      if (t.result === "Loss") { consecLosses++; if (consecLosses > maxConsec) maxConsec = consecLosses; }
      else consecLosses = 0;
    });
    response = maxConsec >= 3
      ? `Warning: Your max consecutive loss streak is ${maxConsec}. This suggests possible revenge trading. After 2 consecutive losses, take a 15-minute break and review your plan before entering again.`
      : `Good news! Your max consecutive loss streak is only ${maxConsec}. You appear to manage losses well without revenge trading.`;
  } else if (msg.includes("best strategy") || msg.includes("strategy")) {
    const stratPerf = {};
    trades.forEach(t => {
      const s = t.strategy || "None";
      if (!stratPerf[s]) stratPerf[s] = { pnl: 0, count: 0, wins: 0 };
      stratPerf[s].pnl += t.pnl;
      stratPerf[s].count++;
      if (t.result === "Win") stratPerf[s].wins++;
    });
    let best = "-", bestPnl = -Infinity;
    Object.keys(stratPerf).forEach(s => {
      if (stratPerf[s].pnl > bestPnl) { bestPnl = stratPerf[s].pnl; best = s; }
    });
    const wr = stratPerf[best] ? ((stratPerf[best].wins / stratPerf[best].count) * 100).toFixed(0) : 0;
    response = `Your best strategy is "${best}" with a ${wr}% win rate and $${bestPnl.toFixed(2)} total PnL from ${stratPerf[best]?.count || 0} trades. Focus on this setup for consistent results.`;
  } else if (msg.includes("discipline") || msg.includes("rules")) {
    const avg = trades.reduce((s, t) => s + (t.discipline || 3), 0) / trades.length;
    const broke = trades.filter(t => t.discipline <= 2).length;
    response = avg >= 4
      ? `Excellent discipline! Your average rating is ${avg.toFixed(1)}/5. Only ${broke} trades with rule violations. Keep executing your plan consistently.`
      : `Your average discipline is ${avg.toFixed(1)}/5 with ${broke} trades where rules were broken. Focus on pre-trade checklists and pause after losses.`;
  } else if (msg.includes("emotion") || msg.includes("psychology") || msg.includes("mood")) {
    const emoMap = {};
    trades.forEach(t => {
      const e = t.emotionBefore || "Calm";
      if (!emoMap[e]) emoMap[e] = { total: 0, pnl: 0 };
      emoMap[e].total++;
      emoMap[e].pnl += t.pnl;
    });
    let best = "-", bestPnl = -Infinity;
    Object.keys(emoMap).forEach(e => {
      if (emoMap[e].pnl > bestPnl) { bestPnl = emoMap[e].pnl; best = e; }
    });
    response = `Your most profitable emotional state is "${best}" with $${bestPnl.toFixed(2)} net PnL from ${emoMap[best]?.total || 0} trades. Try to enter trades only when you feel ${best}.`;
  } else if (msg.includes("win rate") || msg.includes("winrate")) {
    const wins = trades.filter(t => t.result === "Win").length;
    const wr = ((wins / trades.length) * 100).toFixed(1);
    response = `Your current win rate is ${wr}% (${wins} wins out of ${trades.length} trades). ${wr >= 55 ? "This is above average - well done!" : wr >= 45 ? "This is in the acceptable range. Focus on risk-reward ratio." : "Consider improving your entry criteria and risk management."}`;
  } else if (msg.includes("help") || msg.includes("what can you")) {
    response = "I can analyze: revenge trading patterns, best/worst strategies, emotional correlations, discipline scores, win rate trends, and risk management. Ask me about any of these!";
  } else {
    response = `I've analyzed your ${trades.length} trades. Ask me about: "revenge trading", "best strategy", "discipline", "emotions", "win rate", or say "help" for more options.`;
  }

  // Add user message bubble
  els.aiChatBox.innerHTML += `
    <div class="ai-msg ai-msg-user flex gap-2 justify-end">
      <div class="ai-msg-bubble p-3 rounded-xl text-sm text-light border border-card-border" style="background: var(--primary-glow); max-width: 80%; text-align: right;">
        ${userMessage}
      </div>
    </div>
  `;

  // Add bot response
  els.aiChatBox.innerHTML += `
    <div class="ai-msg ai-msg-bot flex gap-2">
      <div class="ai-avatar" style="width: 32px; height: 32px; border-radius:50%; background:var(--primary); display:flex; align-items:center; justify-content:center; color:white; font-size:12px; flex-shrink:0;"><i class="fa fa-robot"></i></div>
      <div class="ai-msg-bubble p-3 rounded-xl text-sm text-light border border-card-border" style="background:var(--bg-card-hover); max-width: 80%;">
        ${response}
      </div>
    </div>
  `;

  els.aiChatBox.scrollTop = els.aiChatBox.scrollHeight;
}

export function initAiCoach() {
  if (els.aiChatForm) {
    els.aiChatForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const msg = els.aiChatInput.value.trim();
      if (!msg) return;
      handleAiChat(msg);
      els.aiChatInput.value = "";
    });
  }

  if (els.floatingTriggerBubble) {
    els.floatingTriggerBubble.addEventListener("click", () => {
      switchTab("aiCoachPage");
    });
  }
}

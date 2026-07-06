import { state, els } from './core.js';
import { renderPsychologyScore } from '../chart.js';

// --- RENDER PAGE: PSYCHOLOGY HUB ---
export function renderPsychologyPage() {
  const trades = state.trades;
  if (trades.length === 0) return;

  // 1. Emotional Consistency - % of wins where emotion was "Calm"
  const calmWins = trades.filter(t => t.result === "Win" && t.emotionBefore === "Calm").length;
  const totalWins = trades.filter(t => t.result === "Win").length;
  const consistency = totalWins ? ((calmWins / totalWins) * 100).toFixed(1) : 0;
  if (els.psyConsistency) els.psyConsistency.innerText = consistency + "%";

  // 2. Discipline Score
  const avgDiscipline = trades.reduce((s, t) => s + (t.discipline || 3), 0) / trades.length;
  if (els.psyDiscipline) els.psyDiscipline.innerText = avgDiscipline.toFixed(1) + "/5";

  // 3. Mistake Prevalence
  const tradesWithMistakes = trades.filter(t => t.mistakes && t.mistakes.length > 0).length;
  const mistakePct = ((tradesWithMistakes / trades.length) * 100).toFixed(0);
  if (els.psyMistakes) els.psyMistakes.innerText = mistakePct + "%";

  // 4. Emotional Peak - most frequent entry emotion
  const emotionCounts = {};
  trades.forEach(t => {
    const e = t.emotionBefore || "Calm";
    emotionCounts[e] = (emotionCounts[e] || 0) + 1;
  });
  let peakEmotion = "Calm", peakCount = 0;
  Object.keys(emotionCounts).forEach(e => {
    if (emotionCounts[e] > peakCount) { peakCount = emotionCounts[e]; peakEmotion = e; }
  });
  if (els.psyPeak) els.psyPeak.innerText = peakEmotion;

  // 5. Emotion Correlator Table
  if (els.psyEmotionTable) {
    const emotionData = {};
    trades.forEach(t => {
      const e = t.emotionBefore || "Calm";
      if (!emotionData[e]) emotionData[e] = { total: 0, wins: 0, pnl: 0 };
      emotionData[e].total++;
      if (t.result === "Win") emotionData[e].wins++;
      emotionData[e].pnl += t.pnl;
    });

    els.psyEmotionTable.innerHTML = "";
    Object.keys(emotionData).sort((a, b) => emotionData[b].total - emotionData[a].total).forEach(e => {
      const d = emotionData[e];
      const wr = ((d.wins / d.total) * 100).toFixed(0);
      els.psyEmotionTable.innerHTML += `
        <tr>
          <td class="font-semibold">${e}</td>
          <td>${d.total}</td>
          <td class="${parseInt(wr) >= 50 ? 'text-success' : 'text-danger'} font-bold">${wr}%</td>
          <td class="${d.pnl >= 0 ? 'text-success' : 'text-danger'} font-bold">${d.pnl >= 0 ? '+' : '-'}$${Math.abs(d.pnl).toFixed(2)}</td>
        </tr>
      `;
    });
  }

  // 6. Discipline Breach Log
  if (els.psyBreachesLog && els.psyBreachCount) {
    const breaches = [];
    trades.forEach(t => {
      if (t.mistakes && t.mistakes.length > 0) {
        t.mistakes.forEach(m => {
          breaches.push({ date: t.date, asset: t.asset, mistake: m, pnl: t.pnl });
        });
      }
    });
    els.psyBreachCount.innerText = breaches.length + " Breach" + (breaches.length !== 1 ? "es" : "");

    if (breaches.length === 0) {
      els.psyBreachesLog.innerHTML = `<div class="text-xs text-muted">No rules violations registered. Clean record!</div>`;
    } else {
      els.psyBreachesLog.innerHTML = "";
      breaches.slice(-15).reverse().forEach(b => {
        els.psyBreachesLog.innerHTML += `
          <div class="flex justify-between align-center text-sm p-2 rounded" style="background: rgba(239,68,68,0.05); border: 1px solid rgba(239,68,68,0.1);">
            <div class="flex flex-col">
              <span class="font-semibold text-danger">${b.mistake}</span>
              <span class="text-xs text-muted">${b.asset} - ${b.date}</span>
            </div>
            <span class="font-bold ${b.pnl >= 0 ? 'text-success' : 'text-danger'} text-xs">${b.pnl >= 0 ? '+' : '-'}$${Math.abs(b.pnl).toFixed(2)}</span>
          </div>
        `;
      });
    }
  }

  // 7. Key Journal Takeaways
  if (els.psyLessonsList) {
    const lessons = trades.filter(t => t.lessons && t.lessons.trim().length > 0);
    if (lessons.length === 0) {
      els.psyLessonsList.innerHTML = `<div class="text-xs text-muted">Write detailed lessons learned inside trade forms to view highlights.</div>`;
    } else {
      els.psyLessonsList.innerHTML = "";
      lessons.slice(-10).reverse().forEach(t => {
        els.psyLessonsList.innerHTML += `
          <div class="p-2 rounded text-sm" style="background: rgba(16,185,129,0.05); border: 1px solid rgba(16,185,129,0.1);">
            <span class="text-xs text-success font-bold">${t.asset} - ${t.date}</span>
            <p class="text-light mt-1" style="font-size:0.8rem;">${t.lessons}</p>
          </div>
        `;
      });
    }
  }

  // Render Psychology Score chart
  renderPsychologyScore("chartPsychologyScore", trades);
}

export function initPsychology() {
  // Psychology page has no event listeners to bind; it only renders data.
}

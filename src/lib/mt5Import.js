export const EMOTIONS = ['Calm', 'Anxious', 'Greedy', 'Fearful', 'Confident', 'Frustrated', 'Neutral', 'Excited', 'Bored'];
export const MISTAKES = ['Overtrading', 'Chasing', 'Revenge Trading', 'FOMO', 'Moving Stop Loss', 'Ignoring Plan', 'Over-leveraging', 'No Stop Loss'];

function isFiniteNum(n) {
  return typeof n === 'number' && Number.isFinite(n);
}

export function toNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return null;
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : null;
  let s = String(raw).trim();
  if (!s || s === '-' || s === '--' || s === '...' || s === '\u2014' || s === 'n/a' || s.toLowerCase() === 'null') return null;
  let neg = false;
  if (/^\(.*\)$/.test(s)) { neg = true; s = s.slice(1, -1); }
  s = s.replace(/[^0-9.,\-+eE]/g, '');
  s = s.replace(/\s/g, '');
  const lastComma = s.lastIndexOf(',');
  const lastDot = s.lastIndexOf('.');
  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) s = s.replace(/\./g, '').replace(',', '.');
    else s = s.replace(/,/g, '');
  } else if (lastComma > -1) {
    const after = s.length - lastComma - 1;
    if (after === 3 && /^\d{1,3}(,\d{3})+$/.test(s)) s = s.replace(/,/g, '');
    else s = s.replace(',', '.');
  }
  const n = parseFloat(s);
  if (!Number.isFinite(n)) return null;
  return neg ? -n : n;
}

function pad2(n) { return String(n).padStart(2, '0'); }

export function parseMt5Time(raw) {
  if (!raw) return null;
  const s = String(raw).trim();
  let m = s.match(/(\d{4})[.\-/](\d{1,2})[.\-/](\d{1,2})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return build(m[1], m[2], m[3], m[4], m[5], m[6]);
  m = s.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (m) return build(m[1], m[2], m[3], m[4], m[5], m[6]);
  return null;
}

function build(y, mo, d, h, mi, s) {
  const year = Number(y), month = Number(mo), day = Number(d);
  if (year < 2000 || year > 2100 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  const hh = h !== undefined ? Number(h) : 0;
  const mm = mi !== undefined ? Number(mi) : 0;
  const ss = s !== undefined ? Number(s) : 0;
  if (hh > 23 || mm > 59 || ss > 60) return null;
  return {
    date: `${year}-${pad2(month)}-${pad2(day)}`,
    time: `${pad2(hh)}:${pad2(mm)}`,
    seconds: ss,
    stamp: new Date(year, month - 1, day, hh, mm, ss).getTime(),
  };
}

export function normalizeSymbol(raw) {
  if (!raw) return '';
  const upper = String(raw).trim().toUpperCase();
  const parts = upper.split(/[^A-Z0-9]+/).filter(Boolean);
  if (!parts.length) return '';
  if (parts.length > 1 && parts[0].length >= 4 && parts[parts.length - 1].length <= 3) return parts[0];
  return parts.join('');
}

export function normalizeDirection(raw, role) {
  const s = String(raw || '').toLowerCase().trim();
  if (/\bbuy\b|\blong\b/.test(s)) return 'Buy';
  if (/\bsell\b|\bshort\b/.test(s)) return 'Sell';
  if (role === 'open' || role === 'close') return 'Buy';
  return null;
}

function detectSession(timeStr) {
  if (!timeStr) return 'None';
  const [h, m] = timeStr.split(':').map(Number);
  const t = h * 60 + (m || 0);
  if (t >= 330 && t < 690) return 'Tokyo';
  if (t >= 780 && t < 1140) return 'Overlap';
  if (t >= 720 && t < 780) return 'London';
  if (t >= 1140 || t < 90) return 'Asian';
  return 'None';
}

function cleanDeal(rawDeal, index) {
  const d = rawDeal && typeof rawDeal === 'object' ? rawDeal : {};
  const time = parseMt5Time(d.time || d.dateTime || d.timestamp);
  const comment = typeof d.comment === 'string' ? d.comment.trim().slice(0, 300) : '';
  const role = ['open', 'close', 'balance', 'other'].includes(String(d.role || '').toLowerCase())
    ? String(d.role).toLowerCase()
    : null;
  const uncertain = Array.isArray(d.uncertainFields)
    ? d.uncertainFields.filter(x => typeof x === 'string').map(x => x.slice(0, 60)).slice(0, 25)
    : [];
  let confidence = toNumber(d.confidence);
  if (confidence === null) confidence = null;
  else if (confidence > 1 && confidence <= 100) confidence = confidence / 100;
  else confidence = Math.max(0, Math.min(1, confidence));

  return {
    index,
    ticket: d.ticket !== null && d.ticket !== undefined ? String(d.ticket).trim().slice(0, 40) : '',
    positionId: d.positionId !== null && d.positionId !== undefined ? String(d.positionId).trim().slice(0, 40) : '',
    time,
    type: typeof d.type === 'string' ? d.type.trim().toLowerCase().slice(0, 40) : '',
    role,
    symbol: normalizeSymbol(d.symbol || d.item),
    volume: toNumber(d.volume),
    price: toNumber(d.price),
    stopLoss: toNumber(d.stopLoss ?? d.sl),
    takeProfit: toNumber(d.takeProfit ?? d.tp),
    commission: toNumber(d.commission),
    swap: toNumber(d.swap),
    profit: toNumber(d.profit),
    balance: toNumber(d.balance),
    comment,
    confidence,
    uncertainFields: uncertain,
    raw: typeof d.raw === 'string' ? d.raw.slice(0, 500) : '',
  };
}

const SL_TP_RE = /\[(tp|sl)\s*[:=]?\s*([0-9]+(?:\.[0-9]+)?)/i;

function findSlTpInComments(deals) {
  let sl = null, tp = null;
  for (const d of deals) {
    const m = d.comment ? d.comment.match(SL_TP_RE) : null;
    if (!m) continue;
    const val = toNumber(m[2]);
    if (val === null) continue;
    if (m[1].toLowerCase() === 'sl' && sl === null) sl = val;
    if (m[1].toLowerCase() === 'tp' && tp === null) tp = val;
  }
  return { sl, tp };
}

function classifyDeal(d) {
  if (d.role) return d.role;
  const t = d.type || '';
  if (/^(balance|credit|charge|correction|in|out|deposit|withdrawal)$/.test(t) && !d.symbol) return 'balance';
  if (/\b(in|out|in out|out by|balance)\b/.test(t) && !d.symbol && d.profit === null) return 'balance';
  if (d.comment && /\[(tp|sl)/i.test(d.comment)) return 'close';
  if (d.profit !== null && d.profit !== undefined) return 'close';
  if (/^(buy|sell)$/.test(t) || normalizeDirection(t) === 'Buy' || normalizeDirection(t) === 'Sell') {
    if (d.symbol && d.volume !== null) return 'open';
    return 'balance';
  }
  return 'other';
}

function weightedAvg(entries) {
  let volSum = 0, notional = 0;
  for (const e of entries) {
    const v = e.volume && e.volume > 0 ? e.volume : 0;
    const p = e.price !== null ? e.price : 0;
    volSum += v;
    notional += v * p;
  }
  if (volSum <= 0) {
    const first = entries.find(e => e.price !== null);
    return first ? first.price : null;
  }
  return notional / volSum;
}

function volumeWeightedExit(closes) {
  let volSum = 0, notional = 0, priced = 0;
  for (const c of closes) {
    if (c.price === null) continue;
    const v = c.volume && c.volume > 0 ? c.volume : 1;
    volSum += v;
    notional += v * c.price;
    priced += 1;
  }
  if (priced === 0) return null;
  if (volSum <= 0) return closes.find(c => c.price !== null).price;
  return notional / volSum;
}

function computeRMultiple(type, entry, exit, sl) {
  if (!isFiniteNum(entry) || !isFiniteNum(exit) || !isFiniteNum(sl)) return 0;
  const risk = type === 'Buy' ? entry - sl : sl - entry;
  if (!isFiniteNum(risk) || Math.abs(risk) < 1e-12) return 0;
  const gain = type === 'Buy' ? exit - entry : entry - exit;
  const r = gain / risk;
  if (!Number.isFinite(r) || Math.abs(r) > 1000) return 0;
  return Math.round(r * 100) / 100;
}

function round2(n) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

function round8(n) {
  return Math.round((n + Number.EPSILON) * 1e8) / 1e8;
}

function buildGroup(groupDeals, flags) {
  const sorted = [...groupDeals].sort((a, b) => (a.time?.stamp ?? 0) - (b.time?.stamp ?? 0));
  const seenTickets = new Set();
  const unique = sorted.filter(d => {
    if (!d.ticket) return true;
    if (seenTickets.has(d.ticket)) return false;
    seenTickets.add(d.ticket);
    return true;
  });
  const hadDuplicateRows = unique.length < sorted.length;
  const opens = unique.filter(d => d.__role === 'open');
  const closes = unique.filter(d => d.__role === 'close');
  const positionId = unique.find(d => d.positionId)?.positionId || '';
  const tickets = unique.filter(d => d.ticket).map(d => d.ticket);
  const reviewReasons = [...flags];
  if (hadDuplicateRows) reviewReasons.push('Duplicate rows from the screenshot were merged');
  const uncertainFields = [...new Set(unique.flatMap(d => d.uncertainFields.map(f => `${f}`)))];
  const confidences = unique.map(d => d.confidence).filter(c => c !== null);
  const confidence = confidences.length ? Math.min(...confidences) : null;

  const symbol = unique.find(d => d.symbol)?.symbol || '';
  const directionDeal = opens[0] || closes[0] || unique[0];
  let type = normalizeDirection(directionDeal.type, directionDeal.__role);
  if (!type) {
    const openDir = opens.length ? normalizeDirection(opens[0].type) : null;
    type = openDir || 'Buy';
  }

  const { sl: commentSl, tp: commentTp } = findSlTpInComments(unique);
  const stopLoss = unique.find(d => d.stopLoss !== null)?.stopLoss ?? commentSl;
  const takeProfit = unique.find(d => d.takeProfit !== null)?.takeProfit ?? commentTp;

  const entryTime = (opens[0] || unique[0]).time;
  const exitTimeDeal = closes.length ? closes[closes.length - 1].time : null;

  const entryPrice = opens.length ? weightedAvg(opens) : (closes.length ? closes[0].price : null);
  const exitPrice = closes.length ? volumeWeightedExit(closes) : null;

  const openVolume = opens.reduce((s, d) => s + (d.volume || 0), 0);
  const closeVolume = closes.reduce((s, d) => s + (d.volume || 0), 0);
  const quantity = openVolume > 0 ? openVolume : closeVolume;

  const profitSum = unique.reduce((s, d) => s + (d.profit || 0), 0);
  const commissionSum = unique.reduce((s, d) => s + (d.commission || 0), 0);
  const swapSum = unique.reduce((s, d) => s + (d.swap || 0), 0);
  const hasProfitColumn = unique.some(d => d.profit !== null);
  const pnl = hasProfitColumn || commissionSum !== 0 || swapSum !== 0
    ? round2(profitSum + commissionSum + swapSum)
    : null;

  const isOpen = closes.length === 0;
  if (isOpen) reviewReasons.push('No exit deal found \u2014 treated as an open position');
  if (opens.length > 1) reviewReasons.push(`${opens.length} entry deals combined (position was added to)`);
  if (closes.length > 1) reviewReasons.push(`${closes.length} exit deals combined (partial closes)`);
  if (closes.length > 0 && openVolume > 0 && closeVolume > 0 && closeVolume + 1e-9 < openVolume) {
    reviewReasons.push(`Partially closed \u2014 ${round2(closeVolume)} of ${round2(openVolume)} lots closed`);
  }
  if (!positionId && closes.length) reviewReasons.push('Matched without Position ID \u2014 verify entry/exit pairing');
  if (confidence !== null && confidence < 0.7) reviewReasons.push('Low AI confidence in extracted values');
  if (uncertainFields.length) reviewReasons.push(`Uncertain fields: ${uncertainFields.slice(0, 6).join(', ')}`);
  if (!symbol) reviewReasons.push('Symbol missing');
  if (pnl === null) reviewReasons.push('Profit not visible \u2014 P/L set to 0 for review');

  const date = (exitTimeDeal || entryTime)?.date || '';
  const typeFix = type === 'Sell' ? 'Sell' : 'Buy';

  return {
    key: positionId ? `pos_${positionId}` : `grp_${sorted[0].index}`,
    asset: symbol,
    type: typeFix,
    date,
    time: entryTime?.time || '',
    entryTime: entryTime?.time || '',
    exitTime: exitTimeDeal?.time || '',
    entryPrice: entryPrice !== null ? round8(entryPrice) : null,
    exitPrice: exitPrice !== null ? round8(exitPrice) : null,
    quantity: round8(quantity || 0),
    stopLoss,
    takeProfit,
    commission: round2(commissionSum),
    swap: round2(swapSum),
    pnl: pnl === null ? 0 : pnl,
    rMultiple: 0,
    session: detectSession(entryTime?.time || ''),
    result: 'Break-even',
    isOpen,
    positionId,
    tickets,
    dealCount: sorted.length,
    dealIds: sorted.map(d => d.index),
    confidence,
    uncertainFields,
    needsReview: reviewReasons.length > 0,
    reviewReasons,
    errors: [],
    duplicate: null,
    selected: false,
    expanded: false,
    entryReason: '',
    strategy: '',
    liquidity: '',
    poi: '',
    setupConfirmation: '',
    mistakes: [],
    emotionBefore: 'Neutral',
    emotionAfter: 'Neutral',
    notes: '',
    _deals: sorted,
  };
}

export function refreshRow(row) {
  const r = row;
  r.session = detectSession(r.entryTime || r.time || '');
  if (r.isOpen) r.result = 'Break-even';
  else if (r.pnl > 0.05) r.result = 'Win';
  else if (r.pnl < -0.05) r.result = 'Loss';
  else r.result = 'Break-even';
  r.rMultiple = r.isOpen ? 0 : computeRMultiple(r.type, r.entryPrice, r.exitPrice, r.stopLoss);
  r.errors = validateRow(r);
  return r;
}

export function validateRow(row) {
  const errors = [];
  if (!row.asset) errors.push('Symbol missing');
  if (!row.date || !/^\d{4}-\d{2}-\d{2}$/.test(row.date)) errors.push('Invalid date');
  if (!row.time) errors.push('Entry time missing');
  if (!isFiniteNum(row.entryPrice)) errors.push('Entry price missing');
  if (!row.isOpen && !isFiniteNum(row.exitPrice)) errors.push('Exit price missing');
  if (!(row.quantity > 0)) errors.push('Volume/lots missing');
  if (!isFiniteNum(row.pnl)) errors.push('P/L invalid');
  if (!['Buy', 'Sell'].includes(row.type)) errors.push('Direction invalid');
  return errors;
}

function pairWithoutPositionId(opens, closes) {
  const used = new Set();
  const pairs = [];
  const openFlagged = [];
  const items = closes.map((c, i) => ({ c, i }));
  for (const o of opens) {
    const sameSym = items.filter(({ c, i }) =>
      !used.has(i)
      && c.symbol === o.symbol
      && (c.time?.stamp ?? -1) >= (o.time?.stamp ?? 0));
    const openDir = normalizeDirection(o.type);
    const opposite = sameSym.filter(({ c }) => {
      const d = normalizeDirection(c.type);
      return d && openDir && d !== openDir;
    });
    const pool = opposite.length ? opposite : sameSym;
    if (!pool.length) { openFlagged.push(o); continue; }
    const picked = [];
    let vol = 0;
    const target = o.volume || 0;
    for (const item of pool) {
      if (picked.length && target > 0 && vol >= target) break;
      picked.push(item);
      used.add(item.i);
      vol += item.c.volume || 0;
    }
    pairs.push({ open: o, closes: picked.map(x => x.c) });
  }
  const extraCloses = closes.filter((_, i) => !used.has(i));
  return { pairs, openFlagged, extraCloses };
}

export function reconcileDeals(rawDeals) {
  const deals = (Array.isArray(rawDeals) ? rawDeals : [])
    .map((d, i) => cleanDeal(d, i))
    .filter(d => d.time || d.symbol || d.ticket || d.type);

  const ignored = [];
  const tradeDeals = [];
  deals.forEach(d => {
    d.__role = classifyDeal(d);
    if (d.__role === 'balance') { ignored.push(d); return; }
    if (!d.symbol && d.__role !== 'close') { ignored.push(d); return; }
    tradeDeals.push(d);
  });

  const rows = [];
  const unassigned = [];

  const byPosition = new Map();
  for (const d of tradeDeals) {
    const k = d.positionId || '';
    if (!k) { unassigned.push(d); continue; }
    if (!byPosition.has(k)) byPosition.set(k, []);
    byPosition.get(k).push(d);
  }

  for (const [, group] of byPosition) {
    rows.push(buildGroup(group, []));
  }

  if (unassigned.length) {
    const opens = unassigned.filter(d => d.__role === 'open');
    const closes = unassigned.filter(d => d.__role === 'close');
    const others = unassigned.filter(d => d.__role === 'other');
    const { pairs, openFlagged, extraCloses } = pairWithoutPositionId(opens, closes);
    for (const p of pairs) rows.push(buildGroup([p.open, ...p.closes], []));
    for (const o of openFlagged) rows.push(buildGroup([o], ['Entry deal has no matching exit deal']));
    for (const c of extraCloses) rows.push(buildGroup([c], ['Exit deal has no matching entry deal \u2014 verify this row']));
    for (const o of others) rows.push(buildGroup([o], ['Could not classify deal \u2014 verify this row']));
  }

  const finalized = rows.map(refreshRow);

  const seen = new Map();
  const deduped = [];
  for (const row of finalized) {
    const idKey = row.positionId ? `pos:${row.asset}:${row.positionId}` : null;
    if (idKey && seen.has(idKey)) {
      const target = seen.get(idKey);
      target.dealCount += row.dealCount;
      target.reviewReasons.push('Duplicate rows from the screenshot were merged');
      target.needsReview = true;
      continue;
    }
    if (idKey) seen.set(idKey, row);
    deduped.push(row);
  }

  const batchSeen = new Map();
  for (const row of deduped) {
    const fp = rowFingerprint(row);
    if (batchSeen.has(fp)) {
      row.duplicate = 'batch';
      row.reviewReasons.push('Duplicate of another row in this screenshot');
      row.needsReview = true;
      row.selected = false;
    } else {
      batchSeen.set(fp, row);
    }
  }

  return {
    trades: deduped,
    ignoredRows: ignored.map(d => ({
      type: d.type,
      symbol: d.symbol,
      profit: d.profit,
      raw: d.raw,
    })),
    totalDeals: deals.length,
  };
}

export function rowFingerprint(row) {
  if (row.positionId) return `mt5:${row.asset}:${row.positionId}`;
  const t = row.tickets && row.tickets.length ? row.tickets[0] : '';
  if (t) return `tkt:${row.asset}:${t}`;
  return [
    'fp',
    row.asset,
    row.date,
    row.entryTime,
    row.exitTime,
    row.entryPrice,
    row.exitPrice,
    row.quantity,
    row.pnl,
  ].join('|');
}

export function tradeFingerprint(trade) {
  if (trade.mt5PositionId) return `mt5:${trade.asset}:${trade.mt5PositionId}`;
  if (trade.importFingerprint) return trade.importFingerprint;
  if (trade.mt5Tickets && trade.mt5Tickets.length) return `tkt:${trade.asset}:${trade.mt5Tickets[0]}`;
  return [
    'fp',
    trade.asset,
    trade.date,
    trade.entryTime || '',
    trade.exitTime || '',
    Number(trade.entryPrice) || 0,
    Number(trade.exitPrice) || 0,
    Number(trade.quantity) || 0,
    Math.round((Number(trade.pnl) || 0) * 100) / 100,
  ].join('|');
}

export function markDuplicates(existingTrades, rows) {
  const existingKeys = new Set((existingTrades || []).map(t => tradeFingerprint(t)));
  for (const row of rows) {
    if (row.duplicate === 'batch') continue;
    if (existingKeys.has(rowFingerprint(row))) {
      row.duplicate = 'existing';
      row.selected = false;
      row.needsReview = true;
      row.reviewReasons = [...row.reviewReasons, 'Already exists in your journal \u2014 import blocked by default'];
    }
  }
  return rows;
}

export function validateSelection(rows) {
  const selected = rows.filter(r => r.selected);
  const blocked = [];
  const ready = [];
  for (const row of selected) {
    const errs = validateRow(row);
    row.errors = errs;
    if (errs.length) {
      row.selected = false;
      blocked.push(row);
    } else {
      ready.push(row);
    }
  }
  return { ready, blocked };
}

export function toTradeRecord(row, accountId) {
  const commissionAbs = Math.abs(round2(row.commission || 0));
  return {
    accountId: accountId || 'default',
    asset: String(row.asset || '').toUpperCase(),
    type: row.type === 'Sell' ? 'Sell' : 'Buy',
    entryPrice: isFiniteNum(row.entryPrice) ? row.entryPrice : 0,
    exitPrice: isFiniteNum(row.exitPrice) ? row.exitPrice : 0,
    stopLoss: isFiniteNum(row.stopLoss) ? row.stopLoss : 0,
    takeProfit: isFiniteNum(row.takeProfit) ? row.takeProfit : 0,
    quantity: isFiniteNum(row.quantity) ? row.quantity : 0,
    date: row.date,
    time: row.time || row.entryTime || '00:00',
    entryTime: row.entryTime || '',
    exitTime: row.exitTime || '',
    session: row.session || 'None',
    pnl: isFiniteNum(row.pnl) ? row.pnl : 0,
    rMultiple: isFiniteNum(row.rMultiple) ? row.rMultiple : 0,
    commission: commissionAbs,
    swap: round2(row.swap || 0),
    result: row.result || 'Break-even',
    strategy: row.strategy && row.strategy.trim() ? row.strategy.trim() : 'None',
    notes: row.notes || '',
    mistakes: Array.isArray(row.mistakes) ? row.mistakes : [],
    entryReason: row.entryReason || '',
    liquidity: row.liquidity || '',
    poi: row.poi || '',
    setupConfirmation: row.setupConfirmation || '',
    emotionBefore: row.emotionBefore || 'Neutral',
    emotionAfter: row.emotionAfter || 'Neutral',
    source: 'mt5_import',
    mt5PositionId: row.positionId || '',
    mt5Tickets: Array.isArray(row.tickets) ? row.tickets : [],
    importFingerprint: rowFingerprint(row),
    needsReview: !!row.needsReview,
    reviewReasons: Array.isArray(row.reviewReasons) ? row.reviewReasons : [],
    isOpen: !!row.isOpen,
  };
}

export function summarize(rows) {
  const selected = rows.filter(r => r.selected);
  return {
    total: rows.length,
    selected: selected.length,
    needsReview: rows.filter(r => r.needsReview).length,
    duplicates: rows.filter(r => r.duplicate).length,
    invalid: rows.filter(r => r.errors && r.errors.length).length,
    open: rows.filter(r => r.isOpen).length,
    selectedPnl: selected.reduce((s, r) => s + (isFiniteNum(r.pnl) ? r.pnl : 0), 0),
  };
}

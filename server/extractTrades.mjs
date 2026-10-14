import { toNumber, normalizeSymbol } from '../src/lib/mt5Import.js';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';
const DEFAULT_MODEL = 'gemini-3.8-flash';
const MODEL_FALLBACKS = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash', 'gemini-2.0-flash'];

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    pageType: { type: 'STRING' },
    accountCurrency: { type: 'STRING', nullable: true },
    warnings: { type: 'ARRAY', items: { type: 'STRING' } },
    deals: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          ticket: { type: 'STRING', nullable: true },
          positionId: { type: 'STRING', nullable: true },
          time: { type: 'STRING', nullable: true },
          type: { type: 'STRING', nullable: true },
          role: { type: 'STRING', nullable: true },
          symbol: { type: 'STRING', nullable: true },
          volume: { type: 'NUMBER', nullable: true },
          price: { type: 'NUMBER', nullable: true },
          stopLoss: { type: 'NUMBER', nullable: true },
          takeProfit: { type: 'NUMBER', nullable: true },
          commission: { type: 'NUMBER', nullable: true },
          swap: { type: 'NUMBER', nullable: true },
          profit: { type: 'NUMBER', nullable: true },
          balance: { type: 'NUMBER', nullable: true },
          comment: { type: 'STRING', nullable: true },
          confidence: { type: 'NUMBER', nullable: true },
          uncertainFields: { type: 'ARRAY', items: { type: 'STRING' } },
          raw: { type: 'STRING', nullable: true },
        },
        required: [
          'ticket', 'positionId', 'time', 'type', 'role', 'symbol', 'volume', 'price',
          'stopLoss', 'takeProfit', 'commission', 'swap', 'profit', 'balance',
          'comment', 'confidence', 'uncertainFields', 'raw',
        ],
      },
    },
  },
  required: ['pageType', 'accountCurrency', 'warnings', 'deals'],
  propertyOrdering: ['pageType', 'accountCurrency', 'warnings', 'deals'],
};

const PROMPT = `You are a precise data-extraction engine for MetaTrader 5 (MT5) terminal screenshots.

The attached image is a screenshot of the MT5 History window (Deals / History tab) or an MT5 trading report. Extract EVERY visible data row from the table into the "deals" array, in top-to-bottom order.

Hard rules:
- Output ONLY values that are visible in the image. NEVER invent, estimate, guess, or complete missing values. Use null for anything not visible or unreadable.
- "time": "YYYY-MM-DD HH:MM:SS" (24-hour). If only a date plus HH:MM is visible, seconds are "00".
- "type": raw Type column text, lowercase (examples: buy, sell, in, out, in out, out by, balance, buy limit, close position).
- "role": evidence-based classification of the row: "open" = deal that opened a position (buy/sell row whose profit cell is empty); "close" = deal that closed a position (profit cell has a value, or comment contains [tp] / [sl]); "balance" = deposit, withdrawal or balance row; "other" = unclear. Use null when unclear.
- "symbol": cleaned uppercase symbol (XAUUSD, EURUSD, ...). null when the row has no symbol.
- "volume": lots as a plain number (0.10 -> 0.1).
- "price": deal execution price as a plain number.
- "stopLoss" / "takeProfit": only when a visible SL/TP column shows a value, or the comment shows [sl 2640.00] or [tp 2655.00]. Otherwise null.
- "commission", "swap", "profit": signed numbers exactly as displayed (fees and losses are negative). null when the cell is empty or not visible.
- "balance": account balance after the deal when that column is visible, else null.
- "comment": full comment text when visible, else null.
- "ticket": value from a Ticket / Order / Deal # column when visible, else null. Store digits as a string.
- "positionId": value from a Position / Position ID column when visible, else null. Store digits as a string.
- "confidence": your 0..1 certainty about this row's numbers.
- "uncertainFields": field names that are blurry or ambiguous (example: ["profit","price"]).
- "raw": the whole row as plain text with columns separated by " | ".

Also set:
- "pageType": one of deals, positions, orders, report, account_summary, not_mt5, unreadable.
- "accountCurrency": visible account currency (USD, EUR, ...) else null.
- "warnings": short notes about problems, e.g. "profit column not visible", "rows cut off at the bottom".

If the image is not an MT5 history screenshot, set pageType to not_mt5 (or unreadable), deals to an empty array, and explain in warnings.`;

function makeError(code, status, message) {
  const err = new Error(message);
  err.code = code;
  err.status = status;
  return err;
}

function str(raw, max = 300) {
  if (raw === null || raw === undefined) return '';
  return String(raw).trim().slice(0, max);
}

function strOrNull(raw, max = 300) {
  if (raw === null || raw === undefined || raw === '') return null;
  return str(raw, max);
}

function sanitizeDeal(d, index) {
  const src = d && typeof d === 'object' ? d : {};
  const confidence = toNumber(src.confidence);
  return {
    index,
    ticket: strOrNull(src.ticket, 40),
    positionId: strOrNull(src.positionId, 40),
    time: strOrNull(src.time, 40),
    type: str(src.type, 40).toLowerCase(),
    role: ['open', 'close', 'balance', 'other'].includes(str(src.role, 20).toLowerCase())
      ? str(src.role, 20).toLowerCase()
      : null,
    symbol: normalizeSymbol(src.symbol) || null,
    volume: toNumber(src.volume),
    price: toNumber(src.price),
    stopLoss: toNumber(src.stopLoss),
    takeProfit: toNumber(src.takeProfit),
    commission: toNumber(src.commission),
    swap: toNumber(src.swap),
    profit: toNumber(src.profit),
    balance: toNumber(src.balance),
    comment: strOrNull(src.comment),
    confidence: confidence === null ? null : Math.max(0, Math.min(1, confidence)),
    uncertainFields: Array.isArray(src.uncertainFields)
      ? src.uncertainFields.filter(x => typeof x === 'string').map(x => str(x, 60)).slice(0, 25)
      : [],
    raw: strOrNull(src.raw, 500),
  };
}

async function callGemini({ images, apiKey, model, withThinkingConfig }) {
  const payload = {
    contents: [{
      role: 'user',
      parts: [
        { text: PROMPT },
        ...images.map(img => ({ inline_data: { mime_type: img.mimeType, data: img.data } })),
      ],
    }],
    generationConfig: {
      temperature: 0,
      topP: 0.1,
      maxOutputTokens: 4096,
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
      ...(withThinkingConfig ? { thinkingConfig: { thinkingBudget: 0 } } : {}),
    },
  };

  const res = await fetch(`${API_BASE}/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify(payload),
    signal: AbortSignal.timeout(40000),
  });

  let data = null;
  try { data = await res.json(); } catch { data = null; }

  if (!res.ok) {
    const msg = data?.error?.message || `HTTP ${res.status}`;
    const status = res.status;
    const err = new Error(msg);
    err.status = status;
    err.message = msg;
    throw err;
  }

  if (data?.promptFeedback?.blockReason) {
    throw makeError('AI_BLOCKED', 422, `The AI refused to process this image (${data.promptFeedback.blockReason}).`);
  }

  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map(p => p.text || '').join('');
  if (!text) {
    const finish = data?.candidates?.[0]?.finishReason || 'empty';
    throw makeError('AI_EMPTY', 422, `The AI returned no data (${finish}). Try another screenshot.`);
  }
  return text;
}

function parseJsonText(text) {
  let t = text.trim();
  if (t.startsWith('```')) {
    t = t.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }
  try {
    return JSON.parse(t);
  } catch {
    const start = t.indexOf('{');
    const end = t.lastIndexOf('}');
    if (start > -1 && end > start) return JSON.parse(t.slice(start, end + 1));
    throw makeError('AI_BAD_JSON', 422, 'The AI returned malformed data. Please retry.');
  }
}

export async function extractTrades({ images, apiKey, model, fetchImpl }) {
  if (typeof fetchImpl === 'function') {
    globalThis.fetch = fetchImpl;
  }
  const models = [];
  const preferred = str(model, 60) || DEFAULT_MODEL;
  models.push(preferred);
  for (const m of MODEL_FALLBACKS) if (!models.includes(m)) models.push(m);

  let lastError = null;
  let timeouts = 0;

  for (const pass of [true, false]) {
    for (const candidate of models) {
      try {
        const text = await callGemini({ images, apiKey, model: candidate, withThinkingConfig: pass });
        const parsed = parseJsonText(text);
        const deals = Array.isArray(parsed.deals) ? parsed.deals : [];
        if (deals.length > 500) {
          throw makeError('AI_TOO_MANY_ROWS', 422, 'Extracted more than 500 rows \u2014 image may be misread.');
        }
        const pageType = str(parsed.pageType, 40).toLowerCase() || 'unreadable';
        const warnings = Array.isArray(parsed.warnings)
          ? parsed.warnings.filter(x => typeof x === 'string').map(x => str(x, 200)).slice(0, 20)
          : [];
        return {
          ok: true,
          pageType,
          accountCurrency: strOrNull(parsed.accountCurrency, 20),
          warnings,
          deals: deals.map(sanitizeDeal),
          model: candidate,
        };
      } catch (e) {
        lastError = e;
        const status = e.status;
        const msg = String(e.message || '');
        if (e.code === 'AI_BLOCKED') throw e;
        if (e.name === 'TimeoutError' || e.name === 'AbortError') {
          timeouts += 1;
          if (timeouts >= 2) throw makeError('AI_TIMEOUT', 504, 'The AI request timed out. Please retry.');
          continue;
        }
        if (status === 401 || status === 403) {
          throw makeError('AI_AUTH', 502, 'The AI API key was rejected. Check MT5_AI_API_KEY.');
        }
        if (status === 429) {
          throw makeError('AI_RATE_LIMITED', 429, 'The AI provider is rate-limiting requests. Wait a minute and retry.');
        }
        if (status === 400 && pass === true && /thinking/i.test(msg)) break;
        if (status === 400 && !/thinking/i.test(msg)) {
          throw makeError('AI_REQUEST', 502, `AI rejected the request: ${msg.slice(0, 300)}`);
        }
        if (status === 404 || status >= 500 || !status) continue;
        if (e.code === 'AI_EMPTY' || e.code === 'AI_BAD_JSON' || e.code === 'AI_TOO_MANY_ROWS') continue;
        if (e.code) throw e;
        throw makeError('AI_ERROR', 502, `AI extraction failed: ${msg.slice(0, 300)}`);
      }
    }
  }

  if (lastError && (lastError.name === 'TimeoutError' || lastError.name === 'AbortError')) {
    throw makeError('AI_TIMEOUT', 504, 'The AI request timed out. Please retry.');
  }
  if (lastError?.code) throw lastError;
  const finalMsg = String(lastError?.message || 'Unknown AI error');
  throw makeError('AI_ERROR', 502, `AI extraction failed: ${finalMsg.slice(0, 300)}`);
}

import { extractTrades } from './extractTrades.mjs';
import {
  clientIp,
  extractToken,
  normalizeImages,
  rateLimit,
  readJsonBody,
  sendJson,
  verifyIdToken,
} from './guards.mjs';

function isOriginAllowed(origin, env) {
  const allowed = String(env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);
  if (!allowed.length) return true;
  if (!origin) return true;
  return allowed.some(o => o === origin || o === '*');
}

export async function handleExtractRequest(req, res, env = {}) {
  try {
    if ((req.method || 'GET').toUpperCase() !== 'POST') {
      return sendJson(res, 405, { ok: false, code: 'METHOD_NOT_ALLOWED', error: 'Use POST for this endpoint.' });
    }

    const origin = req.headers && (req.headers.origin || req.headers.Origin);
    if (!isOriginAllowed(origin, env)) {
      return sendJson(res, 403, { ok: false, code: 'ORIGIN_DENIED', error: 'Origin not allowed.' });
    }

    const payload = await readJsonBody(req);
    const normalized = normalizeImages(payload);
    if (normalized.error) {
      return sendJson(res, 400, { ok: false, code: 'INVALID_IMAGE', error: normalized.error });
    }

    const token = extractToken(req);
    if (token) {
      const claims = await verifyIdToken(token, env);
      if (!claims) {
        return sendJson(res, 401, {
          ok: false,
          code: 'UNAUTHORIZED',
          error: 'Your session could not be verified. Sign out and back in, then retry.',
        });
      }
    } else if (String(env.MT5_ENFORCE_AUTH || '').toLowerCase() === 'true') {
      return sendJson(res, 401, { ok: false, code: 'UNAUTHORIZED', error: 'Sign in to use AI import.' });
    }

    const ip = clientIp(req);
    const limit = Number(env.MT5_RATE_LIMIT) > 0 ? Number(env.MT5_RATE_LIMIT) : 12;
    const rl = rateLimit(`extract:${ip}`, limit, 10 * 60 * 1000);
    if (!rl.allowed) {
      if (typeof res.setHeader === 'function') res.setHeader('Retry-After', String(rl.retryAfter));
      return sendJson(res, 429, {
        ok: false,
        code: 'RATE_LIMITED',
        error: `Too many AI requests. Try again in about ${rl.retryAfter} seconds.`,
      });
    }

    const apiKey = String(env.MT5_AI_API_KEY || '').trim();
    if (!apiKey) {
      return sendJson(res, 503, {
        ok: false,
        code: 'NO_API_KEY',
        error: 'AI is not configured on the server. Set the MT5_AI_API_KEY environment variable (Vercel Project Settings, or a local .env file for npm run dev).',
      });
    }

    const result = await extractTrades({
      images: normalized.images,
      apiKey,
      model: env.MT5_AI_MODEL,
    });

    return sendJson(res, 200, result);
  } catch (e) {
    const status = e.status || 500;
    const code = e.code || 'SERVER_ERROR';
    const message = status === 500
      ? 'Server error while processing the screenshot. Please retry.'
      : (e.message || 'Request failed.');
    if (status >= 500) console.error('[mt5-extract]', code, e.message);
    return sendJson(res, status, { ok: false, code, error: message });
  }
}

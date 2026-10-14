import crypto from 'node:crypto';

const CERTS_URL = 'https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
const DEFAULT_PROJECT_ID = 'trading-j-c9922';

let certsCache = { at: 0, keys: null };

async function getGoogleCerts() {
  const now = Date.now();
  if (certsCache.keys && now - certsCache.at < 60 * 60 * 1000) return certsCache.keys;
  const res = await fetch(CERTS_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`certs fetch failed: ${res.status}`);
  const keys = await res.json();
  certsCache = { at: now, keys };
  return keys;
}

export async function verifyIdToken(token, env = {}) {
  if (!token || typeof token !== 'string' || token.split('.').length !== 3) return null;
  let header, payload;
  try {
    const [h, p] = token.split('.');
    header = JSON.parse(Buffer.from(h, 'base64url').toString('utf8'));
    payload = JSON.parse(Buffer.from(p, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  let certs;
  try {
    certs = await getGoogleCerts();
  } catch {
    return null;
  }
  const cert = certs && header.kid ? certs[header.kid] : null;
  if (!cert) return null;
  let signatureOk = false;
  try {
    const [h, p, s] = token.split('.');
    signatureOk = crypto.createVerify('RSA-SHA256')
      .update(`${h}.${p}`)
      .verify(crypto.createPublicKey(cert), Buffer.from(s, 'base64url'));
  } catch {
    return null;
  }
  if (!signatureOk) return null;

  const projectId = env.FIREBASE_PROJECT_ID || DEFAULT_PROJECT_ID;
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== projectId) return null;
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) return null;
  if (!payload.sub || typeof payload.sub !== 'string') return null;
  if (typeof payload.exp !== 'number' || payload.exp <= now) return null;
  if (typeof payload.iat === 'number' && payload.iat > now + 300) return null;
  return payload;
}

export function extractToken(req) {
  const headers = req.headers || {};
  const auth = headers.authorization || headers.Authorization || '';
  if (typeof auth === 'string' && /^bearer\s+/i.test(auth)) return auth.replace(/^bearer\s+/i, '').trim();
  const idToken = headers['x-id-token'] || headers['X-Id-Token'];
  if (typeof idToken === 'string' && idToken.trim()) return idToken.trim();
  return null;
}

export function clientIp(req) {
  const headers = req.headers || {};
  const fwd = headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.trim()) return fwd.split(',')[0].trim();
  if (req.ip && typeof req.ip === 'string') return req.ip;
  if (req.socket && req.socket.remoteAddress) return req.socket.remoteAddress;
  return 'local';
}

export async function readJsonBody(req, maxBytes = 12 * 1024 * 1024) {
  if (req.body !== undefined && req.body !== null) {
    if (typeof req.body === 'object') return req.body;
    if (typeof req.body === 'string') {
      if (!req.body.trim()) return {};
      try { return JSON.parse(req.body); } catch { throw httpError(400, 'INVALID_BODY', 'Request body is not valid JSON.'); }
    }
  }
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > maxBytes) throw httpError(413, 'PAYLOAD_TOO_LARGE', 'Request payload is too large.');
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  try {
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } catch {
    throw httpError(400, 'INVALID_BODY', 'Request body is not valid JSON.');
  }
}

export function httpError(status, code, message) {
  const err = new Error(message);
  err.status = status;
  err.code = code;
  return err;
}

export function sendJson(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(body));
}

const buckets = new Map();

export function rateLimit(key, limit, windowMs) {
  const now = Date.now();
  if (buckets.size > 1000) {
    for (const [k, b] of buckets) {
      if (!b.hits.length || now - b.start > windowMs * 2) buckets.delete(k);
    }
  }
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.start > windowMs) {
    bucket = { start: now, hits: [] };
    buckets.set(key, bucket);
  }
  bucket.hits = bucket.hits.filter(t => now - t < windowMs);
  if (bucket.hits.length >= limit) {
    const retryAfter = Math.ceil((bucket.hits[0] + windowMs - now) / 1000);
    return { allowed: false, retryAfter: Math.max(retryAfter, 1) };
  }
  bucket.hits.push(now);
  return { allowed: true, retryAfter: 0 };
}

const ALLOWED_MIME = ['image/png', 'image/jpeg'];

export function normalizeImages(payload) {
  if (!payload || typeof payload !== 'object') return { error: 'Invalid request.' };
  const rawList = Array.isArray(payload.images)
    ? payload.images
    : (payload.image ? [payload.image] : []);
  if (!rawList.length) return { error: 'No screenshot provided. Upload a PNG or JPG image.' };
  if (rawList.length > 4) return { error: 'A maximum of 4 screenshots can be processed at once.' };

  const defaultMime = typeof payload.mimeType === 'string' ? payload.mimeType : '';
  const images = [];
  for (const item of rawList) {
    const isObj = item && typeof item === 'object';
    let b64 = isObj ? item.data : item;
    const mimeRaw = (isObj && item.mimeType) || defaultMime;
    if (typeof b64 !== 'string' || !b64.trim()) return { error: 'One of the screenshots has no image data.' };
    b64 = b64.replace(/^data:[^,]+,/, '').replace(/\s+/g, '');
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(b64)) return { error: 'Screenshot data is not valid base64.' };
    const mime = mimeRaw === 'image/jpg' ? 'image/jpeg' : mimeRaw;
    if (!ALLOWED_MIME.includes(mime)) return { error: `Unsupported image type "${mimeRaw || 'unknown'}". Use PNG or JPG.` };
    const bytes = Buffer.from(b64, 'base64').length;
    if (bytes > 6 * 1024 * 1024) return { error: 'Screenshot is larger than 6MB. Crop or resize it and retry.' };
    if (bytes < 64) return { error: 'Screenshot data looks empty.' };
    images.push({ data: b64, mimeType: mime });
  }
  return { images };
}

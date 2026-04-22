const OUTSTAND_BASE = 'https://api.outstand.so';

function getOutstandKey() {
  return process.env.OUTSTAND_API_KEY || '';
}

/**
 * @param {string} path - e.g. /v1/social-accounts
 * @param {{ method?: string, headers?: Record<string,string>, body?: string }} [opts]
 */
async function outstandRequest(path, opts = {}) {
  const key = getOutstandKey();
  if (!key) {
    const err = new Error('OUTSTAND_API_KEY is not configured');
    err.code = 'NO_KEY';
    throw err;
  }
  const url = path.startsWith('http') ? path : `${OUTSTAND_BASE}${path}`;
  const headers = {
    Authorization: `Bearer ${key}`,
    ...opts.headers,
  };
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

/**
 * Pending/finalize endpoints use session token; docs say no API key — we still send Bearer if configured (some APIs accept both).
 */
async function outstandSessionRequest(path, opts = {}) {
  const url = path.startsWith('http') ? path : `${OUTSTAND_BASE}${path}`;
  const key = getOutstandKey();
  const headers = { ...opts.headers };
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(url, { ...opts, headers });
  const text = await res.text();
  let json = {};
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    json = { raw: text };
  }
  return { ok: res.ok, status: res.status, json };
}

function normalizeRedirectUri(uri) {
  const u = String(uri || '').trim();
  if (!u) return '';
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return '';
    return parsed.toString().replace(/\/$/, '');
  } catch {
    return '';
  }
}

/**
 * @param {string} redirectUri
 * @returns {boolean}
 */
function isRedirectAllowed(redirectUri) {
  const u = normalizeRedirectUri(redirectUri);
  if (!u) return false;
  const fe = (process.env.FRONTEND_ORIGIN || '').trim().replace(/\/$/, '');
  if (fe) return u.startsWith(fe);
  const registered = normalizeRedirectUri(process.env.OUTSTAND_OAUTH_REDIRECT_URI);
  if (registered) {
    try {
      const a = new URL(u);
      const b = new URL(registered);
      return a.origin === b.origin && a.pathname === b.pathname;
    } catch {
      return false;
    }
  }
  return true;
}

module.exports = {
  OUTSTAND_BASE,
  getOutstandKey,
  outstandRequest,
  outstandSessionRequest,
  normalizeRedirectUri,
  isRedirectAllowed,
};

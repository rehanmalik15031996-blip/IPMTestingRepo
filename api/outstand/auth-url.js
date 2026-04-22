const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const { outstandRequest, normalizeRedirectUri, isRedirectAllowed } = require('./_lib');

/**
 * POST /api/outstand/auth-url
 * Body: { network: string, redirectUri?: string }
 * Returns: { success, url }
 */
module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const key = process.env.OUTSTAND_API_KEY;
  if (!key) {
    return res.status(503).json({ message: 'Outstand is not configured. Set OUTSTAND_API_KEY.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const network = String(body.network || '').trim().toLowerCase();
  if (!network) return res.status(400).json({ message: 'network is required' });

  let redirectUri = normalizeRedirectUri(body.redirectUri) || normalizeRedirectUri(process.env.OUTSTAND_OAUTH_REDIRECT_URI);
  if (!redirectUri) {
    return res.status(400).json({
      message: 'redirectUri is required (or set OUTSTAND_OAUTH_REDIRECT_URI). Example: https://your-domain.com/outstand/oauth-callback',
    });
  }
  if (!isRedirectAllowed(redirectUri)) {
    return res.status(400).json({ message: 'redirectUri is not allowed for this deployment (check FRONTEND_ORIGIN).' });
  }

  const { ok, status, json } = await outstandRequest(`/v1/social-networks/${encodeURIComponent(network)}/auth-url`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ redirect_uri: redirectUri }),
  });

  if (!ok) {
    return res.status(status >= 400 ? status : 502).json({
      message: json.error || json.message || 'Outstand auth-url request failed',
      details: json,
    });
  }

  const url = json.data?.url || json.data?.authUrl || json.url || json.data?.href;
  if (!url || typeof url !== 'string') {
    return res.status(502).json({ message: 'Outstand did not return an authorization URL', details: json });
  }

  return res.status(200).json({ success: true, url });
};

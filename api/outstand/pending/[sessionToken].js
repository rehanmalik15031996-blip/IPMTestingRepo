const { handleCors } = require('../../_lib/cors');
const { getUserIdFromRequest } = require('../../_lib/auth');
const { outstandSessionRequest } = require('../_lib');

/**
 * GET /api/outstand/pending/:sessionToken
 * Proxies Outstand GET /v1/social-accounts/pending/:sessionToken
 */
module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const sessionToken = req.query.sessionToken;
  if (!sessionToken || typeof sessionToken !== 'string') {
    return res.status(400).json({ message: 'Missing session token' });
  }

  const { ok, status, json } = await outstandSessionRequest(
    `/v1/social-accounts/pending/${encodeURIComponent(sessionToken)}`,
    { method: 'GET' }
  );

  if (!ok) {
    return res.status(status >= 400 ? status : 502).json({
      message: json.error || json.message || 'Failed to load pending connection',
      details: json,
    });
  }

  return res.status(200).json(json);
};

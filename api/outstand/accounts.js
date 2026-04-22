const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const { outstandRequest } = require('./_lib');

/**
 * GET /api/outstand/accounts
 * Proxies Outstand GET /v1/social-accounts
 */
module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  if (!process.env.OUTSTAND_API_KEY) {
    return res.status(200).json({ success: false, data: [], message: 'Outstand is not configured (OUTSTAND_API_KEY).' });
  }

  const { ok, status, json } = await outstandRequest('/v1/social-accounts', { method: 'GET' });

  if (!ok) {
    return res.status(status >= 400 ? status : 502).json({
      message: json.error || json.message || 'Failed to list social accounts',
      details: json,
      data: [],
    });
  }

  const data = Array.isArray(json.data) ? json.data : json.data ? [json.data] : [];
  return res.status(200).json({ success: json.success !== false, data });
};

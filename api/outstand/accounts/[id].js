const { handleCors } = require('../../_lib/cors');
const { getUserIdFromRequest } = require('../../_lib/auth');
const { outstandRequest } = require('../_lib');

/**
 * DELETE /api/outstand/accounts/:id
 * Proxies Outstand DELETE /v1/social-accounts/:id
 */
module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'DELETE') return res.status(405).json({ message: 'Method not allowed' });

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const id = req.query.id;
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ message: 'Missing account id' });
  }

  if (!process.env.OUTSTAND_API_KEY) {
    return res.status(503).json({ message: 'Outstand is not configured.' });
  }

  const { ok, status, json } = await outstandRequest(`/v1/social-accounts/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });

  if (!ok) {
    return res.status(status >= 400 ? status : 502).json({
      message: json.error || json.message || 'Failed to disconnect account',
      details: json,
    });
  }

  return res.status(200).json(json);
};

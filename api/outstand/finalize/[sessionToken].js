const { handleCors } = require('../../_lib/cors');
const { getUserIdFromRequest } = require('../../_lib/auth');
const { outstandSessionRequest } = require('../_lib');

/**
 * POST /api/outstand/finalize/:sessionToken
 * Body: { selectedPageIds: string[] }
 */
module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const sessionToken = req.query.sessionToken;
  if (!sessionToken || typeof sessionToken !== 'string') {
    return res.status(400).json({ message: 'Missing session token' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const selectedPageIds = Array.isArray(body.selectedPageIds) ? body.selectedPageIds.map(String) : [];

  const { ok, status, json } = await outstandSessionRequest(
    `/v1/social-accounts/pending/${encodeURIComponent(sessionToken)}/finalize`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ selectedPageIds }),
    }
  );

  if (!ok) {
    return res.status(status >= 400 ? status : 502).json({
      message: json.error || json.message || 'Finalize failed',
      details: json,
    });
  }

  return res.status(200).json(json);
};

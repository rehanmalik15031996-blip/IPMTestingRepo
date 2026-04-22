const { handleCors } = require('../../../../_lib/cors');
const { requireAgencyUser, ensureIntegrations, integrationStatusPayload } = require('../../_helpers');
const User = require('../../../../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const { clientId, clientSecret, redirectUri } = req.body || {};
    const cid = String(clientId || '').trim();
    const secret = String(clientSecret || '').trim();
    const redir = String(redirectUri || '').trim();
    if (!cid || !secret || !redir) return res.status(400).json({ message: 'clientId, clientSecret, and redirectUri are required' });
    const user = await User.findById(agencyUser._id);
    ensureIntegrations(user);
    const prev = user.agencyStats.integrations.hubspot || {};
    user.agencyStats.integrations.hubspot = { ...prev, oauthApp: { clientId: cid, clientSecret: secret, redirectUri: redir }, oauthAppUpdatedAt: new Date().toISOString() };
    user.markModified('agencyStats');
    await user.save();
    res.json({ success: true, status: integrationStatusPayload(user), message: 'OAuth app credentials saved.' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

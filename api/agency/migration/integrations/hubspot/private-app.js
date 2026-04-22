const { handleCors } = require('../../../../_lib/cors');
const { requireAgencyUser, ensureIntegrations, integrationStatusPayload, verifyHubspotPrivateAppToken } = require('../../_helpers');
const User = require('../../../../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const accessToken = String((req.body || {}).accessToken || '').trim();
    if (!accessToken) return res.status(400).json({ message: 'accessToken is required' });
    const { portalId } = await verifyHubspotPrivateAppToken(accessToken);
    const user = await User.findById(agencyUser._id);
    ensureIntegrations(user);
    const prev = user.agencyStats.integrations.hubspot || {};
    user.agencyStats.integrations.hubspot = {
      ...prev, privateAppAccessToken: accessToken, portalId: portalId || prev.portalId || null,
      privateAppConnectedAt: new Date().toISOString(),
    };
    delete user.agencyStats.integrations.hubspot.oauthAccessToken;
    delete user.agencyStats.integrations.hubspot.oauthRefreshToken;
    delete user.agencyStats.integrations.hubspot.oauthExpiresAt;
    user.markModified('agencyStats');
    await user.save();
    res.json({ success: true, status: integrationStatusPayload(user), message: 'HubSpot private app token saved and verified.' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'Failed to connect HubSpot' });
  }
};

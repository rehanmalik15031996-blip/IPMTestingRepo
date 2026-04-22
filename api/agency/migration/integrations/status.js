const connectDB = require('../../../_lib/mongodb');
const { handleCors } = require('../../../_lib/cors');
const { getUserIdFromRequest } = require('../../../_lib/auth');
const User = require('../../../../server/models/User');

function ensureIntegrations(user) {
  if (!user.agencyStats) user.agencyStats = {};
  if (!user.agencyStats.migrationImports || typeof user.agencyStats.migrationImports !== 'object') {
    user.agencyStats.migrationImports = { hubspot: [], propdata: [] };
  }
  if (!user.agencyStats.integrations || typeof user.agencyStats.integrations !== 'object') {
    user.agencyStats.integrations = { hubspot: {}, propdata: {} };
  }
  ['hubspot', 'propdata'].forEach((k) => {
    if (!user.agencyStats.integrations[k] || typeof user.agencyStats.integrations[k] !== 'object') {
      user.agencyStats.integrations[k] = {};
    }
  });
}

function integrationStatusPayload(user) {
  ensureIntegrations(user);
  const h = user.agencyStats.integrations.hubspot;
  const p = user.agencyStats.integrations.propdata;
  return {
    hubspot: {
      privateAppConnected: !!h.privateAppAccessToken,
      oauthConnected: !!(h.oauthRefreshToken || h.oauthAccessToken),
      oauthAppConfigured: !!(h.oauthApp && h.oauthApp.clientId && h.oauthApp.clientSecret && h.oauthApp.redirectUri),
      portalId: h.portalId || null,
    },
    propdata: {
      connected: !!p.bearerToken,
      vendorEmail: p.vendorEmail || null,
    },
  };
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  await connectDB();

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (String(user.role || '').toLowerCase() !== 'agency') {
    return res.status(403).json({ message: 'Only agency accounts can use migration tools' });
  }

  return res.json({ success: true, status: integrationStatusPayload(user) });
};

const connectDB = require('../../_lib/mongodb');
const { getUserIdFromRequest } = require('../../_lib/auth');
const User = require('../../../server/models/User');

async function requireAgencyUser(req, res) {
  const userId = getUserIdFromRequest(req, res);
  if (!userId) return null;
  await connectDB();
  const user = await User.findById(userId);
  if (!user) { res.status(404).json({ message: 'User not found' }); return null; }
  if (String(user.role || '').toLowerCase() !== 'agency') {
    res.status(403).json({ message: 'Only agency accounts can use migration tools' });
    return null;
  }
  return user;
}

function ensureMigrationImports(user) {
  if (!user.agencyStats) user.agencyStats = {};
  if (!user.agencyStats.migrationImports || typeof user.agencyStats.migrationImports !== 'object') {
    user.agencyStats.migrationImports = { hubspot: [], propdata: [] };
  }
  if (!Array.isArray(user.agencyStats.migrationImports.hubspot)) user.agencyStats.migrationImports.hubspot = [];
  if (!Array.isArray(user.agencyStats.migrationImports.propdata)) user.agencyStats.migrationImports.propdata = [];
}

function ensureIntegrations(user) {
  ensureMigrationImports(user);
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
    migrationFiles: {
      hubspot: (user.agencyStats.migrationImports.hubspot || []).length,
      propdata: (user.agencyStats.migrationImports.propdata || []).length,
    },
  };
}

async function verifyHubspotPrivateAppToken(accessToken) {
  const crmRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const crmText = await crmRes.text();
  if (crmRes.ok) {
    let portalId = null;
    try {
      const infoRes = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken);
      if (infoRes.ok) { const info = await infoRes.json(); portalId = info.hub_id != null ? String(info.hub_id) : null; }
    } catch { /* non-critical */ }
    return { portalId };
  }
  const acctRes = await fetch('https://api.hubapi.com/account-info/v3/details', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (acctRes.ok) { const data = await acctRes.json(); return { portalId: data.portalId != null ? String(data.portalId) : null }; }
  let msg = 'HubSpot rejected this token.';
  try { const j = JSON.parse(crmText); if (j.message) msg = j.message; } catch { /* ignore */ }
  throw new Error(msg);
}

async function propdataExchangeCredentials(username, password) {
  const basic = Buffer.from(`${String(username).trim()}:${String(password)}`, 'utf8').toString('base64');
  const res = await fetch('https://api-gw.propdata.net/users/public-api/login/', {
    method: 'GET', headers: { Authorization: `Basic ${basic}` },
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error('PropData login did not return JSON.'); }
  if (!res.ok) throw new Error(data.message || data.detail || `PropData login failed (${res.status})`);
  const token = Array.isArray(data.clients) && data.clients[0] && data.clients[0].token;
  if (!token) throw new Error('PropData response did not include clients[0].token.');
  return { bearerToken: token, vendorUserId: data.id != null ? data.id : null, vendorEmail: data.email || null };
}

module.exports = {
  requireAgencyUser,
  ensureMigrationImports,
  ensureIntegrations,
  integrationStatusPayload,
  verifyHubspotPrivateAppToken,
  propdataExchangeCredentials,
};

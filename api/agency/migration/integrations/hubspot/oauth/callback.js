const jwt = require('jsonwebtoken');
const connectDB = require('../../../../../_lib/mongodb');
const { handleCors } = require('../../../../../_lib/cors');
const { ensureIntegrations } = require('../../../_helpers');
const User = require('../../../../../../server/models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_123';
const CLIENT_APP_URL = (process.env.CLIENT_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  try {
    await connectDB();
    const code = req.query.code;
    const state = req.query.state;
    if (!code || !state) return res.status(400).send('Missing code or state');
    let payload;
    try { payload = jwt.verify(String(state), JWT_SECRET); } catch { return res.status(400).send('Invalid or expired state'); }
    if (payload.typ !== 'hubspot_oauth' || !payload.sub) return res.status(400).send('Invalid state');
    const user = await User.findById(payload.sub);
    if (!user) return res.status(404).send('User not found');
    ensureIntegrations(user);
    const app = user.agencyStats.integrations.hubspot.oauthApp;
    if (!app || !app.clientSecret) return res.status(400).send('OAuth app not configured');
    const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
      method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ grant_type: 'authorization_code', client_id: app.clientId, client_secret: app.clientSecret, redirect_uri: app.redirectUri, code: String(code) }),
    });
    const tokenText = await tokenRes.text();
    let tokenJson;
    try { tokenJson = JSON.parse(tokenText); } catch { return res.status(502).send('HubSpot token response was not JSON'); }
    if (!tokenRes.ok) return res.status(400).send(tokenJson.message || 'Token exchange failed');
    const expiresIn = Number(tokenJson.expires_in) || 3600;
    const prev = user.agencyStats.integrations.hubspot || {};
    user.agencyStats.integrations.hubspot = { ...prev, oauthAccessToken: tokenJson.access_token, oauthRefreshToken: tokenJson.refresh_token || prev.oauthRefreshToken, oauthExpiresAt: Date.now() + expiresIn * 1000, oauthConnectedAt: new Date().toISOString() };
    delete user.agencyStats.integrations.hubspot.privateAppAccessToken;
    user.markModified('agencyStats');
    await user.save();
    res.redirect(`${CLIENT_APP_URL}/settings?tab=integrations&hubspot=oauth_ok`);
  } catch (err) {
    res.status(500).send(err.message || 'OAuth error');
  }
};

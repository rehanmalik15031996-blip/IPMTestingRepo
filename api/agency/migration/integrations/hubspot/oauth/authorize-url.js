const jwt = require('jsonwebtoken');
const { handleCors } = require('../../../../../_lib/cors');
const { requireAgencyUser, ensureIntegrations } = require('../../../_helpers');
const User = require('../../../../../../server/models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_123';
const HUBSPOT_OAUTH_SCOPES = ['crm.objects.contacts.read','crm.objects.contacts.write','crm.objects.deals.read','crm.objects.deals.write','crm.objects.companies.read'].join(' ');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const user = await User.findById(agencyUser._id);
    ensureIntegrations(user);
    const app = user.agencyStats.integrations.hubspot.oauthApp;
    if (!app || !app.clientId || !app.redirectUri) return res.status(400).json({ message: 'Save OAuth app credentials first.' });
    const state = jwt.sign({ sub: String(user._id), typ: 'hubspot_oauth' }, JWT_SECRET, { expiresIn: '15m' });
    const qs = new URLSearchParams({ client_id: app.clientId, redirect_uri: app.redirectUri, scope: HUBSPOT_OAUTH_SCOPES, state });
    res.json({ success: true, url: `https://app.hubspot.com/oauth/authorize?${qs.toString()}` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

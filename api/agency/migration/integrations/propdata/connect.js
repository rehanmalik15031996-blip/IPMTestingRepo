const { handleCors } = require('../../../../_lib/cors');
const { requireAgencyUser, ensureIntegrations, integrationStatusPayload, propdataExchangeCredentials } = require('../../_helpers');
const User = require('../../../../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const { username, password } = req.body || {};
    const un = String(username || '').trim();
    const pw = String(password || '');
    if (!un || !pw) return res.status(400).json({ message: 'username and password are required' });
    const out = await propdataExchangeCredentials(un, pw);
    const user = await User.findById(agencyUser._id);
    ensureIntegrations(user);
    user.agencyStats.integrations.propdata = { bearerToken: out.bearerToken, vendorUserId: out.vendorUserId, vendorEmail: out.vendorEmail, connectedAt: new Date().toISOString() };
    user.markModified('agencyStats');
    await user.save();
    res.json({ success: true, status: integrationStatusPayload(user), message: 'PropData credentials verified.' });
  } catch (err) {
    res.status(400).json({ message: err.message || 'PropData connection failed' });
  }
};

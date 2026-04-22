const { handleCors } = require('../../../_lib/cors');
const { requireAgencyUser, ensureIntegrations, integrationStatusPayload } = require('../_helpers');
const User = require('../../../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  const agencyUser = await requireAgencyUser(req, res);
  if (!agencyUser) return;
  try {
    const provider = String((req.body || {}).provider || '').toLowerCase();
    if (!['hubspot', 'propdata'].includes(provider)) return res.status(400).json({ message: 'provider must be hubspot or propdata' });
    const user = await User.findById(agencyUser._id);
    ensureIntegrations(user);
    if (provider === 'hubspot') user.agencyStats.integrations.hubspot = {};
    else user.agencyStats.integrations.propdata = {};
    user.markModified('agencyStats');
    await user.save();
    res.json({ success: true, status: integrationStatusPayload(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

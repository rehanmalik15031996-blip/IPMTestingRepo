const connectDB = require('../_lib/mongodb');
const AgencyInvite = require('../../server/models/AgencyInvite');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const token = req.query.token ? String(req.query.token).trim() : null;
  const pin = req.query.pin != null ? String(req.query.pin).replace(/\D/g, '').slice(0, 4) : null;
  if (!token && !pin) return res.status(400).json({ valid: false, error: 'Token or PIN required' });
  if (pin && pin.length !== 4) return res.status(400).json({ valid: false, error: 'PIN must be 4 digits' });

  try {
    await connectDB();
    const invite = token
      ? await AgencyInvite.findOne({ token, used: false })
      : await AgencyInvite.findOne({ pin: pin, used: false });
    if (!invite) return res.status(404).json({ valid: false, error: 'Invalid or expired PIN. Please check the code from your invite email.' });
    if (new Date() > invite.expiresAt) return res.status(410).json({ valid: false, error: 'Invite expired' });

    return res.status(200).json({
      valid: true,
      token: invite.token,
      email: invite.email,
      firstName: invite.firstName || '',
      lastName: invite.lastName || '',
      agencyName: invite.agencyName,
      branchName: invite.branchName,
      branchId: invite.branchId,
      agencyId: invite.agencyId,
      allowMarketingCampaigns: Boolean(invite.allowMarketingCampaigns)
    });
  } catch (err) {
    console.error('Agency invite lookup error:', err);
    return res.status(500).json({ valid: false, error: err.message });
  }
};

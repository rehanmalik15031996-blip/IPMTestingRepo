const crypto = require('crypto');
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');
const EnterpriseInvite = require('../../server/models/EnterpriseInvite');

function sendEnterpriseInviteEmail(toEmail, enterpriseName, token) {
  const sendUrl = process.env.SEND_AGENT_INVITE_URL || process.env.GOOGLE_SEND_OTP_URL;
  if (!sendUrl) return;
  const origin = process.env.FRONTEND_ORIGIN
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'https://www.internationalpropertymarket.com');
  const inviteLink = `${origin}/enterprise/invites?token=${token}`;
  fetch(sendUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: toEmail,
      enterpriseName,
      inviteLink,
      type: 'enterprise-invite',
    }),
  }).catch((err) => console.error('Enterprise invite email error:', err));
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  await connectDB();

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const enterprise = await User.findById(userId).lean();
  if (!enterprise || String(enterprise.role).toLowerCase() !== 'enterprise') {
    return res.status(403).json({ message: 'Enterprise role required.' });
  }

  const { inviteId, newEmail } = req.body || {};
  if (!inviteId) return res.status(400).json({ message: 'inviteId is required.' });

  const invite = await EnterpriseInvite.findOne({ _id: inviteId, enterpriseId: enterprise._id });
  if (!invite) return res.status(404).json({ message: 'Invite not found.' });

  if (newEmail && newEmail.trim()) {
    invite.agencyEmail = newEmail.toLowerCase().trim();
    invite.agencyId = null;
    const existingAgency = await User.findOne({ email: invite.agencyEmail, role: 'agency' });
    if (existingAgency) invite.agencyId = existingAgency._id;
  }

  invite.token = crypto.randomUUID();
  invite.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  invite.accepted = false;
  invite.declined = false;
  await invite.save();

  sendEnterpriseInviteEmail(invite.agencyEmail, enterprise.agencyName || enterprise.name, invite.token);

  return res.status(200).json({
    success: true,
    message: `Invite resent to ${invite.agencyEmail}.`,
  });
};

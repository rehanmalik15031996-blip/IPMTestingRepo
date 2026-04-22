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

  const enterprise = await User.findById(userId);
  if (!enterprise || String(enterprise.role).toLowerCase() !== 'enterprise') {
    return res.status(403).json({ message: 'Enterprise role required.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { agencyEmail, agencyId, name: linkName, type: linkType } = body;

  if (!agencyEmail && !agencyId) {
    return res.status(400).json({ message: 'Provide agencyEmail or agencyId to link.' });
  }

  let agency = null;
  if (agencyId) {
    agency = await User.findById(agencyId);
  } else if (agencyEmail) {
    agency = await User.findOne({ email: agencyEmail.toLowerCase().trim(), role: 'agency' });
  }

  const entityLabel = linkType === 'branch' ? 'branch' : 'franchise';

  if (!agency) {
    if (!agencyEmail) return res.status(404).json({ message: 'Franchise / branch not found.' });
    const token = crypto.randomUUID();
    const invite = new EnterpriseInvite({
      token,
      enterpriseId: enterprise._id,
      enterpriseName: enterprise.agencyName || enterprise.name,
      agencyEmail: agencyEmail.toLowerCase().trim(),
      agencyName: linkName || '',
      type: agencyId ? 'link' : 'new',
      linkType: entityLabel,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    await invite.save();

    sendEnterpriseInviteEmail(agencyEmail.toLowerCase().trim(), enterprise.agencyName || enterprise.name, token);

    return res.status(200).json({
      success: true,
      pending: true,
      message: `No ${entityLabel} found with that email. An invite has been created — when they register using ${agencyEmail}, they can accept the link.`,
      inviteToken: token,
    });
  }

  if (agency.enterpriseId && String(agency.enterpriseId) !== String(enterprise._id)) {
    return res.status(409).json({ message: `${agency.agencyName || agency.name} already belongs to another enterprise.` });
  }
  if (agency.enterpriseId && String(agency.enterpriseId) === String(enterprise._id)) {
    return res.status(200).json({ success: true, message: 'This franchise is already linked to your enterprise.' });
  }

  const token = crypto.randomUUID();
  const invite = new EnterpriseInvite({
    token,
    enterpriseId: enterprise._id,
    enterpriseName: enterprise.agencyName || enterprise.name,
    agencyEmail: agency.email,
    agencyId: agency._id,
    agencyName: linkName || agency.agencyName || agency.name,
    type: 'link',
    linkType: entityLabel,
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });
  await invite.save();

  sendEnterpriseInviteEmail(agency.email, enterprise.agencyName || enterprise.name, token);

  return res.status(200).json({
    success: true,
    pending: true,
    message: `Invite sent to ${linkName || agency.agencyName || agency.name} (${agency.email}). They must accept before the link is active.`,
    inviteToken: token,
    agencyName: linkName || agency.agencyName || agency.name,
  });
};

const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');
const EnterpriseInvite = require('../../server/models/EnterpriseInvite');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });
  await connectDB();

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const agency = await User.findById(userId);
  if (!agency || String(agency.role).toLowerCase() !== 'agency') {
    return res.status(403).json({ message: 'Agency role required to accept enterprise invites.' });
  }

  const body = req.body && typeof req.body === 'object' ? req.body : {};
  const { token } = body;
  if (!token) return res.status(400).json({ message: 'Invite token is required.' });

  const invite = await EnterpriseInvite.findOne({ token, accepted: false, declined: false });
  if (!invite) return res.status(404).json({ message: 'Invite not found or already used.' });
  if (new Date() > invite.expiresAt) return res.status(410).json({ message: 'Invite has expired.' });

  if (invite.agencyId && String(invite.agencyId) !== String(agency._id)) {
    return res.status(403).json({ message: 'This invite is for a different agency.' });
  }
  if (invite.agencyEmail && invite.agencyEmail.toLowerCase() !== agency.email.toLowerCase()) {
    return res.status(403).json({ message: 'This invite is for a different email address.' });
  }

  if (agency.enterpriseId && String(agency.enterpriseId) !== String(invite.enterpriseId)) {
    return res.status(409).json({ message: 'Your agency already belongs to another enterprise.' });
  }

  const enterprise = await User.findById(invite.enterpriseId);
  if (!enterprise || String(enterprise.role).toLowerCase() !== 'enterprise') {
    return res.status(404).json({ message: 'Enterprise no longer exists.' });
  }

  agency.enterpriseId = enterprise._id;
  agency.enterpriseName = enterprise.agencyName || enterprise.name;
  await agency.save();

  if (!enterprise.enterpriseStats) enterprise.enterpriseStats = { agencies: [] };
  const already = (enterprise.enterpriseStats.agencies || []).some((a) => String(a._id) === String(agency._id));
  if (!already) {
    enterprise.enterpriseStats.agencies.push({
      _id: agency._id,
      name: agency.agencyName || agency.name,
      branchCount: (agency.agencyStats?.branches || []).length || 1,
      agentCount: (agency.agencyStats?.topAgents || []).filter((t) => t.status === 'active').length,
      status: 'active',
      linkedAt: new Date(),
    });
    enterprise.markModified('enterpriseStats');
    await enterprise.save();
  }

  invite.accepted = true;
  invite.agencyId = agency._id;
  invite.agencyName = agency.agencyName || agency.name;
  await invite.save();

  return res.status(200).json({
    success: true,
    message: `Your agency is now part of ${enterprise.agencyName || enterprise.name}.`,
    enterpriseName: enterprise.agencyName || enterprise.name,
  });
};

const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  await connectDB();
  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const me = await User.findById(userId).select('role agencyId enterpriseId').lean();
  if (!me) return res.status(404).json({ message: 'User not found' });

  const role = String(me.role || '').toLowerCase();
  const orClauses = [];

  if (role === 'enterprise') {
    // Enterprise user: find all agencies/agents linked to this enterprise
    orClauses.push({ enterpriseId: userId });

    // Also find agents under those agencies (two-hop)
    const linkedAgencies = await User.find({ enterpriseId: userId })
      .select('_id')
      .lean();
    const agencyIds = linkedAgencies.map(a => a._id);
    if (agencyIds.length) {
      orClauses.push({ agencyId: { $in: agencyIds } });
    }
  }

  if (role === 'agency') {
    // Agency user: find all agents under this agency + enterprise parent
    orClauses.push({ agencyId: userId });
    if (me.enterpriseId) {
      orClauses.push({ enterpriseId: me.enterpriseId });
    }
  }

  if (['agent', 'independent_agent', 'agency_agent'].includes(role)) {
    // Agent: find other agents in same agency + the agency itself
    if (me.agencyId) {
      orClauses.push({ _id: me.agencyId });
      orClauses.push({ agencyId: me.agencyId });
    }
    if (me.enterpriseId) {
      orClauses.push({ _id: me.enterpriseId });
    }
  }

  if (role === 'partner') {
    // Partners: can message agencies and agents they work with,
    // plus other partners and enterprise users in their network
    if (me.enterpriseId) {
      orClauses.push({ _id: me.enterpriseId });
      orClauses.push({ enterpriseId: me.enterpriseId });
    }
    if (me.agencyId) {
      orClauses.push({ _id: me.agencyId });
      orClauses.push({ agencyId: me.agencyId });
    }
    // Also show all agencies and agents on the platform for partner outreach
    orClauses.push({ role: { $in: ['agency', 'agent', 'independent_agent', 'agency_agent'] } });
  }

  // Fallback for any other role with an agencyId or enterpriseId
  if (!orClauses.length) {
    if (me.agencyId) {
      orClauses.push({ _id: me.agencyId });
      orClauses.push({ agencyId: me.agencyId });
    }
    if (me.enterpriseId) {
      orClauses.push({ enterpriseId: me.enterpriseId });
    }
  }

  if (!orClauses.length) {
    return res.status(200).json({ success: true, contacts: [] });
  }

  const contacts = await User.find({
    $or: orClauses,
    _id: { $ne: userId },
  })
    .select('name email photo role agencyName')
    .sort({ name: 1 })
    .limit(200)
    .lean();

  return res.status(200).json({ success: true, contacts });
};

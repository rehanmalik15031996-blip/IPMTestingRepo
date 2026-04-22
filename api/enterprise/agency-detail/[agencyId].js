const connectDB = require('../../_lib/mongodb');
const { handleCors } = require('../../_lib/cors');
const { getUserIdFromRequest } = require('../../_lib/auth');
const User = require('../../../server/models/User');
const Property = require('../../../server/models/Property');

/**
 * Enterprise-level agency detail — aggregated performance only, NO PII.
 * Enterprise sees: sales volume, listing activity, agent headcount, lead counts by type.
 * Enterprise does NOT see: client names/emails/phones, lead notes, agent personal contact info.
 */
module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  await connectDB();

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const enterprise = await User.findById(userId);
  if (!enterprise || String(enterprise.role).toLowerCase() !== 'enterprise') {
    return res.status(403).json({ message: 'Enterprise role required.' });
  }

  const agencyId = req.query.agencyId;
  if (!agencyId) return res.status(400).json({ message: 'agencyId is required.' });

  const agency = await User.findById(agencyId).lean();
  if (!agency || String(agency.role).toLowerCase() !== 'agency') {
    return res.status(404).json({ message: 'Agency not found.' });
  }
  if (!agency.enterpriseId || String(agency.enterpriseId) !== String(enterprise._id)) {
    return res.status(403).json({ message: 'This agency does not belong to your enterprise.' });
  }

  const agents = await User.find({ agencyId: agency._id, role: 'agency_agent' })
    .select('name branchId branchName agentTier agentScore agentStats.activeListings agentStats.pendingDeals status')
    .lean();

  const allIds = [String(agency._id), ...agents.map((a) => String(a._id))];
  const listings = await Property.find({
    $or: [
      { userId: { $in: allIds } },
      { agentId: { $in: agents.map((a) => a._id) } },
    ],
  })
    .select('title listingType status price location ipmScore createdAt')
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  const activeListings = listings.filter((l) => (l.status || '').toLowerCase() === 'active').length;
  const soldListings = listings.filter((l) => (l.status || '').toLowerCase() === 'sold').length;

  // Aggregated lead stats — counts and breakdowns, NO names/emails/phones
  const crmLeads = agency.agencyStats?.crmLeads || [];
  const leadsByType = { buyer: 0, seller: 0, investor: 0, other: 0 };
  const leadsByStatus = {};
  for (const l of crmLeads) {
    const t = (l.leadType || '').toLowerCase();
    if (t === 'buyer') leadsByType.buyer++;
    else if (t === 'seller') leadsByType.seller++;
    else if (t === 'investor') leadsByType.investor++;
    else leadsByType.other++;
    const s = l.status || 'Unknown';
    leadsByStatus[s] = (leadsByStatus[s] || 0) + 1;
  }

  // Agent summary — headcount by tier and branch, NO personal info
  const agentsByBranch = {};
  const agentsByTier = { silver: 0, gold: 0, platinum: 0, unranked: 0 };
  for (const a of agents) {
    const branch = a.branchName || 'Main HQ';
    agentsByBranch[branch] = (agentsByBranch[branch] || 0) + 1;
    const tier = (a.agentTier || '').toLowerCase();
    if (tier === 'silver' || tier === 'gold' || tier === 'platinum') agentsByTier[tier]++;
    else agentsByTier.unranked++;
  }

  // Listings visible to enterprise (public listing data only — no client/buyer info)
  const sanitizedListings = listings.map((l) => ({
    _id: l._id,
    title: l.title,
    listingType: l.listingType,
    status: l.status,
    price: l.price,
    location: l.location,
    ipmScore: l.ipmScore,
    createdAt: l.createdAt,
  }));

  const branchesList = (agency.agencyStats?.branches || []).map((b) => ({ name: b.name, address: b.address }));
  const agentsList = agents.map((a) => ({
    name: a.name || '—',
    tier: a.agentTier || null,
    score: a.agentScore || null,
    branch: a.branchName || 'Main HQ',
    status: a.status || 'active',
  }));

  return res.status(200).json({
    success: true,
    agency: {
      _id: agency._id,
      name: agency.agencyName || agency.name,
      logo: agency.logo,
      location: agency.location,
      branches: branchesList,
    },
    branches: branchesList,
    agents: agentsList,
    leadSummary: leadsByType,
    performance: {
      revenue: agency.agencyStats?.totalRevenue || 0,
      propertiesSold: agency.agencyStats?.propertiesSold || 0,
      totalListings: listings.length,
      activeListings,
      soldListings,
      totalAgents: agents.length,
      totalLeads: crmLeads.length,
    },
    agentsByBranch,
    agentsByTier,
    leadsByType,
    leadsByStatus,
    listings: sanitizedListings,
  });
};

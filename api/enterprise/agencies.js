const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  await connectDB();

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const enterprise = await User.findById(userId);
  if (!enterprise || String(enterprise.role).toLowerCase() !== 'enterprise') {
    return res.status(403).json({ message: 'Enterprise role required.' });
  }

  if (req.method === 'GET') {
    const agencies = await User.find({ enterpriseId: enterprise._id, role: 'agency' })
      .select('name agencyName logo location agencyStats.branches agencyStats.topAgents agencyStats.totalRevenue agencyStats.propertiesSold agencyStats.totalListings agencyStats.crmLeads')
      .lean();

    const result = agencies.map((a) => ({
      _id: a._id,
      name: a.agencyName || a.name,
      logo: a.logo,
      location: a.location,
      branchCount: (a.agencyStats?.branches || []).length || 1,
      agentCount: (a.agencyStats?.topAgents || []).filter((t) => t.status === 'active').length,
      branches: (a.agencyStats?.branches || []).map((b) => ({ name: b.name, address: b.address })),
      revenue: a.agencyStats?.totalRevenue || 0,
      propertiesSold: a.agencyStats?.propertiesSold || 0,
      listingCount: a.agencyStats?.totalListings || 0,
      leadCount: (a.agencyStats?.crmLeads || []).length,
    }));

    return res.status(200).json({ success: true, agencies: result });
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

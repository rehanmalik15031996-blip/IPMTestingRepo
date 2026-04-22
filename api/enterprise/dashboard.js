const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
  await connectDB();

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const enterprise = await User.findById(userId).lean();
  if (!enterprise || String(enterprise.role).toLowerCase() !== 'enterprise') {
    return res.status(403).json({ message: 'Enterprise role required.' });
  }

  const royaltyDefaults = enterprise.enterpriseStats?.royaltyDefaults || {};
  const defaultRates = {
    branchToFranchise: royaltyDefaults.branchToFranchise ?? 3,
    franchiseToCountry: royaltyDefaults.franchiseToCountry ?? 5,
    countryToHq: royaltyDefaults.countryToHq ?? 1.5,
  };
  const enterpriseAgencyConfigs = enterprise.enterpriseStats?.agencies || [];

  const agencies = await User.find({ enterpriseId: enterprise._id, role: 'agency' }).lean();
  const agencyIds = agencies.map((a) => a._id);

  // Use agencyStats as the source of truth (matches Franchises & Branches page)
  let totalLeads = 0;
  let totalRevenue = 0;
  let totalPropertiesSold = 0;
  let totalAgentCount = 0;
  let totalListingCount = 0;
  let totalBranchCount = 0;
  for (const a of agencies) {
    const stats = a.agencyStats || {};
    totalLeads += (stats.crmLeads || []).length;
    totalRevenue += stats.totalRevenue || 0;
    totalPropertiesSold += stats.propertiesSold || 0;
    totalAgentCount += (stats.topAgents || []).filter((t) => t.status === 'active').length;
    totalListingCount += stats.totalListings || 0;
    totalBranchCount += (stats.branches || []).length || 1;
  }

  const now = new Date();

  // Leaderboard
  const leaderboard = agencies
    .map((a) => {
      const stats = a.agencyStats || {};
      return {
        _id: a._id,
        name: a.agencyName || a.name,
        logo: a.logo,
        location: a.location,
        branchCount: (stats.branches || []).length || 1,
        agentCount: (stats.topAgents || []).filter((t) => t.status === 'active').length,
        revenue: stats.totalRevenue || 0,
        propertiesSold: stats.propertiesSold || 0,
        leadCount: (stats.crmLeads || []).length,
        listingCount: stats.totalListings || 0,
        activeAgents: (stats.topAgents || []).filter((t) => t.status === 'active').length,
      };
    })
    .sort((a, b) => b.revenue - a.revenue);

  // Lead breakdown by type
  const leadsByType = { buyer: 0, seller: 0, investor: 0, other: 0 };
  for (const a of agencies) {
    for (const l of a.agencyStats?.crmLeads || []) {
      const t = (l.leadType || l.type || '').toLowerCase();
      if (t === 'buyer') leadsByType.buyer++;
      else if (t === 'seller') leadsByType.seller++;
      else if (t === 'investor') leadsByType.investor++;
      else leadsByType.other++;
    }
  }

  // Listing breakdown by type
  const listingsByType = {};
  for (const a of agencies) {
    const lt = a.agencyStats?.listingsByType || {};
    for (const [k, v] of Object.entries(lt)) {
      listingsByType[k] = (listingsByType[k] || 0) + (v || 0);
    }
  }

  // --- Performance by Country ---
  const byCountry = {};
  for (const a of agencies) {
    const stats = a.agencyStats || {};
    const rawLoc = (a.location || '').trim();
    const parts = rawLoc.split(',').map((p) => p.trim()).filter(Boolean);
    const country = (parts.length > 0 ? parts[parts.length - 1] : '') || 'Unknown';
    if (!byCountry[country]) byCountry[country] = { country, franchises: 0, branches: 0, agents: 0, gtv: 0, activeListings: 0, leads: 0 };
    byCountry[country].franchises += 1;
    byCountry[country].branches += (stats.branches || []).length || 1;
    byCountry[country].agents += (stats.topAgents || []).filter((t) => t.status === 'active').length;
    byCountry[country].gtv += stats.totalRevenue || 0;
    byCountry[country].activeListings += stats.totalListings || 0;
    byCountry[country].leads += (stats.crmLeads || []).length;
  }
  const performanceByCountry = Object.values(byCountry).sort((a, b) => b.gtv - a.gtv);

  // --- Performance by Franchise (agency) ---
  const performanceByFranchise = agencies.map((a) => {
    const stats = a.agencyStats || {};
    const topAgents = stats.topAgents || [];
    const ab = stats.branches || [];
    const agencyConf = enterpriseAgencyConfigs.find((c) => String(c._id) === String(a._id));
    const rates = {
      branchToFranchise: agencyConf?.royaltyRates?.branchToFranchise ?? defaultRates.branchToFranchise,
      franchiseToCountry: agencyConf?.royaltyRates?.franchiseToCountry ?? defaultRates.franchiseToCountry,
      countryToHq: agencyConf?.royaltyRates?.countryToHq ?? defaultRates.countryToHq,
    };
    const gtv = stats.totalRevenue || 0;
    return {
      _id: a._id,
      name: a.agencyName || a.name,
      location: a.location || '',
      branches: ab.length || 1,
      agents: topAgents.filter((t) => t.status === 'active').length,
      gtv,
      activeListings: stats.totalListings || 0,
      leads: (stats.crmLeads || []).length,
      propertiesSold: stats.propertiesSold || 0,
      royaltyRates: rates,
      royalties: {
        branchToFranchise: gtv * (rates.branchToFranchise / 100),
        franchiseToCountry: gtv * (rates.franchiseToCountry / 100),
        countryToHq: gtv * (rates.countryToHq / 100),
        total: gtv * ((rates.branchToFranchise + rates.franchiseToCountry + rates.countryToHq) / 100),
      },
    };
  }).sort((a, b) => b.gtv - a.gtv);

  // --- Performance by Branch ---
  const branchRows = [];
  for (const a of agencies) {
    const stats = a.agencyStats || {};
    const ab = stats.branches || [];
    const topAgents = stats.topAgents || [];
    if (ab.length === 0) {
      branchRows.push({
        branch: a.agencyName || a.name,
        franchise: a.agencyName || a.name,
        agents: topAgents.filter((t) => t.status === 'active').length,
        activeListings: stats.totalListings || 0,
        leads: (stats.crmLeads || []).length,
        gtv: stats.totalRevenue || 0,
        propertiesSold: stats.propertiesSold || 0,
      });
    } else {
      for (const br of ab) {
        const brName = br.name || 'Branch';
        const brAgents = topAgents.filter((ag) =>
          ag.branch === brName || ag.branchName === brName
        );
        const brRevenue = brAgents.reduce((s, ag) => s + (ag.revenue || 0), 0);
        const brSales = brAgents.reduce((s, ag) => s + (ag.sales || 0), 0);
        branchRows.push({
          branch: brName,
          franchise: a.agencyName || a.name,
          agents: brAgents.filter((ag) => ag.status === 'active').length,
          activeListings: 0,
          leads: 0,
          gtv: brRevenue,
          propertiesSold: brSales,
        });
      }
    }
  }
  const performanceByBranch = branchRows.sort((a, b) => b.gtv - a.gtv);

  // --- Agent-level data for commission engine ---
  const agentRows = [];
  for (const a of agencies) {
    const franchiseName = a.agencyName || a.name;
    const topAgents = a.agencyStats?.topAgents || [];
    for (const ag of topAgents) {
      agentRows.push({
        _id: ag._id,
        name: ag.name || 'Agent',
        franchise: franchiseName,
        branch: ag.branch || '—',
        tier: ag.tier || 'Junior Agent',
        status: ag.status || 'invited',
        totalSales: ag.revenue || 0,
        propertiesSold: ag.sales || 0,
        commissionRate: ag.commissionRate || null,
      });
    }
  }
  agentRows.sort((a, b) => b.totalSales - a.totalSales);

  const totalRoyalties = performanceByFranchise.reduce((s, f) => s + (f.royalties?.total || 0), 0);

  // Monthly royalty aggregation (last 6 months) — distribute evenly as a placeholder
  const combinedRate = (defaultRates.branchToFranchise + defaultRates.franchiseToCountry + defaultRates.countryToHq) / 100;
  const monthlyRoyalties = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthRevenue = i === 0 ? totalRevenue : 0;
    monthlyRoyalties.push({
      month: d.toLocaleString('en-US', { month: 'short' }),
      year: d.getFullYear(),
      gtv: monthRevenue,
      royalty: monthRevenue * combinedRate,
    });
  }

  return res.status(200).json({
    success: true,
    summary: {
      agencyCount: agencies.length,
      totalAgents: totalAgentCount,
      totalListings: totalListingCount,
      activeListings: totalListingCount,
      soldListings: totalPropertiesSold,
      newListingsLast30: 0,
      totalLeads,
      totalRevenue,
      totalPropertiesSold,
      totalRoyalties,
    },
    royaltyDefaults: defaultRates,
    leadsByType,
    listingsByType,
    leaderboard,
    performanceByCountry,
    performanceByFranchise,
    performanceByBranch,
    agentRows,
    monthlyRoyalties,
  });

  } catch (err) {
    console.error('Enterprise dashboard error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

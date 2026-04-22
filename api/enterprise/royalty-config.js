const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');

  try {
    await connectDB();
    const userId = getUserIdFromRequest(req, res);
    if (!userId) return;

    const enterprise = await User.findById(userId);
    if (!enterprise || String(enterprise.role).toLowerCase() !== 'enterprise') {
      return res.status(403).json({ message: 'Enterprise role required.' });
    }

    if (req.method === 'GET') {
      const defaults = enterprise.enterpriseStats?.royaltyDefaults || {};
      const agencies = (enterprise.enterpriseStats?.agencies || []).map((a) => ({
        _id: a._id,
        name: a.name,
        royaltyRates: a.royaltyRates || {},
      }));
      return res.status(200).json({
        success: true,
        defaults: {
          branchToFranchise: defaults.branchToFranchise ?? 3,
          franchiseToCountry: defaults.franchiseToCountry ?? 5,
          countryToHq: defaults.countryToHq ?? 1.5,
        },
        agencies,
      });
    }

    if (req.method === 'PUT') {
      const { agencyId, branchToFranchise, franchiseToCountry, countryToHq, updateDefaults } = req.body;

      if (updateDefaults) {
        if (!enterprise.enterpriseStats) enterprise.enterpriseStats = {};
        if (!enterprise.enterpriseStats.royaltyDefaults) enterprise.enterpriseStats.royaltyDefaults = {};
        if (branchToFranchise != null) enterprise.enterpriseStats.royaltyDefaults.branchToFranchise = Number(branchToFranchise);
        if (franchiseToCountry != null) enterprise.enterpriseStats.royaltyDefaults.franchiseToCountry = Number(franchiseToCountry);
        if (countryToHq != null) enterprise.enterpriseStats.royaltyDefaults.countryToHq = Number(countryToHq);
        enterprise.markModified('enterpriseStats');
        await enterprise.save();
        return res.status(200).json({ success: true, message: 'Default royalty rates updated.' });
      }

      if (!agencyId) {
        return res.status(400).json({ message: 'agencyId is required (or set updateDefaults: true).' });
      }

      const agencyEntry = (enterprise.enterpriseStats?.agencies || []).find(
        (a) => String(a._id) === String(agencyId)
      );
      if (!agencyEntry) {
        return res.status(404).json({ message: 'Agency not found in enterprise.' });
      }

      if (!agencyEntry.royaltyRates) agencyEntry.royaltyRates = {};
      if (branchToFranchise != null) agencyEntry.royaltyRates.branchToFranchise = Number(branchToFranchise);
      if (franchiseToCountry != null) agencyEntry.royaltyRates.franchiseToCountry = Number(franchiseToCountry);
      if (countryToHq != null) agencyEntry.royaltyRates.countryToHq = Number(countryToHq);

      enterprise.markModified('enterpriseStats');
      await enterprise.save();
      return res.status(200).json({ success: true, message: `Royalty rates updated for ${agencyEntry.name || 'agency'}.` });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Royalty config error:', err);
    return res.status(500).json({ message: 'Internal server error', error: err.message });
  }
};

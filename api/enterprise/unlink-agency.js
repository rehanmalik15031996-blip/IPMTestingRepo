const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');

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
  const { agencyId } = body;
  if (!agencyId) return res.status(400).json({ message: 'agencyId is required.' });

  const agency = await User.findById(agencyId);
  if (!agency) return res.status(404).json({ message: 'Agency not found.' });

  if (!agency.enterpriseId || String(agency.enterpriseId) !== String(enterprise._id)) {
    return res.status(400).json({ message: 'This agency is not linked to your enterprise.' });
  }

  agency.enterpriseId = null;
  agency.enterpriseName = null;
  await agency.save();

  if (enterprise.enterpriseStats?.agencies) {
    enterprise.enterpriseStats.agencies = enterprise.enterpriseStats.agencies.filter(
      (a) => String(a._id) !== String(agencyId)
    );
    enterprise.markModified('enterpriseStats');
    await enterprise.save();
  }

  return res.status(200).json({
    success: true,
    message: `${agency.agencyName || agency.name} has been unlinked from your enterprise.`,
  });
};

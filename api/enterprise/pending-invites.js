const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');
const EnterpriseInvite = require('../../server/models/EnterpriseInvite');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });
  await connectDB();

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const user = await User.findById(userId).lean();
  if (!user) return res.status(404).json({ message: 'User not found.' });

  const role = String(user.role || '').toLowerCase();

  if (role === 'enterprise') {
    const invites = await EnterpriseInvite.find({
      enterpriseId: user._id,
      accepted: false,
      declined: false,
      expiresAt: { $gt: new Date() },
    }).lean();
    return res.status(200).json({ success: true, invites });
  }

  if (role === 'agency') {
    const invites = await EnterpriseInvite.find({
      $or: [
        { agencyId: user._id, accepted: false, declined: false },
        { agencyEmail: user.email.toLowerCase(), accepted: false, declined: false },
      ],
      expiresAt: { $gt: new Date() },
    }).lean();
    return res.status(200).json({ success: true, invites });
  }

  return res.status(200).json({ success: true, invites: [] });
};

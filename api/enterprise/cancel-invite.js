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

  const enterprise = await User.findById(userId).lean();
  if (!enterprise || String(enterprise.role).toLowerCase() !== 'enterprise') {
    return res.status(403).json({ message: 'Enterprise role required.' });
  }

  const { inviteId } = req.body || {};
  if (!inviteId) return res.status(400).json({ message: 'inviteId is required.' });

  const invite = await EnterpriseInvite.findOne({ _id: inviteId, enterpriseId: enterprise._id });
  if (!invite) return res.status(404).json({ message: 'Invite not found.' });

  await EnterpriseInvite.deleteOne({ _id: inviteId });

  return res.status(200).json({ success: true, message: 'Invite cancelled.' });
};

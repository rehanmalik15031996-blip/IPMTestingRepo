const path = require('path');
const root = path.resolve(__dirname, '../..');
const connectDB = require(path.join(root, 'api', '_lib', 'mongodb'));
const { handleCors } = require(path.join(root, 'api', '_lib', 'cors'));
const { requireAuth } = require(path.join(root, 'api', '_lib', 'auth'));
const User = require(path.join(root, 'server', 'models', 'User'));
const Property = require(path.join(root, 'server', 'models', 'Property'));

const DEMO_ROLES = [
  { key: 'agency', query: { role: 'agency' }, label: 'Agency' },
  { key: 'agency_agent', query: { role: 'agency_agent' }, label: 'Agent' },
  { key: 'independent_agent', query: { role: 'independent_agent' }, label: 'Independent Agent' },
  { key: 'investor', query: { role: 'investor' }, label: 'Investor / Buyer' },
  { key: 'enterprise', query: { role: 'enterprise' }, label: 'Enterprise' },
  { key: 'partner_conveyancer', query: { role: 'partner', partnerType: 'conveyancer' }, label: 'Conveyancer' },
  { key: 'partner_bond', query: { role: 'partner', partnerType: 'bond_originator' }, label: 'Bond Originator' },
  { key: 'buyer', query: { role: 'buyer' }, label: 'Buyer' },
  { key: 'seller', query: { role: 'seller' }, label: 'Seller' },
];

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await connectDB();
    const userId = requireAuth(req, res);
    if (!userId) return;
    const adminUser = await User.findById(userId).select('role').lean();
    if (!adminUser || (adminUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const results = {};

    for (const dr of DEMO_ROLES) {
      const users = await User.find(dr.query)
        .select('_id name email role partnerType agencyName subscriptionPlan subscriptionStatus')
        .sort({ _id: -1 })
        .limit(20)
        .lean();

      if (!users.length) continue;

      let picked = null;
      for (const u of users) {
        const propCount = await Property.countDocuments({
          $or: [{ agentId: u._id }, { userId: u._id }],
        });
        if (propCount > 0) {
          picked = { ...u, _propertyCount: propCount };
          break;
        }
      }
      if (!picked && users.length) {
        picked = { ...users[0], _propertyCount: 0 };
      }
      if (picked) {
        results[dr.key] = { ...picked, _label: dr.label };
      }
    }
    return res.status(200).json(results);
  } catch (err) {
    console.error('Admin demo-users error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

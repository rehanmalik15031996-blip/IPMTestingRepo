const path = require('path');
const jwt = require('jsonwebtoken');
const root = path.resolve(__dirname, '../..');
const connectDB = require(path.join(root, 'api', '_lib', 'mongodb'));
const { handleCors } = require(path.join(root, 'api', '_lib', 'cors'));
const { requireAuth } = require(path.join(root, 'api', '_lib', 'auth'));
const User = require(path.join(root, 'server', 'models', 'User'));
const Property = require(path.join(root, 'server', 'models', 'Property'));

const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_123';
const DEMO_TOKEN_TTL = '8h';

function mintDemoToken(userId) {
  return jwt.sign({ id: String(userId), demo: true }, JWT_SECRET, { expiresIn: DEMO_TOKEN_TTL });
}

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

// Pinned demo accounts per role. If an email is set here (or via env var) and the
// user exists in the DB, that account is used for the demo launcher. Otherwise we
// silently fall back to the auto-pick logic (newest user of that role with listings).
const PINNED_DEMO_EMAILS = {
  enterprise: process.env.DEMO_USER_ENTERPRISE_EMAIL || 'ramimof298@spotshops.com',
  agency: process.env.DEMO_USER_AGENCY_EMAIL || 'foros40214@bultoc.com',
  agency_agent: process.env.DEMO_USER_AGENCY_AGENT_EMAIL || 'xetihe5841@creteanu.com',
};

function normalizeEmail(e) {
  return String(e || '').trim().toLowerCase();
}

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
      let picked = null;

      const pinnedEmail = normalizeEmail(PINNED_DEMO_EMAILS[dr.key]);
      if (pinnedEmail) {
        const pinnedUser = await User.findOne({ ...dr.query, email: pinnedEmail })
          .select('_id name email role partnerType agencyName subscriptionPlan subscriptionStatus')
          .lean();
        if (pinnedUser) {
          const propCount = await Property.countDocuments({
            $or: [{ agentId: pinnedUser._id }, { userId: pinnedUser._id }],
          });
          picked = { ...pinnedUser, _propertyCount: propCount, _pinned: true };
        }
      }

      if (!picked) {
        const users = await User.find(dr.query)
          .select('_id name email role partnerType agencyName subscriptionPlan subscriptionStatus')
          .sort({ _id: -1 })
          .limit(20)
          .lean();

        if (!users.length) continue;

        for (const u of users) {
          const propCount = await Property.countDocuments({
            $or: [{ agentId: u._id }, { userId: u._id }],
          });
          if (propCount > 0) {
            picked = { ...u, _propertyCount: propCount };
            break;
          }
        }
        if (!picked) {
          picked = { ...users[0], _propertyCount: 0 };
        }
      }

      if (picked) {
        results[dr.key] = {
          ...picked,
          _label: dr.label,
          _demoToken: mintDemoToken(picked._id),
        };
      }
    }
    return res.status(200).json(results);
  } catch (err) {
    console.error('Admin demo-users error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

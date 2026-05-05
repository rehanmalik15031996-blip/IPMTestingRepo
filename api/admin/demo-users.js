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
// user exists in the DB, that account is used as the default for the demo
// launcher. Otherwise we silently fall back to the auto-pick logic (newest user
// of that role with listings).
const PINNED_DEMO_EMAILS = {
  enterprise: process.env.DEMO_USER_ENTERPRISE_EMAIL || 'ramimof298@spotshops.com',
  // Marder Properties is our flagship demo agency; Alex Vangelatos is its
  // demo agent. Both are seeded by scripts/create-marder-agency.js and
  // scripts/create-marder-agents.js so they exist in every environment.
  agency: process.env.DEMO_USER_AGENCY_EMAIL || 'marder_agency@demo.com',
  agency_agent: process.env.DEMO_USER_AGENCY_AGENT_EMAIL || 'alex.vangelatos@marder-demo.com',
};

// Roles where the launcher should expose a dropdown so the admin can pick a
// specific user to view as. The default (first option) is the pinned account
// when one is configured for that role, otherwise the most recent / most
// active user.
const MULTI_OPTION_ROLES = new Set(['agency', 'agency_agent', 'buyer', 'seller', 'investor']);
const MULTI_OPTION_LIMIT = 50;

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
      // Roles with multiple selectable options get a full list of accounts so
      // the admin can pick any one from a dropdown in AdminDemo.js. The first
      // item is treated as the default — pinned accounts are surfaced first,
      // otherwise the most-active (most listings) account leads.
      if (MULTI_OPTION_ROLES.has(dr.key)) {
        const users = await User.find(dr.query)
          .select('_id name email role partnerType agencyName subscriptionPlan subscriptionStatus agentTier agentScore ipmScore photo agencyId branchName branchId bio phone')
          .sort({ name: 1, _id: -1 })
          .limit(MULTI_OPTION_LIMIT)
          .lean();
        if (!users.length) continue;

        const pinnedEmail = normalizeEmail(PINNED_DEMO_EMAILS[dr.key]);
        const options = await Promise.all(users.map(async (u) => {
          const propCount = await Property.countDocuments({
            $or: [{ agentId: u._id }, { userId: u._id }],
          });
          return {
            ...u,
            _propertyCount: propCount,
            _pinned: pinnedEmail && normalizeEmail(u.email) === pinnedEmail,
            _demoToken: mintDemoToken(u._id),
          };
        }));
        // Pinned accounts always lead, then by listing count, then by name.
        options.sort((a, b) => {
          if (a._pinned && !b._pinned) return -1;
          if (b._pinned && !a._pinned) return 1;
          return (b._propertyCount || 0) - (a._propertyCount || 0);
        });

        // Safety net: if a pinned email is configured but the user wasn't in
        // the first batch (e.g. very large user table), look it up explicitly
        // and prepend it so Marder/Alex are always selectable.
        if (pinnedEmail && !options.some((o) => normalizeEmail(o.email) === pinnedEmail)) {
          const pinnedUser = await User.findOne({ ...dr.query, email: pinnedEmail })
            .select('_id name email role partnerType agencyName subscriptionPlan subscriptionStatus agentTier agentScore ipmScore photo agencyId branchName branchId bio phone')
            .lean();
          if (pinnedUser) {
            const propCount = await Property.countDocuments({
              $or: [{ agentId: pinnedUser._id }, { userId: pinnedUser._id }],
            });
            options.unshift({
              ...pinnedUser,
              _propertyCount: propCount,
              _pinned: true,
              _demoToken: mintDemoToken(pinnedUser._id),
            });
          }
        }

        results[dr.key] = {
          ...options[0],
          _label: dr.label,
          _options: options,
        };
        continue;
      }

      let picked = null;

      const pinnedEmail = normalizeEmail(PINNED_DEMO_EMAILS[dr.key]);
      if (pinnedEmail) {
        const pinnedUser = await User.findOne({ ...dr.query, email: pinnedEmail })
          .select('_id name email role partnerType agencyName subscriptionPlan subscriptionStatus agentTier agentScore ipmScore photo agencyId branchName branchId bio phone')
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
          .select('_id name email role partnerType agencyName subscriptionPlan subscriptionStatus agentTier agentScore ipmScore photo agencyId branchName branchId bio phone')
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

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
// launcher. Otherwise we silently fall back to PINNED_DEMO_NAMES (name lookup)
// or, last resort, the auto-pick logic (newest user of that role with listings).
const PINNED_DEMO_EMAILS = {
  enterprise: process.env.DEMO_USER_ENTERPRISE_EMAIL || 'ramimof298@spotshops.com',
  // Marder Properties is our flagship demo agency; Alex Vangelatos is its
  // demo agent. Both are seeded by scripts/create-marder-agency.js and
  // scripts/create-marder-agents.js so they exist in every environment.
  agency: process.env.DEMO_USER_AGENCY_EMAIL || 'marder_agency@demo.com',
  agency_agent: process.env.DEMO_USER_AGENCY_AGENT_EMAIL || 'alex.vangelatos@marder-demo.com',
  partner_bond: process.env.DEMO_USER_BOND_EMAIL || 'bondoriginator@ipm.com',
};

// Name-based pins for roles where we don't have a stable email address.
// Matched case-insensitively against User.name. Used as a secondary lookup
// after PINNED_DEMO_EMAILS and before the auto-pick fallback.
const PINNED_DEMO_NAMES = {
  buyer: 'Aamna Shahid',
  investor: 'Jan Investor',
};

// Roles where the launcher exposes a dropdown so the admin can pick between
// multiple curated accounts. Each entry is a small allowlist of email
// addresses (case-insensitive). The first entry is the default option.
//
// Keeping this list short is critical because the entire roster (with minted
// JWTs) is serialized into sessionStorage when demo mode starts, and large
// payloads will hit the browser's storage quota. Roles not listed here use
// the single-option path (no dropdown).
const MULTI_OPTION_EMAILS = {
  agency: ['marder_agency@demo.com', 'foros40214@bultoc.com'],
};
const MULTI_OPTION_ROLES = new Set(Object.keys(MULTI_OPTION_EMAILS));

function normalizeEmail(e) {
  return String(e || '').trim().toLowerCase();
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

    const SELECT_FIELDS = '_id name email role partnerType agencyName subscriptionPlan subscriptionStatus agentTier agentScore ipmScore photo agencyId branchName branchId bio phone';

    for (const dr of DEMO_ROLES) {
      // Multi-option roles: look up each email in the allowlist explicitly.
      // We never query "all users with role X" anymore — that pattern is what
      // historically blew the sessionStorage quota when the user table grew.
      if (MULTI_OPTION_ROLES.has(dr.key)) {
        const allowlist = (MULTI_OPTION_EMAILS[dr.key] || []).map(normalizeEmail).filter(Boolean);
        if (!allowlist.length) continue;

        const users = await User.find({ ...dr.query, email: { $in: allowlist } })
          .select(SELECT_FIELDS)
          .lean();

        // Preserve the order declared in the allowlist (first = default).
        const byEmail = new Map(users.map((u) => [normalizeEmail(u.email), u]));
        const ordered = allowlist.map((e) => byEmail.get(e)).filter(Boolean);
        if (!ordered.length) continue;

        const options = await Promise.all(ordered.map(async (u, idx) => {
          const propCount = await Property.countDocuments({
            $or: [{ agentId: u._id }, { userId: u._id }],
          });
          return {
            ...u,
            _propertyCount: propCount,
            _pinned: idx === 0,
            _demoToken: mintDemoToken(u._id),
          };
        }));

        results[dr.key] = {
          ...options[0],
          _label: dr.label,
          _options: options,
        };
        continue;
      }

      // Single-option roles: try pinned email → pinned name → auto-pick.
      let picked = null;

      const pinnedEmail = normalizeEmail(PINNED_DEMO_EMAILS[dr.key]);
      if (pinnedEmail) {
        const pinnedUser = await User.findOne({ ...dr.query, email: pinnedEmail })
          .select(SELECT_FIELDS)
          .lean();
        if (pinnedUser) {
          const propCount = await Property.countDocuments({
            $or: [{ agentId: pinnedUser._id }, { userId: pinnedUser._id }],
          });
          picked = { ...pinnedUser, _propertyCount: propCount, _pinned: true };
        }
      }

      if (!picked) {
        const pinnedName = PINNED_DEMO_NAMES[dr.key];
        if (pinnedName) {
          const nameRe = new RegExp(escapeRegex(pinnedName), 'i');
          const pinnedUser = await User.findOne({ ...dr.query, name: nameRe })
            .select(SELECT_FIELDS)
            .lean();
          if (pinnedUser) {
            const propCount = await Property.countDocuments({
              $or: [{ agentId: pinnedUser._id }, { userId: pinnedUser._id }],
            });
            picked = { ...pinnedUser, _propertyCount: propCount, _pinned: true };
          }
        }
      }

      if (!picked) {
        const users = await User.find(dr.query)
          .select(SELECT_FIELDS)
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

// One round-trip for first paint: first batch of users + first batch of listings (speed)
const path = require('path');
const root = path.resolve(__dirname, '../..');
const connectDB = require(path.join(root, 'api', '_lib', 'mongodb'));
const { handleCors } = require(path.join(root, 'api', '_lib', 'cors'));
const { requireAuth } = require(path.join(root, 'api', '_lib', 'auth'));
const User = require(path.join(root, 'server', 'models', 'User'));
const Property = require(path.join(root, 'server', 'models', 'Property'));

const FIRST_BATCH = 25;

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const userId = requireAuth(req, res);
    if (!userId) return;
    const adminUser = await User.findById(userId).select('role').lean();
    if (!adminUser || (adminUser.role || '').toLowerCase() !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    const [userResult, listingResult] = await Promise.all([
      Promise.all([
        User.find({}, '-password').sort({ _id: -1 }).limit(FIRST_BATCH).lean(),
        User.countDocuments({})
      ]),
      Promise.all([
        Property.find({}).sort({ createdAt: -1 }).limit(FIRST_BATCH).lean(),
        Property.countDocuments({})
      ])
    ]);

    return res.status(200).json({
      users: userResult[0],
      totalUsers: userResult[1],
      listings: listingResult[0],
      totalListings: listingResult[1]
    });
  } catch (err) {
    console.error('Admin bootstrap error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

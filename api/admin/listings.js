// Admin-only: list all listings (any status)
const path = require('path');
const root = path.resolve(__dirname, '../..');
const connectDB = require(path.join(root, 'api', '_lib', 'mongodb'));
const { handleCors } = require(path.join(root, 'api', '_lib', 'cors'));
const { requireAuth } = require(path.join(root, 'api', '_lib', 'auth'));
const User = require(path.join(root, 'server', 'models', 'User'));
const Property = require(path.join(root, 'server', 'models', 'Property'));

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
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
    const [listings, total] = await Promise.all([
      Property.find({}).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Property.countDocuments({})
    ]);
    return res.status(200).json({ listings, total });
  } catch (err) {
    console.error('Admin listings error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

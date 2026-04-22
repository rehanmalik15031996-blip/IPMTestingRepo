const path = require('path');
const root = path.resolve(__dirname, '../..');
const connectDB = require(path.join(root, 'api', '_lib', 'mongodb'));
const { handleCors } = require(path.join(root, 'api', '_lib', 'cors'));
const { requireAuth } = require(path.join(root, 'api', '_lib', 'auth'));
const User = require(path.join(root, 'server', 'models', 'User'));
const Property = require(path.join(root, 'server', 'models', 'Property'));

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

    const propertyId = req.query.id || req.params?.id;
    if (!propertyId) return res.status(400).json({ message: 'Property ID is required' });

    const property = await Property.findById(propertyId)
      .select('title location locationDetails listingMetadata createdAt')
      .lean();

    if (!property) return res.status(404).json({ message: 'Property not found' });

    return res.status(200).json({
      _id: property._id,
      title: property.title,
      location: property.location,
      locationDetails: property.locationDetails,
      createdAt: property.createdAt,
      listingMetadata: property.listingMetadata || null,
      hasMetadata: !!property.listingMetadata,
    });
  } catch (err) {
    console.error('Admin property-metadata error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

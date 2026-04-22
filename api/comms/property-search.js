const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const Property = require('../../server/models/Property');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  await connectDB();
  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const { q } = req.query;
  if (!q || q.length < 2) return res.status(200).json({ success: true, properties: [] });

  const regex = new RegExp(q, 'i');
  const properties = await Property.find({
    $or: [
      { title: regex },
      { 'location.address': regex },
      { 'location.city': regex },
    ],
  })
    .select('title location.address location.city pricing.price images')
    .sort({ updatedAt: -1 })
    .limit(10)
    .lean();

  const results = properties.map(p => ({
    _id: p._id,
    title: p.title,
    address: p.location?.address || p.location?.city || '',
    price: p.pricing?.price,
    image: p.images?.[0]?.url || p.images?.[0] || null,
  }));

  return res.status(200).json({ success: true, properties: results });
};

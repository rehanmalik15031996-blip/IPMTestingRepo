const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const Property = require('../../server/models/Property');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).json({ message: 'Method not allowed' });

  const ref = String(req.query.ref || '').trim();
  const agencyId = String(req.query.agencyId || '').trim();
  if (!ref || !agencyId) {
    return res.status(400).json({ message: 'ref and agencyId are required' });
  }

  const mongoose = require('mongoose');
  if (!mongoose.Types.ObjectId.isValid(agencyId)) {
    return res.status(400).json({ message: 'Invalid agencyId' });
  }

  try {
    await connectDB();
    const esc = ref.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const property = await Property.findOne({
      importAgencyId: agencyId,
      importListingRef: { $regex: new RegExp(`^${esc}$`, 'i') },
    })
      .select('_id title')
      .lean();

    if (!property) {
      return res.status(404).json({ message: 'Property not found for this reference' });
    }
    return res.status(200).json({ _id: String(property._id), title: property.title });
  } catch (err) {
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

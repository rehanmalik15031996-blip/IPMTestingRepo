/**
 * GET /api/developments/:id
 * Returns a single development with floor plans and units grouped by developmentUnitGroup
 * (Property24 / Dubai-style: one development, multiple units, grouped by layout type)
 */
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const Development = require('../../server/models/Development');
const Property = require('../../server/models/Property');

function parseIdFromRequest(req) {
  let id = req.query && req.query.id;
  if (id == null && typeof req.url === 'string') {
    const pathPart = req.url.split('?')[0];
    const pathMatch = pathPart.match(/\/api\/developments\/([^/]+)/);
    if (pathMatch) id = pathMatch[1];
  }
  return id;
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const id = parseIdFromRequest(req);
  if (!id) return res.status(400).json({ message: 'Development ID is required' });

  try {
    await connectDB();

    const development = await Development.findById(id).lean();
    if (!development) {
      return res.status(404).json({ message: 'Development not found' });
    }

    // Units linked to this development (listings that are part of this project)
    const units = await Property.find({
      developmentId: id,
      status: { $in: ['Published', 'Draft', 'Under Offer'] }
    }).sort({ developmentUnitGroup: 1, title: 1 }).lean();

    // Group units by developmentUnitGroup (same layout = same group)
    const groupKey = (u) => (u.developmentUnitGroup && String(u.developmentUnitGroup).trim()) || 'Other';
    const byGroup = {};
    units.forEach((u) => {
      const key = groupKey(u);
      if (!byGroup[key]) byGroup[key] = [];
      byGroup[key].push({
        _id: u._id,
        title: u.title,
        developmentUnitLabel: u.developmentUnitLabel,
        location: u.location,
        price: u.price,
        imageUrl: u.imageUrl || (u.media && u.media.coverImage),
        status: u.status,
        pricing: u.pricing ? { askingPrice: u.pricing.askingPrice, currency: u.pricing.currency } : undefined
      });
    });

    const groupedUnits = Object.entries(byGroup).map(([groupName, list]) => ({
      groupName,
      count: list.length,
      units: list
    }));

    return res.status(200).json({
      ...development,
      floorPlans: development.floorPlans || [],
      towers: development.towers || [],
      groupedUnits
    });
  } catch (err) {
    console.error('[developments/:id]', err);
    return res.status(500).json({ message: err.message || 'Failed to fetch development' });
  }
};

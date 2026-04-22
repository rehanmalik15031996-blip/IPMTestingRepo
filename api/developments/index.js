// Vercel serverless function for developments
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const Development = require('../../server/models/Development');
const { autoSeedIfEmpty } = require('../_lib/autoSeed');
const {
  listDevelopmentsForAgency,
  listDevelopmentsForAgent,
} = require('../../server/utils/developmentsScopedList');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    await connectDB();

    if (req.method === 'GET') {
      const agencyId = (req.query && req.query.agencyId) ? String(req.query.agencyId).trim() : null;
      const agentId = (req.query && req.query.agentId) ? String(req.query.agentId).trim() : null;

      if (agencyId) {
        const rows = await listDevelopmentsForAgency(agencyId);
        return res.status(200).json(rows);
      }

      if (agentId) {
        const rows = await listDevelopmentsForAgent(agentId);
        return res.status(200).json(rows);
      }

      // No agencyId: return all (e.g. public New Developments page)
      const developmentCount = await Development.countDocuments();
      if (developmentCount === 0) {
        console.log('🌱 Database is empty, auto-seeding...');
        try {
          await autoSeedIfEmpty();
          console.log('✅ Auto-seed completed');
        } catch (seedErr) {
          console.error('⚠️ Auto-seed failed (non-critical):', seedErr.message);
        }
      }
      const developments = await Development.find().sort({ createdAt: -1 }).limit(100).lean();
      return res.status(200).json(developments);
    }

    if (req.method === 'POST') {
      const body = req.body || {};
      const title = (body.title || '').trim();
      const location = (body.location || '').trim();
      const completion = (body.completion || '').trim();
      const priceStart = (body.priceStart || '').trim();
      const description = (body.description || '').trim();
      if (!title) return res.status(400).json({ message: 'Title is required' });
      if (!location) return res.status(400).json({ message: 'Location is required' });
      if (!completion) return res.status(400).json({ message: 'Completion is required' });
      if (!priceStart) return res.status(400).json({ message: 'Price start is required' });
      if (!description) return res.status(400).json({ message: 'Description is required' });
      const agentId = body.agentId || null;
      const agencyId = body.agencyId || null;
      const imageUrl = (body.imageUrl || '').trim() || 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800';
      const doc = new Development({
        title,
        subtitle: (body.subtitle || '').trim() || undefined,
        location,
        completion,
        priceStart,
        yieldRange: (body.yieldRange || '').trim() || undefined,
        imageUrl,
        description,
        agentId: agentId || undefined,
        agencyId: agencyId || undefined,
        floorPlans: body.floorPlans || [],
        towers: body.towers || [],
        gallery: body.gallery || []
      });
      const saved = await doc.save();
      return res.status(201).json(saved);
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('❌ Developments error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return res.status(500).json({ 
      message: err.message,
      error: 'Failed to fetch developments'
    });
  }
};


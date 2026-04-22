// Consolidated properties route - handles /api/properties and /api/properties?id=...
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const Property = require('../../server/models/Property');
const User = require('../../server/models/User');
const File = require('../../server/models/File');
const { autoSeedIfEmpty } = require('../_lib/autoSeed');
const { computePropertyIpmScore } = require('../_lib/scoring');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    await connectDB();
    const { id, search } = req.query;

    if (req.method === 'GET') {
      if (id) {
        // GET single property (/api/properties?id=...); populate agent for contact panel
        const property = await Property.findById(id).lean();
        if (!property) {
          return res.status(404).json({ message: 'Property not found' });
        }
        if (property.agentId) {
          const agent = await User.findById(property.agentId).select('name email phone photo').lean();
          if (agent) property.agent = { name: agent.name, email: agent.email, phone: agent.phone, photo: agent.photo };
        }
        return res.status(200).json(property);
      } else {
        // GET all properties with optional search (/api/properties)
        // Auto-seed if database is empty (only on first request)
        const propertyCount = await Property.countDocuments();
        const userCount = await require('../../server/models/User').countDocuments();
        
        if (propertyCount === 0 || userCount === 0) {
          console.log('🌱 Database is empty, auto-seeding...');
          try {
            const seedResult = await autoSeedIfEmpty();
            console.log('✅ Auto-seed completed:', seedResult);
          } catch (seedErr) {
            console.error('⚠️ Auto-seed failed (non-critical):', seedErr.message);
            // Continue even if seeding fails
          }
        }

        let query = { status: 'Published' }; // Only show published properties
        if (search) {
          query = {
            ...query,
            $or: [
              { title: { $regex: search, $options: 'i' } },
              { location: { $regex: search, $options: 'i' } },
              { listingType: { $regex: search, $options: 'i' } }
            ]
          };
        }
        const properties = await Property.find(query).sort({ createdAt: -1 });
        console.log(`✅ Found ${properties.length} properties`);
        return res.status(200).json(properties);
      }
    }

    if (req.method === 'POST') {
      // POST new property
      try {
        console.log('📤 Received property data:', JSON.stringify(req.body, null, 2));
        
        // Validate required fields
        if (!req.body.title) {
          return res.status(400).json({ message: 'Property title is required' });
        }
        if (!req.body.agentId) {
          return res.status(400).json({ message: 'Agent ID is required' });
        }
        
        const bodyWithScore = { ...req.body, ipmScore: computePropertyIpmScore(req.body) };
        const newProperty = new Property(bodyWithScore);
        const savedProperty = await newProperty.save();
        
        console.log('✅ Property saved successfully:', savedProperty._id);

        const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.API_BASE_URL || process.env.FRONTEND_ORIGIN || '').replace(/\/$/, '') || 'http://localhost:3000';
        fetch(`${baseUrl}/api/match/run-listing-matches`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ propertyId: savedProperty._id }),
        }).catch((err) => console.warn('[properties] Match trigger failed:', err.message));

        return res.status(200).json(savedProperty);
      } catch (err) {
        console.error('❌ Error saving property:', err);
        return res.status(500).json({ 
          message: err.message || 'Failed to save property',
          error: err.name === 'ValidationError' ? 'Validation error' : 'Database error'
        });
      }
    }

    if (req.method === 'PUT') {
      // PUT update property (/api/properties?id=...)
      if (!id) {
        return res.status(400).json({ message: 'Property ID is required' });
      }
      const existing = await Property.findById(id).lean();
      const merged = { ...(existing || {}), ...req.body };
      const ipmScore = computePropertyIpmScore(merged);
      const updatedProperty = await Property.findByIdAndUpdate(id, { $set: { ...req.body, ipmScore } }, { new: true });
      if (!updatedProperty) {
        return res.status(404).json({ message: 'Property not found' });
      }
      return res.status(200).json(updatedProperty);
    }

    if (req.method === 'DELETE') {
      // DELETE property (/api/properties?id=...); also remove vault files linked to this property
      if (!id) {
        return res.status(400).json({ message: 'Property ID is required' });
      }
      const deleteResult = await File.deleteMany({ propertyId: id });
      if (deleteResult.deletedCount > 0) {
        console.log(`🗑️ Removed ${deleteResult.deletedCount} vault file(s) for property ${id}`);
      }
      await Property.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Property deleted successfully' });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('❌ Properties error:', err);
    console.error('Error details:', {
      message: err.message,
      stack: err.stack,
      name: err.name
    });
    return res.status(500).json({ 
      message: err.message,
      error: 'Failed to fetch properties'
    });
  }
};


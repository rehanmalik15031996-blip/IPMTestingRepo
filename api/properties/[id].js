const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const Property = require('../../server/models/Property');
const User = require('../../server/models/User');
const File = require('../../server/models/File');
const { computePropertyIpmScore } = require('../_lib/scoring');
const { syncDealForProperty } = require('../../server/utils/salesPipelineSync');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  await connectDB();

  const id = req.query.id;
  if (!id) return res.status(400).json({ message: 'Property id is required' });

  if (req.method === 'GET') {
    try {
      const property = await Property.findById(id).lean();
      if (!property) return res.status(404).json({ message: 'Property not found' });
      if (property.agentId) {
        const agent = await User.findById(property.agentId).select('name email phone photo agencyName').lean();
        if (agent) property.agent = { name: agent.name, email: agent.email, phone: agent.phone, photo: agent.photo };
      }
      return res.status(200).json(property);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  if (req.method === 'PUT' || req.method === 'PATCH') {
    try {
      const body = req.body || {};
      const existing = await Property.findById(id).lean();
      const prevStatus = existing?.status || null;
      const merged = { ...(existing || {}), ...body };
      const ipmScore = computePropertyIpmScore(merged);
      const updatedProperty = await Property.findByIdAndUpdate(
        id,
        { $set: { ...body, ipmScore } },
        { new: true }
      );
      if (!updatedProperty) return res.status(404).json({ message: 'Property not found' });
      // Auto-sync sales pipeline when status flips into / out of Under Negotiation.
      // Run async without blocking the response — failures only log.
      syncDealForProperty(updatedProperty, prevStatus).catch((err) => {
        console.warn('[api/properties] sales sync failed:', err?.message || err);
      });
      return res.status(200).json(updatedProperty);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const deleteResult = await File.deleteMany({ propertyId: id });
      if (deleteResult.deletedCount > 0) {
        console.log(`Removed ${deleteResult.deletedCount} vault file(s) for property ${id}`);
      }
      await Property.findByIdAndDelete(id);
      return res.status(200).json({ message: 'Property has been deleted' });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

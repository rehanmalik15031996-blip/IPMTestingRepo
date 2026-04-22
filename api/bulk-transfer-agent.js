// Vercel serverless: POST /api/bulk-transfer-agent – agency only: move all leads and properties from one agent to another
const connectDB = require('./_lib/mongodb');
const { handleCors } = require('./_lib/cors');
const User = require('../server/models/User');
const Property = require('../server/models/Property');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const { userId, fromAgentId, toAgentId } = req.body || {};

    if (!userId || !fromAgentId || !toAgentId) {
      return res.status(400).json({ message: 'userId, fromAgentId and toAgentId are required' });
    }

    if (String(fromAgentId) === String(toAgentId)) {
      return res.status(400).json({ message: 'From and to agent must be different' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const role = (user.role || '').toLowerCase();
    if (role !== 'agency') {
      return res.status(403).json({ message: 'Only agencies can bulk transfer' });
    }

    const fromStr = String(fromAgentId);
    const toStr = String(toAgentId);
    const agencyIdStr = String(user._id);
    const topAgentIds = (user.agencyStats?.topAgents || []).map((a) => String(a._id || a.id)).filter(Boolean);
    const fromValid = topAgentIds.includes(fromStr);
    const toValid = toStr === agencyIdStr || topAgentIds.includes(toStr);
    if (!fromValid || !toValid) {
      return res.status(400).json({ message: 'From must be an agent in your agency; To must be Agency or another agent' });
    }

    let leadsTransferred = 0;
    if (user.agencyStats && Array.isArray(user.agencyStats.crmLeads)) {
      user.agencyStats.crmLeads.forEach((l) => {
        if (String(l.assignedAgentId || '') === fromStr) {
          l.assignedAgentId = toStr;
          leadsTransferred++;
        }
      });
      user.markModified('agencyStats');
      await user.save();
    }

    const propResult = await Property.updateMany(
      { agentId: fromAgentId },
      { $set: { agentId: toAgentId } }
    );
    const propertiesTransferred = propResult.modifiedCount || 0;

    return res.status(200).json({
      success: true,
      leadsTransferred,
      propertiesTransferred
    });
  } catch (err) {
    console.error('Bulk transfer error:', err);
    return res.status(500).json({ message: err.message });
  }
};

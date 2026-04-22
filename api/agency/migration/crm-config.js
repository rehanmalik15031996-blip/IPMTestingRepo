const connectDB = require('../../_lib/mongodb');
const { handleCors } = require('../../_lib/cors');
const { getUserIdFromRequest } = require('../../_lib/auth');
const User = require('../../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  await connectDB();

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (String(user.role || '').toLowerCase() !== 'agency') {
    return res.status(403).json({ message: 'Only agency accounts can use migration tools' });
  }

  if (req.method === 'GET') {
    const cfg = user.agencyStats?.crmConfig || {};
    return res.json({
      success: true,
      crmConfig: {
        pipelineStages: cfg.pipelineStages || [],
        activityChannels: cfg.activityChannels || [],
        hubspotFieldMap: cfg.hubspotFieldMap || {},
        builtFrom: cfg.builtFrom || null,
        updatedAt: cfg.updatedAt || null,
      },
    });
  }

  if (req.method === 'PUT') {
    const { pipelineStages, activityChannels, hubspotFieldMap } = req.body || {};

    if (!user.agencyStats) user.agencyStats = {};
    if (!user.agencyStats.crmConfig) user.agencyStats.crmConfig = {};

    if (Array.isArray(pipelineStages)) {
      user.agencyStats.crmConfig.pipelineStages = pipelineStages.map((s, i) => ({
        id: s.id || s.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        title: s.title,
        order: s.order != null ? s.order : i,
        color: s.color || undefined,
      }));
    }
    if (Array.isArray(activityChannels)) {
      user.agencyStats.crmConfig.activityChannels = activityChannels.map((c) => ({
        value: c.value || c.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
        label: c.label,
      }));
    }
    if (hubspotFieldMap && typeof hubspotFieldMap === 'object') {
      user.agencyStats.crmConfig.hubspotFieldMap = hubspotFieldMap;
    }
    user.agencyStats.crmConfig.updatedAt = new Date();

    user.markModified('agencyStats');
    await user.save();
    return res.json({ success: true, crmConfig: user.agencyStats.crmConfig });
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

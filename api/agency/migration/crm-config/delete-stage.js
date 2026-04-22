const connectDB = require('../../../_lib/mongodb');
const { handleCors } = require('../../../_lib/cors');
const { getUserIdFromRequest } = require('../../../_lib/auth');
const User = require('../../../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'PUT') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  await connectDB();

  const user = await User.findById(userId);
  if (!user) return res.status(404).json({ message: 'User not found' });
  if (String(user.role || '').toLowerCase() !== 'agency') {
    return res.status(403).json({ message: 'Only agency accounts can use migration tools' });
  }

  const { stageId, moveToStageId } = req.body || {};
  if (!stageId) return res.status(400).json({ message: 'stageId is required.' });

  if (!user.agencyStats?.crmConfig?.pipelineStages) {
    return res.status(400).json({ message: 'No pipeline stages configured.' });
  }

  const stages = user.agencyStats.crmConfig.pipelineStages;
  const idx = stages.findIndex((s) => s.id === stageId);
  if (idx === -1) return res.status(404).json({ message: `Stage "${stageId}" not found.` });

  const leads = user.agencyStats.crmLeads || [];
  let movedCount = 0;
  if (moveToStageId) {
    for (const lead of leads) {
      const normalized = (lead.status || '').trim().toLowerCase().replace(/\s+/g, '_');
      if (normalized === stageId || lead.status === stageId) {
        lead.status = moveToStageId;
        movedCount++;
      }
    }
  }

  stages.splice(idx, 1);
  stages.forEach((s, i) => { s.order = i; });

  user.agencyStats.crmConfig.updatedAt = new Date();
  user.markModified('agencyStats');
  await user.save();

  return res.json({ success: true, movedCount, remainingStages: stages.length });
};

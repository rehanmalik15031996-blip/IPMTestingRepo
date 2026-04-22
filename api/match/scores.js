// GET /api/match/scores – fetch match scores for display
// Query: propertyId=... (scores for this listing) | targetType=lead&targetId=...&ownerId=... | targetType=user&targetId=...
const mongoose = require('mongoose');
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const MatchScore = require('../../server/models/MatchScore');
const User = require('../../server/models/User');
// Register Property model so Mongoose can resolve MatchScore's ref when populating propertyId
const Property = require('../../server/models/Property');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const { propertyId, targetType, targetId, ownerId, userId, limit = '20' } = req.query || {};
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));

    // Return scores for a property: filter to accounts visible to userId, enrich targetName when missing
    if (propertyId) {
      const pid = mongoose.Types.ObjectId.isValid(propertyId) ? new mongoose.Types.ObjectId(propertyId) : propertyId;
      let scores = await MatchScore.find({ propertyId: pid })
        .sort({ score: -1 })
        .limit(limitNum * 2)
        .lean();

      if (userId) {
        const uid = mongoose.Types.ObjectId.isValid(userId) ? new mongoose.Types.ObjectId(userId) : userId;
        const viewer = await User.findById(uid).select('role agencyId').lean();
        const allowedLeadOwnerIds = new Set();
        if (viewer) {
          if (viewer.role === 'agency') {
            allowedLeadOwnerIds.add(String(uid));
          } else {
            allowedLeadOwnerIds.add(String(uid));
            if (viewer.agencyId) allowedLeadOwnerIds.add(String(viewer.agencyId));
          }
        }
        scores = scores.filter((s) => {
          if (s.targetType === 'user') return true;
          if (s.targetType === 'lead' && s.ownerId) return allowedLeadOwnerIds.has(String(s.ownerId));
          return false;
        });
        scores = scores.slice(0, limitNum);
      } else {
        scores = scores.slice(0, limitNum);
      }

      for (const s of scores) {
        if (s.targetName && String(s.targetName).trim()) continue;
        if (s.targetType === 'user') {
          try {
            const u = await User.findById(s.targetId).select('name email').lean();
            if (u) s.targetName = (u.name || u.email || 'User').trim();
          } catch (_) {}
        } else if (s.targetType === 'lead' && s.ownerId) {
          try {
            const owner = await User.findById(s.ownerId).select('agencyStats.crmLeads agentStats.crmLeads').lean();
            const leads = owner?.agencyStats?.crmLeads || owner?.agentStats?.crmLeads || [];
            const lead = leads.find((l) => String(l.id || l._id) === String(s.targetId));
            if (lead) s.targetName = (lead.name || lead.email || 'Lead').trim();
          } catch (_) {}
        }
      }

      return res.status(200).json({ scores });
    }

    if (targetType && targetId) {
      const query = { targetType, targetId: String(targetId) };
      if (targetType === 'lead' && ownerId) query.ownerId = mongoose.Types.ObjectId.isValid(ownerId) ? new mongoose.Types.ObjectId(ownerId) : ownerId;
      if (targetType === 'user') query.ownerId = null;
      let scores = await MatchScore.find(query)
        .sort({ score: -1 })
        .limit(limitNum * 2)
        .populate('propertyId', 'title location price status listingType agentId')
        .lean();

      // For leads: only return scores for properties owned by this agency/agent (same logic as listing page: agency = own id + topAgents)
      if (targetType === 'lead' && ownerId && scores.length > 0) {
        const oid = mongoose.Types.ObjectId.isValid(ownerId) ? new mongoose.Types.ObjectId(ownerId) : ownerId;
        const owner = await User.findById(oid).select('role agencyStats.topAgents').lean();
        let allowedAgentIds = [];
        if ((owner?.role || '').toLowerCase() === 'agency') {
          const topAgentIds = (owner?.agencyStats?.topAgents || []).map((a) => a._id || a.id).filter(Boolean).map((aid) => String(aid));
          allowedAgentIds = [String(oid), ...topAgentIds];
          allowedAgentIds = [...new Set(allowedAgentIds)];
        } else {
          allowedAgentIds = [String(oid)];
        }
        const allowedSet = new Set(allowedAgentIds);
        scores = scores.filter((s) => {
          const pid = s.propertyId;
          if (!pid || !pid.agentId) return false;
          return allowedSet.has(String(pid.agentId));
        });
        scores = scores.slice(0, limitNum);
      } else if (targetType === 'lead' && scores.length > limitNum) {
        scores = scores.slice(0, limitNum);
      }

      return res.status(200).json({ scores });
    }

    return res.status(400).json({ message: 'Provide propertyId or targetType+targetId' });
  } catch (err) {
    console.error('[match/scores]', err);
    return res.status(500).json({ message: err.message || 'Failed to fetch scores' });
  }
};

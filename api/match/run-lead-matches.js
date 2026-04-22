// POST /api/match/run-lead-matches – run match scores for a new buyer/investor lead vs published listings owned by the lead's agency/agent only.
const mongoose = require('mongoose');
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const Property = require('../../server/models/Property');
const User = require('../../server/models/User');
const MatchScore = require('../../server/models/MatchScore');
const { buildListingSummary } = require('../_lib/buildListingSummary');
const { buildBuyerSummaryFromLead } = require('../_lib/buildBuyerSummary');
const { matchWithClaude } = require('../_lib/matchWithClaude');

const MAX_LISTINGS = 100;
const BATCH_SIZE = 10;
// Deterministic score from leadId + propertyId so the same lead+property always gets the same score (no re-randomizing)
function deterministicFallbackScore(leadId, propertyId) {
  const str = String(leadId) + String(propertyId);
  let n = 0;
  for (let i = 0; i < str.length; i++) n = (n * 31 + str.charCodeAt(i)) >>> 0;
  return (n % 99) + 1;
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const { lead, ownerId } = req.body || {};
    if (!lead) {
      return res.status(400).json({ message: 'lead is required' });
    }
    const leadId = lead.id || (lead._id != null ? String(lead._id) : null);
    if (!leadId) {
      return res.status(400).json({ message: 'lead must have id or _id' });
    }
    const lt = (lead.leadType || 'buyer').toString().trim().toLowerCase();
    if (lt === 'seller') {
      return res.status(200).json({ success: true, matched: 0 });
    }
    // Run matching for buyer/investor; treat missing or unknown as buyer

    const effectiveOwnerId = ownerId ? (mongoose.Types.ObjectId.isValid(ownerId) ? new mongoose.Types.ObjectId(ownerId) : ownerId) : null;
    // Use the same logic as the listing page (dashboard agentProperties): agency = own id + topAgents; agent = own id only.
    let allowedAgentIds = [];
    if (effectiveOwnerId) {
      const owner = await User.findById(effectiveOwnerId).select('role agencyStats.topAgents').lean();
      const role = (owner?.role || '').toLowerCase();
      if (role === 'agency') {
        const topAgentIds = (owner?.agencyStats?.topAgents || []).map((a) => a._id || a.id).filter(Boolean).map((aid) => String(aid));
        allowedAgentIds = [String(effectiveOwnerId), ...topAgentIds];
        allowedAgentIds = [...new Set(allowedAgentIds)];
      } else {
        allowedAgentIds = [effectiveOwnerId];
      }
    }
    if (allowedAgentIds.length === 0) {
      return res.status(200).json({ success: true, matched: 0 });
    }

    const buyerSummary = buildBuyerSummaryFromLead(lead);
    // Same as dashboard: properties for these agents. Include Published and Draft so we match what the listing page shows.
    const listings = await Property.find({
      agentId: { $in: allowedAgentIds.map((aid) => (mongoose.Types.ObjectId.isValid(aid) ? new mongoose.Types.ObjectId(aid) : aid)) },
      status: { $in: ['Published', 'Draft'] },
    })
      .sort({ createdAt: -1 })
      .limit(MAX_LISTINGS)
      .lean();

    // Replace all existing scores for this lead+owner so we don't show stale cross-agency properties
    await MatchScore.deleteMany({
      targetType: 'lead',
      targetId: String(leadId),
      ...(effectiveOwnerId && { ownerId: effectiveOwnerId }),
    });

    let matched = 0;
    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
      const batch = listings.slice(i, i + BATCH_SIZE);
      const scores = await Promise.all(
        batch.map(async (prop) => {
          const listingSummary = buildListingSummary(prop);
          const score = await matchWithClaude(listingSummary, buyerSummary);
          const value = score != null ? score : deterministicFallbackScore(leadId, prop._id);
          return { propertyId: prop._id, score: value };
        })
      );
      for (const s of scores) {
        await MatchScore.findOneAndUpdate(
          { propertyId: s.propertyId, targetType: 'lead', targetId: String(leadId) },
          { $set: { score: s.score, ownerId: effectiveOwnerId, updatedAt: new Date() } },
          { upsert: true }
        );
        matched++;
      }
    }

    return res.status(200).json({ success: true, matched });
  } catch (err) {
    console.error('[run-lead-matches]', err);
    return res.status(500).json({ message: err.message || 'Match run failed' });
  }
};

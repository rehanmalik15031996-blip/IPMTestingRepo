// POST /api/match/run-listing-matches – run match scores for a new listing vs all buyers/investors. Call after property create.
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const Property = require('../../server/models/Property');
const User = require('../../server/models/User');
const MatchScore = require('../../server/models/MatchScore');
const { buildListingSummary } = require('../_lib/buildListingSummary');
const { buildBuyerSummaryFromLead, buildBuyerSummaryFromUser } = require('../_lib/buildBuyerSummary');
const { matchWithClaude } = require('../_lib/matchWithClaude');

const MAX_BUYERS = 200;
const BATCH_SIZE = 10;
// When Claude fails or returns null, assign a random score (1–50) so it sticks and can be ranked
function randomFallbackScore() {
  return Math.floor(Math.random() * 50) + 1;
}

/**
 * Get buyers/investors to match against. If scope is provided, only include leads visible to that agent/agency.
 * scope: { agentId, agencyId? } – property owner so we only use their (or their agency's) leads + all registered users.
 */
async function getAllBuyersAndInvestors(scope) {
  const result = [];
  const regUsers = await User.find({ role: { $in: ['buyer', 'investor'] } })
    .select('_id name role location preferredCities preferredPropertyTypes').lean();
  regUsers.forEach((u) => {
    result.push({
      targetType: 'user',
      targetId: String(u._id),
      ownerId: null,
      summary: buildBuyerSummaryFromUser(u),
      targetName: (u.name || u.email || 'User').trim(),
    });
  });

  const allowedLeadOwnerIds = new Set();
  if (scope && scope.agentId) {
    allowedLeadOwnerIds.add(String(scope.agentId));
    if (scope.agencyId) allowedLeadOwnerIds.add(String(scope.agencyId));
  }

  const addLeadsFromAgency = (agency) => {
    const leads = agency.agencyStats?.crmLeads || [];
    const ownerId = agency._id;
    if (scope && allowedLeadOwnerIds.size > 0 && !allowedLeadOwnerIds.has(String(ownerId))) return;
    for (const lead of leads) {
      const leadId = lead.id || (lead._id && String(lead._id));
      if (!leadId) continue;
      if (lead.leadType && lead.leadType !== 'buyer' && lead.leadType !== 'investor') continue;
      result.push({
        targetType: 'lead',
        targetId: String(leadId),
        ownerId,
        summary: buildBuyerSummaryFromLead(lead),
        targetName: (lead.name || lead.email || 'Lead').trim(),
      });
    }
  };

  const addLeadsFromAgent = (agent) => {
    const leads = agent.agentStats?.crmLeads || [];
    const ownerId = agent._id;
    if (scope && allowedLeadOwnerIds.size > 0 && !allowedLeadOwnerIds.has(String(ownerId))) return;
    for (const lead of leads) {
      const leadId = lead.id || (lead._id && String(lead._id));
      if (!leadId) continue;
      if (lead.leadType && lead.leadType !== 'buyer' && lead.leadType !== 'investor') continue;
      result.push({
        targetType: 'lead',
        targetId: String(leadId),
        ownerId,
        summary: buildBuyerSummaryFromLead(lead),
        targetName: (lead.name || lead.email || 'Lead').trim(),
      });
    }
  };

  const agenciesWithLeads = await User.find({ role: 'agency', 'agencyStats.crmLeads.0': { $exists: true } })
    .select('_id agencyStats.crmLeads').lean();
  for (const agency of agenciesWithLeads) addLeadsFromAgency(agency);

  const agentsWithLeads = await User.find({
    role: { $in: ['independent_agent', 'agent'] },
    'agentStats.crmLeads.0': { $exists: true },
  })
    .select('_id agentStats.crmLeads').lean();
  for (const agent of agentsWithLeads) addLeadsFromAgent(agent);

  return result.slice(0, MAX_BUYERS);
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const { propertyId } = req.body || {};
    if (!propertyId) {
      return res.status(400).json({ message: 'propertyId is required' });
    }

    const property = await Property.findById(propertyId).lean();
    if (!property) {
      return res.status(404).json({ message: 'Property not found' });
    }

    const agentId = property.agentId;
    let scope = agentId ? { agentId: String(agentId) } : null;
    if (agentId) {
      const owner = await User.findById(agentId).select('agencyId').lean();
      if (owner && owner.agencyId) scope.agencyId = String(owner.agencyId);
    }

    const listingSummary = buildListingSummary(property);
    const buyers = await getAllBuyersAndInvestors(scope);
    let matched = 0;

    for (let i = 0; i < buyers.length; i += BATCH_SIZE) {
      const batch = buyers.slice(i, i + BATCH_SIZE);
      const scores = await Promise.all(
        batch.map(async (b) => {
          const score = await matchWithClaude(listingSummary, b.summary);
          const value = score != null ? score : randomFallbackScore();
          return { ...b, score: value };
        })
      );
      for (const s of scores) {
        await MatchScore.findOneAndUpdate(
          { propertyId, targetType: s.targetType, targetId: s.targetId },
          { $set: { score: s.score, ownerId: s.ownerId || undefined, targetName: s.targetName || '', updatedAt: new Date() } },
          { upsert: true }
        );
        matched++;
      }
    }

    return res.status(200).json({ success: true, matched });
  } catch (err) {
    console.error('[run-listing-matches]', err);
    return res.status(500).json({ message: err.message || 'Match run failed' });
  }
};

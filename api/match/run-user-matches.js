// POST /api/match/run-user-matches – run match scores for a registered buyer/investor vs published listings. Call after registration.
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const Property = require('../../server/models/Property');
const User = require('../../server/models/User');
const MatchScore = require('../../server/models/MatchScore');
const { buildListingSummary } = require('../_lib/buildListingSummary');
const { buildBuyerSummaryFromUser } = require('../_lib/buildBuyerSummary');
const { matchWithClaude } = require('../_lib/matchWithClaude');

const MAX_LISTINGS = 100;
const BATCH_SIZE = 10;

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    await connectDB();
    const { userId } = req.body || {};
    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    const user = await User.findById(userId).select('_id name role location preferredCities preferredPropertyTypes').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.role !== 'buyer' && user.role !== 'investor') {
      return res.status(200).json({ success: true, matched: 0 });
    }

    const buyerSummary = buildBuyerSummaryFromUser(user);
    const listings = await Property.find({ status: 'Published' })
      .sort({ createdAt: -1 })
      .limit(MAX_LISTINGS)
      .lean();

    let matched = 0;
    for (let i = 0; i < listings.length; i += BATCH_SIZE) {
      const batch = listings.slice(i, i + BATCH_SIZE);
      const scores = await Promise.all(
        batch.map(async (prop) => {
          const score = await matchWithClaude(buildListingSummary(prop), buyerSummary);
          return score != null ? { propertyId: prop._id, score } : null;
        })
      );
      for (const s of scores) {
        if (s == null) continue;
        await MatchScore.findOneAndUpdate(
          { propertyId: s.propertyId, targetType: 'user', targetId: String(userId) },
          { $set: { score: s.score, ownerId: null, updatedAt: new Date() } },
          { upsert: true }
        );
        matched++;
      }
    }

    return res.status(200).json({ success: true, matched });
  } catch (err) {
    console.error('[run-user-matches]', err);
    return res.status(500).json({ message: err.message || 'Match run failed' });
  }
};

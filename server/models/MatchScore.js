const mongoose = require('mongoose');

/**
 * Stores match score (0-100) between a listing and a buyer/investor.
 * - When a new listing is created: we score it against all buyers/investors (leads + registered users).
 * - When a new buyer/lead is created: we score them against published listings.
 * targetType: 'lead' = CRM lead (buyer/investor); targetId = lead.id; ownerId = agency/agent user _id.
 * targetType: 'user' = registered buyer/investor; targetId = user _id; ownerId = null.
 */
const matchScoreSchema = new mongoose.Schema({
  propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  targetType: { type: String, enum: ['lead', 'user'], required: true },
  targetId: { type: String, required: true }, // lead.id or user _id
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // for leads: agency or agent _id
  score: { type: Number, required: true, min: 0, max: 100 },
  targetName: { type: String, default: '' }, // display name for lead/user in UI
  updatedAt: { type: Date, default: Date.now },
}, { timestamps: true });

matchScoreSchema.index({ propertyId: 1, targetType: 1, targetId: 1 }, { unique: true });
matchScoreSchema.index({ targetType: 1, targetId: 1, ownerId: 1 });

module.exports = mongoose.model('MatchScore', matchScoreSchema);

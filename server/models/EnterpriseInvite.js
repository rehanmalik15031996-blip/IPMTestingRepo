const mongoose = require('mongoose');

const enterpriseInviteSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  enterpriseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  enterpriseName: { type: String, default: '' },
  agencyEmail: { type: String, required: true },
  agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  agencyName: { type: String, default: '' },
  type: { type: String, enum: ['link', 'new'], default: 'link' },
  linkType: { type: String, enum: ['franchise', 'branch'], default: 'franchise' },
  expiresAt: { type: Date, required: true },
  accepted: { type: Boolean, default: false },
  declined: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
});

enterpriseInviteSchema.index({ enterpriseId: 1 });
enterpriseInviteSchema.index({ agencyEmail: 1 });

module.exports = mongoose.model('EnterpriseInvite', enterpriseInviteSchema);

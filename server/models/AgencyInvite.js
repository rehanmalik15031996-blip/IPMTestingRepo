const mongoose = require('mongoose');

const agencyInviteSchema = new mongoose.Schema({
  token: { type: String, required: true, unique: true },
  pin: { type: String, required: true, unique: true }, // 4-digit PIN from invite email (same length as OTP)
  email: { type: String, required: true },
  firstName: { type: String, default: '' },
  lastName: { type: String, default: '' },
  allowMarketingCampaigns: { type: Boolean, default: false },
  agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  branchId: { type: String, required: true },
  branchName: { type: String, default: '' },
  agencyName: { type: String, default: '' },
  expiresAt: { type: Date, required: true },
  used: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('AgencyInvite', agencyInviteSchema);

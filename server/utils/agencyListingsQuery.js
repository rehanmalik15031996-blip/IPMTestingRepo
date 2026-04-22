const mongoose = require('mongoose');
const User = require('../models/User');

/**
 * Mongo filter for "all listings belonging to this agency" — same idea as bulk reset scope.
 * Includes rows tied by importAgencyId (e.g. PropData) or by agentId (agency principal + anyone with user.agencyId).
 */
async function agencyListingPropertyFilter(agencyId) {
    const idStr = String(agencyId);
    const memberIds = await User.find({ agencyId: idStr }).distinct('_id');
    const agentCandidates = [...new Set([idStr, ...memberIds.map((x) => String(x))])]
        .filter((a) => mongoose.Types.ObjectId.isValid(a))
        .map((a) => new mongoose.Types.ObjectId(a));
    return {
        $or: [{ importAgencyId: idStr }, { agentId: { $in: agentCandidates } }],
    };
}

module.exports = { agencyListingPropertyFilter };

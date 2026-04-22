const User = require('../models/User');

let cachedAgencyId = null;

/**
 * Local dev only: resolve which agency user id the magic bypass token maps to.
 */
async function resolveDevBypassAgencyId() {
    if (cachedAgencyId) return cachedAgencyId;
    const fromEnv = process.env.DEV_BYPASS_AGENCY_ID && String(process.env.DEV_BYPASS_AGENCY_ID).trim();
    if (fromEnv) {
        const u = await User.findById(fromEnv).select('_id').lean();
        if (!u) throw new Error('DEV_BYPASS_AGENCY_ID does not match any user in the database');
        cachedAgencyId = fromEnv;
        return cachedAgencyId;
    }
    const u = await User.findOne({ role: { $regex: /^agency$/i } }).select('_id').lean();
    if (!u) {
        throw new Error(
            'Dev bypass: no user with role "agency" in the database. Create an agency user or set DEV_BYPASS_AGENCY_ID.'
        );
    }
    cachedAgencyId = String(u._id);
    return cachedAgencyId;
}

function isDevBypassEnabled() {
    return process.env.NODE_ENV !== 'production' && process.env.DEV_BYPASS_AUTH === 'true';
}

module.exports = { resolveDevBypassAgencyId, isDevBypassEnabled };

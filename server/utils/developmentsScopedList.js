const mongoose = require('mongoose');
const User = require('../models/User');
const Development = require('../models/Development');
const Property = require('../models/Property');

const PROP_DEV_STATUSES = ['Published', 'Draft', 'Under Offer'];

/**
 * Principal + every user with user.agencyId = this agency (same basis as listing visibility).
 */
async function agencyMemberObjectIds(agencyId) {
    const idStr = String(agencyId);
    const memberIds = await User.find({ agencyId: idStr }).distinct('_id');
    return [...new Set([idStr, ...memberIds.map((x) => String(x))])]
        .filter((a) => mongoose.Types.ObjectId.isValid(a))
        .map((a) => new mongoose.Types.ObjectId(a));
}

function mapFromDev(devDocs, devProperties) {
    const devIds = devDocs.map((d) => String(d._id));
    const unitCountByDev = {};
    devProperties.forEach((p) => {
        const did = p.developmentId ? String(p.developmentId) : null;
        if (did && devIds.includes(did)) {
            unitCountByDev[did] = (unitCountByDev[did] || 0) + 1;
        }
    });
    const fromDev = devDocs.map((d) => ({
        ...d,
        source: 'development',
        unitCount: unitCountByDev[String(d._id)] || 0,
    }));
    const fromProps = devProperties.map((p) => ({
        _id: p._id,
        title: p.title,
        imageUrl: p.imageUrl || (p.media && p.media.coverImage) || '',
        location: p.location,
        source: 'property',
    }));
    return [...fromDev, ...fromProps];
}

/**
 * Developments tied to this agency only: created by a team member, or referenced by their listings.
 * Excludes global/seed rows with no agent link.
 */
async function listDevelopmentsForAgency(agencyId) {
    const idStr = String(agencyId);
    if (!mongoose.Types.ObjectId.isValid(idStr)) {
        return [];
    }
    const agencyOid = new mongoose.Types.ObjectId(idStr);
    const agentCandidates = await agencyMemberObjectIds(agencyId);
    const propFilter = {
        agentId: { $in: agentCandidates },
        $or: [
            { propertyCategory: 'Development' },
            { developmentId: { $exists: true, $ne: null } },
        ],
        status: { $in: PROP_DEV_STATUSES },
    };
    const linkedDevIdsRaw = await Property.find(propFilter).distinct('developmentId');
    const devIdFromProps = (linkedDevIdsRaw || [])
        .filter((x) => x != null && String(x).trim() !== '')
        .map((x) => String(x))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const devClauses = [
        { agentId: { $in: agentCandidates } },
        { agencyId: agencyOid },
    ];
    if (devIdFromProps.length) {
        devClauses.push({ _id: { $in: devIdFromProps } });
    }
    const devMatch = { $or: devClauses };

    const [devDocs, devProperties] = await Promise.all([
        Development.find(devMatch).sort({ createdAt: -1 }).limit(50).lean(),
        Property.find(propFilter).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    return mapFromDev(devDocs, devProperties);
}

/**
 * Developments for a single agent account (no agencyId fallback on the agent id).
 */
async function listDevelopmentsForAgent(agentId) {
    const idStr = String(agentId || '').trim();
    if (!mongoose.Types.ObjectId.isValid(idStr)) {
        return [];
    }
    const oid = new mongoose.Types.ObjectId(idStr);
    const propFilter = {
        agentId: oid,
        $or: [
            { propertyCategory: 'Development' },
            { developmentId: { $exists: true, $ne: null } },
        ],
        status: { $in: PROP_DEV_STATUSES },
    };
    const linkedDevIdsRaw = await Property.find(propFilter).distinct('developmentId');
    const devIdFromProps = (linkedDevIdsRaw || [])
        .filter((x) => x != null && String(x).trim() !== '')
        .map((x) => String(x))
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));

    const devMatch =
        devIdFromProps.length > 0
            ? { $or: [{ agentId: oid }, { _id: { $in: devIdFromProps } }] }
            : { agentId: oid };

    const [devDocs, devProperties] = await Promise.all([
        Development.find(devMatch).sort({ createdAt: -1 }).limit(50).lean(),
        Property.find(propFilter).sort({ createdAt: -1 }).limit(50).lean(),
    ]);
    return mapFromDev(devDocs, devProperties);
}

module.exports = {
    agencyMemberObjectIds,
    listDevelopmentsForAgency,
    listDevelopmentsForAgent,
};

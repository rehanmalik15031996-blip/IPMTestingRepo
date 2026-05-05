/**
 * Sales pipeline sync — keeps the agency's `agencyStats.salesDeals` in step
 * with property status changes. The contract:
 *
 *   - When a Property's `status` flips TO 'Under Negotiation' (and there is no
 *     existing deal for that property), we INSERT a new deal in the first
 *     stage of the agency's configured sales pipeline (or the default
 *     industrial template if nothing's configured yet).
 *   - When a Property's `status` flips AWAY from 'Under Negotiation' to a
 *     terminal status (Sold / Unavailable / Archived), we move the existing
 *     deal to the Won/Lost stage if it isn't already in a closed state.
 *   - When a Property's `status` flips back to 'Under Negotiation' from a
 *     non-Under-Negotiation status (e.g. agent reverted), we re-open the
 *     deal at the first stage if it was previously closed.
 *
 * Failures are intentionally swallowed by the caller — sync should never
 * block a property update.
 */

const crypto = require('crypto');
const User = require('../models/User');

const NEGOTIATION_STATUS = 'Under Negotiation';
const FALLBACK_STAGES = [
    { id: 'negotiation',         title: 'Negotiation',          order: 0, color: '#f59e0b' },
    { id: 'loi',                 title: 'LOI / Heads of Terms', order: 1, color: '#eab308' },
    { id: 'due_diligence',       title: 'Due Diligence',        order: 2, color: '#0ea5e9' },
    { id: 'bond_approval',       title: 'Bond Approval',        order: 3, color: '#3b82f6' },
    { id: 'sale_agreement',      title: 'Sale Agreement Signed',order: 4, color: '#6366f1' },
    { id: 'conveyancing',        title: 'Conveyancing',         order: 5, color: '#8b5cf6' },
    { id: 'lodgement',           title: 'Lodged at Deeds Office', order: 6, color: '#a855f7' },
    { id: 'registration',        title: 'Registered',           order: 7, color: '#10b981' },
    { id: 'won',                 title: 'Closed — Won',         order: 8, color: '#16a34a' },
    { id: 'lost',                title: 'Closed — Lost',        order: 9, color: '#ef4444' },
];

function effectivePipelineStages(agency) {
    const cfg = agency?.agencyStats?.salesConfig;
    const list = cfg?.pipelineStages;
    if (Array.isArray(list) && list.length > 0) return [...list].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
    return FALLBACK_STAGES;
}

function firstStageId(agency) {
    return effectivePipelineStages(agency)[0]?.id || 'negotiation';
}

function closedWonStageId(agency) {
    const stages = effectivePipelineStages(agency);
    return (stages.find((s) => s.id === 'won') || stages[stages.length - 2] || stages[stages.length - 1]).id;
}

function closedLostStageId(agency) {
    const stages = effectivePipelineStages(agency);
    return (stages.find((s) => s.id === 'lost') || stages[stages.length - 1]).id;
}

/**
 * Resolve the agency document for a property — properties live under either
 * the agency itself (agentId == agency._id) or under one of its agents.
 */
async function findAgencyForProperty(prop) {
    if (!prop) return null;
    // Direct agency-owned property (agency principal as agent)
    if (prop.agentId) {
        try {
            const u = await User.findById(prop.agentId).select('role agencyId email');
            if (u) {
                if ((u.role || '').toLowerCase() === 'agency') return await User.findById(u._id);
                if (u.agencyId) return await User.findById(u.agencyId);
            }
        } catch (_) { /* fall through */ }
    }
    if (prop.importAgencyId) {
        try {
            return await User.findById(prop.importAgencyId);
        } catch (_) { /* fall through */ }
    }
    return null;
}

/**
 * Pulls listing-level fields off a Property and shapes them into the subset
 * a sales deal cares about. Used both at creation time AND for in-place
 * refreshes when a status flip carries new info (e.g. a freshly-set offer
 * price). Returns a partial object — caller decides whether to spread it
 * onto a new deal or merge into an existing one.
 */
function listingFieldsFromProperty(prop) {
    const sizeRaw = Number(prop.propertySize?.size) || null;
    const unit = (prop.propertySize?.unitSystem || '').toLowerCase();
    // Normalise to m² since our pipelines are SA-focused. sq ft → m² ≈ 0.092903
    const sizeSqm = sizeRaw && unit.startsWith('sqft') ? Math.round(sizeRaw * 0.092903) : sizeRaw;

    return {
        propertyTitle: prop.title || prop.headline || 'Untitled property',
        propertyAddress: prop.locationDetails?.streetAddress || prop.location || '',
        propertySuburb: prop.locationDetails?.suburb || '',
        propertyType: prop.propertyType || prop.type || prop.listingType || 'industrial',
        askingPrice: Number(prop.pricing?.askingPrice) || Number(prop.askingPrice) || null,
        offerPrice: Number(prop.offerPrice) || null,
        currency: prop.pricing?.currency || 'ZAR',
        sizeSqm,
        assignedAgentId: prop.agentId ? String(prop.agentId) : null,
        buyerName: prop.saleBuyerFirstName ? `${prop.saleBuyerFirstName} ${prop.saleBuyerLastName || ''}`.trim() : '',
        buyerEmail: prop.saleBuyerEmail || '',
        buyerMobile: prop.saleBuyerMobile || '',
        // Negotiation-time inputs (OTP, probability, commission split) — copied from
        // property.negotiationDetails so the sales board can show them at-a-glance.
        otpFileId: prop.negotiationDetails?.otpFileId || null,
        otpFileName: prop.negotiationDetails?.otpFileName || null,
        probabilityOfSale: prop.negotiationDetails?.probabilityOfSale ?? null,
        commissionRatePct: prop.negotiationDetails?.commissionRatePct ?? null,
        commissionParties: Array.isArray(prop.negotiationDetails?.commissionParties)
            ? prop.negotiationDetails.commissionParties
            : [],
    };
}

async function resolveAgentName(prop) {
    if (!prop?.agentId) return null;
    try {
        const User = require('../models/User');
        const agent = await User.findById(prop.agentId).select('firstName lastName name email').lean();
        if (!agent) return null;
        if (agent.name) return agent.name;
        if (agent.firstName || agent.lastName) return `${agent.firstName || ''} ${agent.lastName || ''}`.trim();
        return agent.email || null;
    } catch (_) { return null; }
}

function buildDealFromProperty(prop, agency, source = 'auto-status-change') {
    const stageId = firstStageId(agency);
    const id = 'deal_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex');
    const now = new Date();
    return {
        id,
        propertyId: prop._id,
        ...listingFieldsFromProperty(prop),
        assignedAgentName: null, // hydrated by caller / API GET
        stageId,
        createdAt: now,
        updatedAt: now,
        source,
        notes: '',
        activities: [{
            actionId: crypto.randomUUID(),
            datetime: now.toISOString(),
            activity: source === 'auto-status-change'
                ? 'Deal auto-created — property moved to Under Negotiation'
                : 'Deal created',
            stageId,
            changedBy: { userId: 'system', name: 'System', role: 'system' },
        }],
    };
}

/**
 * Main entry: called from properties.put after a successful update.
 *  - prop: the freshly-saved Property doc (mongoose doc OR plain object)
 *  - prevStatus: the property's status BEFORE this update
 */
async function syncDealForProperty(prop, prevStatus) {
    if (!prop || !prop._id) return null;
    const newStatus = prop.status || null;

    const agency = await findAgencyForProperty(prop);
    if (!agency) return null;
    if (!agency.agencyStats) agency.agencyStats = {};
    if (!Array.isArray(agency.agencyStats.salesDeals)) agency.agencyStats.salesDeals = [];

    const propIdStr = String(prop._id);
    const existing = agency.agencyStats.salesDeals.find((d) => String(d.propertyId) === propIdStr);

    // CASE 0: status didn't change but the property is still Under Negotiation —
    // we still want to mirror any edits to negotiationDetails / pricing onto
    // the existing deal so the Sales board reflects the latest values.
    if (newStatus === prevStatus) {
        if (newStatus === NEGOTIATION_STATUS && existing) {
            const fields = listingFieldsFromProperty(prop);
            // Negotiation snapshot fields are *always* overwritten so the user
            // can clear values too (set probability back to null, etc.).
            const alwaysCopy = new Set(['otpFileId', 'otpFileName', 'probabilityOfSale', 'commissionRatePct', 'commissionParties']);
            for (const [k, v] of Object.entries(fields)) {
                if (alwaysCopy.has(k)) {
                    existing[k] = v;
                } else if (v != null && v !== '' && v !== undefined) {
                    existing[k] = v;
                }
            }
            existing.updatedAt = new Date();
            agency.markModified('agencyStats');
            await agency.save();
            return { ok: true, action: 'refreshed-no-status-change' };
        }
        return null;
    }

    // CASE A: status flips TO Under Negotiation
    if (newStatus === NEGOTIATION_STATUS) {
        if (existing) {
            const closedIds = new Set([closedWonStageId(agency), closedLostStageId(agency)]);
            if (closedIds.has(existing.stageId)) {
                existing.stageId = firstStageId(agency);
                existing.activities.push({
                    actionId: crypto.randomUUID(),
                    datetime: new Date().toISOString(),
                    activity: 'Deal re-opened — property returned to Under Negotiation',
                    stageId: existing.stageId,
                    changedBy: { userId: 'system', name: 'System', role: 'system' },
                });
            }
            // Always refresh listing-side fields from the property so any
            // values that were missing or stale (e.g. price added later) get
            // pulled into the deal card. Negotiation snapshot fields are
            // *always* overwritten (allows clearing); other fields only when
            // the property has a non-empty value (avoid wiping good data).
            const fields = listingFieldsFromProperty(prop);
            const alwaysCopy = new Set(['otpFileId', 'otpFileName', 'probabilityOfSale', 'commissionRatePct', 'commissionParties']);
            for (const [k, v] of Object.entries(fields)) {
                if (alwaysCopy.has(k)) existing[k] = v;
                else if (v != null && v !== '' && v !== undefined) existing[k] = v;
            }
            if (!existing.assignedAgentName && existing.assignedAgentId) {
                existing.assignedAgentName = await resolveAgentName(prop);
            }
            existing.updatedAt = new Date();
        } else {
            const fresh = buildDealFromProperty(prop, agency, 'auto-status-change');
            fresh.assignedAgentName = await resolveAgentName(prop);
            agency.agencyStats.salesDeals.push(fresh);
        }
        agency.markModified('agencyStats');
        await agency.save();
        return { ok: true, action: existing ? 'refreshed' : 'created' };
    }

    // CASE B: status flips AWAY from Under Negotiation
    if (prevStatus === NEGOTIATION_STATUS && existing) {
        let targetStage = null;
        if (newStatus === 'Sold') targetStage = closedWonStageId(agency);
        else if (newStatus === 'Archived' || newStatus === 'Unavailable') targetStage = closedLostStageId(agency);
        if (targetStage && existing.stageId !== targetStage) {
            existing.stageId = targetStage;
            existing.updatedAt = new Date();
            existing.activities.push({
                actionId: crypto.randomUUID(),
                datetime: new Date().toISOString(),
                activity: `Deal closed — property status changed to ${newStatus}`,
                stageId: targetStage,
                changedBy: { userId: 'system', name: 'System', role: 'system' },
            });
            agency.markModified('agencyStats');
            await agency.save();
            return { ok: true, action: 'closed', stageId: targetStage };
        }
    }

    return { ok: true, action: 'noop' };
}

module.exports = { syncDealForProperty, effectivePipelineStages, NEGOTIATION_STATUS };

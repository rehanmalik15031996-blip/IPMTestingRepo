const crypto = require('crypto');
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');

function nowIso() { return new Date().toISOString(); }

function activity(stageId, msg, actor) {
    return {
        actionId: crypto.randomUUID(),
        datetime: nowIso(),
        activity: msg,
        stageId,
        changedBy: actor,
    };
}

// Mirror of salesPipelineSync.listingFieldsFromProperty — used to hydrate
// existing deals on read so they always show the latest property snapshot.
function listingFieldsFromProperty(prop) {
    const sizeRaw = Number(prop.propertySize?.size) || null;
    const unit = (prop.propertySize?.unitSystem || '').toLowerCase();
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
        buyerName: prop.saleBuyerFirstName ? `${prop.saleBuyerFirstName} ${prop.saleBuyerLastName || ''}`.trim() : '',
        buyerEmail: prop.saleBuyerEmail || '',
        buyerMobile: prop.saleBuyerMobile || '',
        otpFileId: prop.negotiationDetails?.otpFileId || null,
        otpFileName: prop.negotiationDetails?.otpFileName || null,
        probabilityOfSale: prop.negotiationDetails?.probabilityOfSale ?? null,
        commissionRatePct: prop.negotiationDetails?.commissionRatePct ?? null,
        commissionParties: Array.isArray(prop.negotiationDetails?.commissionParties)
            ? prop.negotiationDetails.commissionParties
            : [],
    };
}

module.exports = async (req, res) => {
    if (handleCors(req, res)) return;
    const userId = getUserIdFromRequest(req, res);
    if (!userId) return;

    await connectDB();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });
    const role = String(user.role || '').toLowerCase();
    const isAgency = role === 'agency';
    const isAgencyAgent = role === 'agency_agent';
    const isIndependentAgent = role === 'independent_agent' || role === 'agent';
    if (!isAgency && !isAgencyAgent && !isIndependentAgent) {
        return res.status(403).json({ message: 'Sales pipeline is restricted to agency and agent accounts' });
    }

    // Agency agents share their parent agency's deals collection — they can
    // only see / mutate deals where assignedAgentId === their user id, so
    // colleagues' pipelines stay private. Independent agents store deals on
    // their own user document.
    let dealsOwner = user;
    let dealsKey = 'agencyStats';
    if (isAgencyAgent) {
        if (!user.agencyId) {
            return res.json({ success: true, deals: [] });
        }
        dealsOwner = await User.findById(user.agencyId);
        if (!dealsOwner) return res.status(404).json({ message: 'Linked agency not found' });
    } else if (isIndependentAgent) {
        dealsKey = 'agentStats';
    }
    if (!dealsOwner[dealsKey]) dealsOwner[dealsKey] = {};
    if (!Array.isArray(dealsOwner[dealsKey].salesDeals)) dealsOwner[dealsKey].salesDeals = [];

    const ownAgentId = String(user._id);
    const visibleDeal = (d) => {
        if (isAgency || isIndependentAgent) return true;
        return String(d.assignedAgentId || '') === ownAgentId;
    };

    const actor = {
        userId: ownAgentId,
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.email || 'User'),
        role: user.role || 'agency',
    };

    if (req.method === 'GET') {
        const deals = dealsOwner[dealsKey].salesDeals.filter(visibleDeal);
        // Hydrate listing-side fields from the linked Property + assigned User
        // so deals created before newer fields existed still render.
        let dirty = false;
        if (deals.length > 0) {
            const Property = require('../../server/models/Property');
            const propIds = [...new Set(deals.map((d) => d.propertyId).filter(Boolean).map(String))];
            const props = propIds.length ? await Property.find({ _id: { $in: propIds } }).lean() : [];
            const propMap = new Map(props.map((p) => [String(p._id), p]));

            const agentIds = [...new Set(deals.map((d) => d.assignedAgentId).filter(Boolean).map(String))];
            const agents = agentIds.length ? await User.find({ _id: { $in: agentIds } }).select('firstName lastName name email').lean() : [];
            const agentMap = new Map(agents.map((a) => [String(a._id), a]));

            for (const d of deals) {
                const p = d.propertyId && propMap.get(String(d.propertyId));
                if (p) {
                    const fields = listingFieldsFromProperty(p);
                    for (const [k, v] of Object.entries(fields)) {
                        const cur = d[k];
                        const curEmpty = cur == null || cur === '' || cur === 0
                            || (Array.isArray(cur) && cur.length === 0);
                        const newHas = v != null && v !== '' && v !== 0
                            && !(Array.isArray(v) && v.length === 0);
                        if (curEmpty && newHas) {
                            d[k] = v;
                            dirty = true;
                        }
                    }
                }
                if (!d.assignedAgentName && d.assignedAgentId) {
                    const a = agentMap.get(String(d.assignedAgentId));
                    if (a) {
                        d.assignedAgentName = a.name || `${a.firstName || ''} ${a.lastName || ''}`.trim() || a.email || null;
                        if (d.assignedAgentName) dirty = true;
                    }
                }
            }
            if (dirty) {
                dealsOwner.markModified(dealsKey);
                await dealsOwner.save();
            }
        }
        return res.json({ success: true, deals });
    }

    if (req.method === 'POST') {
        const body = req.body || {};
        const stages = (dealsOwner[dealsKey]?.salesConfig?.pipelineStages || []);
        const defaultStageId = stages[0]?.id || 'negotiation';
        // Agency agents may only create deals for themselves so they can't
        // pollute another colleague's pipeline.
        const assignedAgentId = isAgencyAgent
            ? ownAgentId
            : (body.assignedAgentId || null);
        const assignedAgentName = isAgencyAgent
            ? (user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email || null)
            : (body.assignedAgentName || null);
        const deal = {
            id: 'deal_' + Date.now() + '_' + crypto.randomBytes(4).toString('hex'),
            propertyId: body.propertyId || null,
            propertyTitle: body.propertyTitle || 'Manual deal',
            propertyAddress: body.propertyAddress || '',
            propertySuburb: body.propertySuburb || '',
            propertyType: body.propertyType || 'industrial',
            askingPrice: body.askingPrice != null ? Number(body.askingPrice) : null,
            offerPrice: body.offerPrice != null ? Number(body.offerPrice) : null,
            currency: body.currency || 'ZAR',
            sizeSqm: body.sizeSqm != null ? Number(body.sizeSqm) : null,
            assignedAgentId,
            assignedAgentName,
            buyerName: body.buyerName || '',
            buyerEmail: body.buyerEmail || '',
            buyerMobile: body.buyerMobile || '',
            stageId: body.stageId || defaultStageId,
            createdAt: new Date(),
            updatedAt: new Date(),
            expectedCloseDate: body.expectedCloseDate || null,
            source: 'manual',
            notes: body.notes || '',
            activities: [activity(body.stageId || defaultStageId, 'Deal created manually', actor)],
        };
        dealsOwner[dealsKey].salesDeals.push(deal);
        dealsOwner.markModified(dealsKey);
        await dealsOwner.save();
        return res.json({ success: true, deal });
    }

    if (req.method === 'PUT') {
        const { dealId, updates } = req.body || {};
        if (!dealId) return res.status(400).json({ message: 'dealId required' });
        const idx = dealsOwner[dealsKey].salesDeals.findIndex((d) => d.id === dealId);
        if (idx < 0) return res.status(404).json({ message: 'Deal not found' });
        const deal = dealsOwner[dealsKey].salesDeals[idx];
        if (!visibleDeal(deal)) return res.status(403).json({ message: 'You can only update deals assigned to you' });
        // Agency agents are not allowed to reassign a deal to someone else —
        // strip that field out of the update so they can't escape the filter.
        if (isAgencyAgent && updates) {
            if (Object.prototype.hasOwnProperty.call(updates, 'assignedAgentId')) delete updates.assignedAgentId;
            if (Object.prototype.hasOwnProperty.call(updates, 'assignedAgentName')) delete updates.assignedAgentName;
        }
        const prevStage = deal.stageId;

        // Only mutate whitelisted fields
        const editable = ['propertyTitle', 'propertyAddress', 'propertySuburb', 'propertyType',
            'askingPrice', 'offerPrice', 'currency', 'sizeSqm', 'assignedAgentId', 'assignedAgentName',
            'buyerName', 'buyerEmail', 'buyerMobile', 'stageId', 'expectedCloseDate', 'notes',
            'otpFileId', 'otpFileName', 'probabilityOfSale', 'commissionRatePct', 'commissionParties'];
        for (const k of editable) {
            if (Object.prototype.hasOwnProperty.call(updates || {}, k)) deal[k] = updates[k];
        }
        deal.updatedAt = new Date();

        if (updates && updates.stageId && updates.stageId !== prevStage) {
            const stages = dealsOwner[dealsKey]?.salesConfig?.pipelineStages || [];
            const titleFor = (id) => stages.find((s) => s.id === id)?.title || id;
            deal.activities = deal.activities || [];
            deal.activities.push(activity(updates.stageId, `Moved from ${titleFor(prevStage)} → ${titleFor(updates.stageId)}`, actor));
        } else if (updates && updates.activityNote) {
            deal.activities = deal.activities || [];
            deal.activities.push(activity(deal.stageId, updates.activityNote, actor));
        }

        // Mirror negotiation field edits onto the linked Property so the listing
        // remains the source of truth.
        const negKeys = ['otpFileId', 'otpFileName', 'probabilityOfSale', 'commissionRatePct', 'commissionParties'];
        const touchedNeg = updates && negKeys.some((k) => Object.prototype.hasOwnProperty.call(updates, k));
        if (touchedNeg && deal.propertyId) {
            try {
                const Property = require('../../server/models/Property');
                const prop = await Property.findById(deal.propertyId);
                if (prop) {
                    prop.negotiationDetails = prop.negotiationDetails || {};
                    for (const k of negKeys) {
                        if (Object.prototype.hasOwnProperty.call(updates, k)) prop.negotiationDetails[k] = updates[k];
                    }
                    prop.markModified('negotiationDetails');
                    await prop.save();
                }
            } catch (err) {
                console.warn('[sales-deals] failed to mirror negotiationDetails to Property:', err?.message || err);
            }
        }

        if (touchedNeg && !(updates.stageId && updates.stageId !== prevStage)) {
            const summary = [];
            if (Object.prototype.hasOwnProperty.call(updates, 'probabilityOfSale')) summary.push(`probability ${updates.probabilityOfSale}%`);
            if (Object.prototype.hasOwnProperty.call(updates, 'commissionRatePct')) summary.push(`commission ${updates.commissionRatePct}%`);
            if (Object.prototype.hasOwnProperty.call(updates, 'commissionParties')) summary.push(`${(updates.commissionParties || []).length} parties`);
            if (Object.prototype.hasOwnProperty.call(updates, 'otpFileName')) summary.push(`OTP "${updates.otpFileName || 'cleared'}"`);
            deal.activities = deal.activities || [];
            deal.activities.push(activity(deal.stageId, `Negotiation details updated · ${summary.join(', ')}`, actor));
        }

        dealsOwner[dealsKey].salesDeals[idx] = deal;
        dealsOwner.markModified(dealsKey);
        await dealsOwner.save();
        return res.json({ success: true, deal });
    }

    if (req.method === 'DELETE') {
        const { dealId } = req.body || {};
        if (!dealId) return res.status(400).json({ message: 'dealId required' });
        const target = dealsOwner[dealsKey].salesDeals.find((d) => d.id === dealId);
        if (!target) return res.status(404).json({ message: 'Deal not found' });
        if (!visibleDeal(target)) return res.status(403).json({ message: 'You can only remove deals assigned to you' });
        dealsOwner[dealsKey].salesDeals = dealsOwner[dealsKey].salesDeals.filter((d) => d.id !== dealId);
        dealsOwner.markModified(dealsKey);
        await dealsOwner.save();
        return res.json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
};

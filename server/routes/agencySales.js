/**
 * Local Express mirror of the Vercel serverless sales endpoints
 * (api/agency/sales-config.js + api/agency/sales-deals.js). Keeps dev parity
 * with prod so the Sales tab works against `npm start` without redeploying.
 *
 * Mounted at /api/agency in server.js.
 */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const express = require('express');
const router = express.Router();
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_123';
const ALLOWED_TEMPLATES = ['industrial-sale-sa', 'commercial-sale-sa', 'commercial-lease', 'custom'];

function getUserIdFromRequest(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader && String(authHeader).startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const id = decoded.id || decoded.userId || decoded.sub;
        return id ? String(id) : null;
    } catch (e) {
        return null;
    }
}

/**
 * Resolve the authenticated user along with the user document that owns the
 * sales pipeline data. Agencies own their own data; agency agents read /
 * mutate their parent agency's deals filtered by `assignedAgentId`; sole
 * (independent) agents own a private pipeline on their own user document.
 */
async function requireSalesUser(req, res, next) {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ message: 'Authorization required' });
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        const role = String(user.role || '').toLowerCase();
        const isAgency = role === 'agency';
        const isAgencyAgent = role === 'agency_agent';
        const isIndependentAgent = role === 'independent_agent' || role === 'agent';
        if (!isAgency && !isAgencyAgent && !isIndependentAgent) {
            return res.status(403).json({ message: 'Sales pipeline is restricted to agency and agent accounts' });
        }

        let dealsOwner = user;
        let dealsKey = 'agencyStats';
        if (isAgencyAgent) {
            if (!user.agencyId) {
                req.salesContext = { user, dealsOwner: null, dealsKey, isAgency, isAgencyAgent, isIndependentAgent, ownAgentId: String(user._id) };
                return next();
            }
            dealsOwner = await User.findById(user.agencyId);
            if (!dealsOwner) return res.status(404).json({ message: 'Linked agency not found' });
        } else if (isIndependentAgent) {
            dealsKey = 'agentStats';
        }
        req.salesContext = {
            user,
            dealsOwner,
            dealsKey,
            isAgency,
            isAgencyAgent,
            isIndependentAgent,
            ownAgentId: String(user._id),
        };
        // Backwards-compat alias used by old routes that only ran for agencies.
        req.agencyUser = isAgency ? user : dealsOwner;
        next();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

const requireAgency = requireSalesUser;

function activity(stageId, msg, actor) {
    return {
        actionId: crypto.randomUUID(),
        datetime: new Date().toISOString(),
        activity: msg,
        stageId,
        changedBy: actor,
    };
}

function actorFor(user) {
    return {
        userId: String(user._id),
        name: user.firstName ? `${user.firstName} ${user.lastName || ''}`.trim() : (user.email || user.name || 'User'),
        role: user.role || 'agency',
    };
}

// --------------------------------------------------------------------------
// Sales config (pipeline stages + chosen template)
// --------------------------------------------------------------------------
router.get('/sales-config', requireSalesUser, async (req, res) => {
    const { dealsOwner, dealsKey, isIndependentAgent } = req.salesContext;
    if (!dealsOwner) return res.json({ success: true, salesConfig: { template: null, pipelineStages: [], updatedAt: null } });
    const cfg = isIndependentAgent
        ? (dealsOwner.agentStats?.salesConfig || {})
        : (dealsOwner[dealsKey]?.salesConfig || {});
    res.json({
        success: true,
        salesConfig: {
            template: cfg.template || null,
            pipelineStages: cfg.pipelineStages || [],
            updatedAt: cfg.updatedAt || null,
        },
    });
});

router.put('/sales-config', requireSalesUser, async (req, res) => {
    const { user, isAgencyAgent, isIndependentAgent } = req.salesContext;
    if (isAgencyAgent) {
        return res.status(403).json({ message: 'Pipeline settings are managed by your agency' });
    }
    const statsKey = isIndependentAgent ? 'agentStats' : 'agencyStats';
    const { template, pipelineStages, automationRules } = req.body || {};
    if (!user[statsKey]) user[statsKey] = {};
    if (!user[statsKey].salesConfig) user[statsKey].salesConfig = {};
    const cfg = user[statsKey].salesConfig;

    if (template !== undefined) {
        cfg.template = ALLOWED_TEMPLATES.includes(template) ? template : 'custom';
    }
    if (Array.isArray(pipelineStages)) {
        cfg.pipelineStages = pipelineStages.map((s, i) => ({
            id: s.id || (s.title || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
            title: s.title,
            order: s.order != null ? s.order : i,
            color: s.color || undefined,
            hint: s.hint || undefined,
        }));
    }
    if (automationRules && typeof automationRules === 'object') {
        // Map shape: { stageId: [ rule, rule, ... ] }
        cfg.automationRules = automationRules;
    }
    cfg.updatedAt = new Date();
    user.markModified(statsKey);
    await user.save();
    res.json({ success: true, salesConfig: cfg });
});

// --------------------------------------------------------------------------
// Sales deals (kanban cards)
// --------------------------------------------------------------------------
router.get('/sales-deals', requireSalesUser, async (req, res) => {
    const { user, dealsOwner, dealsKey, isAgency, isAgencyAgent, isIndependentAgent, ownAgentId } = req.salesContext;
    if (!dealsOwner) return res.json({ success: true, deals: [] });
    if (!dealsOwner[dealsKey]) dealsOwner[dealsKey] = {};
    const allDeals = dealsOwner[dealsKey].salesDeals || [];
    const visibleDeal = (d) => (isAgency || isIndependentAgent) ? true : String(d.assignedAgentId || '') === ownAgentId;
    const deals = allDeals.filter(visibleDeal);

    // On-the-fly hydration: any deal linked to a property gets its missing
    // listing-side fields refreshed from the live Property so old deals
    // created before the field-mapping fix still render correctly.
    let dirty = false;
    if (deals.length > 0) {
        const Property = require('../models/Property');
        const User = require('../models/User');
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

    res.json({ success: true, deals });
});

// Helper used above — same shape rules as salesPipelineSync.listingFieldsFromProperty.
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

router.post('/sales-deals', requireSalesUser, async (req, res) => {
    const { user, dealsOwner, dealsKey, isAgencyAgent, ownAgentId } = req.salesContext;
    if (!dealsOwner) return res.status(400).json({ message: 'You are not linked to an agency yet' });
    const body = req.body || {};
    if (!dealsOwner[dealsKey]) dealsOwner[dealsKey] = {};
    if (!Array.isArray(dealsOwner[dealsKey].salesDeals)) dealsOwner[dealsKey].salesDeals = [];

    const stages = (dealsOwner[dealsKey]?.salesConfig?.pipelineStages || []);
    const defaultStageId = stages[0]?.id || 'negotiation';
    const actor = actorFor(user);

    // Agency agents may only create deals assigned to themselves so they
    // can't write into another colleague's pipeline.
    const assignedAgentId = isAgencyAgent ? ownAgentId : (body.assignedAgentId || null);
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
    res.json({ success: true, deal });
});

router.put('/sales-deals', requireSalesUser, async (req, res) => {
    const { user, dealsOwner, dealsKey, isAgency, isAgencyAgent, isIndependentAgent, ownAgentId } = req.salesContext;
    if (!dealsOwner) return res.status(400).json({ message: 'You are not linked to an agency yet' });
    const { dealId, updates } = req.body || {};
    if (!dealId) return res.status(400).json({ message: 'dealId required' });
    if (!dealsOwner[dealsKey]) dealsOwner[dealsKey] = {};
    if (!Array.isArray(dealsOwner[dealsKey].salesDeals)) dealsOwner[dealsKey].salesDeals = [];

    const idx = dealsOwner[dealsKey].salesDeals.findIndex((d) => d.id === dealId);
    if (idx < 0) return res.status(404).json({ message: 'Deal not found' });
    const deal = dealsOwner[dealsKey].salesDeals[idx];
    const visibleDeal = (d) => (isAgency || isIndependentAgent) ? true : String(d.assignedAgentId || '') === ownAgentId;
    if (!visibleDeal(deal)) return res.status(403).json({ message: 'You can only update deals assigned to you' });
    if (isAgencyAgent && updates) {
        if (Object.prototype.hasOwnProperty.call(updates, 'assignedAgentId')) delete updates.assignedAgentId;
        if (Object.prototype.hasOwnProperty.call(updates, 'assignedAgentName')) delete updates.assignedAgentName;
    }
    const prevStage = deal.stageId;
    const actor = actorFor(user);

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

    // If negotiation fields changed and the deal is bound to a Property, mirror
    // them back onto Property.negotiationDetails so the listing's source of
    // truth stays in sync with edits made from the Sales board.
    const negKeys = ['otpFileId', 'otpFileName', 'probabilityOfSale', 'commissionRatePct', 'commissionParties'];
    const touchedNeg = updates && negKeys.some((k) => Object.prototype.hasOwnProperty.call(updates, k));
    if (touchedNeg && deal.propertyId) {
        try {
            const Property = require('../models/Property');
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
            console.warn('[agencySales] failed to mirror negotiationDetails to Property:', err?.message || err);
        }
    }

    // Auto-log a tidy activity entry when the user edits any negotiation field.
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
    res.json({ success: true, deal });
});

router.delete('/sales-deals', requireSalesUser, async (req, res) => {
    const { dealsOwner, dealsKey, isAgency, isIndependentAgent, ownAgentId } = req.salesContext;
    if (!dealsOwner) return res.status(400).json({ message: 'You are not linked to an agency yet' });
    const { dealId } = req.body || {};
    if (!dealId) return res.status(400).json({ message: 'dealId required' });
    if (!dealsOwner[dealsKey]) dealsOwner[dealsKey] = {};
    if (!Array.isArray(dealsOwner[dealsKey].salesDeals)) dealsOwner[dealsKey].salesDeals = [];

    const target = dealsOwner[dealsKey].salesDeals.find((d) => d.id === dealId);
    if (!target) return res.status(404).json({ message: 'Deal not found' });
    const visibleDeal = (d) => (isAgency || isIndependentAgent) ? true : String(d.assignedAgentId || '') === ownAgentId;
    if (!visibleDeal(target)) return res.status(403).json({ message: 'You can only remove deals assigned to you' });
    dealsOwner[dealsKey].salesDeals = dealsOwner[dealsKey].salesDeals.filter((d) => d.id !== dealId);
    dealsOwner.markModified(dealsKey);
    await dealsOwner.save();
    res.json({ success: true });
});

module.exports = router;

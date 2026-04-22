/**
 * HubSpot CRM API helper — handles token retrieval (private app / OAuth with refresh)
 * and provides typed methods for pipelines, contacts, deals, and lifecycle stage lookups.
 */

const User = require('../models/User');

const HUBSPOT_BASE = 'https://api.hubapi.com';

/**
 * Resolve a usable access token for the agency's HubSpot integration.
 * Prefers OAuth (auto-refreshes if expired), falls back to private-app token.
 * @param {string|import('mongoose').Types.ObjectId} agencyId
 * @returns {Promise<string>} access token
 */
async function getHubspotAccessToken(agencyId) {
    const user = await User.findById(agencyId);
    if (!user) throw new Error('Agency not found');
    const ints = user.agencyStats?.integrations?.hubspot;
    if (!ints) throw new Error('HubSpot is not connected. Go to Settings → Integrations to connect.');

    if (ints.oauthAccessToken) {
        const expiresAt = Number(ints.oauthExpiresAt) || 0;
        if (Date.now() < expiresAt - 60_000) return ints.oauthAccessToken;

        if (ints.oauthRefreshToken && ints.oauthApp?.clientId && ints.oauthApp?.clientSecret) {
            const refreshed = await refreshOAuthToken(ints);
            ints.oauthAccessToken = refreshed.access_token;
            if (refreshed.refresh_token) ints.oauthRefreshToken = refreshed.refresh_token;
            ints.oauthExpiresAt = Date.now() + (Number(refreshed.expires_in) || 3600) * 1000;
            user.markModified('agencyStats');
            await user.save();
            return ints.oauthAccessToken;
        }
    }

    if (ints.privateAppAccessToken) return ints.privateAppAccessToken;
    throw new Error('No valid HubSpot token. Reconnect via Settings → Integrations.');
}

async function refreshOAuthToken(ints) {
    const res = await fetch(`${HUBSPOT_BASE}/oauth/v1/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'refresh_token',
            client_id: ints.oauthApp.clientId,
            client_secret: ints.oauthApp.clientSecret,
            refresh_token: ints.oauthRefreshToken,
        }),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error('HubSpot OAuth refresh did not return JSON'); }
    if (!res.ok) throw new Error(data.message || `OAuth token refresh failed (${res.status})`);
    return data;
}

async function hubspotGet(token, path, params) {
    const url = new URL(path, HUBSPOT_BASE);
    if (params) Object.entries(params).forEach(([k, v]) => { if (v != null) url.searchParams.set(k, String(v)); });
    const res = await fetch(url.toString(), { headers: { Authorization: `Bearer ${token}` } });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`HubSpot API returned non-JSON for ${path}`); }
    if (!res.ok) throw new Error(data.message || `HubSpot API error ${res.status} on ${path}`);
    return data;
}

async function hubspotPost(token, path, body) {
    const res = await fetch(`${HUBSPOT_BASE}${path}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
    });
    const text = await res.text();
    let data;
    try { data = JSON.parse(text); } catch { throw new Error(`HubSpot API returned non-JSON for ${path}`); }
    if (!res.ok) throw new Error(data.message || `HubSpot API error ${res.status} on ${path}`);
    return data;
}

// ---------------------------------------------------------------------------
// Pipelines & stages
// ---------------------------------------------------------------------------

/**
 * Fetch all deal pipelines and their stages from HubSpot.
 * @returns {{ pipelines: Array<{ id, label, stages: Array<{ id, label, displayOrder }> }> }}
 */
async function fetchDealPipelines(agencyId) {
    const token = await getHubspotAccessToken(agencyId);
    const data = await hubspotGet(token, '/crm/v3/pipelines/deals');
    const pipelines = (data.results || []).map((p) => ({
        id: p.id,
        label: p.label,
        displayOrder: p.displayOrder,
        stages: (p.stages || [])
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((s) => ({ id: s.id, label: s.label, displayOrder: s.displayOrder })),
    }));
    return { pipelines };
}

/**
 * Fetch all ticket pipelines (support / service) and their stages.
 */
async function fetchTicketPipelines(agencyId) {
    const token = await getHubspotAccessToken(agencyId);
    const data = await hubspotGet(token, '/crm/v3/pipelines/tickets');
    const pipelines = (data.results || []).map((p) => ({
        id: p.id,
        label: p.label,
        stages: (p.stages || [])
            .sort((a, b) => a.displayOrder - b.displayOrder)
            .map((s) => ({ id: s.id, label: s.label, displayOrder: s.displayOrder })),
    }));
    return { pipelines };
}

// ---------------------------------------------------------------------------
// Contacts (lifecycle stage + lead status)
// ---------------------------------------------------------------------------

const CONTACT_PROPS = [
    'firstname', 'lastname', 'email', 'phone', 'mobilephone',
    'lifecyclestage', 'hs_lead_status',
    'hubspot_owner_id', 'createdate', 'notes_last_updated',
    'hs_analytics_source', 'jobtitle', 'company',
].join(',');

/**
 * Page through all contacts and return them with lifecycle stage + lead status.
 * Caps at ~5000 contacts to avoid runaway calls.
 */
async function fetchContacts(agencyId, { limit = 100, maxPages = 50 } = {}) {
    const token = await getHubspotAccessToken(agencyId);
    const contacts = [];
    let after;
    for (let page = 0; page < maxPages; page++) {
        const params = { limit, properties: CONTACT_PROPS };
        if (after) params.after = after;
        const data = await hubspotGet(token, '/crm/v3/objects/contacts', params);
        for (const c of (data.results || [])) {
            const p = c.properties || {};
            contacts.push({
                hubspotId: c.id,
                name: [p.firstname, p.lastname].filter(Boolean).join(' ') || p.email || `Contact ${c.id}`,
                email: p.email || '',
                phone: p.phone || p.mobilephone || '',
                lifecycleStage: p.lifecyclestage || '',
                leadStatus: p.hs_lead_status || '',
                source: p.hs_analytics_source || '',
                ownerId: p.hubspot_owner_id || '',
                createdAt: p.createdate || '',
                lastActivity: p.notes_last_updated || '',
                jobTitle: p.jobtitle || '',
                company: p.company || '',
            });
        }
        after = data.paging?.next?.after;
        if (!after) break;
    }
    return contacts;
}

// ---------------------------------------------------------------------------
// Deals (pipeline stage)
// ---------------------------------------------------------------------------

const DEAL_PROPS = [
    'dealname', 'amount', 'dealstage', 'pipeline',
    'hubspot_owner_id', 'createdate', 'closedate',
    'hs_deal_stage_probability',
].join(',');

/**
 * Page through all deals with their pipeline and stage.
 */
async function fetchDeals(agencyId, { limit = 100, maxPages = 50 } = {}) {
    const token = await getHubspotAccessToken(agencyId);
    const deals = [];
    let after;
    for (let page = 0; page < maxPages; page++) {
        const params = { limit, properties: DEAL_PROPS };
        if (after) params.after = after;
        const data = await hubspotGet(token, '/crm/v3/objects/deals', params);
        for (const d of (data.results || [])) {
            const p = d.properties || {};
            deals.push({
                hubspotId: d.id,
                name: p.dealname || `Deal ${d.id}`,
                amount: p.amount || '',
                stageId: p.dealstage || '',
                pipelineId: p.pipeline || '',
                ownerId: p.hubspot_owner_id || '',
                createdAt: p.createdate || '',
                closeDate: p.closedate || '',
                probability: p.hs_deal_stage_probability || '',
            });
        }
        after = data.paging?.next?.after;
        if (!after) break;
    }
    return deals;
}

// ---------------------------------------------------------------------------
// Full sync: pull contacts + deals → update agency CRM leads & pipeline deals
// ---------------------------------------------------------------------------

/** Map HubSpot deal stage labels to IPM lead statuses where possible. */
const STAGE_LABEL_TO_IPM = {
    'appointment scheduled': 'viewing_scheduled',
    'qualified to buy': 'qualified',
    'presentation scheduled': 'viewing_scheduled',
    'decision maker bought-in': 'negotiation',
    'contract sent': 'under_contract',
    'closed won': 'won',
    'closed lost': 'lost',
};

function mapDealStageToIpm(stageLabel) {
    if (!stageLabel) return 'new';
    const key = stageLabel.trim().toLowerCase();
    return STAGE_LABEL_TO_IPM[key] || key.replace(/\s+/g, '_');
}

const LIFECYCLE_TO_LEAD_TYPE = {
    subscriber: 'buyer',
    lead: 'buyer',
    marketingqualifiedlead: 'buyer',
    salesqualifiedlead: 'buyer',
    opportunity: 'buyer',
    customer: 'buyer',
    evangelist: 'buyer',
    other: 'buyer',
};

/**
 * Full sync: pulls HubSpot pipelines, contacts, and deals via API,
 * then upserts them into the agency's CRM leads and pipeline deals.
 * Returns a summary of what changed.
 */
async function syncHubspotToAgency(agencyId) {
    const [{ pipelines }, contacts, deals] = await Promise.all([
        fetchDealPipelines(agencyId),
        fetchContacts(agencyId),
        fetchDeals(agencyId),
    ]);

    const stageMap = {};
    for (const p of pipelines) {
        for (const s of p.stages) {
            stageMap[s.id] = { label: s.label, pipelineLabel: p.label };
        }
    }

    const user = await User.findById(agencyId);
    if (!user) throw new Error('Agency not found');
    if (!user.agencyStats) user.agencyStats = {};
    if (!Array.isArray(user.agencyStats.crmLeads)) user.agencyStats.crmLeads = [];
    if (!Array.isArray(user.agencyStats.pipelineDeals)) user.agencyStats.pipelineDeals = [];

    const existingLeads = new Map(user.agencyStats.crmLeads.map((l) => [String(l.id), l]));
    const existingDeals = new Map(user.agencyStats.pipelineDeals.map((d) => [String(d.id), d]));

    let contactsCreated = 0, contactsUpdated = 0;
    let dealsCreated = 0, dealsUpdated = 0;

    const ownerMap = {};
    try {
        const token = await getHubspotAccessToken(agencyId);
        const ownersData = await hubspotGet(token, '/crm/v3/owners/');
        for (const o of (ownersData.results || [])) {
            ownerMap[o.id] = { email: o.email, name: [o.firstName, o.lastName].filter(Boolean).join(' ') };
        }
    } catch { /* non-critical */ }

    async function resolveAgent(ownerId) {
        if (!ownerId || !ownerMap[ownerId]) return '';
        const ownerEmail = ownerMap[ownerId].email;
        if (!ownerEmail) return '';
        const agent = await User.findOne({ email: new RegExp(`^${ownerEmail.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });
        if (agent && String(agent.agencyId) === String(agencyId)) return String(agent._id);
        return '';
    }

    for (const c of contacts) {
        const id = `hubspot-co-${c.hubspotId}`;
        const assignedAgentId = await resolveAgent(c.ownerId);
        const lead = {
            id,
            name: c.name,
            email: c.email,
            mobile: c.phone,
            type: 'Contact',
            status: c.leadStatus || c.lifecycleStage || 'new',
            leadType: LIFECYCLE_TO_LEAD_TYPE[c.lifecycleStage] || 'buyer',
            source: c.source ? `HubSpot (${c.source})` : 'HubSpot API sync',
            dateAdded: c.createdAt || new Date().toISOString(),
            lastContact: c.lastActivity || '',
            budget: '',
            propertyOfInterest: '',
            leadScore: null,
            assignedAgentId,
            linkedProperties: {},
            activities: [],
            buyerDetails: {
                jobTitle: c.jobTitle,
                company: c.company,
                hubspotRecordId: c.hubspotId,
                lifecycleStage: c.lifecycleStage,
                leadStatus: c.leadStatus,
            },
            externalIds: { hubspot: { contactId: c.hubspotId } },
        };

        const existing = existingLeads.get(id);
        if (existing) {
            const plain = typeof existing.toObject === 'function' ? existing.toObject() : { ...existing };
            Object.assign(plain, lead);
            const idx = user.agencyStats.crmLeads.findIndex((l) => String(l.id) === id);
            if (idx >= 0) user.agencyStats.crmLeads[idx] = plain;
            contactsUpdated++;
        } else {
            user.agencyStats.crmLeads.push(lead);
            existingLeads.set(id, lead);
            contactsCreated++;
        }
    }

    for (const d of deals) {
        const id = `hubspot-de-${d.hubspotId}`;
        const stageInfo = stageMap[d.stageId] || {};
        const entry = {
            id,
            name: d.name,
            role: '',
            type: stageInfo.pipelineLabel || 'Deal',
            property: '',
            price: d.amount,
            days: '',
            status: stageInfo.label || d.stageId || 'open',
            externalIds: {
                hubspot: {
                    dealId: d.hubspotId,
                    pipelineId: d.pipelineId,
                    stageId: d.stageId,
                    stageLabel: stageInfo.label || '',
                    pipelineLabel: stageInfo.pipelineLabel || '',
                },
            },
        };

        const existingDeal = existingDeals.get(id);
        if (existingDeal) {
            const plain = typeof existingDeal.toObject === 'function' ? existingDeal.toObject() : { ...existingDeal };
            Object.assign(plain, entry);
            const idx = user.agencyStats.pipelineDeals.findIndex((x) => String(x.id) === id);
            if (idx >= 0) user.agencyStats.pipelineDeals[idx] = plain;
            dealsUpdated++;
        } else {
            user.agencyStats.pipelineDeals.push(entry);
            existingDeals.set(id, entry);
            dealsCreated++;
        }
    }

    user.markModified('agencyStats');
    await user.save();

    return {
        pipelines: pipelines.map((p) => ({ id: p.id, label: p.label, stageCount: p.stages.length })),
        contacts: { total: contacts.length, created: contactsCreated, updated: contactsUpdated },
        deals: { total: deals.length, created: dealsCreated, updated: dealsUpdated },
        stageSummary: buildStageSummary(contacts, deals, stageMap),
    };
}

function buildStageSummary(contacts, deals, stageMap) {
    const lifecycleCounts = {};
    const leadStatusCounts = {};
    const dealStageCounts = {};

    for (const c of contacts) {
        const lc = c.lifecycleStage || 'unknown';
        lifecycleCounts[lc] = (lifecycleCounts[lc] || 0) + 1;
        if (c.leadStatus) {
            leadStatusCounts[c.leadStatus] = (leadStatusCounts[c.leadStatus] || 0) + 1;
        }
    }
    for (const d of deals) {
        const info = stageMap[d.stageId];
        const label = info ? `${info.pipelineLabel} → ${info.label}` : d.stageId || 'unknown';
        dealStageCounts[label] = (dealStageCounts[label] || 0) + 1;
    }

    return { lifecycleStages: lifecycleCounts, leadStatuses: leadStatusCounts, dealStages: dealStageCounts };
}

module.exports = {
    getHubspotAccessToken,
    fetchDealPipelines,
    fetchTicketPipelines,
    fetchContacts,
    fetchDeals,
    syncHubspotToAgency,
    mapDealStageToIpm,
};

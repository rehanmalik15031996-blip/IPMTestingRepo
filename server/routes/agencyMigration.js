const router = require('express').Router();
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../models/User');
const Property = require('../models/Property');
const { agencyListingPropertyFilter } = require('../utils/agencyListingsQuery');
const { createPropdataImportJob, executePropdataImportJob } = require('../services/propdataXlsxImport');
const { createAgencyResetJob, executeAgencyResetJob, publicAgencyResetPayload } = require('../services/agencyResetJob');
const { runHubspotCsvImport } = require('../services/hubspotCsvImport');
const { materializeListingsFromAgencyCrmLeads } = require('../services/materializeListingsFromCrm');
const { fetchDealPipelines, fetchTicketPipelines, fetchContacts, fetchDeals, syncHubspotToAgency } = require('../services/hubspotApi');
const { buildConfigFromHubspotExport } = require('../services/hubspotConfigBuilder');

const JWT_SECRET = process.env.JWT_SECRET || 'SECRET_KEY_123';
const RESET_CONFIRM_PHRASE = 'ok';
/** Strip zero‑width chars; lowercase + NFKC so pasted “ok” / legacy phrase still match. */
function normalizeResetPhraseInput(s) {
    return String(s ?? '')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .trim()
        .toLowerCase()
        .normalize('NFKC');
}
const RESET_CONFIRM_ALIASES = new Set([
    RESET_CONFIRM_PHRASE,
    'reset my import data',
]);
const CLIENT_APP_URL = (process.env.CLIENT_APP_URL || process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');

/** HubSpot OAuth scopes (see https://developers.hubspot.com/docs/guides/apps/authentication/scopes) */
const HUBSPOT_OAUTH_SCOPES = [
    'crm.objects.contacts.read',
    'crm.objects.contacts.write',
    'crm.objects.deals.read',
    'crm.objects.deals.write',
    'crm.objects.companies.read',
].join(' ');

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

function ensureMigrationImports(user) {
    if (!user.agencyStats) user.agencyStats = {};
    if (!user.agencyStats.migrationImports || typeof user.agencyStats.migrationImports !== 'object') {
        user.agencyStats.migrationImports = { hubspot: [], propdata: [] };
    }
    if (!Array.isArray(user.agencyStats.migrationImports.hubspot)) user.agencyStats.migrationImports.hubspot = [];
    if (!Array.isArray(user.agencyStats.migrationImports.propdata)) user.agencyStats.migrationImports.propdata = [];
}

function ensureIntegrations(user) {
    ensureMigrationImports(user);
    if (!user.agencyStats.integrations || typeof user.agencyStats.integrations !== 'object') {
        user.agencyStats.integrations = { hubspot: {}, propdata: {} };
    }
    ['hubspot', 'propdata'].forEach((k) => {
        if (!user.agencyStats.integrations[k] || typeof user.agencyStats.integrations[k] !== 'object') {
            user.agencyStats.integrations[k] = {};
        }
    });
}

function integrationStatusPayload(user) {
    ensureIntegrations(user);
    const h = user.agencyStats.integrations.hubspot;
    const p = user.agencyStats.integrations.propdata;
    return {
        hubspot: {
            privateAppConnected: !!h.privateAppAccessToken,
            oauthConnected: !!(h.oauthRefreshToken || h.oauthAccessToken),
            oauthAppConfigured: !!(h.oauthApp && h.oauthApp.clientId && h.oauthApp.clientSecret && h.oauthApp.redirectUri),
            portalId: h.portalId || null,
        },
        propdata: {
            connected: !!p.bearerToken,
            vendorEmail: p.vendorEmail || null,
        },
        migrationFiles: {
            hubspot: (user.agencyStats.migrationImports.hubspot || []).length,
            propdata: (user.agencyStats.migrationImports.propdata || []).length,
        },
    };
}

async function verifyHubspotPrivateAppToken(accessToken) {
    const tokenPreview = accessToken ? `${accessToken.slice(0, 12)}...${accessToken.slice(-6)} (len=${accessToken.length})` : '(empty)';
    console.log('[HubSpot verify] token preview:', tokenPreview);

    // Try CRM contacts first (works with both private app tokens AND personal access keys)
    const crmRes = await fetch('https://api.hubapi.com/crm/v3/objects/contacts?limit=1', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    const crmText = await crmRes.text();
    console.log('[HubSpot verify] CRM contacts status:', crmRes.status, 'body:', crmText.slice(0, 300));

    if (crmRes.ok) {
        let portalId = null;
        try {
            const infoRes = await fetch('https://api.hubapi.com/oauth/v1/access-tokens/' + accessToken);
            if (infoRes.ok) {
                const info = await infoRes.json();
                portalId = info.hub_id != null ? String(info.hub_id) : null;
            }
        } catch { /* non-critical */ }
        return { portalId };
    }

    // Fallback: try account-info (private app tokens only)
    const acctRes = await fetch('https://api.hubapi.com/account-info/v3/details', {
        headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (acctRes.ok) {
        const data = await acctRes.json();
        return { portalId: data.portalId != null ? String(data.portalId) : null };
    }

    let msg = 'HubSpot rejected this token. Use a Private App token (Super Admin) or a Personal Access Key with CRM read scopes.';
    try {
        const j = JSON.parse(crmText);
        if (j.message) msg = j.message;
    } catch { /* ignore */ }
    throw new Error(msg);
}

async function propdataExchangeCredentials(username, password) {
    const basic = Buffer.from(`${String(username).trim()}:${String(password)}`, 'utf8').toString('base64');
    const res = await fetch('https://api-gw.propdata.net/users/public-api/login/', {
        method: 'GET',
        headers: { Authorization: `Basic ${basic}` },
    });
    const text = await res.text();
    let data;
    try {
        data = JSON.parse(text);
    } catch (e) {
        throw new Error('PropData login did not return JSON. Confirm vendor API access with PropData.');
    }
    if (!res.ok) {
        throw new Error(data.message || data.detail || `PropData login failed (${res.status})`);
    }
    const clients = data.clients;
    const token = Array.isArray(clients) && clients[0] && clients[0].token;
    if (!token) {
        throw new Error('PropData response did not include clients[0].token (see PropData API docs).');
    }
    return {
        bearerToken: token,
        vendorUserId: data.id != null ? data.id : null,
        vendorEmail: data.email || null,
    };
}

async function requireAgency(req, res, next) {
    const userId = getUserIdFromRequest(req);
    if (!userId) return res.status(401).json({ message: 'Authorization required' });
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if (String(user.role || '').toLowerCase() !== 'agency') {
            return res.status(403).json({ message: 'Only agency accounts can use migration tools' });
        }
        req.agencyUser = user;
        next();
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}

function importDir(agencyId, sub) {
    return path.join('uploads', 'agency-imports', String(agencyId), sub);
}

function makeUploader(subdir) {
    return multer({
        storage: multer.diskStorage({
            destination: (req, file, cb) => {
                const dir = importDir(req.agencyUser._id, subdir);
                fs.mkdirSync(dir, { recursive: true });
                cb(null, dir);
            },
            filename: (req, file, cb) => {
                const safe = `${Date.now()}-${String(file.originalname).replace(/[^a-zA-Z0-9._-]/g, '_')}`;
                cb(null, safe);
            },
        }),
        limits: { fileSize: 50 * 1024 * 1024, files: 50 },
    });
}

const uploadHubspot = makeUploader('hubspot');
const uploadPropdata = makeUploader('propdata');

const uploadPropdataImport = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024, files: 2 },
});

const PROPDATA_JOB_TTL_MS = 15 * 60 * 1000;
/** @type {Map<string, { agencyId: string, job: object, createdAt: number }>} */
const propdataImportJobs = new Map();

function strReset(v) {
    return v == null ? '' : String(v);
}

function cleanupPropdataJobs() {
    const now = Date.now();
    for (const [id, entry] of propdataImportJobs.entries()) {
        if (now - entry.createdAt > PROPDATA_JOB_TTL_MS) propdataImportJobs.delete(id);
    }
}

function publicPropdataJobPayload(job) {
    return {
        jobId: job.id,
        done: job.done,
        error: job.error,
        phases: (job.phases || []).map((p) => ({
            key: p.key,
            title: p.title,
            status: p.status,
            current: p.current,
            total: p.total,
            detail: p.detail || '',
            error: p.error || '',
        })),
        summary: job.summary,
    };
}

const RESET_ATOMIC = new Set([
    'propdata-properties',
    'propdata-leads',
    'propdata-agents',
    'propdata-files',
    'hubspot-leads',
    'hubspot-deals',
    'hubspot-files',
    'agency-properties-all',
    'agency-agents-all',
    'agency-crm-all',
    'agency-pipeline-all',
]);

const AGENCY_EVERYTHING_SCOPES = [
    'propdata-files',
    'hubspot-files',
    'agency-properties-all',
    'agency-agents-all',
    'agency-crm-all',
    'agency-pipeline-all',
];

/** @param {string[]} list */
function expandResetScopes(list) {
    const out = new Set();
    for (let s of list) {
        s = strReset(s).toLowerCase().trim();
        if (!s) continue;
        if (s === 'all') {
            ['propdata-properties', 'propdata-leads', 'propdata-agents', 'propdata-files', 'hubspot-leads', 'hubspot-deals', 'hubspot-files'].forEach(
                (x) => out.add(x),
            );
        } else if (s === 'agency-everything') {
            AGENCY_EVERYTHING_SCOPES.forEach((x) => out.add(x));
        } else if (s === 'propdata' || s === 'propdata-all') {
            ['propdata-properties', 'propdata-leads', 'propdata-agents', 'propdata-files'].forEach((x) => out.add(x));
        } else if (s === 'hubspot' || s === 'hubspot-all') {
            ['hubspot-leads', 'hubspot-deals', 'hubspot-files'].forEach((x) => out.add(x));
        } else if (RESET_ATOMIC.has(s)) {
            out.add(s);
        }
    }
    return out;
}

const RESET_JOB_TTL_MS = 15 * 60 * 1000;
/** @type {Map<string, { agencyId: string, job: object, createdAt: number }>} */
const agencyResetJobs = new Map();

function cleanupAgencyResetJobs() {
    const now = Date.now();
    for (const [id, entry] of agencyResetJobs.entries()) {
        if (now - entry.createdAt > RESET_JOB_TTL_MS) agencyResetJobs.delete(id);
    }
}

// --- Settings → Integrations (API connect + status; file uploads use /hubspot and /propdata below) ---
router.get('/integrations/status', requireAgency, async (req, res) => {
    try {
        const user = await User.findById(req.agencyUser._id);
        if (!user) return res.status(404).json({ message: 'User not found' });
        res.json({ success: true, status: integrationStatusPayload(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/** Lean snapshot for debugging listing visibility: title + agent label + counts (no secrets). */
router.get('/debug/listings-lean', requireAgency, async (req, res) => {
    try {
        const agencyId = req.agencyUser._id;
        const filter = await agencyListingPropertyFilter(agencyId);
        const [broad, byImportOnly, props] = await Promise.all([
            Property.countDocuments(filter),
            Property.countDocuments({ importAgencyId: agencyId }),
            Property.find(filter).select('title agentId importListingRef importSource').sort({ createdAt: -1 }).limit(35).lean(),
        ]);
        const agentIds = [...new Set(props.map((p) => String(p.agentId)).filter(Boolean))];
        const agents = await User.find({ _id: { $in: agentIds } }).select('name email').lean();
        const agentLabel = Object.fromEntries(agents.map((u) => [String(u._id), u.name || u.email || String(u._id)]));
        const items = props.map((p) => ({
            title: p.title || '(no title)',
            agent: agentLabel[String(p.agentId)] || String(p.agentId || '—'),
            webRef: p.importListingRef || '',
        }));
        res.setHeader('Cache-Control', 'no-store');
        res.json({
            success: true,
            counts: { matchingAgencyScope: broad, importAgencyIdOnly: byImportOnly },
            note: 'matchingAgencyScope = importAgencyId OR agentId in (you + users with agencyId).',
            items,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * Upsert minimal Property rows from agency CRM leads that expose a Web Ref (linkedProperties / externalIds / listing text).
 * Listing Management uses the same agency scope as importAgencyId + agentId.
 */
router.post('/sync/listings-from-crm-leads', requireAgency, async (req, res) => {
    try {
        const summary = await materializeListingsFromAgencyCrmLeads(req.agencyUser._id);
        res.setHeader('Cache-Control', 'no-store');
        res.json({ success: true, summary });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Sync failed' });
    }
});

router.post('/integrations/hubspot/private-app', requireAgency, async (req, res) => {
    try {
        const accessToken = String((req.body || {}).accessToken || '').trim();
        if (!accessToken) return res.status(400).json({ message: 'accessToken is required' });
        const { portalId } = await verifyHubspotPrivateAppToken(accessToken);
        const user = await User.findById(req.agencyUser._id);
        ensureIntegrations(user);
        const prev = user.agencyStats.integrations.hubspot || {};
        user.agencyStats.integrations.hubspot = {
            ...prev,
            privateAppAccessToken: accessToken,
            portalId: portalId || prev.portalId || null,
            privateAppConnectedAt: new Date().toISOString(),
        };
        delete user.agencyStats.integrations.hubspot.oauthAccessToken;
        delete user.agencyStats.integrations.hubspot.oauthRefreshToken;
        delete user.agencyStats.integrations.hubspot.oauthExpiresAt;
        user.markModified('agencyStats');
        await user.save();
        res.json({
            success: true,
            status: integrationStatusPayload(user),
            message: 'HubSpot private app token saved and verified.',
        });
    } catch (err) {
        res.status(400).json({ message: err.message || 'Failed to connect HubSpot' });
    }
});

router.post('/integrations/hubspot/oauth-app', requireAgency, async (req, res) => {
    try {
        const { clientId, clientSecret, redirectUri } = req.body || {};
        const cid = String(clientId || '').trim();
        const secret = String(clientSecret || '').trim();
        const redir = String(redirectUri || '').trim();
        if (!cid || !secret || !redir) {
            return res.status(400).json({ message: 'clientId, clientSecret, and redirectUri are required' });
        }
        const user = await User.findById(req.agencyUser._id);
        ensureIntegrations(user);
        const prev = user.agencyStats.integrations.hubspot || {};
        user.agencyStats.integrations.hubspot = {
            ...prev,
            oauthApp: { clientId: cid, clientSecret: secret, redirectUri: redir },
            oauthAppUpdatedAt: new Date().toISOString(),
        };
        user.markModified('agencyStats');
        await user.save();
        res.json({ success: true, status: integrationStatusPayload(user), message: 'OAuth app credentials saved.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/integrations/hubspot/oauth/authorize-url', requireAgency, async (req, res) => {
    try {
        const user = await User.findById(req.agencyUser._id);
        ensureIntegrations(user);
        const app = user.agencyStats.integrations.hubspot.oauthApp;
        if (!app || !app.clientId || !app.redirectUri) {
            return res.status(400).json({ message: 'Save OAuth app credentials (client ID, secret, redirect URI) first.' });
        }
        const state = jwt.sign({ sub: String(user._id), typ: 'hubspot_oauth' }, JWT_SECRET, { expiresIn: '15m' });
        const qs = new URLSearchParams({
            client_id: app.clientId,
            redirect_uri: app.redirectUri,
            scope: HUBSPOT_OAUTH_SCOPES,
            state,
        });
        const url = `https://app.hubspot.com/oauth/authorize?${qs.toString()}`;
        res.json({ success: true, url });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/integrations/hubspot/oauth/callback', async (req, res) => {
    try {
        const code = req.query.code;
        const state = req.query.state;
        if (!code || !state) return res.status(400).send('Missing code or state');
        let payload;
        try {
            payload = jwt.verify(String(state), JWT_SECRET);
        } catch (e) {
            return res.status(400).send('Invalid or expired state');
        }
        if (payload.typ !== 'hubspot_oauth' || !payload.sub) return res.status(400).send('Invalid state');
        const user = await User.findById(payload.sub);
        if (!user) return res.status(404).send('User not found');
        ensureIntegrations(user);
        const app = user.agencyStats.integrations.hubspot.oauthApp;
        if (!app || !app.clientSecret) return res.status(400).send('OAuth app not configured');
        const tokenRes = await fetch('https://api.hubapi.com/oauth/v1/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                grant_type: 'authorization_code',
                client_id: app.clientId,
                client_secret: app.clientSecret,
                redirect_uri: app.redirectUri,
                code: String(code),
            }),
        });
        const tokenText = await tokenRes.text();
        let tokenJson;
        try {
            tokenJson = JSON.parse(tokenText);
        } catch (e) {
            return res.status(502).send('HubSpot token response was not JSON');
        }
        if (!tokenRes.ok) {
            return res.status(400).send(tokenJson.message || 'Token exchange failed');
        }
        const expiresIn = Number(tokenJson.expires_in) || 3600;
        const prev = user.agencyStats.integrations.hubspot || {};
        user.agencyStats.integrations.hubspot = {
            ...prev,
            oauthAccessToken: tokenJson.access_token,
            oauthRefreshToken: tokenJson.refresh_token || prev.oauthRefreshToken,
            oauthExpiresAt: Date.now() + expiresIn * 1000,
            oauthConnectedAt: new Date().toISOString(),
        };
        delete user.agencyStats.integrations.hubspot.privateAppAccessToken;
        user.markModified('agencyStats');
        await user.save();
        res.redirect(`${CLIENT_APP_URL}/settings?tab=integrations&hubspot=oauth_ok`);
    } catch (err) {
        console.error('HubSpot OAuth callback:', err);
        res.status(500).send(err.message || 'OAuth error');
    }
});

router.post('/integrations/propdata/connect', requireAgency, async (req, res) => {
    try {
        const { username, password } = req.body || {};
        const un = String(username || '').trim();
        const pw = String(password || '');
        if (!un || !pw) return res.status(400).json({ message: 'username and password are required' });
        const out = await propdataExchangeCredentials(un, pw);
        const user = await User.findById(req.agencyUser._id);
        ensureIntegrations(user);
        user.agencyStats.integrations.propdata = {
            bearerToken: out.bearerToken,
            vendorUserId: out.vendorUserId,
            vendorEmail: out.vendorEmail,
            connectedAt: new Date().toISOString(),
        };
        user.markModified('agencyStats');
        await user.save();
        res.json({
            success: true,
            status: integrationStatusPayload(user),
            message: 'PropData credentials verified; bearer token stored for sync jobs.',
        });
    } catch (err) {
        res.status(400).json({ message: err.message || 'PropData connection failed' });
    }
});

router.post('/integrations/disconnect', requireAgency, async (req, res) => {
    try {
        const provider = String((req.body || {}).provider || '').toLowerCase();
        if (!['hubspot', 'propdata'].includes(provider)) {
            return res.status(400).json({ message: 'provider must be hubspot or propdata' });
        }
        const user = await User.findById(req.agencyUser._id);
        ensureIntegrations(user);
        if (provider === 'hubspot') {
            user.agencyStats.integrations.hubspot = {};
        } else {
            user.agencyStats.integrations.propdata = {};
        }
        user.markModified('agencyStats');
        await user.save();
        res.json({ success: true, status: integrationStatusPayload(user) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/hubspot', requireAgency, uploadHubspot.array('files', 50), async (req, res) => {
    try {
        const user = req.agencyUser;
        const files = req.files || [];
        if (!files.length) return res.status(400).json({ message: 'No files uploaded' });
        ensureMigrationImports(user);
        for (const f of files) {
            user.agencyStats.migrationImports.hubspot.push({
                originalName: f.originalname,
                storedPath: f.path,
                uploadedAt: new Date().toISOString(),
            });
        }
        user.markModified('agencyStats');
        await user.save();
        res.status(200).json({
            success: true,
            count: files.length,
            files: user.agencyStats.migrationImports.hubspot,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * GET poll: `{ done, error, phases[], summary }` — buffers are never returned.
 */
router.get('/import/propdata-xlsx/status/:jobId', requireAgency, async (req, res) => {
    try {
        cleanupPropdataJobs();
        const entry = propdataImportJobs.get(req.params.jobId);
        if (!entry) return res.status(404).json({ message: 'Job not found or expired' });
        if (entry.agencyId !== String(req.agencyUser._id)) return res.status(403).json({ message: 'Forbidden' });
        res.json({ success: true, ...publicPropdataJobPayload(entry.job) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/**
 * POST multipart: fields `residential` (XLSX), `leads` (XLSX), optional `replacePropdataLeads` = "true", optional `maxListings`, optional `leanImport` = "true" (minimal Property fields only)
 * Returns `{ jobId }` immediately; poll GET …/status/:jobId for progress.
 */
router.post(
    '/import/propdata-xlsx',
    requireAgency,
    uploadPropdataImport.fields([
        { name: 'residential', maxCount: 1 },
        { name: 'leads', maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const residentialFile = (req.files && req.files.residential && req.files.residential[0]) || null;
            const leadsFile = (req.files && req.files.leads && req.files.leads[0]) || null;
            if (!residentialFile && !leadsFile) {
                return res.status(400).json({ message: 'Upload at least one file: residential and/or leads XLSX.' });
            }
            const agencyUser = await User.findById(req.agencyUser._id);
            if (!agencyUser) return res.status(404).json({ message: 'Agency not found' });

            const replacePropdataLeads = String(req.body?.replacePropdataLeads || '').toLowerCase() === 'true';
            const maxRaw = req.body?.maxListings;
            const maxParsed = maxRaw === '' || maxRaw == null ? null : Number(maxRaw);
            const maxListings = Number.isFinite(maxParsed) && maxParsed > 0 ? maxParsed : null;
            const leanImport = String(req.body?.leanImport || '').toLowerCase() === 'true';

            cleanupPropdataJobs();
            const jobId = crypto.randomUUID();
            const job = createPropdataImportJob({
                id: jobId,
                agencyId: String(agencyUser._id),
                residentialBuffer: residentialFile ? residentialFile.buffer : null,
                leadsBuffer: leadsFile ? leadsFile.buffer : null,
                replacePropdataLeads,
                maxListings,
                lean: leanImport,
            });
            propdataImportJobs.set(jobId, { agencyId: String(agencyUser._id), job, createdAt: Date.now() });

            res.status(202).json({ success: true, jobId, message: 'Import started. Poll status until done.' });

            setImmediate(() => {
                executePropdataImportJob(job).catch((err) => {
                    console.error('propdata-xlsx job', jobId, err);
                    job.error = job.error || err.message || String(err);
                    job.done = true;
                });
            });
        } catch (err) {
            console.error('propdata-xlsx import:', err);
            res.status(500).json({ message: err.message || 'Import failed' });
        }
    },
);

/**
 * POST multipart: `contacts` and/or `deals` (CSV or XLSX HubSpot export). Optional `replaceHubspotLeads` = "true".
 * Stores HubSpot Record IDs on crmLeads / pipelineDeals — no HubSpot API.
 */
router.post(
    '/import/hubspot-export',
    requireAgency,
    uploadPropdataImport.fields([
        { name: 'contacts', maxCount: 1 },
        { name: 'deals', maxCount: 1 },
    ]),
    async (req, res) => {
        try {
            const contactsF = (req.files && req.files.contacts && req.files.contacts[0]) || null;
            const dealsF = (req.files && req.files.deals && req.files.deals[0]) || null;
            if (!contactsF && !dealsF) {
                return res.status(400).json({ message: 'Upload at least one file: HubSpot contacts and/or deals export (CSV or XLSX).' });
            }
            const agencyUser = await User.findById(req.agencyUser._id);
            if (!agencyUser) return res.status(404).json({ message: 'Agency not found' });
            const replaceHubspotLeads = String(req.body?.replaceHubspotLeads || '').toLowerCase() === 'true';

            const summary = await runHubspotCsvImport({
                agencyId: agencyUser._id,
                contactsBuffer: contactsF ? contactsF.buffer : null,
                dealsBuffer: dealsF ? dealsF.buffer : null,
                contactsFilename: contactsF ? contactsF.originalname : '',
                dealsFilename: dealsF ? dealsF.originalname : '',
                replaceHubspotLeads,
            });

            // Auto-build/update CRM config from the imported data
            try {
                const configResult = buildConfigFromHubspotExport({
                    contactsBuffer: contactsF ? contactsF.buffer : null,
                    dealsBuffer: dealsF ? dealsF.buffer : null,
                    contactsFilename: contactsF ? contactsF.originalname : '',
                    dealsFilename: dealsF ? dealsF.originalname : '',
                });
                const freshUser = await User.findById(agencyUser._id);
                if (freshUser) {
                    if (!freshUser.agencyStats) freshUser.agencyStats = {};
                    if (!freshUser.agencyStats.crmConfig) freshUser.agencyStats.crmConfig = {};
                    freshUser.agencyStats.crmConfig.pipelineStages = configResult.pipelineStages.map((s, i) => ({
                        id: s.id, title: s.title, order: i, color: s.color,
                    }));
                    freshUser.agencyStats.crmConfig.activityChannels = configResult.activityChannels.map((c) => ({
                        value: c.value, label: c.label,
                    }));
                    freshUser.agencyStats.crmConfig.hubspotFieldMap = configResult.hubspotFieldMap;
                    freshUser.agencyStats.crmConfig.builtFrom = 'hubspot-import';
                    freshUser.agencyStats.crmConfig.updatedAt = new Date();
                    freshUser.markModified('agencyStats');
                    await freshUser.save();
                    summary.crmConfigUpdated = true;
                    summary.pipelineStagesCount = configResult.pipelineStages.length;
                    summary.activityChannelsCount = configResult.activityChannels.length;
                }
            } catch (cfgErr) {
                console.error('Auto-config from HubSpot import failed (non-fatal):', cfgErr.message);
                summary.crmConfigUpdated = false;
            }

            res.status(200).json({
                success: true,
                summary,
                message: `HubSpot export: ${summary.contactsImported} contacts, ${summary.dealsImported} deals (rows processed).`,
            });
        } catch (err) {
            console.error('hubspot-export import:', err);
            res.status(500).json({ message: err.message || 'Import failed' });
        }
    },
);

router.post('/propdata', requireAgency, uploadPropdata.array('files', 50), async (req, res) => {
    try {
        const user = req.agencyUser;
        const files = req.files || [];
        if (!files.length) return res.status(400).json({ message: 'No files uploaded' });
        ensureMigrationImports(user);
        for (const f of files) {
            user.agencyStats.migrationImports.propdata.push({
                originalName: f.originalname,
                storedPath: f.path,
                uploadedAt: new Date().toISOString(),
            });
        }
        user.markModified('agencyStats');
        await user.save();
        res.status(200).json({
            success: true,
            count: files.length,
            files: user.agencyStats.migrationImports.propdata,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

function unlinkQuiet(p) {
    try {
        if (p && fs.existsSync(p)) fs.unlinkSync(p);
    } catch (e) {
        console.warn('agencyMigration unlink:', p, e.message);
    }
}

function rmDirQuiet(dir) {
    try {
        if (dir && fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
    } catch (e) {
        console.warn('agencyMigration rmdir:', dir, e.message);
    }
}

router.get('/reset/status/:jobId', requireAgency, async (req, res) => {
    try {
        cleanupAgencyResetJobs();
        const entry = agencyResetJobs.get(req.params.jobId);
        if (!entry) return res.status(404).json({ message: 'Job not found or expired' });
        if (entry.agencyId !== String(req.agencyUser._id)) return res.status(403).json({ message: 'Forbidden' });
        res.json({ success: true, ...publicAgencyResetPayload(entry.job) });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.post('/reset', requireAgency, async (req, res) => {
    try {
        const body = req.body && typeof req.body === 'object' ? req.body : {};
        const { scope, scopes, confirmPhrase } = body;
        const phrase = normalizeResetPhraseInput(confirmPhrase);
        if (!RESET_CONFIRM_ALIASES.has(phrase)) {
            return res.status(400).json({
                message: `Type the confirmation (${RESET_CONFIRM_PHRASE}) in the box.`,
            });
        }

        function normalizeScopeToken(v) {
            return strReset(v)
                .replace(/[\u200B-\u200D\uFEFF]/g, '')
                .toLowerCase()
                .trim();
        }

        let rawList = [];
        if (Array.isArray(scopes) && scopes.length) {
            rawList = scopes.map((x) => normalizeScopeToken(x)).filter(Boolean);
        } else if (typeof scopes === 'string' && scopes.trim()) {
            rawList = [normalizeScopeToken(scopes)];
        } else if (scope) {
            rawList = [normalizeScopeToken(scope)];
        }
        if (!rawList.length) {
            return res.status(400).json({
                message:
                    'Provide scopes[]: migration (propdata-*, hubspot-*) or agency-wide (agency-properties-all, agency-agents-all, agency-crm-all, agency-pipeline-all), or preset agency-everything.',
            });
        }

        const expanded = expandResetScopes(rawList);
        if (!expanded.size) {
            return res.status(400).json({ message: 'No valid reset scopes in request.' });
        }

        const user = await User.findById(req.agencyUser._id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        cleanupAgencyResetJobs();
        const jobId = crypto.randomUUID();
        const job = createAgencyResetJob({ id: jobId, agencyId: user._id, expandedScopes: [...expanded] });
        agencyResetJobs.set(jobId, { agencyId: String(user._id), job, createdAt: Date.now() });

        res.status(202).json({
            success: true,
            jobId,
            scopesApplied: [...expanded],
            message: 'Reset job started. Poll status until done.',
        });

        setImmediate(() => {
            executeAgencyResetJob(job).catch((err) => {
                console.error('agency reset job', jobId, err);
                job.error = job.error || err.message || String(err);
                job.done = true;
            });
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ---------------------------------------------------------------------------
// HubSpot live API routes (require connected HubSpot token)
// ---------------------------------------------------------------------------

/** Fetch deal pipelines + stages (buyer/seller journey) from HubSpot. */
router.get('/hubspot/pipelines', requireAgency, async (req, res) => {
    try {
        const [deals, tickets] = await Promise.all([
            fetchDealPipelines(req.agencyUser._id),
            fetchTicketPipelines(req.agencyUser._id).catch(() => ({ pipelines: [] })),
        ]);
        res.json({ success: true, dealPipelines: deals.pipelines, ticketPipelines: tickets.pipelines });
    } catch (err) {
        res.status(err.message?.includes('not connected') ? 400 : 500).json({ message: err.message });
    }
});

/** Preview contacts with lifecycle stage & lead status (no write). */
router.get('/hubspot/contacts-preview', requireAgency, async (req, res) => {
    try {
        const contacts = await fetchContacts(req.agencyUser._id, { limit: 100, maxPages: 5 });
        const lifecycleCounts = {};
        const leadStatusCounts = {};
        for (const c of contacts) {
            const lc = c.lifecycleStage || 'unknown';
            lifecycleCounts[lc] = (lifecycleCounts[lc] || 0) + 1;
            if (c.leadStatus) leadStatusCounts[c.leadStatus] = (leadStatusCounts[c.leadStatus] || 0) + 1;
        }
        res.json({
            success: true,
            totalFetched: contacts.length,
            lifecycleStages: lifecycleCounts,
            leadStatuses: leadStatusCounts,
            sample: contacts.slice(0, 20).map((c) => ({
                name: c.name,
                email: c.email,
                lifecycleStage: c.lifecycleStage,
                leadStatus: c.leadStatus,
            })),
        });
    } catch (err) {
        res.status(err.message?.includes('not connected') ? 400 : 500).json({ message: err.message });
    }
});

/** Preview deals with pipeline stages (no write). */
router.get('/hubspot/deals-preview', requireAgency, async (req, res) => {
    try {
        const [{ pipelines }, deals] = await Promise.all([
            fetchDealPipelines(req.agencyUser._id),
            fetchDeals(req.agencyUser._id, { limit: 100, maxPages: 5 }),
        ]);
        const stageMap = {};
        for (const p of pipelines) {
            for (const s of p.stages) stageMap[s.id] = { label: s.label, pipelineLabel: p.label };
        }
        const stageCounts = {};
        for (const d of deals) {
            const info = stageMap[d.stageId];
            const label = info ? `${info.pipelineLabel} → ${info.label}` : d.stageId || 'unknown';
            stageCounts[label] = (stageCounts[label] || 0) + 1;
        }
        res.json({
            success: true,
            totalFetched: deals.length,
            dealStages: stageCounts,
            sample: deals.slice(0, 20).map((d) => {
                const info = stageMap[d.stageId] || {};
                return {
                    name: d.name,
                    amount: d.amount,
                    pipeline: info.pipelineLabel || d.pipelineId,
                    stage: info.label || d.stageId,
                };
            }),
        });
    } catch (err) {
        res.status(err.message?.includes('not connected') ? 400 : 500).json({ message: err.message });
    }
});

/** Full sync: pull contacts + deals from HubSpot API → upsert into agency CRM leads & pipeline deals. */
router.post('/hubspot/sync', requireAgency, async (req, res) => {
    try {
        const summary = await syncHubspotToAgency(req.agencyUser._id);
        res.json({ success: true, summary, message: 'HubSpot sync complete.' });
    } catch (err) {
        res.status(err.message?.includes('not connected') ? 400 : 500).json({ message: err.message });
    }
});

// ═══════════════════════════════════════════════════════════════════════════
// CRM Config — per-agency pipeline stages, activity channels, field mappings
// ═══════════════════════════════════════════════════════════════════════════

/** GET current CRM config for the agency (or empty defaults). */
router.get('/crm-config', requireAgency, async (req, res) => {
    try {
        const user = req.agencyUser;
        const cfg = user.agencyStats?.crmConfig || {};
        res.json({
            success: true,
            crmConfig: {
                pipelineStages: cfg.pipelineStages || [],
                activityChannels: cfg.activityChannels || [],
                hubspotFieldMap: cfg.hubspotFieldMap || {},
                builtFrom: cfg.builtFrom || null,
                updatedAt: cfg.updatedAt || null,
            },
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/** PUT — save full CRM config (stages + channels). Replaces existing config. */
router.put('/crm-config', requireAgency, async (req, res) => {
    try {
        const user = req.agencyUser;
        const { pipelineStages, activityChannels, hubspotFieldMap } = req.body;

        if (!user.agencyStats) user.agencyStats = {};
        if (!user.agencyStats.crmConfig) user.agencyStats.crmConfig = {};

        if (Array.isArray(pipelineStages)) {
            user.agencyStats.crmConfig.pipelineStages = pipelineStages.map((s, i) => ({
                id: s.id || s.title.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
                title: s.title,
                order: s.order != null ? s.order : i,
                color: s.color || undefined,
            }));
        }
        if (Array.isArray(activityChannels)) {
            user.agencyStats.crmConfig.activityChannels = activityChannels.map((c) => ({
                value: c.value || c.label.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, ''),
                label: c.label,
            }));
        }
        if (hubspotFieldMap && typeof hubspotFieldMap === 'object') {
            user.agencyStats.crmConfig.hubspotFieldMap = hubspotFieldMap;
        }
        user.agencyStats.crmConfig.updatedAt = new Date();

        user.markModified('agencyStats');
        await user.save();
        res.json({ success: true, crmConfig: user.agencyStats.crmConfig });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

const uploadConfigBuilder = multer({ storage: multer.memoryStorage(), limits: { fileSize: 100 * 1024 * 1024, files: 2 } });

/** POST — upload HubSpot CSV/XLSX, analyze it, return a suggested CRM config (no data written yet). */
router.post('/crm-config/build-from-hubspot', requireAgency, uploadConfigBuilder.fields([
    { name: 'contacts', maxCount: 1 },
    { name: 'deals', maxCount: 1 },
]), async (req, res) => {
    try {
        const contactsFile = req.files?.contacts?.[0];
        const dealsFile = req.files?.deals?.[0];
        if (!contactsFile && !dealsFile) return res.status(400).json({ message: 'Upload at least one file (contacts and/or deals).' });

        const result = buildConfigFromHubspotExport({
            contactsBuffer: contactsFile?.buffer || null,
            dealsBuffer: dealsFile?.buffer || null,
            contactsFilename: contactsFile?.originalname,
            dealsFilename: dealsFile?.originalname,
        });

        res.json({ success: true, ...result });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

/** PUT — delete a pipeline stage and move its leads to a target stage. */
router.put('/crm-config/delete-stage', requireAgency, async (req, res) => {
    try {
        const user = req.agencyUser;
        const { stageId, moveToStageId } = req.body;
        if (!stageId) return res.status(400).json({ message: 'stageId is required.' });

        if (!user.agencyStats?.crmConfig?.pipelineStages) {
            return res.status(400).json({ message: 'No pipeline stages configured.' });
        }

        const stages = user.agencyStats.crmConfig.pipelineStages;
        const idx = stages.findIndex((s) => s.id === stageId);
        if (idx === -1) return res.status(404).json({ message: `Stage "${stageId}" not found.` });

        // Move leads in this stage to the target
        const leads = user.agencyStats.crmLeads || [];
        let movedCount = 0;
        if (moveToStageId) {
            for (const lead of leads) {
                const normalized = (lead.status || '').trim().toLowerCase().replace(/\s+/g, '_');
                if (normalized === stageId || lead.status === stageId) {
                    lead.status = moveToStageId;
                    movedCount++;
                }
            }
        }

        // Remove the stage
        stages.splice(idx, 1);
        // Re-order remaining
        stages.forEach((s, i) => { s.order = i; });

        user.agencyStats.crmConfig.updatedAt = new Date();
        user.markModified('agencyStats');
        await user.save();

        res.json({ success: true, movedCount, remainingStages: stages.length });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;

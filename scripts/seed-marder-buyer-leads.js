/**
 * Seeds Marder Properties' CRM with the demo buyer pipeline supplied for the
 * sales pitch. Reads `marder_demo_buyers (1).csv` (path is configurable via
 * BUYERS_CSV env var), maps each row into a CRM lead under the agency, and
 * writes per-listing MatchScore rows so the buyers light up in the matching
 * UI right away.
 *
 * Usage:
 *   MONGO_URI='...' node scripts/seed-marder-buyer-leads.js
 *   BUYERS_CSV='/Users/cornenagel/Downloads/marder_demo_buyers (1).csv' node scripts/seed-marder-buyer-leads.js
 *
 * Re-runnable: looks up leads by externalIds.buyer_id and updates in place.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const User = require('../server/models/User');
const Property = require('../server/models/Property');
const MatchScore = require('../server/models/MatchScore');

const MONGO_URI = process.env.MONGO_URI
    || 'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';

const AGENCY_EMAIL = 'marder_agency@demo.com';
const DEFAULT_CSV = '/Users/cornenagel/Downloads/marder_demo_buyers (1).csv';
const CSV_PATH = process.env.BUYERS_CSV || DEFAULT_CSV;
const FALLBACK_AGENT_NAME = 'Graham Marder'; // used when CSV lists "Aldine Niemand" or "Unassigned"

// --- CSV parser ----------------------------------------------------------------
// Tiny RFC-4180-ish parser — handles quoted fields with commas/newlines but
// nothing exotic. The Marder buyers file is well-formed so this is enough.
function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
        const c = text[i];
        if (inQuotes) {
            if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
            else if (c === '"') inQuotes = false;
            else cell += c;
        } else {
            if (c === '"') inQuotes = true;
            else if (c === ',') { row.push(cell); cell = ''; }
            else if (c === '\n' || c === '\r') {
                if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); row = []; cell = ''; }
                if (c === '\r' && text[i + 1] === '\n') i++;
            } else cell += c;
        }
    }
    if (cell !== '' || row.length > 0) { row.push(cell); rows.push(row); }
    if (rows.length === 0) return [];
    const headers = rows[0].map((h) => h.trim());
    return rows.slice(1).filter((r) => r.length > 1).map((r) => {
        const obj = {};
        headers.forEach((h, idx) => { obj[h] = (r[idx] ?? '').trim(); });
        return obj;
    });
}

// --- Helpers -------------------------------------------------------------------
function fmtZar(n) {
    const v = Number(n);
    if (!Number.isFinite(v) || v <= 0) return '';
    return `ZAR ${v.toLocaleString('en-ZA')}`;
}

function fmtBudget(min, max) {
    const lo = fmtZar(min); const hi = fmtZar(max);
    if (lo && hi) return `${lo} – ${hi}`;
    return lo || hi || '';
}

function todayIso() { return new Date().toISOString().slice(0, 10); }

// CSV "Hot/Warm/Cool" → CRM pipeline stage. Marder's pipeline stages were
// pre-seeded earlier so we use the standard ids.
function statusToStageId(status) {
    const s = String(status || '').toLowerCase();
    if (s === 'hot') return 'qualified';
    if (s === 'warm') return 'contacted';
    if (s === 'cool') return 'new';
    return 'new';
}

// CSV buyer_type → CRM leadType
function leadTypeFromBuyerType(bt) {
    const s = String(bt || '').toLowerCase();
    if (s.includes('investor') || s.includes('fund')) return 'investor';
    return 'buyer';
}

function splitNodes(raw) {
    return String(raw || '')
        .split(/[;,]/)
        .map((s) => s.trim())
        .filter(Boolean);
}

// Heuristic match score: buyer ↔ listing. 0–100.
//   40 pts — budget overlap with asking price
//   30 pts — GLA (size) overlap with listing m²
//   30 pts — node match (preferred suburb in CSV ⊂ listing.suburb / city / region)
function scoreMatch(buyer, prop) {
    const ask = Number(prop.pricing?.askingPrice) || 0;
    const sz = Number(prop.propertySize?.size) || 0;
    const sub = String(prop.locationDetails?.suburb || '').toLowerCase();
    const city = String(prop.locationDetails?.city || '').toLowerCase();

    // Budget — full credit if asking sits inside [min, max]; soft fall-off
    // outside that band so a slightly under-/over-budget listing still scores.
    let budgetPts = 0;
    if (ask > 0 && buyer.budgetMin > 0 && buyer.budgetMax > 0) {
        if (ask >= buyer.budgetMin && ask <= buyer.budgetMax) budgetPts = 40;
        else {
            const gap = ask < buyer.budgetMin
                ? (buyer.budgetMin - ask) / buyer.budgetMin
                : (ask - buyer.budgetMax) / buyer.budgetMax;
            budgetPts = Math.max(0, Math.round(40 * (1 - gap * 2.5)));
        }
    }

    let sizePts = 0;
    if (sz > 0 && buyer.glaMin > 0 && buyer.glaMax > 0) {
        if (sz >= buyer.glaMin && sz <= buyer.glaMax) sizePts = 30;
        else {
            const gap = sz < buyer.glaMin
                ? (buyer.glaMin - sz) / buyer.glaMin
                : (sz - buyer.glaMax) / buyer.glaMax;
            sizePts = Math.max(0, Math.round(30 * (1 - gap * 2)));
        }
    }

    let nodePts = 0;
    const wanted = (buyer.nodes || []).map((n) => n.toLowerCase());
    if (wanted.length > 0) {
        if (wanted.some((w) => sub.includes(w) || w.includes(sub) || w.includes(city))) nodePts = 30;
        else if (wanted.some((w) => w.includes('gauteng') || w.includes('west rand') || w.includes('east rand'))) nodePts = 12;
    }

    return Math.max(0, Math.min(100, budgetPts + sizePts + nodePts));
}

// --- Main ----------------------------------------------------------------------
async function main() {
    if (!fs.existsSync(CSV_PATH)) {
        console.error(`CSV not found: ${CSV_PATH}`);
        process.exit(1);
    }
    const rows = parseCsv(fs.readFileSync(CSV_PATH, 'utf8'));
    console.log(`Loaded ${rows.length} buyer rows from ${CSV_PATH}`);

    await mongoose.connect(MONGO_URI);
    console.log('Connected to Atlas');

    const agency = await User.findOne({ email: AGENCY_EMAIL });
    if (!agency) {
        console.error(`Agency not found: ${AGENCY_EMAIL}`);
        process.exit(1);
    }
    if (!agency.agencyStats) agency.agencyStats = {};
    if (!Array.isArray(agency.agencyStats.crmLeads)) agency.agencyStats.crmLeads = [];

    // Build agent lookup by display name (case-insensitive) — only the agents
    // already attached to Marder via agencyStats.topAgents.
    const topAgents = (agency.agencyStats.topAgents || []);
    const agentByName = new Map();
    for (const a of topAgents) {
        const id = String(a._id || a.id || '');
        const name = (a.name || '').trim();
        if (name && id) agentByName.set(name.toLowerCase(), id);
    }
    const fallbackAgentId = agentByName.get(FALLBACK_AGENT_NAME.toLowerCase()) || null;

    // Pre-load Marder's listings once so the match loop is in-memory.
    const allowedAgentIds = topAgents.map((a) => a._id || a.id).filter(Boolean).map(String);
    const listings = await Property.find({
        agentId: { $in: allowedAgentIds },
        status: { $in: ['Published', 'Draft', 'Under Negotiation', 'Under Offer'] },
    }).lean();
    console.log(`Loaded ${listings.length} live listings for matching`);

    let inserted = 0;
    let updated = 0;
    let totalMatches = 0;

    for (const row of rows) {
        const buyerId = row.buyer_id;
        if (!buyerId) continue;

        const csvAgentName = (row.assigned_agent || '').trim();
        let assignedAgentId = csvAgentName ? agentByName.get(csvAgentName.toLowerCase()) : null;
        if (!assignedAgentId) assignedAgentId = fallbackAgentId; // covers Aldine + Unassigned

        const lt = leadTypeFromBuyerType(row.buyer_type);
        const detailsKey = lt === 'investor' ? 'investorDetails' : 'buyerDetails';
        const details = {
            // Preserve the structured CSV fields directly so the AI matcher
            // and the lead detail UI can both surface them.
            buyerType: row.buyer_type,
            budgetMinZar: Number(row.budget_min_zar) || null,
            budgetMaxZar: Number(row.budget_max_zar) || null,
            glaMinSqm: Number(row.gla_min_sqm) || null,
            glaMaxSqm: Number(row.gla_max_sqm) || null,
            landMinSqm: Number(row.land_min_sqm) || null,
            yardRequired: row.yard_required === 'Y',
            minPowerMva: Number(row.min_power_mva) || null,
            dockLevellersRequired: Number(row.dock_levellers_required) || null,
            rackingHeightMinM: Number(row.racking_height_min_m) || null,
            preferredNodes: splitNodes(row.preferred_nodes),
            assetClass: row.asset_class,
            subUse: row.sub_use,
            company: row.company,
        };

        // Compute heuristic match scores against every Marder listing.
        const buyerForMatch = {
            budgetMin: Number(row.budget_min_zar) || 0,
            budgetMax: Number(row.budget_max_zar) || 0,
            glaMin: Number(row.gla_min_sqm) || 0,
            glaMax: Number(row.gla_max_sqm) || 0,
            nodes: splitNodes(row.preferred_nodes),
        };
        const propertyScores = listings.map((p) => ({ propertyId: p._id, score: scoreMatch(buyerForMatch, p) }));

        const lead = {
            id: `lead_marder_${buyerId.replace(/\W+/g, '_').toLowerCase()}`,
            leadScore: Number(row.aura_match_score) || null, // CSV's pre-computed Aura score
            assignedAgentId,
            name: row.contact_name || row.company || 'Buyer',
            type: row.buyer_type, // free-text descriptor (e.g. "Listed Fund")
            budget: fmtBudget(row.budget_min_zar, row.budget_max_zar),
            status: statusToStageId(row.status),
            lastContact: row.last_enquiry_date || todayIso(),
            email: '', // CSV has no emails
            mobile: '',
            propertyOfInterest: '', // optional — populated when buyer enquires on a specific listing
            dateAdded: todayIso(),
            source: row.source || 'CSV import',
            linkedProperties: [],
            activities: [{
                type: 'note',
                datetime: new Date().toISOString(),
                detail: row.notes || 'Imported from buyer pipeline CSV',
                by: 'system',
            }],
            leadType: lt,
            [detailsKey]: details,
            externalIds: { buyer_id: buyerId, source: 'marder-demo-buyers-csv' },
        };

        // Upsert by externalIds.buyer_id (re-runnable).
        const existingIdx = agency.agencyStats.crmLeads.findIndex((l) => l.externalIds && l.externalIds.buyer_id === buyerId);
        if (existingIdx >= 0) {
            agency.agencyStats.crmLeads[existingIdx] = { ...agency.agencyStats.crmLeads[existingIdx], ...lead };
            updated++;
        } else {
            agency.agencyStats.crmLeads.push(lead);
            inserted++;
        }

        // Replace any stale match scores for this lead and write the new ones.
        await MatchScore.deleteMany({ targetType: 'lead', targetId: lead.id, ownerId: agency._id });
        const docs = propertyScores
            .filter((s) => s.score > 0)
            .map((s) => ({
                propertyId: s.propertyId,
                targetType: 'lead',
                targetId: lead.id,
                ownerId: agency._id,
                score: s.score,
                targetName: lead.name,
                updatedAt: new Date(),
            }));
        if (docs.length > 0) {
            await MatchScore.insertMany(docs, { ordered: false });
            totalMatches += docs.length;
        }
    }

    agency.markModified('agencyStats');
    await agency.save();
    console.log(`Done. inserted=${inserted}, updated=${updated}, matchScores=${totalMatches}`);

    await mongoose.disconnect();
}

main().catch((err) => {
    console.error(err);
    process.exit(1);
});

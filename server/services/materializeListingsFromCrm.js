/**
 * Create or update minimal Property docs from agency CRM leads that already carry a listing Web Ref.
 * Use when PropData XLSX listing import did not run but leads import did (or manual CRM rows with refs).
 */

const mongoose = require('mongoose');
const User = require('../models/User');
const Property = require('../models/Property');

function str(v) {
    if (v == null || v === '') return '';
    return String(v).trim();
}

/** Same idea as PropData importer: SIR… and generic ALPHANUM+long digits refs from free text. */
function extractWebRefFromCrmLead(lead) {
    if (!lead || typeof lead !== 'object') return '';

    const lp = lead.linkedProperties;
    if (lp && typeof lp === 'object' && lp.propdataWebRef != null && str(lp.propdataWebRef)) {
        return str(lp.propdataWebRef).toUpperCase();
    }

    const ext = lead.externalIds && lead.externalIds.propdata;
    if (ext && ext.webRef != null && str(ext.webRef)) {
        return str(ext.webRef).toUpperCase();
    }

    const poi = str(lead.propertyOfInterest);
    let m = poi.match(/\b(SIR\d+)\b/i);
    if (m) return m[1].toUpperCase();
    m = poi.match(/\b([A-Z]{2,12}\d{4,})\b/i);
    if (m) return m[1].toUpperCase();

    return '';
}

async function resolveAgentIdForCrmLead(lead, agencyId, agencyUserDoc) {
    const raw = str(lead.assignedAgentId);
    if (raw && mongoose.Types.ObjectId.isValid(raw)) {
        const agent = await User.findById(raw).select('agencyId').lean();
        if (agent && String(agent.agencyId) === String(agencyId)) {
            return new mongoose.Types.ObjectId(raw);
        }
    }
    return agencyUserDoc._id;
}

/**
 * @param {string|mongoose.Types.ObjectId} agencyId
 * @returns {Promise<{ created: number, updated: number, skippedNoRef: number, duplicatesInCrm: number, webRefs: string[], warnings: string[] }>}
 */
async function materializeListingsFromAgencyCrmLeads(agencyId) {
    const agency = await User.findById(agencyId);
    if (!agency) throw new Error('Agency not found');
    if (String(agency.role || '').toLowerCase() !== 'agency') {
        throw new Error('User is not an agency account');
    }

    const leads = Array.isArray(agency.agencyStats?.crmLeads) ? agency.agencyStats.crmLeads : [];
    const byRef = new Map();
    for (const lead of leads) {
        const webRef = extractWebRefFromCrmLead(lead);
        if (!webRef) continue;
        if (!byRef.has(webRef)) byRef.set(webRef, lead);
    }

    let created = 0;
    let updated = 0;
    const skippedNoRef = leads.filter((l) => !extractWebRefFromCrmLead(l)).length;
    const duplicatesInCrm = leads.filter((l) => !!extractWebRefFromCrmLead(l)).length - byRef.size;
    const warnings = [];

    for (const [webRef, lead] of byRef.entries()) {
        const agentId = await resolveAgentIdForCrmLead(lead, agencyId, agency);
        const titleBase = str(lead.propertyOfInterest).slice(0, 220) || `Listing ${webRef}`;
        const filter = {
            importAgencyId: agency._id,
            importSource: 'propdata',
            importListingRef: webRef,
        };

        const existing = await Property.findOne(filter).select('_id').lean();

        const payload = {
            title: titleBase,
            location: '—',
            price: '0',
            description:
                str(lead.propertyOfInterest) ||
                `Listing stub from CRM (Web Ref ${webRef}). Replace details via Listing Management or re-import XLSX.`,
            imageUrl: '',
            agentId,
            importSource: 'propdata',
            importListingRef: webRef,
            importAgencyId: agency._id,
            importRecordId: '',
            status: 'Draft',
            listingType: 'for_sale',
            propertyCategory: 'Residential',
            type: 'Residential',
            listingMetadata: {
                propdata: {
                    webRef,
                    crmMaterialized: true,
                    leadId: str(lead.id) || undefined,
                },
            },
            externalIds: {
                propdata: {
                    webRef,
                },
            },
        };

        try {
            await Property.findOneAndUpdate(filter, { $set: payload }, { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true });
            if (existing) updated += 1;
            else created += 1;
        } catch (e) {
            warnings.push(`${webRef}: ${e.message || String(e)}`);
        }
    }

    return {
        created,
        updated,
        skippedNoRef,
        duplicatesInCrm: Math.max(0, duplicatesInCrm),
        uniqueWebRefs: byRef.size,
        webRefs: [...byRef.keys()],
        warnings,
    };
}

module.exports = { materializeListingsFromAgencyCrmLeads, extractWebRefFromCrmLead };

/**
 * Import HubSpot CRM exports (CSV or XLSX).
 *
 * Key behaviors:
 * - Matches HubSpot owner emails to existing agency agents; if no match, stores
 *   the owner name on the lead (does NOT create a new agent) so the agency can
 *   reassign to the correct agent in their branch.
 * - Detects duplicate leads already imported from PropData (by email match) and
 *   merges HubSpot-only metadata (last activity, lead status, marketing status,
 *   hubspot create date) without overwriting PropData data.
 * - Returns a stage summary so the UI can show breakdowns.
 */

const XLSX = require('xlsx');
const { parse: parseCsv } = require('csv-parse/sync');
const User = require('../models/User');

function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function str(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date) return v.toISOString();
    return String(v).trim();
}

function normKey(k) {
    return String(k || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '');
}

function col(row, ...candidates) {
    if (!row || typeof row !== 'object') return '';
    const keys = Object.keys(row);
    const byNorm = {};
    for (const k of keys) byNorm[normKey(k)] = k;
    for (const c of candidates) {
        const cNorm = normKey(c);
        if (Object.prototype.hasOwnProperty.call(row, c)) return str(row[c]);
        const k = byNorm[cNorm];
        if (k) return str(row[k]);
    }
    for (const c of candidates) {
        const cNorm = normKey(c);
        const found = keys.find((k) => normKey(k).includes(cNorm) || cNorm.includes(normKey(k)));
        if (found) return str(row[found]);
    }
    return '';
}

function looksLikeZip(buffer) {
    return buffer && buffer.length >= 2 && buffer[0] === 0x50 && buffer[1] === 0x4b;
}

function rowsFromBuffer(buffer, originalname) {
    const name = str(originalname).toLowerCase();
    if (name.endsWith('.csv') || (!looksLikeZip(buffer) && name.indexOf('.xlsx') === -1 && name.indexOf('.xls') === -1)) {
        try {
            return parseCsv(buffer, {
                columns: true,
                skip_empty_lines: true,
                relax_column_count: true,
                trim: true,
                bom: true,
            });
        } catch (e) {
            throw new Error(`CSV parse failed: ${e.message}`);
        }
    }
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sn = wb.SheetNames[0];
    if (!sn) return [];
    return XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '', cellDates: true });
}

function contactRecordId(row) {
    return col(row, 'Record ID', 'Record Id', 'Contact ID', 'Contact Id', 'ID', 'Id');
}

function dealRecordId(row) {
    return col(row, 'Record ID', 'Record Id', 'Deal ID', 'Deal Id', 'ID', 'Id');
}

function contactName(row) {
    const first = col(row, 'First Name', 'First name', 'FirstName');
    const last = col(row, 'Last Name', 'Last name', 'LastName');
    const full = [first, last].filter(Boolean).join(' ').trim();
    if (full) return full;
    return col(row, 'Name', 'Full Name', 'Contact name');
}

function detectLeadType(row) {
    const contactType = col(row, 'Contact Type', 'Type', 'Persona', 'Lead Type').toLowerCase();
    if (/seller|vendor|owner/i.test(contactType)) return 'seller';
    if (/investor/i.test(contactType)) return 'investor';
    if (/buyer|purchaser|tenant|renter/i.test(contactType)) return 'buyer';
    return 'buyer';
}

function inc(obj, key) {
    obj[key || 'unknown'] = (obj[key || 'unknown'] || 0) + 1;
}

/**
 * @param {object} opts
 * @param {import('mongoose').Types.ObjectId} opts.agencyId
 * @param {Buffer|null} opts.contactsBuffer
 * @param {Buffer|null} opts.dealsBuffer
 * @param {string} [opts.contactsFilename]
 * @param {string} [opts.dealsFilename]
 * @param {boolean} [opts.replaceHubspotLeads]
 */
async function runHubspotCsvImport({
    agencyId,
    contactsBuffer,
    dealsBuffer,
    contactsFilename,
    dealsFilename,
    replaceHubspotLeads,
}) {
    const summary = {
        contactsImported: 0,
        contactsUpdated: 0,
        contactsMergedWithPropdata: 0,
        contactsSkipped: 0,
        dealsImported: 0,
        dealsUpdated: 0,
        dealsSkipped: 0,
        agentMatchedByEmail: 0,
        agentNameOnly: 0,
        warnings: [],
        errors: [],
        stages: {
            lifecycleStages: {},
            leadStatuses: {},
            dealStages: {},
            dealPipelines: {},
            contactTypes: {},
        },
    };

    const agency = await User.findById(agencyId);
    if (!agency) throw new Error('Agency not found');
    if (!agency.agencyStats) agency.agencyStats = {};
    if (!Array.isArray(agency.agencyStats.crmLeads)) agency.agencyStats.crmLeads = [];
    if (!Array.isArray(agency.agencyStats.pipelineDeals)) agency.agencyStats.pipelineDeals = [];

    if (replaceHubspotLeads) {
        agency.agencyStats.crmLeads = agency.agencyStats.crmLeads.filter((l) => !str(l.id).startsWith('hubspot-co-'));
    }

    // Build indexes for duplicate detection
    const hubspotLeadById = new Map(
        agency.agencyStats.crmLeads
            .map((l, i) => [str(l.id), i])
            .filter(([id]) => id),
    );
    const leadByEmail = new Map();
    for (let i = 0; i < agency.agencyStats.crmLeads.length; i++) {
        const em = str(agency.agencyStats.crmLeads[i].email).toLowerCase();
        if (em) leadByEmail.set(em, i);
    }

    // Pre-fetch all agents for this agency (for email matching)
    const agencyAgents = await User.find({
        agencyId,
        role: { $in: ['agency_agent', 'agent'] },
    }).select('_id name email').lean();
    const agentByEmail = new Map(
        agencyAgents.map((a) => [str(a.email).toLowerCase(), a]),
    );

    // ── Contacts ──────────────────────────────────────────────────────
    if (contactsBuffer && contactsBuffer.length) {
        let rows;
        try {
            rows = rowsFromBuffer(contactsBuffer, contactsFilename);
        } catch (e) {
            summary.errors.push(`Contacts file: ${e.message}`);
            rows = [];
        }

        if (rows.length) summary.contactsFileColumns = Object.keys(rows[0] || {});

        for (const row of rows) {
            const hsId = contactRecordId(row);
            const email = col(row, 'Email', 'Email Address', 'Work Email', 'Additional email addresses').split(/[,;]/)[0].trim();
            if (!hsId && !email) {
                summary.contactsSkipped += 1;
                continue;
            }
            const hubspotLeadId = hsId ? `hubspot-co-${hsId}` : `hubspot-co-em-${Buffer.from(email.toLowerCase()).toString('hex').slice(0, 24)}`;

            // --- Agent matching: try email, fall back to storing name ---
            let assignedAgentId = '';
            let hubspotOwnerName = '';
            const ownerEmail = col(row, 'HubSpot Owner Email', 'Owner email', 'Owner Email', 'HubSpot Owner');
            const ownerName = col(row, 'HubSpot Owner', 'Contact Owner', 'Owner Name', 'Contact owner', 'Deal Owner');

            if (ownerEmail) {
                const matched = agentByEmail.get(ownerEmail.toLowerCase());
                if (matched) {
                    assignedAgentId = String(matched._id);
                    summary.agentMatchedByEmail += 1;
                } else {
                    hubspotOwnerName = ownerName || ownerEmail;
                    summary.agentNameOnly += 1;
                }
            } else if (ownerName) {
                const byName = agencyAgents.find(
                    (a) => a.name && a.name.toLowerCase() === ownerName.toLowerCase(),
                );
                if (byName) {
                    assignedAgentId = String(byName._id);
                    summary.agentMatchedByEmail += 1;
                } else {
                    hubspotOwnerName = ownerName;
                    summary.agentNameOnly += 1;
                }
            }

            // --- Read HubSpot stage/status columns ---
            const lifecycleStage = col(row, 'Lifecycle Stage', 'LifecycleStage', 'Lifecycle stage');
            const leadStatus = col(row, 'Lead Status', 'Lead status', 'HS Lead Status', 'hs_lead_status');
            const marketingStatus = col(row, 'Marketing Contact Status', 'Marketing contact status', 'Marketing Email Status');
            const leadType = detectLeadType(row);
            const contactType = col(row, 'Contact Type', 'Type', 'Persona', 'Lead Type');
            const hsCreateDate = col(row, 'Create Date', 'Created', 'createdate', 'Create date');
            const lastActivityDate = col(row, 'Last Activity Date', 'Last Contacted', 'Notes Last Updated', 'notes_last_updated', 'Last Activity', 'Last activity date');

            inc(summary.stages.lifecycleStages, lifecycleStage);
            if (leadStatus) inc(summary.stages.leadStatuses, leadStatus);
            inc(summary.stages.contactTypes, contactType || leadType);

            const name = contactName(row) || email || 'HubSpot contact';
            const phone = col(row, 'Phone Number', 'Mobile Phone Number', 'Phone', 'Mobile phone number');

            const hub = {};
            if (hsId) hub.contactId = hsId;
            const companyId = col(row, 'Associated Company IDs', 'Primary Associated Company ID', 'Company ID');
            if (companyId) hub.companyId = companyId;

            const hubspotMetadata = {
                hubspotRecordId: hsId || undefined,
                lifecycleStage: lifecycleStage || undefined,
                leadStatus: leadStatus || undefined,
                marketingContactStatus: marketingStatus || undefined,
                hubspotCreateDate: hsCreateDate || undefined,
                lastActivityDate: lastActivityDate || undefined,
                hubspotOwnerName: hubspotOwnerName || undefined,
            };

            // --- Check: is this a duplicate of a PropData-imported lead? ---
            const emailLower = email.toLowerCase();
            const existingPropdataIdx = emailLower ? leadByEmail.get(emailLower) : undefined;
            const existingHubspotIdx = hubspotLeadById.get(hubspotLeadId);

            if (existingPropdataIdx != null && existingHubspotIdx == null) {
                // PropData lead exists — MERGE HubSpot metadata without overwriting PropData fields
                const existing = agency.agencyStats.crmLeads[existingPropdataIdx];
                const plain = typeof existing.toObject === 'function' ? existing.toObject() : { ...existing };

                if (!plain.buyerDetails || typeof plain.buyerDetails !== 'object') plain.buyerDetails = {};
                Object.entries(hubspotMetadata).forEach(([k, v]) => {
                    if (v !== undefined) plain.buyerDetails[k] = v;
                });

                // Add HubSpot-only fields that PropData didn't have
                if (lastActivityDate && !plain.lastContact) plain.lastContact = lastActivityDate;
                if (leadStatus && (!plain.status || plain.status === 'New')) plain.status = leadStatus;
                if (lifecycleStage) plain.buyerDetails.lifecycleStage = lifecycleStage;
                if (leadStatus) plain.buyerDetails.leadStatus = leadStatus;
                if (hsCreateDate) plain.buyerDetails.hubspotCreateDate = hsCreateDate;
                if (hubspotOwnerName && !assignedAgentId && !plain.assignedAgentId) {
                    plain.buyerDetails.hubspotOwnerName = hubspotOwnerName;
                }
                if (assignedAgentId && !plain.assignedAgentId) {
                    plain.assignedAgentId = assignedAgentId;
                }
                if (!plain.externalIds) plain.externalIds = {};
                if (Object.keys(hub).length) plain.externalIds.hubspot = hub;

                agency.agencyStats.crmLeads[existingPropdataIdx] = plain;
                summary.contactsMergedWithPropdata += 1;
                continue;
            }

            if (existingHubspotIdx != null) {
                // HubSpot lead already exists — update in place
                const existing = agency.agencyStats.crmLeads[existingHubspotIdx];
                const plain = typeof existing.toObject === 'function' ? existing.toObject() : { ...existing };

                plain.name = name;
                plain.email = email;
                plain.mobile = phone || plain.mobile;
                plain.status = leadStatus || lifecycleStage || plain.status || 'new';
                plain.lastContact = lastActivityDate || plain.lastContact;
                plain.leadType = leadType;
                if (assignedAgentId) plain.assignedAgentId = assignedAgentId;

                if (!plain.buyerDetails || typeof plain.buyerDetails !== 'object') plain.buyerDetails = {};
                Object.entries(hubspotMetadata).forEach(([k, v]) => {
                    if (v !== undefined) plain.buyerDetails[k] = v;
                });

                if (!plain.externalIds) plain.externalIds = {};
                if (Object.keys(hub).length) plain.externalIds.hubspot = { ...(plain.externalIds.hubspot || {}), ...hub };

                agency.agencyStats.crmLeads[existingHubspotIdx] = plain;
                summary.contactsUpdated += 1;
                continue;
            }

            // --- New contact: create fresh lead ---
            const lead = {
                id: hubspotLeadId,
                leadScore: null,
                assignedAgentId,
                name,
                type: contactType || 'Contact',
                budget: col(row, 'Budget', 'Annual Revenue', 'Revenue'),
                status: leadStatus || lifecycleStage || 'new',
                lastContact: lastActivityDate,
                email,
                mobile: phone,
                propertyOfInterest: col(row, 'Property of Interest', 'Associated Deal', 'Deal Name'),
                dateAdded: hsCreateDate || new Date().toISOString(),
                source: col(row, 'Original Source', 'Source', 'hs_analytics_source') || 'HubSpot import',
                linkedProperties: {},
                activities: [],
                leadType,
                buyerDetails: {
                    jobTitle: col(row, 'Job Title', 'Job title'),
                    company: col(row, 'Company Name', 'Associated Company'),
                    ...hubspotMetadata,
                },
                sellerDetails: leadType === 'seller' ? {
                    propertyAddress: col(row, 'Street Address', 'Address', 'Street address'),
                    ...hubspotMetadata,
                } : undefined,
                investorDetails: leadType === 'investor' ? hubspotMetadata : undefined,
                externalIds: Object.keys(hub).length ? { hubspot: hub } : undefined,
            };

            agency.agencyStats.crmLeads.push(lead);
            hubspotLeadById.set(hubspotLeadId, agency.agencyStats.crmLeads.length - 1);
            if (emailLower) leadByEmail.set(emailLower, agency.agencyStats.crmLeads.length - 1);
            summary.contactsImported += 1;
        }
    }

    // ── Deals ─────────────────────────────────────────────────────────
    if (dealsBuffer && dealsBuffer.length) {
        let rows;
        try {
            rows = rowsFromBuffer(dealsBuffer, dealsFilename);
        } catch (e) {
            summary.errors.push(`Deals file: ${e.message}`);
            rows = [];
        }

        if (rows.length) summary.dealsFileColumns = Object.keys(rows[0] || {});

        for (const row of rows) {
            const dealId = dealRecordId(row);
            if (!dealId) {
                summary.dealsSkipped += 1;
                continue;
            }
            const name = col(row, 'Deal Name', 'Name') || `Deal ${dealId}`;
            const amount = col(row, 'Amount', 'Deal Amount');
            const stage = col(row, 'Deal Stage', 'Pipeline Stage', 'Stage');
            const pipeline = col(row, 'Pipeline');
            const closeDate = col(row, 'Close Date', 'Close date', 'closedate');
            const ownerName = col(row, 'Deal Owner', 'HubSpot Owner', 'Owner');
            const associatedContact = col(row, 'Associated Contact', 'Contact Name', 'Associated Contacts');

            inc(summary.stages.dealStages, stage);
            if (pipeline) inc(summary.stages.dealPipelines, pipeline);

            const entry = {
                id: `hubspot-de-${dealId}`,
                name,
                role: ownerName,
                type: pipeline || 'Deal',
                property: col(row, 'Associated Company', 'Company Name') || associatedContact,
                price: amount,
                days: '',
                status: stage || 'open',
                externalIds: {
                    hubspot: {
                        dealId,
                        stageLabel: stage,
                        pipelineLabel: pipeline,
                        closeDate,
                    },
                },
            };

            const idx = agency.agencyStats.pipelineDeals.findIndex((d) => str(d.externalIds?.hubspot?.dealId) === dealId);
            if (idx >= 0) {
                const prev = agency.agencyStats.pipelineDeals[idx];
                const plain = prev && typeof prev.toObject === 'function' ? prev.toObject() : { ...(prev || {}) };
                agency.agencyStats.pipelineDeals[idx] = {
                    ...plain,
                    ...entry,
                    externalIds: { ...(plain.externalIds || {}), ...entry.externalIds },
                };
                summary.dealsUpdated += 1;
            } else {
                agency.agencyStats.pipelineDeals.push(entry);
                summary.dealsImported += 1;
            }

            // Link deal stage back to the associated contact (by name or email match)
            if (associatedContact && stage) {
                const contactLower = associatedContact.toLowerCase();
                const matched = agency.agencyStats.crmLeads.find(
                    (l) => (l.name && l.name.toLowerCase() === contactLower) ||
                           (l.email && l.email.toLowerCase() === contactLower),
                );
                if (matched) {
                    matched.status = stage;
                    matched.propertyOfInterest = matched.propertyOfInterest || name;
                    matched.budget = matched.budget || amount;
                    if (!matched.buyerDetails || typeof matched.buyerDetails !== 'object') matched.buyerDetails = {};
                    matched.buyerDetails.dealStage = stage;
                    matched.buyerDetails.dealPipeline = pipeline;
                    matched.buyerDetails.dealAmount = amount;
                }
            }
        }
    }

    agency.markModified('agencyStats');
    await agency.save();
    return summary;
}

module.exports = { runHubspotCsvImport };

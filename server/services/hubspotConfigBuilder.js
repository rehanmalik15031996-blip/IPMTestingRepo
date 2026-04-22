/**
 * Analyze a HubSpot CSV/XLSX export and generate a bespoke CRM config for the agency.
 *
 * Returns suggested pipeline stages, activity channels, and a field mapping —
 * all derived from the actual data in the export file(s).
 */

const XLSX = require('xlsx');
const { parse: parseCsv } = require('csv-parse/sync');

function str(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date) return v.toISOString();
    return String(v).trim();
}

function normKey(k) {
    return String(k || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
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
    if (name.endsWith('.csv') || (!looksLikeZip(buffer) && !name.includes('.xlsx') && !name.includes('.xls'))) {
        return parseCsv(buffer, {
            columns: true,
            skip_empty_lines: true,
            relax_column_count: true,
            trim: true,
            bom: true,
        });
    }
    const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
    const sn = wb.SheetNames[0];
    if (!sn) return [];
    return XLSX.utils.sheet_to_json(wb.Sheets[sn], { defval: '', cellDates: true });
}

function slugify(text) {
    return String(text)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_|_$/g, '');
}

const KNOWN_ACTIVITY_COLUMNS = [
    'Next Activity Type', 'Last Activity Type', 'Recent Engagement Type',
    'Last Engagement Type', 'Activity Type', 'Task Type',
    'Note Type', 'Communication Type', 'Interaction Type',
];

/**
 * @param {object} opts
 * @param {Buffer|null} opts.contactsBuffer
 * @param {Buffer|null} opts.dealsBuffer
 * @param {string} [opts.contactsFilename]
 * @param {string} [opts.dealsFilename]
 * @returns {{ pipelineStages, activityChannels, hubspotFieldMap, analysis }}
 */
function buildConfigFromHubspotExport({
    contactsBuffer,
    dealsBuffer,
    contactsFilename,
    dealsFilename,
}) {
    const lifecycleStages = new Map();
    const leadStatuses = new Map();
    const dealStages = new Map();
    const dealPipelines = new Map();
    const contactTypes = new Map();
    const activityTypes = new Map();
    const allColumns = { contacts: [], deals: [] };
    const ownerNames = new Set();
    const ownerEmails = new Set();

    function inc(map, key) {
        if (!key) return;
        const k = key.trim();
        if (!k) return;
        map.set(k, (map.get(k) || 0) + 1);
    }

    if (contactsBuffer && contactsBuffer.length) {
        let rows;
        try { rows = rowsFromBuffer(contactsBuffer, contactsFilename); } catch (_) { rows = []; }
        if (rows.length) allColumns.contacts = Object.keys(rows[0]);

        for (const row of rows) {
            inc(lifecycleStages, col(row, 'Lifecycle Stage', 'LifecycleStage', 'Lifecycle stage'));
            inc(leadStatuses, col(row, 'Lead Status', 'Lead status', 'HS Lead Status', 'hs_lead_status'));
            inc(contactTypes, col(row, 'Contact Type', 'Type', 'Persona', 'Lead Type'));

            const ownerEmail = col(row, 'HubSpot Owner Email', 'Owner email', 'Owner Email');
            const ownerName = col(row, 'HubSpot Owner', 'Contact Owner', 'Owner Name', 'Contact owner');
            if (ownerEmail) ownerEmails.add(ownerEmail);
            if (ownerName) ownerNames.add(ownerName);

            for (const actCol of KNOWN_ACTIVITY_COLUMNS) {
                const val = col(row, actCol);
                if (val) inc(activityTypes, val);
            }
        }
    }

    if (dealsBuffer && dealsBuffer.length) {
        let rows;
        try { rows = rowsFromBuffer(dealsBuffer, dealsFilename); } catch (_) { rows = []; }
        if (rows.length) allColumns.deals = Object.keys(rows[0]);

        for (const row of rows) {
            inc(dealStages, col(row, 'Deal Stage', 'Pipeline Stage', 'Stage'));
            inc(dealPipelines, col(row, 'Pipeline'));

            const ownerName = col(row, 'Deal Owner', 'HubSpot Owner', 'Owner');
            if (ownerName) ownerNames.add(ownerName);
        }
    }

    // --- Build suggested pipeline stages ---
    // Priority: deal stages (most specific), then lead statuses, then lifecycle stages
    const stageEntries = [];
    let order = 0;

    // Always start with "New" as the intake column
    stageEntries.push({ id: 'new', title: 'New', order: order++ });

    // Add lifecycle stages (excluding generic ones that overlap with lead statuses)
    const skipLifecycle = new Set(['subscriber', 'lead', 'other', '']);
    for (const [stage] of lifecycleStages) {
        const slug = slugify(stage);
        if (skipLifecycle.has(slug) || stageEntries.some((s) => s.id === slug)) continue;
        stageEntries.push({ id: slug, title: stage, order: order++ });
    }

    // Add lead statuses
    for (const [status] of leadStatuses) {
        const slug = slugify(status);
        if (!slug || stageEntries.some((s) => s.id === slug)) continue;
        stageEntries.push({ id: slug, title: status, order: order++ });
    }

    // Add deal stages
    for (const [stage] of dealStages) {
        const slug = slugify(stage);
        if (!slug || stageEntries.some((s) => s.id === slug)) continue;
        stageEntries.push({ id: slug, title: stage, order: order++ });
    }

    // Always end with Won / Lost if not already present
    if (!stageEntries.some((s) => s.id === 'won' || s.id === 'closed_won')) {
        stageEntries.push({ id: 'won', title: 'Won', order: order++ });
    }
    if (!stageEntries.some((s) => s.id === 'lost' || s.id === 'closed_lost')) {
        stageEntries.push({ id: 'lost', title: 'Lost', order: order++ });
    }

    // --- Build activity channels ---
    const defaultChannels = [
        { value: 'email', label: 'Email' },
        { value: 'phone', label: 'Phone call' },
        { value: 'meeting', label: 'Meeting' },
        { value: 'whatsapp', label: 'WhatsApp' },
        { value: 'sms', label: 'SMS' },
    ];

    const channelSlugs = new Set(defaultChannels.map((c) => c.value));
    const channels = [...defaultChannels];

    for (const [actType] of activityTypes) {
        const slug = slugify(actType);
        if (!slug || channelSlugs.has(slug)) continue;
        channels.push({ value: slug, label: actType });
        channelSlugs.add(slug);
    }

    if (!channelSlugs.has('other')) {
        channels.push({ value: 'other', label: 'Other' });
    }

    // --- Build field map from detected columns ---
    const hubspotFieldMap = {};
    const contactCols = allColumns.contacts;
    const dealCols = allColumns.deals;

    const fieldCandidates = [
        { ipmField: 'name', candidates: ['First Name', 'Last Name', 'Name', 'Full Name', 'Contact name'] },
        { ipmField: 'email', candidates: ['Email', 'Email Address', 'Work Email'] },
        { ipmField: 'phone', candidates: ['Phone Number', 'Mobile Phone Number', 'Phone', 'Mobile phone number'] },
        { ipmField: 'lifecycleStage', candidates: ['Lifecycle Stage', 'LifecycleStage', 'Lifecycle stage'] },
        { ipmField: 'leadStatus', candidates: ['Lead Status', 'Lead status', 'HS Lead Status'] },
        { ipmField: 'contactType', candidates: ['Contact Type', 'Type', 'Persona', 'Lead Type'] },
        { ipmField: 'owner', candidates: ['HubSpot Owner', 'Contact Owner', 'Owner Name', 'Contact owner'] },
        { ipmField: 'ownerEmail', candidates: ['HubSpot Owner Email', 'Owner email', 'Owner Email'] },
        { ipmField: 'source', candidates: ['Original Source', 'Source', 'hs_analytics_source'] },
        { ipmField: 'createDate', candidates: ['Create Date', 'Created', 'createdate', 'Create date'] },
        { ipmField: 'lastActivity', candidates: ['Last Activity Date', 'Last Contacted', 'Notes Last Updated', 'Last Activity'] },
        { ipmField: 'budget', candidates: ['Budget', 'Annual Revenue', 'Revenue'] },
        { ipmField: 'dealName', candidates: ['Deal Name', 'Name'] },
        { ipmField: 'dealAmount', candidates: ['Amount', 'Deal Amount'] },
        { ipmField: 'dealStage', candidates: ['Deal Stage', 'Pipeline Stage', 'Stage'] },
        { ipmField: 'pipeline', candidates: ['Pipeline'] },
        { ipmField: 'closeDate', candidates: ['Close Date', 'Close date', 'closedate'] },
    ];

    const allCols = [...contactCols, ...dealCols];
    const allColsNorm = {};
    for (const c of allCols) allColsNorm[normKey(c)] = c;

    for (const { ipmField, candidates } of fieldCandidates) {
        for (const cand of candidates) {
            const match = allColsNorm[normKey(cand)];
            if (match) {
                hubspotFieldMap[ipmField] = match;
                break;
            }
        }
    }

    return {
        pipelineStages: stageEntries,
        activityChannels: channels,
        hubspotFieldMap,
        analysis: {
            contactsRows: contactsBuffer ? (function () {
                try { return rowsFromBuffer(contactsBuffer, contactsFilename).length; } catch (_) { return 0; }
            })() : 0,
            dealsRows: dealsBuffer ? (function () {
                try { return rowsFromBuffer(dealsBuffer, dealsFilename).length; } catch (_) { return 0; }
            })() : 0,
            lifecycleStages: Object.fromEntries(lifecycleStages),
            leadStatuses: Object.fromEntries(leadStatuses),
            dealStages: Object.fromEntries(dealStages),
            dealPipelines: Object.fromEntries(dealPipelines),
            contactTypes: Object.fromEntries(contactTypes),
            activityTypes: Object.fromEntries(activityTypes),
            owners: [...ownerNames],
            ownerEmails: [...ownerEmails],
            columns: allColumns,
        },
    };
}

module.exports = { buildConfigFromHubspotExport };

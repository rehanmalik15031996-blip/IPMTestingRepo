/**
 * Import listings + images + leads from PropData XLSX exports (no PropData API calls).
 * Residential workbook: Export + Images (all photo URLs per Web Ref/Id) + optional Floor Plans.
 * Full and lean imports both write rich listing fields (location, pricing, jurisdiction, features, full imageGallery).
 * Lean only adds listingMetadata.propdata.leanImport. Document upload sections stay empty. Leads: sheet Export.
 */

const crypto = require('crypto');
const mongoose = require('mongoose');
const XLSX = require('xlsx');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Property = require('../models/Property');

function escapeRe(s) {
    return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function str(v) {
    if (v == null || v === '') return '';
    if (v instanceof Date) return v.toISOString();
    return String(v).trim();
}

function num(v) {
    if (v == null || v === '') return null;
    const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(n) ? n : null;
}

function boolish(v) {
    if (v === true || v === false) return v;
    const s = str(v).toLowerCase();
    return s === 'true' || s === 'yes' || s === '1';
}

const PD_STATUS_TO_IPM = {
    active: 'Published',
    sold: 'Sold',
    withdrawn: 'Archived',
    archived: 'Archived',
    unavailable: 'Unavailable',
    draft: 'Draft',
    'under offer': 'Under Offer',
    'under_offer': 'Under Offer',
    let: 'Published',
    rented: 'Sold',
};

function mapListingStatus(raw) {
    const k = str(raw).toLowerCase().replace(/\s+/g, ' ');
    if (!k) return 'Draft';
    const norm = k.replace(/ /g, '_');
    return PD_STATUS_TO_IPM[k] || PD_STATUS_TO_IPM[norm] || 'Published';
}

function mapListingType(raw) {
    const t = str(raw).toLowerCase();
    if (t.includes('rent')) return 'for_rent';
    if (t.includes('auction')) return 'for_auction';
    return 'for_sale';
}

function youtubeUrl(videoId) {
    const id = str(videoId);
    if (!id) return '';
    if (id.startsWith('http')) return id;
    return `https://www.youtube.com/watch?v=${encodeURIComponent(id)}`;
}

function looksLikeHttpUrl(s) {
    return /^https?:\/\//i.test(str(s));
}

/** Prefer explicit columns; then any cell that looks like an image URL. */
function extractUrlFromRow(r, preferKeys) {
    if (!r || typeof r !== 'object') return '';
    for (const k of preferKeys) {
        if (r[k] == null || r[k] === '') continue;
        const u = str(r[k]);
        if (looksLikeHttpUrl(u)) return u;
    }
    for (const v of Object.values(r)) {
        const u = str(v);
        if (looksLikeHttpUrl(u) && /\.(jpe?g|png|gif|webp|avif)(\?|$)/i.test(u)) return u;
    }
    return '';
}

const IMAGE_SHEET_URL_KEYS = [
    'Image Url',
    'Image URL',
    'image_url',
    'URL',
    'Url',
    'Link',
    'Image Link',
    'Photo Url',
    'Photo URL',
    'Media Url',
    'Picture Url',
];

const EXPORT_ROW_IMAGE_KEYS = [
    'Image Url',
    'Image URL',
    'Primary Image Url',
    'Primary Image URL',
    'Cover Image Url',
    'Cover Image URL',
    'Main Image Url',
    'Photo Url',
    'Thumbnail Url',
];

function exportRowPrimaryImageUrl(row) {
    return extractUrlFromRow(row, EXPORT_ROW_IMAGE_KEYS);
}

function resolveNamedSheet(wb, candidates) {
    if (!wb || !wb.SheetNames || !wb.Sheets) return null;
    for (const c of candidates) {
        if (wb.Sheets[c]) return c;
    }
    const lowered = new Map(wb.SheetNames.map((n) => [String(n).trim().toLowerCase(), n]));
    for (const c of candidates) {
        const found = lowered.get(String(c).trim().toLowerCase());
        if (found) return found;
    }
    return null;
}

/**
 * Map listing keys → ordered URL list. Keys are Web Ref and/or `id:${recordId}` so Images rows
 * match the Export sheet whether they key by Web Ref or PropData Id.
 */
function buildRefUrlMap(wb, sheetNameCandidates) {
    const sheetName = resolveNamedSheet(wb, sheetNameCandidates);
    if (!sheetName) return new Map();
    const sheet = wb.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', cellDates: true });
    const map = new Map();
    for (const r of rows) {
        const webRef = str(r['Web Ref'] || r['Web ref'] || r.web_ref);
        const recId = str(r['Record Id'] || r['Record ID'] || r.Id || r.id);
        const url = extractUrlFromRow(r, IMAGE_SHEET_URL_KEYS);
        if (!url) continue;
        const keys = new Set();
        if (webRef) keys.add(webRef);
        if (recId) keys.add(`id:${recId}`);
        if (!keys.size) continue;
        for (const key of keys) {
            if (!map.has(key)) map.set(key, []);
            const arr = map.get(key);
            if (!arr.includes(url)) arr.push(url);
        }
    }
    return map;
}

function urlsForProperty(urlMap, webRef, recordId) {
    const idKey = recordId ? `id:${recordId}` : '';
    const out = [];
    const pushUnique = (list) => {
        for (const u of list) {
            if (u && !out.includes(u)) out.push(u);
        }
    };
    if (webRef && urlMap.has(webRef)) pushUnique(urlMap.get(webRef));
    if (idKey && urlMap.has(idKey)) pushUnique(urlMap.get(idKey));
    return out;
}

function sheetExportRows(workbook) {
    const sheet = workbook.Sheets.Export || workbook.Sheets.export;
    if (!sheet) return [];
    return XLSX.utils.sheet_to_json(sheet, { defval: '', cellDates: true });
}

function collectAgentsFromResidentialRows(rows) {
    const byEmail = new Map();
    const pairs = (row) => [
        [row['Agent Email'], row.Agent, row.Branch],
        [row['Agent 2 Email'], row['Agent 2'], row.Branch],
        [row['Agent 3 Email'], row['Agent 3'], row.Branch],
        [row['Agent 4 Email'], row['Agent 4'], row.Branch],
    ];
    for (const row of rows) {
        for (const [em, nm, br] of pairs(row)) {
            const e = str(em).toLowerCase();
            if (!e || !e.includes('@')) continue;
            if (!byEmail.has(e)) {
                byEmail.set(e, {
                    email: str(em),
                    name: str(nm) || e.split('@')[0],
                    branch: str(br),
                });
            }
        }
    }
    return [...byEmail.values()];
}

async function ensureAgentUser({ agencyId, email, name, branchName, results }) {
    const e = str(email).toLowerCase();
    if (!e) return null;

    const agency = await User.findById(agencyId);
    if (!agency) throw new Error('Agency not found');

    const existing = await User.findOne({ email: new RegExp(`^${escapeRe(e)}$`, 'i') });
    if (existing) {
        if (String(existing._id) === String(agencyId)) return existing;
        if (String(existing.role || '').toLowerCase() === 'agency_agent' && String(existing.agencyId) === String(agencyId)) {
            await ensureAgentOnRoster(agencyId, existing, branchName);
            return existing;
        }
        results.warnings.push(
            `Listing agent email "${e}" is already used by a ${existing.role} account; those listings will use the agency account as agent.`,
        );
        return agency;
    }

    const salt = await bcrypt.genSalt(10);
    const random = crypto.randomBytes(24).toString('hex');
    const hashedPassword = await bcrypt.hash(random, salt);
    const agentUser = new User({
        name: str(name) || e.split('@')[0],
        email: e,
        password: hashedPassword,
        role: 'agency_agent',
        agencyId: agency._id,
        agencyName: agency.agencyName || agency.name,
        branchName: str(branchName) || '',
        branchId: null,
        migrationSource: 'propdata',
    });
    await agentUser.save();
    results.agentsCreated += 1;
    await ensureAgentOnRoster(agencyId, agentUser, branchName);
    return agentUser;
}

async function ensureAgentOnRoster(agencyId, agentUser, branchName) {
    const agency = await User.findById(agencyId);
    if (!agency) return;
    if (!agency.agencyStats) agency.agencyStats = { topAgents: [], branches: [] };
    if (!Array.isArray(agency.agencyStats.topAgents)) agency.agencyStats.topAgents = [];
    const top = agency.agencyStats.topAgents;
    const exists = top.some(
        (a) =>
            (a._id && String(a._id) === String(agentUser._id)) ||
            (a.email && str(a.email).toLowerCase() === str(agentUser.email).toLowerCase()),
    );
    if (exists) return;
    top.push({
        name: agentUser.name,
        email: agentUser.email,
        branch: str(branchName) || 'Main HQ',
        branchId: agentUser.branchId || undefined,
        status: 'active',
        _id: agentUser._id,
    });
    agency.agencyStats.activeAgents = top.length;
    agency.markModified('agencyStats');
    await agency.save();
}

async function resolvePrimaryAgentForRow(row, agencyId, agentByEmailCache, results) {
    const branch = str(row.Branch);
    const tryEmails = [row['Agent Email'], row['Agent 2 Email'], row['Agent 3 Email'], row['Agent 4 Email']].map((x) => str(x).toLowerCase()).filter(Boolean);

    const agency = await User.findById(agencyId);

    for (const e of tryEmails) {
        if (agentByEmailCache.has(e)) {
            const u = agentByEmailCache.get(e);
            if (u) return u;
        }
        const emOriginal = [row['Agent Email'], row['Agent 2 Email'], row['Agent 3 Email'], row['Agent 4 Email']].find((x) => str(x).toLowerCase() === e);
        const name =
            e === str(row['Agent Email']).toLowerCase()
                ? row.Agent
                : e === str(row['Agent 2 Email']).toLowerCase()
                  ? row['Agent 2']
                  : e === str(row['Agent 3 Email']).toLowerCase()
                    ? row['Agent 3']
                    : row['Agent 4'];
        const u = await ensureAgentUser({ agencyId, email: emOriginal || e, name, branchName: branch, results });
        agentByEmailCache.set(e, u);
        if (u) return u;
    }

    return agency;
}

function coAgentsPayload(row) {
    const out = [];
    const slots = [
        [row.Agent, row['Agent Email']],
        [row['Agent 2'], row['Agent 2 Email']],
        [row['Agent 3'], row['Agent 3 Email']],
        [row['Agent 4'], row['Agent 4 Email']],
    ];
    for (const [name, email] of slots) {
        const e = str(email);
        if (e) out.push({ name: str(name), email: e });
    }
    return out;
}

/** PropData Export uses "Id"; sheet_to_json may preserve casing. */
function propdataRowPropertyId(row) {
    if (!row || typeof row !== 'object') return '';
    const raw = row.Id ?? row.id ?? row.ID ?? row['Record ID'] ?? row['Record Id'];
    if (raw == null || raw === '') return '';
    return str(raw);
}

function buildStreetAddress(row) {
    const parts = [
        row['Street Number'],
        row['Street Name'],
        row['Unit Number'] ? `Unit ${row['Unit Number']}` : '',
        row['Complex Name'],
        row['Building Name'],
    ]
        .map(str)
        .filter(Boolean);
    const fromParts = parts.join(' ').trim();
    if (fromParts) return fromParts;
    return firstRowString(row, [
        'Street Address',
        'Address Line 1',
        'Address Line1',
        'Property Address',
        'Full Address',
        'Address',
    ]);
}

function dedupeUrls(urls) {
    const seen = new Set();
    const out = [];
    for (const u of urls || []) {
        const t = str(u);
        if (!t || seen.has(t)) continue;
        seen.add(t);
        out.push(t);
    }
    return out;
}

function firstRowString(row, keys) {
    for (const k of keys) {
        if (row[k] != null && row[k] !== '') {
            const s = str(row[k]);
            if (s) return s;
        }
    }
    return '';
}

function parseFeatureTokens(v) {
    const s = str(v);
    if (!s) return [];
    return s
        .split(/[,;|\n/]+/)
        .map((x) => x.trim())
        .filter((x) => x && !/^yes$/i.test(x) && !/^no$/i.test(x));
}

function propertyFeaturesFromRow(row) {
    const set = new Set();
    for (const col of [row.Features, row['Property Features'], row.Feature, row['Key Features'], row.Amenities, row['Internal Features'], row['External Features']]) {
        for (const t of parseFeatureTokens(col)) set.add(t);
    }
    for (const [key, label] of [
        ['Pool', 'Pool'],
        ['Swimming Pool', 'Swimming pool'],
        ['Study', 'Study'],
        ['Aircon', 'Air conditioning'],
        ['Air Conditioning', 'Air conditioning'],
        ['Braai', 'Braai'],
        ['Built In Braai', 'Built-in braai'],
        ['Security System', 'Security system'],
        ['Alarm', 'Alarm'],
        ['Solar Panels', 'Solar panels'],
        ['Water Tank', 'Water tank'],
        ['Borehole', 'Borehole'],
        ['Flatlet', 'Flatlet'],
        ['Granny Flat', 'Granny flat'],
        ['Fireplace', 'Fireplace'],
    ]) {
        if (boolish(row[key])) set.add(label);
    }
    return [...set];
}

function greenEnergyFromRow(row) {
    const out = [];
    if (boolish(row['Solar Panels']) || boolish(row.Solar)) out.push('Solar panels');
    for (const x of parseFeatureTokens(row['Green Features'] || row['Energy Features'])) out.push(x);
    return [...new Set(out)];
}

function buildStatutoryIdentifiers(row) {
    const ids = {};
    const erf = firstRowString(row, ['Erf Number', 'Erf', 'Stand Number', 'Stand', 'Farm Number', 'Portion Number']);
    if (erf) ids.erfNumber = erf;
    const titleDeed = firstRowString(row, ['Title Deed Number', 'Title Deed', 'Deed Number', 'Title Number']);
    if (titleDeed) ids.titleDeedNumber = titleDeed;
    const municipal = firstRowString(row, ['Municipal Account Number', 'Rates Account Number', 'Municipal Account']);
    if (municipal) ids.municipalAccountNumber = municipal;
    const zoning = firstRowString(row, ['Zoning', 'Zoning Scheme']);
    if (zoning) ids.zoningClassification = zoning;
    const ls = str(row['Lightstone Id']);
    if (ls) ids.lightstoneId = ls;
    return ids;
}

function mapPropertyCategoryFromRow(row, propType) {
    const raw = firstRowString(row, ['Property Category', 'Listing Category', 'Category']) || str(propType);
    const t = raw.toLowerCase();
    if (t.includes('commercial')) return 'Commercial';
    if (t.includes('industrial')) return 'Industrial';
    if (t.includes('agricultur') || t.includes('farm')) return 'Agricultural';
    if (t.includes('land') || t.includes('plot') || t.includes('vacant stand')) return 'Land';
    if (t.includes('retail')) return 'Retail';
    if (t.includes('office')) return 'Office';
    return 'Residential';
}

function compositeLocationLine(street, suburb, city, province, country, postal) {
    return [street, suburb, city, province, country, postal].map(str).filter(Boolean).join(', ') || '';
}

function buildAvailabilityFromRow(row) {
    const raw = row['Available From'] || row['Available From Date'] || row['Occupation Date'] || row['Listing Date'];
    let d = null;
    if (raw instanceof Date) d = raw;
    else if (raw) d = new Date(raw);
    if (!d || Number.isNaN(d.getTime())) return undefined;
    return { status: 'available', availableFrom: d };
}

function auctionDetailsFromRow(row) {
    const rawDate = row['Auction Date'] || row['Auction On'];
    let auctionDate = null;
    if (rawDate instanceof Date) auctionDate = rawDate;
    else if (rawDate) auctionDate = new Date(rawDate);
    const auctionTime = firstRowString(row, ['Auction Time', 'Auction Time SAST']);
    if (!auctionTime && (!auctionDate || Number.isNaN(auctionDate.getTime()))) return undefined;
    const out = {};
    if (auctionDate && !Number.isNaN(auctionDate.getTime())) out.auctionDate = auctionDate;
    if (auctionTime) out.auctionTime = auctionTime;
    return Object.keys(out).length ? out : undefined;
}

function rentalSpecificFromRow(row, listingType) {
    if (listingType !== 'for_rent') return undefined;
    const out = {};
    const petRaw = str(row['Pet Friendly'] || row.Pets || row['Pet Policy']);
    if (petRaw) out.petPolicy = /^(yes|true|1|y)$/i.test(petRaw) ? 'Pets allowed' : petRaw;
    const furn = str(row.Furnished || row['Furnished Status']);
    if (furn) out.costsInclusions = [`Furnished: ${furn}`];
    const lease = firstRowString(row, ['Lease Term', 'Minimum Lease', 'Lease Period']);
    if (lease) out.leaseTerm = lease;
    return Object.keys(out).length ? out : undefined;
}

function fixturesHintFromRow(row) {
    const security = [];
    if (boolish(row.Alarm) || boolish(row['Alarm System'])) security.push('Alarm System');
    if (boolish(row['Electric Fence'])) security.push('Electric fence');
    if (boolish(row['Electronic Gate']) || boolish(row['Access Gate'])) security.push('Access Control');
    if (!security.length) return undefined;
    return { securityFeatures: security };
}

/** Mirrors PropertyUploadForm FIXTURE_OPTIONS — sorted by label length (longest first) for token matching. */
const PD_FIXTURE_PAIRS_RAW = [
    ['utilitySystems', 'HVAC'],
    ['utilitySystems', 'Electrical'],
    ['utilitySystems', 'Plumbing'],
    ['utilitySystems', 'Gas'],
    ['utilitySystems', 'Water'],
    ['utilitySystems', 'Solar'],
    ['utilitySystems', 'Generator'],
    ['utilitySystems', 'Septic System'],
    ['utilitySystems', 'Fire Sprinklers'],
    ['utilitySystems', 'Elevator'],
    ['utilitySystems', 'Boiler'],
    ['utilitySystems', 'Radiant Heating'],
    ['utilitySystems', 'Central Air Conditioning'],
    ['utilitySystems', 'Desalination Plant'],
    ['utilitySystems', 'Greywater Recycling'],
    ['utilitySystems', 'Solar Battery Storage'],
    ['utilitySystems', 'EV Charging Points'],
    ['utilitySystems', 'Heat Pump'],
    ['securityFeatures', '24/7 Concierge / Security Guard'],
    ['securityFeatures', 'Biometric Access'],
    ['securityFeatures', 'Intercom'],
    ['securityFeatures', 'CCTV'],
    ['securityFeatures', 'Smart Locks'],
    ['securityFeatures', 'Video Doorbell'],
    ['securityFeatures', 'Motion Sensors'],
    ['securityFeatures', 'Safe Room'],
    ['securityFeatures', 'Access Control'],
    ['securityFeatures', 'Security Guards'],
    ['securityFeatures', 'Alarm System'],
    ['kitchenAppliances', 'Outdoor Kitchen'],
    ['kitchenAppliances', 'Garbage Disposal'],
    ['kitchenAppliances', 'Water Purifier'],
    ['kitchenAppliances', 'Range Hood'],
    ['kitchenAppliances', 'Wine Cooler'],
    ['kitchenAppliances', 'Wine Cellar'],
    ['kitchenAppliances', 'Microwave'],
    ['kitchenAppliances', 'Cooktop'],
    ['kitchenAppliances', 'Dishwasher'],
    ['kitchenAppliances', 'Refrigerator'],
    ['kitchenAppliances', 'Freezer'],
    ['kitchenAppliances', 'Oven'],
    ['leisureExternal', 'Outdoor Kitchen'],
    ['leisureExternal', 'Tennis Court'],
    ['leisureExternal', 'Playground'],
    ['leisureExternal', 'Jacuzzi'],
    ['leisureExternal', 'Sauna'],
    ['leisureExternal', 'Pergola'],
    ['leisureExternal', 'Fire Pit'],
    ['leisureExternal', 'BBQ Area'],
    ['leisureExternal', 'Balcony'],
    ['leisureExternal', 'Deck'],
    ['leisureExternal', 'Patio'],
    ['leisureExternal', 'Garden'],
    ['leisureExternal', 'Pool'],
    ['interiorFeatures', 'Smart Home System'],
    ['interiorFeatures', 'Walk-in Closets'],
    ['interiorFeatures', 'Built-in Wardrobes'],
    ['interiorFeatures', 'Hardwood Floors'],
    ['interiorFeatures', 'Home Cinema'],
    ['interiorFeatures', 'Sound System'],
    ['interiorFeatures', 'Laundry Room'],
    ['interiorFeatures', 'Home Office'],
    ['interiorFeatures', 'Central Air'],
    ['interiorFeatures', 'Library'],
    ['interiorFeatures', 'Basement'],
    ['interiorFeatures', 'Attic'],
    ['interiorFeatures', 'Fireplace'],
    ['parkingStorage', 'Bicycle Storage'],
    ['parkingStorage', 'EV Charging'],
    ['parkingStorage', 'Covered Parking'],
    ['parkingStorage', 'Storage Room'],
    ['parkingStorage', 'Carport'],
    ['parkingStorage', 'Workshop'],
    ['parkingStorage', 'Garage'],
    ['parkingStorage', 'Driveway'],
];
const PD_FIXTURE_PAIRS = [...PD_FIXTURE_PAIRS_RAW].sort((a, b) => b[1].length - a[1].length);

function mapExtrasStringToFixtures(extrasText) {
    const tokens = parseFeatureTokens(extrasText);
    if (!tokens.length) return null;
    const buckets = {
        utilitySystems: [],
        securityFeatures: [],
        kitchenAppliances: [],
        leisureExternal: [],
        interiorFeatures: [],
        parkingStorage: [],
    };
    const other = [];
    for (const tok of tokens) {
        const tn = tok.toLowerCase();
        let hit = null;
        for (const [bucket, label] of PD_FIXTURE_PAIRS) {
            const ln = label.toLowerCase();
            if (tn === ln || tn.includes(ln) || ln.includes(tn)) {
                hit = [bucket, label];
                break;
            }
        }
        if (hit) {
            const [b, lab] = hit;
            if (!buckets[b].includes(lab)) buckets[b].push(lab);
        } else other.push(tok);
    }
    const out = {};
    for (const [k, v] of Object.entries(buckets)) {
        if (v.length) out[k] = v;
    }
    if (other.length) out.otherFixtures = other.join('; ');
    return Object.keys(out).length ? out : null;
}

function extrasFixturesFromRow(row) {
    const raw = firstRowString(row, ['Extras', 'Extra Features', 'Additional Features', 'Extra', 'Listing Extras']);
    return raw ? mapExtrasStringToFixtures(raw) : null;
}

function mergeFixtureObjects(a, b) {
    if (!a) return b;
    if (!b) return a;
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    const out = {};
    for (const k of keys) {
        if (k === 'otherFixtures') {
            const merged = [a[k], b[k]].filter(Boolean).join('; ').trim();
            if (merged) out[k] = merged;
            continue;
        }
        const arr = [...new Set([...(Array.isArray(a[k]) ? a[k] : []), ...(Array.isArray(b[k]) ? b[k] : [])])];
        if (arr.length) out[k] = arr;
    }
    return Object.keys(out).length ? out : null;
}

function firstPriceNum(row) {
    const keys = ['Price', 'Asking Price', 'Listing Price', 'For Sale Price', 'Sale Price', 'Asking'];
    for (const k of keys) {
        const n = num(row[k]);
        if (n != null) return n;
    }
    return null;
}

/** Whole-day Excel serial range ≈ 1954–2080 (avoid treating Unix timestamps as serials). */
const EXCEL_DAY_SERIAL_MIN = 20000;
const EXCEL_DAY_SERIAL_MAX = 65000;

function excelDaySerialToUtcDate(serial) {
    const n = Number(serial);
    if (!Number.isFinite(n)) return null;
    const whole = Math.floor(n);
    if (whole < EXCEL_DAY_SERIAL_MIN || whole > EXCEL_DAY_SERIAL_MAX) return null;
    const ms = Math.round((whole - 25569) * 86400 * 1000);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
}

/**
 * PropData / SheetJS can yield Date, Excel serial (number), ISO string, or DD/MM/YYYY text.
 * `new Date(excelSerial)` and US-centric `Date.parse` on DD/MM strings both yield wrong calendar days.
 */
function coercePropdataCalendarDate(raw) {
    if (raw == null || raw === '') return null;
    if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw;
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        const intish = Math.floor(raw);
        if (intish >= EXCEL_DAY_SERIAL_MIN && intish <= EXCEL_DAY_SERIAL_MAX) {
            const fromExcel = excelDaySerialToUtcDate(raw);
            if (fromExcel) return fromExcel;
        }
        if (raw >= 946684800 && raw <= 4102444800) {
            const d = new Date(raw * 1000);
            if (!Number.isNaN(d.getTime())) return d;
        }
        if (raw >= 946684800000 && raw <= 4102444800000) {
            const d = new Date(raw);
            if (!Number.isNaN(d.getTime())) return d;
        }
        return null;
    }
    const s = String(raw).trim();
    if (!s) return null;
    const isoYmd = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoYmd) {
        const y = parseInt(isoYmd[1], 10);
        const mo = parseInt(isoYmd[2], 10);
        const day = parseInt(isoYmd[3], 10);
        const d = new Date(Date.UTC(y, mo - 1, day));
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const dmy = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\s|$)/);
    if (dmy) {
        const a = parseInt(dmy[1], 10);
        const b = parseInt(dmy[2], 10);
        const y = parseInt(dmy[3], 10);
        let day;
        let month;
        if (a > 12) {
            day = a;
            month = b;
        } else if (b > 12) {
            month = a;
            day = b;
        } else {
            day = a;
            month = b;
        }
        const d = new Date(Date.UTC(y, month - 1, day));
        return Number.isNaN(d.getTime()) ? null : d;
    }
    const parsed = new Date(s);
    if (!Number.isNaN(parsed.getTime())) return parsed;
    return null;
}

const LISTING_DATE_COLUMN_KEYS = [
    'Listing Date',
    'Date Listed',
    'List Date',
    'Listed Date',
    'First Listed',
    'Listed On',
    'Publish Date',
    'Publication Date',
    'Activation Date',
    'On Market Date',
    'Date Live',
    'Created',
    'Created Date',
    'Date Created',
    'Listing Created',
    'Record Created',
    'Entry Date',
];

function sourceCreatedAtFromRow(row) {
    if (!row || typeof row !== 'object') return null;
    const lowerToActual = new Map(Object.keys(row).map((k) => [String(k).trim().toLowerCase(), k]));
    for (const key of LISTING_DATE_COLUMN_KEYS) {
        const actual = lowerToActual.get(String(key).trim().toLowerCase());
        if (!actual) continue;
        const d = coercePropdataCalendarDate(row[actual]);
        if (d) return d;
    }
    return null;
}

function normalizedOnShowDayFromRow(row) {
    const t = str(row['On Show']).toLowerCase();
    if (!t || t === 'no' || t === 'false' || t === 'n' || t === '0' || t === 'off' || t === 'none') return '';
    return str(row['On Show']);
}

function normalizedOnShowTimesFromRow(row) {
    if (!normalizedOnShowDayFromRow(row)) return '';
    return [str(row['Open Hour Date']), str(row['Open Hour Time'])].filter(Boolean).join(' ').trim();
}

function rowToPropertyPayload({ row, agentId, agencyId, imageUrls, floorplanUrls, listingRef }) {
    const webRef = str(row['Web Ref']);
    const recordId = propdataRowPropertyId(row);
    const suburb = firstRowString(row, ['Location', 'Suburb', 'Suburb Name', 'Area', 'Neighbourhood', 'Neighborhood']) || '';
    const street = buildStreetAddress(row);
    const province = firstRowString(row, ['Province', 'Region', 'State']);
    const city = firstRowString(row, ['City', 'Town', 'Municipality']) || province;
    const country =
        firstRowString(row, [
            'Country',
            'Nation',
            'Country Name',
            'Listing Country',
            'Country / Region',
            'Country/Region',
        ]) || (province ? 'South Africa' : '');
    const postal = firstRowString(row, ['Postal Code', 'Post Code', 'Postal', 'Zip Code']);
    const location =
        compositeLocationLine(street, suburb, city, province, country, postal) || suburb || street || 'Unknown';

    const heading = str(row['Marketing Heading']);
    const propType = str(row['Property Type']);
    const title = heading || [propType, suburb].filter(Boolean).join(' · ') || `Listing ${webRef || recordId}`;
    const propertyCategory = mapPropertyCategoryFromRow(row, propType);

    const priceNum = firstPriceNum(row);
    const priceStr = priceNum != null ? String(priceNum) : str(row.Price || row['Asking Price']) || '0';

    const land = num(row['Land Size']);
    const floor = num(row['Floor Size']);
    const landUnit = str(row['Land Size Measurement Type']);
    const floorUnit = str(row['Floor Size Measurement Type']);

    const mapX = num(row['Map X Position']);
    const mapY = num(row['Map Y Position']);

    const gallery = dedupeUrls(imageUrls);
    const cover = gallery[0] || '';
    const floorplans = dedupeUrls(floorplanUrls);

    const soldPrice = num(row['Sold Price']);
    const soldDate = row['Sold Status Date'] instanceof Date ? row['Sold Status Date'] : row['Sold Status Date'] ? new Date(row['Sold Status Date']) : null;

    const status = mapListingStatus(row.Status);
    const listingType = mapListingType(row['Listing Type']);

    const statutory = buildStatutoryIdentifiers(row);
    const feats = propertyFeaturesFromRow(row);
    const green = greenEnergyFromRow(row);
    const sourceCreatedAtParsed = sourceCreatedAtFromRow(row);

    const pricing = {
        currency: 'ZAR',
        askingPrice: priceNum != null ? priceNum : undefined,
        monthlyRental: listingType === 'for_rent' && priceNum != null ? priceNum : undefined,
        priceBasis: firstRowString(row, ['Price Type', 'Pricing Basis', 'Sale Type']) || undefined,
        annualEscalation: firstRowString(row, ['Annual Escalation', 'Escalation', 'Rental Escalation']) || undefined,
    };
    if (listingType === 'for_auction') {
        const sb = num(row['Starting Bid'] || row['Auction Starting Bid'] || row['Auction Price']);
        if (sb != null) pricing.startingBid = sb;
    }

    const locationDetails = {
        suburb: suburb || undefined,
        streetAddress: street || undefined,
        city: city || undefined,
        region: province || undefined,
        country: country || undefined,
        postalCode: postal || undefined,
        hideAddress: !boolish(row['Publish Street Address']),
    };
    if (mapX != null && mapY != null) {
        locationDetails.coordinates = { lat: mapX, lng: mapY };
    }

    const residentialBlock = {
        bedrooms: num(row.Bedrooms) != null ? Math.round(num(row.Bedrooms)) : undefined,
        bathrooms: num(row.Bathrooms) != null ? Math.round(num(row.Bathrooms)) : undefined,
        livingAreaSize: floor != null ? floor : undefined,
        landLotSize: land != null ? land : undefined,
        parkingSpaces:
            (num(row.Garages) || 0) + (num(row.Carports) || 0) > 0
                ? (num(row.Garages) || 0) + (num(row.Carports) || 0)
                : undefined,
        bodyCorporateFee: {
            applicable: num(row['Monthly Levy']) > 0 || num(row['Sectional Title Levy']) > 0,
            monthlyAmount: num(row['Monthly Levy']) || num(row['Sectional Title Levy']) || undefined,
        },
        propertyFeatures: feats.length ? feats : undefined,
        greenEnergyFeatures: green.length ? green : undefined,
        epcEnergyRating: firstRowString(row, ['Energy Rating', 'EPC Rating', 'Energy Efficiency']) || undefined,
        localCouncilTax: num(row.Rates) || num(row['Property Rates']) || num(row['Monthly Rates']) || undefined,
        lastSalePrice: num(row['Last Sold Price']) || undefined,
    };

    const payload = {
        title,
        location,
        price: priceStr,
        description: str(row.Description) || '',
        imageUrl: cover,
        agentId,
        importSource: 'propdata',
        importListingRef: listingRef,
        importRecordId: recordId,
        importAgencyId: agencyId,
        status,
        listingType,
        propertyCategory,
        type: propType || propertyCategory,
        isFeatured: boolish(row.Featured),
        priceReduced: boolish(row['Price Reduced']),
        locationDetails,
        pricing,
        availability: buildAvailabilityFromRow(row),
        propertySize: {
            unitSystem: floorUnit || landUnit || 'm²',
            size: floor != null ? floor : undefined,
            landSize: land != null ? land : undefined,
        },
        residential: residentialBlock,
        specs: {
            beds: num(row.Bedrooms) != null ? Math.round(num(row.Bedrooms)) : undefined,
            baths: num(row.Bathrooms) != null ? Math.round(num(row.Bathrooms)) : undefined,
            sqft: floor != null ? floor : undefined,
        },
        media: {
            coverImage: cover,
            imageGallery: gallery,
            floorplans,
            walkthroughVideo: youtubeUrl(row['Video Id']),
            virtual3DTour:
                str(row['Virtual Tour']) ||
                (str(row['Matterport Id'])
                    ? `https://my.matterport.com/show/?m=${encodeURIComponent(str(row['Matterport Id']))}`
                    : ''),
        },
        ownership: {
            mandate: [str(row['Mandate Type']), str(row['Mandate Notes'])].filter(Boolean).join(' — ') || undefined,
            listingVisibility: firstRowString(row, ['Listing Visibility', 'Visibility', 'Portal Visibility']) || undefined,
        },
        jurisdiction: {
            country: (country && String(country).trim()) || undefined,
            statutoryIdentifiers: Object.keys(statutory).length ? statutory : undefined,
        },
        listingMetadata: {
            propdata: {
                webRef: webRef || null,
                recordId,
                branch: str(row.Branch),
                lightstoneId: str(row['Lightstone Id']),
                coAgents: coAgentsPayload(row),
                ...(sourceCreatedAtParsed ? { sourceCreatedAt: sourceCreatedAtParsed } : {}),
                videoId: str(row['Video Id']) || null,
            },
        },
        externalIds: {
            propdata: {
                recordId: recordId || undefined,
                webRef: webRef || undefined,
            },
        },
        onShowDay: normalizedOnShowDayFromRow(row),
        onShowTimes: normalizedOnShowTimesFromRow(row),
    };

    const defectNotes = firstRowString(row, ['Defect Notes', 'Condition Notes', 'Property Condition']);
    if (defectNotes) payload.defects = { additionalNotes: defectNotes };

    const mergedFix = mergeFixtureObjects(fixturesHintFromRow(row), extrasFixturesFromRow(row));
    if (mergedFix) payload.fixtures = mergedFix;

    const auct = auctionDetailsFromRow(row);
    if (auct) payload.auctionDetails = auct;

    const rent = rentalSpecificFromRow(row, listingType);
    if (rent) payload.rentalSpecific = rent;

    if (status === 'Sold' && soldPrice != null) {
        payload.salePrice = soldPrice;
        if (soldDate && !Number.isNaN(soldDate.getTime())) payload.saleDate = soldDate;
    }

    if (!payload.locationDetails.coordinates || (payload.locationDetails.coordinates.lat == null && payload.locationDetails.coordinates.lng == null)) {
        delete payload.locationDetails.coordinates;
    }

    return payload;
}

/**
 * Same rich payload as full import (location, pricing, media gallery, jurisdiction, etc.), tagged for Listing Management.
 */
function rowToLeanPropertyPayload({ row, agentId, agencyId, listingRef, imageUrls, floorplanUrls }) {
    const payload = rowToPropertyPayload({ row, agentId, agencyId, imageUrls, floorplanUrls, listingRef });
    payload.listingMetadata = payload.listingMetadata || {};
    payload.listingMetadata.propdata = { ...payload.listingMetadata.propdata, leanImport: true };
    return payload;
}

function stripUndefinedDeep(obj) {
    if (obj == null) return obj;
    /* ObjectId / Buffer / Date are objects; do not Object.entries() them — that corrupts BSON types for $set. */
    if (obj instanceof mongoose.Types.ObjectId) return obj;
    if (Buffer.isBuffer(obj)) return obj;
    if (obj instanceof Date) return obj;
    if (Array.isArray(obj)) return obj.map(stripUndefinedDeep);
    if (typeof obj !== 'object') return obj;
    const out = {};
    for (const [k, v] of Object.entries(obj)) {
        if (v === undefined) continue;
        out[k] = stripUndefinedDeep(v);
    }
    for (const k of Object.keys(out)) {
        const v = out[k];
        if (v && typeof v === 'object' && !Array.isArray(v) && Object.keys(v).length === 0) delete out[k];
    }
    return out;
}

function leadStableId(row) {
    const h = crypto
        .createHash('sha1')
        .update(
            JSON.stringify({
                c: str(row.Contact),
                e: str(row['Contact Email']).toLowerCase(),
                l: str(row.Listing),
                cr: str(row.Created),
            }),
        )
        .digest('hex')
        .slice(0, 24);
    return `propdata-${h}`;
}

/** PropData lead export may add Record Id in some tenants; else stable hash id. */
function propdataLeadRowId(row) {
    const pdRec = str(row['Record Id'] || row['Record ID'] || row['Lead Id'] || row['Lead ID'] || row['Id']);
    if (pdRec && /^[\w.-]+$/.test(pdRec)) return `propdata-pd-${pdRec}`;
    return leadStableId(row);
}

/** Pull Web Ref (e.g. SIR124149) from free-text listing field for linking. */
function webRefFromListingText(listingText) {
    const s = str(listingText);
    const m = s.match(/\b(SIR\d+)\b/i);
    if (m) return m[1].toUpperCase();
    return '';
}

function formatValidationErr(e) {
    if (e && e.name === 'ValidationError' && e.errors) {
        return Object.values(e.errors)
            .map((er) => er.message)
            .join('; ');
    }
    return e && e.message ? e.message : String(e);
}

async function executePropdataImportJobInner(job) {
    const agencyId = job.agencyId;
    const results = {
        propertiesUpserted: 0,
        propertiesSkipped: 0,
        leadsImported: 0,
        leadsSkipped: 0,
        agentsCreated: 0,
        warnings: [],
        errors: [],
    };
    job.summary = results;
    job.done = false;
    job.error = null;

    const [agentPhase, listPhase, leadsPhase] = job.phases;
    const agentByEmailCache = new Map();

    let residentialRows = null;
    let imageMap = new Map();
    let floorMap = new Map();

    /** Agents */
    agentPhase.status = 'running';
    agentPhase.current = 0;
    agentPhase.total = 0;
    agentPhase.detail = '';
    if (!job.residentialBuffer || !job.residentialBuffer.length) {
        agentPhase.status = 'skipped';
        agentPhase.detail = 'No residential workbook';
    } else {
        let wb = null;
        try {
            wb = XLSX.read(job.residentialBuffer, { type: 'buffer', cellDates: true });
        } catch (e) {
            agentPhase.status = 'error';
            agentPhase.error = e.message;
            results.errors.push(`Residential XLSX: ${e.message}`);
            job.error = job.error || e.message;
        }
        if (wb) {
            residentialRows = sheetExportRows(wb);
            imageMap = buildRefUrlMap(wb, ['Images', 'images', 'Property Images', 'property images']);
            floorMap = buildRefUrlMap(wb, ['Floor Plans', 'Floor plans', 'floor plans', 'Floorplans']);

            const agentsNeeded = collectAgentsFromResidentialRows(residentialRows);
            agentPhase.total = agentsNeeded.length;
            for (let i = 0; i < agentsNeeded.length; i++) {
                const a = agentsNeeded[i];
                const key = str(a.email).toLowerCase();
                if (!agentByEmailCache.has(key)) {
                    const u = await ensureAgentUser({
                        agencyId,
                        email: a.email,
                        name: a.name,
                        branchName: a.branch,
                        results,
                    });
                    agentByEmailCache.set(key, u);
                }
                agentPhase.current = i + 1;
                await new Promise((r) => setImmediate(r));
            }
            agentPhase.status = 'done';
        } else if (agentPhase.status !== 'error') {
            agentPhase.status = 'skipped';
            agentPhase.detail = 'Could not read residential workbook';
        }
    }

    /** Listings */
    listPhase.status = 'running';
    listPhase.current = 0;
    listPhase.total = 0;
    listPhase.detail = '';
    if (!residentialRows) {
        listPhase.status = 'skipped';
        listPhase.detail = 'No residential data';
    } else {
        const eligible = residentialRows.filter((r) => str(r['Web Ref']) || propdataRowPropertyId(r));
        const cap = job.maxListings != null && job.maxListings > 0 ? job.maxListings : null;
        const toProcess = cap != null ? eligible.slice(0, cap) : eligible;
        listPhase.total = toProcess.length;
        if (cap != null && eligible.length > cap) {
            listPhase.detail = `Capped at ${cap} of ${eligible.length} listings`;
        }

        for (let i = 0; i < toProcess.length; i++) {
            const row = toProcess[i];
            const webRef = str(row['Web Ref']);
            const recordId = propdataRowPropertyId(row);
            const refKey = webRef || recordId;
            try {
                const agent = await resolvePrimaryAgentForRow(row, agencyId, agentByEmailCache, results);
                if (!agent || !agent._id) {
                    results.propertiesSkipped += 1;
                    results.warnings.push(`No agent for row ${refKey}`);
                    listPhase.current = i + 1;
                    continue;
                }
                const listingRef = webRef || `id:${recordId}`;
                let imgs = urlsForProperty(imageMap, webRef, recordId);
                if (!imgs.length) {
                    const fallback = exportRowPrimaryImageUrl(row);
                    if (fallback) imgs = [fallback];
                }
                const floors = urlsForProperty(floorMap, webRef, recordId);
                const payload = job.lean
                    ? rowToLeanPropertyPayload({
                          row,
                          agentId: agent._id,
                          agencyId,
                          listingRef,
                          imageUrls: imgs,
                          floorplanUrls: floors,
                      })
                    : rowToPropertyPayload({
                          row,
                          agentId: agent._id,
                          agencyId,
                          imageUrls: imgs,
                          floorplanUrls: floors,
                          listingRef,
                      });
                await Property.findOneAndUpdate(
                    { importAgencyId: agencyId, importSource: 'propdata', importListingRef: listingRef },
                    { $set: stripUndefinedDeep(payload) },
                    { upsert: true, new: true, runValidators: true, setDefaultsOnInsert: true },
                );
                results.propertiesUpserted += 1;
            } catch (e) {
                const msg = formatValidationErr(e);
                results.errors.push(`Property ${refKey}: ${msg}`);
                results.propertiesSkipped += 1;
            }
            listPhase.current = i + 1;
            await new Promise((r) => setImmediate(r));
        }
        listPhase.status = 'done';
    }

    /** Leads */
    leadsPhase.status = 'running';
    leadsPhase.current = 0;
    leadsPhase.total = 0;
    leadsPhase.detail = '';
    if (!job.leadsBuffer || !job.leadsBuffer.length) {
        leadsPhase.status = 'skipped';
        leadsPhase.detail = 'No leads workbook';
    } else {
        let wb = null;
        try {
            wb = XLSX.read(job.leadsBuffer, { type: 'buffer', cellDates: true });
        } catch (e) {
            leadsPhase.status = 'error';
            leadsPhase.error = e.message;
            results.errors.push(`Leads XLSX: ${e.message}`);
            job.error = job.error || e.message;
        }
        if (!wb) {
            if (leadsPhase.status !== 'error') leadsPhase.status = 'skipped';
        } else {
        const rows = sheetExportRows(wb);
        leadsPhase.total = rows.length;

        const agency = await User.findById(agencyId);
        if (!agency) throw new Error('Agency not found');
        if (!agency.agencyStats) agency.agencyStats = {};
        if (!Array.isArray(agency.agencyStats.crmLeads)) agency.agencyStats.crmLeads = [];

        if (job.replacePropdataLeads) {
            agency.agencyStats.crmLeads = agency.agencyStats.crmLeads.filter(
                (l) => !str(l.id).startsWith('propdata-') && !str(l.id).startsWith('propdata-pd-'),
            );
        }

        const existingIds = new Set(agency.agencyStats.crmLeads.map((l) => str(l.id)));
        const existingByEmail = new Map();
        for (let ei = 0; ei < agency.agencyStats.crmLeads.length; ei++) {
            const em = str(agency.agencyStats.crmLeads[ei].email).toLowerCase();
            if (em) existingByEmail.set(em, ei);
        }

        for (let i = 0; i < rows.length; i++) {
            const row = rows[i];
            leadsPhase.current = i + 1;

            const email = str(row['Contact Email']);
            const contact = str(row.Contact);
            if (!email && !contact) {
                results.leadsSkipped += 1;
                continue;
            }

            const id = propdataLeadRowId(row);
            if (existingIds.has(id)) {
                results.leadsSkipped += 1;
                continue;
            }

            // If a lead with this email already exists (e.g. from HubSpot), merge PropData data into it
            const emailLower = email ? email.toLowerCase() : '';
            const existingIdx = emailLower ? existingByEmail.get(emailLower) : undefined;
            if (existingIdx != null) {
                const existing = agency.agencyStats.crmLeads[existingIdx];
                const plain = typeof existing.toObject === 'function' ? existing.toObject() : { ...existing };
                if (!plain.source || !plain.source.includes('PropData')) {
                    plain.source = plain.source ? `${plain.source} + PropData` : 'PropData';
                }
                const listingText = str(row.Listing);
                const inferredWebRef = webRefFromListingText(listingText);
                if (!plain.linkedProperties || typeof plain.linkedProperties !== 'object') plain.linkedProperties = {};
                if (listingText) plain.linkedProperties.propdataListingText = listingText;
                if (inferredWebRef) plain.linkedProperties.propdataWebRef = inferredWebRef;
                if (!plain.externalIds) plain.externalIds = {};
                const pdRec = str(row['Record Id'] || row['Record ID'] || row['Lead Id'] || row['Lead ID'] || row['Id']);
                if (pdRec || inferredWebRef) {
                    plain.externalIds.propdata = { ...(plain.externalIds.propdata || {}), ...(pdRec ? { recordId: pdRec } : {}), ...(inferredWebRef ? { webRef: inferredWebRef } : {}) };
                }
                if (!plain.mobile && str(row['Contact Cell Number'])) plain.mobile = str(row['Contact Cell Number']);
                if (!plain.budget && str(row['Asking Price'])) plain.budget = str(row['Asking Price']);
                if (!plain.propertyOfInterest && listingText) plain.propertyOfInterest = listingText;
                if (!plain.buyerDetails || typeof plain.buyerDetails !== 'object') plain.buyerDetails = {};
                const msg = str(row.Message);
                if (msg && !plain.buyerDetails.message) plain.buyerDetails.message = msg;
                agency.agencyStats.crmLeads[existingIdx] = plain;
                existingIds.add(id);
                if (!results.leadsMergedWithHubspot) results.leadsMergedWithHubspot = 0;
                results.leadsMergedWithHubspot += 1;
                continue;
            }

            const listingText = str(row.Listing);
            const inferredWebRef = webRefFromListingText(listingText);
            const pdLeadRec = str(row['Record Id'] || row['Record ID'] || row['Lead Id'] || row['Lead ID'] || row['Id']);

            let assignedAgentId = '';
            const ae = str(row['Agent Email']);
            if (ae) {
                const agent = await User.findOne({ email: new RegExp(`^${escapeRe(ae.toLowerCase())}$`, 'i') });
                if (agent && String(agent.agencyId) === String(agencyId)) assignedAgentId = String(agent._id);
            }

            const created =
                coercePropdataCalendarDate(
                    row.Created ??
                        row['Created Date'] ??
                        row['Date Created'] ??
                        row['Lead Created'],
                ) || new Date();
            const lead = {
                id,
                leadScore: null,
                assignedAgentId,
                name: contact || email || 'Unknown',
                type: str(row['Lead Type']) || 'Buyer',
                budget: str(row['Asking Price']),
                status: [str(row.Status), str(row.Stage)].filter(Boolean).join(' · ') || 'New',
                lastContact: '',
                email,
                mobile: str(row['Contact Cell Number']),
                propertyOfInterest: str(row.Listing),
                dateAdded: Number.isNaN(created.getTime()) ? new Date().toISOString() : created.toISOString(),
                source: [str(row.Source), str(row['Source Description'])].filter(Boolean).join(' — ') || 'PropData',
                linkedProperties: stripUndefinedDeep({
                    propdataListingText: listingText || undefined,
                    propdataWebRef: inferredWebRef || undefined,
                }),
                activities: [],
                leadType: (() => {
                    const lt = str(row['Lead Type']).toLowerCase();
                    if (lt.includes('seller')) return 'seller';
                    if (lt.includes('investor')) return 'investor';
                    return 'buyer';
                })(),
                buyerDetails: stripUndefinedDeep({
                    message: str(row.Message) || undefined,
                    pageUrl: str(row['Page Url']) || undefined,
                    profile: str(row.Profile) || undefined,
                    notes: str(row.Notes) || undefined,
                }),
            };

            const pdExt = {};
            if (pdLeadRec) pdExt.recordId = pdLeadRec;
            if (inferredWebRef) pdExt.webRef = inferredWebRef;
            if (Object.keys(pdExt).length) lead.externalIds = { propdata: pdExt };

            agency.agencyStats.crmLeads.push(lead);
            existingIds.add(id);
            results.leadsImported += 1;
            await new Promise((r) => setImmediate(r));
        }

        agency.markModified('agencyStats');
        await agency.save();
        leadsPhase.status = 'done';
        }
    }
}

/**
 * Mutates `job` with progress in `job.phases` (for polling). Set job.maxListings to a positive number to cap listings (e.g. 3 for testing).
 * @param {object} job
 */
async function executePropdataImportJob(job) {
    try {
        await executePropdataImportJobInner(job);
    } catch (e) {
        const msg = formatValidationErr(e);
        job.error = job.error || msg;
        if (!job.summary) {
            job.summary = {
                propertiesUpserted: 0,
                propertiesSkipped: 0,
                leadsImported: 0,
                leadsSkipped: 0,
                agentsCreated: 0,
                warnings: [],
                errors: [],
            };
        }
        if (Array.isArray(job.summary.errors)) job.summary.errors.push(msg);
        for (const p of job.phases) {
            if (p.status === 'running') {
                p.status = 'error';
                p.error = p.error || msg;
            }
        }
    } finally {
        job.residentialBuffer = null;
        job.leadsBuffer = null;
        job.done = true;
    }
}

function createPropdataImportJob({
    id,
    agencyId,
    residentialBuffer,
    leadsBuffer,
    replacePropdataLeads,
    maxListings,
    lean = false,
}) {
    return {
        id,
        agencyId,
        residentialBuffer,
        leadsBuffer,
        replacePropdataLeads: !!replacePropdataLeads,
        lean: !!lean,
        maxListings: maxListings == null || maxListings === '' ? null : Number(maxListings),
        phases: [
            { key: 'agents', title: 'Listing agents', current: 0, total: 0, status: 'pending' },
            { key: 'listings', title: 'Listings', current: 0, total: 0, status: 'pending' },
            { key: 'leads', title: 'CRM leads', current: 0, total: 0, status: 'pending' },
        ],
        summary: null,
        done: false,
        error: null,
    };
}

/** Synchronous-style import (no polling) — same logic as background job. */
async function runPropdataXlsxImport({ agencyUser, residentialBuffer, leadsBuffer, replacePropdataLeads, maxListings }) {
    const job = createPropdataImportJob({
        id: 'sync',
        agencyId: agencyUser._id,
        residentialBuffer,
        leadsBuffer,
        replacePropdataLeads,
        maxListings,
    });
    await executePropdataImportJob(job);
    return job.summary;
}

/** Minimal field import — titles, refs, agents, scope fields; tag `listingMetadata.propdata.leanImport`. */
async function runPropdataLeanXlsxImport({ agencyUser, residentialBuffer, maxListings }) {
    const job = createPropdataImportJob({
        id: 'lean-sync',
        agencyId: agencyUser._id,
        residentialBuffer,
        leadsBuffer: null,
        replacePropdataLeads: false,
        maxListings,
        lean: true,
    });
    await executePropdataImportJob(job);
    return job.summary;
}

module.exports = {
    runPropdataXlsxImport,
    runPropdataLeanXlsxImport,
    executePropdataImportJob,
    createPropdataImportJob,
};

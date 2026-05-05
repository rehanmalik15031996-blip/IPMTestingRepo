/**
 * Backfill comparable industrial listings on every Marder demo property by
 * scraping Private Property and Property24 DIRECTLY (no Cloud Run / Tavily /
 * Anthropic dependency). For each Marder property we:
 *
 *   1. Determine the suburb / city / region.
 *   2. Resolve the matching commercial-sales / industrial-for-sale page URL on
 *      both portals using a province-wide URL map fetched on startup.
 *   3. Scrape that page once (cached) and pull all listing cards.
 *   4. Sort to prefer same-suburb matches, then same-region.
 *   5. Write up to 20 entries into listingMetadata.area_housing.listings with
 *      a price/size summary block — same shape the dashboard already renders.
 *
 * Usage:
 *   MONGO_URI='...' node scripts/backfill-marder-comps-direct.js [--limit=N] [--force] [--dry]
 *
 *   --limit=N : only process N properties (testing)
 *   --force   : re-fetch even if listingMetadata.area_housing.listings is already populated
 *   --dry     : log what would happen, don't write to DB
 *
 * Re-runnable. Per-listing failures don't abort the script.
 */

const path = require('path');
const https = require('https');
const zlib = require('zlib');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Property = require('../server/models/Property');

const MONGO_URI = process.env.MONGO_URI ||
    'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const HEADERS = {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Upgrade-Insecure-Requests': '1',
};

const POLITE_DELAY_MS = 800;
const CARD_LIMIT_PER_PORTAL = 12;
const FINAL_LISTING_LIMIT = 20;

// ─────────────────────────────────────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs() {
    const args = process.argv.slice(2);
    let limit = null;
    let force = false;
    let dry = false;
    for (const a of args) {
        if (a.startsWith('--limit=')) limit = Number(a.slice(8)) || null;
        if (a === '--force') force = true;
        if (a === '--dry' || a === '--dry-run') dry = true;
    }
    return { limit, force, dry };
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP fetch with gzip/br, follow redirects, polite throttle
// ─────────────────────────────────────────────────────────────────────────────
function get(url, retries = 4) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: HEADERS }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const next = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : new URL(res.headers.location, url).toString();
                return get(next, retries).then(resolve, reject);
            }
            // Retry on rate-limit / temporary unavailable responses with exponential backoff
            if ((res.statusCode === 429 || res.statusCode === 503 || res.statusCode === 502) && retries > 0) {
                const attempt = 5 - retries; // 0..4
                const wait = Math.min(60000, 4000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 1500);
                return setTimeout(() => get(url, retries - 1).then(resolve, reject), wait);
            }
            if (res.statusCode !== 200) {
                return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
            }
            const chunks = [];
            const enc = res.headers['content-encoding'];
            const stream = enc === 'gzip' ? res.pipe(zlib.createGunzip())
                         : enc === 'deflate' ? res.pipe(zlib.createInflate())
                         : enc === 'br' ? res.pipe(zlib.createBrotliDecompress())
                         : res;
            stream.on('data', (c) => chunks.push(c));
            stream.on('end', () => resolve(Buffer.concat(chunks).toString('utf-8')));
            stream.on('error', reject);
        });
        req.on('error', (err) => {
            if (retries > 0) {
                setTimeout(() => get(url, retries - 1).then(resolve, reject), 2000);
            } else {
                reject(err);
            }
        });
        req.setTimeout(20000, () => req.destroy(new Error(`Timeout fetching ${url}`)));
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function decode(s) {
    return String(s || '')
        .replace(/&#160;|&nbsp;/g, ' ')
        .replace(/&#178;|&#xB2;/g, '²')
        .replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/\s+/g, ' ')
        .trim();
}

const normName = (s) => decode(s).toLowerCase().replace(/[^a-z0-9]/g, '');

// ─────────────────────────────────────────────────────────────────────────────
// PRIVATE PROPERTY — discovery + scrape
// ─────────────────────────────────────────────────────────────────────────────
const PP_BASE = 'https://www.privateproperty.co.za';

// Recursively walk Gauteng → region → city → suburb pages and collect every
// `commercial-sales/...` URL. Each path looks like /commercial-sales/<seg>/<id>.
async function discoverPrivatePropertyMap() {
    const visited = new Set();
    const map = new Map(); // normName(area) → { url, depth }
    const provinceUrl = `${PP_BASE}/commercial-sales/gauteng/3`;

    async function walk(url, depth = 0) {
        if (visited.has(url) || depth > 3) return;
        visited.add(url);
        try {
            const html = await get(url);
            const links = [...new Set([...html.matchAll(/href="(\/commercial-sales\/[^"#?]+)"/g)].map((m) => m[1]))];
            for (const rel of links) {
                const segs = rel.split('/').filter(Boolean); // ['commercial-sales', 'gauteng', 'east-rand', '43']
                if (segs.length < 3 || segs[0] !== 'commercial-sales') continue;
                if (segs[1] !== 'gauteng') continue;
                if (!/^\d+$/.test(segs[segs.length - 1])) continue; // must end in numeric id
                const areaSeg = segs[segs.length - 2]; // last name segment
                const key = normName(areaSeg.replace(/-/g, ' '));
                const fullUrl = `${PP_BASE}${rel}`;
                const existing = map.get(key);
                const newDepth = segs.length - 2;
                if (!existing || existing.depth < newDepth) {
                    map.set(key, { url: fullUrl, depth: newDepth, segs });
                }
                if (newDepth >= depth + 1 && segs.length < 5) {
                    await walk(fullUrl, depth + 1);
                    await sleep(300);
                }
            }
        } catch (err) {
            console.warn(`PP discover warn ${url}: ${err.message}`);
        }
    }

    await walk(provinceUrl, 0);
    return map;
}

function parsePrivatePropertyCards(html) {
    const cards = [];
    const opens = [...html.matchAll(/<a\s+title="([^"]+)"\s+class="listing-result"\s+href="([^"]+)"/g)];
    for (let i = 0; i < opens.length; i++) {
        const open = opens[i];
        const start = open.index;
        const end = opens[i + 1]?.index || (start + 8000);
        const card = html.substring(start, end).replace(/\s+/g, ' ');

        const titleAttr = decode(open[1]); // "550 m² Industrial space"
        const url = `${PP_BASE}${open[2]}`;
        const sizeMatch = titleAttr.match(/(\d[\d,]*)\s*m²/);
        const sizeSqm = sizeMatch ? Number(sizeMatch[1].replace(/[,\s]/g, '')) : null;
        const propertyType = titleAttr.split('m²')[1]?.trim() || titleAttr;

        const priceRaw = decode((card.match(/class="[^"]*listing-result__price[^"]*"[^>]*>([^<]+)</) || [])[1] || '');
        let price = null;
        if (/POA|on application/i.test(priceRaw)) {
            price = null;
        } else {
            const m = priceRaw.replace(/[^\d]/g, '');
            if (m) price = Number(m);
        }

        const suburb = decode((card.match(/class="[^"]*listing-result__desktop-suburb[^"]*"[^>]*>([^<]+)</) || [])[1] || '');
        const address = decode((card.match(/class="[^"]*listing-result__address[^"]*"[^>]*>([^<]+)</) || [])[1] || '');
        const img = (card.match(/<img[^>]*class="listing-result__image"[^>]*src="([^"]+)"/) || [])[1]
            || (card.match(/data-src="(https:\/\/images\.pp\.co\.za[^"]+)"/) || [])[1]
            || null;
        const agent = decode((card.match(/class="[^"]*listing-result__agent-name[^"]*"[^>]*>([^<]+)</) || [])[1] || '');

        if (!url || (!price && !sizeSqm)) continue; // require at least price OR size to be useful

        cards.push({
            title: titleAttr,
            price,
            currency: 'ZAR',
            bedrooms: null,
            bathrooms: null,
            size_sqm: sizeSqm,
            size_sqft: sizeSqm ? Math.round(sizeSqm * 10.7639) : null,
            lot_size_sqm: null,
            property_type: propertyType.toLowerCase().includes('industrial') ? 'industrial'
                : propertyType.toLowerCase().includes('warehouse') ? 'warehouse'
                : propertyType.toLowerCase().includes('factory') ? 'factory'
                : propertyType.toLowerCase().includes('retail') ? 'retail'
                : propertyType.toLowerCase().includes('office') ? 'office'
                : 'commercial',
            address: address || null,
            suburb: suburb || null,
            url,
            image: img,
            agent: agent || null,
            source_portal: 'Private Property',
        });
    }
    return cards;
}

// ─────────────────────────────────────────────────────────────────────────────
// PROPERTY24 — discovery + scrape
// ─────────────────────────────────────────────────────────────────────────────
const P24_BASE = 'https://www.property24.com';

async function discoverProperty24Map() {
    const visited = new Set();
    const map = new Map();
    const seeds = [
        `${P24_BASE}/industrial-property-for-sale/gauteng/1`,
        `${P24_BASE}/industrial-property-for-sale/alias/east-rand/5/gauteng/1`,
        `${P24_BASE}/industrial-property-for-sale/alias/west-rand/4/gauteng/1`,
        `${P24_BASE}/industrial-property-for-sale/johannesburg/gauteng/9`,
        `${P24_BASE}/industrial-property-for-sale/alias/midrand/14/gauteng/1`,
        `${P24_BASE}/industrial-property-for-sale/sandton/gauteng/3`,
        `${P24_BASE}/industrial-property-for-sale/centurion/gauteng/16`,
    ];

    async function walk(url, depth = 0) {
        if (visited.has(url) || depth > 2) return;
        visited.add(url);
        try {
            const html = await get(url);
            const links = [...new Set([...html.matchAll(/href="(\/industrial-property-for-sale\/[^"#?]+)"/g)].map((m) => m[1]))];
            for (const rel of links) {
                const segs = rel.split('/').filter(Boolean);
                // Patterns:
                //   /industrial-property-for-sale/<city>/<province>/<id>
                //   /industrial-property-for-sale/<suburb>/<city>/<province>/<cityId>/<suburbId>
                //   /industrial-property-for-sale/alias/<area>/<id>/gauteng/1
                if (segs.length < 4 || segs[0] !== 'industrial-property-for-sale') continue;
                if (!segs.includes('gauteng')) continue;
                const last = segs[segs.length - 1];
                if (!/^\d+$/.test(last)) continue;
                let areaSeg;
                if (segs[1] === 'alias') {
                    areaSeg = segs[2];
                } else if (segs.length === 4) {
                    // /industrial.../<city>/<province>/<id>
                    areaSeg = segs[1];
                } else {
                    // suburb-level: /industrial.../<suburb>/<city>/<province>/<cityId>/<suburbId>
                    areaSeg = segs[1];
                }
                const key = normName(areaSeg.replace(/-/g, ' '));
                const fullUrl = `${P24_BASE}${rel}`;
                const newDepth = segs.length;
                const existing = map.get(key);
                if (!existing || existing.depth < newDepth) {
                    map.set(key, { url: fullUrl, depth: newDepth, segs });
                }
                if (segs[1] !== 'alias' && segs.length === 4 && depth < 2) {
                    await walk(fullUrl, depth + 1);
                    await sleep(300);
                }
            }
        } catch (err) {
            console.warn(`P24 discover warn ${url}: ${err.message}`);
        }
    }

    for (const s of seeds) {
        await walk(s, 0);
    }
    return map;
}

function parseProperty24Cards(html) {
    const cards = [];
    // The "p24_content" anchor variant carries the title/price/size block
    const opens = [...html.matchAll(/<a\s+href="(\/for-sale\/[^"]+\/\d{6,})"\s+class="p24_content[^"]*"\s*>/g)];
    const seen = new Set();
    for (let i = 0; i < opens.length; i++) {
        const open = opens[i];
        const url = `${P24_BASE}${open[1]}`;
        if (seen.has(url)) continue;
        seen.add(url);
        const start = open.index;
        const end = opens[i + 1]?.index || (start + 4000);
        const card = html.substring(start, end).replace(/\s+/g, ' ');

        // price
        let price = null;
        const priceContent = card.match(/<span class="p24_price"[^>]*content="(\d+)"/);
        if (priceContent) {
            price = Number(priceContent[1]);
        } else {
            const priceText = decode((card.match(/<span class="p24_price"[^>]*>([\s\S]*?)<\/span>/) || [])[1] || '');
            if (priceText && !/POA|application/i.test(priceText)) {
                const digits = priceText.replace(/[^\d]/g, '');
                if (digits) price = Number(digits);
            }
        }

        const title = decode((card.match(/<span class="p24_title[^"]*"[^>]*>([^<]+)<\/span>/) || [])[1] || 'Industrial Property');
        const suburb = decode((card.match(/<span class="p24_location[^"]*"[^>]*>([^<]+)<\/span>/) || [])[1] || '');
        const address = decode((card.match(/<span class="p24_address[^"]*"[^>]*>([^<]+)<\/span>/) || [])[1] || '');
        const sizeMatch = card.match(/<span class="p24_featureDetails p24_size"[^>]*>[\s\S]*?<span>([^<]+)<\/span>/);
        const sizeRaw = decode(sizeMatch ? sizeMatch[1] : '');
        const sizeNum = sizeRaw.match(/(\d[\d\s,]*)/);
        const sizeSqm = sizeNum ? Number(sizeNum[1].replace(/[\s,]/g, '')) : null;

        // Image: look upstream for the matching image anchor block
        const imageBlockStart = Math.max(0, start - 1500);
        const imageBlock = html.substring(imageBlockStart, start).replace(/\s+/g, ' ');
        const img = (imageBlock.match(/class="[^"]*js_P24_listingImage[^"]*"[^>]*src="([^"]+)"/) || [])[1] || null;

        if (!url || (!price && !sizeSqm)) continue;

        cards.push({
            title,
            price,
            currency: 'ZAR',
            bedrooms: null,
            bathrooms: null,
            size_sqm: sizeSqm,
            size_sqft: sizeSqm ? Math.round(sizeSqm * 10.7639) : null,
            lot_size_sqm: null,
            property_type: title.toLowerCase().includes('warehouse') ? 'warehouse'
                : title.toLowerCase().includes('factory') ? 'factory'
                : title.toLowerCase().includes('retail') ? 'retail'
                : title.toLowerCase().includes('office') ? 'office'
                : 'industrial',
            address: address || null,
            suburb: suburb || null,
            url,
            image: img,
            agent: null,
            source_portal: 'Property24',
        });
    }
    return cards;
}

// ─────────────────────────────────────────────────────────────────────────────
// Property24 detail-page enrichment — pull listing agent + agency
// (P24 hides phone numbers behind a click-to-reveal AJAX endpoint, so we only
// surface the publicly-rendered name + photo + agency. Good enough for "who's
// listing this".)
// ─────────────────────────────────────────────────────────────────────────────
function prettifySlug(slug) {
    if (!slug) return null;
    return slug
        .split('-')
        .map((w) => (w ? w[0].toUpperCase() + w.slice(1) : ''))
        .join(' ');
}

function parseP24Detail(html) {
    const out = {
        agent_name: null,
        agent_photo: null,
        agent_profile_url: null,
        agency_name: null,
        agency_slug: null,
    };

    // Anchor inside the agentDetails block: /estate-agents/<agency-slug>/<agent-slug>/<agent-id>
    const anchor = html.match(/href="(\/estate-agents\/([^/]+)\/([^/]+)\/(\d+))"\s+title="Agent profile for ([^"]+)"/);
    if (anchor) {
        out.agent_profile_url = `https://www.property24.com${anchor[1]}`;
        out.agency_slug = anchor[2];
        out.agency_name = prettifySlug(anchor[2]);
        out.agent_name = decode(anchor[5]);
    } else {
        // Fallback: agency-only header link
        const agencyAnchor = html.match(/href="\/estate-agents\/([a-z0-9-]+)\/?"/i);
        if (agencyAnchor) {
            out.agency_slug = agencyAnchor[1];
            out.agency_name = prettifySlug(agencyAnchor[1]);
        }
        const nameMatch = html.match(/class="p24_agentName"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
        if (nameMatch) out.agent_name = decode(nameMatch[1]).trim();
    }

    // Photo
    const photoMatch = html.match(/<img\s+src="(https:\/\/images\.prop24\.com\/[^"]+)"\s+alt="Agent profile for [^"]+"/);
    if (photoMatch) out.agent_photo = photoMatch[1];

    return out;
}

const P24_DETAIL_CACHE = new Map();
async function enrichP24DetailFor(card) {
    if (!card.url || !/property24\.com/.test(card.url)) return card;
    if (P24_DETAIL_CACHE.has(card.url)) {
        return { ...card, ...P24_DETAIL_CACHE.get(card.url) };
    }
    try {
        const html = await get(card.url);
        const detail = parseP24Detail(html);
        P24_DETAIL_CACHE.set(card.url, detail);
        return { ...card, ...detail };
    } catch (err) {
        // Don't fail the whole listing — just leave fields null
        P24_DETAIL_CACHE.set(card.url, {});
        return card;
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Area resolution (suburb → city → region) using the discovery map
// ─────────────────────────────────────────────────────────────────────────────
function resolveArea(map, prop) {
    const candidates = [
        prop.locationDetails?.suburb,
        prop.locationDetails?.city,
        prop.locationDetails?.region,
    ].filter(Boolean);

    // Marder area aliases (their site uses some non-standard names)
    const aliases = {
        'roodekop': 'germiston',
        'wadeville': 'germiston',
        'bredell': 'kempton park',
        'meadowdale': 'germiston',
        'anderbolt': 'boksburg',
        'cleveland': 'johannesburg',
        'spartan': 'kempton park',
        'tunney': 'germiston',
        'city deep': 'johannesburg',
        'wynberg': 'sandton',
        'selby': 'johannesburg',
        'heriotdale': 'germiston',
        'mostyn park': 'kempton park',
        'driehoek': 'germiston',
        'pomona': 'kempton park',
        'lanseria': 'midrand',
        'gosforth park': 'germiston',
        'ormonde': 'johannesburg',
        'stormill': 'roodepoort',
        'steeledale': 'johannesburg',
        'newtown': 'johannesburg',
        'camperdown': 'germiston',
    };

    const tryKey = (k) => map.get(normName(k));

    for (const c of candidates) {
        const direct = tryKey(c);
        if (direct) return { match: direct, areaUsed: c, level: 'direct' };
        // alias fallback (only for first candidate to avoid double-falling-back)
    }
    for (const c of candidates) {
        const aliasTo = aliases[String(c).toLowerCase().trim()];
        if (aliasTo) {
            const aliased = tryKey(aliasTo);
            if (aliased) return { match: aliased, areaUsed: `${c} → ${aliasTo}`, level: 'alias' };
        }
    }
    return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Listing aggregation + summary
// ─────────────────────────────────────────────────────────────────────────────
function buildSummary(listings) {
    const prices = listings.map((l) => l.price).filter((p) => Number.isFinite(p) && p > 0);
    const sizes = listings.map((l) => l.size_sqm).filter((s) => Number.isFinite(s) && s > 0);
    if (prices.length === 0) {
        return {
            avg_asking_price: null,
            min_price: null,
            max_price: null,
            avg_price_per_sqm: null,
            avg_price_per_sqft: null,
            total_listings_found: listings.length,
            property_types_available: [...new Set(listings.map((l) => l.property_type).filter(Boolean))],
            currency: 'ZAR',
        };
    }
    const avg = Math.round(prices.reduce((a, b) => a + b, 0) / prices.length);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const ppsMatched = listings
        .filter((l) => l.price && l.size_sqm)
        .map((l) => l.price / l.size_sqm)
        .filter((v) => Number.isFinite(v) && v > 0);
    const avgPps = ppsMatched.length ? Math.round(ppsMatched.reduce((a, b) => a + b, 0) / ppsMatched.length) : null;
    return {
        avg_asking_price: avg,
        min_price: min,
        max_price: max,
        avg_price_per_sqm: avgPps,
        avg_price_per_sqft: avgPps ? Math.round(avgPps / 10.7639) : null,
        total_listings_found: listings.length,
        property_types_available: [...new Set(listings.map((l) => l.property_type).filter(Boolean))],
        currency: 'ZAR',
    };
}

function rankBySuburb(cards, sourceSuburb) {
    if (!sourceSuburb) return cards;
    const target = normName(sourceSuburb);
    return [...cards].sort((a, b) => {
        const ax = normName(a.suburb || a.address || '').includes(target) ? 0 : 1;
        const bx = normName(b.suburb || b.address || '').includes(target) ? 0 : 1;
        return ax - bx;
    });
}

// Strip the source listing if it accidentally matched
function dropSelfMatch(cards, prop) {
    const propTitle = normName(prop.title || '');
    return cards.filter((c) => {
        if (!c.title) return true;
        const ct = normName(c.title);
        return !(propTitle && propTitle.length > 6 && ct === propTitle);
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
async function main() {
    const { limit, force, dry } = parseArgs();

    console.log(`MARDER comp scraper — direct portal mode (no Cloud Run / Tavily)`);
    console.log(`Connecting to MongoDB…`);
    await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 45000,
        socketTimeoutMS: 60000,
        bufferCommands: false,
    });
    console.log('✅ Connected.');

    try {
        // 1. Pull Marder properties
        const query = { importSource: 'marder-demo' };
        let props = await Property.find(query).select('_id title location locationDetails listingMetadata');
        if (limit) props = props.slice(0, limit);
        console.log(`Found ${props.length} Marder properties.${dry ? ' [DRY-RUN]' : ''}`);

        // 2. Build portal URL maps
        console.log('\nDiscovering Private Property URL map…');
        const ppMap = await discoverPrivatePropertyMap();
        console.log(`  → ${ppMap.size} PP areas mapped`);
        console.log('Discovering Property24 URL map…');
        const p24Map = await discoverProperty24Map();
        console.log(`  → ${p24Map.size} P24 areas mapped`);

        // 3. Per-property scrape (with caching)
        const ppCache = new Map(); // url → cards
        const p24Cache = new Map();

        let ok = 0, fail = 0, skipped = 0;
        for (let i = 0; i < props.length; i++) {
            const p = props[i];
            const tag = `[${i + 1}/${props.length}]`;
            const existing = p.listingMetadata?.area_housing?.listings;
            if (!force && Array.isArray(existing) && existing.length > 0) {
                console.log(`${tag} skip (already has ${existing.length} comps): ${p.title.slice(0, 60)}`);
                skipped++;
                continue;
            }
            const sourceSuburb = p.locationDetails?.suburb || '';
            const sourceCity = p.locationDetails?.city || '';

            const ppArea = resolveArea(ppMap, p);
            const p24Area = resolveArea(p24Map, p);
            console.log(`\n${tag} "${p.title.slice(0, 70)}"`);
            console.log(`         suburb=${sourceSuburb || '?'}  city=${sourceCity || '?'}`);
            console.log(`         PP=${ppArea ? ppArea.areaUsed : 'NO MATCH'}  P24=${p24Area ? p24Area.areaUsed : 'NO MATCH'}`);

            // Scrape Private Property
            let ppCards = [];
            if (ppArea) {
                if (!ppCache.has(ppArea.match.url)) {
                    try {
                        const html = await get(ppArea.match.url);
                        ppCache.set(ppArea.match.url, parsePrivatePropertyCards(html));
                        await sleep(POLITE_DELAY_MS);
                    } catch (err) {
                        console.warn(`         PP scrape FAIL: ${err.message}`);
                        ppCache.set(ppArea.match.url, []);
                    }
                }
                ppCards = ppCache.get(ppArea.match.url);
                // Industrial-only filter for PP (it returns all commercial categories)
                ppCards = ppCards.filter((c) => /industrial|warehouse|factory/i.test(c.property_type || c.title || ''));
            }

            // Scrape Property24
            let p24Cards = [];
            if (p24Area) {
                if (!p24Cache.has(p24Area.match.url)) {
                    try {
                        const html = await get(p24Area.match.url);
                        p24Cache.set(p24Area.match.url, parseProperty24Cards(html));
                        await sleep(POLITE_DELAY_MS);
                    } catch (err) {
                        console.warn(`         P24 scrape FAIL: ${err.message}`);
                        p24Cache.set(p24Area.match.url, []);
                    }
                }
                p24Cards = p24Cache.get(p24Area.match.url);
            }

            // Combine, dedupe, rank, cap
            let combined = [
                ...rankBySuburb(p24Cards, sourceSuburb).slice(0, CARD_LIMIT_PER_PORTAL),
                ...rankBySuburb(ppCards, sourceSuburb).slice(0, CARD_LIMIT_PER_PORTAL),
            ];
            combined = dropSelfMatch(combined, p);
            // dedupe by URL
            const dedup = new Map();
            for (const c of combined) if (!dedup.has(c.url)) dedup.set(c.url, c);
            combined = [...dedup.values()].slice(0, FINAL_LISTING_LIMIT);

            console.log(`         scraped: PP=${ppCards.length}  P24=${p24Cards.length}  → ${combined.length} comps`);

            if (combined.length === 0) {
                console.log(`         ⚠️  no comps to write, skipping`);
                fail++;
                continue;
            }

            // Enrich Property24 comps with agent + agency from each detail page.
            // (PP comps already have an agent name from the search card.)
            const p24ToEnrich = combined.filter((c) => c.source_portal === 'Property24' && c.url);
            if (p24ToEnrich.length) {
                process.stdout.write(`         enriching ${p24ToEnrich.length} P24 detail pages`);
                let enrichedOk = 0;
                for (let j = 0; j < combined.length; j++) {
                    const c = combined[j];
                    if (c.source_portal !== 'Property24' || !c.url) continue;
                    combined[j] = await enrichP24DetailFor(c);
                    if (combined[j].agent_name || combined[j].agency_name) enrichedOk++;
                    process.stdout.write('.');
                    await sleep(POLITE_DELAY_MS);
                }
                process.stdout.write(`  ${enrichedOk}/${p24ToEnrich.length} ok\n`);
            }

            const summary = buildSummary(combined);
            const sourcePortal = ppArea
                ? { name: 'Private Property + Property24', url: ppArea.match.url }
                : { name: 'Property24', url: p24Area?.match.url };

            const newAreaHousing = {
                summary,
                listings: combined.map((c) => ({
                    title: c.title,
                    price: c.price,
                    currency: c.currency,
                    bedrooms: c.bedrooms,
                    bathrooms: c.bathrooms,
                    size_sqm: c.size_sqm,
                    size_sqft: c.size_sqft,
                    lot_size_sqm: c.lot_size_sqm,
                    property_type: c.property_type,
                    address: c.address,
                    suburb: c.suburb,
                    url: c.url,
                    image: c.image,
                    source_portal: c.source_portal,
                    agent_name: c.agent_name || c.agent || null,
                    agent_photo: c.agent_photo || null,
                    agent_profile_url: c.agent_profile_url || null,
                    agency_name: c.agency_name || null,
                    agency_slug: c.agency_slug || null,
                })),
                source: sourcePortal.name,
                source_url: sourcePortal.url,
                generated_at: new Date().toISOString(),
                generated_by: 'marder-direct-scraper-v2-agent-enriched',
            };

            if (dry) {
                console.log(`         DRY — would write ${combined.length} listings, summary: avg=R${summary.avg_asking_price?.toLocaleString()}, min=R${summary.min_price?.toLocaleString()}, max=R${summary.max_price?.toLocaleString()}, avg/m²=R${summary.avg_price_per_sqm?.toLocaleString()}`);
                ok++;
                continue;
            }

            // Merge — preserve any existing listingMetadata (e.g. amenities, valuation)
            const prev = p.listingMetadata && typeof p.listingMetadata.toObject === 'function'
                ? p.listingMetadata.toObject()
                : (p.listingMetadata || {});
            const merged = { ...prev, area_housing: newAreaHousing };
            await Property.updateOne({ _id: p._id }, { $set: { listingMetadata: merged } });
            console.log(`         ✅ saved — avg=R${summary.avg_asking_price?.toLocaleString()}, R${summary.avg_price_per_sqm?.toLocaleString()}/m²`);
            ok++;
        }

        console.log(`\n✅ Done. ${ok} enriched, ${fail} failed, ${skipped} skipped (already had comps).`);
        if (skipped > 0 && !force) {
            console.log(`   Re-run with --force to refresh skipped listings.`);
        }
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });

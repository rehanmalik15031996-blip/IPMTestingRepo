/**
 * Scrape ~20 random industrial-for-sale listings from marder.co.za and load
 * them into IPM as Property documents under the Marder demo agency, attributed
 * to the actual Marder agent who listed them.
 *
 * Usage:
 *   MONGO_URI='...' node scripts/import-marder-listings.js [--count=20] [--purge]
 *
 *   --count=N : number of random listings to import (default 20)
 *   --purge   : delete any existing Marder demo properties first
 *
 * Re-runnable: any pre-existing property with the same listingRef is updated
 * in place rather than duplicated.
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const zlib = require('zlib');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const User = require('../server/models/User');
const Property = require('../server/models/Property');

const MONGO_URI = process.env.MONGO_URI ||
    'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';
const BASE = 'https://www.marder.co.za';
const LISTINGS_PATH = '/results/industrial/for-sale/';
const PAGES_TO_CRAWL = 4; // 16/page × 4 = 64 candidates

// ─────────────────────────────────────────────────────────────────────────────
// Args
// ─────────────────────────────────────────────────────────────────────────────
function parseArgs() {
    const args = process.argv.slice(2);
    let count = 20;
    let purge = false;
    for (const a of args) {
        if (a.startsWith('--count=')) count = Number(a.slice(8)) || 20;
        if (a === '--purge') purge = true;
    }
    return { count, purge };
}

// ─────────────────────────────────────────────────────────────────────────────
// HTTP
// ─────────────────────────────────────────────────────────────────────────────
function get(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': UA,
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': 'text/html,application/xhtml+xml',
            },
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return get(res.headers.location).then(resolve, reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
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
        req.on('error', reject);
        req.setTimeout(20000, () => req.destroy(new Error(`Timeout fetching ${url}`)));
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// Parsing
// ─────────────────────────────────────────────────────────────────────────────
function collectDetailUrlsFromIndex(html) {
    const re = /href="(\/results\/industrial\/for-sale\/[^"]+)"/g;
    const urls = new Set();
    let m;
    while ((m = re.exec(html)) !== null) {
        const href = m[1];
        // Filter to leaf pages (must have a numeric listing id segment).
        if (/\/\d{5,}\//.test(href)) urls.add(BASE + href);
    }
    return Array.from(urls);
}

const TITLE_CASE = (s) => s.replace(/\b\w/g, (c) => c.toUpperCase());

function unslug(s) {
    return TITLE_CASE(String(s || '').replace(/-/g, ' ').trim());
}

function parseListingDetail(url, html) {
    // URL parts: /results/industrial/for-sale/<city>/<suburb>/<type>/<id>/<street?>/
    const pathOnly = url.replace(BASE, '').replace(/\/+$/, '');
    const parts = pathOnly.split('/').filter(Boolean);
    // ['results','industrial','for-sale','germiston','roodekop','factory','554156', ...?]
    const city = unslug(parts[3] || '');
    const suburb = unslug(parts[4] || '');
    const propType = unslug(parts[5] || 'Industrial');
    const listingId = parts[6] || '';
    const streetSlug = parts[7] || '';
    const streetAddress = streetSlug ? unslug(streetSlug) : null;

    // Title: prefer og:title (cleaner) then first <h1>
    let title = null;
    const ogTitle = html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/);
    if (ogTitle) title = ogTitle[1].replace(/\s*\|\s*Marder Properties\s*$/i, '').trim();
    if (!title) {
        const h1 = html.match(/<h1[^>]*>([\s\S]+?)<\/h1>/);
        if (h1) title = h1[1].replace(/<[^>]+>/g, '').trim();
    }
    title = title || `${propType} For Sale in ${suburb}`;

    // Description: og:description (concise)
    const ogDesc = html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/);
    const baseDesc = ogDesc ? ogDesc[1].trim() : '';

    // Price: pick the first R-prefixed value that looks like a property price
    // (≥ 6 digits, not a small number like fees), skip "POA"
    let priceText = null;
    let priceNumber = null;
    const isPOA = /\bPOA\b|\bPrice on Application\b/i.test(html);
    if (isPOA) {
        priceText = 'POA';
    } else {
        const priceMatches = Array.from(html.matchAll(/R[\s\xa0]*([\d ,]{4,})(?:\.\d+)?/g));
        for (const m of priceMatches) {
            const digits = m[1].replace(/[ ,]/g, '');
            const n = Number(digits);
            if (Number.isFinite(n) && n >= 100000) {
                priceNumber = n;
                priceText = `R${n.toLocaleString('en-ZA')}`;
                break;
            }
        }
    }

    // Size in m²
    let sizeM2 = null;
    const sizeMatch = html.match(/(\d{1,3}(?:[, ]\d{3})*)\s*m²/);
    if (sizeMatch) sizeM2 = Number(sizeMatch[1].replace(/[, ]/g, '')) || null;
    let landSizeHa = null;
    const haMatch = html.match(/(\d+(?:\.\d+)?)\s*Ha\b/i);
    if (haMatch) landSizeHa = Number(haMatch[1]) || null;

    // Photos: cloudfront /commercial/ or /residential/ (some industrial listings
    // use residential CDN folder). Dedupe by hash, prefer 1024x720 variant.
    const allImgs = Array.from(new Set(
        (html.match(/https:\/\/[^"'<> ]*cloudfront\.net\/media\/uploads\/470\/(?:commercial|residential|industrial|undefined)\/[^"'<> ]*\.(?:avif|jpg|jpeg|png|webp)/gi) || [])
    ));
    const byHash = new Map();
    for (const u of allImgs) {
        const h = (u.match(/470_([0-9a-f]{16,})/) || [])[1];
        if (!h) continue;
        if (!byHash.has(h)) byHash.set(h, []);
        byHash.get(h).push(u);
    }
    const photos = [];
    for (const [, variants] of byHash) {
        const pick = variants.find((u) => /_t_w_1024_h_720/.test(u))
                  || variants.find((u) => /_t_w_1440_h_900/.test(u))
                  || variants.find((u) => /_t_/.test(u))
                  || variants[0];
        if (pick) photos.push(pick);
    }

    // Agent attribution: scan for img alt="<Name>" near agent thumbnails
    const KNOWN_AGENTS = [
        'Alex Vangelatos','Cameron Cock','Chris Georgiades','Dillen Van Den Heever',
        'Fabio De Castro','Graham Marder','Greig Harty','Kirsten Chalice',
        'Kyle Cock','Mila Kapp','Motshwane Mabogoane','Nancy Ramovha',
        'Theo Papadimitriou'
    ];
    const agents = [];
    for (const name of KNOWN_AGENTS) {
        if (html.includes(`alt="${name}"`)) agents.push(name);
        else if (html.includes(name)) agents.push(name);
    }
    const primaryAgent = agents[0] || null;

    // Tags / flags from URL or page
    const isFeatured = /Featured/i.test(html.slice(0, 2000)) || /class="[^"]*featured/i.test(html);
    const priceReduced = /\bReduced\b/.test(html);

    // Build description: combine title + key facts
    const sizeStr = sizeM2 ? `${sizeM2.toLocaleString('en-ZA')}m²` : (landSizeHa ? `${landSizeHa}Ha` : '');
    const description = [
        baseDesc || title,
        '',
        `${propType} for sale in ${suburb}, ${city}, Gauteng.`,
        sizeStr ? `Size: ${sizeStr}.` : '',
        priceText ? `Asking: ${priceText}.` : '',
        streetAddress ? `Address: ${streetAddress}.` : '',
        '',
        'Marketed by Marder Properties — specialists in commercial, industrial and investment property since 1994.',
    ].filter(Boolean).join('\n');

    return {
        url, listingId, propType, city, suburb, streetAddress,
        title, description, priceText, priceNumber,
        sizeM2, landSizeHa, photos, primaryAgent,
        isFeatured, priceReduced,
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Insertion
// ─────────────────────────────────────────────────────────────────────────────
function emailFor(name) {
    return name.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.').replace(/[^a-z.]/g, '') + '@marder-demo.com';
}

function buildPropertyDoc({ parsed, agentMap, agency, agencyDefaultAgentId }) {
    const agentEmail = parsed.primaryAgent ? emailFor(parsed.primaryAgent) : null;
    const mapped = agentEmail && agentMap.get(agentEmail);
    const agentId = mapped || agencyDefaultAgentId;

    const cover = parsed.photos[0] || null;
    const gallery = parsed.photos.slice(1, 30); // cap at 30 to be safe

    // Industrial-specific: Marder lists "Covered" / "Open" yard. We can't reliably
    // tell from the index, so leave structural specs blank for now.
    const doc = {
        title: parsed.title.slice(0, 250),
        location: `${parsed.suburb}, ${parsed.city}, South Africa`,
        price: parsed.priceText || 'POA',
        description: parsed.description,
        imageUrl: cover,
        agentId,
        importSource: 'marder-demo',
        importListingRef: parsed.listingId,
        importAgencyId: agency._id,
        externalIds: { marderListingUrl: parsed.url, marderListingId: parsed.listingId },
        status: 'Published',
        websiteStatus: parsed.isFeatured ? 'Featured' : 'Published',
        isFeatured: !!parsed.isFeatured,
        priceReduced: !!parsed.priceReduced,
        listingType: 'Industrial',
        propertyCategory: 'Industrial',
        type: parsed.propType,
        locationDetails: {
            country: 'South Africa',
            region: 'Gauteng',
            city: parsed.city,
            suburb: parsed.suburb,
            streetAddress: parsed.streetAddress || undefined,
        },
        pricing: {
            currency: 'ZAR',
            askingPrice: parsed.priceNumber || undefined,
            priceBasis: parsed.priceText === 'POA' ? 'POA' : 'Asking',
        },
        availability: { status: 'Available' },
        propertySize: {
            unitSystem: 'sqm',
            size: parsed.sizeM2 || undefined,
            landSize: parsed.landSizeHa ? Math.round(parsed.landSizeHa * 10000) : undefined,
        },
        media: {
            coverImage: cover || undefined,
            imageGallery: gallery,
        },
        ownership: { mandate: 'Sole Mandate', listingVisibility: 'Public' },
        declarations: {
            agentDeclaration: true,
            informationAccurate: true,
            noMaterialFactsOmitted: true,
        },
    };
    return doc;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

async function main() {
    const { count, purge } = parseArgs();

    console.log('Connecting to MongoDB…');
    await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 45000,
        socketTimeoutMS: 60000,
        bufferCommands: false,
    });
    console.log('✅ Connected.');

    try {
        const agency = await User.findOne({ email: 'marder_agency@demo.com' });
        if (!agency) throw new Error('Marder agency not found — run create-marder-agency.js first.');

        const allMarderAgents = await User.find({
            migrationSource: 'marder-demo',
            role: 'agency_agent',
        }).select('_id name email');
        const agentMap = new Map(allMarderAgents.map((a) => [a.email, a._id]));
        const grahamId = agentMap.get('graham.marder@marder-demo.com') || allMarderAgents[0]?._id || agency._id;
        console.log(`Found ${allMarderAgents.length} Marder agents in DB.`);

        if (purge) {
            const r = await Property.deleteMany({ importSource: 'marder-demo' });
            console.log(`🗑  Purged ${r.deletedCount} existing marder-demo properties.`);
        }

        // Step 1: collect detail URLs from index pages
        console.log(`Crawling ${PAGES_TO_CRAWL} pages of ${LISTINGS_PATH}…`);
        const allUrls = new Set();
        for (let p = 1; p <= PAGES_TO_CRAWL; p++) {
            const pageUrl = p === 1 ? `${BASE}${LISTINGS_PATH}` : `${BASE}${LISTINGS_PATH}?page=${p}`;
            try {
                const html = await get(pageUrl);
                const urls = collectDetailUrlsFromIndex(html);
                console.log(`  page ${p}: +${urls.length} URLs`);
                for (const u of urls) allUrls.add(u);
            } catch (e) {
                console.warn(`  page ${p}: FAIL (${e.message})`);
            }
        }
        const pool = Array.from(allUrls);
        console.log(`Total unique candidate listings: ${pool.length}`);
        if (pool.length === 0) throw new Error('No listings found — site structure may have changed.');

        // Step 2: pick `count` random URLs
        const picked = shuffle(pool).slice(0, count);
        console.log(`Picked ${picked.length} random listings.\n`);

        // Step 3: fetch + parse + insert
        const cacheDir = path.join(__dirname, 'assets', 'marder-listings-html');
        fs.mkdirSync(cacheDir, { recursive: true });

        let inserted = 0, updated = 0, failed = 0;
        for (let i = 0; i < picked.length; i++) {
            const url = picked[i];
            try {
                process.stdout.write(`[${i + 1}/${picked.length}] ${url.replace(BASE, '')} … `);
                const html = await get(url);
                fs.writeFileSync(path.join(cacheDir, url.split('/').filter(Boolean).slice(-2, -1)[0] + '.html'), html);

                const parsed = parseListingDetail(url, html);
                const doc = buildPropertyDoc({
                    parsed,
                    agentMap,
                    agency,
                    agencyDefaultAgentId: grahamId,
                });

                const existing = await Property.findOne({
                    importSource: 'marder-demo',
                    importListingRef: parsed.listingId,
                });
                if (existing) {
                    Object.assign(existing, doc);
                    await existing.save();
                    updated++;
                    console.log(`UPDATED [${parsed.primaryAgent || '?'}] ${parsed.priceText} ${parsed.sizeM2 || '-'}m² (${parsed.photos.length} photos)`);
                } else {
                    await new Property(doc).save();
                    inserted++;
                    console.log(`NEW [${parsed.primaryAgent || '?'}] ${parsed.priceText} ${parsed.sizeM2 || '-'}m² (${parsed.photos.length} photos)`);
                }
                // be polite
                await new Promise((r) => setTimeout(r, 250));
            } catch (e) {
                failed++;
                console.log(`FAIL: ${e.message}`);
            }
        }

        // Step 4: tally listings count on agency
        const total = await Property.countDocuments({ importSource: 'marder-demo' });
        agency.agencyStats = agency.agencyStats || {};
        agency.agencyStats.totalListings = total;
        agency.markModified('agencyStats');
        await agency.save();

        console.log(`\n✅ Done. Inserted ${inserted}, updated ${updated}, failed ${failed}.`);
        console.log(`Marder agency now shows ${total} total listings.`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((e) => { console.error('❌ Fatal:', e); process.exit(1); });

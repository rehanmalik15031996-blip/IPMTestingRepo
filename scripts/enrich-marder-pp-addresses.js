/**
 * Backfill street address (and GPS coords) on every Private Property comp
 * for Marder demo properties, by parsing the JSON-LD Residence block on each
 * detail page.
 *
 * PP doesn't expose agent/agency info in static HTML (loaded via JS), but it
 * DOES include a clean schema.org Residence block with streetAddress + geo.
 *
 * Usage:  node scripts/enrich-marder-pp-addresses.js [--limit=N] [--dry]
 */

const path = require('path');
const https = require('https');
const zlib = require('zlib');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Property = require('../server/models/Property');

const MONGO_URI = process.env.MONGO_URI;
if (!MONGO_URI) { console.error('MONGO_URI missing'); process.exit(1); }

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Safari/605.1.15';
const HEADERS = {
    'User-Agent': UA,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
};

const POLITE_MS = 1500;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url, retries = 3) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: HEADERS }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const next = res.headers.location.startsWith('http') ? res.headers.location : new URL(res.headers.location, url).toString();
                return get(next, retries).then(resolve, reject);
            }
            if ((res.statusCode === 429 || res.statusCode === 503) && retries > 0) {
                const wait = 5000 * (4 - retries);
                return setTimeout(() => get(url, retries - 1).then(resolve, reject), wait);
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
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
        req.setTimeout(20000, () => req.destroy(new Error('timeout')));
    });
}

function parsePpDetail(html) {
    const out = { address: null, suburb: null, region: null, lat: null, lng: null };
    const blocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
    for (const m of blocks) {
        try {
            const obj = JSON.parse(m[1]);
            if (obj['@type'] === 'Residence' || obj['@type'] === 'RealEstateListing' || obj['@type'] === 'Place') {
                if (obj.address) {
                    out.address = obj.address.streetAddress || null;
                    const loc = obj.address.addressLocality || '';
                    // "Kya Sands, Randburg" → suburb=Kya Sands, region=Randburg
                    const [s, r] = loc.split(',').map((x) => x.trim());
                    if (s) out.suburb = s;
                    if (r) out.region = r;
                }
                if (obj.geo) {
                    const lat = Number(obj.geo.latitude);
                    const lng = Number(obj.geo.longitude);
                    if (Number.isFinite(lat)) out.lat = lat;
                    if (Number.isFinite(lng)) out.lng = lng;
                }
                break;
            }
        } catch (_) { /* ignore */ }
    }
    return out;
}

function parseArgs() {
    const a = process.argv.slice(2);
    const out = { limit: null, dry: false };
    for (const x of a) {
        if (x.startsWith('--limit=')) out.limit = Number(x.slice(8)) || null;
        if (x === '--dry' || x === '--dry-run') out.dry = true;
    }
    return out;
}

(async () => {
    const { limit, dry } = parseArgs();
    console.log(`PP address enrichment (delay=${POLITE_MS}ms${dry ? ', DRY' : ''})…`);
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 45000, bufferCommands: false });
    console.log('✅ Mongo connected.');

    try {
        const props = await Property.find({ importSource: 'marder-demo' }).select('title listingMetadata');
        const tasks = [];
        for (const p of props) {
            const ls = p.listingMetadata?.area_housing?.listings || [];
            for (let i = 0; i < ls.length; i++) {
                const l = ls[i];
                if (l?.source_portal === 'Private Property' && l?.url && !l.address) {
                    tasks.push({ propId: p._id, idx: i, url: l.url, title: l.title });
                }
            }
        }
        console.log(`PP comps needing address: ${tasks.length}`);
        const work = limit ? tasks.slice(0, limit) : tasks;

        const cache = new Map();
        let okCount = 0, blankCount = 0, failCount = 0;

        for (let i = 0; i < work.length; i++) {
            const t = work[i];
            const tag = `[${i + 1}/${work.length}]`;
            try {
                let detail = cache.get(t.url);
                if (!detail) {
                    const html = await get(t.url);
                    detail = parsePpDetail(html);
                    cache.set(t.url, detail);
                }
                const have = detail.address || detail.suburb;
                console.log(`${tag} ${have ? '✓' : '∅'}  ${detail.address || '(no addr)'}  ${detail.lat ? `[${detail.lat.toFixed(3)},${detail.lng.toFixed(3)}]` : ''}`);

                if (!dry && have) {
                    const $set = {};
                    if (detail.address) $set[`listingMetadata.area_housing.listings.${t.idx}.address`] = detail.address;
                    if (detail.suburb) $set[`listingMetadata.area_housing.listings.${t.idx}.suburb`] = detail.suburb;
                    if (detail.lat != null) $set[`listingMetadata.area_housing.listings.${t.idx}.lat`] = detail.lat;
                    if (detail.lng != null) $set[`listingMetadata.area_housing.listings.${t.idx}.lng`] = detail.lng;
                    if (Object.keys($set).length) {
                        await Property.updateOne({ _id: t.propId }, { $set });
                    }
                }
                if (have) okCount++; else blankCount++;
            } catch (err) {
                console.warn(`${tag} ✗  ${err.message}  (${t.url.slice(-60)})`);
                failCount++;
            }
            await sleep(POLITE_MS + Math.floor(Math.random() * 400));
        }

        console.log(`\nDone. ${okCount} enriched, ${blankCount} blank, ${failCount} failed.`);
    } finally {
        await mongoose.disconnect();
    }
})().catch((e) => { console.error('Fatal:', e); process.exit(1); });

/**
 * Idempotent P24 detail-page enrichment for already-saved Marder comps.
 *
 *  - Iterates every Marder property's `listingMetadata.area_housing.listings`
 *  - For every listing whose source_portal === 'Property24' and which still
 *    has no agent_name, fetches the detail page and extracts agent + agency.
 *  - Persists in place. Re-runnable. Caches per URL.
 *  - Designed to be polite enough to avoid P24's 503 throttle: 2.5s between
 *    requests, exponential backoff on 503/429.
 *
 * Usage:
 *   node scripts/enrich-marder-p24-agents.js [--limit=N] [--dry]
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

const POLITE_MS = 2500; // 1 req every 2.5s — tested to avoid P24 throttle
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function get(url, retries = 5) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, { headers: HEADERS }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                const next = res.headers.location.startsWith('http')
                    ? res.headers.location
                    : new URL(res.headers.location, url).toString();
                return get(next, retries).then(resolve, reject);
            }
            if ((res.statusCode === 429 || res.statusCode === 503 || res.statusCode === 502) && retries > 0) {
                const attempt = 6 - retries;
                const wait = Math.min(120000, 8000 * Math.pow(2, attempt)) + Math.floor(Math.random() * 2000);
                console.warn(`   ${res.statusCode} on ${url.slice(-50)}, backing off ${Math.round(wait / 1000)}s…`);
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
        req.setTimeout(25000, () => req.destroy(new Error('timeout')));
    });
}

function decode(s) {
    if (!s) return s;
    return s.replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/&#39;/g, "'")
        .replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&nbsp;/g, ' ').replace(/&[a-z0-9#]+;/gi, ' ');
}

function prettifySlug(slug) {
    if (!slug) return null;
    return slug.split('-').map((w) => (w ? w[0].toUpperCase() + w.slice(1) : '')).join(' ');
}

function parseP24Detail(html) {
    const out = { agent_name: null, agent_photo: null, agent_profile_url: null, agency_name: null, agency_slug: null };
    const anchor = html.match(/href="(\/estate-agents\/([^/]+)\/([^/]+)\/(\d+))"\s+title="Agent profile for ([^"]+)"/);
    if (anchor) {
        out.agent_profile_url = `https://www.property24.com${anchor[1]}`;
        out.agency_slug = anchor[2];
        out.agency_name = prettifySlug(anchor[2]);
        out.agent_name = decode(anchor[5]);
    } else {
        const agencyAnchor = html.match(/href="\/estate-agents\/([a-z0-9-]+)\/?"/i);
        if (agencyAnchor) { out.agency_slug = agencyAnchor[1]; out.agency_name = prettifySlug(agencyAnchor[1]); }
        const nameMatch = html.match(/class="p24_agentName"[^>]*>\s*<a[^>]*>([^<]+)<\/a>/);
        if (nameMatch) out.agent_name = decode(nameMatch[1]).trim();
    }
    const photoMatch = html.match(/<img\s+src="(https:\/\/images\.prop24\.com\/[^"]+)"\s+alt="Agent profile for [^"]+"/);
    if (photoMatch) out.agent_photo = photoMatch[1];
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
    console.log(`P24 agent enrichment (delay=${POLITE_MS}ms)…`);
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 45000, bufferCommands: false });
    console.log('✅ Mongo connected.');

    try {
        const props = await Property.find({ importSource: 'marder-demo' })
            .select('title listingMetadata');
        console.log(`Properties: ${props.length}`);

        // Collect every (propId, listingIdx) that needs enrichment
        const tasks = [];
        for (const p of props) {
            const ah = p.listingMetadata?.area_housing;
            const ls = ah?.listings || [];
            for (let i = 0; i < ls.length; i++) {
                const l = ls[i];
                if (l?.source_portal === 'Property24' && l?.url && !l.agent_name && !l.agency_name) {
                    tasks.push({ propId: p._id, idx: i, url: l.url, title: l.title });
                }
            }
        }
        console.log(`P24 comps needing enrichment: ${tasks.length}${dry ? ' [DRY]' : ''}`);
        const work = limit ? tasks.slice(0, limit) : tasks;

        const cache = new Map(); // url → detail
        let okCount = 0, failCount = 0;

        for (let i = 0; i < work.length; i++) {
            const t = work[i];
            const tag = `[${i + 1}/${work.length}]`;
            try {
                let detail = cache.get(t.url);
                if (!detail) {
                    const html = await get(t.url);
                    detail = parseP24Detail(html);
                    cache.set(t.url, detail);
                }
                const haveAny = detail.agent_name || detail.agency_name;
                console.log(`${tag} ${haveAny ? '✓' : '∅'}  ${detail.agent_name || ''} @ ${detail.agency_name || '—'}  (${t.url.slice(-50)})`);

                if (!dry && haveAny) {
                    // In-place update with $set on the array index
                    await Property.updateOne(
                        { _id: t.propId },
                        {
                            $set: {
                                [`listingMetadata.area_housing.listings.${t.idx}.agent_name`]: detail.agent_name,
                                [`listingMetadata.area_housing.listings.${t.idx}.agent_photo`]: detail.agent_photo,
                                [`listingMetadata.area_housing.listings.${t.idx}.agent_profile_url`]: detail.agent_profile_url,
                                [`listingMetadata.area_housing.listings.${t.idx}.agency_name`]: detail.agency_name,
                                [`listingMetadata.area_housing.listings.${t.idx}.agency_slug`]: detail.agency_slug,
                            },
                        }
                    );
                }
                if (haveAny) okCount++; else failCount++;
            } catch (err) {
                console.warn(`${tag} ✗  ${err.message}  (${t.url.slice(-50)})`);
                failCount++;
            }
            // polite delay between requests
            await sleep(POLITE_MS + Math.floor(Math.random() * 600));
        }

        console.log(`\nDone. ${okCount} enriched, ${failCount} blank/failed.`);
    } finally {
        await mongoose.disconnect();
    }
})().catch((e) => { console.error('Fatal:', e); process.exit(1); });

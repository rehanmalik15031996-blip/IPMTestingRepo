/**
 * Backfill listingMetadata on every Marder demo property by calling the
 * IPM property-intelligence service (Cloud Run). Pulls comparable listings
 * from Property24 / Private Property in the same area, geocoded amenities,
 * pricing comps, etc.
 *
 * Usage:
 *   MONGO_URI='...' node scripts/backfill-marder-metadata.js [--limit=N] [--force] [--dry]
 *
 *   --limit=N : only process N properties (useful for testing)
 *   --force   : re-fetch even if listingMetadata is already set
 *   --dry     : log what would happen, don't write to DB
 *
 * Env: METADATA_SERVICE_URL overrides the default Cloud Run URL.
 *      Default: https://get-listing-metadata-541421913321.europe-west4.run.app
 *
 * Re-runnable. Per-listing failures don't abort the script.
 */

const path = require('path');
const crypto = require('crypto');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Property = require('../server/models/Property');

const MONGO_URI = process.env.MONGO_URI ||
    'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';

const METADATA_SERVICE_URL = process.env.METADATA_SERVICE_URL ||
    'https://get-listing-metadata-541421913321.europe-west4.run.app';

const REQUEST_TIMEOUT_MS = 90_000; // metadata service can take 30-60s
const POLITE_DELAY_MS = 1500;

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

function buildAddressString(prop) {
    const ld = prop.locationDetails || {};
    const parts = [
        ld.streetAddress,
        ld.suburb,
        ld.city,
        ld.region,
        ld.country,
    ].filter(Boolean);
    if (parts.length) return parts.join(', ');
    // Fallback to free-form `location` field
    return prop.location || '';
}

// IPM property categories → metadata-service category bucket
function categoryFor(prop) {
    const c = String(prop.propertyCategory || prop.listingType || '').toLowerCase();
    if (c === 'industrial') return 'industrial';
    if (c === 'commercial') return 'commercial';
    if (c === 'retail') return 'retail';
    if (c === 'office') return 'office';
    if (c === 'land' || c === 'agricultural') return 'land';
    return 'residential';
}

async function callMetadataService({ address, country, category }) {
    const requestId = crypto.randomUUID();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
        const res = await fetch(METADATA_SERVICE_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, requestId, country, category }),
            signal: controller.signal,
        });
        if (!res.ok) {
            const text = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
        }
        return await res.json();
    } finally {
        clearTimeout(timer);
    }
}

function summarize(meta) {
    if (!meta || typeof meta !== 'object') return 'no metadata';
    const ah = meta.area_housing || {};
    const listings = Array.isArray(ah.listings) ? ah.listings.length : 0;
    const amenities = Array.isArray(meta.amenities?.nearby) ? meta.amenities.nearby.length : 0;
    const valuation = meta.valuation?.estimated_value || meta.web_valuation?.estimated_value;
    return `${listings} comps, ${amenities} POIs${valuation ? `, est. ${valuation.toLocaleString()}` : ''}`;
}

async function main() {
    const { limit, force, dry } = parseArgs();

    console.log(`Service URL: ${METADATA_SERVICE_URL}`);
    console.log('Connecting to MongoDB…');
    await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 45000,
        socketTimeoutMS: 60000,
        bufferCommands: false,
    });
    console.log('✅ Connected.');

    try {
        const query = { importSource: 'marder-demo' };
        if (!force) query.listingMetadata = { $in: [null, undefined] };
        let props = await Property.find(query).select('_id title location locationDetails listingType propertyCategory listingMetadata');
        if (limit) props = props.slice(0, limit);
        console.log(`Found ${props.length} Marder properties to ${force ? 're-' : ''}enrich.${dry ? ' [DRY-RUN]' : ''}\n`);

        let ok = 0, fail = 0, skipped = 0;
        for (let i = 0; i < props.length; i++) {
            const p = props[i];
            const addr = buildAddressString(p);
            const cat = categoryFor(p);
            const tag = `[${i + 1}/${props.length}]`;
            if (!addr) {
                console.log(`${tag} ${p._id} — no address, skipping`);
                skipped++;
                continue;
            }
            process.stdout.write(`${tag} "${p.title.slice(0, 60)}"\n         addr=${addr.slice(0, 80)}\n         cat=${cat} … `);
            try {
                if (dry) {
                    console.log('DRY (would call metadata service)');
                    continue;
                }
                const t0 = Date.now();
                const data = await callMetadataService({ address: addr, country: 'ZA', category: cat });
                const ms = Date.now() - t0;
                await Property.updateOne(
                    { _id: p._id },
                    { $set: { listingMetadata: data } }
                );
                console.log(`OK in ${ms}ms — ${summarize(data)}`);
                ok++;
                await new Promise((r) => setTimeout(r, POLITE_DELAY_MS));
            } catch (err) {
                console.log(`FAIL: ${err.message}`);
                fail++;
            }
        }

        console.log(`\n✅ Done. ${ok} enriched, ${fail} failed, ${skipped} skipped.`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => { console.error('Fatal:', err); process.exit(1); });

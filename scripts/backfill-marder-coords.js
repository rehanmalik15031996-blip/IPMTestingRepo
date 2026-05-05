/**
 * Geocode each Marder demo property's suburb (or full address) once and persist
 * the coordinates onto Property.locationDetails.coordinates.
 *
 * Why: the Prospecting map and the Dashboard map both prefer DB-stored coords
 * to avoid 20+ geocode calls on every page open. Running this once gives every
 * listing instant pin placement.
 *
 * Usage:
 *   MONGO_URI='...' GOOGLE_API_KEY='...' node scripts/backfill-marder-coords.js [--force]
 */

const path = require('path');
const https = require('https');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const Property = require('../server/models/Property');

const MONGO_URI = process.env.MONGO_URI;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || process.env.REACT_APP_GOOGLE_MAPS_API_KEY;
if (!MONGO_URI) { console.error('MONGO_URI missing'); process.exit(1); }
if (!GOOGLE_API_KEY) { console.error('GOOGLE_API_KEY missing (or REACT_APP_GOOGLE_MAPS_API_KEY)'); process.exit(1); }

const force = process.argv.includes('--force');

function geocode(query) {
    return new Promise((resolve, reject) => {
        const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
        https.get(url, (res) => {
            const chunks = [];
            res.on('data', (c) => chunks.push(c));
            res.on('end', () => {
                try {
                    const data = JSON.parse(Buffer.concat(chunks).toString('utf-8'));
                    if (data.status !== 'OK' || !data.results?.length) {
                        return resolve({ lat: null, lng: null, status: data.status, error: data.error_message });
                    }
                    const loc = data.results[0].geometry.location;
                    resolve({ lat: loc.lat, lng: loc.lng, status: 'OK' });
                } catch (err) { reject(err); }
            });
            res.on('error', reject);
        }).on('error', reject);
    });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 30000, bufferCommands: false });
    console.log('✅ Connected to Mongo.');

    const props = await Property.find({ importSource: 'marder-demo' }).select('_id title locationDetails location');
    console.log(`Found ${props.length} Marder properties.`);

    let ok = 0, skipped = 0, fail = 0;
    for (let i = 0; i < props.length; i++) {
        const p = props[i];
        const ld = p.locationDetails || {};
        const existing = ld.coordinates;
        if (!force && existing?.lat && existing?.lng) {
            console.log(`[${i + 1}/${props.length}] skip — already has coords (${existing.lat}, ${existing.lng})`);
            skipped++;
            continue;
        }
        const parts = [ld.streetAddress, ld.suburb, ld.city, ld.region, ld.country || 'South Africa'].filter(Boolean);
        const query = parts.join(', ');
        if (!query) { console.log(`[${i + 1}/${props.length}] no address, skipping`); skipped++; continue; }

        try {
            const r = await geocode(query);
            if (r.lat == null) {
                console.log(`[${i + 1}/${props.length}] FAIL ${r.status} for "${query}"`);
                fail++;
                continue;
            }
            await Property.updateOne(
                { _id: p._id },
                { $set: { 'locationDetails.coordinates': { lat: r.lat, lng: r.lng } } }
            );
            console.log(`[${i + 1}/${props.length}] ✅ ${p.title.slice(0, 50)} → (${r.lat.toFixed(4)}, ${r.lng.toFixed(4)})`);
            ok++;
            await sleep(120); // polite throttle
        } catch (err) {
            console.log(`[${i + 1}/${props.length}] ERROR: ${err.message}`);
            fail++;
        }
    }

    console.log(`\nDone. ${ok} geocoded, ${skipped} skipped, ${fail} failed.`);
    await mongoose.disconnect();
})().catch((err) => { console.error(err); process.exit(1); });

/**
 * Re-pull Graham Marder's headshot using the un-cropped original (his
 * thumbnail crop on marder.co.za chops the top of his head).
 *
 * Usage: MONGO_URI='...' node scripts/_fix-graham-photo.js
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const zlib = require('zlib');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const User = require('../server/models/User');

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/126.0';
const BIO_URL = 'https://www.marder.co.za/agents/graham-marder/69618/';
const EMAIL = 'graham.marder@marder-demo.com';

function get(url, asBuffer = false) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': UA,
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': asBuffer ? 'image/*,*/*;q=0.8' : 'text/html,application/xhtml+xml',
            },
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return get(res.headers.location, asBuffer).then(resolve, reject);
            }
            if (res.statusCode !== 200) return reject(new Error(`HTTP ${res.statusCode}`));
            const chunks = [];
            const enc = res.headers['content-encoding'];
            const stream = enc === 'gzip' ? res.pipe(zlib.createGunzip())
                         : enc === 'deflate' ? res.pipe(zlib.createInflate())
                         : enc === 'br' ? res.pipe(zlib.createBrotliDecompress())
                         : res;
            stream.on('data', (c) => chunks.push(c));
            stream.on('end', () => resolve(asBuffer ? Buffer.concat(chunks) : Buffer.concat(chunks).toString('utf-8')));
            stream.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(20000, () => req.destroy(new Error('Timeout')));
    });
}

(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 30000, bufferCommands: false });
    try {
        console.log('Fetching bio page…');
        const html = await get(BIO_URL);

        // Find ALL Graham images (cropped + uncropped). Prefer the one WITHOUT
        // any `_t_` (transform) suffix — that's the un-cropped original.
        const re = /https:\/\/[^"'<> ]*cloudfront\.net\/media\/uploads\/470\/(?:agents|undefined)\/[^"'<> ]*?\.(?:avif|jpg|jpeg|png|webp)/gi;
        const matches = Array.from(new Set(html.match(re) || []));
        console.log(`Found ${matches.length} candidate images.`);
        const original = matches.find((m) => !/_t_/.test(m));
        const fallback = matches.find((m) => /_w_500_h_500/.test(m)) || matches.find((m) => /_w_400_h_400/.test(m));
        const chosen = original || fallback || matches[0];
        if (!chosen) {
            console.error('No image found.');
            process.exit(1);
        }
        console.log(`Chosen: ${chosen}`);

        const buf = await get(chosen, true);
        console.log(`Downloaded ${(buf.length / 1024).toFixed(1)} KB`);

        // If the original is huge (>2MB) it'll bust the 16MB Mongo doc limit.
        if (buf.length > 2 * 1024 * 1024) {
            console.error(`Image too large (${buf.length} bytes) — would bust Mongo doc limit. Aborting.`);
            process.exit(1);
        }

        const ext = (chosen.match(/\.([a-z]+)(?:\?|$)/i) || [, 'jpg'])[1].toLowerCase();
        const mime = ext === 'avif' ? 'image/avif'
                   : ext === 'webp' ? 'image/webp'
                   : ext === 'png' ? 'image/png'
                   : 'image/jpeg';
        const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;

        // Cache to disk
        fs.writeFileSync(path.join(__dirname, 'assets', 'marder-agent-photos', `graham-marder.${ext}`), buf);

        // Update the agent's User doc
        const agentRes = await User.updateOne({ email: EMAIL }, { $set: { photo: dataUrl } });
        console.log(`Updated User: matched=${agentRes.matchedCount}, modified=${agentRes.modifiedCount}`);

        // Sync onto agency.topAgents[].photo for Graham only
        const agency = await User.findOne({ email: 'marder_agency@demo.com' });
        if (agency?.agencyStats?.topAgents) {
            const ta = agency.agencyStats.topAgents.find((a) => (a.email || '').toLowerCase() === EMAIL);
            if (ta) {
                ta.photo = dataUrl;
                agency.markModified('agencyStats');
                await agency.save();
                console.log('✅ Synced topAgents entry.');
            }
        }
    } finally {
        await mongoose.disconnect();
    }
})().catch((err) => { console.error(err); process.exit(1); });

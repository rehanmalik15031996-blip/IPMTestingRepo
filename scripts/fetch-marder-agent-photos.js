/**
 * Fetch each Marder agent's profile photo from their bio page on
 * marder.co.za, download the image, encode as a data URL, and store on
 * the corresponding User document's `photo` field.
 *
 * Usage:
 *   MONGO_URI='...' node scripts/fetch-marder-agent-photos.js
 *
 * Re-runnable: overwrites whatever is in `photo` for these accounts.
 */

const path = require('path');
const fs = require('fs');
const https = require('https');
const zlib = require('zlib');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const User = require('../server/models/User');

const MONGO_URI = process.env.MONGO_URI ||
    'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// Bio slugs taken directly from marder.co.za/agents/ href values.
// NOTE: Graham Marder is intentionally excluded — his thumbnail crop on
// marder.co.za chops the top of his head; we use a manually-recropped
// version (see scripts/_upload-graham-cropped.js).
const AGENT_BIOS = [
    { email: 'alex.vangelatos@marder-demo.com',        slug: 'alex-vangelatos/69611' },
    { email: 'cameron.cock@marder-demo.com',           slug: 'cameron-cock/69614' },
    { email: 'fabio.de.castro@marder-demo.com',        slug: 'fabio-de-castro/69617' },
    { email: 'kirsten.chalice@marder-demo.com',        slug: 'kirsten-chalice/69619' },
    { email: 'kyle.cock@marder-demo.com',              slug: 'kyle-cock/69620' },
    { email: 'theo.papadimitriou@marder-demo.com',     slug: 'theo-papadimitriou/69623' },
    { email: 'chris.georgiades@marder-demo.com',       slug: 'chris-georgiades/69616' },
    { email: 'dillen.van.den.heever@marder-demo.com',  slug: 'dillen-van-den-heever/74983' },
    { email: 'mila.kapp@marder-demo.com',              slug: 'mila-kapp/91031' },
    { email: 'greig.harty@marder-demo.com',            slug: 'greig-harty/97360' },
    { email: 'motshwane.mabogoane@marder-demo.com',    slug: 'motshwane-mabogoane/97051' },
    { email: 'nancy.ramovha@marder-demo.com',          slug: 'nancy-ramovha/95483' },
];

function get(url, asBuffer = false) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, {
            headers: {
                'User-Agent': UA,
                'Accept-Encoding': 'gzip, deflate, br',
                'Accept': asBuffer
                    ? 'image/avif,image/webp,image/png,image/*,*/*;q=0.8'
                    : 'text/html,application/xhtml+xml',
            },
        }, (res) => {
            if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                return get(res.headers.location, asBuffer).then(resolve, reject);
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
            stream.on('end', () => {
                const buf = Buffer.concat(chunks);
                resolve(asBuffer ? buf : buf.toString('utf-8'));
            });
            stream.on('error', reject);
        });
        req.on('error', reject);
        req.setTimeout(20000, () => {
            req.destroy(new Error(`Timeout fetching ${url}`));
        });
    });
}

function pickAgentPhotoFromHtml(html, slug) {
    // Photo URLs live at cloudfront.net/media/uploads/470/agents/... or
    // .../undefined/... and end in .avif (sometimes .jpg/.png).
    const re = /https:\/\/[^"'<> ]*cloudfront\.net\/media\/uploads\/470\/(?:agents|undefined)\/[^"'<> ]*?\.(?:avif|jpg|jpeg|png|webp)/gi;
    const matches = Array.from(new Set(html.match(re) || []));
    if (!matches.length) return null;
    // Always prefer the cropped 304x304 thumbnail (suffix `_w_304_h_304`) — they
    // are tiny (~10–60 KB) and perfect for avatars. Fall back to any thumbnail,
    // and only the original as a last resort (some are 10MB+ and bust Mongo's
    // 16MB doc limit when stored inline).
    const thumb304 = matches.find((m) => /_w_304_h_304\./.test(m));
    if (thumb304) return thumb304;
    const anyThumb = matches.find((m) => /_t_/.test(m));
    if (anyThumb) return anyThumb;
    return matches[0];
}

async function main() {
    console.log('Connecting to MongoDB…');
    await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 45000,
        bufferCommands: false,
    });
    console.log('✅ Connected.');

    const cacheDir = path.join(__dirname, 'assets', 'marder-agent-photos');
    fs.mkdirSync(cacheDir, { recursive: true });

    let ok = 0, fail = 0;
    try {
        for (const { email, slug } of AGENT_BIOS) {
            try {
                const bioUrl = `https://www.marder.co.za/agents/${slug}/`;
                process.stdout.write(`  ${email} … `);
                const html = await get(bioUrl, false);
                const photoUrl = pickAgentPhotoFromHtml(html, slug);
                if (!photoUrl) {
                    console.log('NO PHOTO FOUND');
                    fail++;
                    continue;
                }

                const buf = await get(photoUrl, true);
                const ext = (photoUrl.match(/\.([a-z]+)(?:\?|$)/i) || [, 'jpg'])[1].toLowerCase();
                const mime = ext === 'avif' ? 'image/avif'
                           : ext === 'webp' ? 'image/webp'
                           : ext === 'png'  ? 'image/png'
                           : 'image/jpeg';

                // Cache to disk for re-use
                const localPath = path.join(cacheDir, `${slug.split('/')[0]}.${ext}`);
                fs.writeFileSync(localPath, buf);

                const dataUrl = `data:${mime};base64,${buf.toString('base64')}`;
                const result = await User.updateOne({ email }, { $set: { photo: dataUrl } });
                if (result.matchedCount === 0) {
                    console.log(`USER NOT FOUND in DB`);
                    fail++;
                    continue;
                }
                console.log(`OK (${(buf.length / 1024).toFixed(1)} KB ${mime})`);
                ok++;
            } catch (err) {
                console.log(`FAIL: ${err.message}`);
                fail++;
            }
        }
    } finally {
        await mongoose.disconnect();
    }

    // Sync agency.agencyStats.topAgents[].photo too, so the agency dashboard
    // tile uses the same images.
    console.log('\nSyncing photos onto agency.topAgents…');
    await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 45000, bufferCommands: false });
    try {
        const agency = await User.findOne({ email: 'marder_agency@demo.com' });
        if (agency && agency.agencyStats && Array.isArray(agency.agencyStats.topAgents)) {
            for (const ta of agency.agencyStats.topAgents) {
                const agent = await User.findOne({ email: ta.email }).select('photo');
                if (agent && agent.photo) ta.photo = agent.photo;
            }
            agency.markModified('agencyStats');
            await agency.save();
            console.log(`✅ Updated ${agency.agencyStats.topAgents.length} topAgents.photo entries.`);
        }
    } finally {
        await mongoose.disconnect();
    }

    console.log(`\nDone. ${ok} succeeded, ${fail} failed.`);
}

main().catch((err) => {
    console.error('❌ Fatal:', err);
    process.exit(1);
});

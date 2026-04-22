/**
 * Upsert PropData Export rows as minimal Property docs (same scope as full XLSX import).
 *
 * Usage:
 *   MONGO_URI="mongodb+srv://..." node scripts/propdata-lean-insert-xlsx.js <agencyMongoId> /path/to/residential-all-data.xlsx
 *
 * Optional: --max=20   (cap rows for testing)
 *
 * Loads .env from repo root for MONGO_URI if set there.
 */

const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const User = require('../server/models/User');
const { runPropdataLeanXlsxImport } = require('../server/services/propdataXlsxImport');

function parseArgs() {
    const args = process.argv.slice(2);
    let maxListings = null;
    const rest = [];
    for (const a of args) {
        if (a.startsWith('--max=')) {
            const n = Number(a.slice(6));
            if (Number.isFinite(n) && n > 0) maxListings = n;
        } else {
            rest.push(a);
        }
    }
    return { positional: rest, maxListings };
}

async function main() {
    const { positional, maxListings } = parseArgs();
    const [agencyId, filePath] = positional;
    if (!agencyId || !filePath) {
        console.error('Usage: node scripts/propdata-lean-insert-xlsx.js <agencyMongoId> <export.xlsx> [--max=N]');
        console.error('Set MONGO_URI in environment or in .env at repo root.');
        process.exit(1);
    }
    const uri = process.env.MONGO_URI;
    if (!uri) {
        console.error('Missing MONGO_URI. Add it to .env or export it in the shell.');
        process.exit(1);
    }
    if (!fs.existsSync(filePath)) {
        console.error('File not found:', filePath);
        process.exit(1);
    }

    await mongoose.connect(uri);
    try {
        const agencyUser = await User.findById(agencyId);
        if (!agencyUser) {
            console.error('No user with _id:', agencyId);
            process.exit(1);
        }
        if (String(agencyUser.role || '').toLowerCase() !== 'agency') {
            console.error('User must have role agency, got:', agencyUser.role);
            process.exit(1);
        }
        const buf = fs.readFileSync(filePath);
        console.log('Lean import…', { agencyId: String(agencyUser._id), bytes: buf.length, maxListings });
        const summary = await runPropdataLeanXlsxImport({ agencyUser, residentialBuffer: buf, maxListings });
        console.log(JSON.stringify(summary, null, 2));
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});

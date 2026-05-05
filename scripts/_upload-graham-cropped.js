const path = require('path');
const fs = require('fs');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const User = require('../server/models/User');

const FILE = '/tmp/graham-final.jpg';
const EMAIL = 'graham.marder@marder-demo.com';

(async () => {
    const buf = fs.readFileSync(FILE);
    const dataUrl = `data:image/jpeg;base64,${buf.toString('base64')}`;
    console.log(`Uploading ${(buf.length / 1024).toFixed(1)} KB JPEG…`);

    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 30000, bufferCommands: false });
    try {
        const r = await User.updateOne({ email: EMAIL }, { $set: { photo: dataUrl } });
        console.log(`Agent updated: matched=${r.matchedCount}, modified=${r.modifiedCount}`);

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
        // Cache to scripts/assets for re-use
        fs.copyFileSync(FILE, path.join(__dirname, 'assets', 'marder-agent-photos', 'graham-marder.jpg'));
    } finally {
        await mongoose.disconnect();
    }
})().catch((e) => { console.error(e); process.exit(1); });

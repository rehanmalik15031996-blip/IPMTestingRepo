const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const User = require('../server/models/User');
(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 30000, bufferCommands: false });
    const r = await User.updateMany(
        { migrationSource: 'marder-demo', role: 'agency_agent' },
        { $unset: { photo: '' } }
    );
    console.log('Cleared photos on', r.modifiedCount, 'agents.');
    await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

const path = require('path');
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const User = require('../server/models/User');
(async () => {
    await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 30000, bufferCommands: false });
    const r = await User.updateMany(
        { migrationSource: 'marder-demo' },
        { $set: { agentScore: 0, agentTier: 'silver' } }
    );
    console.log('Reset score=0, tier=silver on', r.modifiedCount, 'agents.');
    await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });

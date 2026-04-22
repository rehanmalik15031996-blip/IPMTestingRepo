#!/usr/bin/env node
/**
 * One-time script: clear savedProperties (saved/collection) for ALL users.
 * Run from project root: MONGO_URI='...' node scripts/clear-all-saved-properties.js
 * Or ensure .env is loaded (e.g. npm run clear-saved).
 */
const connectDB = require('../api/_lib/mongodb');
const User = require('../server/models/User');

async function run() {
  console.log('Connecting to MongoDB...');
  await connectDB();
  const result = await User.updateMany(
    {},
    { $set: { savedProperties: [] } }
  );
  console.log('Done. Matched:', result.matchedCount, 'Modified:', result.modifiedCount);
  process.exit(0);
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});

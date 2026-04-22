/**
 * Transfer data from one MongoDB (e.g. old Atlas cluster) to another (e.g. new Atlas cluster).
 * Preserves _id so references between collections stay valid.
 *
 * Usage:
 *   1. Set env vars (create .env or export in terminal):
 *      MONGO_URI_SOURCE = connection string for the database you're copying FROM (current one with data)
 *      MONGO_URI        = connection string for the database you're copying TO (new cluster)
 *   2. Run: node server/transfer-atlas-to-atlas.js
 *
 * Requires: npm install dotenv (or run with node -r dotenv/config server/transfer-atlas-to-atlas.js)
 */

require('dotenv').config();
const mongoose = require('mongoose');

const User = require('./models/User');
const Property = require('./models/Property');
const Development = require('./models/Development');
const News = require('./models/News');
const MarketTrend = require('./models/MarketTrend');
const Meeting = require('./models/Meeting');
const Inquiry = require('./models/Inquiry');
const File = require('./models/File');
const AgencyInvite = require('./models/AgencyInvite');
const MatchScore = require('./models/MatchScore');

const SOURCE_URI = process.env.MONGO_URI_SOURCE;
const DEST_URI = process.env.MONGO_URI;

if (!SOURCE_URI || !SOURCE_URI.startsWith('mongodb')) {
  console.error('❌ Set MONGO_URI_SOURCE (connection string of the database to copy FROM).');
  process.exit(1);
}
if (!DEST_URI || !DEST_URI.startsWith('mongodb')) {
  console.error('❌ Set MONGO_URI (connection string of the database to copy TO).');
  process.exit(1);
}

const mask = (uri) => (uri ? uri.replace(/:[^:@]+@/, ':****@') : '');

let sourceConn, destConn;

async function connect() {
  sourceConn = await mongoose.createConnection(SOURCE_URI);
  console.log('✅ Connected to SOURCE database');
  destConn = await mongoose.createConnection(DEST_URI);
  console.log('✅ Connected to DESTINATION database');
}

async function copyCollection(collectionName, Model) {
  console.log(`\n📦 Copying ${collectionName}...`);
  try {
    const SourceModel = sourceConn.model(collectionName, Model.schema);
    const DestModel = destConn.model(collectionName, Model.schema);

    const existing = await DestModel.countDocuments();
    if (existing > 0) {
      console.log(`   ⚠️  Destination has ${existing} documents. Deleting before copy...`);
      await DestModel.deleteMany({});
    }

    const docs = await SourceModel.find({}).lean();
    console.log(`   📥 Found ${docs.length} in source`);

    if (docs.length === 0) {
      console.log(`   ⏭️  Skip (empty)`);
      return;
    }

    await DestModel.insertMany(docs);
    console.log(`   ✅ Inserted ${docs.length} into destination`);
  } catch (err) {
    console.error(`   ❌ Error:`, err.message);
  }
}

async function run() {
  try {
    console.log('🚀 Atlas → Atlas transfer\n');
    console.log('Source:', mask(SOURCE_URI));
    console.log('Dest:  ', mask(DEST_URI));

    await connect();

    const collections = [
      ['users', User],
      ['agencyinvites', AgencyInvite],
      ['properties', Property],
      ['developments', Development],
      ['news', News],
      ['markettrends', MarketTrend],
      ['meetings', Meeting],
      ['inquiries', Inquiry],
      ['files', File],
      ['matchscores', MatchScore],
    ];

    for (const [name, Model] of collections) {
      await copyCollection(name, Model);
    }

    console.log('\n✅ Transfer completed.');
  } catch (err) {
    console.error('\n❌ Transfer failed:', err);
  } finally {
    if (sourceConn) await sourceConn.close();
    if (destConn) await destConn.close();
    process.exit(0);
  }
}

run();

/**
 * Simple MongoDB Migration Script
 * Migrates all data from local MongoDB to MongoDB Atlas
 * Preserves all ObjectIds to maintain references
 * 
 * Usage: node migrate-simple.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connection strings
const LOCAL_URI = 'mongodb://127.0.0.1:27017/ipm_db';
// Using your MongoDB Atlas connection string directly
const ATLAS_URI = 'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';

let localConnection, atlasConnection;

async function connectLocal() {
  try {
    localConnection = mongoose.createConnection(LOCAL_URI);
    await localConnection.asPromise();
    console.log('✅ Connected to LOCAL MongoDB');
    return localConnection;
  } catch (err) {
    console.error('❌ Local connection error:', err);
    throw err;
  }
}

async function connectAtlas() {
  try {
    atlasConnection = mongoose.createConnection(ATLAS_URI);
    await atlasConnection.asPromise();
    console.log('✅ Connected to MongoDB ATLAS');
    return atlasConnection;
  } catch (err) {
    console.error('❌ Atlas connection error:', err);
    throw err;
  }
}

async function migrateCollection(collectionName) {
  console.log(`\n📦 Migrating collection: ${collectionName}...`);
  
  try {
    // Get collection from local
    const localDb = localConnection.db;
    const atlasDb = atlasConnection.db;
    const localCollection = localDb.collection(collectionName);
    const atlasCollection = atlasDb.collection(collectionName);
    
    // Count documents
    const count = await localCollection.countDocuments();
    console.log(`   📥 Found ${count} documents`);
    
    if (count === 0) {
      console.log(`   ⏭️  No data to migrate`);
      return;
    }
    
    // Check if collection already has data in Atlas
    const atlasCount = await atlasCollection.countDocuments();
    if (atlasCount > 0) {
      console.log(`   ⚠️  Atlas already has ${atlasCount} documents`);
      const response = 'skip'; // You can change this to 'overwrite' if needed
      if (response === 'skip') {
        console.log(`   ⏭️  Skipping ${collectionName} (already exists)`);
        return;
      } else {
        console.log(`   🗑️  Clearing existing data...`);
        await atlasCollection.deleteMany({});
      }
    }
    
    // Fetch all documents
    const documents = await localCollection.find({}).toArray();
    
    // Insert into Atlas (preserving original _ids)
    if (documents.length > 0) {
      try {
        await atlasCollection.insertMany(documents, { ordered: false });
        console.log(`   ✅ Successfully migrated ${documents.length} documents`);
      } catch (err) {
        if (err.code === 11000 || err.writeErrors) {
          // Some documents already exist, insert one by one
          let inserted = 0;
          let skipped = 0;
          for (const doc of documents) {
            try {
              await atlasCollection.insertOne(doc);
              inserted++;
            } catch (e) {
              if (e.code === 11000) {
                skipped++;
              } else {
                console.error(`   ❌ Error:`, e.message);
              }
            }
          }
          console.log(`   ✅ Inserted ${inserted} new, skipped ${skipped} existing`);
        } else {
          throw err;
        }
      }
    }
    
  } catch (err) {
    console.error(`   ❌ Error migrating ${collectionName}:`, err.message);
  }
}

async function migrate() {
  try {
    console.log('🚀 Starting MongoDB Migration to Atlas...\n');
    console.log('Local URI:', LOCAL_URI);
    console.log('Atlas URI:', ATLAS_URI.replace(/:[^:@]+@/, ':****@'));
    console.log('\n⚠️  Note: This will preserve all ObjectIds to maintain references\n');
    
    // Connect to both databases
    await connectLocal();
    await connectAtlas();
    
    // Get all collection names from local database
    const localDb = localConnection.db;
    const collections = await localDb.listCollections().toArray();
    const collectionNames = collections.map(c => c.name).filter(name => !name.startsWith('system.'));
    
    console.log(`\n📋 Found ${collectionNames.length} collections to migrate:`);
    collectionNames.forEach(name => console.log(`   - ${name}`));
    
    // If no collections found, try known collection names
    if (collectionNames.length === 0) {
      console.log('   ⚠️  No collections found via listCollections, trying known collections...');
      const knownCollections = ['users', 'properties', 'developments', 'news', 'meetings', 'inquiries', 'files', 'markettrends'];
      for (const collectionName of knownCollections) {
        const count = await localDb.collection(collectionName).countDocuments();
        if (count > 0) {
          collectionNames.push(collectionName);
          console.log(`   ✓ Found ${collectionName} with ${count} documents`);
        }
      }
    }
    
    // Migrate each collection
    for (const collectionName of collectionNames) {
      await migrateCollection(collectionName);
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Next steps:');
    console.log('   1. Verify data in MongoDB Atlas dashboard');
    console.log('   2. Test your application with Atlas connection');
    console.log('   3. Update your app to use Atlas in production');
    
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
    process.exit(1);
  } finally {
    // Close connections
    if (localConnection) {
      await localConnection.close();
      console.log('\n🔌 Closed local connection');
    }
    if (atlasConnection) {
      await atlasConnection.close();
      console.log('🔌 Closed Atlas connection');
    }
    process.exit(0);
  }
}

// Run migration
console.log('⚠️  Make sure your local MongoDB is running!');
console.log('⚠️  Make sure MongoDB Atlas allows connections from your IP!\n');
migrate();


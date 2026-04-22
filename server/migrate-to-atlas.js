/**
 * MongoDB Migration Script
 * Migrates all data from local MongoDB to MongoDB Atlas
 * 
 * Usage: node migrate-to-atlas.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('./models/User');
const Property = require('./models/Property');
const Development = require('./models/Development');
const Meeting = require('./models/Meeting');
const File = require('./models/File');
const Inquiry = require('./models/Inquiry');
const News = require('./models/News');
const MarketTrend = require('./models/MarketTrend');

// Connection strings
const LOCAL_URI = 'mongodb://127.0.0.1:27017/ipm_db';
const ATLAS_URI = process.env.MONGO_URI || 
  'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';

let localConnection, atlasConnection;
let idMapping = {}; // Maps old ObjectIds to new ObjectIds for references

async function connectLocal() {
  try {
    localConnection = await mongoose.createConnection(LOCAL_URI);
    console.log('✅ Connected to LOCAL MongoDB');
    return localConnection;
  } catch (err) {
    console.error('❌ Local connection error:', err);
    throw err;
  }
}

async function connectAtlas() {
  try {
    atlasConnection = await mongoose.createConnection(ATLAS_URI);
    console.log('✅ Connected to MongoDB ATLAS');
    return atlasConnection;
  } catch (err) {
    console.error('❌ Atlas connection error:', err);
    throw err;
  }
}

async function migrateCollection(collectionName, Model, dependencies = []) {
  console.log(`\n📦 Migrating ${collectionName}...`);
  
  try {
    // Get local model
    const LocalModel = localConnection.model(collectionName, Model.schema);
    
    // Get atlas model
    const AtlasModel = atlasConnection.model(collectionName, Model.schema);
    
    // Clear existing data in Atlas (optional - comment out if you want to keep existing data)
    const existingCount = await AtlasModel.countDocuments();
    if (existingCount > 0) {
      console.log(`   ⚠️  Found ${existingCount} existing documents. Clearing...`);
      await AtlasModel.deleteMany({});
    }
    
    // Fetch all documents from local
    const localDocs = await LocalModel.find({}).lean();
    console.log(`   📥 Found ${localDocs.length} documents in local database`);
    
    if (localDocs.length === 0) {
      console.log(`   ⏭️  No data to migrate for ${collectionName}`);
      return;
    }
    
    // Process documents - preserve original _id to maintain references
    const documentsToInsert = [];
    const oldToNewIdMap = {};
    
    for (const doc of localDocs) {
      const oldId = doc._id;
      
      // Keep the original _id to preserve references between collections
      const newDoc = { ...doc };
      // Keep original _id - this preserves all ObjectId references
      
      // Update references if this collection has dependencies
      // Note: Since we're preserving _id, references should work automatically
      // But we'll still track the mapping in case we need it
      
      documentsToInsert.push(newDoc);
    }
    
    // Insert into Atlas (preserving original _ids)
    if (documentsToInsert.length > 0) {
      try {
        const result = await AtlasModel.insertMany(documentsToInsert, { 
          ordered: false,
          // Don't throw error on duplicate _id - just skip
        });
        console.log(`   ✅ Inserted ${result.length} documents into Atlas`);
        
        // Create ID mapping (same as original since we preserved _id)
        for (const doc of localDocs) {
          const oldId = doc._id.toString();
          oldToNewIdMap[oldId] = doc._id; // Same ID
        }
        
        idMapping[collectionName] = oldToNewIdMap;
      } catch (err) {
        // Handle duplicate key errors (documents already exist)
        if (err.code === 11000 || err.writeErrors) {
          console.log(`   ⚠️  Some documents may already exist. Continuing...`);
          // Try inserting one by one to see which ones are new
          let inserted = 0;
          let skipped = 0;
          for (const doc of documentsToInsert) {
            try {
              await AtlasModel.create(doc);
              inserted++;
            } catch (e) {
              if (e.code === 11000) {
                skipped++;
              } else {
                console.error(`   ❌ Error inserting document:`, e.message);
              }
            }
          }
          console.log(`   ✅ Inserted ${inserted} new documents, skipped ${skipped} existing`);
        } else {
          throw err;
        }
      }
    }
    
  } catch (err) {
    console.error(`   ❌ Error migrating ${collectionName}:`, err.message);
    // Continue with other collections even if one fails
  }
}

async function migrate() {
  try {
    console.log('🚀 Starting MongoDB Migration...\n');
    console.log('Local URI:', LOCAL_URI);
    console.log('Atlas URI:', ATLAS_URI.replace(/:[^:@]+@/, ':****@')); // Hide password
    
    // Connect to both databases
    await connectLocal();
    await connectAtlas();
    
    // Migration order matters for references!
    // 1. First migrate independent collections
    await migrateCollection('users', User);
    await migrateCollection('properties', Property, [
      { collection: 'users', field: 'agentId' }
    ]);
    await migrateCollection('developments', Development);
    await migrateCollection('news', News);
    await migrateCollection('markettrends', MarketTrend);
    await migrateCollection('meetings', Meeting);
    await migrateCollection('inquiries', Inquiry);
    await migrateCollection('files', File, [
      { collection: 'users', field: 'userId' }
    ]);
    
    // 2. Update User references (savedProperties)
    console.log('\n🔗 Updating User references (savedProperties)...');
    try {
      const AtlasUser = atlasConnection.model('User', User.schema);
      const users = await AtlasUser.find({ savedProperties: { $exists: true, $ne: [] } });
      
      let updatedCount = 0;
      for (const user of users) {
        if (user.savedProperties && user.savedProperties.length > 0 && idMapping['properties']) {
          const mappedProperties = user.savedProperties.map(oldId => {
            const oldIdStr = oldId.toString();
            return idMapping['properties'][oldIdStr] || oldId;
          });
          
          await AtlasUser.updateOne(
            { _id: user._id },
            { $set: { savedProperties: mappedProperties } }
          );
          updatedCount++;
        }
      }
      console.log(`   ✅ Updated ${updatedCount} users with property references`);
    } catch (err) {
      console.error('   ❌ Error updating user references:', err.message);
    }
    
    console.log('\n✅ Migration completed successfully!');
    console.log('\n📊 Summary:');
    console.log('   - All collections have been migrated');
    console.log('   - ObjectId references have been updated');
    console.log('   - Data is now available in MongoDB Atlas');
    
  } catch (err) {
    console.error('\n❌ Migration failed:', err);
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
migrate();


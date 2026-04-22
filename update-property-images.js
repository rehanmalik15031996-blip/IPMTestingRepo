// Script to update all properties with images from local directory
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: './server/.env' });

const Property = require('./server/models/Property');
const connectDB = require('./api/_lib/mongodb');

async function updatePropertyImages() {
  try {
    console.log('🔌 Connecting to MongoDB...');
    await connectDB();
    
    // Ensure connection is ready
    const mongoose = require('mongoose');
    while (mongoose.connection.readyState !== 1) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log('✅ Connected to MongoDB (readyState:', mongoose.connection.readyState, ')');

    // Get all properties - use native MongoDB if needed
    console.log('📋 Fetching properties from database...');
    let properties;
    try {
      properties = await Property.find({}).maxTimeMS(30000);
    } catch (err) {
      // Fallback to native MongoDB
      console.log('⚠️ Mongoose query failed, trying native MongoDB...');
      const db = mongoose.connection.db;
      const collection = db.collection('properties');
      properties = await collection.find({}).toArray();
      // Convert to Mongoose documents
      properties = properties.map(p => new Property(p));
    }
    console.log(`📋 Found ${properties.length} properties in database`);

    if (properties.length === 0) {
      console.log('⚠️ No properties found. Please seed the database first.');
      process.exit(0);
    }

    // Get all image files from the directory
    const imagesDir = path.join(__dirname, 'property images');
    const imageFiles = fs.readdirSync(imagesDir)
      .filter(file => /\.(jpg|jpeg|png|webp)$/i.test(file))
      .map(file => path.join(imagesDir, file));

    console.log(`🖼️ Found ${imageFiles.length} images in directory`);

    if (imageFiles.length === 0) {
      console.log('⚠️ No images found in "property images" directory');
      process.exit(1);
    }

    // First, copy images to public folder for web access
    const publicImagesDir = path.join(__dirname, 'client', 'public', 'property-images');
    if (!fs.existsSync(publicImagesDir)) {
      fs.mkdirSync(publicImagesDir, { recursive: true });
      console.log('📁 Created public/property-images directory');
    }

    // Copy images to public folder
    console.log('📤 Copying images to public folder...');
    const copiedImages = [];
    for (let i = 0; i < imageFiles.length; i++) {
      const sourceFile = imageFiles[i];
      const fileName = path.basename(sourceFile);
      const destFile = path.join(publicImagesDir, fileName);
      
      fs.copyFileSync(sourceFile, destFile);
      copiedImages.push(`/property-images/${fileName}`);
      console.log(`  ✅ Copied: ${fileName}`);
    }

    console.log(`✅ Copied ${copiedImages.length} images to public folder`);

    // Update properties with images (cycle through images if more properties than images)
    console.log('\n🔄 Updating properties with images...');
    let updatedCount = 0;

    // Use native MongoDB for updates to avoid buffering issues
    const db = mongoose.connection.db;
    const collection = db.collection('properties');

    for (let i = 0; i < properties.length; i++) {
      const property = properties[i];
      const imageIndex = i % copiedImages.length; // Cycle through images
      const imageUrl = copiedImages[imageIndex];

      // Update using native MongoDB
      await collection.updateOne(
        { _id: property._id || property.id },
        { $set: { imageUrl: imageUrl } }
      );
      
      updatedCount++;
      const title = property.title || property._id?.toString() || `Property ${i + 1}`;
      console.log(`  ✅ Updated: ${title} -> ${path.basename(imageUrl)}`);
    }

    console.log(`\n✅ Successfully updated ${updatedCount} properties with images!`);
    console.log(`📸 Images are available at: /property-images/`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error updating property images:', error);
    process.exit(1);
  }
}

// Run the script
updatePropertyImages();


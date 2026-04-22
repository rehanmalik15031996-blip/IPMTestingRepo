// Consolidated vault routes - handles both /api/vault (upload) and /api/vault?userId=... (get files)
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const File = require('../../server/models/File');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    await connectDB();
    const { userId, propertyId, folder } = req.query;

    if (req.method === 'GET') {
      // GET user files (/api/vault?userId=... or /api/vault?userId=...&propertyId=... or &folder=marketing)
      if (!userId) {
        return res.status(400).json({ message: 'userId query parameter is required' });
      }
      const filter = { userId: String(userId) };
      if (propertyId) filter.propertyId = String(propertyId);
      if (folder) filter.folder = String(folder);
      const files = await File.find(filter).sort({ date: -1 }).lean();
      const LIMIT_BYTES = 1024 * 1024 * 1024; // 1GB per user
      const usedResult = await File.aggregate([
        { $match: { userId: String(userId) } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$sizeBytes', 0] } } } }
      ]);
      const usedBytes = (usedResult[0] && usedResult[0].total) || 0;
      return res.status(200).json({ files, usedBytes, limitBytes: LIMIT_BYTES });
    }

    if (req.method === 'POST') {
      // POST file upload (/api/vault)
      // Note: For Vercel, file uploads need to be handled differently
      // This is a simplified version - for production, use a cloud storage service
      console.log('📥 POST /api/vault - File upload request received');
      console.log('📋 Request body keys:', Object.keys(req.body || {}));
      
      const { userId: bodyUserId, name, fileData, size, type, folder, propertyId, propertyTitle, documentType } = req.body;
      
      console.log('📋 Extracted data:', {
        hasUserId: !!bodyUserId,
        userId: bodyUserId,
        hasName: !!name,
        name: name,
        hasFileData: !!fileData,
        fileDataLength: fileData?.length || 0,
        size: size,
        type: type,
        folder: folder
      });
      
      if (!bodyUserId || !name) {
        console.error('❌ Validation failed: Missing userId or name');
        return res.status(400).json({ 
          message: 'userId and name are required',
          received: {
            hasUserId: !!bodyUserId,
            hasName: !!name
          }
        });
      }
      
      if (!fileData) {
        console.error('❌ Validation failed: Missing fileData');
        return res.status(400).json({ 
          message: 'fileData is required' 
        });
      }

      const sizeBytes = typeof size === 'number' ? size : (typeof size === 'string' ? parseInt(size, 10) : 0) || Math.ceil((fileData.length || 0) * 0.75);
      const LIMIT_BYTES = 1024 * 1024 * 1024; // 1GB per user
      const usedResult = await File.aggregate([
        { $match: { userId: String(bodyUserId) } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$sizeBytes', 0] } } } }
      ]);
      const usedBytes = (usedResult[0] && usedResult[0].total) || 0;
      if (usedBytes + sizeBytes > LIMIT_BYTES) {
        return res.status(403).json({
          message: `Storage limit reached (1 GB per user). You have ${(LIMIT_BYTES - usedBytes).toLocaleString()} bytes free. This file is ${sizeBytes.toLocaleString()} bytes.`
        });
      }

      // Format file size for display
      const formatSize = (bytes) => {
        if (!bytes) return '0 KB';
        if (typeof bytes === 'string') {
          // If it's already formatted, return as is
          if (bytes.includes('KB') || bytes.includes('MB') || bytes.includes('B')) {
            return bytes;
          }
          // If it's a base64 string, estimate size
          bytes = Math.ceil(bytes.length * 0.75);
        }
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
      };

      try {
        const newFile = new File({
          userId: String(bodyUserId),
          name: String(name),
          path: String(fileData),
          size: formatSize(sizeBytes),
          sizeBytes,
          type: type || 'application/octet-stream',
          folder: folder || 'General Documents',
          propertyId: propertyId || null,
          propertyTitle: propertyTitle || null,
          documentType: documentType || null,
          date: new Date()
        });

        console.log('💾 Saving file to database...');
        const savedFile = await newFile.save();
        console.log('✅ File saved successfully:', savedFile._id);
        return res.status(200).json(savedFile);
      } catch (saveError) {
        console.error('❌ Error saving file:', saveError);
        return res.status(500).json({ 
          message: 'Failed to save file to database',
          error: saveError.message 
        });
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Vault error:', err);
    return res.status(500).json({ message: err.message });
  }
};


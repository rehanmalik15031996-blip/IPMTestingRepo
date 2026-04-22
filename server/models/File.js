const mongoose = require('mongoose');

const FileSchema = new mongoose.Schema({
    userId: String,
    name: String,
    path: String,
    size: String,
    sizeBytes: { type: Number, default: 0 },
    type: String,
    folder: String,
    date: { type: Date, default: Date.now },
    // Link to property if uploaded during property creation
    propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    propertyTitle: String,
    // Document type for property uploads (e.g. levy_bills, floorplans, deed) so we can show them when editing
    documentType: String
});

module.exports = mongoose.model('File', FileSchema);

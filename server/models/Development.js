const mongoose = require('mongoose');

// Single file attachment (JPG, PDF, CAD, etc.)
const floorPlanFileSchema = new mongoose.Schema({
    url: { type: String, required: true },            // stored file URL (vault or CDN)
    name: { type: String },                           // display name, e.g. "Type-A-FloorPlan.pdf"
    mimeType: { type: String },                       // e.g. "application/pdf", "image/jpeg"
    fileType: { type: String },                       // optional: "pdf", "image", "cad", "dwg" for UI
    size: Number                                     // optional size in bytes
}, { _id: false });

// Floor plan / layout option (e.g. Type A, 2-bed whitebox) – files can be JPG, PDF, CAD, etc.
const floorPlanSchema = new mongoose.Schema({
    name: { type: String, required: true },           // e.g. "Type A", "2-Bed Layout 1"
    imageUrl: { type: String },                       // optional preview/thumbnail (e.g. first page or JPG)
    files: [floorPlanFileSchema],                     // floor plan files: JPG, PDF, CAD, DWG, etc.
    sizeSqft: Number,
    sizeSqm: Number,
    beds: Number,
    baths: Number,
    unitType: { type: String },                       // e.g. "Type A" – links to Property.developmentUnitGroup
    priceFrom: { type: String },                      // e.g. "From AED 774,888"
    whiteboxOption: { type: Boolean, default: false }  // optional layout variant (e.g. whitebox vs finished)
}, { _id: false });

const towerSchema = new mongoose.Schema({
    name: { type: String, required: true }             // e.g. "Tower A", "Building 1"
}, { _id: false });

const developmentSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: { type: String },
    location: { type: String, required: true },
    completion: { type: String, required: true }, // e.g., "Q2 2027"
    priceStart: { type: String, required: true }, // e.g., "$1.25M"
    yieldRange: { type: String },                 // e.g., "up to 5.6%"
    imageUrl: { type: String, required: true },
    description: { type: String, required: true }, // The detailed text
    agentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    // --- Multi-unit & layout (Property24 / Dubai-style) ---
    floorPlans: [floorPlanSchema],                    // building plans / layout options
    towers: [towerSchema],                            // optional tower/building names
    gallery: [{ url: String, caption: String }]       // optional extra images
}, { timestamps: true });

developmentSchema.index({ agencyId: 1, createdAt: -1 });
developmentSchema.index({ agentId: 1, createdAt: -1 });

module.exports = mongoose.model('Development', developmentSchema);
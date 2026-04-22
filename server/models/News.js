const mongoose = require('mongoose');

const newsSchema = new mongoose.Schema({
    title: { type: String, required: true },
    category: { type: String, required: true }, // e.g., "Market Trends"
    author: { type: String, required: true },
    date: { type: String, required: true },     // e.g., "Oct 24, 2025"
    image: { type: String, required: true },    // URL to hero image
    
    desc: { type: String, required: true, maxlength: 200 },
    content: { type: String, required: true },
    tags: [{ type: String }],
    readTime: { type: String, default: '3 min read' },
    isFeatured: { type: Boolean, default: false }, // To pin to top of list
    views: { type: Number, default: 0 },          // To track popularity
    sourceUrl: { type: String },                   // Optional: canonical article URL (news/property sites only; exclude social/login-required)
    country: { type: String },                      // Optional: for dashboard filtering by user markets
    aiSummary: { type: String }                     // Optional: short AI-generated summary (from title only; no publisher content)

}, { timestamps: true });

module.exports = mongoose.model('News', newsSchema);
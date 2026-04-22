const mongoose = require('mongoose');

const MeetingSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String, required: false },
    message: { type: String, required: false },
    
    // Specific fields for this form
    meetingType: { type: String, enum: ['In Person', 'Video Chat'], default: 'In Person' },
    date: { type: String, required: true }, // e.g. "December 16, 2025"
    time: { type: String, required: true }, // e.g. "10:00 AM"
    
    // Context (Which house? Which agent?)
    propertyTitle: { type: String },
    agentName: { type: String }
}, { timestamps: true });

module.exports = mongoose.model('Meeting', MeetingSchema);
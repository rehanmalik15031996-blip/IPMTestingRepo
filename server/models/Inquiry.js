const mongoose = require('mongoose');

const InquirySchema = new mongoose.Schema({
    // 1. We only require 'name' now. 
    // This allows the database to accept "John Doe" or just "John".
    name: { type: String, required: true },
    
    email: { type: String, required: true },
    phone: { type: String, required: true },
    message: { type: String, required: true },
    
    // Optional fields
    propertyId: { type: String, required: false },
    propertyName: { type: String, required: false },
    
    date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Inquiry', InquirySchema);
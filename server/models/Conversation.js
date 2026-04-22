const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema({
    channel: {
        type: String,
        enum: ['whatsapp', 'email', 'internal'],
        required: true,
    },
    participants: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    }],
    externalId: { type: String, default: null },
    title: { type: String, default: '' },
    lastMessage: {
        content: { type: String, default: '' },
        sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date },
    },
    lastActivity: { type: Date, default: Date.now },
    unreadCount: {
        type: Map,
        of: Number,
        default: {},
    },
    metadata: {
        whatsappPhone: String,
        whatsappContactName: String,
        emailSubject: String,
        emailThreadId: String,
        emailFrom: String,
        emailTo: String,
        emailCc: String,
    },
    archived: { type: Boolean, default: false },
}, { timestamps: true });

conversationSchema.index({ participants: 1, lastActivity: -1 });
conversationSchema.index({ channel: 1 });
conversationSchema.index({ externalId: 1 });

module.exports = mongoose.model('Conversation', conversationSchema);

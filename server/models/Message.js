const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    conversationId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
    },
    channel: {
        type: String,
        enum: ['whatsapp', 'email', 'internal'],
        required: true,
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null,
    },
    senderExternal: { type: String, default: null },
    direction: {
        type: String,
        enum: ['inbound', 'outbound'],
        required: true,
    },
    content: { type: String, default: '' },
    attachments: [{
        type: { type: String },
        url: { type: String },
        name: { type: String },
        size: { type: Number },
        propertyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Property' },
    }],
    status: {
        type: String,
        enum: ['pending', 'sent', 'delivered', 'read', 'failed'],
        default: 'sent',
    },
    metadata: {
        whatsappMessageId: String,
        emailMessageId: String,
        emailInReplyTo: String,
        emailTo: String,
        emailCc: String,
    },
}, { timestamps: true });

messageSchema.index({ conversationId: 1, createdAt: 1 });
messageSchema.index({ 'metadata.whatsappMessageId': 1 });
messageSchema.index({ 'metadata.emailMessageId': 1 });

module.exports = mongoose.model('Message', messageSchema);

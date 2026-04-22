const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    type: {
        type: String,
        enum: ['marketing', 'system', 'message'],
        required: true,
    },
    channel: { type: String, default: null },
    title: { type: String, required: true },
    body: { type: String, default: '' },
    linkTo: { type: String, default: null },
    read: { type: Boolean, default: false },
    metadata: { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

notificationSchema.index({ userId: 1, read: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1, read: 1 });

module.exports = mongoose.model('Notification', notificationSchema);

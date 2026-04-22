const connectDB = require('../_lib/mongodb');
const Conversation = require('../../server/models/Conversation');
const Message = require('../../server/models/Message');
const User = require('../../server/models/User');

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || 'ipm_wa_verify';

module.exports = async (req, res) => {
    if (req.method === 'GET') {
        const mode = req.query['hub.mode'];
        const token = req.query['hub.verify_token'];
        const challenge = req.query['hub.challenge'];
        if (mode === 'subscribe' && token === VERIFY_TOKEN) {
            return res.status(200).send(challenge);
        }
        return res.status(403).send('Forbidden');
    }

    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    await connectDB();

    try {
        const body = req.body;
        const entries = body?.entry || [];

        for (const entry of entries) {
            const changes = entry?.changes || [];
            for (const change of changes) {
                if (change.field !== 'messages') continue;
                const value = change.value || {};
                const phoneNumberId = value.metadata?.phone_number_id;
                const msgs = value.messages || [];
                const contacts = value.contacts || [];

                if (!phoneNumberId || !msgs.length) continue;

                const owner = await User.findOne({ 'whatsappBusiness.phoneNumberId': phoneNumberId })
                    .select('_id whatsappBusiness')
                    .lean();
                if (!owner) continue;

                for (const msg of msgs) {
                    const from = msg.from;
                    const contactName = contacts.find(c => c.wa_id === from)?.profile?.name || from;
                    const textBody = msg.text?.body || msg.caption || '';

                    let convo = await Conversation.findOne({
                        channel: 'whatsapp',
                        participants: owner._id,
                        'metadata.whatsappPhone': from,
                    });

                    if (!convo) {
                        convo = await Conversation.create({
                            channel: 'whatsapp',
                            participants: [owner._id],
                            metadata: { whatsappPhone: from, whatsappContactName: contactName },
                            lastActivity: new Date(),
                        });
                    }

                    const existing = await Message.findOne({ 'metadata.whatsappMessageId': msg.id });
                    if (existing) continue;

                    const attachments = [];
                    if (msg.type === 'image' && msg.image) {
                        attachments.push({ type: 'image', url: '', name: msg.image.caption || 'Image' });
                    }
                    if (msg.type === 'document' && msg.document) {
                        attachments.push({ type: 'document', url: '', name: msg.document.filename || 'Document' });
                    }

                    await Message.create({
                        conversationId: convo._id,
                        channel: 'whatsapp',
                        sender: null,
                        senderExternal: from,
                        direction: 'inbound',
                        content: textBody,
                        attachments,
                        status: 'delivered',
                        metadata: { whatsappMessageId: msg.id },
                    });

                    convo.lastMessage = { content: textBody, timestamp: new Date() };
                    convo.lastActivity = new Date();
                    const ownerIdStr = String(owner._id);
                    const current = convo.unreadCount instanceof Map
                        ? convo.unreadCount.get(ownerIdStr) || 0
                        : convo.unreadCount?.[ownerIdStr] || 0;
                    if (convo.unreadCount instanceof Map) {
                        convo.unreadCount.set(ownerIdStr, current + 1);
                    } else {
                        convo.unreadCount = { ...(convo.unreadCount || {}), [ownerIdStr]: current + 1 };
                    }
                    await convo.save();
                }
            }
        }
    } catch (err) {
        console.error('WhatsApp webhook error:', err);
    }

    return res.status(200).json({ status: 'ok' });
};

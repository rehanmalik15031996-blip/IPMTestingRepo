const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const Conversation = require('../../server/models/Conversation');
const Message = require('../../server/models/Message');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  await connectDB();

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const { conversationId, limit = 50, before } = req.query;
    if (!conversationId) return res.status(400).json({ message: 'conversationId required' });

    const convo = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    const filter = { conversationId };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    const unread = convo.unreadCount instanceof Map
      ? convo.unreadCount.get(userId) || 0
      : convo.unreadCount?.[userId] || 0;
    if (unread > 0) {
      convo.unreadCount instanceof Map
        ? convo.unreadCount.set(userId, 0)
        : (convo.unreadCount = { ...convo.unreadCount, [userId]: 0 });
      await convo.save();
    }

    return res.status(200).json({ success: true, messages: messages.reverse() });
  }

  if (req.method === 'POST') {
    const { conversationId, content, attachments } = req.body;
    if (!conversationId) return res.status(400).json({ message: 'conversationId required' });
    if (!content && (!attachments || !attachments.length)) {
      return res.status(400).json({ message: 'Content or attachments required' });
    }

    const convo = await Conversation.findOne({ _id: conversationId, participants: userId });
    if (!convo) return res.status(404).json({ message: 'Conversation not found' });

    const msg = await Message.create({
      conversationId,
      channel: convo.channel,
      sender: userId,
      direction: 'outbound',
      content: content || '',
      attachments: attachments || [],
      status: 'sent',
    });

    convo.lastMessage = { content: content || '(attachment)', sender: userId, timestamp: new Date() };
    convo.lastActivity = new Date();
    for (const pid of convo.participants) {
      const pidStr = String(pid);
      if (pidStr !== userId) {
        const current = convo.unreadCount instanceof Map
          ? convo.unreadCount.get(pidStr) || 0
          : convo.unreadCount?.[pidStr] || 0;
        convo.unreadCount instanceof Map
          ? convo.unreadCount.set(pidStr, current + 1)
          : (convo.unreadCount = { ...(convo.unreadCount || {}), [pidStr]: current + 1 });
      }
    }
    await convo.save();

    return res.status(201).json({ success: true, message: msg });
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

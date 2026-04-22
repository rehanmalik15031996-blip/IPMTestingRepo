const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const Conversation = require('../../server/models/Conversation');
const Message = require('../../server/models/Message');
const User = require('../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  await connectDB();

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const { channel, unreadOnly } = req.query;
    const filter = { participants: userId, archived: { $ne: true } };
    if (channel && channel !== 'all') filter.channel = channel;

    let convos = await Conversation.find(filter)
      .sort({ lastActivity: -1 })
      .limit(50)
      .lean();

    if (unreadOnly === 'true') {
      convos = convos.filter(c => (c.unreadCount?.get?.(userId) || c.unreadCount?.[userId] || 0) > 0);
    }

    const participantIds = [...new Set(convos.flatMap(c => c.participants.map(String)))];
    const users = await User.find({ _id: { $in: participantIds } })
      .select('name agencyName photo role')
      .lean();
    const userMap = {};
    for (const u of users) userMap[String(u._id)] = u;

    const result = convos.map(c => ({
      ...c,
      unread: c.unreadCount?.[userId] || 0,
      participantDetails: c.participants.map(pid => userMap[String(pid)] || { _id: pid }),
    }));

    const totalUnread = result.reduce((sum, c) => sum + c.unread, 0);

    return res.status(200).json({ success: true, conversations: result, totalUnread });
  }

  if (req.method === 'POST' && req.body?.action === 'mark-channel-read') {
    const { channel } = req.body;
    if (!channel) return res.status(400).json({ message: 'Channel required' });
    const convos = await Conversation.find({ participants: userId, channel, archived: { $ne: true } });
    let cleared = 0;
    for (const c of convos) {
      const val = c.unreadCount instanceof Map ? c.unreadCount.get(userId) || 0 : c.unreadCount?.[userId] || 0;
      if (val > 0) {
        c.unreadCount instanceof Map ? c.unreadCount.set(userId, 0) : (c.unreadCount = { ...c.unreadCount, [userId]: 0 });
        await c.save();
        cleared++;
      }
    }
    return res.status(200).json({ success: true, cleared });
  }

  if (req.method === 'POST') {
    const { channel, participantIds, title, metadata } = req.body;
    if (!channel) return res.status(400).json({ message: 'Channel required' });

    if (channel === 'internal' && participantIds?.length) {
      const allParticipants = [userId, ...participantIds.filter(id => id !== userId)];
      const existing = await Conversation.findOne({
        channel: 'internal',
        participants: { $all: allParticipants, $size: allParticipants.length },
      });
      if (existing) return res.status(200).json({ success: true, conversation: existing });
    }

    const participants = channel === 'internal'
      ? [userId, ...(participantIds || []).filter(id => id !== userId)]
      : [userId];

    const convo = await Conversation.create({
      channel,
      participants,
      title: title || '',
      metadata: metadata || {},
      lastActivity: new Date(),
    });

    return res.status(201).json({ success: true, conversation: convo });
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

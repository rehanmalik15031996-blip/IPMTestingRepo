const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const Notification = require('../../server/models/Notification');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  await connectDB();

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  if (req.method === 'GET') {
    const { type, unreadOnly, limit = 30 } = req.query;
    const filter = { userId };
    if (type) filter.type = type;
    if (unreadOnly === 'true') filter.read = false;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    const unreadCount = await Notification.countDocuments({ userId, read: false, type: { $in: ['marketing', 'system'] } });

    return res.status(200).json({ success: true, notifications, unreadCount });
  }

  if (req.method === 'POST') {
    const { action, notificationId } = req.body;

    if (action === 'mark-read' && notificationId) {
      await Notification.updateOne({ _id: notificationId, userId }, { read: true });
      return res.status(200).json({ success: true });
    }

    if (action === 'mark-all-read') {
      await Notification.updateMany({ userId, read: false }, { read: true });
      return res.status(200).json({ success: true });
    }

    return res.status(400).json({ message: 'Invalid action' });
  }

  return res.status(405).json({ message: 'Method not allowed' });
};

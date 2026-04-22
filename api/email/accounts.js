// GET /api/email/accounts?userId=... – list connected emails (no tokens)
// DELETE /api/email/accounts – body: { userId, grantId } or { userId, connectionId } – disconnect one
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const User = require('../../server/models/User');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  const userId = req.method === 'GET' ? req.query.userId : (req.body || {}).userId;
  if (!userId) return res.status(400).json({ message: 'userId required' });

  try {
    await connectDB();
    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    if (req.method === 'GET') {
      const list = Array.isArray(user.emailConnections) ? user.emailConnections : [];
      const accounts = list.map(c => ({
        connectionId: c.connectionId || c.grantId,
        grantId: c.connectionId || c.grantId,
        email: c.email,
        provider: c.provider || 'google',
      }));
      return res.status(200).json({ accounts });
    }

    if (req.method === 'DELETE') {
      const id = (req.body || {}).grantId || (req.body || {}).connectionId;
      if (!id) return res.status(400).json({ message: 'grantId or connectionId required' });
      const connections = Array.isArray(user.emailConnections) ? user.emailConnections : [];
      user.emailConnections = connections.filter(c => c.connectionId !== id && c.grantId !== id);
      await user.save();
      return res.status(200).json({ success: true });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Email accounts error:', err);
    return res.status(500).json({ message: err.message || 'Server error' });
  }
};

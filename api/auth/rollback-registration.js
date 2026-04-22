// Removes a user created during registration when Stripe checkout creation failed.
// Only allows deletion if the user has no Stripe subscription and was created recently.
const connectDB = require('../_lib/mongodb');
const User = require('../../server/models/User');

const MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      return res.status(400).json({ message: 'Invalid JSON' });
    }
  }
  const userId = body?.userId;
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  try {
    await connectDB();
    const user = await User.findById(userId).select('stripeSubscriptionId stripeCustomerId createdAt').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.stripeSubscriptionId) {
      return res.status(400).json({ message: 'Cannot rollback: user has an active subscription' });
    }
    const createdAt = user.createdAt ? new Date(user.createdAt).getTime() : 0;
    if (Date.now() - createdAt > MAX_AGE_MS) {
      return res.status(400).json({ message: 'Cannot rollback: registration is too old' });
    }
    await User.findByIdAndDelete(userId);
    return res.status(200).json({ success: true, message: 'Registration rolled back. You can try again.' });
  } catch (err) {
    console.error('Rollback registration error:', err);
    return res.status(500).json({ message: err.message || 'Failed to rollback' });
  }
};

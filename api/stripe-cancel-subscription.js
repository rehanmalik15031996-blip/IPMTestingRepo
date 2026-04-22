// Cancels the user's Stripe subscription (at period end by default).
const connectDB = require('./_lib/mongodb');
const User = require('../server/models/User');
const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  if (!secret) {
    return res.status(500).json({ message: 'Stripe is not configured' });
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
  const cancelAtPeriodEnd = body?.cancelAtPeriodEnd !== false;

  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  try {
    await connectDB();
    const user = await User.findById(userId).select('stripeSubscriptionId').lean();
    if (!user?.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No active subscription to cancel' });
    }

    const stripe = new Stripe(secret);
    if (cancelAtPeriodEnd) {
      await stripe.subscriptions.update(user.stripeSubscriptionId, {
        cancel_at_period_end: true
      });
      await User.findByIdAndUpdate(userId, { subscriptionStatus: 'canceled' });
      const updated = await User.findById(userId).lean();
      const { password: _, ...out } = updated;
      return res.status(200).json({
        success: true,
        message: 'Your subscription will cancel at the end of the current billing period.',
        user: out
      });
    } else {
      await stripe.subscriptions.cancel(user.stripeSubscriptionId);
      await User.findByIdAndUpdate(userId, { subscriptionStatus: 'canceled' });
      const updated = await User.findById(userId).lean();
      const { password: _, ...out } = updated;
      return res.status(200).json({
        success: true,
        message: 'Subscription canceled.',
        user: out
      });
    }
  } catch (err) {
    console.error('Stripe cancel subscription error:', err);
    return res.status(500).json({ message: err.message || 'Failed to cancel subscription' });
  }
};

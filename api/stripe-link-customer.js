// Syncs app user with Stripe by email: if Stripe has a customer with this email, updates the user record.
// Used automatically when opening Settings → Subscription so the UI shows the right state.
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
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  try {
    await connectDB();
    const user = await User.findById(userId).select('email name stripeCustomerId').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.stripeCustomerId) {
      const full = await User.findById(userId).lean();
      const { password: _, ...out } = full;
      return res.status(200).json({ success: true, linked: false, user: out });
    }
    const email = (user.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ message: 'User has no email' });
    }

    const stripe = new Stripe(secret);
    const customers = await stripe.customers.list({ email, limit: 1 });
    const customer = customers.data[0];
    if (!customer) {
      const full = await User.findById(userId).lean();
      const { password: _, ...out } = full;
      return res.status(200).json({ success: true, linked: false, user: out });
    }

    const customerName = (user.name || user.email || '').trim() || 'Customer';
    await stripe.customers.update(customer.id, { name: customerName });

    const subscriptions = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'active',
      limit: 1
    });
    const trialSubs = await stripe.subscriptions.list({
      customer: customer.id,
      status: 'trialing',
      limit: 1
    });
    const sub = subscriptions.data[0] || trialSubs.data[0];
    const status = sub ? (sub.status === 'active' ? 'active' : sub.status === 'trialing' ? 'active' : sub.status) : null;

    await User.findByIdAndUpdate(userId, {
      stripeCustomerId: customer.id,
      ...(sub && { stripeSubscriptionId: sub.id }),
      ...(status && { subscriptionStatus: status })
    });

    const updated = await User.findById(userId).lean();
    const { password: __, ...userWithoutPassword } = updated;
    return res.status(200).json({
      success: true,
      linked: true,
      user: userWithoutPassword
    });
  } catch (err) {
    console.error('Stripe link customer error:', err);
    return res.status(500).json({ message: err.message || 'Failed to sync subscription' });
  }
};

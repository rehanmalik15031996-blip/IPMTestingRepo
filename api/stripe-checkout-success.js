// Called when user lands on registration success page with Stripe session_id.
// Updates the user immediately from the Checkout Session so we don't rely on the webhook.
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
  const sessionId = body?.session_id;
  if (!sessionId) {
    return res.status(400).json({ message: 'session_id is required' });
  }

  try {
    const stripe = new Stripe(secret);
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['subscription']
    });
    if (!session || session.status !== 'complete') {
      return res.status(400).json({ message: 'Checkout session not complete' });
    }
    const userId = session.client_reference_id;
    if (!userId) {
      return res.status(400).json({ message: 'No user linked to this session' });
    }

    await connectDB();
    await User.findByIdAndUpdate(userId, {
      stripeCustomerId: session.customer,
      stripeSubscriptionId: session.subscription?.id || session.subscription,
      subscriptionStatus: 'active'
    });
    const user = await User.findById(userId).lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    const { password: _, ...userWithoutPassword } = user;
    return res.status(200).json({ success: true, user: userWithoutPassword });
  } catch (err) {
    console.error('Stripe checkout-success error:', err);
    return res.status(500).json({ message: err.message || 'Failed to confirm subscription' });
  }
};

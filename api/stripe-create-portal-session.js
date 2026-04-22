// Creates a Stripe Customer Billing Portal session so the user can manage subscription (change plan, cancel, update payment).
const connectDB = require('./_lib/mongodb');
const User = require('../server/models/User');
const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const secret = process.env.STRIPE_SECRET_KEY;
  const returnUrl = process.env.STRIPE_PORTAL_RETURN_URL || `${req.headers.origin || ''}/settings`;

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
    const user = await User.findById(userId).select('stripeCustomerId').lean();
    if (!user || !user.stripeCustomerId) {
      return res.status(400).json({ message: 'No subscription to manage. Subscribe first from registration or upgrade your plan.' });
    }

    const stripe = new Stripe(secret);
    const session = await stripe.billingPortal.sessions.create({
      customer: user.stripeCustomerId,
      return_url: returnUrl
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe portal session error:', err);
    return res.status(500).json({ message: err.message || 'Failed to open billing portal' });
  }
};

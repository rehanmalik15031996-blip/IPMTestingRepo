// Changes the user's subscription to a different plan (in-app, no Stripe redirect).
const connectDB = require('./_lib/mongodb');
const User = require('../server/models/User');
const Stripe = require('stripe');

const AGENCY_OPTION_KEYS = ['10-100', '15-150', '20-200', '25-250'];

const DEFAULT_NET = { Basic: 19, Premium: 139, '10-100': 980, '15-150': 1470, '20-200': 1960, '25-250': 2450, AgentBasic: 59 };

function grossFromNet(netDollars, feePercent = 2.9, feeFixedDollars = 0.30) {
  const pct = (parseFloat(process.env.STRIPE_FEE_PERCENT) || feePercent) / 100;
  const fixed = parseFloat(process.env.STRIPE_FEE_FIXED) || feeFixedDollars;
  const gross = (netDollars + fixed) / (1 - pct);
  return Math.round(gross * 100) / 100;
}

function resolvePriceId(stripe, priceOrProductId) {
  if (!priceOrProductId) return null;
  if (priceOrProductId.startsWith('price_')) return Promise.resolve(priceOrProductId);
  return stripe.prices.list({ product: priceOrProductId, active: true }).then(({ data: prices }) => {
    const recurring = prices.find((p) => p.recurring);
    return recurring ? recurring.id : null;
  });
}

async function getProductIdAndCurrency(stripe, priceOrProductId) {
  if (priceOrProductId.startsWith('price_')) {
    const price = await stripe.prices.retrieve(priceOrProductId);
    return { productId: price.product, currency: (price.currency || 'usd').toLowerCase() };
  }
  const prices = await stripe.prices.list({ product: priceOrProductId, active: true });
  const recurring = prices.data.find((p) => p.recurring);
  if (!recurring) return null;
  return { productId: priceOrProductId, currency: (recurring.currency || 'usd').toLowerCase() };
}

async function findOrCreatePriceWithAmount(stripe, productId, currency, grossDollars) {
  const unitAmount = Math.round(grossDollars * 100);
  const { data: prices } = await stripe.prices.list({ product: productId, active: true, type: 'recurring' });
  const existing = prices.find((p) => p.unit_amount === unitAmount && (p.recurring?.interval === 'month'));
  if (existing) return existing.id;
  const price = await stripe.prices.create({
    product: productId,
    currency,
    unit_amount: unitAmount,
    recurring: { interval: 'month' }
  });
  return price.id;
}

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
  const { userId, plan, planOption } = body || {};
  if (!userId || !plan) {
    return res.status(400).json({ message: 'userId and plan are required' });
  }
  if (plan === 'Custom' || plan === 'Free') {
    return res.status(400).json({ message: 'Switch to Custom or Free via contact / upgrade flow' });
  }

  const stripe = new Stripe(secret);
  let priceOrProductId = null;
  let effectiveRole = null;

  try {
    await connectDB();
    const user = await User.findById(userId).select('role stripeSubscriptionId subscriptionPlan').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (!user.stripeSubscriptionId) {
      return res.status(400).json({ message: 'No active subscription. Complete payment first.' });
    }

    effectiveRole = (user.role || '').toLowerCase();

    if (['buyer', 'seller', 'investor'].includes(effectiveRole)) {
      if (plan !== 'Basic' && plan !== 'Premium') {
        return res.status(400).json({ message: 'Invalid plan for your account type' });
      }
      priceOrProductId = plan === 'Basic' ? process.env.STRIPE_PRICE_BASIC : process.env.STRIPE_PRICE_PREMIUM;
    } else if (effectiveRole === 'agency') {
      if (plan !== 'Premium' || !AGENCY_OPTION_KEYS.includes(planOption)) {
        return res.status(400).json({ message: 'Agency requires Premium and a tier (10-100, 15-150, 20-200, 25-250)' });
      }
      priceOrProductId = process.env[`STRIPE_PRICE_AGENCY_${planOption.replace(/-/g, '_')}`];
    } else if (['independent_agent', 'agency_agent', 'agent'].includes(effectiveRole)) {
      if (plan !== 'Basic') {
        return res.status(400).json({ message: 'Invalid plan for your account type' });
      }
      priceOrProductId = process.env.STRIPE_PRICE_AGENT_BASIC;
    } else {
      return res.status(400).json({ message: 'Unsupported account type' });
    }

    if (!priceOrProductId) {
      return res.status(500).json({ message: 'Plan not configured' });
    }

    const passFees = process.env.STRIPE_PASS_FEES_TO_CUSTOMER === 'true' || process.env.STRIPE_PASS_FEES_TO_CUSTOMER === '1';
    let newPriceId;
    if (passFees) {
      const productInfo = await getProductIdAndCurrency(stripe, priceOrProductId);
      if (!productInfo) return res.status(500).json({ message: 'Could not resolve product for this plan' });
      let netDollars;
      if (effectiveRole === 'agency' && planOption) {
        netDollars = parseFloat(process.env[`STRIPE_NET_AGENCY_${planOption.replace(/-/g, '_')}`]) || DEFAULT_NET[planOption];
      } else if (['independent_agent', 'agency_agent', 'agent'].includes(effectiveRole)) {
        netDollars = parseFloat(process.env.STRIPE_NET_AGENT_BASIC) || DEFAULT_NET.AgentBasic;
      } else {
        netDollars = parseFloat(process.env[`STRIPE_NET_${plan.toUpperCase()}`]) || DEFAULT_NET[plan];
      }
      if (netDollars == null || isNaN(netDollars)) return res.status(500).json({ message: 'Net amount not configured for this plan' });
      const grossDollars = grossFromNet(netDollars);
      newPriceId = await findOrCreatePriceWithAmount(stripe, productInfo.productId, productInfo.currency, grossDollars);
    } else {
      newPriceId = await resolvePriceId(stripe, priceOrProductId);
    }
    if (!newPriceId) {
      return res.status(500).json({ message: 'Could not resolve price for this plan' });
    }

    const sub = await stripe.subscriptions.retrieve(user.stripeSubscriptionId);
    const itemId = sub.items?.data?.[0]?.id;
    if (!itemId) {
      return res.status(400).json({ message: 'Subscription has no items' });
    }

    // If subscription is still in trial, preserve trial_end and do not charge until trial ends
    const nowSec = Math.floor(Date.now() / 1000);
    const inTrial = sub.trial_end && sub.trial_end > nowSec;
    const updatePayload = {
      items: [{ id: itemId, price: newPriceId }],
      proration_behavior: inTrial ? 'none' : 'create_prorations',
      cancel_at_period_end: false
    };
    if (inTrial) updatePayload.trial_end = sub.trial_end;

    await stripe.subscriptions.update(user.stripeSubscriptionId, updatePayload);

    const updateFields = { subscriptionPlan: plan, subscriptionStatus: 'active' };
    if (planOption) updateFields.subscriptionPlanOption = planOption;
    await User.findByIdAndUpdate(userId, updateFields);

    const updated = await User.findById(userId).lean();
    const { password: _, ...out } = updated;
    return res.status(200).json({ success: true, message: 'Plan updated.', user: out });
  } catch (err) {
    console.error('Stripe change plan error:', err);
    return res.status(500).json({ message: err.message || 'Failed to change plan' });
  }
};

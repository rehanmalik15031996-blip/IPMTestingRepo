// Creates a Stripe Checkout Session for subscriptions.
// Buyer/Seller/Investor: Basic ($19) or Premium ($139). Agency: Premium tiers. Agent: Basic ($59).
// Uses trial_end so the first charge is on April 1 (February + March free) when applicable.
const connectDB = require('./_lib/mongodb');
const User = require('../server/models/User');
const Stripe = require('stripe');

const AGENCY_OPTION_KEYS = ['10-100', '15-150', '20-200', '25-250'];

// Default net amounts (what you receive) in USD — overridable by STRIPE_NET_* env
const DEFAULT_NET = {
  Basic: 19,
  Premium: 139,
  '10-100': 980,
  '15-150': 1470,
  '20-200': 1960,
  '25-250': 2450,
  AgentBasic: 59
};

/**
 * Stripe US card fee: 2.9% + $0.30. So: net = gross - (0.029 * gross + 0.30) => gross = (net + 0.30) / (1 - 0.029).
 * Fee % and fixed amount can be overridden with STRIPE_FEE_PERCENT and STRIPE_FEE_FIXED (in dollars).
 */
function grossFromNet(netDollars, feePercent = 2.9, feeFixedDollars = 0.30) {
  const pct = (parseFloat(process.env.STRIPE_FEE_PERCENT) || feePercent) / 100;
  const fixed = parseFloat(process.env.STRIPE_FEE_FIXED) || feeFixedDollars;
  const gross = (netDollars + fixed) / (1 - pct);
  return Math.round(gross * 100) / 100;
}

/**
 * Returns Unix timestamp for trial end (April 1) when signup is before April 1; null on/after April 1 (no trial, pay now).
 * No 2-day minimum: even signup on March 31 gets trial until April 1. If Stripe rejects (< 2 days), we fall back to no trial.
 */
function getTrialEndTimestamp() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const april1ThisYear = new Date(Date.UTC(year, 3, 1, 0, 0, 0, 0)); // month 3 = April
  if (now < april1ThisYear) {
    return Math.floor(april1ThisYear.getTime() / 1000);
  }
  return null; // on or after April 1: no trial
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
  const { data: prices } = await stripe.prices.list({
    product: productId,
    active: true,
    type: 'recurring'
  });
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
  const successUrl = process.env.STRIPE_SUCCESS_URL || `${req.headers.origin || ''}/registration/success`;
  const cancelUrl = process.env.STRIPE_CANCEL_URL || `${req.headers.origin || ''}/client-registration`;

  if (!secret) {
    console.error('STRIPE_SECRET_KEY is not set');
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
  const { plan, userId, role, planOption } = body || {};
  if (!userId) {
    return res.status(400).json({ message: 'userId is required' });
  }

  const stripe = new Stripe(secret);
  let priceOrProductId = null;
  const effectiveRole = (role || '').toLowerCase();

  // Buyer / Seller / Investor: Basic or Premium (existing)
  if (['buyer', 'seller', 'investor'].includes(effectiveRole)) {
    if (plan !== 'Basic' && plan !== 'Premium') {
      return res.status(400).json({ message: 'plan must be Basic or Premium for this role' });
    }
    priceOrProductId = plan === 'Basic' ? process.env.STRIPE_PRICE_BASIC : process.env.STRIPE_PRICE_PREMIUM;
  }
  // Agency: Premium with planOption (10-100, 15-150, 20-200, 25-250)
  else if (effectiveRole === 'agency') {
    if (plan !== 'Premium' || !AGENCY_OPTION_KEYS.includes(planOption)) {
      return res.status(400).json({ message: 'Agency requires plan Premium and planOption one of: ' + AGENCY_OPTION_KEYS.join(', ') });
    }
    const envKey = `STRIPE_PRICE_AGENCY_${planOption.replace(/-/g, '_')}`;
    priceOrProductId = process.env[envKey];
  }
  // Independent agent: Basic
  else if (effectiveRole === 'independent_agent' || effectiveRole === 'agent') {
    if (plan !== 'Basic') {
      return res.status(400).json({ message: 'Agent plan must be Basic for checkout' });
    }
    priceOrProductId = process.env.STRIPE_PRICE_AGENT_BASIC;
  }
  else {
    return res.status(400).json({ message: 'Unsupported role for checkout' });
  }

  if (!priceOrProductId) {
    console.error('Stripe price not configured for this plan/role/option');
    return res.status(500).json({ message: 'Stripe price not configured for this plan' });
  }

  try {
    await connectDB();
    const user = await User.findById(userId).select('email name subscriptionPlan role stripeCustomerId').lean();
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    if (user.subscriptionPlan !== plan) {
      return res.status(400).json({ message: 'User plan does not match' });
    }

    const customerName = (user.name || user.email || '').trim() || 'Customer';
    let customerId = user.stripeCustomerId;

    if (customerId) {
      await stripe.customers.update(customerId, { name: customerName });
    } else {
      const customer = await stripe.customers.create({
        email: (user.email || '').trim().toLowerCase(),
        name: customerName
      });
      customerId = customer.id;
    }

    const passFees = process.env.STRIPE_PASS_FEES_TO_CUSTOMER === 'true' || process.env.STRIPE_PASS_FEES_TO_CUSTOMER === '1';
    let priceId;

    if (passFees) {
      const productInfo = await getProductIdAndCurrency(stripe, priceOrProductId);
      if (!productInfo) {
        return res.status(500).json({ message: 'Could not resolve product for this plan' });
      }
      let netDollars;
      if (effectiveRole === 'agency' && planOption) {
        netDollars = parseFloat(process.env[`STRIPE_NET_AGENCY_${planOption.replace(/-/g, '_')}`]) || DEFAULT_NET[planOption];
      } else if (['independent_agent', 'agency_agent', 'agent'].includes(effectiveRole)) {
        netDollars = parseFloat(process.env.STRIPE_NET_AGENT_BASIC) || DEFAULT_NET.AgentBasic;
      } else {
        netDollars = parseFloat(process.env[`STRIPE_NET_${plan.toUpperCase()}`]) || DEFAULT_NET[plan];
      }
      if (netDollars == null || isNaN(netDollars)) {
        return res.status(500).json({ message: 'Net amount not configured for this plan' });
      }
      const grossDollars = grossFromNet(netDollars);
      priceId = await findOrCreatePriceWithAmount(stripe, productInfo.productId, productInfo.currency, grossDollars);
    } else {
      priceId = await resolvePriceId(stripe, priceOrProductId);
    }

    if (!priceId) {
      return res.status(500).json({ message: 'No recurring price found for this product' });
    }

    const trialEnd = getTrialEndTimestamp();
    const metadata = { userId: String(userId), plan };
    if (planOption) metadata.planOption = planOption;

    const subscriptionData = { metadata };
    if (trialEnd != null) subscriptionData.trial_end = trialEnd;

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        mode: 'subscription',
        payment_method_types: ['card'],
        line_items: [{ price: priceId, quantity: 1 }],
        subscription_data: subscriptionData,
        client_reference_id: String(userId),
        customer: customerId,
        success_url: successUrl + (successUrl.includes('?') ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}',
        cancel_url: cancelUrl
      });
    } catch (trialErr) {
      // Stripe requires trial_end to be at least 2 days in the future. If they sign up in the last 2 days of March, retry without trial so they pay immediately.
      const isTrialEndError = trialErr.message && String(trialErr.message).toLowerCase().includes('trial_end') && String(trialErr.message).toLowerCase().includes('at least 2 days');
      if (trialEnd != null && isTrialEndError) {
        delete subscriptionData.trial_end;
        session = await stripe.checkout.sessions.create({
          mode: 'subscription',
          payment_method_types: ['card'],
          line_items: [{ price: priceId, quantity: 1 }],
          subscription_data: subscriptionData,
          client_reference_id: String(userId),
          customer: customerId,
          success_url: successUrl + (successUrl.includes('?') ? '&' : '?') + 'session_id={CHECKOUT_SESSION_ID}',
          cancel_url: cancelUrl
        });
      } else {
        throw trialErr;
      }
    }

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe create-checkout error:', err);
    const msg = err.message || 'Failed to create checkout session';
    if (err.type && String(err.type).startsWith('Stripe')) {
      return res.status(400).json({ message: msg });
    }
    return res.status(500).json({ message: msg });
  }
};

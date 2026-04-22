// Stripe webhook: updates user subscription status.
// ESM so Vercel gives us Request and we get raw body via request.text().
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const connectDB = require('./_lib/mongodb');
const User = require('../server/models/User');
const Stripe = require('stripe');

async function handleEvent(event) {
  await connectDB();
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const userId = session.client_reference_id || session.subscription_data?.metadata?.userId;
      if (userId) {
        await User.findByIdAndUpdate(userId, {
          subscriptionStatus: 'active',
          stripeCustomerId: session.customer || undefined,
          stripeSubscriptionId: session.subscription || undefined
        });
      }
      break;
    }
    case 'customer.subscription.updated': {
      const sub = event.data.object;
      if (sub.metadata?.userId) {
        const status = sub.status === 'active' ? 'active' : sub.status === 'canceled' || sub.status === 'unpaid' ? 'canceled' : 'past_due';
        await User.findOneAndUpdate(
          { stripeSubscriptionId: sub.id },
          { $set: { subscriptionStatus: status } }
        );
      }
      break;
    }
    case 'customer.subscription.deleted': {
      const sub = event.data.object;
      await User.updateOne(
        { stripeSubscriptionId: sub.id },
        { $set: { subscriptionStatus: 'canceled' } }
      );
      break;
    }
    default:
      break;
  }
}

function jsonResponse(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json' }
  });
}

export async function POST(request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;
  if (!secret || !stripeSecret) {
    console.error('STRIPE_WEBHOOK_SECRET or STRIPE_SECRET_KEY not set');
    return jsonResponse({ message: 'Webhook not configured' }, 500);
  }

  const rawBody = await request.text();
  const sig = request.headers.get('stripe-signature');
  if (!sig) {
    return jsonResponse({ message: 'Missing stripe-signature' }, 400);
  }

  let event;
  try {
    const stripe = new Stripe(stripeSecret);
    event = stripe.webhooks.constructEvent(
      Buffer.from(rawBody, 'utf8'),
      sig,
      secret
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return jsonResponse({ message: 'Invalid signature' }, 400);
  }

  try {
    await handleEvent(event);
  } catch (e) {
    console.error('DB connect or handler error:', e);
    return jsonResponse({ message: 'Handler error' }, 500);
  }

  return jsonResponse({ received: true });
}

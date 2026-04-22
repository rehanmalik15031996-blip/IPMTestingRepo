# Stripe setup for subscription plans

Use this guide to set up Stripe in **test mode** first, then switch to **live** when ready.

## 1. Stripe Dashboard (test mode)

1. Log in at [dashboard.stripe.com](https://dashboard.stripe.com).
2. **Toggle "Test mode" ON** (top right) so all actions use test data.
3. **Account / business name (required for Checkout)**  
   To use Stripe Checkout, you must set an account or business name: go to [dashboard.stripe.com/account](https://dashboard.stripe.com/account) and fill in **Business name** (or the name that should appear on receipts and in the Dashboard). Without this, creating a Checkout session returns an error and the app cannot redirect users to pay.
4. **Products & Prices**
   - Go to **Product catalog** → **Add product**.
   - **Basic plan**
     - Name: `Basic` (or e.g. `IPM Basic`)
     - Description: optional (e.g. “1 Property”)
     - **Add a price**: Recurring, **Monthly**, **$19.00 USD**.
     - Save the product.
   - **Premium plan**
     - Add another product: Name `Premium`, optional description.
     - Add a price: Recurring, **Monthly**, **$139.00 USD**.
     - Save the product.

   **Where to find the Price ID (not the Product ID)**  
   The dashboard shows **Product ID** (`prod_…`) on the product page. The **Price ID** (`price_…`) is on the same product:
   - Open the product (e.g. **Basic**).
   - In the **Pricing** section you’ll see the price(s) (e.g. **$19.00 / month**). Each price has its own ID.
   - Click the price row or the **⋮** menu next to it → **Copy price ID**, or click the price and copy the ID from the URL or the detail panel.
   - You need the **Price ID** (`price_…`) for the env vars below.  
   **Alternatively**, you can set `STRIPE_PRICE_BASIC` and `STRIPE_PRICE_PREMIUM` to your **Product ID** (`prod_…`); the app will use that product’s first recurring price automatically.

   **Agency Premium (dropdown tiers)**  
   Create four products (or one product with four prices), each **Monthly** recurring:
   - 10 Users, 100 Listings → **$980/mo** → env: `STRIPE_PRICE_AGENCY_10_100`
   - 15 Users, 150 Listings → **$1,470/mo** → env: `STRIPE_PRICE_AGENCY_15_150`
   - 20 Users, 200 Listings → **$1,960/mo** → env: `STRIPE_PRICE_AGENCY_20_200`
   - 25 Users, 250 Listings → **$2,450/mo** → env: `STRIPE_PRICE_AGENCY_25_250`  
   Use each product’s **Price ID** (or Product ID) for the corresponding env var.

   **Agent Basic**  
   One product: **Basic** (or “Agent Basic”), **Monthly**, **$59.00 USD** → env: `STRIPE_PRICE_AGENT_BASIC`.

5. **Customer Billing Portal (for Settings → Subscription)**  
   In Stripe: **Settings** → **Billing** → **Customer portal** → turn on and configure (e.g. allow customers to switch plans and cancel). The app sends users to this portal from Settings → Subscription.

6. **API keys (test)**
   - **Developers** → **API keys**.
   - Copy **Publishable key** (starts with `pk_test_`) and **Secret key** (starts with `sk_test_`).

## 2. Environment variables (test)

Set these in your app (e.g. Vercel env or `.env`):

- `STRIPE_SECRET_KEY` = your test **Secret key** (`sk_test_…`)
- `STRIPE_WEBHOOK_SECRET` = leave empty for now; set after adding the webhook (step 4)
- `STRIPE_PRICE_BASIC` = Buyer/Seller Basic **Price ID** or **Product ID**
- `STRIPE_PRICE_PREMIUM` = Buyer/Seller Premium **Price ID** or **Product ID**
- `STRIPE_PRICE_AGENT_BASIC` = Independent Agent Basic **Price ID** or **Product ID** ($59/mo)
- `STRIPE_PRICE_AGENCY_10_100` = Agency Premium 10–100 **Price ID** or **Product ID** ($980/mo)
- `STRIPE_PRICE_AGENCY_15_150` = Agency Premium 15–150 ($1,470/mo)
- `STRIPE_PRICE_AGENCY_20_200` = Agency Premium 20–200 ($1,960/mo)
- `STRIPE_PRICE_AGENCY_25_250` = Agency Premium 25–250 ($2,450/mo)

Base URL for success/cancel and portal return (e.g. your deployed app or `http://localhost:3000`):

- `STRIPE_SUCCESS_URL` = e.g. `https://your-domain.com/registration/success`
- `STRIPE_CANCEL_URL` = e.g. `https://your-domain.com/client-registration`
- `STRIPE_PORTAL_RETURN_URL` = e.g. `https://your-domain.com/settings` (where users return after managing subscription)

**Optional — pass Stripe fees to the customer:** Set `STRIPE_PASS_FEES_TO_CUSTOMER=true` so the customer pays your package price plus the processing fee (you receive the full package amount). Default fee: 2.9% + $0.30 (US). Net amounts default to Basic $19, Premium $139, Agent $59, Agency tiers $980–$2,450; override with `STRIPE_NET_BASIC`, `STRIPE_NET_PREMIUM`, etc. Optional: `STRIPE_FEE_PERCENT`, `STRIPE_FEE_FIXED`.

## 3. “February free” → first charge March 1

The app creates subscriptions with a **trial** so the first charge is on **March 1**.  
When a user signs up in February, `trial_end` is set to March 1 00:00 UTC; Stripe charges on that date.  
No code change is needed for “February free” beyond using the existing trial logic.

## 4. Webhook (test mode)

1. **Developers** → **Webhooks** → **Add endpoint**.
2. **Endpoint URL:** Your app URL + `/api/stripe-webhook`, e.g. `https://your-app.vercel.app/api/stripe-webhook` (deploy your app first so this URL is reachable).
3. **Events to send**: select (or “Select all” then narrow):
   - `checkout.session.completed`
   - `customer.subscription.updated`
   - `customer.subscription.deleted`
   - `invoice.paid` (optional, for extra certainty)
4. After creating the endpoint, open it and click **Reveal** under **Signing secret**.
5. Copy that value (starts with `whsec_`) — you will add it to your app in step 4c.

The webhook handler needs the **raw** request body to verify Stripe’s signature. On Vercel you do not need to configure anything else; the webhook is set up to receive the raw body correctly.

**4c. Add the secret to your app**  
In Vercel: **Settings** → **Environment Variables** → add `STRIPE_WEBHOOK_SECRET` with the `whsec_...` value → **Redeploy**.

**4d. Local testing:** Install the [Stripe CLI](https://stripe.com/docs/stripe-cli) and run `stripe listen --forward-to localhost:3000/api/stripe-webhook`. Use the signing secret the CLI prints as `STRIPE_WEBHOOK_SECRET` in your local env.

## 5. Account / business name (required for Checkout)

Stripe Checkout will return an error if your Stripe account has no business name set:

- **Error:** *"In order to use Checkout, you must set an account or business name at https://dashboard.stripe.com/account."*
- **Fix:** Go to [dashboard.stripe.com](https://dashboard.stripe.com) → **Settings** → **Account** (or open [dashboard.stripe.com/account](https://dashboard.stripe.com/account)), and set your **Business name** (and any other required profile fields). Save, then try Checkout again.

## 6. Testing in test mode

- Use test cards: [Stripe test cards](https://docs.stripe.com/testing#cards), e.g. `4242 4242 4242 4242`.
- Create a user with role **buyer** or **seller**, choose **Basic** or **Premium**, complete registration; you should be redirected to Stripe Checkout.
- After payment (or starting a trial), you should be redirected to the success URL and the user’s subscription status should be updated (e.g. in your DB/dashboard).
- In Stripe Dashboard (test mode): **Customers**, **Payments**, **Subscriptions** to confirm.

## 7. Going live (Stripe + your domain)

Once sandbox and Vercel preview are working, use this checklist to go live.

### A. Add your domain in Vercel

1. In **Vercel**: open your project → **Settings** → **Domains**.
2. Add your domain (e.g. `yourdomain.com` and optionally `www.yourdomain.com`).
3. Follow Vercel’s instructions to add the DNS records (A/CNAME) at your registrar.
4. Wait until the domain shows as verified. Your app will then be reachable at that URL.

### B. Switch Stripe to live mode

1. In [dashboard.stripe.com](https://dashboard.stripe.com), turn **Test mode OFF** (top right). You are now in **live** mode.
2. **Products & Prices (live)**  
   Live products are separate from test. Create the same set again:
   - **Basic** – Monthly $19 (Buyer/Seller/Investor) → note the **Price ID** (`price_...`).
   - **Premium** – Monthly $139 (Buyer/Seller/Investor).
   - **Agency tiers** – 10-100 ($980), 15-150 ($1,470), 20-200 ($1,960), 25-250 ($2,450) → note each Price ID.
   - **Agent Basic** – Monthly $59.
3. **API keys (live)**  
   **Developers** → **API keys** (with Test mode OFF): copy the **Secret key** (`sk_live_...`). You will set this in Vercel as `STRIPE_SECRET_KEY`. If your client uses a publishable key anywhere, use the **live** Publishable key (`pk_live_...`).
4. **Webhook (live)**  
   **Developers** → **Webhooks** → **Add endpoint**:
   - **Endpoint URL:** `https://yourdomain.com/api/stripe-webhook` (use your real production domain).
   - **Events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted` (and optionally `invoice.paid`).
   - After creating, open the endpoint → **Reveal** signing secret → copy the **live** secret (`whsec_...`).

### C. Set production environment variables in Vercel

In **Vercel** → your project → **Settings** → **Environment Variables**, set these for **Production** (and optionally Preview if you want previews to use live Stripe; usually you keep Preview on test keys):

| Variable | Value (production) |
|----------|--------------------|
| `STRIPE_SECRET_KEY` | Your **live** secret key (`sk_live_...`) |
| `STRIPE_WEBHOOK_SECRET` | The **live** webhook signing secret (`whsec_...`) |
| `STRIPE_PRICE_BASIC` | Live Basic Price ID |
| `STRIPE_PRICE_PREMIUM` | Live Premium Price ID |
| `STRIPE_PRICE_AGENT_BASIC` | Live Agent Basic Price ID |
| `STRIPE_PRICE_AGENCY_10_100` | Live Agency 10-100 Price ID |
| `STRIPE_PRICE_AGENCY_15_150` | Live Agency 15-150 Price ID |
| `STRIPE_PRICE_AGENCY_20_200` | Live Agency 20-200 Price ID |
| `STRIPE_PRICE_AGENCY_25_250` | Live Agency 25-250 Price ID |
| `STRIPE_SUCCESS_URL` | `https://yourdomain.com/registration/success` |
| `STRIPE_CANCEL_URL` | `https://yourdomain.com/client-registration` (or your real cancel path) |
| `STRIPE_PORTAL_RETURN_URL` | `https://yourdomain.com/settings` |

Replace `yourdomain.com` with your actual domain. Ensure **REACT_APP_API_URL** (and any other app URLs) also point to your production URL if the client needs them.

### D. Deploy and verify

1. **Redeploy** the production deployment in Vercel (e.g. trigger a new deploy from the **Deployments** tab or push to your main branch if auto-deploy is on).

**If Vercel production never updates when you push to `main`:**

- **Production branch:** In Vercel → **Settings** → **Git** → **Production Branch**. Set it to `main` (not `master`). Save.
- **Manual redeploy:** **Deployments** → open the latest deployment from `main` → **⋮** → **Redeploy** (use “Redeploy with existing Build Cache” only if you suspect cache; otherwise redeploy without cache).
- **Confirm repo:** Settings → **Git** → ensure the connected repository and branch are correct. If you use a fork, production may be tied to the upstream branch.
- **Build logs:** If deployments run but the site looks old, open a deployment → **Building** / **Logs** and check for build or env errors.
2. **Test live:** Use your production URL, sign up or go to Settings → Subscription, and run one real payment (you can refund it in Stripe Dashboard → **Payments**).
3. In Stripe Dashboard (live mode), confirm **Customers**, **Payments**, and **Subscriptions** show the test payment, and that the webhook endpoint shows successful deliveries.

### Summary

- **Domain:** Add domain in Vercel → DNS at registrar → use that URL everywhere.
- **Stripe:** Live mode → create live products/prices → live API key + live webhook → set all Stripe env vars for production to live values and production URLs.
- **Vercel:** Production env vars updated → redeploy → smoke test with a real card.

## Plan summary

| Role / Plan | Price | Stripe behavior |
|-------------|-------|------------------|
| **Buyer / Seller / Investor** | | |
| Free | $0 | Not active yet; no Stripe. |
| Basic | $19/mo | Recurring; trial until March 1 when applicable. |
| Premium | $139/mo | Recurring; trial until March 1 when applicable. |
| Custom | Contact | No Stripe; “Contact us” flow. |
| **Agency** | | |
| Premium (10–100, 15–150, 20–200, 25–250) | $980–$2,450/mo | Recurring; trial until March 1 when applicable. |
| Custom | Contact | No Stripe. |
| **Independent Agent** | | |
| Basic | $59/mo | Recurring; trial until March 1 when applicable. |

**Settings → Subscription:** Users with an active Stripe subscription can open the Stripe Customer Portal from the Subscription tab to change plan or cancel; all changes are reflected in Stripe and synced via webhooks.

# Marketing (Metricool-style) dashboard – implementation plan

## Who sees the Marketing tab

- **Agency** (`role === 'agency'`): always
- **Independent agent** (`role === 'independent_agent'`): always  
- **Agency agent** (`role === 'agency_agent'`): only if `user.allowMarketingCampaigns === true`

Defined in `client/src/components/Sidebar.js` and already enforced.

---

## Goal

For users who have the Marketing tab, provide a single place where they can:

1. **Load their assets** – images/videos for social and listings
2. **Manage social media content** – plan and (optionally) publish to social
3. **Target leads and listings** – see CRM leads and listings and use them as audiences

Optionally: **“Have an account created”** – each user can connect their own Metricool account (or we create/provision one per user if we have a Metricool partnership).

---

## Approach

### Option A – Metricool integration (recommended for “manage social content”)

- **Metricool** has an API (`userId`, `blogId`, `userToken` in header `X-Mc-Auth`) and a **White Label iframe** (`https://app.metricool.com/autoin/[WL_TOKEN]?redirect=/planner`).
- **Per-user connection:** Each marketing user connects their own Metricool account:
  - Either: OAuth flow (if Metricool supports it for partners)
  - Or: “Connect account” form where they paste **API credentials** (Account Settings → API → Access token) and we store them securely per user
- We then either:
  - **Embed** their dashboard in an iframe (using their token / WL link), or
  - Call **Metricool API** from our backend (using stored tokens) to show analytics, scheduled posts, etc., inside our UI
- **Leads & listings** stay in our app: we already have `GET /api/users/:id?type=dashboard` → `crmLeads`, `agentProperties`. We show these on the Marketing page so they can “target” content to “all leads” or “listing X” (conceptually; actual targeting can be in Metricool or a future feature).

### Option B – Build our own “Marketing Hub” first (no external dependency)

- **Assets:** Reuse **Vault** with a dedicated “marketing” folder (`folder=marketing`). Already supported: vault has `folder`; we added `GET /api/vault?userId=...&folder=marketing`.
- **Leads & listings:** Same as above – fetch from existing dashboard API, show read-only lists with links to CRM and Listing management.
- **Content / calendar:** Simple in-app “campaigns” or “posts” (title, body, asset, schedule date, target: “all leads” / “listing X”). No real social publishing yet; we just store it. Later we can push to Metricool API or send to a mailing tool.

### Recommended hybrid (what we’re doing)

1. **Phase 1 (current):**
   - **Connect Metricool** – placeholder CTA: “Connect your Metricool account” with link to sign up / help. Optionally a simple “Connect” form that saves `metricoolUserId`, `metricoolBlogId`, `metricoolAccessToken` per user (if we want to collect tokens early).
   - **Marketing assets** – section “My marketing assets”: call `GET /api/vault?userId=...&folder=marketing`, list files, allow upload with `folder: 'marketing'`.
   - **Leads & listings** – section that fetches `GET /api/users/:id?type=dashboard` and shows:
     - Count of leads + link to CRM
     - Count of listings + link to Listing management
     - Optional: compact list of recent leads and listings so they see what they’re “targeting”.

2. **Phase 2 – Metricool account & dashboard:**
   - Backend: store Metricool credentials per user (e.g. `User.metricoolUserId`, `metricoolBlogId`, `metricoolAccessToken` encrypted, or a `MarketingConnection` model).
   - Frontend: “Connected as …” and either:
     - **Embed:** iframe with Metricool White Label URL (with user’s token), or
     - **API:** our backend proxies Metricool API with user’s token; Marketing page shows calendar, posts, analytics from Metricool.
   - “Create account” can mean: we create a **link** to Metricool signup (or partner signup) and after they connect, we store the token and show the dashboard.

3. **Phase 3 – Targeting:**
   - When creating a post/campaign in Metricool (or our own composer), let them choose “Audience: All leads”, “Leads for listing X”, “All listings”, etc. This might be:
     - In Metricool: export audiences (e.g. CSV) from our app and import there, or
     - In our app: simple “Email this to leads” or “Share this listing to leads” using our data and Metricool for social only.

---

## Data we already have

| Data        | Source | Notes |
|------------|--------|--------|
| Leads      | `GET /api/users/:id?type=dashboard` → `agentStats.crmLeads` or `agencyStats.crmLeads` | Same as CRM |
| Listings   | Same API → `agentProperties` | Agent’s or agency’s listings |
| Vault files| `GET /api/vault?userId=...` | Add `folder=marketing` for marketing assets |
| User       | `localStorage.user` | role, allowMarketingCampaigns, _id |

---

## Files to touch (Phase 1)

- `client/src/pages/Marketing.js` – replace “Coming soon” with:
  - Connect Metricool block (placeholder + optional connect form)
  - Marketing assets (vault with `folder=marketing`)
  - Leads & listings (dashboard API)
- `api/vault/index.js` – support `folder` in GET (done).
- Backend (Phase 2): `server/models/User.js` or new `MarketingConnection` model for Metricool tokens; API route to save/read connection (with auth).

---

## Whitelabel iframe (brainstorming – not committed)

Planned: Marketing page wraps the Metricool dashboard in an iframe using our colors and fonts (Poppins, brand.primary, brand.background, brand.border). The iframe loads when the user has `metricoolBlogId`.
- **GET /api/metricool/embed-url** (auth required) returns `{ url }` for the authenticated user: builds `https://app.metricool.com/autoin/[METRICOOL_WL_TOKEN]?redirect=/planner&blogId=...` from the user’s `metricoolBlogId`. Env: **`METRICOOL_WL_TOKEN`** (White Label token from Metricool → Whitelabel settings).
- The dashboard response includes **`metricoolBlogId`** so the client knows whether to show the iframe or the “Sign up at Metricool” CTA. Iframe has `referrerPolicy="origin"` to avoid CSP/frame-ancestor issues. From there it’s up to the user what they do inside Metricool.

---

## Security notes

- Metricool tokens must be stored encrypted and only sent to our backend or used server-side for API calls; never expose in frontend.
- Marketing page and any new API must enforce: only users who have the Marketing tab (agency, independent_agent, or agency_agent with allowMarketingCampaigns) can access.

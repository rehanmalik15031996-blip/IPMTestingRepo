# Security & GDPR Audit – IPM

Summary of **high-risk** and **GDPR-relevant** issues.

---

## What’s been fixed (in code)

- **API JWT verification** – Added `api/_lib/auth.js`; `getUserIdFromRequest` and `requireAuthMatchId` are used so APIs no longer trust client-supplied `userId`. Applied to: `api/users/[id].js`, `api/update-lead.js`, `api/delete-lead.js`, `api/add-lead.js`.
- **Login** – Removed all PII and password-related logs; no hash preview or password hints. Login returns 503 if `JWT_SECRET` is not set (no default).
- **CORS** – Uses `FRONTEND_ORIGIN` when set (e.g. `https://www.internationalpropertymarket.com`); otherwise `*`. Set `FRONTEND_ORIGIN` in Vercel for production.
- **Security headers** – In `vercel.json`: `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

---

## What you need to fix (config, product, legal)

---

## Critical (fix immediately)

### 1. **API does not verify the JWT**

- **Issue:** Login returns a JWT and the client sends `Authorization: Bearer <token>`, but **no API route verifies that token**. Routes trust `userId` (or `id`) from the request body or URL.
- **Risk:** Anyone can call e.g. `GET /api/users/<any-user-id>` or `PUT /api/users/<any-user-id>` and read or change another user’s data (IDOR).
- **Fix:** Add a shared auth helper that:
  - Reads `Authorization: Bearer <token>` from the request.
  - Verifies the JWT with `jwt.verify(token, process.env.JWT_SECRET)`.
  - Derives `userId` from the token payload (e.g. `payload.id`).
  - Uses that `userId` for access (and optionally checks it matches `req.body.userId` / `req.query.userId` where applicable). Never trust client-supplied `userId` alone.

### 2. **Login logs PII and password-related data**

- **File:** `api/auth/login.js`
- **Issue:**
  - Logs user email on every attempt.
  - Logs “Stored hash preview” (first 20 characters of the password hash).
  - On wrong password, logs **hints like expected passwords** for test accounts (e.g. admin123, investor123).
- **Risk:** Server logs become a source of PII and password hints; GDPR and security incident risk.
- **Fix:**
  - Remove all `console.log` that contain email, hash, or password hints.
  - Log only generic messages (e.g. “Login attempt failed”, “Login success”) and optionally a non-identifying request id. Do not log credentials or hashes.

### 3. **Weak JWT secret default**

- **File:** `api/auth/login.js`
- **Issue:** `process.env.JWT_SECRET || "SECRET_KEY_123"` – if `JWT_SECRET` is missing, a known default is used.
- **Risk:** Tokens can be forged if the app is ever deployed without setting `JWT_SECRET`.
- **Fix:** Do not fall back to a default. If `!process.env.JWT_SECRET`, throw or return 503 so the app does not run with a weak secret. Ensure `JWT_SECRET` is set in production (e.g. Vercel env).

---

## High (security and compliance)

### 4. **CORS: `Allow-Origin: *` with `Allow-Credentials: true`**

- **File:** `api/_lib/cors.js`
- **Issue:** `Access-Control-Allow-Origin: '*'` and `Access-Control-Allow-Credentials: true` together are invalid in browsers and can lead to unexpected behavior or overly permissive setups.
- **Risk:** Credential-bearing requests from arbitrary origins; confusion in production.
- **Fix:** Set `Access-Control-Allow-Origin` to your real front-end origin(s) (e.g. `https://www.internationalpropertymarket.com`) and keep `Allow-Credentials: true` only if you need cookies. Do not use `*` when credentials are used.

### 5. **Sensitive session data in `localStorage`**

- **Issue:** Full user object (including token) is stored in `localStorage`. Any XSS can read it and impersonate the user.
- **Risk:** Token and user data theft via XSS; no httpOnly protection.
- **Fix (longer term):** Prefer session cookies:
  - Store a **session id** in an **httpOnly, Secure, SameSite** cookie.
  - Server issues the cookie on login and validates it on each request; do not put the JWT in `localStorage`.
- **Short term:** Ensure no XSS (see CSP below), and avoid storing more PII than necessary in the client (e.g. strip sensitive fields before storing in `localStorage` if you keep current approach temporarily).

### 6. **No security headers**

- **Issue:** No Content-Security-Policy (CSP), X-Frame-Options, HSTS, or X-Content-Type-Options in `vercel.json` (or equivalent).
- **Risk:** XSS, clickjacking, MIME sniffing, and missing HTTPS enforcement.
- **Fix:** In `vercel.json` (or your host config), add headers for all (or relevant) routes, for example:
  - `X-Frame-Options: DENY` (or `SAMEORIGIN` if you need iframes from same origin).
  - `X-Content-Type-Options: nosniff`
  - `Strict-Transport-Security: max-age=31536000; includeSubDomains` (if the site is always HTTPS).
  - `Content-Security-Policy`: start with a strict policy (e.g. default-src 'self'; script-src 'self' https://www.googletagmanager.com https://www.google-analytics.com; etc.) and relax only where necessary for GA, maps, etc.

---

## GDPR-related (compliance and “tight” setup)

### 7. **Google Analytics without prior consent**

- **Issue:** The gtag script runs on first load. No cookie/analytics consent banner or “Accept / Reject” before non-essential scripts.
- **Risk:** Under GDPR/ePrivacy, non-essential cookies and similar tech (e.g. GA) generally require **prior consent** before activation.
- **Fix:**
  - Show a clear consent banner (e.g. “We use cookies and analytics. [Accept] [Reject] [Preferences]”).
  - Load the Google Analytics script only after the user has accepted “analytics” or “non-essential” cookies (or equivalent).
  - Document this in the Privacy Policy (what you collect, lawful basis, and that analytics is conditional on consent).

### 8. **Privacy Policy is too high-level**

- **File:** `client/src/pages/Privacy.js`
- **Issue:** Policy is short and generic. No explicit mention of legal basis per purpose, retention, international transfers, or data subject rights (access, rectification, erasure, portability, objection, restriction, complaint).
- **Risk:** Fails to meet GDPR transparency and information requirements (Art. 13/14).
- **Fix:** Extend the Privacy Policy to include at least:
  - Who is the controller (IPM / legal entity).
  - Purposes and **lawful basis** (e.g. contract, consent, legitimate interest).
  - **Retention** periods (or criteria).
  - **Recipients** and any **transfers** (e.g. US providers; adequacy or safeguards).
  - **Rights** (access, rectify, erase, restrict, port, object, withdraw consent, complain to a supervisory authority).
  - **Contact** (e.g. enquiries@internationalpropertymarket.com or DPO).
  - **Cookies / analytics**: what you use and that GA (or similar) is used only with consent.

### 9. **No documented data retention or deletion**

- **Issue:** No code or docs showing how long you keep user/lead/email data or how users can request deletion.
- **Risk:** GDPR requires purpose-limited retention and the right to erasure.
- **Fix:**
  - Define retention rules (e.g. “user data while account exists + X years after deletion request”).
  - Implement a “Delete my account” / “Request erasure” flow that:
    - Deletes or anonymizes the user and their related data (leads, emails, etc.).
    - Confirms completion to the user.
  - Document retention and erasure in the Privacy Policy.

### 10. **Lead/contact data and consent**

- **Good:** AddNewLeadModal captures consent (e.g. “consent to register as lead”, “consent to be contacted”). Keep this and store consent (e.g. timestamp + wording) with the lead.
- **Gap:** Ensure the contact/inquiry API and any other lead sources also record consent where required (e.g. for marketing or sharing with partners), and that the Privacy Policy explains how you use lead/contact data and on what basis.

---

## Medium / hardening

- **Rate limiting:** Add rate limiting on login, registration, and password reset (and optionally on sensitive APIs) to reduce brute-force and abuse.
- **Input validation:** Validate and sanitize all inputs (body, query, params) and avoid passing them straight into queries or responses (reduces injection and bad data).
- **Password policy:** You already enforce strength in some flows; apply a consistent minimum (e.g. 8+ chars, complexity) and consider preventing common passwords.
- **Audit logging:** For sensitive actions (e.g. change password, delete account, export data), log the action and user id (not PII) for security and compliance audits.

---

## Quick checklist

| Item | Status |
|------|--------|
| API verifies JWT and derives userId from token | ❌ Missing |
| No PII/password hints in login logs | ❌ Present |
| JWT_SECRET required (no default) | ❌ Fallback exists |
| CORS restricted to real origin(s) | ❌ Uses * |
| Security headers (CSP, X-Frame-Options, HSTS, etc.) | ❌ Missing |
| GA/cookies only after consent | ❌ Loads immediately |
| Privacy Policy (rights, basis, retention, contact) | ⚠️ Too brief |
| Account/data deletion flow | ❌ Not documented/implemented |
| Lead consent recorded | ✅ In AddNewLeadModal |

---

## Your action list

| What | Action |
|------|--------|
| **JWT_SECRET** | Set in Vercel (and locally): a long random string. If unset, login returns 503. |
| **FRONTEND_ORIGIN** | Set in Vercel to `https://www.internationalpropertymarket.com` so CORS is restricted. |
| **GCP functions called with no key** | This repo calls three Cloud Run URLs with **no API key or secret**: (1) `api/auth/otp.js` → GOOGLE_SEND_OTP_URL, (2) `api/contact/index.js` → GOOGLE_SEND_ENQUIRY_URL, (3) `api/users/[id].js` → SEND_AGENT_INVITE_URL. Anyone who knows the URL can POST. **Fix:** Add env `GCP_FUNCTION_SECRET`; send header `X-API-Key: <secret>` from the API; in each GCP function, reject requests without the correct header. |
| **Google Analytics consent** | Add a cookie/consent banner and load gtag only after the user accepts (GDPR). |
| **Privacy Policy** | Expand with: lawful basis, retention, rights, contact, cookies/analytics. |
| **Data retention & deletion** | Define retention; add “Delete my account” and document it in the policy. |
| **Session in cookies** (optional) | Later: move from localStorage to httpOnly session cookies for the token. |

---

## Other gaps (additional findings)

These were found on a second pass; fix in order of risk.

| Issue | Where | Risk | Fix |
|-------|--------|------|-----|
| **Legacy server hardcoded JWT** | `server/routes/auth.js` line 42 | If you ever run `npm start` (Express server), login uses `jwt.sign(..., "SECRET_KEY_123")`. Tokens are forgeable. | Use `process.env.JWT_SECRET` and no default, or remove/retire this route if you only use Vercel `api/auth/login.js`. |
| **`/api/chat` has no auth** | `api/chat.js` | Anyone can POST and burn your Claude/API quota or abuse the endpoint. | Require JWT (e.g. `getUserIdFromRequest`) so only logged-in users can use chat. |
| **`/api/vault` has no auth** | `api/vault/index.js` | GET/POST use only `userId` from query/body. Anyone can list or upload files for any user by guessing IDs. | Require JWT and derive `userId` from the token; reject if request `userId` does not match (or allow only for same user). |
| **`/api/users/add-lead` has no auth** | `api/users/add-lead.js` | Accepts `userId` and `lead` in body with no JWT. Anyone can add leads to any user’s CRM. (The client uses `/api/add-lead`, which is protected.) | Add `getUserIdFromRequest` and ensure the authenticated user is allowed to add leads for the target (e.g. token userId matches body userId, or agency/agent relationship). Or remove this route if it’s unused. |
| **`/api/properties` POST/PUT/DELETE have no auth** | `api/properties/index.js` | Anyone can create, update, or delete properties. | Require JWT and allow only authorized roles (e.g. agent/agency/admin) for write/delete; keep GET public if intended. |
| **Chat / AI** | `api/chat.js`, `FloatingChat.js` | Chat uses server-side `ANTHROPIC_API_KEY` only (no client key). | Optional: require JWT for `/api/chat` to limit quota abuse. |
| **PII in logs** | `api/auth/otp.js` (logs email, user type); `api/auth/register-agency.js` (logs many parsed fields) | Logs can become a source of PII; GDPR and incident risk. | Remove or redact: don’t log email, names, or other identifiers; log only generic “OTP sent” / “Registration attempt” style messages. |
| **Contact form** | `api/contact/index.js` | No rate limiting; form can be spammed or used for abuse. | Add rate limiting (by IP or cookie) and/or CAPTCHA for the contact/inquiry endpoint. |
| **Agency invite token in URL** | `api/auth/agency-invite?token=...` | Token in query string can leak in Referer, server logs, browser history. | One-time invite tokens are a common trade-off; consider short-lived tokens and not logging the full URL. Document in policy. |

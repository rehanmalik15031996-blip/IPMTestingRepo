# Email Inbox Integration (HubSpot-style “Any Email”)

This guide describes how the app supports **HubSpot-style email**: users connect **Gmail or Outlook** and send/receive messages inside the app (Settings → Email, Inbox, and “Email lead” from the lead popup).

**Current implementation:** **DIY** – Google OAuth + Gmail API and Microsoft OAuth + Graph API. No Nylas or other paid email API. See **docs/EMAIL_NYLAS_SETUP.md** (now titled “Email inbox integration (DIY)”) for env vars and setup.

---

## What You Get (Like HubSpot)

- User clicks **“Connect email”** in Settings (or Inbox).
- They choose **Gmail**, **Outlook**, **Yahoo**, or other provider.
- OAuth flow runs; you store a secure grant/token per user.
- In the app: **inbox list**, **thread view**, **compose/send**, **reply**, optional **folders** and **search**.
- All via one integration surface (no separate code per provider if you use a unified API).

---

## Recommended Path: Nylas Email API

**Nylas** gives you one API for Gmail, Outlook, Yahoo, iCloud, and many other providers. You integrate once; users can connect “any” supported email.

| Aspect | Details |
|--------|--------|
| **Providers** | Google, Microsoft, Yahoo, iCloud, and 100% of major providers via one API. |
| **Auth** | Nylas hosts OAuth flows; you redirect users to Nylas (or use their hosted connect UI), then receive a **grant ID** to call the API. |
| **Capabilities** | List messages, get thread, send, reply, drafts, folders, search, attachments, read/reply tracking. |
| **Pricing** | SaaS; check [nylas.com](https://www.nylas.com) for current plans. |
| **Docs** | [developer.nylas.com](https://developer.nylas.com) — Email API, OAuth, provider guides. |

### Implementation Outline with Nylas

1. **Sign up** at [nylas.com](https://www.nylas.com), create an app, get **API key** and configure **OAuth redirect URIs** (e.g. `https://yourdomain.com/settings/email-callback`).
2. **Backend (Vercel API)**  
   - `GET /api/email/auth-url` — build Nylas OAuth URL for the chosen provider (e.g. `google`, `microsoft`); frontend redirects user there.  
   - `GET /api/email/callback` — Nylas redirects here with `code`; exchange for **grant**; store `grantId` (and optionally email address) in MongoDB per user (e.g. `User.connectedEmails[]` or `EmailConnection` collection).  
   - `GET /api/email/accounts` — return current user’s connected accounts (from DB).  
   - `GET /api/email/messages` — use Nylas Messages API with user’s `grantId` to list inbox (paginated).  
   - `GET /api/email/messages/:id` — get one message or thread.  
   - `POST /api/email/send` — send (and optionally save) via Nylas.  
   - Use **Nylas Node SDK** in serverless handlers; keep API key in env (e.g. `NYLAS_API_KEY`, `NYLAS_CLIENT_ID`, `NYLAS_CLIENT_SECRET`).
3. **Frontend**  
   - **Settings (or Inbox)**: “Connect email” → choose provider → redirect to `api/email/auth-url` (or Nylas-hosted connect).  
   - **Inbox UI**: list of messages (from `GET /api/email/messages`), click → thread view (`GET /api/email/messages/:id`).  
   - **Compose / Reply**: form that POSTs to `POST /api/email/send`.  
4. **Data model (MongoDB)**  
   - e.g. `EmailConnection`: `userId`, `grantId`, `email`, `provider`, `createdAt`.  
   - Never store raw OAuth tokens if Nylas gives you a grant ID only; if you ever store tokens, encrypt at rest.

Result: one integration that supports **any** email provider Nylas supports (same as HubSpot-style “any email”).

---

## Alternative: Build It Yourself (Gmail + Microsoft)

If you prefer no third-party vendor and only need **Gmail** and **Outlook**:

| Provider | Auth | API | Scope |
|----------|------|-----|--------|
| **Google** | OAuth 2.0 (Google Cloud Console) | Gmail API | `read/send` (e.g. `gmail.readonly`, `gmail.send`, `gmail.modify`) |
| **Microsoft** | OAuth 2.0 (Azure AD app) | Microsoft Graph (Mail) | `Mail.Read`, `Mail.Send`, `offline_access` |

- **Backend**: one OAuth flow per provider (redirect + callback), store **refresh_token** (+ access_token) per user per provider; implement routes that call Gmail API vs Graph depending on account type.  
- **Frontend**: same as above (connect button, inbox, thread, compose).  
- **Limitation**: only Gmail and Microsoft unless you add more (e.g. Yahoo, IMAP/SMTP with app passwords), which multiplies code and maintenance.

---

## Security & Compliance

- Request only **minimum scopes** (read + send, not full mailbox if not needed).  
- Store **tokens or grant IDs** securely; encrypt at rest if storing raw tokens.  
- **Privacy policy**: disclose that the app will read/send email on the user’s behalf.  
- Prefer **provider OAuth** over asking users for passwords; avoid storing passwords.

---

## Summary

| Goal | Approach |
|------|----------|
| **“Any email” like HubSpot** | Use **Nylas Email API**: one integration, many providers, OAuth + unified inbox/send. |
| **Gmail + Outlook only, no vendor** | Build OAuth + Gmail API + Microsoft Graph; two provider-specific code paths. |

For true HubSpot-style “any email” with minimal custom code per provider, **Nylas** (or a similar unified email API) is the most direct path. The implementation steps above (auth URL, callback, store grant, messages list/get, send) map directly onto your existing stack (React frontend, Vercel API, MongoDB).

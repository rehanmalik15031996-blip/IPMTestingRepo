# Email inbox integration (DIY: Google + Microsoft)

The app lets users **connect Gmail or Outlook** in Settings → Email, view their **Inbox** from the nav mail icon, and **email leads** from the lead popup. This is built with **Google and Microsoft OAuth + APIs** (no Nylas or other paid email API).

---

## 1. Google (Gmail)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → create or select a project.
2. **APIs & Services** → **Enable APIs** → enable **Gmail API**.
3. **Credentials** → **Create credentials** → **OAuth 2.0 Client ID**.
   - Application type: **Web application**.
   - **Authorized redirect URIs**: add your app URL, e.g.  
     `https://yourdomain.com/settings`  
     (and `http://localhost:3000/settings` for local).
4. Copy **Client ID** and **Client secret**.

**Env vars:**

| Variable | Description |
|----------|-------------|
| `GOOGLE_CLIENT_ID` | OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret |

---

## 2. Microsoft (Outlook)

1. Go to [Azure Portal](https://portal.azure.com/) → **App registrations** → **New registration**.
2. Name the app, set **Supported account types** (e.g. “Accounts in any org and personal Microsoft accounts”).
3. **Redirect URI** → Web → e.g. `https://yourdomain.com/settings`.
4. After creation: **Certificates & secrets** → **New client secret** → copy the secret value.
5. **API permissions** → Add: **Mail.Read**, **Mail.Send**, **offline_access** (under Microsoft Graph).

**Env vars:**

| Variable | Description |
|----------|-------------|
| `MICROSOFT_CLIENT_ID` | Application (client) ID from app registration |
| `MICROSOFT_CLIENT_SECRET` | Client secret value |

---

## 3. Shared redirect (both providers)

Use the **same** redirect URI in both Google and Microsoft (e.g. `https://yourdomain.com/settings`). After OAuth, the user lands on `/settings?code=...&state=...`; the Settings page exchanges the code and clears the URL.

| Variable | Example |
|----------|---------|
| `EMAIL_REDIRECT_URI` | `https://yourdomain.com/settings` |

---

## 4. Environment variables summary

Set in Vercel (and locally if needed):

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `MICROSOFT_CLIENT_ID`
- `MICROSOFT_CLIENT_SECRET`
- `EMAIL_REDIRECT_URI` (same URL registered in both Google and Azure)

No Nylas or other third-party email API keys are required.

---

## 5. Flow in the app

1. **Settings → Email**: User clicks “Connect Gmail” or “Connect Outlook” → redirect to Google or Microsoft OAuth → back to `/settings?code=...&state=...` → backend exchanges code for tokens and stores them on the user (`emailConnections`).
2. **Nav mail icon** → **/inbox**: List and read messages (Gmail API or Microsoft Graph), **Compose** to send.
3. **Lead popup** → “Email lead” → opens Inbox compose with the lead’s email prefilled.

---

## 6. API routes (reference)

- `GET /api/email/auth-url?userId=...&provider=google|microsoft` – OAuth URL.
- `POST /api/email/exchange` – body `{ code, state }` – exchange code for tokens, save to user.
- `GET /api/email/accounts?userId=...` – list connected accounts (no tokens).
- `DELETE /api/email/accounts` – body `{ userId, grantId }` or `{ userId, connectionId }` – disconnect.
- `GET /api/email/messages?userId=...&limit=20` – list inbox; `&id=...` – one message.
- `POST /api/email/send` – body `{ userId, to, subject, body }` – send email.

---

## 7. Cost

- **Google**: Gmail API is free within [quota](https://developers.google.com/gmail/api/reference/quota) (e.g. 1B quota units/day; list/send use small units).
- **Microsoft**: Graph Mail is free within [throttling limits](https://learn.microsoft.com/en-us/graph/throttling).

No per-user or per-inbox fee from a vendor.

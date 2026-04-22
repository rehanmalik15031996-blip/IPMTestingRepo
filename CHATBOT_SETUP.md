# Chatbot (Chat with IPM AI) setup

Chat and all AI features (chat, property description generation, document extraction, matching) use **Claude** via **Anthropic API**. No Gemini or client-side API keys.

## Vercel (serverless /api/chat)

1. **Root Directory:** The repo has `api/chat.js` at the **repo root** and a copy in **`client/api/chat.js`**. If your Root Directory is `client`, the copy in `client/api/` is used. If Root Directory is the repo root, the root `api/chat.js` is used.
2. In **Settings** → **Environment Variables**, add:
   - **Name:** `ANTHROPIC_API_KEY`
   - **Value:** your API key from [Anthropic Console](https://console.anthropic.com/) (API Keys)
3. Leave **REACT_APP_API_URL** unset so the frontend calls the same domain and hits `/api/chat`.
4. **Redeploy** after changing env vars.

## Separate Node backend (e.g. Render)

- Set **ANTHROPIC_API_KEY** on the backend (e.g. Render env vars).
- Set **REACT_APP_API_URL** in Vercel to your backend URL so the frontend can call it.

## Other AI features using the same key

- **Property description:** `POST /api/properties/generate-description` (Listing Summary step) — uses `ANTHROPIC_API_KEY`.
- **Document extraction:** `POST /api/extract-property` — uses `ANTHROPIC_API_KEY`.
- **Matching:** Lead/listing match scores — uses `ANTHROPIC_API_KEY`.

One key powers all of them. If the key is missing, chat returns 503 "Chat not configured"; generate-description and extract-property return 503 with a clear message.

## If you see "Chat endpoint not found" or 404

- Ensure the Root Directory includes the `api` folder (repo root or `client` with `client/api/chat.js`).
- If **REACT_APP_API_URL** is set, the app calls that URL for API requests. For chat on the same domain, leave it unset.
- Trigger a **new deployment** after changing env or Root Directory.

## If you see 401 (Unauthorized) on other endpoints

A **401** is usually Vercel Deployment Protection (password or Vercel Auth) blocking requests. In **Settings** → **Deployment Protection**, turn it off for Production or use "Only Preview Deployments."

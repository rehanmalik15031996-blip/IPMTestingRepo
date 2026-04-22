# Fix MongoDB connection timeouts (MongoNetworkTimeoutError)

Follow these in order. Re-deploy and test after Step 2 and again after Step 4.

---

## Step 1: Allow Vercel to reach Atlas (Network Access)

1. Log in to **MongoDB Atlas** → [cloud.mongodb.com](https://cloud.mongodb.com).
2. Select your **Project** → **Network Access** (left sidebar).
3. Click **"+ ADD IP ADDRESS"**.
4. Either:
   - **Recommended for Vercel:** Click **"ALLOW ACCESS FROM ANYWHERE"**.  
     This sets the CIDR to `0.0.0.0/0` so any outbound IP from Vercel can connect.
   - Or add specific IPs if you don’t want 0.0.0.0/0 (you’d need to look up Vercel’s IPs or use a fixed egress).
5. Click **Confirm**.
6. Wait 1–2 minutes for the change to apply.

---

## Step 2: Confirm connection string and cluster

1. In Atlas, go to **Database** → your cluster → **Connect** → **Connect your application**.
2. Copy the **connection string** (e.g. `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/ipm_db?...`).
3. In **Vercel**: Project → **Settings** → **Environment Variables**.
4. Find **MONGO_URI** (or add it). Set it to the Atlas connection string:
   - Use the same database name (e.g. `ipm_db`) as in Atlas.
   - Keep `retryWrites=true&w=majority` (or whatever Atlas shows).
5. **Redeploy** the project (Deployments → … on latest → Redeploy) so the new variable is used.

---

## Step 3: Reduce connection usage (serverless)

Serverless creates many short-lived instances. Each can open connections; too many can hit Atlas limits and cause timeouts.

1. Open **api/_lib/mongodb.js** in your repo.
2. Ensure **maxPoolSize** is low (e.g. **5** or **3**). The codebase may already use 10; reducing to 5 helps with connection limits.
3. For Vercel, **minPoolSize: 0** is often better so idle instances don’t hold connections (optional change).

(If you prefer, we can leave pool settings as-is and only rely on Step 1 and 4.)

---

## Step 4: Increase timeouts in the app

So the app waits longer for Atlas before giving up:

1. Open **api/_lib/mongodb.js**.
2. In the `opts` object passed to `mongoose.connect`, set:
   - **serverSelectionTimeoutMS: 15000** (or 20000)
   - **connectTimeoutMS: 15000** (or 20000)
3. Save, commit, and **redeploy**.

---

## Step 5: Verify

1. Open your deployed app (e.g. dashboard or listing page).
2. In **Vercel** → **Logs** (or **Functions** → select a function → logs), check for:
   - `MongoDB Connected to Atlas` and **200** responses, or
   - Fewer/no `MongoNetworkTimeoutError` / 500.
3. In the browser **Network** tab, reload the page and confirm the `/api/users/...?type=dashboard` or `?type=listings` request returns **200** with data (not timeout or 500).

---

## If it still times out

- In Atlas, check **Database** → **Metrics**: look for high connection count or CPU; if near limits, consider a higher tier or optimizing queries.
- In Atlas **Network Access**, ensure no rule **denies** your traffic (e.g. a deny rule that overrides 0.0.0.0/0).
- Try deploying from a **different Vercel region** (closer to your Atlas region) to reduce latency.

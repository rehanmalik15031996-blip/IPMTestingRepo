# New MongoDB Atlas account – fresh start

Use this when you don’t have access to edit the current cluster. You’ll create a new Atlas account (or cluster), point the app at it, and let the app create and seed the database.

---

## 1. Create a MongoDB Atlas account (or use existing)

1. Go to **https://www.mongodb.com/cloud/atlas/register**.
2. Sign up with email (or Google/GitHub).
3. If you already have an account, log in and go to **https://cloud.mongodb.com**.

---

## 2. Create a new project and cluster

1. In Atlas, click **“Build a Database”** (or **Create** → **Create a Project**).
2. **Create a project** (e.g. “IPM App”).
3. **Create a cluster:**
   - Choose **M0 FREE** (shared).
   - Pick a **region** close to you (or close to Vercel, e.g. same continent).
   - Cluster name can stay as “Cluster0” or be “ipm”.
   - Click **Create**.

---

## 3. Create a database user

1. When prompted **“How would you like to authenticate?”**, choose **Username and Password**.
2. Create a user, e.g.:
   - **Username:** `ipm_app`
   - **Password:** generate a strong one and **save it** (you’ll need it for the connection string).
3. Click **Create User**.

---

## 4. Allow access from anywhere (Network Access)

1. Under **“Where would you like to connect from?”**, choose **“My Local Environment”** or **“Cloud”**.
2. Click **“Add My Current IP Address”** (optional for local).
3. **Important:** Click **“Add a Different IP Address”**:
   - **Access List Entry:** `0.0.0.0/0`
   - **Comment:** “Vercel / anywhere”
   - Click **Confirm**.
4. This lets your Vercel app (and any IP) connect. Click **Finish and Close**.

---

## 5. Get the connection string

1. In Atlas, go to **Database** → your cluster → **Connect**.
2. Choose **“Connect your application”** (or “Drivers”).
3. **Driver:** Node.js, version 5.5 or later.
4. Copy the connection string. It looks like:
   ```text
   mongodb+srv://ipm_app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```
5. **Edit it:**
   - Replace `<password>` with your database user password (special characters in the password may need to be URL-encoded).
   - After the host part (`.mongodb.net`), add the database name: **`/ipm_db`**  
     So it ends with: `...mongodb.net/ipm_db?retryWrites=true&w=majority`
6. **Full example:**
   ```text
   mongodb+srv://ipm_app:YourPassword123@cluster0.xxxxx.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0
   ```
7. Save this somewhere safe (e.g. password manager). You’ll use it as `MONGO_URI`.

---

## 6. Set MONGO_URI in Vercel

1. Open your project on **Vercel** → **Settings** → **Environment Variables**.
2. Add (or update):
   - **Name:** `MONGO_URI`
   - **Value:** the full connection string from step 5 (with real password and `/ipm_db`).
   - **Environments:** Production (and Preview if you want).
3. Save. Then trigger a **new deployment** (Deployments → … → Redeploy) so the new variable is used.

---

## 7. Let the app create collections and seed data

The app **does not** need you to create collections by hand. As soon as it connects and runs, it will:

- Create collections when it first writes (users, properties, news, etc.).
- The **seed** creates sample users, properties, news, developments, and market trends.

**Option A – Use the /seed page (easiest)**

1. Deploy with the new `MONGO_URI` (step 6).
2. Open your app in the browser, e.g. `https://your-app.vercel.app`.
3. Go to: **`https://your-app.vercel.app/seed`**.
4. Click **“Seed Database Now”**.
5. Wait for “Database seeded successfully!” – then you can go to **/** or **/login** and use the seeded users (e.g. admin, agent, buyer – see seed code or login page for test emails/passwords).

**Option B – Call the seed API once**

If you prefer not to use the UI:

```bash
curl -X POST "https://your-app.vercel.app/api/users?action=seed"
```

Use your real app URL. After it returns success, the DB is seeded.

---

## 8. (Optional) Local development

1. In the project root create or edit **`.env`** (and add `.env` to `.gitignore` if it isn’t already).
2. Add:
   ```env
   MONGO_URI=mongodb+srv://ipm_app:YourPassword@cluster0.xxxxx.mongodb.net/ipm_db?retryWrites=true&w=majority
   ```
3. Run the app locally; it will use this DB. You can run **/seed** locally too.

---

## 9. MONGO_URI required

The app **no longer uses a hardcoded connection string**. It only connects when **MONGO_URI** is set in the environment (Vercel and, for local dev, `.env`). If it’s missing, you’ll see a clear error. That way you always use the DB you configured (e.g. your new Atlas cluster).

---

## Summary

| Step | What you do |
|------|-------------|
| 1 | Create/log in to Atlas |
| 2 | New project + M0 FREE cluster |
| 3 | Create DB user, save password |
| 4 | Network Access: add `0.0.0.0/0` |
| 5 | Get connection string, add `/ipm_db`, save as MONGO_URI |
| 6 | Vercel → Environment Variables → MONGO_URI → Redeploy |
| 7 | Open app → `/seed` → “Seed Database Now” |
| 8 | (Optional) .env locally with same MONGO_URI |

After step 7, the app has created everything it needs and you can use the app with the new account and fresh data.

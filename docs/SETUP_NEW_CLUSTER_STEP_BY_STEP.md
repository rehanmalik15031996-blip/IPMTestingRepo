# Line-by-line: Set up new Atlas cluster and point the app at it

Do these in order. Wait for the cluster to finish creating before the "Get connection string" step.

---

## Part 1: MongoDB Atlas (in the browser)

### 1. Wait for the cluster to finish creating
- In Atlas, on the Database / Clusters page, wait until the cluster status is **Ready** (not "Creating").
- This can take a few minutes.

### 2. Create a database user (if you haven’t already)
- In the left sidebar, click **Database Access** → **Add New Database User** (or **+ ADD**).
- **Authentication method:** Password.
- **Username:** e.g. `ipm_app` (or any name you like).
- **Password:** Click **Autogenerate Secure Password** and **copy it** (or choose your own and save it).
- **Database User Privileges:** leave as **Atlas admin** or **Read and write to any database**.
- Click **Add User**.

### 3. Network Access: allow the app to connect
- In the left sidebar, click **Network Access** → **Add IP Address** (or **+ ADD IP ADDRESS**).
- Click **Allow Access from Anywhere** (this adds `0.0.0.0/0`).
- **Comment:** e.g. `Vercel and local`.
- Click **Confirm**.

### 4. Get the connection string
- In the left sidebar, click **Database**.
- On your cluster row, click **Connect**.
- Choose **Drivers** (or **Connect your application**).
- **Driver:** Node.js; version doesn’t matter for the string.
- Copy the connection string shown (it looks like  
  `mongodb+srv://ipm_app:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority`).
- **Edit the string:**
  - Replace `<password>` with the **actual** database user password from step 2.  
    If the password has special characters (e.g. `@`, `#`, `%`), URL-encode them (e.g. `@` → `%40`).
  - After `.mongodb.net` and **before** the `?`, add the database name: **`/ipm_db`**.  
  - So the end of the string looks like:  
    `....mongodb.net/ipm_db?retryWrites=true&w=majority`
- Save this full string somewhere safe (e.g. a password manager). This is your **MONGO_URI**.  
  Example (fake):  
  `mongodb+srv://ipm_app:MyPass123%40@cluster0.abc123.mongodb.net/ipm_db?retryWrites=true&w=majority`

---

## Part 2: Vercel (deployed app)

### 5. Add MONGO_URI in Vercel
- Open **https://vercel.com** and log in.
- Open your **IPM** project (or whatever the project name is).
- Click **Settings** (top tab).
- In the left sidebar, click **Environment Variables**.
- Under **Key**, type: `MONGO_URI`
- Under **Value**, paste the **full** connection string from step 4 (with real password and `/ipm_db`).
- Under **Environments**, tick **Production** (and **Preview** if you want preview deployments to use it too).
- Click **Save**.

### 6. Redeploy so the new variable is used
- Click **Deployments** (top tab).
- Find the **latest** deployment.
- Click the **three dots (⋯)** on the right of that row.
- Click **Redeploy**.
- Confirm **Redeploy**.
- Wait until the deployment status is **Ready**.

---

## Part 3: Local .env (your computer)

### 7. Open or create the .env file
- On your computer, open the **project root** (the folder that contains `package.json` and the `server` folder).
- If there is already a file named **`.env`**, open it in an editor.
- If there is no **`.env`** file, create a new file named exactly **`.env`** in that same folder.

### 8. Add MONGO_URI to .env
- In the `.env` file, add a **single** line (replace the value with your real connection string from step 4):
  ```
  MONGO_URI=mongodb+srv://ipm_app:YOUR_PASSWORD@cluster0.xxxxx.mongodb.net/ipm_db?retryWrites=true&w=majority
  ```
- No spaces around the `=`.
- No quotes around the value (unless your password or string contains spaces, then use double quotes).
- Save the file.

### 9. Make sure .env is not committed to git
- In the project root, open **`.gitignore`**.
- If you see a line **`.env`**, leave it there (it’s correct).
- If **`.env`** is not in `.gitignore`, add a new line with exactly: `.env`  
  Then save `.gitignore`.

---

## Part 4: Load data (choose one)

### Option A – Fresh start (empty DB, sample data)

#### 10a. Open the seed page
- In your browser, go to: **`https://your-app.vercel.app/seed`**  
  (Replace `your-app.vercel.app` with your real Vercel URL, e.g. `ipm-website-demo.vercel.app`.)

#### 11a. Run the seed
- On that page, click the button **“Seed Database Now”** (or similar).
- Wait for the success message (e.g. “Database seeded successfully!”).
- You can then go to **`/`** or **`/login`** and use the seeded test users.

---

### Option B – Copy data from your old cluster

#### 10b. Put the old connection string in .env
- In your **`.env`** file, add another line with the **old** cluster connection string (the one that has your existing data):
  ```
  MONGO_URI_SOURCE=mongodb+srv://olduser:oldpass@old-cluster.xxxxx.mongodb.net/ipm_db?retryWrites=true&w=majority
  ```
- Keep the **MONGO_URI** line pointing at the **new** cluster (from step 8).
- Save `.env`.

#### 11b. Run the transfer script
- Open a terminal.
- Go to the project root (e.g. `cd /Users/cornenagel/Documents/ipm/IPM-Website`).
- Run:
  ```
  node server/transfer-atlas-to-atlas.js
  ```
- Wait until you see “Transfer completed” (or similar) in the output.

#### 12b. Leave only the new cluster in Vercel
- In Vercel, **MONGO_URI** should already be set to the **new** cluster only (step 5). Do **not** add `MONGO_URI_SOURCE` in Vercel.
- Your local `.env` can keep both `MONGO_URI_SOURCE` and `MONGO_URI` for future transfers; the deployed app only uses **MONGO_URI** (new cluster).

---

## Part 5: Check that the app uses the new cluster

### 13. Test the app
- Open **`https://your-app.vercel.app`** in the browser.
- Try **Login** (with a user you know exists in the new DB, or a seeded user if you used Option A).
- Open **Dashboard** or **Listing Management** and confirm data loads (or the seed data appears).
- If you see timeouts or “MONGO_URI is required”, double-check:
  - Vercel → Settings → Environment Variables → **MONGO_URI** is set and saved.
  - You redeployed after adding it (step 6).

---

## Quick checklist

- [ ] Cluster status is **Ready** in Atlas  
- [ ] Database user created and password saved  
- [ ] Network Access has **0.0.0.0/0**  
- [ ] Connection string copied and edited (password + `/ipm_db`)  
- [ ] **MONGO_URI** added in Vercel and saved  
- [ ] Deployment **Redeployed**  
- [ ] **MONGO_URI** added in local **`.env`**  
- [ ] **`.env`** is in **`.gitignore`**  
- [ ] Either **Option A** (seed) or **Option B** (transfer) done  
- [ ] App opens and login/dashboard work  

After this, the app is using the new cluster for both the deployed site (Vercel) and local runs (.env).

# Transfer data from current MongoDB to a new Atlas cluster

Use this when you want to **copy all data** from your existing database (e.g. the cluster you can’t edit) into a **new** Atlas cluster you control. The app’s script copies every collection and keeps the same `_id`s so references (e.g. `agentId`, `agencyId`) stay valid.

---

## Option 1: Use the transfer script (recommended)

### 1. Get both connection strings

- **Source (current DB with data)**  
  The URI you use today (e.g. from Vercel env or the person who owns the cluster).  
  You need at least **read** access.  
  Example: `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/ipm_db?retryWrites=true&w=majority`

- **Destination (new cluster)**  
  The new Atlas cluster you created (see [NEW_ATLAS_FRESH_START.md](./NEW_ATLAS_FRESH_START.md)).  
  Example: `mongodb+srv://ipm_app:pass@cluster1.yyyyy.mongodb.net/ipm_db?retryWrites=true&w=majority`

Make sure both URIs include the **database name** (e.g. `/ipm_db` before the `?`).

### 2. Set environment variables

In the project root, create or edit **`.env`** (do not commit real passwords):

```env
MONGO_URI_SOURCE=mongodb+srv://user:pass@old-cluster.xxxxx.mongodb.net/ipm_db?retryWrites=true&w=majority
MONGO_URI=mongodb+srv://ipm_app:pass@new-cluster.yyyyy.mongodb.net/ipm_db?retryWrites=true&w=majority
```

- `MONGO_URI_SOURCE` = **from** (current DB).
- `MONGO_URI` = **to** (new DB).

If the password has special characters, URL-encode them (e.g. `@` → `%40`).

### 3. Install dependency (if needed)

```bash
npm install dotenv
```

(or use `node -r dotenv/config server/transfer-atlas-to-atlas.js` so you don’t need to add dotenv to the script).

### 4. Run the script

From the **project root** (where `server/` is):

```bash
node server/transfer-atlas-to-atlas.js
```

You should see:

- Connected to SOURCE database  
- Connected to DESTINATION database  
- Copying users...  
- Copying agencyinvites...  
- ...  
- Transfer completed.

### 5. Use the new cluster

1. In **Vercel** → Settings → Environment Variables, set **MONGO_URI** to the **new** (destination) connection string only.
2. Redeploy. The app will now read/write the new cluster with the copied data.

---

## Option 2: MongoDB tools (mongodump / mongorestore)

If you have [MongoDB Database Tools](https://www.mongodb.com/docs/database-tools/installation/installation/) installed and network access to both clusters:

**Export from current (source):**

```bash
mongodump --uri="MONGO_URI_SOURCE_VALUE" --out=./atlas-backup
```

Replace `MONGO_URI_SOURCE_VALUE` with your current DB connection string.

**Import into new (destination):**

```bash
mongorestore --uri="MONGO_URI_NEW_VALUE" ./atlas-backup/ipm_db
```

Replace `MONGO_URI_NEW_VALUE` with the new cluster connection string. The path `./atlas-backup/ipm_db` assumes the DB name is `ipm_db`; if not, adjust (e.g. `./atlas-backup/your_db_name`).

---

## Option 3: Atlas UI (if both are in the same Atlas org)

If **source and destination** are both in MongoDB Atlas and you have access to both:

1. In the **source** cluster: Database → … → **Export** (or use “Export” in the left menu if available).
2. Export to Atlas Data Lake or download as JSON/BSON if the option is there.
3. In the **destination** cluster: **Import** and point to the exported data.

Exact steps depend on your Atlas plan and UI. If you don’t see Export/Import, use Option 1 or 2.

---

## After the transfer

1. Set **MONGO_URI** everywhere (Vercel, local `.env`) to the **new** cluster only.
2. Remove or leave **MONGO_URI_SOURCE** only in local `.env` for future transfers; don’t use it in Vercel.
3. Redeploy and test login, dashboard, and listings to confirm data and links (e.g. agents, properties) look correct.

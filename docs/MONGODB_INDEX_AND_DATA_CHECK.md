# MongoDB indexes and “no data” / slow responses

## Do the index changes in this repo remove or unlink data?

**No.** The only index-related changes in the codebase are **additive**:

- **Property** (`server/models/Property.js`): `agentId + createdAt`, `agentId + status`, `status + agentId`
- **User** (`server/models/User.js`): `agencyId`
- **Development** (`server/models/Development.js`): `agencyId + createdAt`, `agentId + createdAt`

These are declared with `schema.index(...)`. Mongoose only **creates** these indexes when the app connects; it does **not**:

- Delete or modify documents
- Drop collections
- Change how “linking” works (e.g. `agentId` / `agencyId` refs are in the schema, not in the indexes)

So **the indexes in this repo cannot by themselves cause “no data” or “nothing linking”.**

---

## If you changed indexes or the DB “yesterday” outside this repo

Something done **directly in MongoDB Atlas (or Compass/shell)** could explain missing data or slowness, for example:

1. **Dropping a collection or database**  
   → Data would be gone; nothing in this codebase does that.

2. **Dropping an index**  
   → Queries can get slower (full collection scans) but should still return the same data.

3. **Long-running index build**  
   → On some setups, a heavy index build can make reads slow or time out until the build finishes. After the build, things usually go back to normal.

4. **Different database or cluster**  
   → If `MONGO_URI` (or the cluster/database in Atlas) was changed to an empty or different DB, the app would see “no data” even with old deployments.

---

## What to check when “nothing is linking / no data” or it’s very slow

1. **Correct database**
   - In Vercel (or wherever you run): confirm `MONGO_URI` points to the cluster and **database** you expect (e.g. `ipm_db` in the connection string).
   - In Atlas: open that cluster → **Browse Collections** and confirm you see the right database and collections.

2. **Data is still there**
   - Check that `users`, `properties`, `developments`, etc. exist and have documents.
   - For “linking”: e.g. in `properties`, check that `agentId` values match `_id`s in `users`; in `users`, check `agencyId` for agency agents.

3. **Indexes**
   - In Atlas: Database → your database → **Collections** → select a collection → **Indexes**.
   - Confirm the indexes above exist and that there are **no failed** or **stuck** index builds (Atlas shows build status).

4. **Network / timeouts**
   - If even an **old deployment** is slow and returns no data, it can be:
     - Timeouts (e.g. Vercel serverless timeout, or MongoDB `serverSelectionTimeoutMS` / `connectTimeoutMS`) so the app never gets a result.
     - Network: Atlas **Network Access** must allow your deployment’s IP (or 0.0.0.0/0 for Vercel).

5. **Errors in logs**
   - Check Vercel (or your host) **function logs** and browser **Network** tab for the failing request:
     - 500/503 or timeout → backend/DB or connection.
     - 200 but empty array → query running but returning no documents (e.g. wrong DB, or filters excluding everything).

---

## Summary

- **Index definitions in this repo only add indexes; they do not delete or unlink data.**
- If “nothing is linking and no data” started after a change “yesterday”, the cause is likely:
  - Something done in Atlas (different DB, dropped collection, or a manual index/script), or
  - Connection/timeout/network (same DB but app can’t reach it or waits too long).

Use the checks above to confirm database, data, indexes, and errors; that will show whether the issue is data/connection vs. application code.

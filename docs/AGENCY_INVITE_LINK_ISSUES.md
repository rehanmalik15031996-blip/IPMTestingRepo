# Agency invite link: "Invite not valid" / "Invalid or expired PIN"

If someone clicks the invite link from the email and sees **"Invite not valid"** or **"Invalid or expired PIN"**, it’s usually one of two things:

---

## 1. **Different database (most common after a DB switch)**

The invite is stored in the **same MongoDB** as the deployment that **sent** the invite. When the user clicks the link, they go to a **URL** (e.g. `internationalpropertymarket.com`). That URL is served by a **Vercel project**, and that project has its own **MONGO_URI**. If that project uses a **different** MongoDB than the one where the invite was created, the token won’t be found → **"Invalid or expired PIN"**.

**Typical case:**

- You sent the invite from a **new** deployment (e.g. new Vercel project with new cluster).
- The link in the email points to **internationalpropertymarket.com**.
- That domain is still wired to the **old** Vercel project (old cluster).
- So the invite exists in the **new** DB, but the page at internationalpropertymarket.com asks the **old** DB → not found.

**Fix:**

- **Option A:** Use one database everywhere. Point **internationalpropertymarket.com** to the **same** Vercel project that uses the **new** cluster (so production and invite flow use the same MONGO_URI).  
  In Vercel: that project’s **Settings → Domains** should list `internationalpropertymarket.com` (and/or www), and that project’s **Environment Variables** must have **MONGO_URI** for the new cluster (with `/ipm_db` in the URI).
- **Option B:** If you’re only testing on a new deployment, open the invite link on **that** deployment’s URL (e.g. `https://your-new-project.vercel.app/agency-agent-invite?token=...`) instead of internationalpropertymarket.com, so the same DB is used for both sending and validating the invite.

---

## 2. **Invite actually expired**

Invites expire **7 days** after creation. If the link is opened after that, the API returns **"Invite expired"**.

**Fix:** Send a new invite from the agency dashboard (Agents tab → invite again). The new link will be valid for 7 days.

---

## Quick check

- **Same DB everywhere?**  
  Confirm the Vercel project that serves **internationalpropertymarket.com** has **MONGO_URI** pointing to the cluster where you created the invite (e.g. the new cluster). If you have two projects (old production vs new), only the one whose MONGO_URI has that cluster will “see” the invite.
- **Expired?**  
  If the message is literally **"Invite expired"** (not “Invalid or expired PIN”), the invite was found but past its 7-day window; send a new one.

# 🔥 Setup Firestore for Vercel (No Google Cloud Function Needed!)

## ✅ Great News!

We're implementing OTP verification **directly in your Vercel code** instead of using a separate Google Cloud Function. This is:
- ✅ **Simpler** - No deployment issues
- ✅ **Faster** - No extra network calls
- ✅ **Easier** - Everything in one place

---

## 🔧 Step 1: Install Firestore Package

The package is already added to `package.json`. Just install it:

```bash
npm install
```

Or if you're in the root directory:
```bash
npm install @google-cloud/firestore
```

---

## 🔑 Step 2: Get Firestore Service Account Key

### Option A: Create Service Account (Recommended)

1. Go to [Google Cloud Console](https://console.cloud.google.com/iam-admin/serviceaccounts?project=ipm-beta)
2. Click **"Create Service Account"**
3. **Name:** `vercel-firestore-access`
4. **Description:** `Service account for Vercel to access Firestore`
5. Click **"Create and Continue"**
6. **Grant Role:** `Cloud Datastore User` or `Firestore User`
7. Click **"Continue"** → **"Done"**

### Step 3: Create Key

1. Click on the service account you just created
2. Go to **"Keys"** tab
3. Click **"Add Key"** → **"Create new key"**
4. Select **JSON**
5. Click **"Create"**
6. **Download the JSON file** (keep it safe!)

---

## ⚙️ Step 3: Add to Vercel Environment Variables

1. Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**
2. Add new variable:
   - **Key:** `GOOGLE_SERVICE_ACCOUNT_KEY`
   - **Value:** Paste the **entire JSON content** from the downloaded file
   - **Environments:** Select all (Production, Preview, Development)
3. Click **"Save"**

**Important:** The value should be the entire JSON object as a string, like:
```json
{"type":"service_account","project_id":"ipm-beta",...}
```

---

## ✅ Step 4: That's It!

The code is already updated in `api/auth/otp.js` to:
- ✅ Use your existing send function (Google Cloud)
- ✅ Handle verify directly in Vercel (using Firestore)

**No need to deploy any Google Cloud Functions!**

---

## 🧪 Test It

After setting the environment variable and deploying:

```javascript
// Test verify (after sending OTP)
fetch('/api/auth/otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'verify',
    email: 'test@example.com',
    otp: '1234'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 🔍 How It Works Now

1. **Send OTP:** 
   - Frontend → `/api/auth/otp?action=send`
   - Vercel → Proxies to your Google Cloud Function
   - Google Cloud Function → Stores in Firestore, sends email

2. **Verify OTP:**
   - Frontend → `/api/auth/otp?action=verify`
   - Vercel → **Directly reads from Firestore** (no Google Cloud Function needed!)
   - Returns verification result

---

## 💡 Benefits

- ✅ **No deployment issues** - Everything in Vercel
- ✅ **Faster** - One less network hop
- ✅ **Simpler** - One less service to manage
- ✅ **Same database** - Uses your existing Firestore

---

## 🐛 Troubleshooting

### Issue: "Firestore not available"

**Fix:** Make sure `GOOGLE_SERVICE_ACCOUNT_KEY` is set in Vercel environment variables.

### Issue: "Permission denied"

**Fix:** Make sure the service account has `Cloud Datastore User` or `Firestore User` role.

### Issue: "Database not found"

**Fix:** Make sure the database name is `ipm-database` (matches your send function).

---

## ✅ Next Steps

1. ✅ Install package: `npm install`
2. ✅ Create service account (5 minutes)
3. ✅ Add to Vercel environment variables (2 minutes)
4. ✅ Deploy to Vercel
5. ✅ Test!

---

**This is much simpler than deploying a separate Google Cloud Function!** 🎉


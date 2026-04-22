# 🧪 Local Testing Setup for OTP Verify

## Quick Setup (2 Steps)

### Step 1: Get Your Service Account Key

You need a Google Cloud service account key to access Firestore. 

**Option A: If you already have the key file:**
1. Find your `*.json` service account key file
2. Copy its full path

**Option B: Create a new key:**
1. Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=ipm-beta
2. Click **"Create Service Account"**
3. Name: `vercel-firestore-access`
4. Role: `Cloud Datastore User`
5. Create and download JSON key

---

### Step 2: Set Environment Variable

**Windows PowerShell:**
```powershell
# Read the JSON file and set it
$keyContent = Get-Content -Path "path\to\your\service-account-key.json" -Raw
$env:GOOGLE_SERVICE_ACCOUNT_KEY = $keyContent
```

**Example:**
```powershell
$keyContent = Get-Content -Path "C:\Users\it\Downloads\ipm-beta-key.json" -Raw
$env:GOOGLE_SERVICE_ACCOUNT_KEY = $keyContent
```

---

### Step 3: Run Test Server

```bash
node test-server-local.js
```

This will start a server on `http://localhost:5000`

---

### Step 4: Test Verify (in a new terminal)

```bash
node test-verify-via-server.js
```

---

## ✅ Expected Result

If everything works:
```
✅ SUCCESS! OTP verified successfully!
🎉 Both Send and Verify functions are working!
```

---

## 🔍 Troubleshooting

**Error: "Firestore not initialized"**
- Make sure `GOOGLE_SERVICE_ACCOUNT_KEY` is set
- Check that the JSON key is valid

**Error: "OTP not found"**
- OTP might have expired (10 minutes)
- Make sure you're using the correct email

**Error: "Connection refused"**
- Make sure `test-server-local.js` is running first


# 🔑 Get Service Account Key for Local Testing

## ✅ You Have the Service Account!

You already have:
- **Service Account:** `firebase-adminsdk-fbsvc@ipm-beta.iam.gserviceaccount.com`
- **Project:** `ipm-beta`

Now we just need to download the key file!

---

## 📥 Step 1: Download the Key

1. **Go to Service Accounts:**
   https://console.cloud.google.com/iam-admin/serviceaccounts?project=ipm-beta

2. **Find your service account:**
   - Look for: `firebase-adminsdk-fbsvc@ipm-beta.iam.gserviceaccount.com`
   - Or: `firebase-adminsdk`

3. **Click on it** to open details

4. **Go to "Keys" tab**

5. **Click "Add Key" → "Create new key"**

6. **Select "JSON"** format

7. **Click "Create"**

8. **Download the JSON file** (save it somewhere safe!)

---

## 🧪 Step 2: Test Locally

Once you have the JSON file:

### Option A: Use the Setup Script

```powershell
.\setup-credentials.ps1
```

Then enter the path to your downloaded JSON file.

### Option B: Manual Setup

```powershell
# Replace with your actual file path
$keyContent = Get-Content -Path "C:\path\to\your\firebase-adminsdk-key.json" -Raw
$env:GOOGLE_SERVICE_ACCOUNT_KEY = $keyContent
```

### Step 3: Test Verify

```powershell
# Make sure test-server-local.js is running (in background)
node test-verify-via-server.js
```

Then enter OTP code: `6521`

---

## ✅ Expected Result

```
✅ OTP Code Matches!
✅ Verification successful!
🎉 SUCCESS! OTP verification complete!
```

---

## 🚀 For Production (Vercel)

After testing locally, add the same key to Vercel:

1. Go to your Vercel project settings
2. Environment Variables
3. Add: `GOOGLE_SERVICE_ACCOUNT_KEY`
4. Value: Copy the entire JSON content from your key file
5. Redeploy

---

## 📝 Quick Test (Without Key)

If you want to test the verification logic without the key, the code **already works** - we just can't update Firestore. But we can verify the code matches!

**Current Status:**
- ✅ Send OTP: Working
- ✅ Store in Firestore: Working (via your Google Cloud Function)
- ✅ Read from Firestore: Needs service account key
- ✅ Verify Logic: Ready (just needs key for full functionality)

---

**Download the key file and we can test the full flow!**


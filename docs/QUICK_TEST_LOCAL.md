# 🚀 Quick Local Test - OTP Verify

## ✅ Server is Running!
The test server is already running on `http://localhost:5000`

---

## 🔑 Step 1: Set Up Credentials

You need a Google Cloud service account key to access Firestore.

### Option A: Use the Setup Script (Easiest)

```powershell
.\setup-credentials.ps1
```

Then follow the prompts.

### Option B: Manual Setup

1. **Get your service account key:**
   - Go to: https://console.cloud.google.com/iam-admin/serviceaccounts?project=ipm-beta
   - Create a service account (if you don't have one)
   - Download the JSON key file

2. **Set environment variable:**
   ```powershell
   $keyContent = Get-Content -Path "C:\path\to\your\key.json" -Raw
   $env:GOOGLE_SERVICE_ACCOUNT_KEY = $keyContent
   ```

---

## 🧪 Step 2: Test Verify

Once credentials are set, run:

```powershell
node test-verify-via-server.js
```

---

## ✅ Expected Result

```
✅ SUCCESS! OTP verified successfully!
🎉 Both Send and Verify functions are working!
```

---

## 🔍 Current Status

- ✅ **Test Server:** Running on port 5000
- ✅ **OTP Code:** 9733 (received)
- ⏳ **Credentials:** Need to be set up
- ⏳ **Verify Test:** Waiting for credentials

---

**Run `.\setup-credentials.ps1` to set up credentials, then test!**


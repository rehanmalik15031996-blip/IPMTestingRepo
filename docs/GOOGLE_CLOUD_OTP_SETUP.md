# 🔐 Google Cloud Functions OTP Setup Guide

This guide will help you set up Google Cloud Functions to send and verify OTP codes for user registration.

---

## 📋 Prerequisites

1. **Google Cloud Account** (Free tier available)
2. **Gmail Account** (for sending emails)
3. **Google Cloud SDK** installed locally (optional, for CLI deployment)

---

## 🚀 Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **"Select a project"** → **"New Project"**
3. Enter project name: `ipm-otp-service` (or your preferred name)
4. Click **"Create"**
5. Wait for project creation (takes ~30 seconds)

---

## 🔧 Step 2: Enable Required APIs

1. In Google Cloud Console, go to **"APIs & Services"** → **"Library"**
2. Enable these APIs:
   - ✅ **Cloud Functions API**
   - ✅ **Cloud Build API**
   - ✅ **Cloud Logging API**

---

## 📧 Step 3: Set Up Gmail for Sending Emails

### Option A: Use Gmail App Password (Recommended)

1. Go to your Google Account: https://myaccount.google.com/
2. Click **"Security"** → **"2-Step Verification"** (enable if not enabled)
3. Go to **"App passwords"**
4. Select app: **"Mail"**
5. Select device: **"Other (Custom name)"**
6. Enter name: **"IPM OTP Service"**
7. Click **"Generate"**
8. **Copy the 16-character password** (you'll need this)

### Option B: Use OAuth2 (More Complex)

For production, consider using OAuth2 instead of App Password. See [Nodemailer OAuth2 Guide](https://nodemailer.com/smtp/oauth2/).

---

## ☁️ Step 4: Deploy Google Cloud Functions

### Option A: Deploy via Google Cloud Console (Easier)

#### 4.1. Deploy Send OTP Function

1. Go to **Cloud Functions** → **"Create Function"**
2. **Basic Settings:**
   - Function name: `sendOtp`
   - Region: `us-central1` (or your preferred region)
   - Trigger type: **HTTP**
   - Authentication: **Allow unauthenticated invocations**
3. **Runtime Settings:**
   - Runtime: **Node.js 20**
   - Entry point: `sendOtp`
4. **Source Code:**
   - Source: **Inline editor**
   - Copy code from `google-cloud-functions/send-otp/index.js`
5. **Environment Variables:**
   - `GMAIL_USER`: Your Gmail address (e.g., `your-email@gmail.com`)
   - `GMAIL_APP_PASSWORD`: The 16-character app password from Step 3
6. **Dependencies:**
   - Add to `package.json`:
     ```json
     {
       "dependencies": {
         "@google-cloud/functions-framework": "^3.3.0",
         "nodemailer": "^6.9.7"
       }
     }
     ```
7. Click **"Deploy"** (takes 2-3 minutes)

#### 4.2. Deploy Verify OTP Function

1. Go to **Cloud Functions** → **"Create Function"**
2. **Basic Settings:**
   - Function name: `verifyOtp`
   - Region: `us-central1` (same as sendOtp)
   - Trigger type: **HTTP**
   - Authentication: **Allow unauthenticated invocations**
3. **Runtime Settings:**
   - Runtime: **Node.js 20**
   - Entry point: `verifyOtp`
4. **Source Code:**
   - Source: **Inline editor**
   - Copy code from `google-cloud-functions/verify-otp/index.js`
5. **Dependencies:**
   - Add to `package.json`:
     ```json
     {
       "dependencies": {
         "@google-cloud/functions-framework": "^3.3.0"
       }
     }
     ```
6. Click **"Deploy"**

### Option B: Deploy via CLI (Advanced)

```bash
# Install Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Set project
gcloud config set project YOUR_PROJECT_ID

# Deploy functions
cd google-cloud-functions/send-otp
gcloud functions deploy sendOtp \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1 \
  --set-env-vars GMAIL_USER=your-email@gmail.com,GMAIL_APP_PASSWORD=your-app-password

cd ../verify-otp
gcloud functions deploy verifyOtp \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region us-central1
```

---

## 🔗 Step 5: Get Function URLs

After deployment:

1. Go to **Cloud Functions** → Click on `sendOtp`
2. Copy the **Trigger URL** (e.g., `https://us-central1-YOUR_PROJECT.cloudfunctions.net/sendOtp`)
3. Repeat for `verifyOtp`

**Save these URLs** - you'll need them for Vercel environment variables.

---

## ⚙️ Step 6: Configure Vercel Environment Variables

1. Go to your Vercel project dashboard
2. **Settings** → **Environment Variables**
3. Add these variables:

```
GOOGLE_SEND_OTP_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net/sendOtp
GOOGLE_VERIFY_OTP_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net/verifyOtp
```

4. Select all environments (Production, Preview, Development)
5. Click **"Save"**

---

## 🧪 Step 7: Test the Functions

### Test Send OTP:

```bash
curl -X POST https://us-central1-YOUR_PROJECT.cloudfunctions.net/sendOtp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

**Expected Response:**
```json
{
  "success": true,
  "message": "OTP sent successfully",
  "expiresIn": 600
}
```

### Test Verify OTP:

```bash
curl -X POST https://us-central1-YOUR_PROJECT.cloudfunctions.net/verifyOtp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

**Expected Response (if valid):**
```json
{
  "success": true,
  "message": "OTP verified successfully",
  "verified": true
}
```

---

## 🔄 Step 8: Update Frontend (Already Done!)

The frontend registration pages have been updated to use the new OTP API:

- ✅ `AgencyRegistration.js` - Uses `/api/auth/otp`
- ✅ `ClientRegistration.js` - Uses `/api/auth/otp`
- ✅ `IndependentAgentRegistration.js` - Uses `/api/auth/otp`

**No frontend changes needed!** The code will automatically use the real OTP service once Google Cloud Functions are deployed.

---

## 📊 How It Works

1. **User enters email** → Frontend calls `/api/auth/otp?action=send`
2. **Vercel API** → Proxies request to Google Cloud Function `sendOtp`
3. **Google Cloud Function** → Generates OTP, sends email, stores OTP
4. **User enters OTP** → Frontend calls `/api/auth/otp?action=verify`
5. **Vercel API** → Proxies request to Google Cloud Function `verifyOtp`
6. **Google Cloud Function** → Verifies OTP, returns success/failure

---

## 🔒 Security Notes

### Current Implementation (Development):
- ✅ OTPs stored in memory (cleared on function restart)
- ✅ 10-minute expiry
- ✅ Maximum 5 verification attempts
- ✅ CORS enabled for your domain

### For Production (Recommended):
- ⚠️ **Use Redis or Firestore** for OTP storage (shared between functions)
- ⚠️ **Rate limiting** per email/IP
- ⚠️ **HTTPS only** (already enforced by Google Cloud)
- ⚠️ **Environment variables** for sensitive data (already implemented)

---

## 💰 Cost Estimate

**Google Cloud Functions (Free Tier):**
- ✅ 2 million invocations/month free
- ✅ 400,000 GB-seconds compute time/month free
- ✅ After free tier: ~$0.40 per million invocations

**Gmail:**
- ✅ Free for sending emails (up to 500 emails/day for free accounts)
- ✅ For higher volumes, use SendGrid, Mailgun, or AWS SES

**Estimated Cost:** **$0/month** for typical usage (under free tier limits)

---

## 🐛 Troubleshooting

### Issue: "Function not found"
- ✅ Check function name matches exactly
- ✅ Verify region is correct
- ✅ Ensure function is deployed

### Issue: "Email not sending"
- ✅ Verify Gmail App Password is correct
- ✅ Check Gmail account has 2-Step Verification enabled
- ✅ Check Cloud Functions logs for errors

### Issue: "CORS error"
- ✅ CORS is already enabled in functions
- ✅ Check if calling from correct domain

### Issue: "OTP not verifying"
- ✅ OTPs are stored in memory (lost on function restart)
- ✅ For production, use Redis/Firestore for persistent storage
- ✅ Check OTP hasn't expired (10 minutes)

---

## 📝 Next Steps

1. ✅ Deploy Google Cloud Functions
2. ✅ Get function URLs
3. ✅ Set Vercel environment variables
4. ✅ Test OTP flow
5. ✅ Deploy updated Vercel app
6. ✅ Test registration with real OTP

---

## 🎉 You're Done!

Once deployed, your registration flow will use real OTP codes sent via email!

**Test it:**
1. Go to registration page
2. Enter email
3. Click "Send OTP"
4. Check email for 6-digit code
5. Enter code to verify

---

**Need Help?** Check Google Cloud Functions logs:
- Cloud Console → Cloud Functions → Function → Logs


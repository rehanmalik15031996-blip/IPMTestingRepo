# 🚀 Quick Start: Google Cloud OTP Implementation

## ✅ What's Been Done

1. ✅ **Google Cloud Functions Created:**
   - `send-otp` - Sends OTP via email
   - `verify-otp` - Verifies OTP code

2. ✅ **Vercel API Endpoint Created:**
   - `/api/auth/otp` - Proxies requests to Google Cloud Functions

3. ✅ **Frontend Updated:**
   - All registration pages now use real OTP API
   - `AgencyRegistration.js`
   - `ClientRegistration.js`
   - `IndependentAgentRegistration.js`

---

## 📋 Next Steps (You Need to Do)

### 1. Set Up Google Cloud Functions

Follow the detailed guide: **`GOOGLE_CLOUD_OTP_SETUP.md`**

**Quick Summary:**
1. Create Google Cloud project
2. Enable Cloud Functions API
3. Set up Gmail App Password
4. Deploy `send-otp` function
5. Deploy `verify-otp` function
6. Get function URLs

### 2. Configure Vercel Environment Variables

Add to Vercel Dashboard → Settings → Environment Variables:

```
GOOGLE_SEND_OTP_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net/sendOtp
GOOGLE_VERIFY_OTP_URL=https://us-central1-YOUR_PROJECT.cloudfunctions.net/verifyOtp
```

### 3. Deploy to Vercel

```bash
git add .
git commit -m "Add Google Cloud Functions OTP integration"
git push origin main
```

Vercel will auto-deploy.

---

## 🧪 Testing

1. Go to registration page
2. Enter email
3. Click "Send OTP"
4. Check email for 6-digit code
5. Enter code to verify
6. Continue with registration

---

## 📁 Files Created

- `google-cloud-functions/send-otp/index.js` - Send OTP function
- `google-cloud-functions/verify-otp/index.js` - Verify OTP function
- `google-cloud-functions/package.json` - Dependencies
- `api/auth/otp.js` - Vercel API proxy
- `GOOGLE_CLOUD_OTP_SETUP.md` - Complete setup guide

---

## 💡 How It Works

```
User → Frontend → /api/auth/otp → Google Cloud Function → Email
```

1. User enters email
2. Frontend calls `/api/auth/otp?action=send`
3. Vercel proxies to Google Cloud Function
4. Google Cloud Function sends email with OTP
5. User enters OTP
6. Frontend calls `/api/auth/otp?action=verify`
7. Google Cloud Function verifies OTP
8. Registration continues

---

**Ready to deploy!** Follow `GOOGLE_CLOUD_OTP_SETUP.md` for detailed instructions.


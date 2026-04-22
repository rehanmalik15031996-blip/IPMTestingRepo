# ✅ Complete Setup Guide - Your Project

## 📋 What You Have

- ✅ **Send OTP Function:** `https://send-otp-541421913321.europe-west4.run.app`
- ✅ **Project ID:** `ipm-beta`
- ✅ **Region:** `europe-west4`
- ✅ **Database:** Firestore (`ipm-database`)
- ✅ **Language:** Python

---

## 🚀 Step 1: Deploy Verify Function

I've created a Python verify function that matches your send function structure.

**Follow:** `DEPLOY_VERIFY_FUNCTION_PYTHON.md`

**Quick Steps:**
1. Go to [Cloud Functions](https://console.cloud.google.com/functions?project=ipm-beta)
2. Create new function: `verify-otp`
3. Copy code from `google-cloud-functions/verify-otp/main.py`
4. Deploy
5. Get URL (should be: `https://verify-otp-541421913321.europe-west4.run.app`)

---

## ⚙️ Step 2: Set Vercel Environment Variables

Go to **Vercel Dashboard** → Your Project → **Settings** → **Environment Variables**

Add:

```
GOOGLE_SEND_OTP_URL=https://send-otp-541421913321.europe-west4.run.app
GOOGLE_VERIFY_OTP_URL=https://verify-otp-541421913321.europe-west4.run.app
```

**Select all environments** (Production, Preview, Development)

---

## ✅ Step 3: Test

### Test Send OTP:
```javascript
// In browser console
fetch('/api/auth/otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'send',
    email: 'your-email@gmail.com'
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

### Test Verify OTP:
```javascript
// After receiving OTP in email
fetch('/api/auth/otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'verify',
    email: 'your-email@gmail.com',
    otp: '1234' // 4-digit code from email
  })
})
.then(res => res.json())
.then(data => console.log(data));
```

---

## 🎯 What's Been Updated

1. ✅ **Verify Function Created** - Python, matches your send function
2. ✅ **Frontend Updated** - Changed to 4-digit OTP (matches your function)
3. ✅ **API Endpoint Updated** - Works with your function structure
4. ✅ **Documentation Created** - Step-by-step guides

---

## 📊 How It Works

1. **User enters email** → Frontend calls `/api/auth/otp?action=send`
2. **Vercel API** → Proxies to your send function
3. **Your Send Function** → Generates 4-digit OTP, stores in Firestore, sends email
4. **User enters OTP** → Frontend calls `/api/auth/otp?action=verify`
5. **Vercel API** → Proxies to verify function
6. **Verify Function** → Checks Firestore, validates OTP
7. **Registration continues** → OTP verified!

---

## 🔍 Key Differences from Original Plan

- ✅ **4-digit OTP** (not 6-digit) - Updated frontend
- ✅ **Python functions** (not Node.js) - Created Python verify function
- ✅ **Firestore storage** (not in-memory) - Matches your send function
- ✅ **User existence check** - Your send function already handles this

---

## ✅ Next Steps

1. **Deploy verify function** (follow `DEPLOY_VERIFY_FUNCTION_PYTHON.md`)
2. **Set Vercel environment variables** (see above)
3. **Test the flow** (use test commands above)
4. **Deploy to Vercel** (push code)

---

## 🎉 You're Almost Done!

Once you:
1. ✅ Deploy the verify function
2. ✅ Set Vercel environment variables
3. ✅ Test it

**Everything will work!** The frontend is already updated to use 4-digit OTPs and call your functions.

---

**Share the verify function URL when you deploy it, and I'll verify everything is configured correctly!**


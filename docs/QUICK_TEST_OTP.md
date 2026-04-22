# ⚡ Quick Test: OTP Send + Verify

## 🎯 Test Both Functions Together

Since your send function works, let's test the complete flow!

---

## 🚀 Method 1: Browser Console (Fastest)

### Step 1: Test Send OTP

Open your browser console (F12) on your website and run:

```javascript
// Test Send OTP
fetch('https://send-otp-541421913321.europe-west4.run.app', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    email: 'your-email@gmail.com',
    userType: 'test'
  })
})
.then(res => res.json())
.then(data => {
  console.log('📧 Send OTP Result:', data);
  if (data.success) {
    console.log('✅ OTP sent! Check your email for 4-digit code.');
  } else {
    console.log('❌ Error:', data.error);
  }
});
```

**Expected:** You should receive an email with a 4-digit code.

---

### Step 2: Test Verify OTP

After receiving the code in your email, run this in the browser console:

```javascript
// Test Verify OTP (replace '1234' with actual code from email)
fetch('/api/auth/otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    action: 'verify',
    email: 'your-email@gmail.com',
    otp: '1234' // Replace with actual 4-digit code
  })
})
.then(res => res.json())
.then(data => {
  console.log('🔐 Verify OTP Result:', data);
  if (data.success && data.verified) {
    console.log('✅ OTP verified successfully!');
  } else {
    console.log('❌ Error:', data.error);
  }
});
```

**Expected:** 
- ✅ Valid OTP: `{ success: true, verified: true }`
- ❌ Invalid OTP: `{ success: false, error: "Invalid OTP code" }`

---

## 🚀 Method 2: Use Test HTML Page

1. Copy `test-otp-browser.html` to `client/public/`
2. Start dev server: `cd client && npm start`
3. Visit: `http://localhost:3000/test-otp-browser.html`
4. Enter email → Send OTP → Check email → Enter code → Verify

---

## 🔍 What to Verify

### ✅ Send OTP Should:
- Return success response
- Send email with 4-digit code
- Store in Firestore

### ✅ Verify OTP Should:
- Accept valid 4-digit code → Return success
- Reject invalid code → Return error
- Reject expired code (after 10 minutes) → Return error
- Track attempts (max 5)

---

## 🐛 If Verify Fails

**Check:**
1. ✅ Is `@google-cloud/firestore` installed? Run: `npm install`
2. ✅ Is `GOOGLE_SERVICE_ACCOUNT_KEY` set in Vercel?
3. ✅ Check browser console for errors
4. ✅ Check Vercel function logs

**Common Issues:**
- "Firestore not available" → Service account key not set
- "OTP not found" → Wrong email or OTP expired
- "Invalid OTP" → Wrong code entered

---

## 📋 Quick Checklist

- [ ] Send OTP works (email received)
- [ ] Verify OTP works with correct code
- [ ] Verify fails with wrong code
- [ ] Error messages are clear

---

**Try it now!** Use Method 1 (Browser Console) for the quickest test.


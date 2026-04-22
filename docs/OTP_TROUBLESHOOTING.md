# 🔍 OTP Troubleshooting Guide

## ❌ Issue: OTP Send Failed

If you're getting an error when clicking "Send OTP", check the following:

---

## 🔍 Step 1: Check Browser Console

1. Open your website
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Click "Send OTP"
5. Look for error messages

**Common errors:**
- `Network Error` - API endpoint not found
- `500 Internal Server Error` - Server error
- `CORS Error` - Cross-origin issue
- `Failed to fetch` - Network/connection issue

---

## 🔍 Step 2: Check Network Tab

1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Click "Send OTP"
4. Find the request to `/api/auth/otp`
5. Click on it to see:
   - **Request URL** - Should be your domain + `/api/auth/otp`
   - **Request Method** - Should be `POST`
   - **Request Payload** - Should have `action: 'send'` and `email`
   - **Response** - Check the error message

---

## 🔍 Step 3: Check Vercel Logs

1. Go to Vercel Dashboard
2. Click on your project
3. Go to **Deployments**
4. Click on the latest deployment
5. Go to **Functions** tab
6. Click on `api/auth/otp`
7. Check **Logs** for errors

**Look for:**
- `❌ Fetch error` - Connection to Google Cloud Function failed
- `❌ Failed to parse response` - Response format issue
- `❌ OTP send failed` - Google Cloud Function returned error

---

## 🔍 Step 4: Verify Environment Variables

Make sure these are set in **Vercel Dashboard → Settings → Environment Variables**:

### Required:
- ✅ `GOOGLE_SEND_OTP_URL` (or it will use default)
- ✅ `GOOGLE_API_KEY` (for verify, not needed for send)

### Check if set:
1. Go to Vercel Dashboard
2. Settings → Environment Variables
3. Verify `GOOGLE_SEND_OTP_URL` is set to:
   ```
   https://send-otp-541421913321.europe-west4.run.app
   ```

---

## 🔍 Step 5: Test Google Cloud Function Directly

Test if your Google Cloud Function is working:

```bash
curl -X POST https://send-otp-541421913321.europe-west4.run.app \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","userType":"buyer"}'
```

**Expected response:**
```json
{
  "success": true,
  "message": "OTP sent successfully"
}
```

**If it fails:**
- Check Google Cloud Function logs
- Verify Gmail credentials are set
- Check Firestore permissions

---

## 🔧 Common Fixes

### Fix 1: Missing Environment Variable
**Problem:** `GOOGLE_SEND_OTP_URL` not set in Vercel
**Solution:** Add it in Vercel Dashboard → Settings → Environment Variables

### Fix 2: CORS Error
**Problem:** Google Cloud Function blocking requests
**Solution:** Check Google Cloud Function CORS settings

### Fix 3: Network Timeout
**Problem:** Google Cloud Function taking too long
**Solution:** Check Google Cloud Function logs for errors

### Fix 4: Response Format Mismatch
**Problem:** Frontend expects `success: true` but gets different format
**Solution:** ✅ Already fixed in latest code - ensures consistent format

---

## 🧪 Test Locally

1. Make sure `.env` file exists in `server/` directory
2. Set `GOOGLE_SEND_OTP_URL` in `.env`
3. Run local server
4. Test OTP send

---

## 📋 Quick Checklist

- [ ] Browser console shows no errors
- [ ] Network tab shows successful request
- [ ] Vercel logs show no errors
- [ ] Environment variables are set in Vercel
- [ ] Google Cloud Function is accessible
- [ ] Response format is correct

---

## 🆘 Still Not Working?

1. **Check Vercel Function Logs:**
   - Look for detailed error messages
   - Check if Google Cloud Function is reachable

2. **Test Google Cloud Function:**
   - Use curl or Postman
   - Verify it's working independently

3. **Check Response Format:**
   - Frontend expects `{ success: true, ... }`
   - Google Cloud Function should return this format

4. **Redeploy:**
   - After fixing environment variables, redeploy
   - Changes take effect after deployment

---

**Share the error message from browser console or Vercel logs for more specific help!**


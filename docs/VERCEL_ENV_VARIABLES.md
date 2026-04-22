# 🔑 Vercel Environment Variables - Complete List

## ✅ Required Variables for Production

Add these to your Vercel project dashboard:

### 1. MongoDB Connection
```
MONGO_URI=mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0
```

### 2. JWT Secret
```
JWT_SECRET=SECRET_KEY_123
```
**⚠️ For production, use a stronger secret!**

### 3. Google API Key (Required for OTP)
```
GOOGLE_API_KEY=AIzaSyA6mWrGEqRPh9WVdv2J8ne8yMxmSSXeAlM
```

---

## 📋 Optional Variables

### 4. Google Send OTP URL (Has Default)
```
GOOGLE_SEND_OTP_URL=https://send-otp-541421913321.europe-west4.run.app
```

### 5. Google Service Account Key (For Full Firestore Write Access)
```
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"ipm-beta",...}
```
**Note:** Only needed if you want to update Firestore (mark OTP as verified, update attempts). The API key works for reading/verification.

### 6. Node Environment
```
NODE_ENV=production
```

---

## 🚀 How to Add to Vercel

1. Go to your Vercel project dashboard
2. Click **Settings** → **Environment Variables**
3. Click **Add New**
4. For each variable:
   - **Name:** Enter the variable name (e.g., `GOOGLE_API_KEY`)
   - **Value:** Enter the value
   - **Environment:** Select `Production`, `Preview`, and `Development`
5. Click **Save**
6. **Redeploy** your project for changes to take effect

---

## ✅ Quick Copy-Paste for Vercel

### Production Environment:

| Variable Name | Value |
|--------------|-------|
| `MONGO_URI` | `mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0` |
| `JWT_SECRET` | `SECRET_KEY_123` |
| `GOOGLE_API_KEY` | `AIzaSyA6mWrGEqRPh9WVdv2J8ne8yMxmSSXeAlM` |
| `GOOGLE_SEND_OTP_URL` | `https://send-otp-541421913321.europe-west4.run.app` |
| `NODE_ENV` | `production` |

---

## 🧪 Verify Variables Are Set

After adding variables and redeploying, test:

1. **Test OTP Send:**
   - Go to registration page
   - Enter email
   - Click "Send OTP"
   - Should receive email

2. **Test OTP Verify:**
   - Enter OTP code
   - Click "Verify"
   - Should proceed to next step

3. **Check Vercel Logs:**
   - Go to Vercel dashboard → Deployments
   - Click on latest deployment
   - Check Function Logs
   - Should see no errors about missing environment variables

---

## 📝 Notes

- ✅ All variables are set in your local `.env` file
- ✅ Copy the same values to Vercel
- ✅ `GOOGLE_API_KEY` is **required** for OTP verification
- ✅ `MONGO_URI` is **required** for database access
- ✅ `JWT_SECRET` is **required** for authentication

---

**Everything is ready! Add these to Vercel and redeploy!** 🚀


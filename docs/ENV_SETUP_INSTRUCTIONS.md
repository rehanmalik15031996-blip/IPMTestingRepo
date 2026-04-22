# 🔑 Environment Variables Setup

## ✅ Credentials Template Created

I've created `env.template` with all your credentials. Follow these steps:

---

## 📋 Step 1: Create .env File

**Windows PowerShell:**
```powershell
Copy-Item env.template .env
```

**Windows CMD:**
```cmd
copy env.template .env
```

**Mac/Linux:**
```bash
cp env.template .env
```

---

## 📝 Step 2: Verify .env File

Your `.env` file should contain:

```env
# MongoDB Atlas Connection
MONGO_URI=mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0

# JWT Secret for authentication tokens
JWT_SECRET=SECRET_KEY_123

# Google Cloud API Key for Firestore access (OTP verification)
GOOGLE_API_KEY=AIzaSyA6mWrGEqRPh9WVdv2J8ne8yMxmSSXeAlM

# Google Cloud Send OTP Function URL (optional - has default)
GOOGLE_SEND_OTP_URL=https://send-otp-541421913321.europe-west4.run.app

# Node Environment
NODE_ENV=development
```

---

## 🚀 Step 3: For Vercel Deployment

Add these environment variables in Vercel:

1. Go to your Vercel project dashboard
2. **Settings** → **Environment Variables**
3. Add each variable:

### Required Variables:

| Variable | Value |
|----------|-------|
| `MONGO_URI` | `mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0` |
| `JWT_SECRET` | `SECRET_KEY_123` (or generate a stronger one for production) |
| `GOOGLE_API_KEY` | `AIzaSyA6mWrGEqRPh9WVdv2J8ne8yMxmSSXeAlM` |

### Optional Variables:

| Variable | Value | Notes |
|----------|-------|-------|
| `GOOGLE_SEND_OTP_URL` | `https://send-otp-541421913321.europe-west4.run.app` | Has default, but good to set explicitly |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | `{JSON string}` | Only if you want full Firestore write access |
| `NODE_ENV` | `production` | Set to `production` for Vercel |

---

## ✅ Verification

### Local Development:
1. Copy `env.template` to `.env`
2. Restart your development server
3. Test OTP functionality

### Vercel Production:
1. Add all environment variables in Vercel dashboard
2. Redeploy your project
3. Test OTP functionality on live site

---

## 🔒 Security Notes

- ✅ `.env` is already in `.gitignore` (won't be committed)
- ✅ `env.template` is safe to commit (no sensitive data)
- ⚠️ **Never commit `.env` file to Git**
- ⚠️ **Change `JWT_SECRET` to a strong random string for production**

---

## 🧪 Test Environment Variables

After setting up, test that they're loaded:

```javascript
// In any API file, you can check:
console.log('MONGO_URI:', process.env.MONGO_URI ? '✅ Set' : '❌ Missing');
console.log('GOOGLE_API_KEY:', process.env.GOOGLE_API_KEY ? '✅ Set' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
```

---

## 📋 Quick Checklist

- [ ] Copy `env.template` to `.env`
- [ ] Verify `.env` file exists
- [ ] Add variables to Vercel (for production)
- [ ] Test OTP send/verify locally
- [ ] Deploy and test on Vercel

---

**All credentials are ready! Just copy the template to `.env` and you're good to go!** 🚀


# 🤖 Automated Deployment Scripts

Once you provide your credentials, I'll create these scripts for you to run. They'll automate the entire deployment process!

---

## 📋 Scripts I'll Create

### 1. `deploy-google-functions.sh` (or `.bat` for Windows)

This script will:
- ✅ Deploy `sendOtp` function
- ✅ Deploy `verifyOtp` function
- ✅ Set environment variables
- ✅ Get function URLs

### 2. `setup-vercel-env.sh` (or `.bat` for Windows)

This script will:
- ✅ Set Vercel environment variables
- ✅ Verify configuration

### 3. `test-otp.sh` (or `.bat` for Windows)

This script will:
- ✅ Test send OTP function
- ✅ Test verify OTP function
- ✅ Verify integration

---

## 🔧 What You Need to Run Scripts

### For Windows:
- ✅ PowerShell or Command Prompt
- ✅ Google Cloud SDK (I'll help install)
- ✅ Vercel CLI (I'll help install)

### For Mac/Linux:
- ✅ Terminal
- ✅ Google Cloud SDK (I'll help install)
- ✅ Vercel CLI (I'll help install)

---

## 📝 Example Script (Preview)

Here's what the deployment script will look like:

```bash
#!/bin/bash

# Google Cloud Configuration
PROJECT_ID="your-project-id"
REGION="us-central1"
GMAIL_USER="your-email@gmail.com"
GMAIL_APP_PASSWORD="your-app-password"

echo "🚀 Deploying Google Cloud Functions..."

# Deploy Send OTP
gcloud functions deploy sendOtp \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region $REGION \
  --set-env-vars GMAIL_USER=$GMAIL_USER,GMAIL_APP_PASSWORD=$GMAIL_APP_PASSWORD \
  --project $PROJECT_ID

# Deploy Verify OTP
gcloud functions deploy verifyOtp \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region $REGION \
  --project $PROJECT_ID

echo "✅ Deployment complete!"
echo "📋 Getting function URLs..."

# Get URLs
SEND_URL=$(gcloud functions describe sendOtp --region $REGION --project $PROJECT_ID --format="value(httpsTrigger.url)")
VERIFY_URL=$(gcloud functions describe verifyOtp --region $REGION --project $PROJECT_ID --format="value(httpsTrigger.url)")

echo "Send OTP URL: $SEND_URL"
echo "Verify OTP URL: $VERIFY_URL"

echo ""
echo "🔧 Next: Add these URLs to Vercel environment variables!"
```

---

## 🎯 What I'll Do

Once you provide credentials, I'll:

1. ✅ **Create personalized scripts** with your credentials
2. ✅ **Create step-by-step instructions** for your OS
3. ✅ **Create Vercel environment variable file** ready to import
4. ✅ **Create test scripts** to verify everything works
5. ✅ **Provide troubleshooting guide** for common issues

---

## ⚡ Quick Start (After I Create Scripts)

### Windows:
```powershell
# 1. Install Google Cloud SDK (if not installed)
# 2. Install Vercel CLI (if not installed)
npm install -g vercel

# 3. Run deployment script
.\deploy-google-functions.bat

# 4. Run Vercel setup
.\setup-vercel-env.bat
```

### Mac/Linux:
```bash
# 1. Install Google Cloud SDK (if not installed)
# 2. Install Vercel CLI (if not installed)
npm install -g vercel

# 3. Make scripts executable
chmod +x deploy-google-functions.sh
chmod +x setup-vercel-env.sh

# 4. Run deployment script
./deploy-google-functions.sh

# 5. Run Vercel setup
./setup-vercel-env.sh
```

---

## 🔒 Security Best Practices

The scripts will:
- ✅ **Not store credentials in Git** (use environment variables)
- ✅ **Use secure methods** for credential input
- ✅ **Clean up temporary files** after deployment
- ✅ **Provide instructions** for credential management

---

## 📞 Need Help?

After I create the scripts:
1. ✅ Run the scripts
2. ✅ Share any errors you encounter
3. ✅ I'll help troubleshoot immediately

---

**Ready?** Share your credentials using the `CREDENTIALS_CHECKLIST.md` format, and I'll create everything for you!


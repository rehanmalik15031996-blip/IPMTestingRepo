# 🚀 Deploy Verify OTP Function to Your Project

Since you already have the send function, let's deploy the verify function to the same project.

---

## 📋 Your Project Details

- **Project ID:** `ipm-beta`
- **Region:** `europe-west4`
- **Send Function:** `https://send-otp-541421913321.europe-west4.run.app`

---

## 🎯 Option 1: Deploy via Google Cloud Console (Easiest)

### Step 1: Go to Cloud Functions

1. Go to [Cloud Functions Console](https://console.cloud.google.com/functions?project=ipm-beta)
2. Click **"Create Function"**

### Step 2: Basic Settings

- **Function name:** `verify-otp`
- **Region:** `europe-west4` (same as your send function)
- **Trigger type:** **HTTP**
- **Authentication:** **Allow unauthenticated invocations**

### Step 3: Runtime Settings

- **Runtime:** **Node.js 20**
- **Entry point:** `verifyOtp`

### Step 4: Source Code

Copy the code from `google-cloud-functions/verify-otp/index.js` into the inline editor.

### Step 5: Dependencies

In the `package.json` section, add:

```json
{
  "dependencies": {
    "@google-cloud/functions-framework": "^3.3.0"
  }
}
```

### Step 6: Deploy

Click **"Deploy"** (takes 2-3 minutes)

### Step 7: Get URL

After deployment, click on the function and copy the **Trigger URL**.

---

## 🎯 Option 2: Deploy via CLI (Faster)

### Prerequisites

```bash
# Install Google Cloud SDK (if not installed)
# https://cloud.google.com/sdk/docs/install

# Login
gcloud auth login

# Set project
gcloud config set project ipm-beta
```

### Deploy Command

```bash
cd google-cloud-functions/verify-otp

gcloud functions deploy verify-otp \
  --gen2 \
  --runtime nodejs20 \
  --trigger-http \
  --allow-unauthenticated \
  --region europe-west4 \
  --source . \
  --entry-point verifyOtp \
  --project ipm-beta
```

**Note:** I used `--gen2` because your send function URL suggests you're using Cloud Run (Gen 2 functions).

---

## ✅ After Deployment

You'll get a URL like:
`https://verify-otp-541421913321.europe-west4.run.app`

**Share this URL with me and I'll configure everything!**

---

## 🧪 Test the Function

```bash
# First, send an OTP (use your send function)
curl -X POST https://send-otp-541421913321.europe-west4.run.app \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Then verify (replace 123456 with actual OTP from email)
curl -X POST https://verify-otp-541421913321.europe-west4.run.app \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","otp":"123456"}'
```

---

## 🔍 Check Your Send Function Structure

Since you already have a send function, I should check if it matches our structure. Can you:

1. Go to [Cloud Functions](https://console.cloud.google.com/functions?project=ipm-beta)
2. Click on `send-otp` function
3. Check the **Source** tab to see the code structure

This will help me ensure the verify function matches your setup!

---

**Once you deploy the verify function, share the URL and I'll complete the configuration!**


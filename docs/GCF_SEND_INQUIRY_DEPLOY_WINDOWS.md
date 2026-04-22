# Deploy Send Inquiry Function (Windows)

## Prerequisites

1. **Google Cloud SDK** installed
   - Download from: https://cloud.google.com/sdk/docs/install
   - Or use: `choco install gcloudsdk` (if you have Chocolatey)

2. **Gmail Credentials** (same as OTP function)
   - `GMAIL_ADDRESS`: Your Gmail address
   - `GMAIL_APP_PASSWORD`: Your Gmail App Password

## Quick Deploy (PowerShell)

### Step 1: Set Environment Variables

Open PowerShell and set your Gmail credentials:

```powershell
$env:GMAIL_ADDRESS = "your-email@gmail.com"
$env:GMAIL_APP_PASSWORD = "your-app-password"
```

### Step 2: Navigate to Function Directory

```powershell
cd google-cloud-functions\send-inquiry
```

### Step 3: Deploy

```powershell
gcloud functions deploy send-inquiry `
  --gen2 `
  --runtime=python311 `
  --region=europe-west4 `
  --source=. `
  --entry-point=send_inquiry `
  --trigger-http `
  --allow-unauthenticated `
  --set-env-vars GMAIL_ADDRESS=$env:GMAIL_ADDRESS,GMAIL_APP_PASSWORD=$env:GMAIL_APP_PASSWORD `
  --memory=256MB `
  --timeout=60s
```

### Step 4: Get Function URL

After deployment, you'll see output like:
```
https://send-inquiry-541421913321.europe-west4.run.app
```

### Step 5: Set Vercel Environment Variable

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. **Settings** → **Environment Variables**
4. Add:
   - **Key**: `GOOGLE_SEND_INQUIRY_URL`
   - **Value**: `https://send-inquiry-541421913321.europe-west4.run.app`
   - **Environments**: Select all (Production, Preview, Development)
5. Click **Save**

### Step 6: Test

After deployment, test the function:

```powershell
$body = @{
    firstName = "Rehan"
    lastName = "Malik"
    email = "rehanmalil99@gmail.com"
    phone = ""
    message = "i want to sleep"
    selectedDate = "January 20, 2026"
} | ConvertTo-Json

Invoke-RestMethod -Uri "https://send-inquiry-541421913321.europe-west4.run.app" `
    -Method Post `
    -ContentType "application/json" `
    -Body $body
```

Expected response:
```json
{
  "success": true,
  "message": "Inquiry sent successfully"
}
```

## Alternative: Deploy via Google Cloud Console

1. Go to [Cloud Functions](https://console.cloud.google.com/functions?project=ipm-beta)
2. Click **"Create Function"**
3. Configure:
   - **Name**: `send-inquiry`
   - **Region**: `europe-west4`
   - **Runtime**: `Python 3.11`
   - **Entry point**: `send_inquiry`
   - **Trigger**: `HTTP`
   - **Authentication**: `Allow unauthenticated invocations`
4. Copy code from `main.py` into the editor
5. Add `requirements.txt` content
6. Set environment variables:
   - `GMAIL_ADDRESS`
   - `GMAIL_APP_PASSWORD`
7. Click **Deploy**

## Troubleshooting

### Error: "Function not found"
- Make sure you're in the correct project: `gcloud config set project ipm-beta`

### Error: "Permission denied"
- Authenticate: `gcloud auth login`
- Set application default credentials: `gcloud auth application-default login`

### Error: "Module not found"
- Make sure `requirements.txt` is in the same directory as `main.py`

### Email not sending
- Check Gmail credentials are correct
- Verify Gmail App Password is valid
- Check function logs in Google Cloud Console


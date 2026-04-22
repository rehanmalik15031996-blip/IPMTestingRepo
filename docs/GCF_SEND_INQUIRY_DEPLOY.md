# Deploy Send Inquiry Google Cloud Function

This function sends inquiry form submissions to `enquiries@internationalpropertymarket.com` using Gmail SMTP.

## Prerequisites

1. Google Cloud SDK installed and configured
2. Gmail App Password created (same as used for OTP function)
3. Project ID: `541421913321` (or your project ID)

## Deployment Steps

### 1. Navigate to the function directory
```bash
cd google-cloud-functions/send-inquiry
```

### 2. Deploy the function
```bash
gcloud functions deploy send-inquiry \
  --gen2 \
  --runtime=python311 \
  --region=europe-west4 \
  --source=. \
  --entry-point=send_inquiry \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars GMAIL_ADDRESS=your-email@gmail.com,GMAIL_APP_PASSWORD=your-app-password
```

### 3. Get the function URL
After deployment, you'll get a URL like:
```
https://send-inquiry-541421913321.europe-west4.run.app
```

### 4. Set the environment variable in Vercel
Add this to your Vercel environment variables:
- **Key**: `GOOGLE_SEND_INQUIRY_URL`
- **Value**: `https://send-inquiry-541421913321.europe-west4.run.app` (your actual URL)

## Testing

You can test the function locally or via the deployed URL:

```bash
curl -X POST https://send-inquiry-541421913321.europe-west4.run.app \
  -H "Content-Type: application/json" \
  -d '{
    "firstName": "John",
    "lastName": "Doe",
    "email": "test@example.com",
    "phone": "+1234567890",
    "message": "Test inquiry message",
    "selectedDate": "January 16, 2026"
  }'
```

## Function Details

- **Function Name**: `send-inquiry`
- **Runtime**: Python 3.11
- **Region**: europe-west4
- **Trigger**: HTTP
- **Authentication**: Unauthenticated (public, but CORS-protected)
- **Email Recipient**: `enquiries@internationalpropertymarket.com`

## Environment Variables Required

- `GMAIL_ADDRESS`: Your Gmail address (same as OTP function)
- `GMAIL_APP_PASSWORD`: Your Gmail App Password (same as OTP function)

## Notes

- The function uses the same Gmail credentials as the OTP function
- CORS is enabled for cross-origin requests
- The function sends a formatted HTML email with all inquiry details
- If email sending fails, the inquiry is still saved to the database (non-blocking)


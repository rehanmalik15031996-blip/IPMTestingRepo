#!/bin/bash

# Deploy Send Inquiry Google Cloud Function
# This function sends inquiry form submissions to enquiries@internationalpropertymarket.com

echo "🚀 Deploying Send Inquiry Google Cloud Function..."
echo ""

# Set your project and region
PROJECT_ID="ipm-beta"
PROJECT_NUMBER="541421913321"
REGION="europe-west4"
FUNCTION_NAME="send-inquiry"

# Check if gcloud is installed
if ! command -v gcloud &> /dev/null; then
    echo "❌ Error: gcloud CLI is not installed"
    echo "Please install it from: https://cloud.google.com/sdk/docs/install"
    exit 1
fi

# Set the project
echo "📋 Setting project to $PROJECT_ID..."
gcloud config set project $PROJECT_ID

# Deploy the function
echo ""
echo "📦 Deploying function: $FUNCTION_NAME"
echo "📍 Region: $REGION"
echo ""

gcloud functions deploy $FUNCTION_NAME \
  --gen2 \
  --runtime=python311 \
  --region=$REGION \
  --source=. \
  --entry-point=send_inquiry \
  --trigger-http \
  --allow-unauthenticated \
  --set-env-vars GMAIL_ADDRESS=$GMAIL_ADDRESS,GMAIL_APP_PASSWORD=$GMAIL_APP_PASSWORD \
  --memory=256MB \
  --timeout=60s

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Function deployed successfully!"
    echo ""
    echo "🔗 Function URL:"
    echo "https://${FUNCTION_NAME}-${PROJECT_NUMBER}.${REGION}.run.app"
    echo ""
    echo "📧 This function will send emails to: enquiries@internationalpropertymarket.com"
    echo ""
    echo "⚠️  Don't forget to:"
    echo "1. Set GOOGLE_SEND_INQUIRY_URL in Vercel environment variables"
    echo "2. Set GMAIL_ADDRESS and GMAIL_APP_PASSWORD as environment variables before running this script"
    echo ""
else
    echo ""
    echo "❌ Deployment failed!"
    exit 1
fi


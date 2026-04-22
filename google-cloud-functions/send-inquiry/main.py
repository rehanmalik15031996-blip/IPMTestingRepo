import functions_framework
from flask import jsonify
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
import os
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@functions_framework.http
def send_inquiry(request):
    """
    Send inquiry form data via email to enquiries@internationalpropertymarket.com
    
    Expected JSON payload:
    {
        "firstName": "John",
        "lastName": "Doe",
        "email": "user@example.com",
        "phone": "+1234567890",
        "message": "Message text",
        "selectedDate": "January 16, 2026"
    }
    """
    
    # CORS headers
    if request.method == 'OPTIONS':
        headers = {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'POST',
            'Access-Control-Allow-Headers': 'Content-Type',
            'Access-Control-Max-Age': '3600'
        }
        return ('', 204, headers)
    
    headers = {'Access-Control-Allow-Origin': '*'}

    # Validate request method
    if request.method != 'POST':
        return (jsonify({'success': False, 'error': 'Method not allowed'}), 405, headers)

    # Get Gmail credentials from environment variables
    gmail_address = os.environ.get('GMAIL_ADDRESS')
    gmail_password = os.environ.get('GMAIL_APP_PASSWORD')
    
    if not gmail_address or not gmail_password:
        logger.error("Gmail credentials not configured")
        return (jsonify({'success': False, 'error': 'Server configuration error'}), 500, headers)

    # Parse request
    try:
        request_json = request.get_json(silent=True)
        if not request_json:
            logger.error("No data provided in request")
            return (jsonify({'success': False, 'error': 'Form data is required'}), 400, headers)
    except Exception as e:
        logger.error(f"JSON parsing error: {str(e)}")
        return (jsonify({'success': False, 'error': 'Invalid request'}), 400, headers)

    # Extract form data
    firstName = request_json.get('firstName', '').strip()
    lastName = request_json.get('lastName', '').strip()
    email = request_json.get('email', '').strip().lower()
    phone = request_json.get('phone', '').strip()
    message = request_json.get('message', '').strip()
    selectedDate = request_json.get('selectedDate', '').strip()
    
    logger.info(f"Send inquiry request from {email}")

    # Create email
    message_obj = MIMEMultipart()
    message_obj['From'] = gmail_address
    message_obj['To'] = 'enquiries@internationalpropertymarket.com'
    message_obj['Subject'] = f'New Inquiry from {firstName} {lastName}'
    
    # Build email body
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; background-color: #f5f5f5;">
        <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
            <h2 style="color: #1F4B43; margin-bottom: 20px;">New Inquiry Received</h2>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 10px;">Contact Information</h3>
                <p><strong>Name:</strong> {firstName} {lastName}</p>
                <p><strong>Email:</strong> {email}</p>
                <p><strong>Phone:</strong> {phone if phone else 'Not provided'}</p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 10px;">Requested Appointment Date</h3>
                <p style="background-color: #f0fdfa; padding: 10px; border-radius: 4px; border-left: 4px solid #1F4B43;">
                    <strong>{selectedDate if selectedDate else 'No date selected'}</strong>
                </p>
            </div>
            
            <div style="margin-bottom: 20px;">
                <h3 style="color: #333; margin-bottom: 10px;">Message</h3>
                <p style="background-color: #f8f9fa; padding: 15px; border-radius: 4px; line-height: 1.6;">
                    {message if message else 'No message provided'}
                </p>
            </div>
            
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
            
            <p style="color: #64748b; font-size: 12px; margin-top: 20px;">
                This inquiry was submitted through the IPM website contact form.
            </p>
        </div>
    </body>
    </html>
    """
    
    message_obj.attach(MIMEText(body, 'html'))

    # Send email via Gmail SMTP
    try:
        with smtplib.SMTP('smtp.gmail.com', 587) as server:
            server.starttls()
            server.login(gmail_address, gmail_password)
            server.send_message(message_obj)
        
        logger.info(f"Inquiry email sent successfully to enquiries@internationalpropertymarket.com from {email}")
        return (jsonify({'success': True, 'message': 'Inquiry sent successfully'}), 200, headers)
        
    except Exception as e:
        logger.error(f"Email send error: {str(e)}", exc_info=True)
        return (jsonify({'success': False, 'error': 'Failed to send email'}), 500, headers)


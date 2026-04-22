import functions_framework
from flask import jsonify
import os
from google.cloud import firestore
from datetime import datetime
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

@functions_framework.http
def verify_otp(request):
    """
    Verify OTP code for email verification
    
    Expected JSON payload:
    {
        "email": "user@example.com",
        "otp": "1234"
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

    # Parse request
    try:
        request_json = request.get_json(silent=True)
        if not request_json:
            logger.error("Invalid JSON in request")
            return (jsonify({'success': False, 'error': 'Invalid request'}), 400, headers)
        
        email = request_json.get('email', '').strip().lower()
        otp_code = request_json.get('otp', '').strip()
        
        if not email or not otp_code:
            logger.error("Email or OTP not provided")
            return (jsonify({'success': False, 'error': 'Email and OTP are required'}), 400, headers)
            
    except Exception as e:
        logger.error(f"JSON parsing error: {str(e)}")
        return (jsonify({'success': False, 'error': 'Invalid request'}), 400, headers)

    logger.info(f"Verify OTP request for {email}")

    # Connect to Firestore
    try:
        db = firestore.Client(database='ipm-database')
        otp_ref = db.collection('otp_codes').document(email)
        otp_doc = otp_ref.get()
        
        if not otp_doc.exists:
            logger.warning(f"OTP not found for {email}")
            return (jsonify({
                'success': False,
                'error': 'OTP not found. Please request a new OTP.',
                'verified': False
            }), 404, headers)
        
        otp_data = otp_doc.to_dict()
        
        # Check if OTP has expired
        expires_at = otp_data.get('expiresAt')
        if expires_at:
            # Convert Firestore timestamp to datetime if needed
            if hasattr(expires_at, 'timestamp'):
                expires_at = expires_at.timestamp()
            elif hasattr(expires_at, 'seconds'):
                # Firestore Timestamp object
                expires_at = expires_at.seconds + (expires_at.nanos / 1e9) if hasattr(expires_at, 'nanos') else expires_at.seconds
            elif isinstance(expires_at, datetime):
                expires_at = expires_at.timestamp()
            else:
                # Try to convert string or other formats
                try:
                    if isinstance(expires_at, str):
                        expires_at = datetime.fromisoformat(expires_at.replace('Z', '+00:00')).timestamp()
                    else:
                        expires_at = float(expires_at)
                except:
                    logger.warning(f"Could not parse expiresAt: {expires_at}")
                    expires_at = None
            
            if expires_at and datetime.utcnow().timestamp() > expires_at:
                # Delete expired OTP
                otp_ref.delete()
                logger.warning(f"OTP expired for {email}")
                return (jsonify({
                    'success': False,
                    'error': 'OTP has expired. Please request a new OTP.',
                    'verified': False
                }), 400, headers)
        
        # Check if already verified
        if otp_data.get('verified', False):
            logger.warning(f"OTP already verified for {email}")
            return (jsonify({
                'success': False,
                'error': 'This OTP has already been used.',
                'verified': False
            }), 400, headers)
        
        # Check maximum attempts (5 attempts)
        attempts = otp_data.get('attempts', 0)
        if attempts >= 5:
            otp_ref.delete()
            logger.warning(f"Maximum attempts exceeded for {email}")
            return (jsonify({
                'success': False,
                'error': 'Maximum verification attempts exceeded. Please request a new OTP.',
                'verified': False
            }), 429, headers)
        
        # Verify OTP code
        stored_code = str(otp_data.get('code', ''))
        if stored_code != otp_code:
            # Increment attempts
            otp_ref.update({'attempts': attempts + 1})
            remaining = 5 - (attempts + 1)
            logger.warning(f"Invalid OTP for {email}, attempts: {attempts + 1}")
            return (jsonify({
                'success': False,
                'error': 'Invalid OTP code',
                'attemptsRemaining': remaining,
                'verified': False
            }), 400, headers)
        
        # OTP is valid - mark as verified and delete the OTP record
        otp_ref.update({
            'verified': True,
            'verifiedAt': firestore.SERVER_TIMESTAMP
        })
        
        # Optionally delete the OTP after successful verification
        # otp_ref.delete()
        
        logger.info(f"OTP verified successfully for {email}")
        return (jsonify({
            'success': True,
            'message': 'OTP verified successfully',
            'verified': True
        }), 200, headers)
        
    except Exception as e:
        logger.error(f"Firestore error: {str(e)}", exc_info=True)
        return (jsonify({'success': False, 'error': 'Database error'}), 500, headers)

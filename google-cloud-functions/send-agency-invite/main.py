"""
Google Cloud Function: Send Agency Invite Email

Sends an invitation email to an agency agent. The app sends the full invite link
(production or Vercel preview URL); the agent clicks the link and sets their password
on the site — no PIN required.

Expected JSON payload (from IPM add-agent API):
{
    "email": "agent@example.com",
    "inviteLink": "https://www.internationalpropertymarket.com/agency-agent-invite?token=...",
    "pin": "1234",
    "agencyName": "Your Agency Name",
    "branchName": "TestBranch",
    "type": "agent-invite"  (optional)
}

inviteLink must be the full URL (site builds it dynamically for prod vs Vercel).
Uses same Gmail SMTP env vars as send-otp: GMAIL_ADDRESS, GMAIL_APP_PASSWORD.
"""

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
def send_agency_invite(request):
    """
    Send agency invite email with the link provided by the app. No PIN.
    """
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST",
            "Access-Control-Allow-Headers": "Content-Type",
            "Access-Control-Max-Age": "3600",
        }
        return ("", 204, headers)

    headers = {"Access-Control-Allow-Origin": "*"}

    if request.method != "POST":
        return (jsonify({"success": False, "error": "Method not allowed"}), 405, headers)

    gmail_address = os.environ.get("GMAIL_ADDRESS")
    gmail_password = os.environ.get("GMAIL_APP_PASSWORD")

    if not gmail_address or not gmail_password:
        logger.error("Gmail credentials not configured")
        return (
            jsonify({"success": False, "error": "Server configuration error"}),
            500,
            headers,
        )

    try:
        request_json = request.get_json(silent=True)
        if not request_json or "email" not in request_json:
            logger.error("Email not provided in request")
            return (
                jsonify({"success": False, "error": "Email is required"}),
                400,
                headers,
            )
        invite_link = (request_json.get("inviteLink") or "").strip()
        if not invite_link:
            logger.error("inviteLink not provided in request")
            return (
                jsonify({"success": False, "error": "inviteLink is required"}),
                400,
                headers,
            )
    except Exception as e:
        logger.error(f"JSON parsing error: {str(e)}")
        return (jsonify({"success": False, "error": "Invalid request"}), 400, headers)

    email = request_json["email"].strip().lower()
    agency_name = (request_json.get("agencyName") or "").strip() or "your agency"
    branch_name = (request_json.get("branchName") or "").strip()
    pin = (request_json.get("pin") or "").strip()[:4]

    logger.info(f"Send agency invite for {email}, agency: {agency_name}")

    message = MIMEMultipart()
    message["From"] = gmail_address
    message["To"] = email
    message["Subject"] = f"You're invited to join {agency_name}"

    branch_line = f" at {branch_name}" if branch_name else ""
    pin_block = ""
    if pin and len(pin) == 4:
        pin_block = f"""
        <p style="margin: 0 0 20px 0; padding: 16px; background: #f0fdfa; border-radius: 8px; border: 1px solid #99f6e4;">
            <strong>If the link doesn't work</strong>, go to the registration page and enter this 4-digit PIN: <strong style="font-size: 18px; letter-spacing: 2px;">{pin}</strong>
        </p>
        """
    body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; padding: 20px; line-height: 1.5;">
        <h2 style="margin-top: 0; margin-bottom: 16px;">You're invited to join as an agent</h2>
        <p style="margin: 0 0 12px 0;">You have been invited by <strong>{agency_name}</strong>{branch_line} to join as an agency agent.</p>
        <p style="margin: 0 0 20px 0;">Click the button below to set your password and access your dashboard. Your email will already be filled in.</p>
        <p style="margin: 0 0 28px 0;"><a href="{invite_link}" target="_blank" rel="noopener noreferrer" style="display: inline-block; background: #115e59; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">Accept Invite &amp; Complete Registration</a></p>
        {pin_block}
        <p style="color: #888; font-size: 12px; margin: 0;">If you didn't expect this invite, you can ignore this email.</p>
    </body>
    </html>
    """
    message.attach(MIMEText(body, "html"))

    try:
        with smtplib.SMTP("smtp.gmail.com", 587) as server:
            server.starttls()
            server.login(gmail_address, gmail_password)
            server.send_message(message)
        logger.info(f"Agency invite email sent successfully to {email}")
        return (jsonify({"success": True, "message": "Invite email sent"}), 200, headers)
    except Exception as e:
        logger.error(f"Email send error: {str(e)}", exc_info=True)
        return (
            jsonify({"success": False, "error": "Failed to send email"}),
            500,
            headers,
        )

/**
 * Google Cloud Function: Send OTP
 * 
 * This function sends an OTP code to a user's email address.
 * 
 * Trigger: HTTP POST
 * URL: https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/send-otp
 */

const functions = require('@google-cloud/functions-framework');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

// Initialize email transporter (using Gmail SMTP)
// For production, use environment variables for credentials
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER, // Your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD // Gmail App Password (not regular password)
  }
});

// In-memory storage for OTPs (for production, use Redis or Firestore)
// Format: { email: { code: '123456', expiresAt: timestamp } }
const otpStore = {};

// Generate 6-digit OTP
function generateOTP() {
  return crypto.randomInt(100000, 999999).toString();
}

// Clean expired OTPs
function cleanExpiredOTPs() {
  const now = Date.now();
  Object.keys(otpStore).forEach(email => {
    if (otpStore[email].expiresAt < now) {
      delete otpStore[email];
    }
  });
}

functions.http('sendOtp', async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { email } = req.body;

    // Validate email
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    // Clean expired OTPs
    cleanExpiredOTPs();

    // Generate OTP
    const otp = generateOTP();
    const expiresAt = Date.now() + (10 * 60 * 1000); // 10 minutes expiry

    // Store OTP
    otpStore[email] = {
      code: otp,
      expiresAt: expiresAt,
      attempts: 0
    };

    // Send email
    const mailOptions = {
      from: process.env.GMAIL_USER,
      to: email,
      subject: 'IPM Real Estate - Email Verification Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #1F4B43;">IPM Real Estate</h2>
          <p>Your email verification code is:</p>
          <div style="background: #f4f7f6; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #1F4B43; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
          <p style="color: #666; font-size: 14px;">If you didn't request this code, please ignore this email.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);

    console.log(`OTP sent to ${email}`);

    // Return success (don't return the OTP for security)
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully',
      expiresIn: 600 // 10 minutes in seconds
    });

  } catch (error) {
    console.error('Error sending OTP:', error);
    res.status(500).json({
      error: 'Failed to send OTP',
      message: error.message
    });
  }
});


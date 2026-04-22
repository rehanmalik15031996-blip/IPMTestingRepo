/**
 * Google Cloud Function: Verify OTP
 * 
 * This function verifies an OTP code for a user's email address.
 * 
 * Trigger: HTTP POST
 * URL: https://YOUR_REGION-YOUR_PROJECT.cloudfunctions.net/verify-otp
 */

const functions = require('@google-cloud/functions-framework');

// In-memory storage for OTPs (should match send-otp function)
// For production, use Redis or Firestore shared between functions
const otpStore = {};

// Maximum verification attempts
const MAX_ATTEMPTS = 5;

functions.http('verifyOtp', async (req, res) => {
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
    const { email, otp } = req.body;

    // Validate inputs
    if (!email || !otp) {
      return res.status(400).json({ error: 'Email and OTP are required' });
    }

    // Check if OTP exists for this email
    const storedOtp = otpStore[email];

    if (!storedOtp) {
      return res.status(404).json({
        success: false,
        error: 'OTP not found. Please request a new OTP.'
      });
    }

    // Check if OTP has expired
    if (Date.now() > storedOtp.expiresAt) {
      delete otpStore[email];
      return res.status(400).json({
        success: false,
        error: 'OTP has expired. Please request a new OTP.'
      });
    }

    // Check maximum attempts
    if (storedOtp.attempts >= MAX_ATTEMPTS) {
      delete otpStore[email];
      return res.status(429).json({
        success: false,
        error: 'Maximum verification attempts exceeded. Please request a new OTP.'
      });
    }

    // Increment attempts
    storedOtp.attempts += 1;

    // Verify OTP
    if (storedOtp.code !== otp) {
      return res.status(400).json({
        success: false,
        error: 'Invalid OTP code',
        attemptsRemaining: MAX_ATTEMPTS - storedOtp.attempts
      });
    }

    // OTP is valid - remove it from store
    delete otpStore[email];

    console.log(`OTP verified for ${email}`);

    res.status(200).json({
      success: true,
      message: 'OTP verified successfully',
      verified: true
    });

  } catch (error) {
    console.error('Error verifying OTP:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to verify OTP',
      message: error.message
    });
  }
});


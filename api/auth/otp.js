// Vercel serverless function for OTP - handles send, verify, check-email, and reset-password
// This consolidates multiple auth-related functions to stay within Vercel's function limit

const { Firestore } = require('@google-cloud/firestore');
const connectDB = require('../_lib/mongodb');
const User = require('../../server/models/User');
const bcrypt = require('bcryptjs');

// Initialize Firestore (uses default credentials from environment or service account)
// For Vercel, we'll use the Firestore REST API or service account key
let db = null;

function getFirestore() {
  // Only initialize if we have credentials
  if (!db && process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    try {
      const firestoreConfig = {
        projectId: 'ipm-beta',
        databaseId: 'ipm-database'
      };

      // Parse service account key
      const serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_KEY);
      firestoreConfig.credentials = serviceAccount;

      db = new Firestore(firestoreConfig);
      console.log('✅ Firestore initialized with service account');
    } catch (error) {
      console.error('❌ Firestore initialization error:', error.message);
      console.log('⚠️ Will use REST API fallback instead');
      // Don't set db, so it returns null and we use REST API
      db = null;
    }
  } else if (!db && !process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
    console.log('ℹ️ No GOOGLE_SERVICE_ACCOUNT_KEY found - will use REST API with GOOGLE_API_KEY');
  }
  return db;
}

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { action, email, otp, newPassword } = req.body;

    // Route to appropriate handler
    if (action === 'check-email') {
      // Check if email already exists
      if (!email) {
        return res.status(400).json({ 
          success: false,
          error: 'Email is required' 
        });
      }

      try {
        await connectDB();
        const normalizedEmail = email.toLowerCase().trim();
        const existingUser = await User.findOne({ email: normalizedEmail });

        if (existingUser) {
          return res.status(200).json({ 
            success: true,
            exists: true,
            message: 'This email is already registered. Please log in instead.'
          });
        }

        return res.status(200).json({ 
          success: true,
          exists: false,
          message: 'Email is available'
        });
      } catch (err) {
        console.error('Check email error:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to check email',
          message: err.message 
        });
      }

    } else if (action === 'reset-password') {
      // Reset password after OTP verification
      if (!email || !otp || !newPassword) {
        return res.status(400).json({ 
          success: false,
          error: 'Email, OTP, and new password are required' 
        });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ 
          success: false,
          error: 'Password must be at least 6 characters long' 
        });
      }

      try {
        await connectDB();
        const normalizedEmail = email.toLowerCase().trim();

        // Verify OTP first (reuse verification logic)
        const firestore = getFirestore();
        let otpData = null;

        if (firestore) {
          try {
            const otpRef = firestore.collection('otp_codes').doc(normalizedEmail);
            const otpDoc = await otpRef.get();
            if (otpDoc.exists) {
              otpData = otpDoc.data();
            }
          } catch (sdkError) {
            console.warn('Firestore SDK error, trying REST API:', sdkError.message);
          }
        }

        // Fallback to REST API if SDK failed
        if (!otpData && process.env.GOOGLE_API_KEY) {
          try {
            const restUrl = `https://firestore.googleapis.com/v1beta1/projects/ipm-beta/databases/ipm-database/documents/otp_codes/${encodeURIComponent(normalizedEmail)}?key=${process.env.GOOGLE_API_KEY}`;
            const response = await fetch(restUrl);
            if (response.ok) {
              const data = await response.json();
              if (data.fields) {
                otpData = {
                  code: data.fields.code?.stringValue,
                  verified: data.fields.verified?.booleanValue || false,
                  expiresAt: data.fields.expiresAt?.timestampValue,
                  attempts: parseInt(data.fields.attempts?.integerValue || '0')
                };
              }
            }
          } catch (restError) {
            console.error('REST API error:', restError);
          }
        }

        if (!otpData) {
          return res.status(400).json({ 
            success: false,
            error: 'OTP not found. Please request a new OTP.' 
          });
        }

        // Check if already verified
        if (otpData.verified) {
          return res.status(400).json({ 
            success: false,
            error: 'This OTP has already been used. Please request a new one.' 
          });
        }

        // Check expiration
        if (otpData.expiresAt) {
          const expiresAt = new Date(otpData.expiresAt);
          if (new Date() > expiresAt) {
            return res.status(400).json({ 
              success: false,
              error: 'OTP has expired. Please request a new one.' 
            });
          }
        }

        // Check attempts
        if (otpData.attempts >= 5) {
          return res.status(400).json({ 
            success: false,
            error: 'Too many verification attempts. Please request a new OTP.' 
          });
        }

        // Verify OTP code
        if (otpData.code !== otp) {
          // Increment attempts
          const attempts = (otpData.attempts || 0) + 1;
          if (firestore) {
            try {
              await firestore.collection('otp_codes').doc(normalizedEmail).update({ attempts });
            } catch (e) {
              console.warn('Failed to update attempts:', e);
            }
          }
          
          return res.status(400).json({ 
            success: false,
            error: 'Invalid OTP code',
            attemptsRemaining: 5 - attempts
          });
        }

        // OTP verified - now update password
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
          return res.status(404).json({ 
            success: false,
            error: 'User not found' 
          });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // Update user password
        user.password = hashedPassword;
        await user.save();

        // Mark OTP as verified
        if (firestore) {
          try {
            await firestore.collection('otp_codes').doc(normalizedEmail).update({ verified: true });
          } catch (e) {
            console.warn('Failed to mark OTP as verified:', e);
          }
        }

        console.log('✅ Password reset successfully for:', normalizedEmail);

        return res.status(200).json({ 
          success: true,
          message: 'Password reset successfully. You can now log in with your new password.'
        });
      } catch (err) {
        console.error('Reset password error:', err);
        return res.status(500).json({ 
          success: false,
          error: 'Failed to reset password',
          message: err.message 
        });
      }

    } else if (action === 'send') {
      // Send OTP - proxy to your existing Google Cloud Function
      if (!email) {
        return res.status(400).json({ 
          success: false,
          error: 'Email is required' 
        });
      }

      const SEND_OTP_URL = process.env.GOOGLE_SEND_OTP_URL || 'https://send-otp-541421913321.europe-west4.run.app';

      try {
        console.log('📤 Sending OTP request to:', SEND_OTP_URL);
        console.log('📧 Email:', email.toLowerCase().trim());
        console.log('👤 User Type:', req.body.userType || 'unknown');

        const response = await fetch(SEND_OTP_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            email: email.toLowerCase().trim(),
            userType: req.body.userType || 'unknown'
          }),
        });

        console.log('📬 Response status:', response.status);

        let data;
        try {
          data = await response.json();
          console.log('📋 Response data:', JSON.stringify(data));
        } catch (parseError) {
          console.error('❌ Failed to parse response:', parseError);
          const text = await response.text();
          console.error('Raw response:', text);
          return res.status(500).json({
            success: false,
            error: 'Invalid response from OTP service',
            message: 'Failed to parse response from send OTP function'
          });
        }

        if (!response.ok) {
          console.error('❌ OTP send failed:', data);
          // Ensure consistent error format
          return res.status(response.status).json({
            success: false,
            error: data.error || data.message || 'Failed to send OTP',
            userExists: data.userExists || false
          });
        }

        // Ensure consistent success format
        return res.status(200).json({
          success: true,
          message: data.message || 'OTP sent successfully',
          ...data
        });

      } catch (fetchError) {
        console.error('❌ Fetch error:', fetchError);
        return res.status(500).json({
          success: false,
          error: 'Failed to connect to OTP service',
          message: fetchError.message || 'Network error. Please check your connection and try again.'
        });
      }

    } else if (action === 'verify') {
      // Verify OTP - handle directly in Vercel using Firestore
      if (!email || !otp) {
        return res.status(400).json({ 
          success: false,
          error: 'Email and OTP are required' 
        });
      }

      const normalizedEmail = email.toLowerCase().trim();
      const otpCode = otp.trim();

      try {
        // Try using Firestore SDK first (only if credentials available), fallback to REST API with API key
        let otpDoc = null;
        let otpData = null;
        let firestore = null;
        let usingRestAPI = false;
        
        // Only try SDK if we have service account credentials
        if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY) {
          firestore = getFirestore();
          
          if (firestore) {
            // Use Firestore SDK if available
            try {
              const otpRef = firestore.collection('otp_codes').doc(normalizedEmail);
              otpDoc = await otpRef.get();
              if (otpDoc.exists) {
                otpData = otpDoc.data();
                console.log('✅ OTP data retrieved via Firestore SDK');
              }
            } catch (sdkError) {
              console.error('❌ Firestore SDK error:', sdkError.message);
              console.log('⚠️ Falling back to REST API');
              firestore = null; // Fall back to REST API
              otpDoc = null;
              otpData = null;
            }
          }
        } else {
          console.log('ℹ️ No service account credentials - using REST API');
        }
        
        // Fallback to REST API with API key if SDK not available
        if (!otpData && process.env.GOOGLE_API_KEY) {
          try {
            usingRestAPI = true;
            const API_KEY = process.env.GOOGLE_API_KEY;
            const PROJECT_ID = 'ipm-beta';
            const DATABASE_ID = 'ipm-database';
            const endpoint = `v1beta1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/otp_codes/${encodeURIComponent(normalizedEmail)}?key=${API_KEY}`;
            
            const response = await fetch(`https://firestore.googleapis.com/${endpoint}`);
            
            if (response.ok) {
              const doc = await response.json();
              if (doc.fields) {
                // Convert Firestore REST API format to our format
                otpData = {};
                for (const [key, value] of Object.entries(doc.fields)) {
                  if (value.stringValue !== undefined) {
                    otpData[key] = value.stringValue;
                  } else if (value.integerValue !== undefined) {
                    otpData[key] = parseInt(value.integerValue);
                  } else if (value.booleanValue !== undefined) {
                    otpData[key] = value.booleanValue;
                  } else if (value.timestampValue !== undefined) {
                    otpData[key] = new Date(value.timestampValue);
                  }
                }
              }
            } else if (response.status === 404) {
              return res.status(404).json({
                success: false,
                error: 'OTP not found. Please request a new OTP.',
                verified: false
              });
            }
          } catch (restError) {
            console.error('REST API fallback error:', restError);
          }
        }
        
        if (!otpData) {
          // If both methods failed, return error
          if (!firestore && !process.env.GOOGLE_API_KEY) {
            return res.status(500).json({
              success: false,
              error: 'OTP verification service not available. Please configure Firestore credentials or GOOGLE_API_KEY.'
            });
          }
          
          // OTP not found
          return res.status(404).json({
            success: false,
            error: 'OTP not found. Please request a new OTP.',
            verified: false
          });
        }

        // otpData is already set above

        // Check if OTP has expired
        const expiresAt = otpData.expiresAt;
        if (expiresAt) {
          let expiresTimestamp;
          
          // Handle Firestore Timestamp
          if (expiresAt.toDate) {
            expiresTimestamp = expiresAt.toDate().getTime();
          } else if (expiresAt.seconds) {
            expiresTimestamp = expiresAt.seconds * 1000;
          } else if (expiresAt instanceof Date) {
            expiresTimestamp = expiresAt.getTime();
          } else {
            expiresTimestamp = new Date(expiresAt).getTime();
          }

          if (Date.now() > expiresTimestamp) {
            // Delete expired OTP (only if we have write access)
            if (firestore && otpDoc) {
              const otpRef = firestore.collection('otp_codes').doc(normalizedEmail);
              await otpRef.delete();
            }
            return res.status(400).json({
              success: false,
              error: 'OTP has expired. Please request a new OTP.',
              verified: false
            });
          }
        }

        // Check if already verified
        if (otpData.verified === true) {
          return res.status(400).json({
            success: false,
            error: 'This OTP has already been used.',
            verified: false
          });
        }

        // Check maximum attempts (5 attempts)
        const attempts = otpData.attempts || 0;
        if (attempts >= 5) {
          if (firestore && otpDoc) {
            const otpRef = firestore.collection('otp_codes').doc(normalizedEmail);
            await otpRef.delete();
          }
          return res.status(429).json({
            success: false,
            error: 'Maximum verification attempts exceeded. Please request a new OTP.',
            verified: false
          });
        }

        // Verify OTP code
        const storedCode = String(otpData.code || '');
        if (storedCode !== otpCode) {
          // Increment attempts (only if we have write access)
          if (firestore && otpDoc) {
            const otpRef = firestore.collection('otp_codes').doc(normalizedEmail);
            await otpRef.update({ attempts: attempts + 1 });
          }
          const remaining = 5 - (attempts + 1);
          return res.status(400).json({
            success: false,
            error: 'Invalid OTP code',
            attemptsRemaining: remaining,
            verified: false
          });
        }

        // OTP is valid - mark as verified
        if (firestore && otpDoc) {
          // Use Firestore SDK if available
          const otpRef = firestore.collection('otp_codes').doc(normalizedEmail);
          await otpRef.update({
            verified: true,
            verifiedAt: Firestore.FieldValue.serverTimestamp()
          });
        } else {
          // If using REST API, we can't update (would need service account)
          // But verification is successful, so we can still return success
          console.log('✅ OTP verified (read-only mode - cannot update Firestore without service account)');
        }

        return res.status(200).json({
          success: true,
          message: 'OTP verified successfully',
          verified: true
        });

      } catch (firestoreError) {
        console.error('Firestore error:', firestoreError);
        return res.status(500).json({
          success: false,
          error: 'Database error during verification',
          message: firestoreError.message
        });
      }

    } else {
      return res.status(400).json({ 
        success: false,
        error: 'Invalid action. Use "send", "verify", "check-email", or "reset-password"' 
      });
    }

  } catch (error) {
    console.error('❌ OTP API error:', error);
    console.error('Error stack:', error.stack);
    return res.status(500).json({
      success: false,
      error: 'Failed to process OTP request',
      message: error.message
    });
  }
};

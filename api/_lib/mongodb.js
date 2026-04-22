// Shared MongoDB connection for Vercel serverless functions

const path = require('path');

/**
 * Use the same mongoose package instance as `server/server.js` when it exists locally.
 * Otherwise `require('mongoose')` resolves from the repo root and sees a different default
 * connection than Express (which loads from server/node_modules) — connectDB would think
 * nothing is connected and throw MONGO_URI is required even though the API is already connected.
 */
function resolveMongoose() {
  try {
    return require(path.join(__dirname, '..', '..', 'server', 'node_modules', 'mongoose'));
  } catch (_) {
    return require('mongoose');
  }
}

// Suppress url.parse() deprecation warnings from Mongoose dependencies
// This is a harmless warning from internal MongoDB driver code
// Suppress before requiring mongoose to catch all warnings
const originalEmitWarning = process.emitWarning;
process.emitWarning = function(warning, type, code, ...args) {
  // Suppress DEP0169 url.parse() deprecation warnings
  if (code === 'DEP0169' || 
      (typeof warning === 'string' && warning.includes('url.parse()')) ||
      (warning && warning.message && warning.message.includes('url.parse()'))) {
    return; // Suppress these warnings
  }
  return originalEmitWarning.apply(process, [warning, type, code, ...args]);
};

const mongoose = resolveMongoose();

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

async function connectDB() {
  // Reuse live connection (e.g. Express `server.js` connected before this handler ran)
  if (mongoose.connection.readyState === 1) {
    cached.conn = mongoose.connection;
    return cached.conn;
  }

  // Express calls mongoose.connect() on startup — often still "connecting" on first API request
  if (mongoose.connection.readyState === 2) {
    if (typeof mongoose.connection.asPromise === 'function') {
      await mongoose.connection.asPromise();
    } else {
      await new Promise((resolve, reject) => {
        mongoose.connection.once('connected', resolve);
        mongoose.connection.once('error', reject);
      });
    }
    cached.conn = mongoose.connection;
    return cached.conn;
  }

  // Express calls mongoose.connect() on startup — often still "connecting" on first API request
  if (mongoose.connection.readyState === 2) {
    if (typeof mongoose.connection.asPromise === 'function') {
      await mongoose.connection.asPromise();
    } else {
      await new Promise((resolve, reject) => {
        mongoose.connection.once('connected', resolve);
        mongoose.connection.once('error', reject);
      });
    }
    cached.conn = mongoose.connection;
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 5, // Lower for serverless to avoid Atlas connection limits
      minPoolSize: 0,
      serverSelectionTimeoutMS: 20000, // Give Atlas more time on cold start / busy cluster
      socketTimeoutMS: 45000,
      connectTimeoutMS: 20000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
    };

    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    if (!mongoUri || !mongoUri.startsWith('mongodb')) {
      console.error('❌ MONGO_URI (or MONGODB_URI) is not set or invalid. For Vercel: Project → Settings → Environment Variables. For local dev: add MONGO_URI to .env at the repo root or in server/.env');
      throw new Error('MONGO_URI is required');
    }

    console.log('🔌 Connecting to MongoDB Atlas...');
    cached.promise = mongoose.connect(mongoUri, opts).then((mongoose) => {
      console.log('✅ MongoDB Connected to Atlas');
      return mongoose;
    }).catch((err) => {
      cached.promise = null; // Reset promise on error
      console.error('❌ MongoDB Connection Error:', err.message);
      if (err.message.includes('whitelist') || err.message.includes('IP')) {
        console.error('💡 TIP: Make sure your IP is whitelisted in MongoDB Atlas Network Access settings');
        console.error('💡 Allow 0.0.0.0/0 for Vercel deployments');
      }
      throw err;
    });
  }

  try {
    cached.conn = await cached.promise;
    
    // Check if connection is ready (state 1 = connected)
    // If already connected, return immediately
    if (mongoose.connection.readyState === 1) {
      return cached.conn;
    }
    
    // If connection is in progress (state 2 = connecting), wait for it
    // State 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    if (mongoose.connection.readyState === 2) {
      console.log('⏳ Connection in progress, waiting...');
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => {
          // Don't reject, just log warning and continue
          // The connection might still work even if readyState check times out
          console.warn('⚠️ Connection ready check timeout, but connection may still be active');
          resolve();
        }, 10000); // Increased to 10 seconds for Vercel cold starts
        
        if (mongoose.connection.readyState === 1) {
          clearTimeout(timeout);
          resolve();
        } else {
          mongoose.connection.once('connected', () => {
            clearTimeout(timeout);
            resolve();
          });
          mongoose.connection.once('error', (err) => {
            clearTimeout(timeout);
            // Don't reject on error, just log - connection might still work
            console.warn('⚠️ Connection error during ready check:', err.message);
            resolve();
          });
        }
      });
    }
    
    // Return the connection even if readyState check timed out
    // The connection might still be functional
    return cached.conn;
  } catch (e) {
    // Only reset if it's a critical error
    if (e.message.includes('Connection ready timeout')) {
      console.warn('⚠️ Connection ready timeout, but continuing with existing connection');
      // Don't reset the connection, it might still work
      return cached.conn;
    }
    
    cached.promise = null;
    cached.conn = null;
    console.error('❌ MongoDB Connection Error:', e.message);
    throw e;
  }
}

module.exports = connectDB;


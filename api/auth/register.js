// Vercel serverless function for register
const connectDB = require('../_lib/mongodb');
const User = require('../../server/models/User');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  try {
    console.log('🔌 Connecting to MongoDB for registration...');
    await connectDB();
    console.log('✅ MongoDB connected');

    const { name, email, password, role } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }

    // Normalize email: lowercase and trim to ensure consistent storage and lookup
    const normalizedEmail = (email || '').toLowerCase().trim();

    // Check if user already exists
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ message: 'User with this email already exists' });
    }

    // Generate hashed password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user object
    const userData = {
      name,
      email: normalizedEmail, // Store normalized email
      password: hashedPassword,
      role: role || 'investor'
    };

    // Add role-specific data structures
    if (role === 'agency' || role === 'agency_agent') {
      userData.agencyStats = {
        totalRevenue: 0,
        propertiesSold: 0,
        activeAgents: 0,
        totalListings: 0,
        activeLeads: 0,
        topAgents: [],
        pipelineColumns: [],
        pipelineDeals: [],
        crmLeads: []
      };
    } else if (role === 'agent' || role === 'independent_agent') {
      userData.agentStats = {
        myCommission: 0,
        activeListings: 0,
        pendingDeals: 0,
        meetingsScheduled: 0,
        recentLeads: [],
        pipelineColumns: [],
        pipelineDeals: [],
        crmLeads: []
      };
    } else if (role === 'buyer' || role === 'investor' || role === 'seller' || role === 'tenant') {
      userData.portfolio = [];
      userData.savedProperties = [];
    }

    const newUser = new User(userData);
    const user = await newUser.save();
    const { password: _, ...userWithoutPassword } = user._doc;
    
    console.log('✅ User registered successfully:', email, 'Role:', role);

    if (role === 'buyer' || role === 'investor') {
      const baseUrl = process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : (process.env.API_BASE_URL || process.env.FRONTEND_ORIGIN || '').replace(/\/$/, '') || 'http://localhost:3000';
      fetch(`${baseUrl}/api/match/run-user-matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user._id }),
      }).catch((err) => console.warn('[register] Match trigger failed:', err.message));
    }

    res.status(200).json(userWithoutPassword);
  } catch (err) {
    console.error('Register error:', err);
    console.error('Error details:', {
      message: err.message,
      code: err.code,
      name: err.name
    });
    
    // Handle duplicate key error
    if (err.code === 11000 || err.message.includes('duplicate')) {
      return res.status(400).json({ 
        message: 'User with this email already exists',
        error: 'DUPLICATE_EMAIL'
      });
    }
    
    // Handle validation errors
    if (err.name === 'ValidationError') {
      return res.status(400).json({ 
        message: 'Validation error: ' + Object.values(err.errors).map(e => e.message).join(', '),
        error: 'VALIDATION_ERROR'
      });
    }
    
    res.status(500).json({ 
      message: err.message || 'Registration failed',
      error: 'INTERNAL_ERROR'
    });
  }
};


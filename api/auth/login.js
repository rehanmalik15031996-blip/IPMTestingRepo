// Vercel serverless function for login
const connectDB = require('../_lib/mongodb');
const User = require('../../server/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { setCorsHeaders, handleCors } = require('../_lib/cors');

module.exports = async (req, res) => {
  setCorsHeaders(res);
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const secret = process.env.JWT_SECRET || 'SECRET_KEY_123';

  try {
    await connectDB();

    const { email, password } = req.body;
    const normalizedEmail = (email || '').toLowerCase().trim();

    if (!normalizedEmail) {
      return res.status(400).json({ message: 'Email is required' });
    }

    let user = await User.findOne({ email: normalizedEmail });

    // First-time admin: create IPM admin user if credentials match and user doesn't exist
    const ADMIN_EMAIL = 'admin@internationalpropertymarket.com';
    const ADMIN_PASSWORD = 'ipm_admin2026!';
    if (!user && normalizedEmail === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      const salt = await bcrypt.genSalt(10);
      const hashed = await bcrypt.hash(ADMIN_PASSWORD, salt);
      user = new User({
        name: 'IPM Admin',
        email: ADMIN_EMAIL,
        password: hashed,
        role: 'admin'
      });
      await user.save();
    }

    if (!user) {
      return res.status(404).json({
        message: "User not found. If database is empty, visit homepage to auto-seed or call POST /api/users?action=seed"
      });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
      return res.status(400).json({ message: "Wrong password" });
    }

    const token = jwt.sign({ id: user._id }, secret);
    const { password: _, ...others } = user._doc;

    // Prevent any cache (CDN/proxy) from storing this response and serving it to another user
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Vary', 'Authorization');
    res.setHeader('X-Content-Type-Options', 'nosniff');

    res.status(200).json({ ...others, token });
  } catch (err) {
    console.error('Login error');
    res.status(500).json({ message: err.message });
  }
};

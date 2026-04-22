const connectDB = require('../_lib/mongodb');
const User = require('../../server/models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
    return res.status(200).end();
  }
  res.setHeader('Access-Control-Allow-Origin', process.env.FRONTEND_ORIGIN || '*');

  if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

  try {
    await connectDB();
    const body = req.body && typeof req.body === 'object' ? req.body : {};
    const { name, email, password, phone, location, contact, logo } = body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Enterprise name, email, and password are required.' });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ message: 'An account with this email already exists.' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = new User({
      name,
      email: email.toLowerCase().trim(),
      password: hashedPassword,
      role: 'enterprise',
      phone: phone || '',
      location: location || '',
      contact: contact || '',
      logo: logo || '',
      agencyName: name,
      enterpriseStats: {
        agencies: [],
      },
    });

    await user.save();

    const secret = process.env.JWT_SECRET || 'SECRET_KEY_123';
    const token = jwt.sign({ id: user._id }, secret);

    const userObj = user.toObject();
    delete userObj.password;

    return res.status(201).json({
      message: 'Enterprise registered successfully',
      user: { ...userObj, token },
    });
  } catch (err) {
    console.error('Enterprise registration error:', err);
    return res.status(500).json({ message: err.message || 'Registration failed' });
  }
};

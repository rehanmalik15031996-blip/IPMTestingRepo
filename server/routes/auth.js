const router = require('express').Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { resolveDevBypassAgencyId, isDevBypassEnabled } = require('../utils/devBypass');

// REGISTER
// REGISTER
router.post('/register', async (req, res) => {
    try {
        // Generate new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(req.body.password, salt);

        // Create new user
        const newUser = new User({
            name: req.body.name,
            email: req.body.email,
            password: hashedPassword,
            
            // ✅ ACCEPT THE ROLE FROM FRONTEND
            // If they didn't pick one, default to 'investor'
            role: req.body.role || 'investor' 
        });

        // Save user and respond
        const user = await newUser.save();
        res.status(200).json(user);
    } catch (err) {
        res.status(500).json(err);
    }
});

// LOGIN (align with api/auth/login.js: normalized email + same JWT secret as other routes)
router.post('/login', async (req, res) => {
    try {
        const secret = process.env.JWT_SECRET || 'SECRET_KEY_123';
        const normalizedEmail = String(req.body?.email || '')
            .toLowerCase()
            .trim();
        if (!normalizedEmail) {
            return res.status(400).json({ message: 'Email is required' });
        }

        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({
                message:
                    'User not found. If this is a fresh local DB, open the homepage once to seed demo data, or register a new account.',
            });
        }

        const validPassword = await bcrypt.compare(req.body.password, user.password);
        if (!validPassword) return res.status(400).json({ message: 'Wrong password' });

        const token = jwt.sign({ id: user._id }, secret);
        const { password, ...others } = user._doc;

        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private, max-age=0');
        res.status(200).json({ ...others, token });
    } catch (err) {
        res.status(500).json({ message: err.message || 'Server error' });
    }
});

/** Local dev only: session payload for REACT_APP_DEV_BYPASS_AUTH (no password). */
router.get('/dev-whoami', async (req, res) => {
    if (!isDevBypassEnabled()) {
        return res.status(404).json({
            message:
                'Dev bypass is off. Set DEV_BYPASS_AUTH=true in the API .env (repo root or server/), ensure NODE_ENV is not production, then restart the server.',
            devBypassDisabled: true,
        });
    }
    try {
        const id = await resolveDevBypassAgencyId();
        const user = await User.findById(id);
        if (!user) return res.status(503).json({ message: 'Dev bypass agency user missing' });
        const { password, ...others } = user._doc;
        res.setHeader('Cache-Control', 'no-store');
        res.status(200).json({
            ...others,
            token: '__IPM_DEV_BYPASS__',
            subscriptionPlan: user.subscriptionPlan || 'Premium',
            subscriptionStatus: user.subscriptionStatus || 'active',
            stripeSubscriptionId: user.stripeSubscriptionId || 'dev_bypass',
        });
    } catch (err) {
        res.status(503).json({ message: err.message || 'Dev bypass failed' });
    }
});

module.exports = router;
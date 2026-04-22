const path = require('path');
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
// Load env from repo root first, then server/ (so `npm start` from root still picks up `./.env`).
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
require('dotenv').config({ path: path.join(__dirname, '.env'), override: true });

/** Same handler as Vercel `api/contact` — inquiries + Gmail via Cloud Function (local dev parity). */
const vercelContactHandler = require(path.join(__dirname, '../api/contact/index.js'));
/** CRM lead mutations — Vercel has these; Express must mirror them when the client proxies /api here (local dev). */
const updateLeadHandler = require(path.join(__dirname, '../api/update-lead.js'));
const deleteLeadHandler = require(path.join(__dirname, '../api/delete-lead.js'));

// Routes
const multer = require('multer');
const authRoute = require('./routes/auth'); // <--- MUST MATCH FILE NAME
const usersRoutes = require('./routes/users');
const propertyRoute = require('./routes/properties'); // Assuming you created this earlier
const inquiryRoute = require('./routes/inquiry');
const newsRoute = require('./routes/news');
const File = require('./models/File');
const User = require('./models/User');
const Inquiry = require('./models/Inquiry');
const News = require('./models/News');
const MarketTrend = require('./models/MarketTrend');
const developmentsRoute = require('./routes/developments');
const agencyMigrationRoute = require('./routes/agencyMigration');
const jwt = require('jsonwebtoken');
const { resolveDevBypassAgencyId, isDevBypassEnabled } = require('./utils/devBypass');
const app = express();
// Avoid weak ETags on JSON GETs — browsers return 304 and axios often ends up with no body (empty listings, refetch loops).
app.set('etag', false);

// Set up storage (Saves to 'uploads' folder locally)
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});
const upload = multer({ storage: storage });

// Middleware
app.use('/uploads', express.static('uploads'));
app.use(express.json({ limit: '50mb' })); // MongoDB Atlas: allow large property uploads (images + docs)
app.use(cors());

// Local dev: replace magic bearer token with a real JWT for the chosen agency user (see DEV_BYPASS_AUTH in .env)
app.use(async (req, res, next) => {
    try {
        if (!isDevBypassEnabled()) return next();
        if (req.headers.authorization !== 'Bearer __IPM_DEV_BYPASS__') return next();
        const id = await resolveDevBypassAgencyId();
        const secret = process.env.JWT_SECRET || 'SECRET_KEY_123';
        req.headers.authorization = `Bearer ${jwt.sign({ id }, secret)}`;
        next();
    } catch (err) {
        if (!res.headersSent) {
            res.status(503).json({ message: err.message || 'Dev bypass failed' });
        }
    }
});

app.all('/api/contact', (req, res, next) => {
    Promise.resolve(vercelContactHandler(req, res)).catch((err) => {
        console.error('Contact handler error:', err);
        if (!res.headersSent) {
            res.status(500).json({ message: err.message || 'Internal error' });
        } else {
            next(err);
        }
    });
});

// Route Middlewares
// This tells the server: "If the URL starts with /api/auth, look in authRoute"
app.use('/api/auth', authRoute); 
app.use('/api/developments', developmentsRoute);
app.use('/api/users', usersRoutes);
// Client calls POST /api/add-lead (not /api/users/add-lead); mirror so agency-agent leads work when using Express backend
app.post('/api/add-lead', usersRoutes.addLeadHandler);
app.post('/api/bulk-transfer-agent', usersRoutes.bulkTransferHandler);
app.put('/api/update-lead', (req, res, next) => {
    Promise.resolve(updateLeadHandler(req, res)).catch((err) => {
        console.error('update-lead error:', err);
        if (!res.headersSent) res.status(500).json({ message: err.message || 'Internal error' });
        else next(err);
    });
});
app.patch('/api/update-lead', (req, res, next) => {
    Promise.resolve(updateLeadHandler(req, res)).catch((err) => {
        console.error('update-lead error:', err);
        if (!res.headersSent) res.status(500).json({ message: err.message || 'Internal error' });
        else next(err);
    });
});
app.post('/api/delete-lead', (req, res, next) => {
    Promise.resolve(deleteLeadHandler(req, res)).catch((err) => {
        console.error('delete-lead error:', err);
        if (!res.headersSent) res.status(500).json({ message: err.message || 'Internal error' });
        else next(err);
    });
});
app.use('/api/properties', propertyRoute);
app.use('/api/inquiry', inquiryRoute);
app.use('/api/news', newsRoute);
app.use('/api/agency/migration', agencyMigrationRoute);

/** Outstand (social) — mirror Vercel serverless handlers for local Express dev */
const outstandAuthUrl = require('../api/outstand/auth-url');
const outstandAccountsList = require('../api/outstand/accounts');
const outstandPending = require('../api/outstand/pending/[sessionToken]');
const outstandFinalize = require('../api/outstand/finalize/[sessionToken]');
const outstandAccountDelete = require('../api/outstand/accounts/[id]');
app.post('/api/outstand/auth-url', (req, res, next) => {
  Promise.resolve(outstandAuthUrl(req, res)).catch((err) => {
    if (!res.headersSent) res.status(500).json({ message: err.message || 'Internal error' });
    else next(err);
  });
});
app.get('/api/outstand/accounts', (req, res, next) => {
  Promise.resolve(outstandAccountsList(req, res)).catch((err) => {
    if (!res.headersSent) res.status(500).json({ message: err.message || 'Internal error' });
    else next(err);
  });
});
app.get('/api/outstand/pending/:sessionToken', (req, res, next) => {
  req.query = { ...req.query, sessionToken: req.params.sessionToken };
  Promise.resolve(outstandPending(req, res)).catch((err) => {
    if (!res.headersSent) res.status(500).json({ message: err.message || 'Internal error' });
    else next(err);
  });
});
app.post('/api/outstand/finalize/:sessionToken', (req, res, next) => {
  req.query = { ...req.query, sessionToken: req.params.sessionToken };
  Promise.resolve(outstandFinalize(req, res)).catch((err) => {
    if (!res.headersSent) res.status(500).json({ message: err.message || 'Internal error' });
    else next(err);
  });
});
app.delete('/api/outstand/accounts/:id', (req, res, next) => {
  req.query = { ...req.query, id: req.params.id };
  Promise.resolve(outstandAccountDelete(req, res)).catch((err) => {
    if (!res.headersSent) res.status(500).json({ message: err.message || 'Internal error' });
    else next(err);
  });
});

/** Comms — mirror Vercel serverless handlers for local Express dev */
const commsConversations = require('../api/comms/conversations');
const commsMessages = require('../api/comms/messages');
const commsNotifications = require('../api/comms/notifications');
const commsContacts = require('../api/comms/contacts');
const commsPropertySearch = require('../api/comms/property-search');
const commsWhatsApp = require('../api/comms/whatsapp');
const commsWhatsAppWebhook = require('../api/comms/whatsapp-webhook');
const commsEmail = require('../api/comms/email');
const commsOutstandWebhook = require('../api/comms/outstand-webhook');

/** Enterprise — mirror Vercel serverless handlers for local Express dev */
const wrap = (handler) => (req, res, next) => Promise.resolve(handler(req, res)).catch((err) => {
  if (!res.headersSent) res.status(500).json({ message: err.message || 'Internal error' });
  else next(err);
});
const enterpriseRegister = require('../api/auth/register-enterprise');
const enterpriseAgencies = require('../api/enterprise/agencies');
const enterpriseLinkAgency = require('../api/enterprise/link-agency');
const enterpriseAcceptInvite = require('../api/enterprise/accept-invite');
const enterpriseUnlinkAgency = require('../api/enterprise/unlink-agency');
const enterprisePendingInvites = require('../api/enterprise/pending-invites');
const enterpriseCancelInvite = require('../api/enterprise/cancel-invite');
const enterpriseResendInvite = require('../api/enterprise/resend-invite');
const enterpriseDashboard = require('../api/enterprise/dashboard');
const enterpriseRoyaltyConfig = require('../api/enterprise/royalty-config');
const enterpriseMarketing = require('../api/enterprise/marketing');
app.post('/api/auth/register-enterprise', wrap(enterpriseRegister));
app.get('/api/enterprise/agencies', wrap(enterpriseAgencies));
app.post('/api/enterprise/link-agency', wrap(enterpriseLinkAgency));
app.post('/api/enterprise/accept-invite', wrap(enterpriseAcceptInvite));
app.post('/api/enterprise/unlink-agency', wrap(enterpriseUnlinkAgency));
app.get('/api/enterprise/pending-invites', wrap(enterprisePendingInvites));
app.post('/api/enterprise/cancel-invite', wrap(enterpriseCancelInvite));
app.post('/api/enterprise/resend-invite', wrap(enterpriseResendInvite));
app.get('/api/enterprise/dashboard', wrap(enterpriseDashboard));
app.get('/api/enterprise/royalty-config', wrap(enterpriseRoyaltyConfig));
app.put('/api/enterprise/royalty-config', wrap(enterpriseRoyaltyConfig));
app.get('/api/enterprise/marketing', wrap(enterpriseMarketing));
app.post('/api/enterprise/marketing', wrap(enterpriseMarketing));
const enterpriseAgencyDetail = require('../api/enterprise/agency-detail/[agencyId]');
app.get('/api/comms/conversations', wrap(commsConversations));
app.post('/api/comms/conversations', wrap(commsConversations));
app.get('/api/comms/messages', wrap(commsMessages));
app.post('/api/comms/messages', wrap(commsMessages));
app.get('/api/comms/notifications', wrap(commsNotifications));
app.post('/api/comms/notifications', wrap(commsNotifications));
app.get('/api/comms/contacts', wrap(commsContacts));
app.get('/api/comms/property-search', wrap(commsPropertySearch));
app.get('/api/comms/whatsapp', wrap(commsWhatsApp));
app.post('/api/comms/whatsapp', wrap(commsWhatsApp));
app.get('/api/comms/whatsapp-webhook', wrap(commsWhatsAppWebhook));
app.post('/api/comms/whatsapp-webhook', wrap(commsWhatsAppWebhook));
app.get('/api/comms/email', wrap(commsEmail));
app.post('/api/comms/email', wrap(commsEmail));
app.post('/api/comms/outstand-webhook', wrap(commsOutstandWebhook));

/** Admin — mirror Vercel serverless handlers for local Express dev */
const adminBootstrap = require('../api/admin/bootstrap');
const adminListings = require('../api/admin/listings');
const adminUsersById = require('../api/admin/users/[id]');
const adminPropertyMetadata = require('../api/admin/property-metadata');
const adminDemoUsers = require('../api/admin/demo-users');
app.get('/api/admin/bootstrap', wrap(adminBootstrap));
app.get('/api/admin/listings', wrap(adminListings));
app.get('/api/admin/property-metadata', wrap(adminPropertyMetadata));
app.get('/api/admin/demo-users', wrap(adminDemoUsers));
app.get('/api/admin/users/:id', wrap(adminUsersById));
app.patch('/api/admin/users/:id', wrap(adminUsersById));
app.delete('/api/admin/users/:id', wrap(adminUsersById));

app.get('/api/enterprise/agency-detail/:agencyId', (req, res, next) => {
  req.query = { ...req.query, agencyId: req.params.agencyId };
  return wrap(enterpriseAgencyDetail)(req, res, next);
});

// Database
const mongoUri = process.env.MONGO_URI || 
  'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';

if (process.env.MONGO_URI) {
    console.log('✅ MONGO_URI loaded from environment (local .env)');
} else {
    console.log('⚠️ MONGO_URI not in .env — using server default connection string (may differ from production Vercel env)');
}

mongoose.connect(mongoUri)
    .then(() => {
        console.log('✅ MongoDB Connected to Atlas');
        if (isDevBypassEnabled()) {
            console.log('🔓 DEV_BYPASS_AUTH is on — API accepts Bearer __IPM_DEV_BYPASS__ (use with REACT_APP_DEV_BYPASS_AUTH on the client)');
        }
    })
    .catch(err => console.log('❌ MongoDB Connection Error:', err));

// NEW ROUTE: Get all booked dates
app.get('/api/appointments', async (req, res) => {
    try {
        // Fetch only the 'selectedDate' field to save bandwidth
        const appointments = await Inquiry.find({}, 'selectedDate');
        
        // Extract just the date strings from the documents
        const bookedDates = appointments
            .map(app => app.selectedDate)
            .filter(date => date != null); // Remove empty ones

        res.json(bookedDates);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const Property = require('./models/Property');
// Route to get all properties
app.get('/api/properties', async (req, res) => {
    try {
        const properties = await Property.find();
        res.json(properties);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Route to get a single property
// GET Single Property by ID
app.get('/api/properties/:id', async (req, res) => {
    try {
        const property = await Property.findById(req.params.id);
        if (!property) return res.status(404).json({ message: 'Property not found' });
        res.json(property);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

const Meeting = require('./models/Meeting');

// POST: Schedule a Meeting (Agent Footer)
app.post('/api/meetings', async (req, res) => {
    try {
        const newMeeting = new Meeting(req.body);
        const savedMeeting = await newMeeting.save();
        res.status(201).json(savedMeeting);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET: Check booked times for a specific date and agent
app.get('/api/meetings', async (req, res) => {
    try {
        const { date, agentName } = req.query;
        // Find bookings matching the date and agent
        const bookings = await Meeting.find({ date, agentName });
        // Return just the times that are taken (e.g. ["10:00 AM", "02:00 PM"])
        const bookedTimes = bookings.map(b => b.time);
        res.json(bookedTimes);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/** Default 5001: macOS AirPlay Receiver often binds to 5000 and returns 403 for JSON POSTs (e.g. /api/auth/login). Override with PORT=5000 if needed. */
const PORT = process.env.PORT || 5001;

// --- API ROUTES ---

// Vault — query-style GET & JSON POST (same contract as api/vault/index.js on Vercel; local proxy hits Express)
app.get('/api/vault', async (req, res) => {
    try {
        const { userId, propertyId, folder } = req.query;
        if (!userId) {
            return res.status(400).json({ message: 'userId query parameter is required' });
        }
        const filter = { userId: String(userId) };
        if (propertyId) filter.propertyId = String(propertyId);
        if (folder) filter.folder = String(folder);
        const files = await File.find(filter).sort({ date: -1 }).lean();
        const LIMIT_BYTES = 1024 * 1024 * 1024;
        const usedResult = await File.aggregate([
            { $match: { userId: String(userId) } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$sizeBytes', 0] } } } }
        ]);
        const usedBytes = (usedResult[0] && usedResult[0].total) || 0;
        return res.status(200).json({ files, usedBytes, limitBytes: LIMIT_BYTES });
    } catch (err) {
        console.error('Vault GET error:', err);
        return res.status(500).json({ message: err.message || 'Server error' });
    }
});

app.post('/api/vault', async (req, res) => {
    try {
        const { userId: bodyUserId, name, fileData, size, type, folder, propertyId, propertyTitle, documentType } = req.body || {};
        if (!bodyUserId || !name) {
            return res.status(400).json({ message: 'userId and name are required' });
        }
        if (!fileData) {
            return res.status(400).json({ message: 'fileData is required' });
        }
        const sizeBytes = typeof size === 'number' ? size : (typeof size === 'string' ? parseInt(size, 10) : 0) || Math.ceil((fileData.length || 0) * 0.75);
        const LIMIT_BYTES = 1024 * 1024 * 1024;
        const usedResult = await File.aggregate([
            { $match: { userId: String(bodyUserId) } },
            { $group: { _id: null, total: { $sum: { $ifNull: ['$sizeBytes', 0] } } } }
        ]);
        const usedBytes = (usedResult[0] && usedResult[0].total) || 0;
        if (usedBytes + sizeBytes > LIMIT_BYTES) {
            return res.status(403).json({
                message: 'Storage limit reached (1 GB per user).'
            });
        }
        const formatSize = (bytes) => {
            if (!bytes) return '0 KB';
            if (typeof bytes === 'string') {
                if (bytes.includes('KB') || bytes.includes('MB') || bytes.includes('B')) return bytes;
                bytes = Math.ceil(bytes.length * 0.75);
            }
            if (bytes < 1024) return `${bytes} B`;
            if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
            return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
        };
        const newFile = new File({
            userId: String(bodyUserId),
            name: String(name),
            path: String(fileData),
            size: formatSize(sizeBytes),
            sizeBytes,
            type: type || 'application/octet-stream',
            folder: folder || 'General Documents',
            propertyId: propertyId || null,
            propertyTitle: propertyTitle || null,
            documentType: documentType || null,
            date: new Date()
        });
        const savedFile = await newFile.save();
        return res.status(200).json(savedFile);
    } catch (err) {
        console.error('Vault POST error:', err);
        return res.status(500).json({ message: err.message || 'Server error' });
    }
});

// 1. UPLOAD FILE (multipart)
app.post('/api/vault/upload', upload.single('file'), async (req, res) => {
    try {
        const newFile = new File({
            userId: req.body.userId,
            name: req.file.originalname,
            path: req.file.path,
            size: (req.file.size / 1024).toFixed(2) + ' KB', // Convert to KB
            type: req.file.mimetype,
            folder: req.body.folder || 'General'
        });
        const savedFile = await newFile.save();
        res.status(200).json(savedFile);
    } catch (err) {
        res.status(500).json(err);
    }
});

// 2. GET USER FILES
app.get('/api/vault/:userId', async (req, res) => {
    try {
        const files = await File.find({ userId: req.params.userId }).sort({ date: -1 });
        res.status(200).json(files);
    } catch (err) {
        res.status(500).json(err);
    }
});

app.put('/api/users/change-password', async (req, res) => {
    const { userId, currentPassword, newPassword } = req.body;

    try {
        // A. Find the user
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        // B. Verify Current Password
        // Note: Assuming you store passwords as hashes. If plain text (not recommended), use simple === comparison.
        // If using bcrypt:
        const isMatch = await bcrypt.compare(currentPassword, user.password); 
        if (!isMatch) {
            return res.status(400).json({ success: false, message: "Incorrect current password" });
        }

        // C. Hash New Password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // D. Update User
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: "Password updated successfully" });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

app.put('/api/users/update-profile', async (req, res) => {
    const { userId, name, email, phone, location, bio, photo } = req.body;

    try {
        // Find user by ID
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // Update fields
        user.name = name || user.name;
        user.email = email || user.email;
        user.phone = phone || user.phone;
        user.location = location || user.location;
        user.bio = bio || user.bio;
        user.photo = photo || user.photo; // Save the base64 string

        // Save to DB
        const updatedUser = await user.save();

        // Return the updated user object (so frontend can update localStorage)
        res.json({ 
            success: true, 
            message: "Profile updated", 
            user: updatedUser 
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// --- SIGNUP ROUTE ---
app.post('/api/users/signup', async (req, res) => {
    const { name, email, password, role } = req.body;

    try {
        console.log("Attempting signup for:", email); // Debug Log 1

        // 1. Check if user exists
        const existingUser = await User.findOne({ email });
        
        if (existingUser) {
            console.log("❌ User already exists in DB"); // Debug Log 2
            return res.status(400).json({ success: false, message: "Email is already taken" });
        }

        // 2. Create New User
        // Note: In a real app, hash password here using bcrypt
        const newUser = new User({
            name,
            email,
            password, // ideally: await bcrypt.hash(password, 10)
            role: role || 'Investor',
            portfolio: [], // Initialize empty arrays
            agencyStats: {},
            agentStats: {}
        });

        await newUser.save();
        console.log("✅ User created successfully"); // Debug Log 3

        res.status(201).json({ 
            success: true, 
            message: "User registered successfully", 
            user: newUser 
        });

    } catch (err) {
        console.error("Signup Error:", err);
        res.status(500).json({ success: false, message: "Server Error: " + err.message });
    }
});

// --- AI CHAT (Gemini + Claude fallback) ---
const chatRoute = require('./routes/chat');
app.use('/api/chat', chatRoute);

// --- BUG REPORTS & FEEDBACK (with image upload + email) ---
const bugReportRoute = require('./routes/bugReport');
app.use('/api/bug-report', bugReportRoute);

// Start the server

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
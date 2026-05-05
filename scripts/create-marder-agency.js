/**
 * One-off script to create the Marder Properties demo agency in IPM.
 *
 * Real-world details scraped from https://www.marder.co.za (their public site
 * & contact page). Stored against migrationSource: 'marder-demo' so we can
 * clean up later if the pitch falls through.
 *
 * Usage:
 *   node scripts/create-marder-agency.js
 *
 * Re-runnable: if a user with this email already exists, the script will
 * update the existing record (idempotent) rather than fail.
 */

const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// Local logo file. If present, embed as a data URL so it renders even when
// Marder's CDN blocks hotlinking. Falls back to the public CDN URL.
const LOCAL_LOGO_PATH = path.join(
    __dirname,
    'assets',
    'marder-logo.png'
);

function loadLogo(fallbackUrl) {
    try {
        if (fs.existsSync(LOCAL_LOGO_PATH)) {
            const buf = fs.readFileSync(LOCAL_LOGO_PATH);
            const b64 = buf.toString('base64');
            console.log(`Embedded local logo (${buf.length} bytes) as data URL.`);
            return `data:image/png;base64,${b64}`;
        }
    } catch (err) {
        console.warn('Could not load local logo, falling back to CDN URL:', err.message);
    }
    return fallbackUrl;
}

// IMPORTANT: load mongoose & bcrypt from server/node_modules to match the
// instance used by ../server/models/User.js — otherwise model registration
// happens on a different mongoose instance and queries buffer forever.
const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const bcrypt = require(path.join(__dirname, '..', 'server', 'node_modules', 'bcryptjs'));
const User = require('../server/models/User');

const MONGO_URI = process.env.MONGO_URI ||
    'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';

const EMAIL = 'marder_agency@demo.com';
const PASSWORD = 'Phoenix@1';

const AGENCY = {
    name: 'Marder Properties',
    agencyName: 'Marder Properties',
    contact: '+27 11 453 1220',
    location: 'Bedfordview, Johannesburg, South Africa',
    bio: 'Marder Properties was established in 1994. Specialising in commercial, industrial and investment property across the East Rand, Midrand, Sandton and Centurion. With over 30 years of experience handling leases, sales, developments, acquisitions and investments — backed by an extensive network of property developers, individual and corporate property owners.',
    logo: loadLogo('https://www.marder.co.za/cache/3/Logo/200x100xc/marder-properties-logo.png'),
    role: 'agency',
    subscriptionPlan: 'Premium',
    subscriptionPlanOption: '15-150',
    subscriptionStatus: 'active',
    migrationSource: 'marder-demo',
    preferences: {
        currency: 'ZAR',
        units: 'sqm',
        priceDisplayMode: 'gross',
    },
    agencyStats: {
        totalRevenue: 0,
        propertiesSold: 0,
        activeAgents: 0,
        totalListings: 0,
        activeLeads: 0,
        branches: [
            {
                name: 'Head Office — Bedfordview',
                address: 'Unit 1, Block E, 72B Concorde East Road, Bedfordview, Johannesburg',
            },
        ],
        topAgents: [],
        pipelineColumns: [],
        pipelineDeals: [],
        crmLeads: [],
    },
};

async function main() {
    console.log('Connecting to MongoDB…');
    await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 45000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
    });
    console.log('✅ Connected.');

    try {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(PASSWORD, salt);

        const existing = await User.findOne({ email: EMAIL });

        if (existing) {
            console.log(`Agency already exists with _id ${existing._id} — updating in place.`);
            existing.name = AGENCY.name;
            existing.password = hashedPassword;
            existing.role = AGENCY.role;
            existing.contact = AGENCY.contact;
            existing.location = AGENCY.location;
            existing.bio = AGENCY.bio;
            existing.logo = AGENCY.logo;
            existing.agencyName = AGENCY.agencyName;
            existing.subscriptionPlan = AGENCY.subscriptionPlan;
            existing.subscriptionPlanOption = AGENCY.subscriptionPlanOption;
            existing.subscriptionStatus = AGENCY.subscriptionStatus;
            existing.migrationSource = AGENCY.migrationSource;
            existing.preferences = AGENCY.preferences;
            // Preserve any agencyStats that already exist (don't wipe topAgents etc.)
            if (!existing.agencyStats || !existing.agencyStats.branches?.length) {
                existing.agencyStats = AGENCY.agencyStats;
            } else {
                existing.agencyStats.branches = AGENCY.agencyStats.branches;
            }
            await existing.save();
            console.log('✅ Updated existing Marder agency.');
            console.log({ _id: String(existing._id), email: existing.email, role: existing.role });
            return;
        }

        const userData = {
            ...AGENCY,
            email: EMAIL,
            password: hashedPassword,
        };

        const user = new User(userData);
        const saved = await user.save();
        console.log('✅ Created Marder Properties agency.');
        console.log({
            _id: String(saved._id),
            email: saved.email,
            role: saved.role,
            agencyName: saved.agencyName,
            location: saved.location,
            contact: saved.contact,
        });
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error('❌ Failed to create Marder agency:', err);
    process.exit(1);
});

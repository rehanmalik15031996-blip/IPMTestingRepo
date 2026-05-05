/**
 * One-off script to create Marder Properties' agents in IPM.
 *
 * Pulled from https://www.marder.co.za/agents/ — only individuals titled
 * Property Practitioner (Principal / Non-Principal / Candidate) or "Agent".
 * Office Manager, Reception/PA, and Business Development roles are excluded.
 *
 * Each agent gets:
 *   - A User document with role: 'agency_agent', linked to Marder via agencyId
 *   - An entry in Marder's agencyStats.topAgents array (so they show on the
 *     agency dashboard / agent management UI)
 *   - migrationSource: 'marder-demo' for clean teardown
 *
 * Login: <firstname>.<lastname>@marder-demo.com / Phoenix@1
 *
 * Usage:
 *   MONGO_URI='...' node scripts/create-marder-agents.js
 *
 * Re-runnable: looks up by email and updates in place.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const mongoose = require(path.join(__dirname, '..', 'server', 'node_modules', 'mongoose'));
const bcrypt = require(path.join(__dirname, '..', 'server', 'node_modules', 'bcryptjs'));
const User = require('../server/models/User');

const MONGO_URI = process.env.MONGO_URI ||
    'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';

const AGENCY_EMAIL = 'marder_agency@demo.com';
const AGENT_PASSWORD = 'Phoenix@1';
const BRANCH_ID = 'head-office';
const BRANCH_NAME = 'Head Office — Bedfordview';

// Map Marder titles → IPM tier badge (silver | gold | platinum)
function tierFor(title) {
    if (/principal property practitioner/i.test(title) && !/non-principal/i.test(title)) {
        return 'platinum';
    }
    if (/non-principal property practitioner/i.test(title)) return 'gold';
    if (/candidate property practitioner/i.test(title)) return 'silver';
    if (/^agent$/i.test(title)) return 'silver';
    return 'silver';
}

// Map title → display label used in topAgents.tier (free-form string)
function tierLabelFor(title) {
    if (/principal property practitioner/i.test(title) && !/non-principal/i.test(title)) {
        return 'Principal Practitioner';
    }
    if (/non-principal property practitioner/i.test(title)) return 'Senior Practitioner';
    if (/candidate property practitioner/i.test(title)) return 'Candidate Practitioner';
    return 'Agent';
}

function emailFor(name) {
    return name
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/\s+/g, '.')
        .replace(/[^a-z.]/g, '')
        + '@marder-demo.com';
}

const AGENTS = [
    { name: 'Graham Marder',       title: 'Principal Property Practitioner',     phone: '+27 82 652 2236', ffc: 'FFC 002 4624' },
    { name: 'Alex Vangelatos',     title: 'Non-Principal Property Practitioner', phone: '+27 83 315 8558', ffc: 'FFC 122 8962' },
    { name: 'Cameron Cock',        title: 'Non-Principal Property Practitioner', phone: '+27 83 387 0612', ffc: 'FFC 116 0131' },
    { name: 'Fabio De Castro',     title: 'Non-Principal Property Practitioner', phone: '+27 83 454 7412', ffc: 'FFC 124 1233' },
    { name: 'Kirsten Chalice',     title: 'Non-Principal Property Practitioner', phone: '+27 67 102 7844', ffc: 'FFC 123 6596' },
    { name: 'Kyle Cock',           title: 'Non-Principal Property Practitioner', phone: '+27 72 697 4967', ffc: 'FFC 118 0029' },
    { name: 'Theo Papadimitriou',  title: 'Non-Principal Property Practitioner', phone: '+27 76 462 0927', ffc: null },
    { name: 'Chris Georgiades',    title: 'Candidate Property Practitioner',     phone: '+27 79 993 8111', ffc: null },
    { name: 'Dillen Van Den Heever', title: 'Candidate Property Practitioner',   phone: '+27 68 906 8062', ffc: null },
    { name: 'Mila Kapp',           title: 'Candidate Property Practitioner',     phone: '+27 68 612 1511', ffc: null },
    { name: 'Greig Harty',         title: 'Agent',                               phone: '+27 69 026 8981', ffc: null },
    { name: 'Motshwane Mabogoane', title: 'Agent',                               phone: '+27 69 021 6512', ffc: null },
    { name: 'Nancy Ramovha',       title: 'Agent',                               phone: '+27 68 611 5660', ffc: null },
];

async function main() {
    console.log('Connecting to MongoDB…');
    await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 45000,
        socketTimeoutMS: 45000,
        bufferCommands: false,
    });
    console.log('✅ Connected.');

    try {
        const agency = await User.findOne({ email: AGENCY_EMAIL });
        if (!agency) {
            console.error(`❌ Marder agency (${AGENCY_EMAIL}) not found — run create-marder-agency.js first.`);
            process.exit(1);
        }
        console.log(`Found Marder agency: _id=${agency._id}`);

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(AGENT_PASSWORD, salt);

        const newTopAgents = [];
        let created = 0;
        let updated = 0;

        for (const a of AGENTS) {
            const email = emailFor(a.name);
            const tier = tierFor(a.title);
            const tierLabel = tierLabelFor(a.title);
            const bio = a.ffc
                ? `${a.title} at Marder Properties (Head Office — Bedfordview). PPRA Registered | ${a.ffc}.`
                : `${a.title} at Marder Properties (Head Office — Bedfordview).`;

            const baseFields = {
                name: a.name,
                email,
                password: hashedPassword,
                role: 'agency_agent',
                phone: a.phone,
                contact: a.phone,
                location: 'Bedfordview, Johannesburg, South Africa',
                bio,
                agencyId: agency._id,
                agencyName: 'Marder Properties',
                branchId: BRANCH_ID,
                branchName: BRANCH_NAME,
                allowMarketingCampaigns: true,
                agentTier: tier,
                migrationSource: 'marder-demo',
                preferences: {
                    currency: 'ZAR',
                    units: 'sqm',
                    priceDisplayMode: 'gross',
                },
            };

            let agentDoc = await User.findOne({ email });
            if (agentDoc) {
                Object.assign(agentDoc, baseFields);
                await agentDoc.save();
                updated++;
                console.log(`  ↺ updated: ${a.name} (${email})`);
            } else {
                agentDoc = await new User({
                    ...baseFields,
                    agentStats: {
                        myCommission: 0,
                        activeListings: 0,
                        pendingDeals: 0,
                        meetingsScheduled: 0,
                        recentLeads: [],
                        pipelineColumns: [],
                        pipelineDeals: [],
                        crmLeads: [],
                    },
                }).save();
                created++;
                console.log(`  + created: ${a.name} (${email})`);
            }

            newTopAgents.push({
                _id: agentDoc._id,
                name: a.name,
                email,
                phone: a.phone,
                photo: null,
                branch: BRANCH_NAME,
                branchId: BRANCH_ID,
                tier: tierLabel,        // legacy display field
                title: tierLabel,       // explicit job title — survives dashboard recomputes
                sales: 0,
                revenue: 0,
                avgDays: 0,
                conversionRate: '0%',
                status: 'active',
                monthlyTarget: null,
                commissionRate: null,
            });
        }

        agency.agencyStats = agency.agencyStats || {};
        agency.agencyStats.topAgents = newTopAgents;
        agency.agencyStats.activeAgents = newTopAgents.length;
        agency.markModified('agencyStats');
        await agency.save();
        console.log(`✅ Synced agencyStats.topAgents (${newTopAgents.length} agents).`);
        console.log(`Done. Created ${created}, updated ${updated}.`);
        console.log(`\nLogin for any agent:  <firstname>.<lastname>@marder-demo.com / ${AGENT_PASSWORD}`);
    } finally {
        await mongoose.disconnect();
    }
}

main().catch((err) => {
    console.error('❌ Failed to seed Marder agents:', err);
    process.exit(1);
});

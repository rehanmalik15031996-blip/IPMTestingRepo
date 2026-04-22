const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'investor' },
    phone: String,
    location: String,
    bio: String,
    photo: String,
    logo: String, // For agency logo
    subscriptionPlan: String, // For subscription plans (Free, Basic, Premium, Custom)
    subscriptionStatus: { type: String, default: null }, // 'pending_payment' | 'active' | 'canceled' | 'past_due'
    stripeCustomerId: { type: String, default: null },
    stripeSubscriptionId: { type: String, default: null },
    subscriptionPlanOption: { type: String, default: null }, // e.g. agency Premium tier: '10-100', '15-150', etc.
    preferredCities: [String], // For buyers/investors
    preferredPropertyTypes: [String], // For buyers/investors
    selectedProperties: [{ type: String }], // Image indices or property IDs from registration preference step (investor/legacy)
    // Buyer registration: preferences from interior / exterior / videos folders
    preferredInterior: [String], // Filenames of selected interior images
    preferredExterior: [String], // Filenames of selected exterior images
    preferredVideos: [String],   // Filenames of selected video preferences
    contact: String, // For agency contact number
    agencyName: String, // For agency name (and agency_agent: display name of agency)
    agencyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }, // For agency_agent: which agency
    branchId: { type: String, default: null }, // For agency_agent: which branch
    branchName: String, // For agency_agent: display name of branch
    allowMarketingCampaigns: { type: Boolean, default: false }, // For agency_agent: set by agency when inviting

    // PARTNER sub-type: 'bond_originator' | 'conveyancer' | 'marketing' (role must be 'partner')
    partnerType: { type: String, default: null },

    // ENTERPRISE → AGENCY linkage (agency users that belong to an enterprise group)
    enterpriseId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    enterpriseName: { type: String, default: null },
    monthlyRevenueTarget: { type: Number, default: null }, // For agents: target revenue per month (used in sales tile)
    agentTier: { type: String, enum: ['silver', 'gold', 'platinum'], default: null }, // Computed from leads, listings, sales, speed
    agentScore: { type: Number, min: 0, max: 100, default: null }, // 0-100, persists so tier sticks
    realEstateLicenceDocument: { type: String }, // Base64 or URL of licence document (agents)
    realEstateLicenceFileName: { type: String },
    /** Set when user was created from bulk import (e.g. PropData XLSX) — used for targeted reset */
    migrationSource: { type: String },
    // Display preferences (currency, units, price display mode)
    preferences: {
        currency: { type: String, default: 'USD' },
        units: { type: String, enum: ['sqft', 'sqm'], default: 'sqft' },
        priceDisplayMode: { type: String, enum: ['gross', 'net'], default: 'gross' },
    },

    // Buyer/Investor notification preferences
    notifyOffMarket: { type: Boolean, default: false },
    notifyShareWithAgencies: { type: Boolean, default: false },
    
    // ✅ ADDED: Saved Properties references
    savedProperties: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Property' }],

    // Connected email (DIY: Google + Microsoft OAuth; or legacy Nylas grantId)
    emailConnections: [{
        connectionId: { type: String },       // our id for disconnect (DIY)
        grantId: { type: String },            // legacy Nylas
        provider: { type: String, default: 'google' },
        email: { type: String, required: true },
        refreshToken: { type: String },       // DIY OAuth
        accessToken: { type: String },
        expiresAt: { type: Number }          // ms timestamp
    }],
    
    // INVESTOR DATA
    portfolio: [{
        propertyTitle: String,
        location: String,
        investedAmount: { type: Number, default: 0 },
        currentValue: { type: Number, default: 0 },
        roi: { type: Number, default: 0 },
        status: { type: String, default: 'Active' },
        photo: { type: String }, // 👈 THIS WAS MISSING
        details: { type: mongoose.Schema.Types.Mixed }
    }],

    // AGENCY DATA
    agencyStats: {
        totalRevenue: { type: Number, default: 0 },
        propertiesSold: { type: Number, default: 0 },
        activeAgents: { type: Number, default: 0 },
        totalListings: { type: Number, default: 0 },
        activeLeads: { type: Number, default: 0 },
        branches: [{ name: { type: String }, address: { type: String } }],
        topAgents: [{ 
            name: { type: String },
            email: { type: String },
            phone: { type: String },
            photo: { type: String },
            branch: { type: String, default: 'Main HQ' },
            branchId: { type: String },
            tier: { type: String, default: 'Junior Agent' },
            sales: { type: Number, default: 0 },
            revenue: { type: Number, default: 0 },
            avgDays: { type: Number, default: 30 },
            conversionRate: { type: String, default: '0%' },
            status: { type: String, default: 'invited' }, // 'invited' | 'active'
            monthlyTarget: { type: Number, default: null }, // Revenue target per month for this agent
            commissionRate: { type: Number, default: null }, // Commission rate % (e.g. 5 = 5%)
            _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
        }],
        pipelineColumns: [{
            id: { type: String },
            title: { type: String },
            total: { type: String },
            count: { type: Number }
        }],
        pipelineDeals: [{
            id: { type: String },
            name: { type: String },
            role: { type: String },
            type: { type: String },
            property: { type: String },
            price: { type: String },
            days: { type: String },
            status: { type: String },
            externalIds: { type: mongoose.Schema.Types.Mixed },
        }],
        crmLeads: [{
            id: { type: String },
            leadScore: { type: Number, min: 0, max: 100, default: null }, // Match quality + info completeness
            assignedAgentId: { type: String },
            name: { type: String },
            type: { type: String },
            budget: { type: String },
            status: { type: String },
            lastContact: { type: String },
            email: { type: String },
            mobile: { type: String },
            propertyOfInterest: { type: String },
            dateAdded: { type: String },
            source: { type: String },
            linkedProperties: { type: mongoose.Schema.Types.Mixed },
            activities: { type: mongoose.Schema.Types.Mixed },
            leadType: { type: String, enum: ['buyer', 'seller', 'investor'] },
            buyerDetails: { type: mongoose.Schema.Types.Mixed },
            sellerDetails: { type: mongoose.Schema.Types.Mixed },
            investorDetails: { type: mongoose.Schema.Types.Mixed },
            viewingScheduledProperty: { type: String },
            viewingScheduledDate: { type: String },
            viewingScheduledTime: { type: String },
            externalIds: { type: mongoose.Schema.Types.Mixed },
        }],
        /** Per-agency CRM configuration (pipeline stages, activity channels, field mappings) */
        crmConfig: {
            pipelineStages: [{
                id: { type: String, required: true },
                title: { type: String, required: true },
                order: { type: Number, default: 0 },
                color: { type: String },
            }],
            activityChannels: [{
                value: { type: String, required: true },
                label: { type: String, required: true },
            }],
            hubspotFieldMap: { type: mongoose.Schema.Types.Mixed },
            builtFrom: { type: String },
            updatedAt: { type: Date },
        },
        /** Staged HubSpot / PropData export files (paths on disk + metadata) — see agencyMigration routes */
        migrationImports: { type: mongoose.Schema.Types.Mixed },
        /** HubSpot / PropData API credentials — see agencyMigration integration routes (tokens stripped in API responses) */
        integrations: { type: mongoose.Schema.Types.Mixed }
    },

    // ENTERPRISE DATA (role: 'enterprise')
    enterpriseStats: {
        royaltyDefaults: {
            branchToFranchise: { type: Number, default: 3 },
            franchiseToCountry: { type: Number, default: 5 },
            countryToHq: { type: Number, default: 1.5 },
        },
        agencies: [{
            _id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            name: { type: String },
            branchCount: { type: Number, default: 0 },
            agentCount: { type: Number, default: 0 },
            status: { type: String, default: 'active' },
            linkedAt: { type: Date },
            royaltyRates: {
                branchToFranchise: { type: Number },
                franchiseToCountry: { type: Number },
                countryToHq: { type: Number },
            },
        }],
    },

    // OUTSTAND.SO SOCIAL ACCOUNTS (enterprise marketing)
    outstandAccounts: [{
        outstandAccountId: { type: String, required: true },
        platform: { type: String, required: true },
        username: { type: String },
        connectedAt: { type: Date, default: Date.now },
    }],

    // WHATSAPP BUSINESS
    whatsappBusiness: {
        phoneNumberId: { type: String },
        wabaId: { type: String },
        displayPhone: { type: String },
        accessToken: { type: String },
        connectedAt: { type: Date },
    },

    // CONNECTED EMAIL ACCOUNTS (Gmail / Outlook)
    connectedEmails: [{
        provider: { type: String, enum: ['gmail', 'outlook'] },
        email: { type: String },
        accessToken: { type: String },
        refreshToken: { type: String },
        tokenExpiry: { type: Date },
        connectedAt: { type: Date, default: Date.now },
    }],

    // AGENT DATA
    agentStats: {
        myCommission: { type: Number, default: 0 },
        activeListings: { type: Number, default: 0 },
        pendingDeals: { type: Number, default: 0 },
        meetingsScheduled: { type: Number, default: 0 },
        recentLeads: [{ name: String, status: String, property: String, date: String }],
        pipelineColumns: [{
            id: { type: String },
            title: { type: String },
            total: { type: String },
            count: { type: Number }
        }],
        pipelineDeals: [{
            id: { type: String },
            name: { type: String },
            role: { type: String },
            type: { type: String },
            property: { type: String },
            price: { type: String },
            days: { type: String },
            status: { type: String },
            externalIds: { type: mongoose.Schema.Types.Mixed },
        }],
        crmLeads: [{
            id: { type: String },
            leadScore: { type: Number, min: 0, max: 100, default: null },
            name: { type: String },
            type: { type: String },
            budget: { type: String },
            status: { type: String },
            lastContact: { type: String },
            email: { type: String },
            mobile: { type: String },
            propertyOfInterest: { type: String },
            dateAdded: { type: String },
            source: { type: String },
            linkedProperties: { type: mongoose.Schema.Types.Mixed },
            activities: { type: mongoose.Schema.Types.Mixed },
            leadType: { type: String, enum: ['buyer', 'seller', 'investor'] },
            buyerDetails: { type: mongoose.Schema.Types.Mixed },
            sellerDetails: { type: mongoose.Schema.Types.Mixed },
            investorDetails: { type: mongoose.Schema.Types.Mixed },
            viewingScheduledProperty: { type: String },
            viewingScheduledDate: { type: String },
            viewingScheduledTime: { type: String },
            externalIds: { type: mongoose.Schema.Types.Mixed },
        }]
    }
});

// Index for agency dashboard: find all agents in this agency
userSchema.index({ agencyId: 1 });
// Index for enterprise: find all agencies in this enterprise
userSchema.index({ enterpriseId: 1 });

module.exports = mongoose.model('User', userSchema);
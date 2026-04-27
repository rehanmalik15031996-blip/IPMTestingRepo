// Hearthstone Africa demo data (v2 brief - 27 Apr 2026).
// Used to populate the enterprise demo dashboards launched from the
// admin "Demo Dashboards" panel so demos look populated for client pitches.
//
// Shapes mirror what /api/enterprise/dashboard returns so the existing
// renderers in EnterpriseDashboard.js consume it without further changes.

/* eslint-disable max-len */

// ---- 1. Top-line summary (Section 1 + Section 3) -----------------------------
export const summary = {
    agencyCount: 38,            // Total Franchises
    totalListings: 6847,
    activeListings: 6847,
    totalAgents: 312,
    totalRevenue: 18400000,     // Network GTV [MTD]
    totalBranches: 74,
    totalPropertiesSold: 4,     // Beverly Hills Central — used on Branch tab
    totalLeads: 67,             // Pipeline Leads — Branch tab
    newListingsLast30: 124,
    totalRoyalties: 276000,     // Total Royalties [MTD]
};

// ---- 2. Performance by country (Section 1 map + Section 3 table) -------------
// `gtv` is read by the dashboard tab, `revenue` by the country tab. We populate
// both with the same value. `branches` here are tuned to sum to 74 to match the
// "Active Branches: 74" headline in the brief.
export const performanceByCountry = [
    { country: 'United States',        gtv: 4820000, revenue: 4820000, franchises: 5, branches: 13, agents: 62, compliance: 92, royaltiesMtd: 72300, listings: 1847 },
    { country: 'United Kingdom',       gtv: 3140000, revenue: 3140000, franchises: 4, branches:  9, agents: 48, compliance: 96, royaltiesMtd: 47100, listings: 1124 },
    { country: 'Australia',            gtv: 2680000, revenue: 2680000, franchises: 4, branches:  9, agents: 44, compliance: 94, royaltiesMtd: 40200, listings:  984 },
    { country: 'United Arab Emirates', gtv: 2290000, revenue: 2290000, franchises: 3, branches:  8, agents: 38, compliance: 87, royaltiesMtd: 34350, listings:  842 },
    { country: 'South Africa',         gtv: 1840000, revenue: 1840000, franchises: 4, branches: 11, agents: 46, compliance: 94, royaltiesMtd: 27600, listings:  846 },
    { country: 'Japan',                gtv: 1120000, revenue: 1120000, franchises: 3, branches:  5, agents: 28, compliance: 99, royaltiesMtd: 16800, listings:  492 },
    { country: 'Netherlands',          gtv:  710000, revenue:  710000, franchises: 2, branches:  4, agents: 18, compliance: 97, royaltiesMtd: 10650, listings:  284 },
    { country: 'Spain',                gtv:  624000, revenue:  624000, franchises: 3, branches:  5, agents: 22, compliance: 91, royaltiesMtd:  9360, listings:  418 },
    { country: 'Italy',                gtv:  548000, revenue:  548000, franchises: 3, branches:  5, agents: 18, compliance: 93, royaltiesMtd:  8220, listings:  322 },
    { country: 'New Zealand',          gtv:  382000, revenue:  382000, franchises: 2, branches:  3, agents: 16, compliance: 95, royaltiesMtd:  5730, listings:  247 },
    { country: 'Malta',                gtv:  246000, revenue:  246000, franchises: 1, branches:  2, agents:  8, compliance: 98, royaltiesMtd:  3690, listings:  148 },
];

// ---- 3. Franchise directory (Section 2 + Section 4) --------------------------
// Rich form used by the Franchises & Branches page and referenced by the
// franchise/royalty performance views. Each franchise has its own _id so the
// expand/inspect interactions on EnterpriseAgencies still work.
const mkId = (idx) => `demo-franchise-${String(idx).padStart(2, '0')}`;

const franchiseSeed = [
    // United States — 5 franchises
    { name: 'Hearthstone Beverly Hills',  country: 'United States',        location: 'Beverly Hills, CA',  address: '9350 Wilshire Blvd, Beverly Hills, CA 90210', branches: 4, agents: 18, listings: 482, revenue: 1840000 },
    { name: 'Hearthstone Manhattan',      country: 'United States',        location: 'New York, NY',       address: '432 Park Avenue, New York, NY 10022',         branches: 3, agents: 14, listings: 394, revenue: 1240000 },
    { name: 'Hearthstone Miami Beach',    country: 'United States',        location: 'Miami Beach, FL',    address: '1111 Lincoln Road, Miami Beach, FL 33139',    branches: 2, agents: 11, listings: 318, revenue:  880000 },
    { name: 'Hearthstone Hamptons',       country: 'United States',        location: 'East Hampton, NY',   address: '12 Main Street, East Hampton, NY 11937',      branches: 2, agents: 10, listings: 396, revenue:  540000 },
    { name: 'Hearthstone Aspen',          country: 'United States',        location: 'Aspen, CO',          address: '625 East Main Street, Aspen, CO 81611',       branches: 1, agents:  9, listings: 257, revenue:  320000 },

    // United Kingdom — 4
    { name: 'Hearthstone Mayfair',        country: 'United Kingdom',       location: 'Mayfair, London',    address: '14 Berkeley Square, Mayfair, London W1J 6BS', branches: 3, agents: 16, listings: 412, revenue: 1480000 },
    { name: 'Hearthstone Chelsea',        country: 'United Kingdom',       location: 'Chelsea, London',    address: '220 Kings Road, Chelsea, London SW3 5UE',     branches: 2, agents: 14, listings: 318, revenue:  980000 },
    { name: 'Hearthstone Edinburgh',      country: 'United Kingdom',       location: 'Edinburgh',          address: '84 George Street, Edinburgh EH2 3BU',         branches: 2, agents:  9, listings: 224, revenue:  420000 },
    { name: 'Hearthstone Cotswolds',      country: 'United Kingdom',       location: 'Bourton-on-the-Water', address: 'High Street, Bourton-on-the-Water, GL54 2AN', branches: 1, agents: 9, listings: 170, revenue: 260000 },

    // Australia — 4
    { name: 'Hearthstone Sydney Harbour', country: 'Australia',            location: 'Sydney, NSW',        address: 'Level 8, 1 Macquarie Place, Sydney NSW 2000', branches: 3, agents: 14, listings: 342, revenue: 1180000 },
    { name: 'Hearthstone Melbourne',      country: 'Australia',            location: 'Melbourne, VIC',     address: '101 Collins Street, Melbourne VIC 3000',      branches: 2, agents: 12, listings: 284, revenue:  840000 },
    { name: 'Hearthstone Gold Coast',     country: 'Australia',            location: 'Gold Coast, QLD',    address: '3134 Surfers Paradise Blvd, Gold Coast QLD 4217', branches: 2, agents: 10, listings: 214, revenue: 460000 },
    { name: 'Hearthstone Perth',          country: 'Australia',            location: 'Perth, WA',          address: '267 St Georges Terrace, Perth WA 6000',       branches: 1, agents:  8, listings: 144, revenue:  200000 },

    // United Arab Emirates — 3
    { name: 'Hearthstone Dubai Marina',   country: 'United Arab Emirates', location: 'Dubai Marina',       address: 'Marina Walk, Dubai Marina, Dubai',            branches: 3, agents: 16, listings: 387, revenue:  980000 },
    { name: 'Hearthstone Downtown Dubai', country: 'United Arab Emirates', location: 'Downtown Dubai',     address: 'Emaar Square, Downtown Dubai',                branches: 2, agents: 12, listings: 261, revenue:  840000 },
    { name: 'Hearthstone Abu Dhabi',      country: 'United Arab Emirates', location: 'Abu Dhabi',          address: 'Corniche Road, Abu Dhabi',                    branches: 2, agents: 10, listings: 194, revenue:  470000 },

    // South Africa — 4
    { name: 'Hearthstone Cape Town',      country: 'South Africa',         location: 'Cape Town',          address: '28 Bree Street, Cape Town City Bowl, 8001',   branches: 4, agents: 18, listings: 312, revenue:  840000 },
    { name: 'Hearthstone Johannesburg',   country: 'South Africa',         location: 'Sandton',            address: '10 Sandton Drive, Sandton, 2196',             branches: 3, agents: 14, listings: 248, revenue:  620000 },
    { name: 'Hearthstone Pretoria',       country: 'South Africa',         location: 'Pretoria',           address: 'Church Street, Arcadia, Pretoria, 0083',      branches: 2, agents:  8, listings: 168, revenue:  260000 },
    { name: 'Hearthstone Stellenbosch',   country: 'South Africa',         location: 'Stellenbosch',       address: 'Dorp Street, Stellenbosch, 7600',             branches: 1, agents:  6, listings: 118, revenue:  120000 },

    // Japan — 3
    { name: 'Hearthstone Minato-ku',      country: 'Japan',                location: 'Tokyo',              address: '2-4-1 Azabudai, Minato-ku, Tokyo 106-0041',   branches: 2, agents: 12, listings: 214, revenue:  548000 },
    { name: 'Hearthstone Shibuya',        country: 'Japan',                location: 'Tokyo',              address: '1-2-3 Dōgenzaka, Shibuya-ku, Tokyo 150-0043', branches: 2, agents: 10, listings: 178, revenue:  384000 },
    { name: 'Hearthstone Niseko',         country: 'Japan',                location: 'Hokkaido',           address: 'Aza Yamada 204, Kutchan, Hokkaido 044-0081',  branches: 1, agents:  6, listings: 100, revenue:  188000 },

    // Netherlands — 2
    { name: 'Hearthstone Amsterdam',      country: 'Netherlands',          location: 'Amsterdam',          address: 'Keizersgracht 452, 1016 GE Amsterdam',        branches: 3, agents: 12, listings: 184, revenue:  490000 },
    { name: 'Hearthstone Rotterdam',      country: 'Netherlands',          location: 'Rotterdam',          address: 'Wilhelminakade 123, 3072 AP Rotterdam',       branches: 1, agents:  6, listings: 100, revenue:  220000 },

    // Spain — 3
    { name: 'Hearthstone Marbella',       country: 'Spain',                location: 'Marbella',           address: 'Blvd Príncipe Alfonso von Hohenlohe, 29602 Marbella', branches: 2, agents: 9, listings: 194, revenue: 312000 },
    { name: 'Hearthstone Barcelona',      country: 'Spain',                location: 'Barcelona',          address: 'Passeig de Gràcia 92, 08008 Barcelona',       branches: 2, agents:  8, listings: 148, revenue:  218000 },
    { name: 'Hearthstone Ibiza',          country: 'Spain',                location: 'Ibiza Town',         address: "Carrer d'Aragó 48, 07800 Ibiza Town",         branches: 1, agents:  5, listings:  76, revenue:   94000 },

    // Italy — 3
    { name: 'Hearthstone Lake Como',      country: 'Italy',                location: 'Como',               address: 'Via Plinio 4, 22100 Como CO',                 branches: 2, agents:  8, listings: 142, revenue:  268000 },
    { name: 'Hearthstone Tuscany',        country: 'Italy',                location: 'Florence',           address: 'Via dei Serragli 12, 50124 Florence FI',      branches: 2, agents:  6, listings: 108, revenue:  184000 },
    { name: 'Hearthstone Rome',           country: 'Italy',                location: 'Rome',               address: 'Via Condotti 88, 00187 Roma RM',              branches: 1, agents:  4, listings:  72, revenue:   96000 },

    // New Zealand — 2
    { name: 'Hearthstone Auckland',       country: 'New Zealand',          location: 'Auckland',           address: '88 Shortland Street, Auckland CBD 1010',      branches: 2, agents: 10, listings: 158, revenue:  248000 },
    { name: 'Hearthstone Queenstown',     country: 'New Zealand',          location: 'Queenstown',         address: '14 Shotover Street, Queenstown 9300',         branches: 1, agents:  6, listings:  89, revenue:  134000 },

    // Malta — 1
    { name: 'Hearthstone Valletta',       country: 'Malta',                location: 'Valletta',           address: "St George's Square, Valletta VLT 1190, Malta", branches: 2, agents: 8, listings: 148, revenue: 246000 },
];

const ROYALTY_DEFAULTS = { branchToFranchise: 3, franchiseToCountry: 5, countryToHq: 1.5 };

const buildRoyalties = (revenue, rates = ROYALTY_DEFAULTS) => ({
    branchToFranchise: Math.round(revenue * (rates.branchToFranchise / 100)),
    franchiseToCountry: Math.round(revenue * (rates.franchiseToCountry / 100)),
    countryToHq: Math.round(revenue * (rates.countryToHq / 100)),
    total: Math.round(revenue * ((rates.branchToFranchise + rates.franchiseToCountry + rates.countryToHq) / 100)),
});

export const performanceByFranchise = franchiseSeed.map((f, i) => ({
    _id: mkId(i + 1),
    name: f.name,
    location: f.location,
    address: f.address,
    country: f.country,
    branches: f.branches,
    agents: f.agents,
    listings: f.listings,
    listingCount: f.listings,
    agentCount: f.agents,
    branchCount: f.branches,
    revenue: f.revenue,
    royaltyRates: ROYALTY_DEFAULTS,
    royalties: buildRoyalties(f.revenue),
}));

// ---- 4. Branch performance — Beverly Hills focus (Section 4 + 5) -------------
// Branches for the default-demo franchise (Hearthstone Beverly Hills) plus a
// representative branch per franchise so the Franchise tab leaderboard has real
// rows. The Beverly Hills branches come straight from the brief and are placed
// first so they dominate the demo view.
export const performanceByBranch = [
    { branch: 'Beverly Hills Central', franchise: 'Hearthstone Beverly Hills', country: 'United States', agents: 6, listings: 228, revenue: 840000 },
    { branch: 'Bel Air',               franchise: 'Hearthstone Beverly Hills', country: 'United States', agents: 5, listings: 124, revenue: 620000 },
    { branch: 'Holmby Hills',          franchise: 'Hearthstone Beverly Hills', country: 'United States', agents: 4, listings:  82, revenue: 280000 },
    { branch: 'Sunset Strip',          franchise: 'Hearthstone Beverly Hills', country: 'United States', agents: 3, listings:  48, revenue: 100000 },

    { branch: 'Mayfair Berkeley Sq.',  franchise: 'Hearthstone Mayfair',        country: 'United Kingdom', agents: 7, listings: 184, revenue: 740000 },
    { branch: 'Knightsbridge',         franchise: 'Hearthstone Mayfair',        country: 'United Kingdom', agents: 5, listings: 132, revenue: 460000 },
    { branch: 'Belgravia',             franchise: 'Hearthstone Mayfair',        country: 'United Kingdom', agents: 4, listings:  96, revenue: 280000 },

    { branch: 'Sydney CBD',            franchise: 'Hearthstone Sydney Harbour', country: 'Australia',      agents: 6, listings: 142, revenue: 520000 },
    { branch: 'Mosman',                franchise: 'Hearthstone Sydney Harbour', country: 'Australia',      agents: 5, listings: 118, revenue: 380000 },
    { branch: 'Bondi',                 franchise: 'Hearthstone Sydney Harbour', country: 'Australia',      agents: 3, listings:  82, revenue: 280000 },

    { branch: 'Marina Walk',           franchise: 'Hearthstone Dubai Marina',   country: 'United Arab Emirates', agents: 7, listings: 168, revenue: 480000 },
    { branch: 'JBR',                   franchise: 'Hearthstone Dubai Marina',   country: 'United Arab Emirates', agents: 5, listings: 124, revenue: 300000 },
    { branch: 'Palm Jumeirah',         franchise: 'Hearthstone Dubai Marina',   country: 'United Arab Emirates', agents: 4, listings:  95, revenue: 200000 },

    { branch: 'Atlantic Seaboard',     franchise: 'Hearthstone Cape Town',      country: 'South Africa',   agents: 6, listings: 124, revenue: 360000 },
    { branch: 'City Bowl',             franchise: 'Hearthstone Cape Town',      country: 'South Africa',   agents: 5, listings:  98, revenue: 240000 },
    { branch: 'Constantia',            franchise: 'Hearthstone Cape Town',      country: 'South Africa',   agents: 4, listings:  62, revenue: 140000 },
    { branch: 'Camps Bay',             franchise: 'Hearthstone Cape Town',      country: 'South Africa',   agents: 3, listings:  28, revenue: 100000 },

    { branch: 'Minato Azabu',          franchise: 'Hearthstone Minato-ku',      country: 'Japan',          agents: 7, listings: 138, revenue: 348000 },
    { branch: 'Roppongi',              franchise: 'Hearthstone Minato-ku',      country: 'Japan',          agents: 5, listings:  76, revenue: 200000 },
];

// ---- 5. Top agents (Section 1 ranking + Section 5 roster) --------------------
// Network-wide top agents for the Dashboard top-agent list and Royalty engine
// commission rows, plus the Beverly Hills Central agent roster for the Branch tab.
const topNetworkAgents = [
    { name: 'Tyler Weston',     branch: 'Beverly Hills Central', franchise: 'Hearthstone Beverly Hills',   country: 'United States',        listings: 62, propertiesSold: 2, totalSales: 1240000, commissionRate: 70, status: 'active', tier: 'Platinum' },
    { name: 'Sophia Lancaster', branch: 'Mayfair Berkeley Sq.',  franchise: 'Hearthstone Mayfair',          country: 'United Kingdom',       listings: 48, propertiesSold: 2, totalSales:  980000, commissionRate: 70, status: 'active', tier: 'Platinum' },
    { name: 'James Okonkwo',    branch: 'Marina Walk',           franchise: 'Hearthstone Dubai Marina',     country: 'United Arab Emirates', listings: 38, propertiesSold: 2, totalSales:  824000, commissionRate: 68, status: 'active', tier: 'Gold' },
    { name: 'Chloe Ashford',    branch: 'Sydney CBD',            franchise: 'Hearthstone Sydney Harbour',   country: 'Australia',            listings: 41, propertiesSold: 2, totalSales:  712000, commissionRate: 68, status: 'active', tier: 'Gold' },
    { name: 'Kenji Nakamura',   branch: 'Minato Azabu',          franchise: 'Hearthstone Minato-ku',        country: 'Japan',                listings: 28, propertiesSold: 1, totalSales:  634000, commissionRate: 65, status: 'active', tier: 'Gold' },
    { name: 'Sarah Joubert',    branch: 'Atlantic Seaboard',     franchise: 'Hearthstone Cape Town',        country: 'South Africa',         listings: 36, propertiesSold: 1, totalSales:  412000, commissionRate: 65, status: 'active', tier: 'Gold' },
];

const beverlyHillsCentralRoster = [
    { name: 'Tyler Weston',   branch: 'Beverly Hills Central', franchise: 'Hearthstone Beverly Hills', country: 'United States', listings: 62, propertiesSold: 2, totalSales: 480000, commissionRate: 70, status: 'active',   tier: 'Platinum' },
    { name: 'Madison Clarke', branch: 'Beverly Hills Central', franchise: 'Hearthstone Beverly Hills', country: 'United States', listings: 54, propertiesSold: 1, totalSales: 220000, commissionRate: 70, status: 'active',   tier: 'Gold' },
    { name: 'Ryan Goldberg',  branch: 'Beverly Hills Central', franchise: 'Hearthstone Beverly Hills', country: 'United States', listings: 48, propertiesSold: 1, totalSales: 140000, commissionRate: 70, status: 'active',   tier: 'Gold' },
    { name: 'Vanessa Kim',    branch: 'Beverly Hills Central', franchise: 'Hearthstone Beverly Hills', country: 'United States', listings: 36, propertiesSold: 0, totalSales:      0, commissionRate: 70, status: 'active',   tier: 'Silver' },
    { name: 'Jordan Pierce',  branch: 'Beverly Hills Central', franchise: 'Hearthstone Beverly Hills', country: 'United States', listings: 18, propertiesSold: 0, totalSales:      0, commissionRate: 65, status: 'training', tier: 'Silver' },
    { name: 'Brianna Haas',   branch: 'Beverly Hills Central', franchise: 'Hearthstone Beverly Hills', country: 'United States', listings: 10, propertiesSold: 0, totalSales:      0, commissionRate: 65, status: 'training', tier: 'Silver' },
];

export const agentRows = [...topNetworkAgents, ...beverlyHillsCentralRoster];

// ---- 6. Royalty engine (Section 6) -------------------------------------------
export const royaltyDefaults = ROYALTY_DEFAULTS;

export const monthlyRoyalties = [
    { month: 'Nov', year: 2025, royalty:  84000 },
    { month: 'Dec', year: 2025, royalty: 108000 },
    { month: 'Jan', year: 2026, royalty: 142000 },
    { month: 'Feb', year: 2026, royalty: 188000 },
    { month: 'Mar', year: 2026, royalty: 238000 },
    { month: 'Apr', year: 2026, royalty: 276000 },
];

// ---- 7. Compliance (Section 8) -----------------------------------------------
export const complianceData = {
    kpis: [
        { label: 'Critical Issues',           value: '4',    delta: 'Require immediate action', variant: 'danger' },
        { label: 'Smart Vault Reviews [MTD]', value: '124',  delta: '+11 risk flags extracted', variant: 'teal' },
        { label: 'GDPR Compliance',           value: '100%', delta: 'NL + UK + IT + ES + MT',   variant: 'muted' },
        { label: 'Overall Network Score',     value: '91%',  delta: '+4 this month',            variant: 'teal' },
    ],
    criticalIssues: [
        { who: 'James Okonkwo — Dubai Marina', issue: 'RERA licence overdue',           action: 'Resolve' },
        { who: 'Sarah Joubert — Cape Town',    issue: 'Trust account audit pending',    action: 'Remind' },
        { who: 'RE/MAX NL Central',            issue: 'AML doc pack incomplete',        action: 'Submit' },
        { who: 'Hearthstone Joburg North',     issue: '3 FAIS renewals overdue',        action: 'Resolve' },
    ],
    byMarket: [
        { code: 'JP',  label: '🇯🇵 Japan',          pct: 99 },
        { code: 'MT',  label: '🇲🇹 Malta',          pct: 98 },
        { code: 'NL',  label: '🇳🇱 Netherlands',    pct: 97 },
        { code: 'UK',  label: '🇬🇧 United Kingdom', pct: 96 },
        { code: 'NZ',  label: '🇳🇿 New Zealand',    pct: 95 },
        { code: 'AU',  label: '🇦🇺 Australia',      pct: 94 },
        { code: 'ZA',  label: '🇿🇦 South Africa',   pct: 94 },
        { code: 'IT',  label: '🇮🇹 Italy',          pct: 93 },
        { code: 'US',  label: '🇺🇸 United States',  pct: 92 },
        { code: 'ES',  label: '🇪🇸 Spain',          pct: 91 },
        { code: 'AE',  label: '🇦🇪 UAE',            pct: 87 },
    ],
    vaultReviews: [
        { doc: 'Mandate — Atlantic Seaboard',     market: 'ZA', status: 'clear', flags: 0, reviewed: '24 Apr 2026' },
        { doc: 'Buyer KYC — Palm Jumeirah',       market: 'AE', status: 'flag',  flags: 1, reviewed: '23 Apr 2026' },
        { doc: 'Franchise addendum v3',           market: 'NL', status: 'clear', flags: 0, reviewed: '22 Apr 2026' },
        { doc: 'POA — Notarised scan',            market: 'UK', status: 'flag',  flags: 2, reviewed: '21 Apr 2026' },
    ],
    frameworks: [
        { name: 'GDPR (EU)',                  detail: 'NL · IT · ES · MT', tone: 'ok' },
        { name: 'FICA (South Africa)',        detail: 'Active',            tone: 'ok' },
        { name: 'RERA (UAE)',                 detail: 'Active',            tone: 'ok' },
        { name: 'Consumer Credit Act (UK)',   detail: 'Active',            tone: 'ok' },
        { name: 'FIRB (Australia)',           detail: 'Active',            tone: 'ok' },
        { name: 'Real Estate Agents Act (NZ)',detail: 'Active',            tone: 'ok' },
        { name: '宅地建物取引業法 (Japan)',     detail: 'Active',            tone: 'ok' },
        { name: 'NAR / State DRE (USA)',      detail: 'Active',            tone: 'ok' },
    ],
};

// ---- 8. Portal syndication (Section 7) ---------------------------------------
export const portalData = {
    kpis: [
        { label: 'Total Listings Live',     value: '6,847', delta: '+124 new today',     variant: 'teal' },
        { label: 'Pending Sync',            value: '31',    delta: 'Action required',    variant: 'danger' },
        { label: 'Portals Active',          value: '24',    delta: 'Across 11 countries', variant: 'teal' },
        { label: 'IPM Intelligence [MTD]',  value: '2,847', delta: '8 sec/listing',      variant: 'teal' },
    ],
    portals: [
        { portal: 'Zillow / Opendoor',  market: '🇺🇸',     listings: 1847, status: 'live' },
        { portal: 'Rightmove',          market: '🇬🇧',     listings: 1124, status: 'pending' },
        { portal: 'Domain.com.au',      market: '🇦🇺',     listings:  984, status: 'live' },
        { portal: 'Property Finder',    market: '🇦🇪',     listings:  842, status: 'live' },
        { portal: 'Bayut',              market: '🇦🇪',     listings:  842, status: 'syncing' },
        { portal: 'Property24',         market: '🇿🇦',     listings:  846, status: 'live' },
        { portal: 'SUUMO',              market: '🇯🇵',     listings:  492, status: 'live' },
        { portal: 'Funda',              market: '🇳🇱',     listings:  284, status: 'live' },
        { portal: 'Idealista',          market: '🇪🇸 🇮🇹', listings:  740, status: 'live' },
        { portal: 'Trade Me Property',  market: '🇳🇿',     listings:  247, status: 'live' },
        { portal: 'MaltaProperty.com',  market: '🇲🇹',     listings:  148, status: 'live' },
    ],
    pendingActions: [
        { portal: 'Bayut',     detail: 'RERA documents required for 18 UAE listings',           action: 'Resolve',  tone: 'danger' },
        { portal: 'Rightmove', detail: 'Floor plan required for 6 UK listings',                 action: 'Upload',   tone: 'warn' },
        { portal: 'SUUMO',     detail: 'Japanese description template incomplete (4 listings)', action: 'Complete', tone: 'warn' },
    ],
    byMarket: [
        { market: 'United States',  code: 'US', count: 1847 },
        { market: 'United Kingdom', code: 'UK', count: 1124 },
        { market: 'Australia',      code: 'AU', count:  984 },
        { market: 'South Africa',   code: 'ZA', count:  846 },
        { market: 'UAE',            code: 'AE', count:  842 },
        { market: 'Japan',          code: 'JP', count:  492 },
        { market: 'Spain',          code: 'ES', count:  418 },
        { market: 'Italy',          code: 'IT', count:  322 },
        { market: 'Netherlands',    code: 'NL', count:  284 },
        { market: 'New Zealand',    code: 'NZ', count:  247 },
        { market: 'Malta',          code: 'MT', count:  148 },
    ],
    aiFeatures: [
        { label: 'AI copy generation',           badge: 'Active', kind: 'status' },
        { label: 'Virtual staging ready',        badge: null,     kind: 'action', actionLabel: 'Stage All' },
        { label: 'IPM Score™ attached',          badge: 'Live',   kind: 'status' },
        { label: 'Multi-language auto-translate',badge: 'Active', kind: 'status' },
    ],
};

// ---- 9. Marketing (Section 9) ------------------------------------------------
export const marketingData = {
    kpis: [
        { label: 'Reach',           value: '487K',  delta: 'This month',       variant: 'teal' },
        { label: 'Engagement rate', value: '5.4%',  delta: 'Above benchmark',  variant: 'teal' },
        { label: 'Link clicks',     value: '12,840',delta: 'To listings',      variant: 'teal' },
        { label: 'Lead inquiries',  value: '342',   delta: 'From social',      variant: 'teal' },
    ],
    accounts: [
        { platform: 'instagram', username: '@hearthstoneafrica',     followers: 42800, postsMtd: 28, status: 'connected' },
        { platform: 'facebook',  username: 'Hearthstone Africa',     followers: 88400, postsMtd: 22, status: 'connected' },
        { platform: 'linkedin',  username: 'Hearthstone Africa',     followers: 18200, postsMtd: 16, status: 'connected' },
        { platform: 'youtube',   username: '@hearthstone.property',  followers:  9400, postsMtd:  6, status: 'connected' },
    ],
    calendarLabel: 'Week of Apr 27',
    calendar: [
        { day: 'Mon', date: '27', slots: [{ label: 'IG · BH listing',  bg: '#FCE7F3', fg: '#9D174D' }] },
        { day: 'Tue', date: '28', slots: [{ label: 'LinkedIn · UK',    bg: '#DBEAFE', fg: '#1E3A8A' }] },
        { day: 'Wed', date: '29', slots: [{ label: 'IG · Dubai tour',  bg: '#FEF3C7', fg: '#92400E' }] },
        { day: 'Thu', date: '30', slots: [{ label: 'FB+LI · Sydney',   bg: '#DBEAFE', fg: '#1E3A8A' }] },
        { day: 'Fri', date:  '1', slots: [{ label: 'IG · Tuscany',     bg: '#E0E7FF', fg: '#3730A3' }] },
        { day: 'Sat', date:  '2', slots: [{ label: 'IG · Cape Town',   bg: '#D1FAE5', fg: '#065F46' }] },
        { day: 'Sun', date:  '3', slots: [] },
    ],
    contentCalendar: [
        { day: 'Mon 27', post: 'Beverly Hills new listing — panoramic city views from $4.8M', market: '🇺🇸', platform: 'Instagram + FB', status: 'Scheduled', tone: 'ok' },
        { day: 'Tue 28', post: 'London prime market report Q1 2026 — download now',          market: '🇬🇧', platform: 'LinkedIn',       status: 'Scheduled', tone: 'ok' },
        { day: 'Wed 29', post: 'Dubai Marina penthouse — virtual tour now live',             market: '🇦🇪', platform: 'Instagram',      status: 'Draft',     tone: 'warn' },
        { day: 'Thu 30', post: 'Sydney Harbour: 3 sold this week at record prices',          market: '🇦🇺', platform: 'FB + LinkedIn',  status: 'Draft',     tone: 'warn' },
        { day: 'Fri 1',  post: 'Tuscany countryside estate — new to market',                 market: '🇮🇹', platform: 'Instagram + FB', status: 'Planned',   tone: 'info' },
        { day: 'Sat 2',  post: 'Weekend open houses: Cape Town Atlantic Seaboard',           market: '🇿🇦', platform: 'Instagram + FB', status: 'Planned',   tone: 'info' },
    ],
    recentPosts: [
        { title: 'Beverly Hills modernist masterpiece tour', meta: 'Instagram · 2 days ago',  reach: '42.8K', engagement: '6.4%', clicks: '1,820' },
        { title: 'Mayfair penthouse — open house Saturday',  meta: 'Facebook · 3 days ago',   reach: '88.4K', engagement: '4.9%', clicks: '2,340' },
        { title: 'Dubai Marina sunrise — drone footage',     meta: 'Instagram · 4 days ago',  reach: '36.1K', engagement: '7.1%', clicks: '1,540' },
        { title: 'London Q1 prime market report',            meta: 'LinkedIn · 5 days ago',   reach: '18.2K', engagement: '5.8%', clicks:   '980' },
    ],
};

// ---- 10. Aura insights banners (Section 10) ----------------------------------
export const auraBanners = {
    dashboard:  'Hearthstone Beverly Hills is converting at 2.8× the network average. 3 underperforming branches have open lead queues — Aura can auto-assign today.',
    franchises: '7 franchise invites are pending acceptance. Aura predicts 4 will convert this week based on email open patterns — send a follow-up nudge?',
    country:    'Japan leads the network on compliance at 99%. UAE is 4 points below target — 18 RERA documents are the root cause. Resolve now to unlock portal sync.',
    franchise:  'Beverly Hills Central has 228 active listings but only 4 agent follow-ups logged this week. Aura can auto-trigger WhatsApp reminders to buyers in pipeline.',
    branch:     'Jordan Pierce and Brianna Haas have 28 listings between them with zero logged client touchpoints in 7 days. Nudge sent — approve to deliver?',
    royalty:    'Royalty revenue has grown 229% since November. At current trajectory, the network will exceed $400K/month by August 2026.',
    portal:     '18 Bayut listings are at risk of unpublish within 48 hours — RERA documents missing. Aura has drafted the resolution checklist. Resolve now?',
    compliance: '4 critical issues require attention. Aura has pre-drafted reminder messages for each agent and prepared a compliance pack for Joburg North. Approve to send?',
    marketing:  'Instagram reach is up 61% this month. Your Beverly Hills and Dubai listings drove 84% of link clicks — Aura recommends boosting 3 posts for $400 combined.',
};

// ---- 11. Network alerts (Section 1) ------------------------------------------
export const networkAlerts = [
    { tone: 'urgent', label: 'Urgent', text: 'RERA documents overdue on 18 Dubai listings — unpublish risk within 48h' },
    { tone: 'action', label: 'Action', text: 'Rightmove floor plans required for 6 UK listings — compliance flagged' },
    { tone: 'action', label: 'Action', text: '3 FAIS licence renewals overdue — Johannesburg North agents' },
];

// ---- 12. Pending franchise invites (Section 2) -------------------------------
export const pendingInvites = [
    { _id: 'demo-invite-1', agencyName: 'Hearthstone Lagos',    agencyEmail: 'corne@hearthstone-lagos.com',     type: 'franchise', sent: '2026-04-22' },
    { _id: 'demo-invite-2', agencyName: 'Hearthstone Singapore',agencyEmail: 'admin@hearthstone-sg.com',        type: 'franchise', sent: '2026-04-21' },
    { _id: 'demo-invite-3', agencyName: 'Hearthstone Toronto',  agencyEmail: 'partners@hearthstone-toronto.ca', type: 'franchise', sent: '2026-04-20' },
    { _id: 'demo-invite-4', agencyName: 'Hearthstone Mumbai',   agencyEmail: 'rajiv@hearthstone-mumbai.in',     type: 'franchise', sent: '2026-04-19' },
    { _id: 'demo-invite-5', agencyName: 'Hearthstone Geneva',   agencyEmail: 'pierre@hearthstone-geneva.ch',    type: 'franchise', sent: '2026-04-18' },
    { _id: 'demo-invite-6', agencyName: 'Hearthstone Berlin',   agencyEmail: 'connect@hearthstone-berlin.de',   type: 'franchise', sent: '2026-04-16' },
    { _id: 'demo-invite-7', agencyName: 'Hearthstone Lisbon',   agencyEmail: 'invest@hearthstone-lisbon.pt',    type: 'franchise', sent: '2026-04-15' },
];

// ---- Default export: bundle that mirrors /api/enterprise/dashboard -----------
const enterpriseDemoData = {
    summary,
    performanceByCountry,
    performanceByFranchise,
    performanceByBranch,
    agentRows,
    royaltyDefaults,
    monthlyRoyalties,
    auraBanners,
    networkAlerts,
    compliance: complianceData,
    portal: portalData,
    marketing: marketingData,
    pendingInvites,
};

export default enterpriseDemoData;

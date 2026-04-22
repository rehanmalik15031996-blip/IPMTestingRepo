/**
 * Seed MongoDB Atlas with all application data
 * This script seeds all collections with data from the codebase
 * 
 * Usage: node seed-atlas.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Import all models
const User = require('./models/User');
const Property = require('./models/Property');
const Development = require('./models/Development');
const News = require('./models/News');
const MarketTrend = require('./models/MarketTrend');

// MongoDB Atlas connection string
const ATLAS_URI = 'mongodb+srv://rehanmalil99_db_user:NkIDioBDT8KOp3kf@cluster0.hzx1n3x.mongodb.net/ipm_db?retryWrites=true&w=majority&appName=Cluster0';

// News data from seedNews.js
const newsData = [
    {
        title: "Buying or Selling? Why Timing Alone Is No Longer the Deciding Factor",
        category: "Buying Property",
        author: "Sarah Jenkins",
        date: "6 February 2026",
        image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
        desc: "In today's market, informed decisions outperform perfectly timed ones and technology is changing how confidence is built...",
        content: `The age-old adage of "location, location, location" is being joined by a new mantra: "data, data, data." For decades, buyers and sellers obsessed over market cycles, trying to time their entry or exit perfectly.

        However, recent analysis suggests that waiting for the "perfect time" often results in missed opportunities. Real estate is becoming less about timing the market and more about time *in* the market, provided the asset is high-quality.
        
        This article explores why fundamental asset value, driven by AI-vetted metrics, is a safer bet than speculation on interest rate fluctuations. We look at case studies from London and Dubai where premium properties outperformed the broader market despite economic headwinds.`,
        tags: ["Strategy", "Market Timing", "Advice"],
        readTime: "12 Min read",
        isFeatured: true,
        views: 1205,
        sourceUrl: "https://www.reuters.com/markets/real-estate/"
    },
    {
        title: "From Listings to Intelligence: How AI Is Quietly Reshaping Property",
        category: "Market Intelligence",
        author: "David Chen",
        date: "13 February 2026",
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1172&q=80",
        desc: "Property platforms are no longer just digital noticeboards, they are becoming intelligent systems that guide better decisions...",
        content: `Artificial Intelligence is doing more than just writing descriptions. It's predicting neighborhood gentrification before it happens. By analyzing millions of data points—from permit applications to coffee shop openings—AI models can now forecast property appreciation with startling accuracy.
        
        In this deep dive, we look at how IPM's proprietary algorithms are identifying undervalued assets in emerging markets. We also discuss the ethical implications of algorithmic redlining and how modern platforms are working to democratize access to high-yield investments.`,
        tags: ["AI", "Tech", "Future Trends"],
        readTime: "5 Min read",
        isFeatured: true,
        views: 940,
        sourceUrl: "https://www.ft.com/property"
    },
    {
        title: "The Market Is Moving. Here's What the Data Is Really Saying",
        category: "Property Trends",
        author: "Amanda Ross",
        date: "20 February 2026",
        image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
        desc: "Property headlines create noise. Data reveals direction and right now, the signals are clearer than they appear...",
        content: `Headlines scream about crashes and booms, but the underlying data tells a story of stabilization and specific sector growth. While commercial office space faces challenges, luxury residential and green-certified buildings are seeing record demand.
        
        We analyze the divergence between Tier 1 and Tier 2 cities and why the "exodus to the suburbs" might be reversing in 2026. This report includes exclusive charts on price-per-square-foot trends in New York, London, and Singapore.`,
        tags: ["Data Analysis", "Global Markets", "Trends"],
        readTime: "6 Min read",
        isFeatured: true,
        views: 850,
        sourceUrl: "https://www.bloomberg.com/news/real-estate"
    },
    {
        title: "Sustainable Luxury: Why ESG Is the New Gold Standard",
        category: "Investment Insights",
        author: "Michael Thorne",
        date: "25 February 2026",
        image: "https://images.unsplash.com/photo-1518780664697-55e3ad937233?ixlib=rb-4.0.3&auto=format&fit=crop&w=1065&q=80",
        desc: "Investors are no longer just looking for returns; they are looking for resilience. Green buildings are proving to hold value better...",
        content: `Environmental, Social, and Governance (ESG) criteria are moving from "nice-to-have" to "must-have." Institutional investors are rapidly offloading non-compliant assets, creating a premium for LEED-certified and carbon-neutral properties.
        
        This article breaks down the 'Green Premium' and how much extra value sustainability features actually add to a property's resale price.`,
        tags: ["ESG", "Sustainability", "Green Tech"],
        readTime: "8 Min read",
        isFeatured: false,
        views: 430,
        sourceUrl: "https://www.property24.com/advice/sustainability"
    },
    {
        title: "IPM Expands to South Africa: A New Frontier for Investors",
        category: "Company News",
        author: "IPM Team",
        date: "1 March 2026",
        image: "https://images.unsplash.com/photo-1577948000111-9c970735c6e7?ixlib=rb-4.0.3&auto=format&fit=crop&w=1065&q=80",
        desc: "We are proud to announce our official launch in Cape Town, bringing AI-vetted opportunities to a vibrant emerging market...",
        content: `International Property Management (IPM) is thrilled to open our newest regional HQ in Cape Town. South Africa represents a unique blend of high yield potential and luxury lifestyle appeal.
        
        Our new office will focus on the Western Cape's booming luxury rental market and vineyard estates. Read about our launch event and the initial portfolio offerings available exclusively to IPM members.`,
        tags: ["Expansion", "Company News", "South Africa"],
        readTime: "3 Min read",
        isFeatured: false,
        views: 1200,
        sourceUrl: "https://www.bbc.com/news/business"
    },
    {
        title: "5 Renovations That Actually Increase Property Value",
        category: "Property Tips",
        author: "Elena Vasquez",
        date: "5 March 2026",
        image: "https://images.unsplash.com/photo-1584622050111-993a426fbf0a?ixlib=rb-4.0.3&auto=format&fit=crop&w=1170&q=80",
        desc: "Not all upgrades are created equal. Avoid the money pits and focus on these five high-ROI improvements...",
        content: `Thinking of renovating before you sell? Be careful. Swimming pools and high-end electronics often recover less than 50% of their cost.
        
        Instead, focus on: 1. Kitchen modernization, 2. Bathroom refreshes, 3. Curb appeal (landscaping), 4. Energy-efficient windows, and 5. Smart home security integration. We breakdown the average cost vs. value added for each.`,
        tags: ["Renovation", "ROI", "Tips"],
        readTime: "4 Min read",
        isFeatured: false,
        views: 670,
        sourceUrl: "https://www.property24.com/advice"
    }
];

// Market Trends data (monthly actuals loaded from server/data/marketTrendsMonthly.json)
const { loadMarketTrendsMonthly } = require('./data/loadMarketTrendsMonthly');
const monthlyActuals = loadMarketTrendsMonthly();
const marketTrendsData = [
    { country: "South Africa", status: "Good", color: "#2ecc71", priceChange: "+3.2%" },
    { country: "Dubai", status: "Excellent", color: "#00c2cb", priceChange: "+7.8%" },
    { country: "London", status: "Stable", color: "#f1c40f", priceChange: "+1.2%" },
    { country: "Netherlands", status: "Caution", color: "#e74c3c", priceChange: "-0.8%" }
].map((t) => {
    const raw = monthlyActuals[t.country];
    const monthlyData = Array.isArray(raw) ? raw : (raw?.monthlyData || []);
    return { ...t, monthlyData };
  });

// Developments data
const developmentsData = [
    {
        title: "Seaport District",
        subtitle: "Luxury Waterfront Residences",
        location: "Boston, USA",
        completion: "Q2 2027",
        priceStart: "$1.25M",
        yieldRange: "up to 5.6%",
        imageUrl: "https://images.unsplash.com/photo-1580587771525-78b9dba3b91d?ixlib=rb-4.0.3",
        description: "Experience the pinnacle of waterfront living in the Seaport District. These residences offer panoramic harbor views, state-of-the-art amenities, and direct access to Boston's most vibrant dining and cultural scene."
    },
    {
        title: "Back Bay",
        subtitle: "Boutique Brownstone Conversion",
        location: "Boston, USA",
        completion: "Q2 2028",
        priceStart: "$980k",
        yieldRange: "4.4% - 4.9%",
        imageUrl: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3",
        description: "A rare opportunity to own a piece of history. This boutique brownstone conversion blends historic charm with modern luxury, located on a quiet tree-lined street steps away from Newbury Street shopping."
    },
    {
        title: "Cambridge",
        subtitle: "Smart Living near Innovation Hubs",
        location: "Cambridge, USA",
        completion: "Q1 2029",
        priceStart: "$1.05M",
        yieldRange: "4.9% - 5.3%",
        imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3",
        description: "Designed for the future, these smart homes are located in the heart of the innovation district. Features include automated climate control, energy-efficient systems, and proximity to top universities and biotech hubs."
    },
    {
        title: "Los Angeles",
        subtitle: "Downtown Skyline Lofts",
        location: "Los Angeles, USA",
        completion: "Q1 2030",
        priceStart: "$850k",
        yieldRange: "5.0% - 6.1%",
        imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3",
        description: "Rise above the city in these iconic skyline lofts. Featuring floor-to-ceiling windows, rooftop infinity pools, and exclusive resident lounges."
    }
];

async function seedDatabase() {
    try {
        console.log('🚀 Starting MongoDB Atlas Seeding...\n');
        console.log('Connecting to:', ATLAS_URI.replace(/:[^:@]+@/, ':****@'));
        
        // Connect to MongoDB Atlas
        await mongoose.connect(ATLAS_URI);
        console.log('✅ Connected to MongoDB Atlas\n');
        
        // 1. Seed Market Trends
        console.log('📊 Seeding Market Trends...');
        await MarketTrend.deleteMany({});
        await MarketTrend.insertMany(marketTrendsData);
        console.log(`   ✅ Seeded ${marketTrendsData.length} market trends\n`);
        
        // 2. Seed News
        console.log('📰 Seeding News Articles...');
        await News.deleteMany({});
        await News.insertMany(newsData);
        console.log(`   ✅ Seeded ${newsData.length} news articles\n`);
        
        // 3. Seed Developments
        console.log('🏗️  Seeding New Developments...');
        await Development.deleteMany({});
        await Development.insertMany(developmentsData);
        console.log(`   ✅ Seeded ${developmentsData.length} developments\n`);
        
        // 4. Create a sample admin user (optional)
        console.log('👤 Creating sample users...');
        const existingAdmin = await User.findOne({ email: 'admin@ipm.com' });
        if (!existingAdmin) {
            const adminUser = new User({
                name: 'Admin User',
                email: 'admin@ipm.com',
                password: 'admin123', // Change this in production!
                role: 'agency',
                agencyStats: {
                    totalRevenue: 5400000,
                    propertiesSold: 124,
                    activeAgents: 18,
                    totalListings: 85,
                    activeLeads: 421,
                    topAgents: [
                        { name: "Jessica Thomas", sales: 15, revenue: 920000 },
                        { name: "Siphiwe Mzumubi", sales: 12, revenue: 710000 },
                        { name: "Zara Aziz", sales: 10, revenue: 630000 }
                    ],
                    pipelineColumns: [
                        { id: 'new', title: 'New Leads', total: '24.7M', count: 30 },
                        { id: 'qualified', title: 'Qualified Leads', total: '29.2M', count: 25 },
                        { id: 'viewings', title: 'Viewings', total: '24.3M', count: 20 },
                        { id: 'offer', title: 'Under Offer', total: '11.9M', count: 10 }
                    ],
                    pipelineDeals: [
                        { name: 'Robert Anderson', role: 'Investor', type: 'Industrial', property: 'Kensington Gardens London', price: '362K', days: '3d', status: 'new' },
                        { name: 'Sofia Santos', role: 'Investor', type: 'Residential', property: 'Kensington Gardens London', price: '353K', days: '1d', status: 'new' },
                        { name: 'Benjamin Wilson', role: 'Seller', type: 'Residential', property: 'Malibu Beachfront Home', price: '410K', days: '3d', status: 'new' }
                    ],
                    crmLeads: [
                        { name: 'James Carter', type: 'Buyer', budget: '$1.2M', status: 'New', lastContact: '2 hrs ago', email: 'james@gmail.com' },
                        { name: 'Sofia M.', type: 'Investor', budget: '$5.0M', status: 'Negotiating', lastContact: '1 day ago', email: 'sofia.invest@outlook.com' }
                    ]
                }
            });
            await adminUser.save();
            console.log('   ✅ Created admin user (admin@ipm.com / admin123)\n');
        } else {
            console.log('   ⏭️  Admin user already exists\n');
        }
        
        // 5. Create a sample investor user
        const existingInvestor = await User.findOne({ email: 'investor@ipm.com' });
        if (!existingInvestor) {
            const investorUser = new User({
                name: 'Sample Investor',
                email: 'investor@ipm.com',
                password: 'investor123', // Change this in production!
                role: 'investor',
                portfolio: [
                    { propertyTitle: "Marina Torch Tower", location: "Dubai Marina", investedAmount: 150000, currentValue: 165000, roi: 10.0, status: 'Active' },
                    { propertyTitle: "Hyde Park Penthouse", location: "London", investedAmount: 250000, currentValue: 262000, roi: 4.8, status: 'Active' }
                ]
            });
            await investorUser.save();
            console.log('   ✅ Created investor user (investor@ipm.com / investor123)\n');
        } else {
            console.log('   ⏭️  Investor user already exists\n');
        }
        
        // 6. Create a sample agent user
        const existingAgent = await User.findOne({ email: 'agent@ipm.com' });
        if (!existingAgent) {
            const agentUser = new User({
                name: 'Sample Agent',
                email: 'agent@ipm.com',
                password: 'agent123', // Change this in production!
                role: 'agent',
                agentStats: {
                    myCommission: 145000,
                    activeListings: 27,
                    pendingDeals: 5,
                    meetingsScheduled: 8,
                    recentLeads: [
                        { name: "Roger Smith", status: "Hot", property: "Palm Villa", date: "2 hrs ago" },
                        { name: "Patrick Ross", status: "Warm", property: "Downtown Loft", date: "4 days ago" },
                        { name: "Claire Adams", status: "New", property: "Harbour View", date: "2 days ago" }
                    ],
                    pipelineColumns: [
                        { id: 'new', title: 'New Leads', total: '24.7M', count: 30 },
                        { id: 'qualified', title: 'Qualified Leads', total: '29.2M', count: 25 },
                        { id: 'viewings', title: 'Viewings', total: '24.3M', count: 20 },
                        { id: 'offer', title: 'Under Offer', total: '11.9M', count: 10 }
                    ],
                    pipelineDeals: [
                        { name: 'Robert Anderson', role: 'Investor', type: 'Industrial', property: 'Kensington Gardens London', price: '362K', days: '3d', status: 'new' },
                        { name: 'Sofia Santos', role: 'Investor', type: 'Residential', property: 'Kensington Gardens London', price: '353K', days: '1d', status: 'new' },
                        { name: 'Benjamin Wilson', role: 'Seller', type: 'Residential', property: 'Malibu Beachfront Home', price: '410K', days: '3d', status: 'new' },
                        { name: 'Lucas Davis', role: 'Seller', type: 'Commercial', property: 'Seattle Waterfront Property', price: '1,898K', days: '14d', status: 'qualified' },
                        { name: 'Grace Kowalski', role: 'Buyer', type: 'Mixed-use', property: 'Venice Grand Canal Palazzo', price: '485K', days: '10d', status: 'qualified' }
                    ],
                    crmLeads: [
                        { name: 'James Carter', type: 'Buyer', budget: '$1.2M', status: 'New', lastContact: '2 hrs ago', email: 'james@gmail.com' },
                        { name: 'Sofia M.', type: 'Investor', budget: '$5.0M', status: 'Negotiating', lastContact: '1 day ago', email: 'sofia.invest@outlook.com' },
                        { name: 'Robert Fox', type: 'Seller', budget: 'N/A', status: 'Closed', lastContact: '1 week ago', email: 'rob.fox@yahoo.com' },
                        { name: 'Alice Young', type: 'Buyer', budget: '$600k', status: 'Follow Up', lastContact: '3 days ago', email: 'alice.y@gmail.com' }
                    ]
                }
            });
            await agentUser.save();
            console.log('   ✅ Created agent user (agent@ipm.com / agent123)\n');
        } else {
            console.log('   ⏭️  Agent user already exists\n');
        }
        
        console.log('✅ Database seeding completed successfully!\n');
        console.log('📊 Summary:');
        console.log(`   - ${marketTrendsData.length} Market Trends`);
        console.log(`   - ${newsData.length} News Articles`);
        console.log(`   - ${developmentsData.length} Developments`);
        console.log('   - Sample users created\n');
        console.log('🔐 Default Login Credentials:');
        console.log('   Admin (Agency): admin@ipm.com / admin123');
        console.log('   Investor: investor@ipm.com / investor123');
        console.log('   Agent: agent@ipm.com / agent123\n');
        console.log('⚠️  Remember to change passwords in production!');
        
    } catch (err) {
        console.error('❌ Seeding failed:', err);
        process.exit(1);
    } finally {
        await mongoose.connection.close();
        console.log('\n🔌 Connection closed');
        process.exit(0);
    }
}

// Run seeding
seedDatabase();


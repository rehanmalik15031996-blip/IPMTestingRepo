// Auto-seed function - seeds database if it's empty
const connectDB = require('./mongodb');
const User = require('../../server/models/User');
const Property = require('../../server/models/Property');
const News = require('../../server/models/News');
const Development = require('../../server/models/Development');
const MarketTrend = require('../../server/models/MarketTrend');
const bcrypt = require('bcryptjs');

const { loadMarketTrendsMonthly } = require('../../server/data/loadMarketTrendsMonthly');
let monthlyActualsByCountry = {};
try {
  monthlyActualsByCountry = loadMarketTrendsMonthly();
} catch (_) {}

let hasSeeded = false; // Prevent multiple seeds in same execution

async function autoSeedIfEmpty() {
  // Prevent multiple simultaneous seed attempts
  if (hasSeeded) {
    return { alreadySeeded: true };
  }

  try {
    await connectDB();
    
    // Check if database already has data
    const propertyCount = await Property.countDocuments();
    const newsCount = await News.countDocuments();
    
    // If we already have data, skip seeding
    if (propertyCount > 0 && newsCount > 0) {
      console.log('✅ Database already has data, skipping auto-seed');
      return { alreadySeeded: true, propertyCount, newsCount };
    }

    console.log('🌱 Database is empty, starting auto-seed...');
    hasSeeded = true; // Set flag to prevent concurrent seeds

    // 1. Seed Market Trends (with monthly actuals when available)
    await MarketTrend.deleteMany({});
    const trendRows = [
      { country: "South Africa", status: "Good", color: "#2ecc71", priceChange: "+3.2%" },
      { country: "Dubai", status: "Excellent", color: "#00c2cb", priceChange: "+7.8%" },
      { country: "London", status: "Stable", color: "#f1c40f", priceChange: "+1.2%" },
      { country: "Netherlands", status: "Caution", color: "#e74c3c", priceChange: "-0.8%" }
    ];
    const withMonthly = trendRows.map((t) => {
      const raw = monthlyActualsByCountry[t.country];
      const monthlyData = Array.isArray(raw) ? raw : (raw?.monthlyData || []);
      return { ...t, monthlyData };
    });
    await MarketTrend.insertMany(withMonthly);

    // 2. Seed News
    await News.deleteMany({});
    await News.insertMany([
      {
        title: "Buying or Selling? Why Timing Alone Is No Longer the Deciding Factor",
        category: "Buying Property",
        author: "Sarah Jenkins",
        date: "6 February 2026",
        image: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        desc: "In today's market, informed decisions outperform perfectly timed ones and technology is changing how confidence is built...",
        content: `The age-old adage of "location, location, location" is being joined by a new mantra: "data, data, data." For decades, buyers and sellers obsessed over market cycles, trying to time their entry or exit perfectly. However, recent analysis suggests that waiting for the "perfect time" often results in missed opportunities. Real estate is becoming less about timing the market and more about time *in* the market, provided the asset is high-quality.`,
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
        image: "https://images.unsplash.com/photo-1451187580459-43490279c0fa?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        desc: "Property platforms are no longer just digital noticeboards, they are becoming intelligent systems that guide better decisions...",
        content: `Artificial Intelligence is doing more than just writing descriptions. It's predicting neighborhood gentrification before it happens. By analyzing millions of data points—from permit applications to coffee shop openings—AI models can now forecast property appreciation with startling accuracy.`,
        tags: ["AI", "Tech", "Future Trends"],
        readTime: "8 Min read",
        isFeatured: true,
        views: 980,
        sourceUrl: "https://www.ft.com/property"
      },
      {
        title: "Dubai Real Estate: A Haven for Luxury Investment",
        category: "Investment Insights",
        author: "Amina Al Noor",
        date: "10 February 2026",
        image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        desc: "Dubai continues to attract global investors with its tax-free environment and high rental yields...",
        content: `Dubai's real estate market remains a top choice for luxury property investors, offering high returns and a stable economic environment.`,
        tags: ["Dubai", "Luxury", "Investment"],
        readTime: "9 Min read",
        isFeatured: true,
        views: 1500,
        sourceUrl: "https://www.thenationalnews.com/business/property/"
      },
      {
        title: "The Impact of Interest Rates on Global Property Markets",
        category: "Property Trends",
        author: "Dr. Elena Petrova",
        date: "8 February 2026",
        image: "https://images.unsplash.com/photo-1516156007670-327f7a310727?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        desc: "Rising interest rates are reshaping affordability and investment strategies worldwide...",
        content: `The global shift in interest rates is having a profound impact on property markets, influencing everything from mortgage rates to investor confidence.`,
        tags: ["Interest Rates", "Global Market", "Economics"],
        readTime: "11 Min read",
        isFeatured: false,
        views: 670,
        sourceUrl: "https://www.bloomberg.com/news/real-estate"
      },
      {
        title: "London Property Market: Navigating Post-Brexit Realities",
        category: "Market Intelligence",
        author: "Mark Thompson",
        date: "7 February 2026",
        image: "https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        desc: "The London property market is showing signs of stabilization after a period of rapid growth, presenting new opportunities for both buyers and investors.",
        content: `The London property market is showing signs of stabilization after a period of rapid growth, presenting new opportunities for both buyers and investors.`,
        tags: ["London", "Market Analysis", "Investment"],
        readTime: "6 Min read",
        isFeatured: false,
        views: 520,
        sourceUrl: "https://www.bbc.com/news/business/property"
      },
      {
        title: "Sustainable Living: The Future of Real Estate Development",
        category: "Sustainability",
        author: "Maria Rodriguez",
        date: "15 February 2026",
        image: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        desc: "Eco-friendly developments are becoming the standard as buyers prioritize sustainability...",
        content: `Eco-friendly developments are becoming the standard as buyers prioritize sustainability, with developers incorporating green technologies and eco-friendly designs.`,
        tags: ["Sustainability", "Development", "Future"],
        readTime: "10 Min read",
        isFeatured: true,
        views: 780,
        sourceUrl: "https://www.property24.com/advice/sustainability"
      }
    ]);

    // 3. Seed Developments
    await Development.deleteMany({});
    await Development.insertMany([
      {
        title: "Dubai Hills Estate",
        subtitle: "Luxury Villas & Apartments",
        location: "Dubai, UAE",
        completion: "Q2 2027",
        priceStart: "$1.2M",
        yieldRange: "6.5% - 8.2%",
        imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        description: "A master-planned community featuring luxury villas and apartments with world-class amenities including golf courses, parks, and retail centers."
      },
      {
        title: "London Docklands",
        subtitle: "Waterfront Residences",
        location: "London, UK",
        completion: "Q4 2026",
        priceStart: "£850k",
        yieldRange: "4.2% - 5.8%",
        imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        description: "Premium waterfront development with stunning views of the Thames, featuring modern apartments with cutting-edge design and technology."
      },
      {
        title: "Cape Town Waterfront",
        subtitle: "Luxury Apartments",
        location: "Cape Town, South Africa",
        completion: "Q1 2027",
        priceStart: "R8.5M",
        yieldRange: "7.0% - 9.1%",
        imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        description: "Exclusive waterfront apartments in one of Cape Town's most sought-after locations, offering breathtaking ocean and mountain views."
      },
      {
        title: "Los Angeles Downtown Skyline Lofts",
        subtitle: "Urban Living Redefined",
        location: "Los Angeles, USA",
        completion: "Q1 2030",
        priceStart: "$850k",
        yieldRange: "5.0% - 6.1%",
        imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
        description: "Rise above the city in these iconic skyline lofts. Featuring floor-to-ceiling windows, rooftop infinity pools, and exclusive resident lounges."
      }
    ]);

    // 4. Create Users (if they don't exist)
    let adminUserId = null;
    
    // Admin/Agency User
    let adminUser = await User.findOne({ email: 'admin@ipm.com' });
    if (!adminUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('admin123', salt);
      adminUser = new User({
        name: 'Admin User',
        email: 'admin@ipm.com',
        password: hashedPassword,
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
            { name: 'Robert Anderson', role: 'Investor', type: 'Residential', property: 'Luxury Villa in Dubai Hills', price: '$2.5M', days: '3d', status: 'new' },
            { name: 'Sarah Mitchell', role: 'Buyer', type: 'Residential', property: 'Penthouse in London Docklands', price: '£1.85M', days: '5d', status: 'qualified' },
            { name: 'James Chen', role: 'Investor', type: 'Commercial', property: 'Commercial Office Space in Manhattan', price: '$8.5M', days: '2d', status: 'viewings' },
            { name: 'Emma Thompson', role: 'Buyer', type: 'Residential', property: 'Beachfront Villa in Miami', price: '$4.2M', days: '1d', status: 'offer' },
            { name: 'Michael Brown', role: 'Investor', type: 'Residential', property: 'Luxury Estate in Hyde Park', price: '£3.5M', days: '4d', status: 'new' }
          ],
          crmLeads: [
            { name: 'James Carter', type: 'Buyer', budget: '$1.2M', status: 'New', lastContact: '2 hrs ago', email: 'james.carter@email.com', phone: '+1-555-0123' },
            { name: 'Lisa Wang', type: 'Investor', budget: '$3.5M', status: 'Negotiating', lastContact: '5 hrs ago', email: 'lisa.wang@email.com', phone: '+1-555-0124' },
            { name: 'David Martinez', type: 'Buyer', budget: '$850k', status: 'New', lastContact: '1 day ago', email: 'david.martinez@email.com', phone: '+1-555-0125' },
            { name: 'Sophie Laurent', type: 'Investor', budget: '€2.1M', status: 'Closed', lastContact: '3 days ago', email: 'sophie.laurent@email.com', phone: '+33-1-2345-6789' },
            { name: 'Ahmed Hassan', type: 'Buyer', budget: '$950k', status: 'Negotiating', lastContact: '6 hrs ago', email: 'ahmed.hassan@email.com', phone: '+971-50-123-4567' },
            { name: 'Jennifer Kim', type: 'Investor', budget: 'S$3.8M', status: 'New', lastContact: '4 hrs ago', email: 'jennifer.kim@email.com', phone: '+65-9123-4567' }
          ]
        }
      });
      await adminUser.save();
      adminUserId = adminUser._id;
      console.log('✅ Created Admin/Agency user');
    } else {
      adminUserId = adminUser._id;
    }

    // IPM super-admin (app admin panel: admin@internationalpropertymarket.com / ipm_admin2026!)
    const ipmAdminEmail = 'admin@internationalpropertymarket.com';
    let ipmAdmin = await User.findOne({ email: ipmAdminEmail });
    if (!ipmAdmin) {
      const saltAdmin = await bcrypt.genSalt(10);
      const hashedAdminPassword = await bcrypt.hash('ipm_admin2026!', saltAdmin);
      ipmAdmin = new User({
        name: 'IPM Admin',
        email: ipmAdminEmail,
        password: hashedAdminPassword,
        role: 'admin'
      });
      await ipmAdmin.save();
      console.log('✅ Created IPM Admin user (admin@internationalpropertymarket.com)');
    }

    // Investor User
    let investorUser = await User.findOne({ email: 'investor@ipm.com' });
    if (!investorUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('investor123', salt);
      investorUser = new User({
        name: 'Sample Investor',
        email: 'investor@ipm.com',
        password: hashedPassword,
        role: 'investor',
        portfolio: [
          { propertyTitle: "Marina Torch Tower", location: "Dubai Marina", investedAmount: 150000, currentValue: 165000, roi: 10.0, status: 'Active' },
          { propertyTitle: "Hyde Park Penthouse", location: "London", investedAmount: 250000, currentValue: 262000, roi: 4.8, status: 'Active' },
          { propertyTitle: "Cape Town Waterfront", location: "Cape Town", investedAmount: 180000, currentValue: 195000, roi: 8.3, status: 'Active' },
          { propertyTitle: "Downtown LA Loft", location: "Los Angeles", investedAmount: 120000, currentValue: 128000, roi: 6.7, status: 'Active' }
        ],
        savedProperties: []
      });
      await investorUser.save();
      console.log('✅ Created Investor user');
    }

    // Agent User
    let agentUser = await User.findOne({ email: 'agent@ipm.com' });
    if (!agentUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('agent123', salt);
      agentUser = new User({
        name: 'Sample Agent',
        email: 'agent@ipm.com',
        password: hashedPassword,
        role: 'agent',
        agentStats: {
          myCommission: 125000,
          activeListings: 8,
          pendingDeals: 3,
          meetingsScheduled: 12,
          recentLeads: [
            { name: "Roger Smith", status: "Hot", property: "Luxury Villa in Dubai Hills", date: "2 hrs ago" },
            { name: "Maria Garcia", status: "Warm", property: "Penthouse in London Docklands", date: "5 hrs ago" },
            { name: "John Wilson", status: "Cold", property: "Modern Loft in Downtown LA", date: "1 day ago" },
            { name: "Sarah Johnson", status: "Hot", property: "Beachfront Villa in Miami", date: "3 hrs ago" }
          ],
          pipelineColumns: [
            { id: 'new', title: 'New Leads', total: '8.2M', count: 12 },
            { id: 'qualified', title: 'Qualified Leads', total: '12.5M', count: 8 },
            { id: 'viewings', title: 'Viewings', total: '6.8M', count: 5 },
            { id: 'offer', title: 'Under Offer', total: '4.1M', count: 3 }
          ],
          pipelineDeals: [
            { name: 'Roger Smith', role: 'Buyer', type: 'Residential', property: 'Luxury Villa in Dubai Hills', price: '$2.5M', days: '2d', status: 'new' },
            { name: 'Maria Garcia', role: 'Investor', type: 'Residential', property: 'Penthouse in London Docklands', price: '£1.85M', days: '4d', status: 'qualified' },
            { name: 'John Wilson', role: 'Buyer', type: 'Residential', property: 'Modern Loft in Downtown LA', price: '$1.2M', days: '1d', status: 'viewings' },
            { name: 'Sarah Johnson', role: 'Investor', type: 'Residential', property: 'Beachfront Villa in Miami', price: '$4.2M', days: '3d', status: 'offer' }
          ],
          crmLeads: [
            { name: 'Roger Smith', type: 'Buyer', budget: '$2.5M', status: 'New', lastContact: '2 hrs ago', email: 'roger.smith@email.com', phone: '+1-555-0201' },
            { name: 'Maria Garcia', type: 'Investor', budget: '£1.85M', status: 'Negotiating', lastContact: '5 hrs ago', email: 'maria.garcia@email.com', phone: '+34-912-345-678' },
            { name: 'John Wilson', type: 'Buyer', budget: '$1.2M', status: 'New', lastContact: '1 day ago', email: 'john.wilson@email.com', phone: '+1-555-0202' },
            { name: 'Sarah Johnson', type: 'Investor', budget: '$4.2M', status: 'Closed', lastContact: '2 days ago', email: 'sarah.johnson@email.com', phone: '+1-555-0203' }
          ]
        }
      });
      await agentUser.save();
      console.log('✅ Created Agent user');
    }

    // Buyer User (regular investor/buyer role)
    let buyerUser = await User.findOne({ email: 'buyer@ipm.com' });
    if (!buyerUser) {
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash('buyer123', salt);
      buyerUser = new User({
        name: 'Sample Buyer',
        email: 'buyer@ipm.com',
        password: hashedPassword,
        role: 'buyer',
        portfolio: [
          { propertyTitle: "Dubai Marina Apartment", location: "Dubai Marina", investedAmount: 95000, currentValue: 102000, roi: 7.4, status: 'Active' },
          { propertyTitle: "London Studio", location: "London", investedAmount: 180000, currentValue: 188000, roi: 4.4, status: 'Active' }
        ],
        savedProperties: []
      });
      await buyerUser.save();
      console.log('✅ Created Buyer user');
    }

    // 5. Seed Properties (only if we have admin user)
    if (adminUserId) {
      await Property.deleteMany({});
      const properties = [
        {
          title: "Luxury Villa in Dubai Hills",
          location: "Dubai Hills Estate, Dubai, UAE",
          price: "$2,500,000",
          listingType: "Residential",
          type: "Villa",
          agentId: adminUserId,
          status: "Published",
          isFeatured: true,
          imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "Stunning 5-bedroom villa with private pool, modern finishes, and panoramic views of the golf course.",
          specs: { beds: 5, baths: 6, sqft: 6500 }
        },
        {
          title: "Penthouse in London Docklands",
          location: "Canary Wharf, London, UK",
          price: "£1,850,000",
          listingType: "Residential",
          type: "Penthouse",
          agentId: adminUserId,
          status: "Published",
          isFeatured: true,
          imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "Spectacular 3-bedroom penthouse with floor-to-ceiling windows and private terrace overlooking the Thames.",
          specs: { beds: 3, baths: 3, sqft: 2800 }
        },
        {
          title: "Waterfront Apartment in Cape Town",
          location: "V&A Waterfront, Cape Town, South Africa",
          price: "R12,500,000",
          listingType: "Residential",
          type: "Apartment",
          agentId: adminUserId,
          status: "Published",
          isFeatured: true,
          imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "Luxury 4-bedroom apartment with stunning ocean views, premium finishes, and access to world-class amenities.",
          specs: { beds: 4, baths: 4, sqft: 4200 }
        },
        {
          title: "Modern Loft in Downtown LA",
          location: "Downtown Los Angeles, California, USA",
          price: "$1,200,000",
          listingType: "Residential",
          type: "Apartment",
          agentId: adminUserId,
          status: "Published",
          imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "Stylish 2-bedroom loft with high ceilings, exposed brick, and modern amenities in the heart of downtown.",
          specs: { beds: 2, baths: 2, sqft: 1800 }
        },
        {
          title: "Investment Property in Dubai Marina",
          location: "Dubai Marina, Dubai, UAE",
          price: "$950,000",
          listingType: "Residential",
          type: "Apartment",
          agentId: adminUserId,
          status: "Published",
          imageUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "High-yield 2-bedroom apartment with excellent rental potential in one of Dubai's most popular areas.",
          specs: { beds: 2, baths: 2, sqft: 1400 }
        },
        {
          title: "Luxury Estate in Hyde Park",
          location: "Hyde Park, London, UK",
          price: "£3,500,000",
          listingType: "Residential",
          type: "Townhouse",
          agentId: adminUserId,
          status: "Published",
          isFeatured: true,
          imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "Magnificent 6-bedroom estate with private garden, located in one of London's most prestigious neighborhoods.",
          specs: { beds: 6, baths: 7, sqft: 8500 }
        },
        {
          title: "Beachfront Villa in Miami",
          location: "South Beach, Miami, Florida, USA",
          price: "$4,200,000",
          listingType: "Residential",
          type: "Villa",
          agentId: adminUserId,
          status: "Published",
          isFeatured: true,
          imageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "Stunning beachfront villa with direct ocean access and panoramic views.",
          specs: { beds: 4, baths: 5, sqft: 5200 }
        },
        {
          title: "Commercial Office Space in Manhattan",
          location: "Midtown Manhattan, New York, USA",
          price: "$8,500,000",
          listingType: "Commercial",
          type: "Commercial",
          agentId: adminUserId,
          status: "Published",
          imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "Premium commercial office space in the heart of Midtown Manhattan.",
          specs: { beds: 0, baths: 8, sqft: 15000 }
        },
        {
          title: "Luxury Apartment in Singapore",
          location: "Marina Bay, Singapore",
          price: "S$3,800,000",
          listingType: "Residential",
          type: "Apartment",
          agentId: adminUserId,
          status: "Published",
          imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "Sophisticated 3-bedroom apartment in Singapore's most iconic location.",
          specs: { beds: 3, baths: 3, sqft: 2400 }
        },
        {
          title: "Industrial Warehouse in Amsterdam",
          location: "Amsterdam Port, Netherlands",
          price: "€2,100,000",
          listingType: "Industrial",
          type: "Commercial",
          agentId: adminUserId,
          status: "Published",
          imageUrl: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "Modern industrial warehouse facility with excellent logistics access.",
          specs: { beds: 0, baths: 2, sqft: 25000 }
        },
        {
          title: "Luxury Condo in Toronto",
          location: "Yorkville, Toronto, Canada",
          price: "C$2,800,000",
          listingType: "Residential",
          type: "Apartment",
          agentId: adminUserId,
          status: "Published",
          imageUrl: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "Elegant 3-bedroom condominium in Toronto's most desirable neighborhood.",
          specs: { beds: 3, baths: 3, sqft: 2200 }
        },
        {
          title: "Retail Space in Paris",
          location: "Champs-Élysées, Paris, France",
          price: "€4,500,000",
          listingType: "Retail",
          type: "Commercial",
          agentId: adminUserId,
          status: "Published",
          imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
          description: "Prime retail space on the world's most famous avenue.",
          specs: { beds: 0, baths: 2, sqft: 3500 }
        }
      ];
      
      await Property.insertMany(properties);
      console.log(`✅ Auto-seeded ${properties.length} properties`);
    }

    // Verify all users were created
    const finalUserCount = await User.countDocuments();
    const allUsers = await User.find({}, 'email role');
    
    console.log('✅ Auto-seed completed successfully');
    console.log(`📊 Created ${finalUserCount} users:`, allUsers.map(u => `${u.email} (${u.role})`).join(', '));
    
    return {
      success: true,
      seeded: true,
      properties: adminUserId ? 12 : 0,
      news: 6,
      developments: 4,
      marketTrends: 4,
      users: finalUserCount,
      userDetails: allUsers.map(u => ({ email: u.email, role: u.role }))
    };
  } catch (err) {
    console.error('❌ Auto-seed error:', err);
    hasSeeded = false; // Reset flag on error
    throw err;
  }
}

module.exports = { autoSeedIfEmpty };


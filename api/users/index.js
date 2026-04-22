// Vercel serverless function for users collection operations
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { requireAuth } = require('../_lib/auth');
const User = require('../../server/models/User');
const News = require('../../server/models/News');
const MarketTrend = require('../../server/models/MarketTrend');
const Property = require('../../server/models/Property');
const Development = require('../../server/models/Development');
const bcrypt = require('bcryptjs');

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    await connectDB();
    const { type, action } = req.query;

    // GET all users (admin only), with optional pagination: ?limit=25&skip=0
    if (req.method === 'GET' && !type && !action) {
      const userId = requireAuth(req, res);
      if (!userId) return;
      const adminUser = await User.findById(userId).select('role').lean();
      if (!adminUser || (adminUser.role || '').toLowerCase() !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
      }
      const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 100);
      const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);
      const [users, total] = await Promise.all([
        User.find({}, '-password').sort({ _id: -1 }).skip(skip).limit(limit).lean(),
        User.countDocuments({})
      ]);
      return res.status(200).json({ users, total });
    }

    // GET trends
    if (req.method === 'GET' && type === 'trends') {
      const trends = await MarketTrend.find().sort({ createdAt: -1 });
      return res.status(200).json(trends);
    }

    // GET test-users diagnostic (merged from api/test-users.js)
    if (req.method === 'GET' && action === 'test-users') {
      const users = await User.find({});
      const userCount = users.length;
      const expectedCredentials = {
        'admin@ipm.com': 'admin123',
        'investor@ipm.com': 'investor123',
        'agent@ipm.com': 'agent123',
        'buyer@ipm.com': 'buyer123'
      };
      const testResults = await Promise.all(
        users.map(async (user) => {
          const expectedPassword = expectedCredentials[user.email];
          let passwordTest = 'Not in expected list';
          if (expectedPassword) {
            try {
              const isValid = await bcrypt.compare(expectedPassword, user.password);
              passwordTest = isValid ? '✅ CORRECT' : '❌ WRONG';
            } catch (err) {
              passwordTest = '❌ ERROR: ' + err.message;
            }
          }
          return {
            _id: user._id.toString(),
            name: user.name,
            email: user.email,
            role: user.role,
            expectedPassword: expectedPassword || 'N/A',
            passwordTest: passwordTest,
            hasPortfolio: !!user.portfolio && user.portfolio.length > 0,
            hasAgencyStats: !!user.agencyStats,
            hasAgentStats: !!user.agentStats
          };
        })
      );
      const existingEmails = users.map(u => u.email);
      const missingUsers = Object.keys(expectedCredentials).filter(
        email => !existingEmails.includes(email)
      );
      return res.status(200).json({
        summary: {
          totalUsers: userCount,
          expectedUsers: 4,
          missingUsers: missingUsers.length,
          status: userCount === 0 ? '⚠️ NO USERS' : 
                  missingUsers.length > 0 ? '⚠️ SOME USERS MISSING' : '✅ ALL USERS PRESENT'
        },
        users: testResults,
        missingUsers: missingUsers.map(email => ({ email, expectedPassword: expectedCredentials[email] }))
      });
    }

    // GET check-passwords diagnostic (merged from api/check-passwords.js)
    if (req.method === 'GET' && action === 'check-passwords') {
      const expectedPasswords = {
        'admin@ipm.com': 'admin123',
        'investor@ipm.com': 'investor123',
        'agent@ipm.com': 'agent123',
        'buyer@ipm.com': 'buyer123'
      };
      const users = await User.find({});
      const passwordTests = await Promise.all(
        Object.entries(expectedPasswords).map(async ([email, expectedPassword]) => {
          const user = users.find(u => u.email === email);
          if (!user) {
            return { email, exists: false, message: '❌ USER NOT FOUND' };
          }
          let passwordMatch = false;
          try {
            passwordMatch = await bcrypt.compare(expectedPassword, user.password);
          } catch (err) {
            return { email, exists: true, passwordMatch: false, error: err.message };
          }
          return {
            email,
            exists: true,
            name: user.name,
            role: user.role,
            expectedPassword,
            passwordMatch: passwordMatch ? '✅ CORRECT' : '❌ WRONG'
          };
        })
      );
      return res.status(200).json({
        summary: {
          totalUsersInDB: users.length,
          expectedUsers: 4,
          foundUsers: passwordTests.filter(t => t.exists).length,
          correctPasswords: passwordTests.filter(t => t.passwordMatch === '✅ CORRECT').length
        },
        passwordTests
      });
    }

    // POST seed database
    if (req.method === 'POST' && action === 'seed') {
      console.log('🌱 Starting database seed via /api/users?action=seed...');
      
      try {
        // 1. Seed Market Trends (with monthly actuals from loader; supports year-keyed JSON)
      const { loadMarketTrendsMonthly } = require('../../server/data/loadMarketTrendsMonthly');
      const monthlyByCountry = loadMarketTrendsMonthly();
      await MarketTrend.deleteMany({});
      const trendRows = [
        { country: "South Africa", status: "Good", color: "#2ecc71", priceChange: "+3.2%" },
        { country: "Dubai", status: "Excellent", color: "#00c2cb", priceChange: "+7.8%" },
        { country: "London", status: "Stable", color: "#f1c40f", priceChange: "+1.2%" },
        { country: "Netherlands", status: "Caution", color: "#e74c3c", priceChange: "-0.8%" }
      ];
      await MarketTrend.insertMany(trendRows.map((t) => {
        const raw = monthlyByCountry[t.country];
        const monthlyData = Array.isArray(raw) ? raw : (raw?.monthlyData || []);
        return { ...t, monthlyData };
      }));

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
          content: `The age-old adage of "location, location, location" is being joined by a new mantra: "data, data, data." For decades, buyers and sellers obsessed over market cycles, trying to time their entry or exit perfectly.

However, recent analysis suggests that waiting for the "perfect time" often results in missed opportunities. Real estate is becoming less about timing the market and more about time *in* the market, provided the asset is high-quality.

This article explores why fundamental asset value, driven by AI-vetted metrics, is a safer bet than speculation on interest rate fluctuations. We look at case studies from London and Dubai where premium properties outperformed the broader market despite economic headwinds.

The key takeaway: Quality assets with strong fundamentals will appreciate over time, regardless of short-term market volatility. Technology now allows us to identify these properties with unprecedented accuracy, making timing less critical than asset selection.`,
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
          content: `Artificial Intelligence is doing more than just writing descriptions. It's predicting neighborhood gentrification before it happens. By analyzing millions of data points—from permit applications to coffee shop openings—AI models can now forecast property appreciation with startling accuracy.

In this deep dive, we look at how IPM's proprietary algorithms are identifying undervalued assets in emerging markets. We also discuss the ethical implications of algorithmic redlining and how modern platforms are working to democratize access to high-yield investments.

The technology behind these predictions combines machine learning with traditional real estate analysis, creating a hybrid approach that's both data-driven and human-verified. Early adopters are seeing returns that outpace traditional investment strategies by significant margins.`,
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
          content: `Dubai's real estate market remains a top choice for luxury property investors, offering high returns and a stable economic environment. The emirate's strategic location, world-class infrastructure, and investor-friendly policies make it an attractive destination for international buyers.

Premium properties in areas like Dubai Marina, Palm Jumeirah, and Downtown Dubai have shown consistent appreciation, with rental yields averaging 6-8% annually. The market's transparency and legal framework provide additional security for foreign investors.

Recent developments in sustainable architecture and smart city initiatives are further enhancing Dubai's appeal. The government's commitment to becoming a global innovation hub is attracting tech companies and high-net-worth individuals, driving demand for luxury residential and commercial properties.`,
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
          content: `The global shift in interest rates is having a profound impact on property markets, influencing everything from mortgage rates to investor confidence. While higher rates typically cool markets, premium properties in prime locations continue to perform well.

This analysis examines how different markets are responding to rate changes, with some regions showing resilience while others experience corrections. We explore strategies for navigating this new environment, including alternative financing options and investment structures that minimize interest rate exposure.

The key insight: Location and quality matter more than ever. Properties in established, desirable areas with strong fundamentals are weathering rate increases better than speculative investments in emerging markets.`,
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
          content: `The London property market is showing signs of stabilization after a period of rapid growth, presenting new opportunities for both buyers and investors. Post-Brexit adjustments have created a more balanced market, with prices stabilizing and inventory levels normalizing.

Prime central London areas like Mayfair, Knightsbridge, and Chelsea continue to attract international buyers, while emerging neighborhoods offer value for those willing to look beyond traditional hotspots. The market's resilience demonstrates London's enduring appeal as a global financial and cultural center.

Current trends show increased interest in sustainable properties, smart home technology, and flexible living spaces. Investors are also looking at commercial-to-residential conversions and mixed-use developments as opportunities in the evolving market.`,
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
          content: `Eco-friendly developments are becoming the standard as buyers prioritize sustainability, with developers incorporating green technologies and eco-friendly designs. From solar panels and energy-efficient systems to sustainable materials and green spaces, modern properties are being built with environmental impact in mind.

This shift isn't just about environmental responsibility—it's also about long-term value. Sustainable properties often have lower operating costs, higher resale values, and appeal to an increasingly environmentally conscious buyer pool. Certifications like LEED and BREEAM are becoming important differentiators in the market.

We explore cutting-edge sustainable developments around the world, from carbon-neutral buildings in Scandinavia to water-efficient designs in arid regions. The future of real estate is green, and early adopters are positioning themselves for long-term success.`,
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
          imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3",
          description: "A master-planned community featuring luxury villas and apartments with world-class amenities including golf courses, parks, and retail centers."
        },
        {
          title: "London Docklands",
          subtitle: "Waterfront Residences",
          location: "London, UK",
          completion: "Q4 2026",
          priceStart: "£850k",
          yieldRange: "4.2% - 5.8%",
          imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?ixlib=rb-4.0.3",
          description: "Premium waterfront development with stunning views of the Thames, featuring modern apartments with cutting-edge design and technology."
        },
        {
          title: "Cape Town Waterfront",
          subtitle: "Luxury Apartments",
          location: "Cape Town, South Africa",
          completion: "Q1 2027",
          priceStart: "R8.5M",
          yieldRange: "7.0% - 9.1%",
          imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3",
          description: "Exclusive waterfront apartments in one of Cape Town's most sought-after locations, offering breathtaking ocean and mountain views."
        },
        {
          title: "Los Angeles Downtown Skyline Lofts",
          subtitle: "Urban Living Redefined",
          location: "Los Angeles, USA",
          completion: "Q1 2030",
          priceStart: "$850k",
          yieldRange: "5.0% - 6.1%",
          imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3",
          description: "Rise above the city in these iconic skyline lofts. Featuring floor-to-ceiling windows, rooftop infinity pools, and exclusive resident lounges."
        }
      ]);

      // 4. Seed Sample Users (must be done before properties to get agentId)
      // App admin: admin@internationalpropertymarket.com / ipm_admin2026! → redirects to /admin after login
      const appAdminEmail = 'admin@internationalpropertymarket.com';
      let appAdmin = await User.findOne({ email: appAdminEmail });
      if (!appAdmin) {
        const saltAdmin = await bcrypt.genSalt(10);
        const hashedAdminPass = await bcrypt.hash('ipm_admin2026!', saltAdmin);
        appAdmin = new User({
          name: 'IPM Admin',
          email: appAdminEmail,
          password: hashedAdminPass,
          role: 'admin'
        });
        await appAdmin.save();
        console.log('✅ Created app admin user:', appAdminEmail);
      } else if ((appAdmin.role || '').toLowerCase() !== 'admin') {
        appAdmin.role = 'admin';
        await appAdmin.save();
        console.log('✅ Updated app admin role:', appAdminEmail);
      }

      const existingAdmin = await User.findOne({ email: 'admin@ipm.com' });
      let adminUserId = existingAdmin ? existingAdmin._id : null;
      
      if (!existingAdmin) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('admin123', salt);
        const adminUser = new User({
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
        const savedAdmin = await adminUser.save();
        adminUserId = savedAdmin._id;
      }

      const existingInvestor = await User.findOne({ email: 'investor@ipm.com' });
      if (!existingInvestor) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('investor123', salt);
        const investorUser = new User({
          name: 'Sample Investor',
          email: 'investor@ipm.com',
          password: hashedPassword,
          role: 'investor',
          portfolio: [
            { propertyTitle: "Marina Torch Tower", location: "Dubai Marina", investedAmount: 150000, currentValue: 165000, roi: 10.0, status: 'Active' },
            { propertyTitle: "Hyde Park Penthouse", location: "London", investedAmount: 250000, currentValue: 262000, roi: 4.8, status: 'Active' }
          ]
        });
        await investorUser.save();
        console.log('✅ Created Investor user');
      } else {
        console.log('✅ Investor user already exists');
      }

      const existingAgent = await User.findOne({ email: 'agent@ipm.com' });
      if (!existingAgent) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('agent123', salt);
        const agentUser = new User({
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
              { name: "John Wilson", status: "Cold", property: "Modern Loft in Downtown LA", date: "1 day ago" }
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
              { name: 'John Wilson', role: 'Buyer', type: 'Residential', property: 'Modern Loft in Downtown LA', price: '$1.2M', days: '1d', status: 'viewings' }
            ],
            crmLeads: [
              { name: 'Roger Smith', type: 'Buyer', budget: '$2.5M', status: 'New', lastContact: '2 hrs ago', email: 'roger.smith@email.com', phone: '+1-555-0201' },
              { name: 'Maria Garcia', type: 'Investor', budget: '£1.85M', status: 'Negotiating', lastContact: '5 hrs ago', email: 'maria.garcia@email.com', phone: '+34-912-345-678' },
              { name: 'John Wilson', type: 'Buyer', budget: '$1.2M', status: 'New', lastContact: '1 day ago', email: 'john.wilson@email.com', phone: '+1-555-0202' },
              { name: 'Emma Davis', type: 'Investor', budget: '$4.2M', status: 'Closed', lastContact: '2 days ago', email: 'emma.davis@email.com', phone: '+1-555-0203' }
            ]
          }
        });
        await agentUser.save();
        console.log('✅ Created Agent user');
      }

      // Create Buyer User
      const existingBuyer = await User.findOne({ email: 'buyer@ipm.com' });
      if (!existingBuyer) {
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash('buyer123', salt);
        const buyerUser = new User({
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

      // 5. Seed Properties (use adminUserId from step 4)
      await Property.deleteMany({});
      if (adminUserId) {
        await Property.insertMany([
          {
            title: "Luxury Villa in Dubai Hills",
            location: "Dubai Hills Estate, Dubai, UAE",
            price: "$2,500,000",
            listingType: "Residential",
            agentId: adminUserId,
            status: "Published",
            isFeatured: true,
            imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "Stunning 5-bedroom villa with private pool, modern finishes, and panoramic views of the golf course. This exceptional property features a spacious open-plan living area, gourmet kitchen with premium appliances, and a master suite with walk-in closet. The outdoor space includes a private infinity pool, landscaped gardens, and a covered terrace perfect for entertaining. Located in one of Dubai's most prestigious communities with access to world-class amenities including golf courses, parks, and retail centers.",
            specs: { beds: 5, baths: 6, sqft: 6500 }
          },
          {
            title: "Penthouse in London Docklands",
            location: "Canary Wharf, London, UK",
            price: "£1,850,000",
            listingType: "Residential",
            agentId: adminUserId,
            status: "Published",
            isFeatured: true,
            imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "Spectacular 3-bedroom penthouse with floor-to-ceiling windows and private terrace overlooking the Thames. This modern residence features high-end finishes throughout, including marble floors, designer fixtures, and smart home technology. The open-plan living space flows seamlessly to the private terrace, offering breathtaking views of the London skyline. Building amenities include 24-hour concierge, gym, spa, and private parking.",
            specs: { beds: 3, baths: 3, sqft: 2800 }
          },
          {
            title: "Waterfront Apartment in Cape Town",
            location: "V&A Waterfront, Cape Town, South Africa",
            price: "R12,500,000",
            listingType: "Residential",
            agentId: adminUserId,
            status: "Published",
            isFeatured: true,
            imageUrl: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "Luxury 4-bedroom apartment with stunning ocean views, premium finishes, and access to world-class amenities. This exceptional waterfront property features spacious living areas, a modern kitchen with Italian appliances, and a master bedroom with private balcony. The building offers concierge services, secure parking, and direct access to the V&A Waterfront's restaurants, shops, and entertainment venues.",
            specs: { beds: 4, baths: 4, sqft: 4200 }
          },
          {
            title: "Modern Loft in Downtown LA",
            location: "Downtown Los Angeles, California, USA",
            price: "$1,200,000",
            listingType: "Residential",
            agentId: adminUserId,
            status: "Published",
            imageUrl: "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "Stylish 2-bedroom loft with high ceilings, exposed brick, and modern amenities in the heart of downtown. This converted warehouse space features original architectural details combined with contemporary design. The open-plan layout includes a chef's kitchen, spacious living area, and two bedrooms with en-suite bathrooms. Located in a vibrant neighborhood with easy access to restaurants, galleries, and entertainment.",
            specs: { beds: 2, baths: 2, sqft: 1800 }
          },
          {
            title: "Investment Property in Dubai Marina",
            location: "Dubai Marina, Dubai, UAE",
            price: "$950,000",
            listingType: "Residential",
            agentId: adminUserId,
            status: "Published",
            imageUrl: "https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "High-yield 2-bedroom apartment with excellent rental potential in one of Dubai's most popular areas. This modern unit features a spacious layout, high-quality finishes, and a private balcony with marina views. The building offers state-of-the-art amenities including swimming pool, gym, and 24-hour security. Perfect for investors seeking strong rental returns in a prime location.",
            specs: { beds: 2, baths: 2, sqft: 1400 }
          },
          {
            title: "Luxury Estate in Hyde Park",
            location: "Hyde Park, London, UK",
            price: "£3,500,000",
            listingType: "Residential",
            agentId: adminUserId,
            status: "Published",
            isFeatured: true,
            imageUrl: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "Magnificent 6-bedroom estate with private garden, located in one of London's most prestigious neighborhoods. This grand Victorian home has been beautifully restored and modernized, featuring original period details alongside contemporary luxury. The property includes a private garden, off-street parking, and is within walking distance of Hyde Park and Knightsbridge. Perfect for families seeking elegance and space in central London.",
            specs: { beds: 6, baths: 7, sqft: 8500 }
          },
          {
            title: "Beachfront Villa in Miami",
            location: "South Beach, Miami, Florida, USA",
            price: "$4,200,000",
            listingType: "Residential",
            agentId: adminUserId,
            status: "Published",
            isFeatured: true,
            imageUrl: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "Stunning beachfront villa with direct ocean access and panoramic views. This contemporary 4-bedroom home features an open-plan design, infinity pool, and private beach access. The property includes a gourmet kitchen, wine cellar, home theater, and a rooftop terrace perfect for entertaining. Located in one of Miami's most exclusive neighborhoods with world-class dining and shopping nearby.",
            specs: { beds: 4, baths: 5, sqft: 5200 }
          },
          {
            title: "Commercial Office Space in Manhattan",
            location: "Midtown Manhattan, New York, USA",
            price: "$8,500,000",
            listingType: "Commercial",
            agentId: adminUserId,
            status: "Published",
            imageUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "Premium commercial office space in the heart of Midtown Manhattan. This 15,000 sqft space features floor-to-ceiling windows, modern infrastructure, and flexible layout options. The building offers 24/7 access, high-speed elevators, and is LEED certified. Perfect for corporate headquarters or professional services firms seeking a prestigious address.",
            specs: { beds: 0, baths: 8, sqft: 15000 }
          },
          {
            title: "Luxury Apartment in Singapore",
            location: "Marina Bay, Singapore",
            price: "S$3,800,000",
            listingType: "Residential",
            agentId: adminUserId,
            status: "Published",
            imageUrl: "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "Sophisticated 3-bedroom apartment in Singapore's most iconic location. This high-floor unit offers breathtaking views of Marina Bay and the city skyline. Features include premium European appliances, marble finishes, and smart home automation. The building provides world-class amenities including infinity pool, private cinema, and concierge services.",
            specs: { beds: 3, baths: 3, sqft: 2400 }
          },
          {
            title: "Industrial Warehouse in Amsterdam",
            location: "Amsterdam Port, Netherlands",
            price: "€2,100,000",
            listingType: "Industrial",
            agentId: adminUserId,
            status: "Published",
            imageUrl: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "Modern industrial warehouse facility with excellent logistics access. This 25,000 sqft property features high ceilings, loading docks, and office space. Ideal for distribution, manufacturing, or storage operations. Located in Amsterdam's main port area with direct access to major highways and shipping routes.",
            specs: { beds: 0, baths: 2, sqft: 25000 }
          },
          {
            title: "Luxury Condo in Toronto",
            location: "Yorkville, Toronto, Canada",
            price: "C$2,800,000",
            listingType: "Residential",
            agentId: adminUserId,
            status: "Published",
            imageUrl: "https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "Elegant 3-bedroom condominium in Toronto's most desirable neighborhood. This corner unit features expansive windows, premium finishes, and a private terrace. The building offers concierge services, fitness center, and rooftop terrace with city views. Steps away from luxury shopping, fine dining, and cultural attractions.",
            specs: { beds: 3, baths: 3, sqft: 2200 }
          },
          {
            title: "Retail Space in Paris",
            location: "Champs-Élysées, Paris, France",
            price: "€4,500,000",
            listingType: "Retail",
            agentId: adminUserId,
            status: "Published",
            imageUrl: "https://images.unsplash.com/photo-1441986300917-64674bd600d8?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=80",
            description: "Prime retail space on the world's most famous avenue. This 3,500 sqft ground-floor unit features high ceilings, large display windows, and premium finishes. Perfect for luxury brands, flagship stores, or high-end retail operations. Located in the heart of Paris with exceptional foot traffic and visibility.",
            specs: { beds: 0, baths: 2, sqft: 3500 }
          }
        ]);
      }

      const propertyCount = adminUserId ? 12 : 0;
      const finalUserCount = await User.countDocuments();
      
      console.log('✅ Seed completed successfully');
      console.log(`📊 Created: ${propertyCount} properties, ${finalUserCount} users`);
      
      return res.status(200).json({
        success: true,
        message: 'Database seeded successfully!',
        data: {
          marketTrends: 4,
          news: 6,
          developments: 4,
          properties: propertyCount,
          users: finalUserCount
        }
      });
      } catch (seedErr) {
        console.error('❌ Seed error:', seedErr);
        console.error('Error stack:', seedErr.stack);
        return res.status(500).json({
          success: false,
          message: seedErr.message,
          error: 'Failed to seed database. Check server logs for details.',
          stack: process.env.NODE_ENV === 'development' ? seedErr.stack : undefined
        });
      }
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('Users operation error:', err);
    return res.status(500).json({ message: err.message });
  }
};


const mongoose = require('mongoose');
const dotenv = require('dotenv');
const News = require('./models/News'); // Adjust path to where your News.js model is

dotenv.config();

// Sample Data Matching your Design
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
        title: "The Market Is Moving. Here’s What the Data Is Really Saying",
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

// Database Connection & Seeding Logic
mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/realestate_db')
    .then(async () => {
        console.log('✅ Connected to MongoDB');
        
        try {
            // 1. Clear existing news
            await News.deleteMany({});
            console.log('🗑️  Old news deleted');

            // 2. Insert new seed data
            await News.insertMany(newsData);
            console.log('🌱 News seeded successfully!');

            process.exit();
        } catch (err) {
            console.error(err);
            process.exit(1);
        }
    })
    .catch((err) => {
        console.error('❌ Database connection error:', err);
        process.exit(1);
    });
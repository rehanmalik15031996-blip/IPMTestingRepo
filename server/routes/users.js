const router = require('express').Router();
const User = require('../models/User');
const Property = require('../models/Property');
const File = require('../models/File'); // Your Vault model
const News = require('../models/News');
const MarketTrend = require('../models/MarketTrend');
const Development = require('../models/Development'); // ✅ Import this
const { sanitizeAgencyBranch } = require('../utils/display');
const { sanitizeUserForClient } = require('../utils/sanitizeUserForClient');
const { loadMarketTrendsMonthly } = require('../data/loadMarketTrendsMonthly');
const { agencyListingPropertyFilter } = require('../utils/agencyListingsQuery');

function getAuthUserIdFromReq(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization || '';
    const token = typeof authHeader === 'string' && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!token) return null;
    try {
        const jwt = require('jsonwebtoken');
        const secret = process.env.JWT_SECRET || 'SECRET_KEY_123';
        const decoded = jwt.verify(token, secret);
        const uid = decoded && (decoded.id || decoded.userId || decoded.sub);
        return uid ? String(uid) : null;
    } catch (_) {
        return null;
    }
}

/** Derive sentiment from actual YoY so GOOD/STABLE/EXCELLENT align with trend data. */
function getSentimentFromYoY(yoyPercent) {
    const str = String(yoyPercent || '').trim();
    const num = parseFloat(str.replace(/[^0-9.-]/g, '')) || 0;
    if (num < 0) return 'CAUTION';
    if (num < 3) return 'STABLE';
    if (num < 9) return 'GOOD';
    return 'EXCELLENT';
}

/** Map a Property document to a portfolio item with full details for Portfolio spotlight (listing type, price, location, specs, ownership). */
function mapPropertyToPortfolioItem(p) {
    const priceNum = parseFloat(String(p.price || '0').replace(/[^0-9.]/g, '')) || 0;
    const specs = p.specs && (p.specs.beds != null || p.specs.baths != null || p.specs.sqft != null)
        ? p.specs
        : {
            beds: p.residential?.bedrooms,
            baths: p.residential?.bathrooms,
            sqft: p.residential?.livingAreaSize
        };
    return {
        propertyTitle: p.title || 'Untitled Property',
        location: p.location || '',
        investedAmount: priceNum,
        currentValue: priceNum,
        roi: 0,
        status: p.status || 'Published',
        photo: p.imageUrl || (p.media && p.media.coverImage) || '',
        details: {
            _id: p._id,
            isUploaded: true,
            listingType: p.listingType,
            propertyType: p.type || p.propertyCategory,
            price: p.price,
            locationDetails: p.locationDetails || {},
            specs,
            ownership: p.ownership || {}
        }
    };
}

// 1. SAVE a Property (Updated with $addToSet)
router.put('/save/:propertyId', async (req, res) => {
    try {
        const { userId } = req.body;
        
        // $addToSet automatically prevents duplicates
        await User.findByIdAndUpdate(userId, {
            $addToSet: { savedProperties: req.params.propertyId }
        });
        
        res.status(200).json("Property saved!");
    } catch (err) {
        res.status(500).json(err);
    }
});

// 2. UNSAVE a Property
router.put('/unsave/:propertyId', async (req, res) => {
    try {
        const { userId } = req.body;
        
        // $pull removes the item
        await User.findByIdAndUpdate(userId, {
            $pull: { savedProperties: req.params.propertyId }
        });
        
        res.status(200).json("Property removed.");
    } catch (err) {
        res.status(500).json(err);
    }
});

// 3. GET All Saved Properties
router.get('/saved/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).populate('savedProperties');
        res.status(200).json(user.savedProperties);
    } catch (err) {
        res.status(500).json(err);
    }
});

router.post('/seed/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const userRole = user.role ? user.role.toLowerCase() : 'investor';

        // A. Seed Global Market Trends
        await MarketTrend.deleteMany({});
        await MarketTrend.insertMany([
            { country: "South Africa", status: "Good", color: "#2ecc71", priceChange: "+3.2%" },
            { country: "Dubai", status: "Excellent", color: "#00c2cb", priceChange: "+7.8%" },
            { country: "London", status: "Stable", color: "#f1c40f", priceChange: "+1.2%" },
            { country: "Netherlands", status: "Caution", color: "#e74c3c", priceChange: "-0.8%" }
        ]);

        // B. Seed Global News (✅ Added 'content' to satisfy your model)
        await News.deleteMany({});
        await News.insertMany([
            { 
                title: "Real Estate Market Resilience", 
                category: "Market Trends", 
                author: "M. Ali", 
                date: "Nov 20, 2025", 
                image: "https://images.unsplash.com/photo-1560518883-ce09059eeffa?ixlib=rb-4.0.3", 
                desc: "Sales remain strong despite global economic shifts.",
                content: "The real estate market has shown incredible resilience this quarter...",
                tags: ["Market", "Finance"],
                readTime: "4 min read"
            },
            { 
                title: "Interest Rates Impact", 
                category: "Finance", 
                author: "Admin", 
                date: "Nov 19, 2025", 
                image: "https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?ixlib=rb-4.0.3", 
                desc: "Understanding how new rates affect affordability.",
                content: "With interest rates fluctuating, buyers are reconsidering their options...",
                tags: ["Rates", "Economy"],
                readTime: "3 min read"
            }
        ]);

        // C. Seed User-Specific Data
        if (userRole === 'investor') {
            user.portfolio = [
                { propertyTitle: "Marina Torch Tower", location: "Dubai Marina", investedAmount: 150000, currentValue: 165000, roi: 10.0, status: 'Active' },
                { propertyTitle: "Hyde Park Penthouse", location: "London", investedAmount: 250000, currentValue: 262000, roi: 4.8, status: 'Active' }
            ];
            user.markModified('portfolio');
            
        } else if (userRole === 'agency') {
            user.agencyStats = {
                ...user.agencyStats,
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
                    { name: 'Benjamin Wilson', role: 'Seller', type: 'Residential', property: 'Malibu Beachfront Home', price: '410K', days: '3d', status: 'new' },
                    { name: 'Lucas Davis', role: 'Seller', type: 'Commercial', property: 'Seattle Waterfront Property', price: '1,898K', days: '14d', status: 'qualified' },
                    { name: 'Grace Kowalski', role: 'Buyer', type: 'Mixed-use', property: 'Venice Grand Canal Palazzo', price: '485K', days: '10d', status: 'qualified' },
                    { name: 'Ella McCarthy', role: 'Seller', type: 'Industrial', property: 'Mayfair Townhouse London', price: '1,269K', days: '11d', status: 'viewings' },
                    { name: 'Ella Novak', role: 'Seller', type: 'Mixed-use', property: 'Chelsea Manor London', price: '963K', days: '3d', status: 'viewings' },
                    { name: 'Max Taylor', role: 'Seller', type: 'Residential', property: 'Marina Bay Tower Dubai', price: '285K', days: '18d', status: 'offer' },
                    { name: 'Benjamin Costa', role: 'Seller', type: 'Mixed-use', property: 'Seoul Gangnam District', price: '733K', days: '15d', status: 'offer' }
                ],
                crmLeads: [
                    { name: 'James Carter', type: 'Buyer', budget: '$1.2M', status: 'New', lastContact: '2 hrs ago', email: 'james@gmail.com' },
                    { name: 'Sofia M.', type: 'Investor', budget: '$5.0M', status: 'Negotiating', lastContact: '1 day ago', email: 'sofia.invest@outlook.com' },
                    { name: 'Robert Fox', type: 'Seller', budget: 'N/A', status: 'Closed', lastContact: '1 week ago', email: 'rob.fox@yahoo.com' },
                    { name: 'Alice Young', type: 'Buyer', budget: '$600k', status: 'Follow Up', lastContact: '3 days ago', email: 'alice.y@gmail.com' }
                ]
            };
            user.markModified('agencyStats');
            
        } else if (userRole === 'agent') {
            user.agentStats = {
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
                    { name: 'Grace Kowalski', role: 'Buyer', type: 'Mixed-use', property: 'Venice Grand Canal Palazzo', price: '485K', days: '10d', status: 'qualified' },
                    { name: 'Ella McCarthy', role: 'Seller', type: 'Industrial', property: 'Mayfair Townhouse London', price: '1,269K', days: '11d', status: 'viewings' },
                    { name: 'Ella Novak', role: 'Seller', type: 'Mixed-use', property: 'Chelsea Manor London', price: '963K', days: '3d', status: 'viewings' },
                    { name: 'Max Taylor', role: 'Seller', type: 'Residential', property: 'Marina Bay Tower Dubai', price: '285K', days: '18d', status: 'offer' },
                    { name: 'Benjamin Costa', role: 'Seller', type: 'Mixed-use', property: 'Seoul Gangnam District', price: '733K', days: '15d', status: 'offer' }
                ],
                crmLeads: [
                    { name: 'James Carter', type: 'Buyer', budget: '$1.2M', status: 'New', lastContact: '2 hrs ago', email: 'james@gmail.com' },
                    { name: 'Sofia M.', type: 'Investor', budget: '$5.0M', status: 'Negotiating', lastContact: '1 day ago', email: 'sofia.invest@outlook.com' },
                    { name: 'Robert Fox', type: 'Seller', budget: 'N/A', status: 'Closed', lastContact: '1 week ago', email: 'rob.fox@yahoo.com' },
                    { name: 'Alice Young', type: 'Buyer', budget: '$600k', status: 'Follow Up', lastContact: '3 days ago', email: 'alice.y@gmail.com' }
                ]
            };
            user.markModified('agentStats');
        }
        // D. Seed New Developments (From your Image)
        await Development.deleteMany({});
        await Development.insertMany([
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
        ]);

        const savedUser = await user.save();
        res.json({ success: true, message: `Database successfully updated for ${userRole}!`, user: savedUser });
        
    } catch (err) {
        console.error("Seed Error:", err);
        res.status(500).json({ success: false, message: "Seed failed: " + err.message });
    }
});

// 1. GET ALL USERS (Admin Only)
router.get('/', async (req, res) => {
    try {
        const users = await User.find({}, '-password'); // Exclude passwords for security
        res.status(200).json(users);
    } catch (err) {
        res.status(500).json(err);
    }
});

// 2. GET ALL NEWS
router.get('/news', async (req, res) => {
    try {
        const news = await News.find().sort({ createdAt: -1 });
        res.status(200).json(news);
    } catch (err) {
        res.status(500).json(err);
    }
});

// 3. GET ALL TRENDS
router.get('/trends', async (req, res) => {
    try {
        const trends = await MarketTrend.find();
        res.status(200).json(trends);
    } catch (err) {
        res.status(500).json(err);
    }
});

// 4. DELETE A USER
router.delete('/users/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "User deleted" });
    } catch (err) { res.status(500).json(err); }
});

// 5. DELETE A PROPERTY
router.delete('/properties/:id', async (req, res) => {
    try {
        await Property.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Property deleted" });
    } catch (err) { res.status(500).json(err); }
});

// 6. DELETE NEWS
router.delete('/news/:id', async (req, res) => {
    try {
        await News.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "News deleted" });
    } catch (err) { res.status(500).json(err); }
});

// 7. DELETE TRENDS
router.delete('/trends/:id', async (req, res) => {
    try {
        await MarketTrend.findByIdAndDelete(req.params.id);
        res.status(200).json({ success: true, message: "Trend deleted" });
    } catch (err) { res.status(500).json(err); }
});

// 8. ADD NEW PROPERTY
router.post('/properties', async (req, res) => {
    try {
        const newProperty = new Property({
            title: req.body.title,
            location: req.body.location,
            price: req.body.price,
            matchPercentage: req.body.matchPercentage,
            imageUrl: req.body.imageUrl,
            specs: {
                beds: req.body.beds,
                baths: req.body.baths,
                sqft: req.body.sqft
            }
        });
        const savedProperty = await newProperty.save();
        res.status(200).json({ success: true, data: savedProperty });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 9. ADD NEW NEWS ARTICLE
router.post('/news', async (req, res) => {
    try {
        const newNews = new News(req.body); // req.body now contains content, tags, etc.
        const savedNews = await newNews.save();
        res.status(200).json({ success: true, data: savedNews });
    } catch (err) { res.status(500).json(err); }
});

// 10. ADD NEW MARKET TREND
router.post('/trends', async (req, res) => {
    try {
        const newTrend = new MarketTrend({
            country: req.body.country,
            status: req.body.status,
            color: req.body.color || "#00c2cb", // Default teal if not provided
            priceChange: req.body.priceChange
        });
        const savedTrend = await newTrend.save();
        res.status(200).json({ success: true, data: savedTrend });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// 11. UPDATE USER
router.put('/users/:id', async (req, res) => {
    try {
        // Find user and update with the new data from the frontend
        const updatedUser = await User.findByIdAndUpdate(
            req.params.id, 
            { $set: req.body }, 
            { new: true } // Returns the modified document
        );
        res.status(200).json({ success: true, data: updatedUser });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
});

// GET SINGLE NEWS ARTICLE
router.get('/news/:id', async (req, res) => {
    try {
        const article = await News.findById(req.params.id);
        if (!article) return res.status(404).json("Article not found");
        res.status(200).json(article);
    } catch (err) {
        res.status(500).json(err);
    }
});

// GET ALL PROPERTIES (With Search Capability)
router.get('/properties', async (req, res) => {
    try {
        const { search } = req.query;
        let query = {};

        // If search term exists, filter by Title, Location, or Type
        if (search) {
            const regex = new RegExp(search, 'i'); // Case-insensitive regex
            query = {
                $or: [
                    { title: regex },
                    { location: regex },
                    { type: regex }
                ]
            };
        }

        const properties = await Property.find(query);
        res.status(200).json(properties);
    } catch (err) {
        res.status(500).json(err);
    }
});

// PUT /:id — agency actions: add-branch, add-agent, update-agent-targets (client calls PUT /api/users/:id)
router.put('/:id', async (req, res) => {
    try {
        const id = req.params.id;
        const { action } = req.body;
        const user = await User.findById(id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        if (action === 'add-branch') {
            const { name, address } = req.body;
            if (!name || !name.trim()) return res.status(400).json({ message: 'Branch name is required' });
            if (!user.agencyStats) user.agencyStats = { branches: [], topAgents: [] };
            if (!user.agencyStats.branches) user.agencyStats.branches = [];
            const branch = { _id: new require('mongoose').Types.ObjectId(), name: name.trim(), address: (address || '').trim() };
            user.agencyStats.branches.push(branch);
            user.markModified('agencyStats');
            await user.save();
            return res.status(200).json({ success: true, branches: user.agencyStats.branches });
        }

        if (action === 'add-agent') {
            const { agentData } = req.body;
            if (!agentData || !agentData.firstName?.trim() || !agentData.lastName?.trim() || !agentData.email) {
                return res.status(400).json({ message: 'Name, Surname and Email are required' });
            }
            if (!agentData.branchId) return res.status(400).json({ message: 'Please select or create a branch first' });
            if (!user.agencyStats) user.agencyStats = { topAgents: [], branches: [] };
            if (!user.agencyStats.topAgents) user.agencyStats.topAgents = [];
            const isAgencyBranch = String(agentData.branchId) === '__agency__' || String(agentData.branchId) === String(user._id);
            const branch = isAgencyBranch ? null : (user.agencyStats.branches || []).find((b) => String(b._id) === String(agentData.branchId));
            const agencyDisplay = sanitizeAgencyBranch(user.agencyName || user.name || '') || 'Agency';
            const branchName = isAgencyBranch ? agencyDisplay : (sanitizeAgencyBranch(branch ? branch.name : '') || (branch ? branch.name : 'Main HQ') || 'Main HQ');
            const branchId = isAgencyBranch ? String(user._id) : String(agentData.branchId);
            const agentEntry = {
                name: `${(agentData.firstName || '').trim()} ${(agentData.lastName || '').trim()}`.trim(),
                email: agentData.email,
                branchId,
                branch: branchName,
                status: 'invited',
                _id: null
            };
            if (agentData.photo) agentEntry.photo = agentData.photo;
            user.agencyStats.topAgents.push(agentEntry);
            user.agencyStats.activeAgents = user.agencyStats.topAgents.length;
            user.markModified('agencyStats');
            await user.save();
            return res.status(200).json({ success: true, agents: user.agencyStats.topAgents });
        }

        if (action === 'update-agent-targets') {
            const { agentId, agentEmail, name, email, monthlyTarget, commissionRate, branchId, agencyName: agencyNamePayload } = req.body;
            if (!agentId && !agentEmail) return res.status(400).json({ message: 'agentId or agentEmail is required' });
            const agencyDisplayDefault = sanitizeAgencyBranch(user.agencyName || user.name || '') || 'Agency';
            const topAgents = user.agencyStats?.topAgents || [];
            let idx = -1;
            if (agentId) idx = topAgents.findIndex((a) => String(a._id) === String(agentId) || String(a.id) === String(agentId));
            if (idx === -1 && (agentEmail || '').trim()) idx = topAgents.findIndex((a) => (a.email || '').toLowerCase().trim() === String(agentEmail).toLowerCase().trim());
            if (idx === -1) return res.status(404).json({ message: 'Agent not found in agency' });
            if (name !== undefined) topAgents[idx].name = name;
            if (email !== undefined) topAgents[idx].email = email;
            if (monthlyTarget !== undefined) topAgents[idx].monthlyTarget = monthlyTarget == null || monthlyTarget === '' ? null : Number(monthlyTarget);
            if (commissionRate !== undefined) topAgents[idx].commissionRate = commissionRate == null || commissionRate === '' ? null : Number(commissionRate);
            if (branchId !== undefined && branchId !== null && String(branchId).trim() !== '') {
                const bid = String(branchId).trim();
                const isAgencyBranch = bid === '__agency__' || bid === String(user._id);
                const branch = isAgencyBranch ? null : (user.agencyStats?.branches || []).find((b) => String(b._id) === bid);
                const branchName = isAgencyBranch ? agencyDisplayDefault : (sanitizeAgencyBranch(branch ? branch.name : '') || (branch ? branch.name : 'Main HQ') || 'Main HQ');
                topAgents[idx].branchId = isAgencyBranch ? String(user._id) : bid;
                topAgents[idx].branch = branchName;
            }
            user.markModified('agencyStats');
            await user.save();
            const agentUpdates = {};
            if (monthlyTarget !== undefined && topAgents[idx]._id) agentUpdates.monthlyRevenueTarget = topAgents[idx].monthlyTarget;
            if (branchId !== undefined && branchId !== null && String(branchId).trim() !== '' && topAgents[idx]._id) {
                const bid = String(branchId).trim();
                const isAgencyBranch = bid === '__agency__' || bid === String(user._id);
                const branch = isAgencyBranch ? null : (user.agencyStats?.branches || []).find((b) => String(b._id) === bid);
                const branchName = isAgencyBranch ? agencyDisplayDefault : (sanitizeAgencyBranch(branch ? branch.name : '') || (branch ? branch.name : 'Main HQ') || 'Main HQ');
                agentUpdates.branchId = isAgencyBranch ? String(user._id) : bid;
                agentUpdates.branchName = branchName;
            }
            if (agencyNamePayload !== undefined && topAgents[idx]._id) {
                agentUpdates.agencyName = sanitizeAgencyBranch(String(agencyNamePayload || '').trim()) || agencyDisplayDefault;
            }
            if (Object.keys(agentUpdates).length > 0 && topAgents[idx]._id) {
                await User.findByIdAndUpdate(topAgents[idx]._id, { $set: agentUpdates });
            }
            const fresh = await User.findById(id).select('agencyStats.topAgents').lean();
            const agents = (fresh?.agencyStats?.topAgents || []).map((a) => ({ ...a, _id: a._id, id: a._id ? String(a._id) : a.id }));
            return res.status(200).json({ success: true, agents: agents.length ? agents : user.agencyStats.topAgents });
        }

        // No action or generic profile update (e.g. from Settings)
        const { name, email, phone, location, bio, photo, monthlyRevenueTarget, notifyOffMarket, notifyShareWithAgencies } = req.body;
        if (name !== undefined) user.name = name;
        if (email !== undefined) user.email = email;
        if (phone !== undefined) user.phone = phone;
        if (location !== undefined) user.location = location;
        if (bio !== undefined) user.bio = bio;
        if (photo !== undefined) user.photo = photo;
        if (monthlyRevenueTarget !== undefined) user.monthlyRevenueTarget = monthlyRevenueTarget == null || monthlyRevenueTarget === '' ? null : Number(monthlyRevenueTarget);
        if (notifyOffMarket !== undefined) user.notifyOffMarket = !!notifyOffMarket;
        if (notifyShareWithAgencies !== undefined) user.notifyShareWithAgencies = !!notifyShareWithAgencies;
        await user.save();
        return res.status(200).json({ success: true, user: sanitizeUserForClient(user) });
    } catch (err) {
        console.error('PUT /:id error:', err);
        return res.status(500).json({ message: err.message });
    }
});

// GET SINGLE USER BY ID (also handles ?type=dashboard and ?type=saved for client compatibility)
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ message: 'User not found' });

        const { type } = req.query;
        const id = req.params.id;

        // type=saved: return saved properties (populated)
        if (type === 'saved') {
            const userWithSaved = await User.findById(id).populate('savedProperties');
            return res.status(200).json(userWithSaved.savedProperties || []);
        }

        // type=listings: lightweight payload for Listing Management (Express was missing this; Vercel api/users has it)
        if (type === 'listings') {
            res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            res.setHeader('Pragma', 'no-cache');
            // ?slim=1 — drop heavy media + non-area_housing metadata. Used by Prospecting.
            const slim = String(req.query?.slim || '').trim() === '1';
            const trimProp = (p) => {
                if (!p) return p;
                const out = { ...p };
                delete out.media;
                delete out.imageGallery;
                if (out.listingMetadata && typeof out.listingMetadata === 'object') {
                    out.listingMetadata = {
                        area_housing: out.listingMetadata.area_housing,
                        property: out.listingMetadata.property,
                    };
                }
                return out;
            };
            const listingUser = await User.findById(id).lean();
            if (!listingUser) return res.status(404).json({ message: 'User not found' });
            const listingRole = (listingUser.role || '').toLowerCase();
            if (listingRole === 'agency') {
                const propFilter = await agencyListingPropertyFilter(id);
                const [agentPropsRaw, agencyMembers] = await Promise.all([
                    Property.find(propFilter).sort({ createdAt: -1 }).limit(200).lean(),
                    User.find({ agencyId: id }).select('_id name email').lean(),
                ]);
                const agentProps = slim ? agentPropsRaw.map(trimProp) : agentPropsRaw;
                const nameMap = {};
                (agencyMembers || []).forEach((u) => {
                    nameMap[String(u._id)] = u.name || u.email || 'Agent';
                });
                nameMap[String(id)] = listingUser.name || 'Agency';
                const topAgents = (listingUser.agencyStats?.topAgents || []).map((a) => {
                    const aid = a._id ? String(a._id) : (a.id ? String(a.id) : null);
                    return { _id: aid, id: aid, name: nameMap[aid] || a.name || a.email || 'Agent' };
                });
                const crmLeads = listingUser.agencyStats?.crmLeads || [];
                return res.status(200).json({
                    agentProperties: agentProps,
                    stats: { topAgents, crmLeads },
                    agentStats: { crmLeads },
                });
            }
            if (listingRole === 'agency_agent' || listingRole === 'independent_agent' || listingRole === 'agent') {
                const agentPropsRaw = await Property.find({ agentId: id }).sort({ createdAt: -1 }).limit(200).lean();
                const agentProps = slim ? agentPropsRaw.map(trimProp) : agentPropsRaw;
                let crmLeads = listingUser.agentStats?.crmLeads || [];
                // Build a topAgents-style roster so the Under Negotiation
                // modal's listing-agent picker has options. Agency agents see
                // their full agency roster; sole agents just see themselves.
                const selfEntry = {
                    _id: String(listingUser._id),
                    id: String(listingUser._id),
                    name: listingUser.name || listingUser.email || 'Me',
                };
                let topAgents = [selfEntry];
                if (listingRole === 'agency_agent' && listingUser.agencyId) {
                    const [agency, agencyMembers] = await Promise.all([
                        User.findById(listingUser.agencyId).select('agencyStats.crmLeads agencyStats.topAgents name').lean(),
                        User.find({ agencyId: listingUser.agencyId }).select('_id name email').lean(),
                    ]);
                    const agencyLeads = agency?.agencyStats?.crmLeads || [];
                    const currentUserIdStr = String(id);
                    crmLeads = agencyLeads.filter((l) => String(l?.assignedAgentId || '').trim() === currentUserIdStr);
                    const memberMap = {};
                    (agencyMembers || []).forEach((u) => {
                        memberMap[String(u._id)] = u.name || u.email || 'Agent';
                    });
                    const seenIds = new Set([currentUserIdStr]);
                    const topRoster = (agency?.agencyStats?.topAgents || [])
                        .map((a) => {
                            const aid = a._id ? String(a._id) : (a.id ? String(a.id) : null);
                            if (!aid) return null;
                            return { _id: aid, id: aid, name: memberMap[aid] || a.name || a.email || 'Agent' };
                        })
                        .filter((a) => a && !seenIds.has(a.id) && (seenIds.add(a.id) || true));
                    topAgents = [selfEntry, ...topRoster];
                    const agencyIdStr = String(listingUser.agencyId);
                    if (!seenIds.has(agencyIdStr)) {
                        topAgents.push({ _id: agencyIdStr, id: agencyIdStr, name: `${agency?.name || 'Agency'} (Agency)` });
                    }
                }
                return res.status(200).json({
                    agentProperties: agentProps,
                    stats: { topAgents, crmLeads },
                    agentStats: { crmLeads },
                });
            }
            return res.status(200).json({
                agentProperties: [],
                stats: { topAgents: [], crmLeads: [] },
                agentStats: { crmLeads: [] },
            });
        }

        // type=dashboard: return dashboard data with portfolio merged from uploaded properties (same as /dashboard/:id)
        if (type === 'dashboard') {
            const viewerId = getAuthUserIdFromReq(req);
            if (!viewerId) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            const targetId = String(id);
            if (viewerId !== targetId) {
                const viewer = await User.findById(viewerId).select('role').lean();
                if (!viewer) return res.status(401).json({ message: 'Invalid session' });
                const vRole = (viewer.role || '').toLowerCase();
                if (vRole !== 'agency') {
                    return res.status(403).json({ message: 'Forbidden' });
                }
                const targetRoleEarly = (user.role || '').toLowerCase();
                const isDelegatedAgent = targetRoleEarly === 'agency_agent' || targetRoleEarly === 'agent';
                const belongsToAgency = user.agencyId && String(user.agencyId) === viewerId;
                if (!isDelegatedAgent || !belongsToAgency) {
                    return res.status(403).json({ message: 'Forbidden' });
                }
            }
            const role = user.role ? user.role.toLowerCase() : 'investor';
            let marketTrends = [];
            let newsFeeds = [];
            try {
                newsFeeds = await News.find().sort({ createdAt: -1 }).limit(3);
            } catch (e) { console.log('External data fetch skipped'); }

            // Market trends: always from server/data/marketTrendsMonthly.json (no DB, no external API). Sentiment from YoY so labels match graph.
            const monthlyActuals = loadMarketTrendsMonthly();
            const TREND_COUNTRIES = ['South Africa', 'Dubai', 'London', 'Netherlands'];
            marketTrends = TREND_COUNTRIES.map((country) => {
                const normalized = monthlyActuals[country];
                const yoyPercent = (normalized && normalized.yoyPercent) ? normalized.yoyPercent : '';
                const sentiment = (yoyPercent !== '') ? getSentimentFromYoY(yoyPercent) : 'Stable';
                return {
                    country,
                    status: sentiment,
                    color: undefined,
                    priceChange: yoyPercent,
                    monthlyData: (normalized && normalized.monthlyData) ? normalized.monthlyData : [],
                    yoyPercent,
                    sourceText: (normalized && normalized._source) ? normalized._source : undefined
                };
            });

            let uploadedForPortfolio = [];
            try {
                const uploadedProps = await Property.find({ agentId: id }).sort({ createdAt: -1 }).lean();
                uploadedForPortfolio = uploadedProps.map((p) => mapPropertyToPortfolioItem(p));
            } catch (e) { console.log('Fetch uploaded properties skipped:', e.message); }

            const basePortfolio = user.portfolio || [];
            const uploadedIds = new Set((uploadedForPortfolio || []).map((p) => String(p.details?._id)));
            let mergedPortfolio = [...uploadedForPortfolio];
            const refIdsToFetch = basePortfolio
                .map((item) => item.details?._id)
                .filter(Boolean)
                .filter((refId) => !uploadedIds.has(String(refId)));
            let propertyMap = {};
            if (refIdsToFetch.length > 0) {
                const refs = await Property.find({ _id: { $in: refIdsToFetch } }).lean();
                refs.forEach((p) => { propertyMap[String(p._id)] = p; });
            }
            for (const item of basePortfolio) {
                const refId = item.details?._id;
                if (refId && !uploadedIds.has(String(refId))) {
                    const full = propertyMap[String(refId)];
                    if (full) {
                        mergedPortfolio.push(mapPropertyToPortfolioItem(full));
                        uploadedIds.add(String(refId));
                        continue;
                    }
                }
                mergedPortfolio.push(item);
            }

            let responseData = {
                role: user.role,
                name: user.name,
                marketTrends,
                newsFeeds,
                portfolio: mergedPortfolio
            };

            if (role.includes('investor') || role.includes('buyer') || role.includes('seller') || role.includes('agent')) {
                const vaultCount = await File.countDocuments({ userId: String(id) });
                responseData.vaultCount = vaultCount;
                const totalInvested = mergedPortfolio.reduce((acc, item) => acc + (item.investedAmount || 0), 0);
                const currentValue = mergedPortfolio.reduce((acc, item) => acc + (item.currentValue || 0), 0);
                responseData.stats = {
                    currentValue,
                    totalInvested,
                    totalProfit: currentValue - totalInvested,
                    avgRoi: mergedPortfolio.length > 0
                        ? (mergedPortfolio.reduce((acc, i) => acc + (i.roi || 0), 0) / mergedPortfolio.length)
                        : 0,
                    totalProperties: mergedPortfolio.length
                };
                responseData.data = mergedPortfolio;
                if (role === 'independent_agent' || role === 'agency_agent') {
                    let crmLeads = user.agentStats?.crmLeads || [];
                    if (role === 'agency_agent' && user.agencyId) {
                        const agency = await User.findById(user.agencyId).lean();
                        const agencyLeads = agency?.agencyStats?.crmLeads || [];
                        const currentUserIdStr = (user._id != null ? String(user._id) : String(id)).trim();
                        const norm = (val) => (val != null && typeof val === 'object' && typeof val.toString === 'function' ? val.toString() : String(val || '')).trim();
                        crmLeads = agencyLeads.filter((l) => norm(l.assignedAgentId) === currentUserIdStr);
                    }
                    const agentPropsCount = await Property.countDocuments({ agentId: id, status: { $in: ['Published', 'Under Offer', 'Sold'] } });
                    const soldList = await Property.find(
                        { agentId: id, status: 'Sold', salePrice: { $exists: true, $ne: null } }
                    ).select('salePrice saleDate pricing.currency').lean();
                    const sales = (soldList || []).map((p) => ({
                        salePrice: p.salePrice,
                        currency: (p.pricing && p.pricing.currency) || 'USD',
                        saleDate: p.saleDate
                    }));
                    const myAgentProps = await Property.find({ agentId: id }).sort({ createdAt: -1 }).limit(200).lean();
                    responseData.agentProperties = myAgentProps;
                    responseData.agentStats = {
                        ...(user.agentStats || {}),
                        crmLeads,
                        totalListings: agentPropsCount,
                        activeLeads: (crmLeads || []).length
                    };
                    responseData.stats = { ...responseData.stats, ...responseData.agentStats };
                    responseData.sales = sales;
                    responseData.monthlyRevenueTarget = user.monthlyRevenueTarget != null ? user.monthlyRevenueTarget : null;
                    responseData.agencyName = user.agencyName;
                    responseData.branchName = user.branchName;
                }
            } else if (role === 'agency') {
                responseData.vaultCount = await File.countDocuments({ userId: String(id) });
                const agencyCrmLeads = user.agencyStats?.crmLeads || [];
                responseData.stats = {
                    totalRevenue: user.agencyStats?.totalRevenue || 0,
                    propertiesSold: user.agencyStats?.propertiesSold || 0,
                    activeAgents: user.agencyStats?.activeAgents || 0,
                    totalListings: user.agencyStats?.totalListings || 0,
                    activeLeads: agencyCrmLeads.length,
                    topAgents: user.agencyStats?.topAgents || [],
                    pipelineColumns: user.agencyStats?.pipelineColumns || [],
                    pipelineDeals: user.agencyStats?.pipelineDeals || [],
                    crmLeads: agencyCrmLeads
                };
                responseData.agentStats = responseData.stats;
                const mongoose = require('mongoose');
                const fromTopAgents = (user.agencyStats?.topAgents || []).map((a) => a._id || a.id).filter(Boolean).map((aid) => String(aid));
                const agencyMembers = await User.find({ agencyId: id }).select('_id email name').lean();
                const agencyMemberIdByEmailOrName = {};
                (agencyMembers || []).forEach((u) => {
                    const uid = String(u._id);
                    if (u.email) agencyMemberIdByEmailOrName[(String(u.email)).toLowerCase().trim()] = uid;
                    if (u.name) agencyMemberIdByEmailOrName[(String(u.name)).toLowerCase().trim()] = uid;
                });
                const fromAgencyMembers = (agencyMembers || []).map((u) => String(u._id)).filter(Boolean);
                const agentIds = [String(id), ...new Set([...fromTopAgents, ...fromAgencyMembers])];
                if (agentIds.length > 0) {
                    // Enrich with live User photo/name so agency dashboard shows updated agent photos
                    const validAgentObjectIds = agentIds.filter((aid) => mongoose.Types.ObjectId.isValid(aid)).map((aid) => new mongoose.Types.ObjectId(aid));
                    const liveAgents = await User.find({ _id: { $in: validAgentObjectIds } }).select('_id name photo branchName').lean();
                    const liveByAgentId = {};
                    (liveAgents || []).forEach((u) => { liveByAgentId[String(u._id)] = { name: u.name, photo: u.photo, branchName: u.branchName }; });

                    const agencyPropFilter = await agencyListingPropertyFilter(id);
                    const agentProps = await Property.find(agencyPropFilter).sort({ createdAt: -1 }).lean();
                    responseData.agentProperties = agentProps;
                    // Counters on user.agencyStats (e.g. totalListings: 85 from seed) drift — headline stats must match DB
                    responseData.stats.totalListings = agentProps.length;
                    const soldProps = await Property.find({
                        $and: [
                            agencyPropFilter,
                            { status: 'Sold' },
                            { salePrice: { $exists: true, $ne: null } },
                        ],
                    }).select('salePrice saleDate pricing.currency agentId').lean();
                    const sales = (soldProps || []).map((p) => ({
                        salePrice: p.salePrice,
                        currency: (p.pricing && p.pricing.currency) || 'USD',
                        saleDate: p.saleDate,
                        agentId: p.agentId ? String(p.agentId) : null
                    }));
                    responseData.sales = sales;
                    const now = new Date();
                    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
                    const revenueByAgent = {};
                    const thisMonthByAgent = {};
                    const totalClosedCountByAgent = {};
                    agentIds.forEach((aid) => { revenueByAgent[aid] = 0; thisMonthByAgent[aid] = 0; totalClosedCountByAgent[aid] = 0; });
                    soldProps.forEach((p) => {
                        const aid = p.agentId ? String(p.agentId) : null;
                        if (aid && revenueByAgent[aid] != null) {
                            revenueByAgent[aid] += p.salePrice || 0;
                            totalClosedCountByAgent[aid] = (totalClosedCountByAgent[aid] || 0) + 1;
                            if (p.saleDate && new Date(p.saleDate) >= thisMonthStart) thisMonthByAgent[aid] += p.salePrice || 0;
                        }
                    });
                    // Bucket per-agent listing + lead counts so topAgents can carry pipeline signals
                    const totalListingsByAgent = {};
                    (agentProps || []).forEach((p) => {
                        const aid = p.agentId ? String(p.agentId) : null;
                        if (!aid) return;
                        totalListingsByAgent[aid] = (totalListingsByAgent[aid] || 0) + 1;
                    });
                    const leadCountByAgentId = {};
                    (user.agencyStats?.crmLeads || []).forEach((l) => {
                        const aid = l.assignedAgentId ? String(l.assignedAgentId) : null;
                        if (!aid) return;
                        leadCountByAgentId[aid] = (leadCountByAgentId[aid] || 0) + 1;
                    });

                    const topAgents = (user.agencyStats?.topAgents || []).map((a) => {
                        const raw = (a && typeof a.toObject === 'function') ? a.toObject() : { ...(a || {}) };
                        const aid = raw._id ? String(raw._id) : (raw.id ? String(raw.id) : null)
                            || agencyMemberIdByEmailOrName[(String(raw.email || '')).toLowerCase().trim()]
                            || agencyMemberIdByEmailOrName[(String(raw.name || '')).toLowerCase().trim()] || null;
                        const live = aid ? liveByAgentId[aid] : null;
                        const totalSales = aid ? (revenueByAgent[aid] || 0) : 0;
                        const thisMonth = aid ? (thisMonthByAgent[aid] || 0) : 0;
                        const closedCount = aid ? (totalClosedCountByAgent[aid] || 0) : 0;
                        const totalListings = aid ? (totalListingsByAgent[aid] || 0) : 0;
                        const leadCount = aid ? (leadCountByAgentId[aid] || 0) : 0;
                        const monthlyTarget = raw.monthlyTarget != null ? raw.monthlyTarget : 0;
                        const percentOfTarget = monthlyTarget > 0 ? Math.round((thisMonth / monthlyTarget) * 100) : null;
                        return {
                            ...raw,
                            _id: aid || raw._id,
                            id: aid || raw.id,
                            name: live?.name ?? raw.name,
                            photo: live?.photo ?? raw.photo,
                            branch: (live?.branchName != null && live.branchName !== '') ? live.branchName : (raw.branch ?? raw.branchName),
                            branchName: (live?.branchName != null && live.branchName !== '') ? live.branchName : (raw.branchName ?? raw.branch),
                            totalSales,
                            closedCount,
                            // Pipeline signals — surfaced so the Agents tab KPI tiles
                            // ("deals in pipeline", "low activity") can derive real counts.
                            totalListings,
                            activeListings: totalListings,
                            leadCount,
                            activeLeads: leadCount,
                            revenueThisMonth: thisMonth,
                            monthlyTarget,
                            percentOfTarget
                        };
                    });
                    responseData.stats.topAgents = topAgents;
                    responseData.agentStats.topAgents = topAgents;
                    const combinedMonthlyTarget = topAgents.reduce((sum, a) => sum + (a.monthlyTarget || 0), 0);
                    const combinedThisMonth = topAgents.reduce((sum, a) => sum + (a.revenueThisMonth || 0), 0);
                    responseData.combinedMonthlyTarget = combinedMonthlyTarget;
                    responseData.combinedRevenueThisMonth = combinedThisMonth;
                } else {
                    responseData.agentProperties = [];
                    responseData.sales = [];
                    responseData.combinedMonthlyTarget = 0;
                    responseData.combinedRevenueThisMonth = 0;
                }
            } else {
                responseData.vaultCount = await File.countDocuments({ userId: String(id) });
                responseData.agentStats = {
                    myCommission: user.agentStats?.myCommission || 0,
                    activeListings: user.agentStats?.activeListings || 0,
                    pendingDeals: user.agentStats?.pendingDeals || 0,
                    meetingsScheduled: user.agentStats?.meetingsScheduled || 0,
                    recentLeads: user.agentStats?.recentLeads || [],
                    pipelineColumns: user.agentStats?.pipelineColumns || [],
                    pipelineDeals: user.agentStats?.pipelineDeals || [],
                    crmLeads: user.agentStats?.crmLeads || []
                };
                responseData.stats = responseData.agentStats;
            }

            return res.status(200).json(responseData);
        }

        // Default: return user without password or integration secrets
        res.status(200).json(sanitizeUserForClient(user));
    } catch (err) {
        res.status(500).json(err);
    }
});

// ADD NEW AGENT TO AGENCY
router.post('/add-agent', async (req, res) => {
    const { userId, agentData } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "Agency not found" });

        // Add to the topAgents array
        user.agencyStats.topAgents.push(agentData);
        
        // Update total active agents count
        user.agencyStats.activeAgents = user.agencyStats.topAgents.length;

        await user.save();
        res.status(200).json({ success: true, agents: user.agencyStats.topAgents });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

router.get('/dashboard/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        // 1. Normalize Role
        const role = user.role ? user.role.toLowerCase() : 'investor';

        // 2. Fetch Optional External Data (Trends/News)
        let marketTrends = [];
        let newsFeeds = [];
        try {
            // Uncomment if you have these models defined
            // marketTrends = await MarketTrend.find().limit(4);
            // newsFeeds = await News.find().sort({ createdAt: -1 }).limit(3);
        } catch (e) { console.log("External data fetch skipped"); }

        // 3. Fetch properties uploaded by this user (from Property collection) and merge into portfolio
        let uploadedForPortfolio = [];
        try {
            const uploadedProps = await Property.find({ agentId: req.params.id }).sort({ createdAt: -1 }).lean();
            uploadedForPortfolio = uploadedProps.map((p) => mapPropertyToPortfolioItem(p));
        } catch (e) { console.log("Fetch uploaded properties skipped:", e.message); }

        const basePortfolio = user.portfolio || [];
        const uploadedIds = new Set((uploadedForPortfolio || []).map((p) => String(p.details?._id)));
        let mergedPortfolio = [...uploadedForPortfolio];
        const refIdsToFetch = basePortfolio
            .map((item) => item.details?._id)
            .filter(Boolean)
            .filter((refId) => !uploadedIds.has(String(refId)));
        let propertyMap = {};
        if (refIdsToFetch.length > 0) {
            const refs = await Property.find({ _id: { $in: refIdsToFetch } }).lean();
            refs.forEach((p) => { propertyMap[String(p._id)] = p; });
        }
        for (const item of basePortfolio) {
            const refId = item.details?._id;
            if (refId && !uploadedIds.has(String(refId))) {
                const full = propertyMap[String(refId)];
                if (full) {
                    mergedPortfolio.push(mapPropertyToPortfolioItem(full));
                    uploadedIds.add(String(refId));
                    continue;
                }
            }
            mergedPortfolio.push(item);
        }

        // 4. Base Response Object (merged portfolio so uploads show in My Portfolio)
        let responseData = {
            role: user.role,
            name: user.name,
            marketTrends: marketTrends,
            newsFeeds: newsFeeds,
            portfolio: mergedPortfolio
        };
        const vaultCount = await File.countDocuments({ userId: String(req.params.id) });

        // ===============================================
        //  LOGIC: INVESTOR / BUYER / SELLER / AGENT (portfolio stats; portfolio already merged above)
        // ===============================================
        if (role.includes('investor') || role.includes('buyer') || role.includes('seller') || role.includes('agent')) {
            responseData.vaultCount = vaultCount;
            const totalInvested = mergedPortfolio.reduce((acc, item) => acc + (item.investedAmount || 0), 0);
            const currentValue = mergedPortfolio.reduce((acc, item) => acc + (item.currentValue || 0), 0);
            responseData.stats = {
                currentValue: currentValue,
                totalInvested: totalInvested,
                totalProfit: currentValue - totalInvested,
                avgRoi: mergedPortfolio.length > 0
                    ? (mergedPortfolio.reduce((acc, i) => acc + (i.roi || 0), 0) / mergedPortfolio.length)
                    : 0,
                totalProperties: mergedPortfolio.length
            };
            responseData.data = mergedPortfolio;
        }
        
        // ===============================================
        //  LOGIC: AGENCY (agency stats; portfolio already merged above for My Portfolio)
        // ===============================================
        else if (role === 'agency') {
            responseData.vaultCount = vaultCount;
            const agencyCrmLeadsDashboard = user.agencyStats?.crmLeads || [];
            responseData.stats = {
                totalRevenue: user.agencyStats.totalRevenue || 0,
                propertiesSold: user.agencyStats.propertiesSold || 0,
                activeAgents: user.agencyStats.activeAgents || 0,
                totalListings: user.agencyStats.totalListings || 0,
                activeLeads: agencyCrmLeadsDashboard.length,
                topAgents: user.agencyStats.topAgents || [],
                // Detailed Pipeline Data
                pipelineColumns: user.agencyStats.pipelineColumns || [],
                pipelineDeals: user.agencyStats.pipelineDeals || [],
                crmLeads: agencyCrmLeadsDashboard
            };
            // Map to agentStats key as well for compatibility
            responseData.agentStats = responseData.stats;
        } 

        // ===============================================
        //  LOGIC: AGENT
        // ===============================================
        else {
            responseData.vaultCount = vaultCount;

            responseData.agentStats = {
                myCommission: user.agentStats.myCommission || 0,
                activeListings: user.agentStats.activeListings || 0,
                pendingDeals: user.agentStats.pendingDeals || 0,
                meetingsScheduled: user.agentStats.meetingsScheduled || 0,
                recentLeads: user.agentStats.recentLeads || [],
                // Detailed Pipeline Data
                pipelineColumns: user.agentStats.pipelineColumns || [],
                pipelineDeals: user.agentStats.pipelineDeals || [],
                crmLeads: user.agentStats.crmLeads || []
            };
            // Fallback stats key
            responseData.stats = responseData.agentStats;
        }

        res.status(200).json(responseData);

    } catch (err) {
        console.error("Dashboard Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
});

// 2. ADD PROPERTY TO PORTFOLIO
router.post('/add-portfolio', async (req, res) => {
    const { userId, propertyData } = req.body;
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        // Add to portfolio array
        user.portfolio.push(propertyData);
        
        await user.save();
        res.status(200).json({ success: true, portfolio: user.portfolio });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// ADD CRM LEAD (agency: agencyStats.crmLeads on user; agency_agent / independent_agent: agentStats.crmLeads on user – same pattern)
const crypto = require('crypto');
function buildChangedBy(user, agency) {
    const name = user.name || user.email || 'Unknown';
    const role = (user.role || '').toLowerCase();
    const changedBy = { userId: String(user._id), name, role };
    if (role === 'agency_agent' && agency) changedBy.agencyName = agency.name || agency.agencyName || null;
    if (role === 'agency') changedBy.agencyName = user.name || user.agencyName || null;
    return changedBy;
}
function createActivity(activity, changedBy) {
    return { actionId: crypto.randomUUID(), datetime: new Date().toISOString(), activity, changedBy };
}
async function addLeadHandler(req, res) {
    const { userId: bodyUserId, lead } = req.body || {};
    let userId = bodyUserId;
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader && String(authHeader).startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (token) {
        try {
            const jwt = require('jsonwebtoken');
            const secret = process.env.JWT_SECRET || 'SECRET_KEY_123';
            const decoded = jwt.verify(token, secret);
            userId = decoded.id || decoded.userId || decoded.sub;
            if (userId) userId = String(userId);
        } catch (e) {
            return res.status(401).json({ message: 'Invalid or expired token' });
        }
    }
    if (!userId) return res.status(401).json({ message: 'Authorization required' });
    if (!lead) return res.status(400).json({ message: 'lead is required' });
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: "User not found" });

        const role = (user.role || '').toLowerCase();
        const agencyDoc = role === 'agency_agent' && user.agencyId ? await User.findById(user.agencyId).lean() : null;
        const changedBy = buildChangedBy(user, agencyDoc);
        const rawStatus = (lead.status || lead.initialStatus || 'new').toString().trim().toLowerCase();
        const validStatus = ['new', 'contacted', 'qualified', 'viewing_scheduled', 'viewing_completed', 'negotiation', 'under_contract', 'won', 'lost', 'on_hold'].includes(rawStatus) ? rawStatus : 'new';
        const id = 'lid_' + Date.now() + '_' + Math.random().toString(36).slice(2);
        // Mirror api/users/add-lead.js — accept buyer / seller / investor / prospect and
        // route the matching detail subdoc; default to buyer when unknown.
        const allowedLeadTypes = ['buyer', 'seller', 'investor', 'prospect'];
        const incomingLeadType = (lead.leadType || '').toString().trim().toLowerCase();
        const resolvedLeadType = allowedLeadTypes.includes(incomingLeadType) ? incomingLeadType : 'buyer';
        const initialActivity = lead.initialActivity && typeof lead.initialActivity === 'string' && lead.initialActivity.trim()
            ? lead.initialActivity.trim()
            : 'Lead created';
        const linkedProperties = [];
        if (lead.propertyId && (lead.propertyOfInterest || lead.propertyTitle)) {
            linkedProperties.push({ id: lead.propertyId, title: lead.propertyOfInterest || lead.propertyTitle || 'Property' });
        } else if (lead.propertyOfInterest) {
            linkedProperties.push({ id: null, title: lead.propertyOfInterest });
        }
        const dateAdded = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const newLead = {
            id,
            name: lead.name || `${(lead.firstName || '').trim()} ${(lead.lastName || '').trim()}`.trim() || 'Unknown',
            email: lead.email || '',
            mobile: lead.mobile || '',
            type: lead.propertyOfInterest || lead.type || '—',
            budget: lead.budget || '—',
            status: validStatus,
            lastContact: dateAdded,
            dateAdded,
            propertyOfInterest: lead.propertyOfInterest || '',
            propertyId: lead.propertyId ? String(lead.propertyId) : (linkedProperties[0]?.id ? String(linkedProperties[0].id) : null),
            source: lead.source || 'Inquiry',
            linkedProperties,
            activities: [createActivity(initialActivity, changedBy)],
            leadType: resolvedLeadType,
            buyerDetails: resolvedLeadType === 'buyer' && lead.buyerDetails ? lead.buyerDetails : undefined,
            sellerDetails: resolvedLeadType === 'seller' && lead.sellerDetails ? lead.sellerDetails : undefined,
            investorDetails: resolvedLeadType === 'investor' && lead.investorDetails ? lead.investorDetails : undefined,
            prospectDetails: resolvedLeadType === 'prospect' && lead.prospectDetails ? lead.prospectDetails : undefined
        };

        if (role === 'agency') {
            newLead.assignedAgentId = (lead.assignedAgentId && String(lead.assignedAgentId).trim()) || null;
            if (!user.agencyStats) user.agencyStats = { crmLeads: [] };
            if (!Array.isArray(user.agencyStats.crmLeads)) user.agencyStats.crmLeads = [];
            user.agencyStats.crmLeads.push(newLead);
            user.markModified('agencyStats');
            await user.save();
            return res.status(200).json({ success: true, lead: newLead, crmLeads: user.agencyStats.crmLeads });
        }

        if (role === 'agency_agent' && user.agencyId) {
            const agency = await User.findById(user.agencyId);
            if (!agency) return res.status(404).json({ message: 'Agency not found' });
            if (!agency.agencyStats) agency.agencyStats = { crmLeads: [] };
            if (!Array.isArray(agency.agencyStats.crmLeads)) agency.agencyStats.crmLeads = [];
            newLead.assignedAgentId = user._id.toString();
            agency.agencyStats.crmLeads.push(newLead);
            await agency.save();
            const crmLeads = agency.agencyStats.crmLeads.filter((l) => String(l.assignedAgentId || '') === String(userId));
            return res.status(200).json({ success: true, lead: newLead, crmLeads });
        }

        if (!user.agentStats) user.agentStats = { crmLeads: [] };
        if (!Array.isArray(user.agentStats.crmLeads)) user.agentStats.crmLeads = [];
        user.agentStats.crmLeads.push(newLead);
        await user.save();
        res.status(200).json({ success: true, lead: newLead, crmLeads: user.agentStats.crmLeads });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}
router.post('/add-lead', addLeadHandler);

async function bulkTransferHandler(req, res) {
    const { userId, fromAgentId, toAgentId } = req.body || {};
    if (!userId || !fromAgentId || !toAgentId) {
        return res.status(400).json({ message: 'userId, fromAgentId and toAgentId are required' });
    }
    if (String(fromAgentId) === String(toAgentId)) {
        return res.status(400).json({ message: 'From and to agent must be different' });
    }
    try {
        const user = await User.findById(userId);
        if (!user) return res.status(404).json({ message: 'User not found' });
        if ((user.role || '').toLowerCase() !== 'agency') {
            return res.status(403).json({ message: 'Only agencies can bulk transfer' });
        }
        const fromStr = String(fromAgentId);
        const toStr = String(toAgentId);
        const agencyIdStr = String(user._id);
        const topAgentIds = (user.agencyStats?.topAgents || []).map((a) => String(a._id || a.id)).filter(Boolean);
        const fromValid = topAgentIds.includes(fromStr);
        const toValid = toStr === agencyIdStr || topAgentIds.includes(toStr);
        if (!fromValid || !toValid) {
            return res.status(400).json({ message: 'From must be an agent in your agency; To must be Agency or another agent' });
        }
        let leadsTransferred = 0;
        if (user.agencyStats && Array.isArray(user.agencyStats.crmLeads)) {
            user.agencyStats.crmLeads.forEach((l) => {
                if (String(l.assignedAgentId || '') === fromStr) {
                    l.assignedAgentId = toStr;
                    leadsTransferred++;
                }
            });
            user.markModified('agencyStats');
            await user.save();
        }
        const propResult = await Property.updateMany(
            { agentId: fromAgentId },
            { $set: { agentId: toAgentId } }
        );
        const propertiesTransferred = propResult.modifiedCount || 0;
        return res.status(200).json({ success: true, leadsTransferred, propertiesTransferred });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
}
router.post('/bulk-transfer-agent', bulkTransferHandler);

module.exports = router;
module.exports.addLeadHandler = addLeadHandler;
module.exports.bulkTransferHandler = bulkTransferHandler;

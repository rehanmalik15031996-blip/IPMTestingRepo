// Vercel serverless function for single user operations
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');
const User = require('../../server/models/User');
const AgencyInvite = require('../../server/models/AgencyInvite');
const MarketTrend = require('../../server/models/MarketTrend');
const News = require('../../server/models/News');
const Property = require('../../server/models/Property'); // Required for populate('savedProperties')
const File = require('../../server/models/File');
const MatchScore = require('../../server/models/MatchScore');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { sanitizeAgencyBranch } = require('../../server/utils/display');
const { computeAgentTierAndScore, computeLeadScore } = require('../_lib/scoring');
const { interpretMarketTrend, getSentimentFromYoY } = require('../_lib/marketTrendInterpret');
const { agencyListingPropertyFilter } = require('../../server/utils/agencyListingsQuery');

/** Raw market data by country: array, { monthlyData, yoyPercent }, or { _source, "2023", "2024", ... }. */
let MONTHLY_ACTUALS_BY_COUNTRY = {};
try {
  const data = require('../../server/data/marketTrendsMonthly.json');
  Object.keys(data).forEach((k) => {
    if (k.startsWith('_')) return;
    const v = data[k];
    if (Array.isArray(v) || (v && typeof v === 'object')) MONTHLY_ACTUALS_BY_COUNTRY[k] = v;
  });
} catch (_) {}

/** Enrich crmLeads with leadScore (completeness + avg match score). ownerId = agency or agent _id for lead scope. */
async function enrichLeadsWithScores(leads, ownerId) {
  if (!Array.isArray(leads) || leads.length === 0) return leads;
  const leadIds = leads.map((l) => (l && l.id != null ? String(l.id) : null)).filter(Boolean);
  if (leadIds.length === 0) return leads.map((l) => ({ ...l, leadScore: computeLeadScore(l, null) }));
  const oid = ownerId && mongoose.Types.ObjectId.isValid(ownerId) ? new mongoose.Types.ObjectId(ownerId) : null;
  const query = { targetType: 'lead', targetId: { $in: leadIds } };
  if (oid) query.ownerId = oid;
  const matchScores = await MatchScore.find(query).select('targetId score').lean();
  const sumByLead = {};
  const countByLead = {};
  (matchScores || []).forEach((m) => {
    const tid = String(m.targetId || '');
    if (!tid) return;
    sumByLead[tid] = (sumByLead[tid] || 0) + (m.score || 0);
    countByLead[tid] = (countByLead[tid] || 0) + 1;
  });
  const avgByLead = {};
  Object.keys(sumByLead).forEach((tid) => {
    const n = countByLead[tid] || 0;
    avgByLead[tid] = n > 0 ? sumByLead[tid] / n : null;
  });
  return leads.map((l) => {
    const lid = l && l.id != null ? String(l.id) : null;
    const avgMatch = lid ? (avgByLead[lid] != null ? avgByLead[lid] : null) : null;
    const leadScore = computeLeadScore(l, avgMatch);
    return { ...l, leadScore };
  });
}

/** Normalize raw country data to { monthlyData, yoyPercent, sourceText }. Handles year-keyed actuals (e.g. "2023", "2024") and computes YoY from last month of latest vs previous year. */
function normalizeMarketTrendFromRaw(raw) {
  if (!raw) return {};
  if (Array.isArray(raw)) return { monthlyData: raw };
  if (raw.monthlyData && Array.isArray(raw.monthlyData)) {
    return { monthlyData: raw.monthlyData, yoyPercent: raw.yoyPercent, sourceText: raw._source };
  }
  const yearKeys = Object.keys(raw).filter((k) => /^\d{4}$/.test(k)).sort().reverse();
  if (yearKeys.length === 0) return { sourceText: raw._source };
  const latestYear = yearKeys[0];
  const monthlyData = raw[latestYear];
  if (!Array.isArray(monthlyData) || monthlyData.length === 0) return { sourceText: raw._source };
  let yoyPercent = raw.yoyPercent;
  if (yearKeys.length >= 2) {
    const prevYear = raw[yearKeys[1]];
    if (Array.isArray(prevYear) && prevYear.length > 0) {
      const lastPrev = prevYear[prevYear.length - 1].value;
      const lastCur = monthlyData[monthlyData.length - 1].value;
      if (lastPrev != null && lastPrev !== 0) {
        const pct = ((lastCur - lastPrev) / lastPrev) * 100;
        yoyPercent = (pct >= 0 ? '+' : '') + pct.toFixed(1) + '%';
      }
    }
  }
  return { monthlyData, yoyPercent, sourceText: raw._source };
}

/** Map trend/city names (e.g. "London", "Dubai") to canonical country names for matching. */
const TREND_COUNTRY_TO_CANONICAL = {
  'south africa': 'South Africa',
  'united kingdom': 'United Kingdom',
  'uk': 'United Kingdom',
  'london': 'United Kingdom',
  'england': 'United Kingdom',
  'united states': 'United States',
  'us': 'United States',
  'usa': 'United States',
  'netherlands': 'Netherlands',
  'germany': 'Germany',
  'united arab emirates': 'United Arab Emirates',
  'uae': 'United Arab Emirates',
  'dubai': 'United Arab Emirates',
  'spain': 'Spain'
};

/**
 * Build the set of countries the user cares about: from onboarding (preferredCities) and portfolio (locationDetails.country or location).
 * Returns a Set of canonical country names (e.g. "United Kingdom", "South Africa").
 */
function getUserCountrySet(user, mergedPortfolio) {
  const canonical = new Set();
  const add = (raw) => {
    if (!raw || typeof raw !== 'string') return;
    const t = raw.trim().toLowerCase();
    if (!t) return;
    const c = TREND_COUNTRY_TO_CANONICAL[t] || raw.trim();
    canonical.add(c);
  };
  (user.preferredCities || []).forEach(add);
  (mergedPortfolio || []).forEach((item) => {
    const c = item.details?.locationDetails?.country;
    if (c) add(c);
    const loc = item.location;
    if (loc && typeof loc === 'string') add(loc);
  });
  return canonical;
}

/** Return true if this trend's country matches any of the user's countries (canonical set). */
function trendMatchesUserCountries(trend, userCountrySet) {
  if (!userCountrySet || userCountrySet.size === 0) return true;
  const raw = (trend.country || '').trim();
  if (!raw) return true;
  const lower = raw.toLowerCase();
  const canonical = TREND_COUNTRY_TO_CANONICAL[lower] || raw.trim();
  return userCountrySet.has(canonical);
}

/**
 * Derive annualized ROI % for a property (for portfolio spotlight).
 * - Non-rental: annualized capital appreciation only (current value vs purchase price over hold period).
 *   Optionally we could subtract levies/expenses from gain; for now we use capital-only.
 * - Rental: annualized capital appreciation + net rental yield (rent minus levies) / purchase price.
 */
function computeRoi(p) {
  const purchasePrice = Number(p.pricing?.purchasePrice) || parseFloat(String(p.price || '0').replace(/[^0-9.]/g, '')) || 0;
  const currentVal = Number(p.pricing?.currentValuation) || Number(p.pricing?.askingPrice) || purchasePrice || parseFloat(String(p.price || '0').replace(/[^0-9.]/g, '')) || 0;
  if (purchasePrice <= 0) return 0;

  const purchaseDate = p.pricing?.purchaseDate ? new Date(p.pricing.purchaseDate) : (p.createdAt ? new Date(p.createdAt) : new Date());
  const now = new Date();
  const yearsHeld = Math.max(1 / 12, (now - purchaseDate) / (365.25 * 24 * 60 * 60 * 1000));
  const capitalGainPct = (currentVal - purchasePrice) / purchasePrice;
  const annualizedCapitalPct = (Math.pow(1 + capitalGainPct, 1 / yearsHeld) - 1) * 100;

  const isRental = /long_term_rentals|short_term_rentals/.test(String(p.investmentType || '').toLowerCase());
  if (!isRental) return Math.round(annualizedCapitalPct * 10) / 10;

  const monthlyRent = Number(p.pricing?.monthlyRental) || 0;
  const levyMonthly = (p.residential?.bodyCorporateFee?.applicable && p.residential?.bodyCorporateFee?.monthlyAmount != null)
    ? Number(p.residential.bodyCorporateFee.monthlyAmount)
    : 0;
  const netAnnualRent = Math.max(0, (monthlyRent - levyMonthly) * 12);
  const yieldPct = purchasePrice > 0 ? (netAnnualRent / purchasePrice) * 100 : 0;
  const totalRoi = annualizedCapitalPct + yieldPct;
  return Math.round(totalRoi * 10) / 10;
}

/** Map a Property document to a portfolio item with full details for Portfolio spotlight. */
function mapPropertyToPortfolioItem(p) {
  const purchasePrice = Number(p.pricing?.purchasePrice) || parseFloat(String(p.price || '0').replace(/[^0-9.]/g, '')) || 0;
  const currentVal = Number(p.pricing?.currentValuation) || Number(p.pricing?.askingPrice) || purchasePrice || parseFloat(String(p.price || '0').replace(/[^0-9.]/g, '')) || 0;
  const currency = (p.pricing && p.pricing.currency) ? String(p.pricing.currency).toUpperCase().slice(0, 3) : 'USD';
  const priceDisplay = p.price && String(p.price).replace(/^0+\.?0*$/, '').trim() ? p.price : (purchasePrice > 0 ? `${currency} ${purchasePrice}` : (currentVal > 0 ? `${currency} ${currentVal}` : '0'));
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
    investedAmount: purchasePrice,
    currentValue: currentVal,
    currency,
    roi: computeRoi(p),
    status: p.status || 'Published',
    addedOn: p.createdAt ? new Date(p.createdAt).toISOString() : null,
    photo: p.imageUrl || (p.media && p.media.coverImage) || '',
    investmentType: p.investmentType || '',
    details: {
      _id: p._id,
      isUploaded: true,
      isFeatured: !!p.isFeatured,
      listingType: p.listingType,
      propertyType: p.type || p.propertyCategory,
      price: priceDisplay,
      currency,
      locationDetails: p.locationDetails || {},
      specs,
      ownership: p.ownership || {},
      investmentType: p.investmentType || ''
    }
  };
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  try {
    await connectDB();
    let { id, type, propertyId } = req.query || {};
    // Vercel may not put path segment in req.query; parse from path so GET /api/users/:id works
    if (id == null && typeof req.url === 'string') {
      const pathPart = req.url.split('?')[0];
      const pathMatch = pathPart.match(/\/api\/users\/([^/]+)/);
      if (pathMatch) id = pathMatch[1];
    }

    // JWT: own id only, except GET ?type=dashboard where parent agency may load a delegated agent's dashboard
    if (req.method === 'GET' || req.method === 'PUT' || req.method === 'PATCH') {
      const authUserId = getUserIdFromRequest(req, res);
      if (!authUserId) return;

      if (req.method === 'PUT' || req.method === 'PATCH') {
        const requestedId = id ? String(id) : null;
        if (!requestedId || authUserId !== requestedId) {
          res.status(403).json({ message: 'Forbidden' });
          return;
        }
        id = authUserId;
      } else {
        const requestedId = id ? String(id) : null;
        const qType = typeof type === 'string' ? type : (req.query && req.query.type);
        if (!requestedId) {
          id = authUserId;
        } else if (qType === 'dashboard' && authUserId !== requestedId) {
          const target = await User.findById(requestedId).select('role agencyId').lean();
          if (!target) {
            res.status(404).json({ message: 'User not found' });
            return;
          }
          const viewer = await User.findById(authUserId).select('role').lean();
          const vRole = (viewer && viewer.role || '').toLowerCase();
          const tRole = (target.role || '').toLowerCase();
          const belongs = target.agencyId && String(target.agencyId) === String(authUserId);
          const isDelegatedAgent = tRole === 'agency_agent' || tRole === 'agent';
          if (vRole !== 'agency' || !isDelegatedAgent || !belongs) {
            res.status(403).json({ message: 'Forbidden' });
            return;
          }
          id = requestedId;
        } else if (authUserId !== requestedId) {
          res.status(403).json({ message: 'Forbidden' });
          return;
        } else {
          id = authUserId;
        }
      }
    }

    if (req.method === 'GET') {
      res.setHeader('Vary', 'Authorization');

      // Lightweight listings-only response for Listing Management page (avoids full dashboard payload)
      if (type === 'listings') {
        // ?slim=1 — drop the heavy media + non-area_housing metadata blobs.
        // Used by the Prospecting tab where we only need coords + area_housing comps.
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
            User.find({ agencyId: id }).select('_id name email').lean()
          ]);
          const agentProps = slim ? agentPropsRaw.map(trimProp) : agentPropsRaw;
          const nameMap = {};
          (agencyMembers || []).forEach((u) => { nameMap[String(u._id)] = u.name || u.email || 'Agent'; });
          nameMap[String(id)] = listingUser.name || 'Agency';
          const topAgents = (listingUser.agencyStats?.topAgents || []).map((a) => {
            const aid = a._id ? String(a._id) : (a.id ? String(a.id) : null);
            return { _id: aid, id: aid, name: nameMap[aid] || a.name || a.email || 'Agent' };
          });
          const crmLeads = listingUser.agencyStats?.crmLeads || [];
          return res.status(200).json({
            agentProperties: agentProps,
            stats: { topAgents, crmLeads },
            agentStats: { crmLeads }
          });
        }
        if (listingRole === 'agency_agent' || listingRole === 'independent_agent' || listingRole === 'agent') {
          const agentPropsRaw = await Property.find({ agentId: id }).sort({ createdAt: -1 }).limit(200).lean();
          const agentProps = slim ? agentPropsRaw.map(trimProp) : agentPropsRaw;
          let crmLeads = listingUser.agentStats?.crmLeads || [];
          // Build a topAgents-style roster so the Under Negotiation modal's
          // "listing agent" picker has options. Agency agents see their full
          // agency roster (so co-listing / commission splits across colleagues
          // are possible); sole agents just see themselves.
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
            // Always expose the agency principal as a selectable "Listing
            // Agent" too — useful when a deal is logged at the agency level.
            const agencyIdStr = String(listingUser.agencyId);
            if (!seenIds.has(agencyIdStr)) {
              topAgents.push({ _id: agencyIdStr, id: agencyIdStr, name: `${agency?.name || 'Agency'} (Agency)` });
            }
          }
          return res.status(200).json({
            agentProperties: agentProps,
            stats: { topAgents, crmLeads },
            agentStats: { crmLeads }
          });
        }
        return res.status(200).json({ agentProperties: [], stats: { topAgents: [], crmLeads: [] }, agentStats: { crmLeads: [] } });
      }

      // Handle dashboard request – run all independent queries in parallel
        if (type === 'dashboard') {
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('X-Content-Type-Options', 'nosniff');
        // Phase 1: Fetch user + market data + news in parallel
        const [user, newsFeeds] = await Promise.all([
          User.findById(id).lean(),
          News.find().sort({ createdAt: -1 }).limit(3).lean().catch(() => [])
        ]);

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

        // Market trends: always from server/data/marketTrendsMonthly.json (no DB, no external API)
        const TREND_COUNTRIES = ['South Africa', 'Dubai', 'London', 'Netherlands'];
        const defaultStatus = { 'South Africa': 'Good', 'Dubai': 'Excellent', 'London': 'Stable', 'Netherlands': 'Good' };
        const defaultColor = { 'South Africa': '#2ecc71', 'Dubai': '#00c2cb', 'London': '#f1c40f', 'Netherlands': '#0f766e' };
        let marketTrends = TREND_COUNTRIES.map((country) => {
          const raw = MONTHLY_ACTUALS_BY_COUNTRY[country];
          const normalized = raw ? normalizeMarketTrendFromRaw(raw) : {};
          return {
            country,
            status: defaultStatus[country] || 'Stable',
            color: defaultColor[country] || '#64748b',
            priceChange: (normalized.yoyPercent != null && normalized.yoyPercent !== '') ? normalized.yoyPercent : '',
            monthlyData: (normalized.monthlyData && normalized.monthlyData.length > 0) ? normalized.monthlyData : [],
            yoyPercent: (normalized.yoyPercent != null && normalized.yoyPercent !== '') ? normalized.yoyPercent : '',
            sourceText: normalized.sourceText || undefined
          };
        });

        const role = user.role ? user.role.toLowerCase() : 'investor';

        // Phase 2: Fetch uploaded properties and portfolio refs in parallel
        const basePortfolio = user.portfolio || [];
        const uploadedPropsPromise = Property.find({ agentId: id }).sort({ createdAt: -1 }).limit(100).lean().catch(() => []);

        // Pre-compute ref IDs we'll need (we need uploaded IDs first, so start the query now and resolve together)
        const [uploadedProps] = await Promise.all([uploadedPropsPromise]);
        const uploadedForPortfolio = uploadedProps.map((p) => mapPropertyToPortfolioItem(p));
        const uploadedIds = new Set(uploadedForPortfolio.map((p) => String(p.details?._id)));

        const refIdsToFetch = basePortfolio
          .map((item) => item.details?._id)
          .filter(Boolean)
          .filter((refId) => !uploadedIds.has(String(refId)));

        // Phase 3: Fetch portfolio refs and agency agent properties in parallel
        const parallelQueries = [];
        // Query for portfolio reference properties
        if (refIdsToFetch.length > 0) {
          parallelQueries.push(Property.find({ _id: { $in: refIdsToFetch } }).lean());
        } else {
          parallelQueries.push(Promise.resolve([]));
        }
        // Query for agency agent properties: agency id + topAgents refs + all users with agencyId = this agency (so agent sales pull through even if topAgents._id missing)
        let agentIds = [];
        let agencyMemberIdByEmailOrName = {}; // resolve topAgent -> user id when _id missing (by email/name)
        if (role === 'agency') {
          const fromTopAgents = (user.agencyStats?.topAgents || []).map((a) => a._id || a.id).filter(Boolean).map((aid) => String(aid));
          const agencyMembers = await User.find({ agencyId: id }).select('_id email name').lean();
          (agencyMembers || []).forEach((u) => {
            const uid = String(u._id);
            if (u.email) agencyMemberIdByEmailOrName[(String(u.email)).toLowerCase().trim()] = uid;
            if (u.name) agencyMemberIdByEmailOrName[(String(u.name)).toLowerCase().trim()] = uid;
          });
          const fromAgencyMembers = (agencyMembers || []).map((u) => String(u._id)).filter(Boolean);
          agentIds = [String(id), ...new Set([...fromTopAgents, ...fromAgencyMembers])];
        }
        /** @type {object|null} */
        let agencyDashboardPropFilter = null;
        if (role === 'agency') {
          agencyDashboardPropFilter = await agencyListingPropertyFilter(id);
          parallelQueries.push(Property.find(agencyDashboardPropFilter).sort({ createdAt: -1 }).limit(200).lean());
        } else if (agentIds.length > 0) {
          parallelQueries.push(Property.find({ agentId: { $in: agentIds } }).sort({ createdAt: -1 }).limit(200).lean());
        } else {
          parallelQueries.push(Promise.resolve([]));
        }

        const [refProps, agentProps] = await Promise.all(parallelQueries);

        // Merge portfolio: uploaded properties + resolved refs + raw portfolio items
        const propertyMap = {};
        refProps.forEach((p) => { propertyMap[String(p._id)] = p; });

        const mergedPortfolio = [...uploadedForPortfolio];
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

        // Only show Market Trends (and News with country) for countries in the user's portfolio or onboarding preferences
        const userCountrySet = getUserCountrySet(user, mergedPortfolio);
        let filteredMarketTrends = (marketTrends || []).filter((t) => trendMatchesUserCountries(t, userCountrySet));
        // Auto-attach real monthly data + YoY (computed from actuals when year-keyed) + source interpretation
        filteredMarketTrends = filteredMarketTrends.map((t) => {
          const hasMonthly = t.monthlyData && Array.isArray(t.monthlyData) && t.monthlyData.length > 0;
          if (hasMonthly) return t;
          const raw = MONTHLY_ACTUALS_BY_COUNTRY[t.country];
          if (!raw) return t;
          const normalized = normalizeMarketTrendFromRaw(raw);
          if (!normalized.monthlyData || normalized.monthlyData.length === 0) return t;
          return {
            ...t,
            monthlyData: normalized.monthlyData,
            ...(normalized.yoyPercent != null && normalized.yoyPercent !== '' ? { yoyPercent: normalized.yoyPercent } : {}),
            ...(normalized.sourceText ? { sourceText: normalized.sourceText } : {})
          };
        });
        // Sentiment from actual YoY so GOOD/STABLE/EXCELLENT align with the graph data; Claude only for interpretation text.
        filteredMarketTrends = filteredMarketTrends.map((t) => ({
          ...t,
          sentiment: (t.yoyPercent != null && t.yoyPercent !== '') ? getSentimentFromYoY(t.yoyPercent) : t.sentiment
        }));
        const toInterpret = filteredMarketTrends.slice(0, 6);
        const interpretPromises = toInterpret.map((t) =>
          interpretMarketTrend(t.country, t.yoyPercent, t.sourceText)
            .then((out) => (out ? { ...t, interpretation: out.interpretation } : t))
            .catch(() => t)
        );
        try {
          const withInterpretations = await Promise.all(interpretPromises);
          filteredMarketTrends = [...withInterpretations, ...filteredMarketTrends.slice(6)];
        } catch (_) {}
        const filteredNewsFeeds = (newsFeeds || []).filter((n) => {
          if (!userCountrySet || userCountrySet.size === 0) return true;
          const country = (n.country || '').trim();
          if (!country) return true;
          const lower = country.toLowerCase();
          const canonical = TREND_COUNTRY_TO_CANONICAL[lower] || country;
          return userCountrySet.has(canonical);
        });

        let responseData = {
          role: user.role,
          name: user.name,
          marketTrends: filteredMarketTrends,
          newsFeeds: filteredNewsFeeds,
          portfolio: mergedPortfolio
        };

        // Agency must be checked first: 'agency'.includes('agent') would match the generic block
        if (role === 'agency') {
          responseData.vaultCount = 0;
          responseData.branches = user.agencyStats?.branches || [];
          const topAgentsRaw = user.agencyStats?.topAgents || [];
          if (agentIds.length > 0) {
            const validAgentObjectIds = agentIds.filter((aid) => mongoose.Types.ObjectId.isValid(aid)).map((aid) => new mongoose.Types.ObjectId(aid));
            // Run both queries in parallel to cut dashboard response time
            const soldMatch =
              agencyDashboardPropFilter
                ? {
                    $and: [
                      agencyDashboardPropFilter,
                      { status: 'Sold' },
                      { salePrice: { $exists: true, $ne: null } },
                    ],
                  }
                : {
                    agentId: { $in: validAgentObjectIds },
                    status: 'Sold',
                    salePrice: { $exists: true, $ne: null },
                  };
            const [liveAgents, soldProps] = await Promise.all([
              User.find({ _id: { $in: validAgentObjectIds } }).select('_id name photo branchName agencyName agentTier agentScore').lean(),
              Property.find(soldMatch).select('salePrice saleDate pricing.currency agentId createdAt').lean(),
            ]);
            const liveByAgentId = {};
            (liveAgents || []).forEach((u) => {
              const uid = String(u._id);
              liveByAgentId[uid] = {
                name: u.name,
                photo: u.photo,
                branchName: u.branchName,
                agencyName: u.agencyName,
                agentTier: u.agentTier,
                agentScore: u.agentScore
              };
            });
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
            const salesCountThisMonthByAgent = {};
            const totalClosedCountByAgent = {};
            agentIds.forEach((aid) => { revenueByAgent[aid] = 0; thisMonthByAgent[aid] = 0; salesCountThisMonthByAgent[aid] = 0; totalClosedCountByAgent[aid] = 0; });
            soldProps.forEach((p) => {
              const aid = p.agentId ? String(p.agentId) : null;
              if (aid && revenueByAgent[aid] != null) {
                revenueByAgent[aid] += p.salePrice || 0;
                totalClosedCountByAgent[aid] = (totalClosedCountByAgent[aid] || 0) + 1;
                if (p.saleDate && new Date(p.saleDate) >= thisMonthStart) {
                  thisMonthByAgent[aid] += p.salePrice || 0;
                  salesCountThisMonthByAgent[aid] += 1;
                }
              }
            });
            const pipelineStatuses = ['Published', 'Under Offer', 'Sold'];
            const totalListingsByAgent = {};
            agentProps.forEach((p) => {
              const aid = p.agentId ? String(p.agentId) : null;
              if (aid && pipelineStatuses.includes(p.status || '')) {
                totalListingsByAgent[aid] = (totalListingsByAgent[aid] || 0) + 1;
              }
            });
            const agencyCrmLeadsForCount = user.agencyStats?.crmLeads || [];
            const leadCountByAgentId = {};
            agencyCrmLeadsForCount.forEach((l) => {
              const aid = (l.assignedAgentId != null && String(l.assignedAgentId).trim()) || null;
              if (aid) leadCountByAgentId[aid] = (leadCountByAgentId[aid] || 0) + 1;
            });
            const daysByAgentId = {};
            soldProps.forEach((p) => {
              const aid = p.agentId ? String(p.agentId) : null;
              if (!aid) return;
              const created = p.createdAt ? new Date(p.createdAt).getTime() : null;
              const sold = p.saleDate ? new Date(p.saleDate).getTime() : null;
              if (created != null && sold != null && sold >= created) {
                const days = Math.round((sold - created) / (24 * 60 * 60 * 1000));
                if (!daysByAgentId[aid]) daysByAgentId[aid] = [];
                daysByAgentId[aid].push(days);
              }
            });
            const avgDaysByAgentId = {};
            Object.keys(daysByAgentId).forEach((aid) => {
              const arr = daysByAgentId[aid];
              avgDaysByAgentId[aid] = arr.length ? Math.round(arr.reduce((s, d) => s + d, 0) / arr.length) : 60;
            });
            const topAgents = topAgentsRaw.map((a) => {
              const raw = a && typeof a.toObject === 'function' ? a.toObject() : { ...(a || {}) };
              const aid = raw._id ? String(raw._id) : (raw.id ? String(raw.id) : null)
                || (agencyMemberIdByEmailOrName[(String(raw.email || '')).toLowerCase().trim()]
                || agencyMemberIdByEmailOrName[(String(raw.name || '')).toLowerCase().trim()] || null);
              const live = aid ? liveByAgentId[aid] : null;
              const totalSales = aid ? (revenueByAgent[aid] || 0) : 0;
              const thisMonth = aid ? (thisMonthByAgent[aid] || 0) : 0;
              const salesThisMonth = aid ? (salesCountThisMonthByAgent[aid] || 0) : 0;
              const closedCount = aid ? (totalClosedCountByAgent[aid] || 0) : 0;
              const totalListings = aid ? (totalListingsByAgent[aid] || 0) : 0;
              const leadCount = aid ? (leadCountByAgentId[aid] || 0) : 0;
              const avgDays = aid ? (avgDaysByAgentId[aid] ?? 60) : 60;
              const conversionRate = totalListings > 0 ? Math.round((salesThisMonth / totalListings) * 100) : 0;
              const monthlyTarget = raw.monthlyTarget != null ? raw.monthlyTarget : 0;
              const percentOfTarget = monthlyTarget > 0 ? Math.round((thisMonth / monthlyTarget) * 100) : null;
              const { tier: badgeTier, score } = computeAgentTierAndScore({
                agentId: aid,
                email: raw.email || live?.email,
                name: raw.name || live?.name,
                activity: {
                  closedCount,
                  totalSales,
                  totalListings,
                  leadCount,
                  avgDaysToClose: avgDays,
                },
              });
              // `title` is the human-readable job title (e.g. "Senior Practitioner").
              // `tier` historically held that label too — so for backward compat, fall
              // back to whatever was there. The silver/gold/platinum badge value lives
              // on a separate `badgeTier` field so the title isn't stomped on every
              // dashboard fetch.
              const title = raw.title || (raw.tier && !['silver', 'gold', 'platinum'].includes(String(raw.tier).toLowerCase()) ? raw.tier : null);
              return {
                ...raw,
                _id: aid || raw._id,
                id: aid || raw.id,
                name: live?.name ?? raw.name,
                photo: live?.photo ?? raw.photo,
                branch: (live?.branchName != null && live.branchName !== '') ? live.branchName : (raw.branch ?? raw.branchName),
                branchName: (live?.branchName != null && live.branchName !== '') ? live.branchName : (raw.branchName ?? raw.branch),
                agencyName: live?.agencyName ?? raw.agencyName,
                totalSales,
                revenueThisMonth: thisMonth,
                sales: salesThisMonth,
                closedCount,
                // Pipeline activity — surfaced so the Agents tab KPI tiles can derive
                // "deals in pipeline" / "low activity" without a second roundtrip.
                totalListings,
                activeListings: totalListings,
                leadCount,
                activeLeads: leadCount,
                avgDays,
                conversionRate: `${conversionRate}%`,
                monthlyTarget,
                percentOfTarget,
                title,
                tier: title || raw.tier,   // keep `tier` populated for old UI references
                badgeTier,
                score
              };
            });
            await Promise.all(topAgents.map((a) => {
              const aid = a._id || a.id;
              if (!aid || !mongoose.Types.ObjectId.isValid(aid)) return Promise.resolve();
              return User.findByIdAndUpdate(aid, { $set: { agentTier: a.badgeTier, agentScore: a.score } }).then(() => {});
            }));
            const agencyCrmLeadsRaw = user.agencyStats?.crmLeads || [];
            const agencyCrmLeads = await enrichLeadsWithScores(agencyCrmLeadsRaw, id);
            responseData.stats = {
              totalRevenue: user.agencyStats?.totalRevenue || 0,
              propertiesSold: user.agencyStats?.propertiesSold || 0,
              activeAgents: user.agencyStats?.activeAgents || 0,
              totalListings: agentProps.length,
              activeLeads: agencyCrmLeads.length,
              topAgents,
              pipelineColumns: user.agencyStats?.pipelineColumns || [],
              pipelineDeals: user.agencyStats?.pipelineDeals || [],
              crmLeads: agencyCrmLeads
            };
            responseData.agentStats = responseData.stats;
            responseData.combinedMonthlyTarget = topAgents.reduce((sum, a) => sum + (a.monthlyTarget || 0), 0);
            responseData.combinedRevenueThisMonth = topAgents.reduce((sum, a) => sum + (a.revenueThisMonth || 0), 0);
          } else {
            const agencyCrmLeadsElseRaw = user.agencyStats?.crmLeads || [];
            const agencyCrmLeadsElse = await enrichLeadsWithScores(agencyCrmLeadsElseRaw, id);
            responseData.stats = {
              totalRevenue: user.agencyStats?.totalRevenue || 0,
              propertiesSold: user.agencyStats?.propertiesSold || 0,
              activeAgents: user.agencyStats?.activeAgents || 0,
              totalListings: user.agencyStats?.totalListings || 0,
              activeLeads: agencyCrmLeadsElse.length,
              topAgents: topAgentsRaw,
              pipelineColumns: user.agencyStats?.pipelineColumns || [],
              pipelineDeals: user.agencyStats?.pipelineDeals || [],
              crmLeads: agencyCrmLeadsElse
            };
            responseData.agentStats = responseData.stats;
            responseData.agentProperties = [];
            responseData.sales = [];
            responseData.combinedMonthlyTarget = 0;
            responseData.combinedRevenueThisMonth = 0;
          }
          responseData.agentProperties = agentProps;
        } else if (role.includes('investor') || role.includes('buyer') || role.includes('seller') || role.includes('tenant') || role.includes('agent') || role === 'landlord') {
          const vaultFileCount = await File.countDocuments({ userId: String(id) });
          responseData.vaultCount = vaultFileCount;
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
          responseData.agentProperties = [];
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
            ).select('salePrice saleDate pricing.currency createdAt').lean();
            const sales = (soldList || []).map((p) => ({
              salePrice: p.salePrice,
              currency: (p.pricing && p.pricing.currency) || 'USD',
              saleDate: p.saleDate
            }));
            let avgDaysToSell = 60;
            if (soldList.length > 0) {
              const daysArr = soldList
                .filter((p) => p.createdAt && p.saleDate)
                .map((p) => Math.round((new Date(p.saleDate).getTime() - new Date(p.createdAt).getTime()) / (24 * 60 * 60 * 1000)));
              avgDaysToSell = daysArr.length ? Math.round(daysArr.reduce((s, d) => s + d, 0) / daysArr.length) : 60;
            }
            const leadCount = (crmLeads || []).length;
            const closedCountForAgent = soldList.length;
            const totalSalesForAgent = soldList.reduce((s, p) => s + (Number(p.salePrice) || 0), 0);
            const { tier: agentTier, score: agentScore } = computeAgentTierAndScore({
              agentId: id,
              email: user.email,
              name: user.name,
              activity: {
                closedCount: closedCountForAgent,
                totalSales: totalSalesForAgent,
                totalListings: agentPropsCount,
                leadCount,
                avgDaysToClose: avgDaysToSell,
              },
            });
            await User.findByIdAndUpdate(id, { $set: { agentTier, agentScore } });
            const crmLeadsEnriched = await enrichLeadsWithScores(crmLeads || [], user.agencyId || id);
            const myAgentProps = await Property.find({ agentId: id }).sort({ createdAt: -1 }).limit(200).lean();
            responseData.agentProperties = myAgentProps;
            responseData.agentStats = {
              ...(user.agentStats || {}),
              crmLeads: crmLeadsEnriched,
              totalListings: agentPropsCount,
              activeLeads: (crmLeadsEnriched || []).length
            };
            responseData.stats = { ...responseData.stats, ...responseData.agentStats };
            responseData.sales = sales;
            responseData.monthlyRevenueTarget = user.monthlyRevenueTarget != null ? user.monthlyRevenueTarget : null;
            responseData.agentTier = agentTier;
            responseData.agentScore = agentScore;
            responseData.agencyName = user.agencyName;
            responseData.branchName = user.branchName;
          }
        } else {
          responseData.vaultCount = 0;
          responseData.agentProperties = [];
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

      // Handle saved properties request
      if (type === 'saved') {
        const userWithSaved = await User.findById(id).populate('savedProperties').lean();
        return res.status(200).json(userWithSaved?.savedProperties || []);
      }

      // Default: return user data
      const user = await User.findById(id).lean();
      if (!user) return res.status(404).json({ message: 'User not found' });
      const { password, ...others } = user;
      return res.status(200).json(others);
    }

    if (req.method === 'PUT') {
      // id is already the authenticated user (token must match URL id)
      const targetId = id;

      const { action, oldPassword, newPassword, propertyData, agentData, ...updateData } = req.body || {};

      // Handle save property
      if (action === 'save' && propertyId) {
        await User.findByIdAndUpdate(targetId, {
          $addToSet: { savedProperties: propertyId }
        });
        return res.status(200).json({ message: "Property saved!" });
      }

      // Handle unsave property
      if (action === 'unsave' && propertyId) {
        await User.findByIdAndUpdate(targetId, {
          $pull: { savedProperties: propertyId }
        });
        return res.status(200).json({ message: "Property removed." });
      }

      // Handle change password
      if (action === 'change-password') {
        const user = await User.findById(targetId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });
        
        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
          return res.status(400).json({ success: false, message: "Old password is incorrect" });
        }
        
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);
        await User.findByIdAndUpdate(targetId, { $set: { password: hashedPassword } });
        return res.status(200).json({ success: true, message: "Password updated successfully" });
      }

      // Handle add portfolio
      if (action === 'add-portfolio' && propertyData) {
        const updatedUser = await User.findByIdAndUpdate(targetId, 
          { $push: { portfolio: propertyData } }, 
          { new: true }
        );
        return res.status(200).json({ success: true, user: updatedUser });
      }

      // Handle add branch (agency only)
      if (action === 'add-branch' && req.body.name != null) {
        const user = await User.findById(targetId);
        if (!user || (user.role || '').toLowerCase() !== 'agency') {
          return res.status(403).json({ success: false, message: 'Only agencies can add branches' });
        }
        if (!user.agencyStats) user.agencyStats = {};
        if (!user.agencyStats.branches) user.agencyStats.branches = [];
        const name = String(req.body.name || '').trim();
        const address = String(req.body.address || '').trim();
        if (!name) return res.status(400).json({ success: false, message: 'Branch name is required' });
        user.agencyStats.branches.push({ name, address });
        await user.save();
        return res.status(200).json({ success: true, branches: user.agencyStats.branches });
      }

      // Handle add agent (create invite, send email, add to topAgents as invited)
      if (action === 'add-agent' && agentData) {
        const user = await User.findById(targetId);
        if (!user.agencyStats) user.agencyStats = {};
        if (!user.agencyStats.topAgents) user.agencyStats.topAgents = [];
        if (!user.agencyStats.branches) user.agencyStats.branches = [];
        
        const normalizedEmail = (agentData.email || '').toLowerCase().trim();
        const branchIdRaw = agentData.branchId || agentData.branch;
        if (!normalizedEmail) return res.status(400).json({ success: false, message: 'Email is required' });
        if (!branchIdRaw) return res.status(400).json({ success: false, message: 'Branch is required' });

        const firstName = (agentData.firstName || '').trim();
        const lastName = (agentData.lastName || '').trim();
        const fullName = [firstName, lastName].filter(Boolean).join(' ') || (agentData.name || '').trim() || normalizedEmail;

        const isAgencyBranch = String(branchIdRaw) === '__agency__' || String(branchIdRaw) === String(user._id);
        const branch = isAgencyBranch ? null : user.agencyStats.branches.find(b => String(b._id) === String(branchIdRaw) || b.name === branchIdRaw);
        const agencyDisplay = sanitizeAgencyBranch(user.agencyName || user.name || '') || 'Agency';
        const branchName = isAgencyBranch ? agencyDisplay : (sanitizeAgencyBranch(branch ? branch.name : '') || (branch && branch.name ? branch.name : String(branchIdRaw)) || 'Branch');
        const branchId = isAgencyBranch ? String(user._id) : String(branch ? branch._id : branchIdRaw);
        const agencyName = agencyDisplay;

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser && (existingUser.role === 'agency_agent' || existingUser.role === 'independent_agent' || existingUser.role === 'agent')) {
          return res.status(400).json({ success: false, message: 'This email is already registered as an agent' });
        }

        // Avoid duplicate invite: if this email is already in topAgents for this agency, return success without creating a second entry
        const alreadyInAgency = (user.agencyStats.topAgents || []).some(
          (a) => (a.email || '').toLowerCase().trim() === normalizedEmail
        );
        if (alreadyInAgency) {
          return res.status(200).json({ success: true, agents: user.agencyStats.topAgents, message: 'Agent already invited' });
        }

        const token = crypto.randomBytes(32).toString('hex');
        const pin = String(crypto.randomInt(1000, 9999)); // sent in email as fallback when link doesn't work
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const invite = new AgencyInvite({
          token,
          pin,
          email: normalizedEmail,
          firstName,
          lastName,
          allowMarketingCampaigns: Boolean(agentData.allowMarketingCampaigns),
          agencyId: user._id,
          branchId,
          branchName,
          agencyName,
          expiresAt
        });
        await invite.save();

        // Invite link: use request origin so same deployment = same DB (no "invalid invite" from DB mismatch).
        // For production, set FRONTEND_ORIGIN to https://internationalpropertymarket.com if you want emails to always use that domain.
        const reqOrigin = req.headers.origin || (req.headers['x-forwarded-host'] ? `https://${req.headers['x-forwarded-host']}` : null);
        const baseUrl = (process.env.FRONTEND_ORIGIN || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null) || reqOrigin || process.env.CLIENT_URL || 'http://localhost:3000').replace(/\/$/, '');
        const inviteLink = `${baseUrl}/agency-agent-invite?token=${token}`;

        const agentEntry = {
          name: fullName,
          email: normalizedEmail,
          branch: branchName,
          branchId,
          status: 'invited',
          _id: null,
          id: null,
          sales: 0,
          revenue: 0,
          avgDays: 30,
          conversionRate: '0%'
        };
        user.agencyStats.topAgents.push(agentEntry);
        user.agencyStats.activeAgents = user.agencyStats.topAgents.length;
        await user.save();

        const sendInviteUrl = process.env.SEND_AGENT_INVITE_URL || process.env.GOOGLE_SEND_OTP_URL;
        if (sendInviteUrl) {
          try {
            await fetch(sendInviteUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: normalizedEmail,
                inviteLink,
                pin,
                agencyName,
                branchName,
                type: 'agent-invite'
              })
            });
          } catch (err) {
            console.error('Send invite email error:', err);
          }
        }

        return res.status(200).json({ success: true, agents: user.agencyStats.topAgents, inviteLink });
      }

      // Handle update agent targets (agency only) – avoid falling through to default profile update
      if (action === 'update-agent-targets') {
        const agentId = req.body.agentId;
        const agentEmail = (req.body.agentEmail || '').trim();
        const { name, email, monthlyTarget, commissionRate, branchId, agencyName: agencyNamePayload } = req.body;
        if (!agentId && !agentEmail) return res.status(400).json({ message: 'agentId or agentEmail is required' });
        const user = await User.findById(targetId);
        if (!user || (user.role || '').toLowerCase() !== 'agency') {
          return res.status(403).json({ success: false, message: 'Only agencies can update agent targets' });
        }
        const agencyDisplayDefault = sanitizeAgencyBranch(user.agencyName || user.name || '') || 'Agency';
        const topAgents = user.agencyStats?.topAgents || [];
        let idx = -1;
        if (agentId) idx = topAgents.findIndex((a) => String(a._id) === String(agentId) || String(a.id) === String(agentId));
        if (idx === -1 && agentEmail) idx = topAgents.findIndex((a) => (a.email || '').toLowerCase().trim() === agentEmail.toLowerCase());
        if (idx === -1) return res.status(404).json({ success: false, message: 'Agent not found in agency' });
        if (name !== undefined) topAgents[idx].name = name;
        if (email !== undefined) topAgents[idx].email = email;
        if (monthlyTarget !== undefined) topAgents[idx].monthlyTarget = monthlyTarget == null || monthlyTarget === '' ? null : Number(monthlyTarget);
        if (commissionRate !== undefined) topAgents[idx].commissionRate = commissionRate == null || commissionRate === '' ? null : Number(commissionRate);
        if (branchId != null && String(branchId).trim() !== '') {
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
        if (monthlyTarget !== undefined && topAgents[idx]._id) {
          agentUpdates.monthlyRevenueTarget = topAgents[idx].monthlyTarget;
        }
        if (branchId != null && String(branchId).trim() !== '' && topAgents[idx]._id) {
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
        const fresh = await User.findById(targetId).select('agencyStats.topAgents').lean();
        const agents = (fresh?.agencyStats?.topAgents || []).map((a) => ({ ...a, _id: a._id, id: a._id ? String(a._id) : a.id }));
        return res.status(200).json({ success: true, agents: agents || user.agencyStats.topAgents });
      }

      // Handle remove agent (agency only) – optionally transfer leads/listings then remove from topAgents
      if (action === 'remove-agent') {
        const { agentId, agentEmail, transferToId } = req.body;
        const user = await User.findById(targetId);
        if (!user || (user.role || '').toLowerCase() !== 'agency') {
          return res.status(403).json({ success: false, message: 'Only agencies can remove agents' });
        }
        const topAgents = user.agencyStats?.topAgents || [];
        const idx = agentId
          ? topAgents.findIndex((a) => String(a._id) === String(agentId) || String(a.id) === String(agentId))
          : topAgents.findIndex((a) => (a.email || '').toLowerCase().trim() === (agentEmail || '').toLowerCase().trim());
        if (idx === -1) return res.status(404).json({ success: false, message: 'Agent not found in agency' });
        const fromAgentId = topAgents[idx]._id || topAgents[idx].id;
        const fromStr = String(fromAgentId);

        if (transferToId != null && String(transferToId).trim() !== '') {
          const toStr = String(transferToId).trim();
          const agencyIdStr = String(targetId);
          const topAgentIds = topAgents.map((a) => String(a._id || a.id)).filter(Boolean);
          if (toStr === fromStr) {
            return res.status(400).json({ success: false, message: 'Cannot assign to the same agent you are removing' });
          }
          const toValid = toStr === agencyIdStr || topAgentIds.includes(toStr);
          if (!toValid) {
            return res.status(400).json({ success: false, message: 'Transfer destination must be Agency or another agent in your agency' });
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
            { $set: { agentId: transferToId } }
          );
          const propertiesTransferred = propResult.modifiedCount || 0;
          topAgents.splice(idx, 1);
          user.agencyStats.activeAgents = Math.max(0, (user.agencyStats.activeAgents || 0) - 1);
          user.markModified('agencyStats');
          await user.save();
          return res.status(200).json({ success: true, agents: user.agencyStats.topAgents, leadsTransferred, propertiesTransferred });
        }

        topAgents.splice(idx, 1);
        user.agencyStats.activeAgents = Math.max(0, (user.agencyStats.activeAgents || 0) - 1);
        user.markModified('agencyStats');
        await user.save();
        return res.status(200).json({ success: true, agents: user.agencyStats.topAgents });
      }

      // Handle seed data (development/testing)
      if (action === 'seed') {
        const MarketTrend = require('../../server/models/MarketTrend');
        const News = require('../../server/models/News');
        const Development = require('../../server/models/Development');
        
        const user = await User.findById(targetId);
        if (!user) return res.status(404).json({ success: false, message: "User not found" });

        const userRole = user.role ? user.role.toLowerCase() : 'investor';

        // Seed Market Trends (with monthly actuals from loader; supports year-keyed JSON)
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

        // Seed News (use news/property site URLs only; no Twitter, Facebook, etc.)
        await News.deleteMany({});
        await News.insertMany([
          { title: "Dubai Real Estate Market Sees Record Growth", content: "The Dubai property market continues to show strong growth...", imageUrl: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?ixlib=rb-4.0.3", sourceUrl: "https://www.thenationalnews.com/business/property/" },
          { title: "London Property Prices Stabilize", content: "After years of growth, London property prices are stabilizing...", imageUrl: "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?ixlib=rb-4.0.3", sourceUrl: "https://www.bbc.com/news/business/property" }
        ]);

        // Seed User-Specific Data
        if (userRole === 'investor') {
          user.portfolio = [
            { propertyTitle: "Marina Torch Tower", location: "Dubai Marina", investedAmount: 150000, currentValue: 165000, roi: 10.0, status: 'Active' },
            { propertyTitle: "Hyde Park Penthouse", location: "London", investedAmount: 250000, currentValue: 262000, roi: 4.8, status: 'Active' }
          ];
        } else if (userRole === 'agency') {
          user.agencyStats = {
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
            pipelineDeals: [],
            crmLeads: []
          };
        } else {
          user.agentStats = {
            myCommission: 125000,
            activeListings: 8,
            pendingDeals: 3,
            meetingsScheduled: 12,
            recentLeads: [],
            pipelineColumns: [],
            pipelineDeals: [],
            crmLeads: []
          };
        }

        await user.save();
        return res.status(200).json({ success: true, message: `Database successfully updated for ${userRole}!`, user });
      }

      // Default: update user profile (photo, name, etc.)
      const profileUserId = targetId;
      if (!profileUserId) {
        return res.status(400).json({ success: false, message: 'User ID is required' });
      }
      const updatedUser = await User.findByIdAndUpdate(
        profileUserId,
        { $set: updateData },
        { new: true }
      );
      if (!updatedUser) {
        return res.status(404).json({ success: false, message: 'User not found' });
      }
      return res.status(200).json({ success: true, user: updatedUser });
    }

    return res.status(405).json({ message: 'Method not allowed' });
  } catch (err) {
    console.error('User operation error:', err);
    return res.status(500).json({ message: err.message });
  }
};


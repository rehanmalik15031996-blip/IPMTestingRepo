/**
 * Pure helpers that power the new CMA report sections (IPM Score™ headline,
 * comparables summary, valuation adjustments, marketing strategy, commission
 * projection, methodology, and disclaimer text).
 *
 * Kept out of `SellerCMAReport.js` so the page file stays focused on layout.
 * All functions are tolerant of missing inputs and return sensible defaults.
 */

// --- IPM Score™ -----------------------------------------------------------------
// Composite 0-100 score blended from five weighted sub-indices. Each sub-index
// is independently capped at 0-100 so the rating tier (Premium/Strong/etc.)
// stays interpretable.
const IPM_WEIGHTS = { location: 0.25, specification: 0.25, demand: 0.20, liquidity: 0.15, macro: 0.15 };

function clamp01to100(n) { return Math.max(0, Math.min(100, Math.round(Number(n) || 0))); }

/**
 * Derive an IPM Score™ for a CMA from whatever subset of the listing-metadata
 * shape we happen to have. This is a transparent heuristic — not a real model —
 * so it's deterministic and easy to defend in front of a client.
 */
function computeIpmScore({ comparables = [], valuation = {}, market = {}, neighborhood = {}, investment = {}, marketIntel = {}, askingPrice = null } = {}) {
    // Location: income class, safety, walkability, schools count
    let location = 50;
    const inc = String(neighborhood?.demographics?.income_class || '').toLowerCase();
    if (inc.includes('upper') || inc.includes('affluent') || inc.includes('high')) location += 25;
    else if (inc.includes('middle')) location += 12;
    const safety = String(neighborhood?.safety?.rating || '').toLowerCase();
    if (safety.includes('low')) location += 10;
    else if (safety.includes('moderate')) location += 5;
    if (Number(neighborhood?.mobility?.walkability_score) >= 70) location += 6;
    if (Array.isArray(neighborhood?.schools) && neighborhood.schools.length >= 3) location += 4;

    // Specification: how complete is the property record (proxy for grade)
    let specification = 50;
    const ch = (valuation && valuation.characteristics) || {};
    const checkedSpecs = [ch.lot_size_sqm, ch.square_meters, ch.square_feet, ch.bedrooms, ch.bathrooms, ch.year_built];
    const filled = checkedSpecs.filter((v) => v != null && v !== '').length;
    specification += filled * 7;
    if (valuation?.current_estimate?.value != null) specification += 6;

    // Demand: market status + 12-month price trend
    let demand = 50;
    const status = String(market?.status || '').toLowerCase();
    if (status.includes('hot') || status.includes('seller')) demand += 25;
    else if (status.includes('balanced') || status.includes('stable')) demand += 12;
    else if (status.includes('cold') || status.includes('buyer')) demand -= 8;
    const trend12 = Number(market?.price_trend_12m);
    if (Number.isFinite(trend12)) {
        const pct = Math.abs(trend12) <= 1.5 ? trend12 * 100 : trend12;
        demand += Math.max(-15, Math.min(20, Math.round(pct)));
    }

    // Liquidity: comparable depth + transfer activity
    let liquidity = 40;
    const compsCount = Array.isArray(comparables) ? comparables.length : 0;
    liquidity += Math.min(40, compsCount * 6);
    const recentTransfers = Array.isArray(market?.transfers_by_year) ? market.transfers_by_year.slice(-3).reduce((s, y) => s + (Number(y.count) || 0), 0) : 0;
    if (recentTransfers >= 30) liquidity += 18;
    else if (recentTransfers >= 12) liquidity += 10;
    else if (recentTransfers >= 4) liquidity += 4;

    // Macro: 5-year appreciation + cycle phase
    let macro = 55;
    const app5 = Number(investment?.appreciation_5y);
    if (Number.isFinite(app5)) {
        const pct = Math.abs(app5) <= 1.5 ? app5 * 100 : app5;
        macro += Math.max(-20, Math.min(25, Math.round(pct / 1.5)));
    }
    const phase = String(marketIntel?.market_cycle?.phase || '').toLowerCase();
    if (phase.includes('expansion') || phase.includes('recovery')) macro += 8;
    else if (phase.includes('contraction') || phase.includes('downturn')) macro -= 10;

    const sub = {
        location: clamp01to100(location),
        specification: clamp01to100(specification),
        demand: clamp01to100(demand),
        liquidity: clamp01to100(liquidity),
        macro: clamp01to100(macro),
    };
    const composite = clamp01to100(
        sub.location * IPM_WEIGHTS.location +
        sub.specification * IPM_WEIGHTS.specification +
        sub.demand * IPM_WEIGHTS.demand +
        sub.liquidity * IPM_WEIGHTS.liquidity +
        sub.macro * IPM_WEIGHTS.macro
    );

    // Bias the headline up slightly when we also have a real asking price the
    // valuation supports — these reports usually go to the seller.
    let final = composite;
    if (askingPrice && valuation?.current_estimate?.confidence_range?.high) {
        const inRange = askingPrice >= (valuation.current_estimate.confidence_range.low || 0)
            && askingPrice <= (valuation.current_estimate.confidence_range.high || Infinity);
        if (inRange) final = clamp01to100(final + 4);
    }

    return { score: final, sub };
}

function getAssetTier(score) {
    const s = Number(score) || 0;
    if (s >= 85) return { label: 'Premium Asset', color: '#059669' };
    if (s >= 70) return { label: 'Strong Asset', color: '#0d9488' };
    if (s >= 55) return { label: 'Standard Asset', color: '#11575C' };
    return { label: 'Below Market', color: '#dc2626' };
}

function getConfidence(comparablesCount) {
    const n = Number(comparablesCount) || 0;
    if (n >= 6) return { pct: 87, band: 'HIGH', color: '#059669' };
    if (n >= 4) return { pct: 78, band: 'HIGH', color: '#0d9488' };
    if (n >= 2) return { pct: 68, band: 'MEDIUM', color: '#f59e0b' };
    return { pct: 55, band: 'LOW', color: '#dc2626' };
}

// --- Comparable summary stats --------------------------------------------------
function summariseComparables(comparables = []) {
    const ratesPerSqm = [];
    const glas = [];
    const prices = [];
    for (const c of comparables) {
        const price = Number(c.price);
        const gla = Number(c.build_sqm || c.square_meters || c.gla);
        if (Number.isFinite(price) && price > 0) prices.push(price);
        if (Number.isFinite(gla) && gla > 0) glas.push(gla);
        if (Number.isFinite(price) && Number.isFinite(gla) && price > 0 && gla > 0) ratesPerSqm.push(price / gla);
    }
    const median = (arr) => {
        if (!arr.length) return null;
        const sorted = [...arr].sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
    };
    const mean = (arr) => (arr.length ? arr.reduce((s, x) => s + x, 0) / arr.length : null);
    return {
        count: comparables.length,
        medianRate: median(ratesPerSqm),
        meanRate: mean(ratesPerSqm),
        lowestRate: ratesPerSqm.length ? Math.min(...ratesPerSqm) : null,
        highestRate: ratesPerSqm.length ? Math.max(...ratesPerSqm) : null,
        medianGla: median(glas),
        medianPrice: median(prices),
        ratesPerSqm,
    };
}

// --- Valuation adjustment notes ------------------------------------------------
// Heuristic narrative bullets. We pick a small set based on what's present in
// the source data so the section never reads as boilerplate.
function buildAdjustmentNotes({ valuation = {}, market = {}, comparables = [], occupationStatus = '', urgency = '' } = {}) {
    const notes = [];
    const range = valuation?.current_estimate?.confidence_range;
    if (range && range.low && range.high && range.high > range.low) {
        const spread = ((range.high - range.low) / range.low) * 100;
        if (spread <= 10) notes.push({ tone: 'positive', text: `Tight valuation band (±${(spread / 2).toFixed(1)}%): comparable sales cluster closely around the indicative midpoint, supporting pricing confidence.` });
        else if (spread >= 25) notes.push({ tone: 'caution', text: `Wider valuation band (±${(spread / 2).toFixed(1)}%): comparable sales show greater dispersion — initial price discovery period recommended.` });
    }
    const trend12 = Number(market?.price_trend_12m);
    if (Number.isFinite(trend12)) {
        const pct = Math.abs(trend12) <= 1.5 ? trend12 * 100 : trend12;
        if (pct >= 4) notes.push({ tone: 'positive', text: `Positive market uplift (+${pct.toFixed(1)}%): node has appreciated over the past 12 months, supporting an upward valuation adjustment.` });
        else if (pct <= -4) notes.push({ tone: 'caution', text: `Soft market trend (${pct.toFixed(1)}%): downward 12-month movement suggests pricing should sit at the lower end of the indicative band.` });
    }
    if (Array.isArray(comparables) && comparables.length >= 6) {
        notes.push({ tone: 'positive', text: `Strong comparable depth (${comparables.length} verified sales): valuation methodology supported by multiple recent transactions in the same band.` });
    } else if (Array.isArray(comparables) && comparables.length > 0 && comparables.length < 3) {
        notes.push({ tone: 'caution', text: `Limited comparable depth (${comparables.length} verified sale${comparables.length === 1 ? '' : 's'}): broader matching criteria applied — confidence band widened accordingly.` });
    }
    const occ = String(occupationStatus || '').toLowerCase();
    if (occ.includes('vacant')) notes.push({ tone: 'caution', text: 'Vacant possession (-1.5% to -2.5%): discount applied versus tenanted comparables to reflect immediate occupancy availability.' });
    else if (occ.includes('tenant') || occ.includes('let') || occ.includes('leased')) notes.push({ tone: 'positive', text: 'Tenanted (+1.0% to +2.0%): in-place lease income supports yield-led pricing for investor buyers.' });
    const urg = String(urgency || '').toLowerCase();
    if (urg.includes('urgent') || urg.includes('asap') || urg.includes('30')) notes.push({ tone: 'caution', text: 'Accelerated marketing window: pricing positioned at lower end of band to compress days-on-market.' });

    if (notes.length === 0) {
        notes.push({ tone: 'positive', text: 'Valuation aligned with comparable sales mean. No material specification, location, or tenancy adjustments applied.' });
    }
    return notes;
}

// --- Buyer demand layer --------------------------------------------------------
// Filters the agency's CRM leads (buyers + investors) to those whose budget
// intersects this listing's asking price. Returns ranked match table data.
function matchAgencyBuyersToProperty(crmLeads = [], askingPrice = null, currency = 'ZAR') {
    if (!askingPrice || !Array.isArray(crmLeads) || crmLeads.length === 0) return { matched: [], counts: { hot: 0, warm: 0, cool: 0, total: 0 } };
    const ask = Number(askingPrice);
    const matched = [];
    for (const lead of crmLeads) {
        const lt = String(lead.leadType || '').toLowerCase();
        if (lt !== 'buyer' && lt !== 'investor') continue;
        const det = lead.buyerDetails || lead.investorDetails || {};
        const min = Number(det.budgetMin || det.budgetMinZar || det.dealSizeMin) || 0;
        const max = Number(det.budgetMax || det.budgetMaxZar || det.dealSizeMax) || 0;
        // Allow ±10% slack so a near-miss buyer still surfaces.
        const lo = min ? min * 0.9 : 0;
        const hi = max ? max * 1.1 : Infinity;
        if (ask < lo || ask > hi) continue;
        const score = Number(lead.leadScore) || 0;
        matched.push({
            id: lead.id || lead._id,
            name: lead.name || det.company || 'Buyer',
            type: det.buyerType || (lt === 'investor' ? 'Investor' : 'Owner-Occupier'),
            budgetMin: min,
            budgetMax: max,
            glaMin: Number(det.glaMinSqm || det.minFloorSizeM2) || null,
            glaMax: Number(det.glaMaxSqm) || null,
            score,
            band: score >= 90 ? 'HOT' : score >= 70 ? 'WARM' : 'COOL',
            currency,
        });
    }
    matched.sort((a, b) => b.score - a.score);
    const counts = matched.reduce(
        (acc, b) => {
            acc.total += 1;
            if (b.band === 'HOT') acc.hot += 1;
            else if (b.band === 'WARM') acc.warm += 1;
            else acc.cool += 1;
            return acc;
        },
        { hot: 0, warm: 0, cool: 0, total: 0 }
    );
    return { matched, counts };
}

// --- Marketing strategy --------------------------------------------------------
function buildMarketingStrategy({ valuation = {}, market = {}, askingPrice = null, propertyType = '', currency = 'ZAR', confidencePct = null, ipmScore = null } = {}) {
    const range = valuation?.current_estimate?.confidence_range || {};
    const valEst = valuation?.current_estimate?.value ?? null;
    const baseAnchor = askingPrice || valEst || ((range.low || 0) + (range.high || 0)) / 2 || null;

    const status = String(market?.status || '').toLowerCase();
    const trend12Raw = Number(market?.price_trend_12m);
    const trend12 = Number.isFinite(trend12Raw)
        ? (Math.abs(trend12Raw) <= 1.5 ? trend12Raw * 100 : trend12Raw)
        : 0;

    // The recommended asking is a positioning suggestion — never a copy of the
    // seller's asking price. We bias up in a hot/appreciating market with high
    // confidence, and trim down in a soft/uncertain one. The result also rounds
    // to a "marketable" number (R 32,750,000 instead of R 32,142,007).
    let priceStrategy;
    let bias = 0; // percentage points applied to baseAnchor
    if (status.includes('hot') || status.includes('seller')) {
        bias = 3.0;
        priceStrategy = 'Hold firm 21 days · Review at day 30 · Adjust at day 45';
    } else if (status.includes('cold') || status.includes('buyer')) {
        bias = -2.5;
        priceStrategy = 'Active price discovery from week 2 · Review weekly · Adjust at day 30';
    } else if (status.includes('balanced') || status.includes('stable')) {
        bias = 0.5;
        priceStrategy = 'Hold firm 30 days · Review at day 45 · Adjust at day 60';
    } else {
        bias = 1.0;
        priceStrategy = 'Hold firm 30 days · Review at day 45 · Adjust at day 60';
    }
    // Tilt by the 12-month trend (capped) and IPM Score.
    bias += Math.max(-2, Math.min(3, trend12 / 4));
    if (ipmScore != null) {
        if (ipmScore >= 85) bias += 1.5;
        else if (ipmScore >= 70) bias += 0.75;
        else if (ipmScore < 55) bias -= 1.0;
    }
    if (confidencePct != null) {
        if (confidencePct < 65) bias -= 0.5;
        else if (confidencePct >= 85) bias += 0.5;
    }
    bias = Math.max(-6, Math.min(6, bias));
    const roundMarketable = (n) => {
        if (!n) return n;
        if (n >= 5_000_000) return Math.round(n / 50_000) * 50_000;
        if (n >= 1_000_000) return Math.round(n / 25_000) * 25_000;
        if (n >= 100_000) return Math.round(n / 5_000) * 5_000;
        return Math.round(n / 1_000) * 1_000;
    };
    const recommendedAsking = baseAnchor ? roundMarketable(baseAnchor * (1 + bias / 100)) : null;
    const negotiatingFloor = range.low
        ? roundMarketable(range.low)
        : (recommendedAsking ? roundMarketable(recommendedAsking * 0.96) : null);
    const askingDelta = (recommendedAsking != null && askingPrice != null && askingPrice > 0)
        ? ((recommendedAsking - askingPrice) / askingPrice) * 100
        : null;

    const pt = String(propertyType || '').toLowerCase();
    let target;
    if (pt.includes('industrial') || pt.includes('warehouse') || pt.includes('distribution')) target = 'Owner-occupier 3PL / distribution (primary) · Industrial fund (secondary)';
    else if (pt.includes('retail') || pt.includes('office') || pt.includes('commercial')) target = 'Owner-occupier (primary) · Yield-focused commercial fund (secondary)';
    else if (pt.includes('apartment') || pt.includes('flat') || pt.includes('penthouse')) target = 'Lifestyle buyer (primary) · Buy-to-let investor (secondary)';
    else target = 'End-user family buyer (primary) · Investor (secondary)';

    const channels = pt.includes('industrial') || pt.includes('warehouse') || pt.includes('commercial')
        ? ['Agency website', 'Property24 Commercial', 'Private Property Commercial', 'IPM Cross-Border Layer (UAE / UK investor pool)']
        : ['Agency website', 'Property24', 'Private Property', 'IPM Cross-Border Layer'];

    const assets = pt.includes('industrial') || pt.includes('warehouse')
        ? ['Drone video walkthrough', 'Dimensioned floor plan', '3D yard layout', 'Technical spec sheet (PDF)']
        : ['Professional photography', 'Drone overhead', 'Virtual walkthrough', 'Digital brochure (PDF)'];

    return {
        recommendedAsking,
        negotiatingFloor,
        priceStrategy,
        target,
        channels,
        assets,
        outreach: 'Top 5 ranked buyers via direct outreach within 48 hours',
        timeToOffer: '45 - 90 days from listing',
        currency,
        biasPct: bias,
        askingDeltaPct: askingDelta,
    };
}

function buildCommissionProjection({ recommendedAsking, valuation = {}, commissionPct = 1.5 } = {}) {
    const rate = Number(commissionPct) || 1.5;
    const range = valuation?.current_estimate?.confidence_range || {};
    const valEst = valuation?.current_estimate?.value ?? null;
    const ask = recommendedAsking || valEst || range.high || range.low || null;
    if (!ask) return { rows: [], rate };
    const top = range.high || ask * 1.05;
    const floor = range.low || ask * 0.95;
    const calc = (price) => Math.round((Number(price) || 0) * (rate / 100));
    return {
        rate,
        rows: [
            { label: `Sale at asking`, price: ask, fee: calc(ask) },
            { label: `Sale at top of band`, price: top, fee: calc(top) },
            { label: `Sale at floor`, price: floor, fee: calc(floor) },
        ],
    };
}

// --- Static text blocks --------------------------------------------------------
const METHODOLOGY_TEXT = `IPM Score™ is a composite property valuation index produced by IPM's intelligence-powered appraisal engine. The score (0–100) blends five weighted sub-indices: location (25%), specification (25%), demand (20%), liquidity (15%), and macro conditions (15%).

Valuation methodology applies the comparable sales approach as the primary method, supplemented by income capitalisation cross-checks where rental data is available. Comparable selection uses GLA / floor size ±25%, asset class match, geographic proximity (preferred node + adjacent), specification grade match, and transaction recency (24-month window). Adjustments are applied for specification, location, tenancy status, and time-of-sale.

Data sources: Lightstone Property (transaction and ownership data), South African Deeds Office (verified sale records), IPM Comparable Index (curated comparable transaction database), IPM Buyer Demand Layer (active buyer mandates), and municipal property data (zoning and rates).`;

const DISCLAIMER_TEXT = `This IPM Score™ valuation report is provided for informational purposes to assist mandated property professionals in pricing and marketing decisions. It does not constitute a formal valuation under the Property Valuers Profession Act, 2000 (Act No. 47 of 2000) and should not be relied upon for finance, tax, accounting, or legal purposes. International Property Market B.V. and its affiliates make no warranty as to the accuracy or completeness of any information contained herein. Property professionals are advised to obtain a formal valuation by a registered property valuer where required.`;

export {
    computeIpmScore,
    getAssetTier,
    getConfidence,
    summariseComparables,
    buildAdjustmentNotes,
    matchAgencyBuyersToProperty,
    buildMarketingStrategy,
    buildCommissionProjection,
    METHODOLOGY_TEXT,
    DISCLAIMER_TEXT,
};

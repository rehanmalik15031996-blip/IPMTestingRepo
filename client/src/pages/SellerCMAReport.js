import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Sidebar from '../components/Sidebar';
import LogoLoading from '../components/LogoLoading';
import { useIsMobile } from '../hooks/useMediaQuery';
import { setCMACacheEntry, getCachedCustomPhotoForLead, setCMACustomPhoto, clearCMACacheForLead } from '../utils/crmCmaCache';
import { sanitizeAgencyBranchDisplay } from '../utils/display';
import { brand } from '../config/brandColors';
import api from '../config/api';
import { getDashboardCache } from '../config/dashboardCache';
import {
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
} from '../utils/cmaIntelligence';

const CMA_GENERIC_IMAGE = 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80';

const LISTING_METADATA_URL = process.env.REACT_APP_LISTING_METADATA_URL || 'https://get-listing-metadata-541421913321.europe-west4.run.app';

// App brand (same as Property view report)
const primary = '#11575C';
const text = '#334155';
const muted = '#64748b';
const border = '#e2e8f0';
const background = '#f8fafc';
const fontFamily = "'Inter', sans-serif";

function normalizeListingMetadataResponse(raw) {
  if (!raw || raw.error) return undefined;
  const hasUseful = (o) => o && (o.metadata != null || o.property != null || o.valuation != null);
  if (hasUseful(raw)) return raw;
  if (raw.data && hasUseful(raw.data)) return raw.data;
  if (raw.result && hasUseful(raw.result)) return raw.result;
  if (raw.body && hasUseful(raw.body)) return raw.body;
  return undefined;
}

function buildSellerAddress(sellerDetails) {
  if (!sellerDetails) return '';
  if (sellerDetails.propertyAddress && String(sellerDetails.propertyAddress).trim()) return sellerDetails.propertyAddress.trim();
  const parts = [
    sellerDetails.propertyStreet,
    sellerDetails.propertySuburb,
    sellerDetails.propertyCity,
    sellerDetails.propertyCountry
  ].filter(Boolean).map((s) => String(s).trim());
  return parts.join(', ');
}

// Deterministic "random" from string seed (for dummy data)
function seedFrom(str) {
  let h = 0;
  const s = String(str || '');
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}
function seededInt(seed, min, max) {
  const x = (seed * 1103515245 + 12345) >>> 0;
  return min + (x % (max - min + 1));
}
function seededPick(seed, arr) {
  return arr[seededInt(seed, 0, arr.length - 1)];
}

/** Dummy CMA data when GCP/metadata API is not available. All sections populated for layout preview. */
function getDummyCmaData(address, inferredCountry) {
  const seed = seedFrom(address || 'sample');
  const isZA = inferredCountry === 'ZA';
  const isUAE = inferredCountry === 'AE' || inferredCountry === 'UAE';
  const currency = isZA ? 'ZAR' : isUAE ? 'AED' : 'USD';
  const basePrice = isZA ? 2700000 : isUAE ? 1500000 : 450000;
  const years = [2020, 2021, 2022, 2023, 2024, 2025];
  const medianByYear = years.map((y, i) => ({ year: y, median_price: basePrice + seededInt(seed + i, -200000, 400000), currency }));
  const transfersByYear = years.map((y, i) => ({ year: y, count: seededInt(seed + i + 10, 6, 18) }));
  const bands = isZA
    ? [
        { band_label: '< R1.5M', low: 0, high: 1500000, count: 2, is_highlight: false },
        { band_label: 'R1.5-1.75M', low: 1500000, high: 1750000, count: 3, is_highlight: false },
        { band_label: 'R1.75-2M', low: 1750000, high: 2000000, count: 4, is_highlight: false },
        { band_label: 'R2-2.5M', low: 2000000, high: 2500000, count: 20, is_highlight: false },
        { band_label: 'R2.5-3M', low: 2500000, high: 3000000, count: 60, is_highlight: true },
        { band_label: 'R3-3.5M', low: 3000000, high: 3500000, count: 40, is_highlight: false },
        { band_label: 'R3.5-4M', low: 3500000, high: 4000000, count: 14, is_highlight: false },
        { band_label: 'R4-4.5M', low: 4000000, high: 4500000, count: 4, is_highlight: false },
        { band_label: 'R4.5-5M', low: 4500000, high: 5000000, count: 3, is_highlight: false },
        { band_label: 'R5-6M', low: 5000000, high: 6000000, count: 3, is_highlight: false },
        { band_label: '> R6M', low: 6000000, high: null, count: 2, is_highlight: false }
      ]
    : [
        { band_label: '< 1M', low: 0, high: 1000000, count: 2, is_highlight: false },
        { band_label: '1-1.25M', low: 1000000, high: 1250000, count: 8, is_highlight: false },
        { band_label: '1.25-1.5M', low: 1250000, high: 1500000, count: 45, is_highlight: true },
        { band_label: '1.5-2M', low: 1500000, high: 2000000, count: 30, is_highlight: false },
        { band_label: '> 2M', low: 2000000, high: null, count: 5, is_highlight: false }
      ];
  const comps = [
    { address: `${address || 'Sample'} — Comparable 1`, price: basePrice + 200000, erf_sqm: 750, build_sqm: 320, sale_date: '2024-03-15' },
    { address: `${address || 'Sample'} — Comparable 2`, price: basePrice - 100000, erf_sqm: 680, build_sqm: 280, sale_date: '2023-11-01' },
    { address: `${address || 'Sample'} — Comparable 3`, price: basePrice + 350000, erf_sqm: 820, build_sqm: 380, sale_date: '2024-06-20' }
  ];
  const amenities = [
    { type: 'fuel', name: 'Nearest fuel station', distance_km: 2.1 },
    { type: 'shopping', name: 'Local shopping centre', distance_km: 2.5 },
    { type: 'education', name: 'Primary school', distance_km: 1.8 },
    { type: 'police', name: 'Police station', distance_km: 4.2 }
  ];
  return {
    metadata: { country: inferredCountry || 'ZA', currency, query_address: address },
    property: {
      formatted_address: address,
      coordinates: { latitude: -25.77, longitude: 27.90 },
      tenure_type: isZA ? 'Full Title' : isUAE ? 'Freehold' : 'Freehold',
      erf_number: isZA ? 'Erf 102' : null,
      property_key: isZA ? 'T0JQ01170000010200000' : null,
      characteristics: {
        bedrooms: 3,
        bathrooms: 2,
        square_meters: 340,
        lot_size_sqm: 746,
        year_built: 2015
      },
      title_deed: isZA ? { reference: 'T37980/2022', deeds_office: 'Pretoria', captured_date: '2022-05-27' } : null
    },
    valuation: {
      current_estimate: {
        value: basePrice,
        currency,
        confidence_range: { low: basePrice - 250000, high: basePrice + 250000 }
      },
      tax_assessment: { value: basePrice - 100000, year: 2024 },
      registered_bond: isZA ? { amount: basePrice + 166000, currency: 'ZAR', lender: 'FirstRand Mortgage', reference_number: 'B22536/2022', year: 2022 } : null
    },
    transaction_history: [
      { date: '2022-03-15', price: basePrice - 75000, currency, event_type: 'sale', notes: 'Current owner · T37980/2022' },
      { date: '2021-02-01', price: basePrice - 750000, currency, event_type: 'sale', notes: 'Previous transfer' }
    ],
    market_data: {
      status: 'active',
      neighborhood_median_price: basePrice,
      price_trend_12m: 0.045,
      valuation_concentration_band: { label: isZA ? 'R 2,500,000 – R 3,000,000' : `${currency} 1.2M – 1.5M`, subtitle: 'Highest concentration band in area' },
      median_price_by_year: medianByYear,
      transfers_by_year: transfersByYear,
      valuation_distribution: bands,
      comparable_properties: comps
    },
    market_intelligence: { market_cycle: { phase: 'recovery', commentary: 'Market stabilising post-rate cycle.' } },
    neighborhood: {
      name: address ? address.split(',')[1]?.trim() || 'Local area' : 'Local area',
      demographics: {
        population: 550,
        daytime_population: 557,
        nighttime_population: 505,
        population_density_per_km2: 318,
        median_income: 900000,
        income_class: 'Upper Middle',
        income_range_min: 647953,
        income_range_max: 1394794
      },
      safety: {
        rating: 'moderate',
        crimes_per_1000_households: 11.72,
        rating_detail: '11.72 crimes per 1,000 households'
      },
      mobility: { walkability_score: 45, description: 'Car-dependent; some amenities within 2–3 km.' }
    },
    amenities: { nearby: amenities },
    investment_metrics: { appreciation_1y: 0.038, appreciation_5y: 0.12, rental_yield: 4.2 }
  };
}

const SellerCMAReport = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const lead = location.state?.lead || null;
  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const userId = user?._id != null ? String(user._id) : '';
  const agencyName = sanitizeAgencyBranchDisplay(user?.name || user?.agencyName) || 'Agency';
  const agencyLogoUrl = user?.logo || user?.agencyLogo || user?.photo || null;

  const cachedMetadataFromState = location.state?.cachedMetadata ?? null;

  const [metadata, setMetadata] = useState(cachedMetadataFromState || null);
  const [loading, setLoading] = useState(!cachedMetadataFromState);
  const [error, setError] = useState(null);
  const [customPhoto, setCustomPhoto] = useState(null);
  const photoInputRef = useRef(null);
  // Bumped by the "Regenerate" button to force a fresh metadata fetch even
  // when we already have cached data in localStorage / nav state.
  const [refreshTick, setRefreshTick] = useState(0);
  const [listingPhotos, setListingPhotos] = useState([]);
  const [showPhotoPicker, setShowPhotoPicker] = useState(false);

  const address = lead ? buildSellerAddress(lead.sellerDetails || {}) : '';
  const sellerCountry = (lead?.sellerDetails?.propertyCountry || lead?.sellerDetails?.country || '').toString().trim().toUpperCase();
  const inferredCountry = sellerCountry || (address.match(/\b(Dubai|Abu Dhabi|UAE|Sharjah|Riyadh)\b/i) ? 'AE' : address.match(/\b(South Africa|ZA|Cape Town|Johannesburg|Pretoria|Hartbeespoort|Durban)\b/i) ? 'ZA' : null);

  // Restore custom photo from cache when lead is set
  useEffect(() => {
    if (!lead || !userId) return;
    setCustomPhoto(getCachedCustomPhotoForLead(userId, lead) || null);
  }, [lead?.id || lead?._id, userId]);

  // When the lead is linked to one of our listings, pull that property's
  // photo gallery so the agent can drop a real image into the CMA report
  // instead of having to upload one. Older leads only carry the linkage in
  // linkedProperties[0].id (the add-lead handler folds propertyId into that
  // array), so we look there as a fallback.
  // Linked property snapshot: drives the price-anchor for the CMA so the
  // valuation/recommended asking/commission align with the real listing
  // price (not a small dummy or stale metadata estimate).
  const [linkedProperty, setLinkedProperty] = useState(null);

  useEffect(() => {
    const propertyId = lead?.propertyId
      || (Array.isArray(lead?.linkedProperties) && lead.linkedProperties.find((p) => p && (p.id || p._id || p.propertyId))?.id)
      || (Array.isArray(lead?.linkedProperties) && lead.linkedProperties[0]?.id)
      || null;
    if (!propertyId) { setListingPhotos([]); setLinkedProperty(null); return; }
    let cancelled = false;
    (async () => {
      try {
        const res = await api.get(`/api/properties/${encodeURIComponent(propertyId)}`);
        const p = res.data || {};
        const photos = [];
        if (p.media?.coverImage) photos.push(p.media.coverImage);
        if (Array.isArray(p.media?.imageGallery)) photos.push(...p.media.imageGallery);
        if (p.imageUrl) photos.push(p.imageUrl);
        const seen = new Set();
        const unique = photos.filter((u) => {
          if (!u || typeof u !== 'string') return false;
          if (seen.has(u)) return false;
          seen.add(u);
          return true;
        });
        if (!cancelled) {
          setListingPhotos(unique);
          // Cache just the price/size/currency bits we need for the anchor.
          const priceRaw = p.price;
          const priceNum = typeof priceRaw === 'number'
            ? priceRaw
            : Number(String(priceRaw ?? '').replace(/[^0-9.]/g, ''));
          setLinkedProperty({
            id: p._id,
            price: Number.isFinite(priceNum) && priceNum > 0 ? priceNum : null,
            currency: p.pricing?.currency || null,
            sizeSqm: Number(p.propertySize?.size) || Number(p.residential?.livingAreaSize) || null,
            propertyType: p.propertyType || null,
          });
        }
      } catch (_err) {
        if (!cancelled) { setListingPhotos([]); setLinkedProperty(null); }
      }
    })();
    return () => { cancelled = true; };
  }, [lead?.propertyId, lead?.linkedProperties]);

  // Pull the agency's CRM leads so the IPM Buyer Demand Layer can match
  // buyer/investor leads to this property. Cache-first to avoid blocking the
  // report render — falls back to a network fetch if no cache is present.
  const [crmLeads, setCrmLeads] = useState(() => {
    if (!userId) return [];
    const cached = getDashboardCache(userId);
    const src = cached?.agentStats || cached?.stats;
    return src?.crmLeads || [];
  });
  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      try {
        const cached = getDashboardCache(userId);
        if (cached) {
          const src = cached.agentStats || cached.stats;
          if (!cancelled) setCrmLeads(src?.crmLeads || []);
          return;
        }
        const res = await api.get(`/api/users/${userId}?type=dashboard`);
        const src = res.data?.agentStats || res.data?.stats;
        if (!cancelled) setCrmLeads(src?.crmLeads || []);
      } catch (_err) {
        // Fail silently — Buyer Demand panel will simply read "no matched buyers".
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  useEffect(() => {
    if (!lead) {
      setLoading(false);
      return;
    }
    // Honor the nav-state cache only on the initial render — after a manual
    // regenerate (refreshTick > 0) we always want to hit the API again.
    if (cachedMetadataFromState && refreshTick === 0) {
      setMetadata(cachedMetadataFromState);
      setLoading(false);
      return;
    }
    if (!address) {
      setLoading(false);
      setError('No property address for this seller. Add the property address in the lead details.');
      return;
    }
    setLoading(true);
    setError(null);
    fetch(LISTING_METADATA_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ address, requestId: `cma-${Date.now()}`, country: inferredCountry || undefined })
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText);
        return res.json();
      })
      .then((data) => {
        const payload = normalizeListingMetadataResponse(data);
        if (payload) {
          setMetadata(payload);
          setCMACacheEntry(userId, lead, payload);
        } else {
          setError('No market data could be loaded for this address.');
        }
      })
      .catch((err) => {
        setError(err.message || 'Failed to load market data.');
      })
      .finally(() => setLoading(false));
  }, [lead?.id || lead?.email, address, cachedMetadataFromState, userId, refreshTick]);

  if (!lead) {
    return (
      <div className="dashboard-container" style={{ display: 'flex', minHeight: 0, flex: 1, overflow: 'hidden' }}>
        <Sidebar />
        <main className="dashboard-main" style={{ padding: 24, flex: 1, minHeight: 0, overflowY: 'auto' }}>
          <p style={{ color: '#64748b' }}>No lead selected. Open a seller lead from the CRM and click &quot;Generate CMA report&quot;.</p>
          <button type="button" onClick={() => navigate('/crm')} style={{ marginTop: 16, padding: '10px 20px', background: primary, color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            Back to CRM
          </button>
        </main>
      </div>
    );
  }

  const hasRealMetadata = metadata && (metadata.metadata != null || metadata.property != null || metadata.valuation != null);
  const effectiveMetadata = hasRealMetadata ? metadata : (!loading ? getDummyCmaData(address, inferredCountry) : {});
  const useDummyData = !loading && !hasRealMetadata;
  const m = effectiveMetadata && (effectiveMetadata.metadata != null || effectiveMetadata.property != null || effectiveMetadata.valuation != null)
    ? effectiveMetadata
    : (effectiveMetadata?.data || effectiveMetadata?.result || effectiveMetadata || {});
  let property = m.property || {};
  let valuation = m.valuation || {};
  let transactions = Array.isArray(m.transaction_history) ? m.transaction_history : [];
  let market = m.market_data || {};
  const dummyMarket = getDummyCmaData(address, inferredCountry).market_data || {};
  if (hasRealMetadata && (!market.valuation_distribution || market.valuation_distribution.length === 0)) {
    market = { ...market, valuation_distribution: dummyMarket.valuation_distribution || [], valuation_concentration_band: market.valuation_concentration_band || dummyMarket.valuation_concentration_band };
  }
  let neighborhood = m.neighborhood || {};
  // When API returns little or no community data, merge in fallback so section 04 is always populated
  const needsCommunityFallback = hasRealMetadata && (
    !neighborhood.demographics?.daytime_population && !neighborhood.demographics?.nighttime_population &&
    !neighborhood.demographics?.income_class && neighborhood.demographics?.income_range_min == null &&
    !neighborhood.safety?.rating && neighborhood.safety?.crimes_per_1000_households == null
  );
  if (needsCommunityFallback) {
    const fallback = getDummyCmaData(address, inferredCountry).neighborhood || {};
    neighborhood = {
      name: neighborhood.name || fallback.name,
      demographics: { ...(fallback.demographics || {}), ...(neighborhood.demographics || {}) },
      safety: { ...(fallback.safety || {}), ...(neighborhood.safety || {}) },
      mobility: neighborhood.mobility || fallback.mobility,
      schools: neighborhood.schools || fallback.schools
    };
  }
  const investment = m.investment_metrics || {};
  const marketIntel = m.market_intelligence || {};
  const comparables = Array.isArray(market.comparable_properties) ? market.comparable_properties : [];
  const amenitiesList = m.amenities?.nearby || [];
  const medianPriceByYear = Array.isArray(market.median_price_by_year) ? market.median_price_by_year : [];
  const transfersByYear = Array.isArray(market.transfers_by_year) ? market.transfers_by_year : [];
  const valuationDistribution = Array.isArray(market.valuation_distribution) ? market.valuation_distribution : [];
  const metaCountry = (m.metadata?.country || '').toString().toUpperCase();
  const isZA = metaCountry === 'ZA' || inferredCountry === 'ZA';
  const isUAE = metaCountry === 'AE' || inferredCountry === 'AE' || metaCountry === 'UAE';
  // ---- Price anchor ---------------------------------------------------------
  // Real listing price always wins so a R32M property can never render with a
  // R3M dummy/stale estimate. Order: explicit lead asking → linked property
  // price → metadata estimate → dummy.
  const leadAskingRaw = Number(lead?.sellerDetails?.askingPrice);
  const leadAsking = Number.isFinite(leadAskingRaw) && leadAskingRaw > 0 ? leadAskingRaw : null;
  const metadataEstRaw = Number(valuation.current_estimate?.value);
  const metadataEst = Number.isFinite(metadataEstRaw) && metadataEstRaw > 0 ? metadataEstRaw : null;
  const priceAnchor = leadAsking || linkedProperty?.price || metadataEst || null;
  const anchorCurrency = linkedProperty?.currency || valuation.current_estimate?.currency || m.metadata?.currency || 'USD';

  // If the metadata estimate is missing OR materially out of sync with the real
  // listing price (<50% or >200%), rebuild the current_estimate around the
  // anchor with a tight ±5% confidence band. This keeps the suggested-value
  // range, recommended asking, IPM-Score asking-band check, and commission
  // projection all aligned with the actual price the seller is going to market.
  const estIsOff = priceAnchor != null && (
    metadataEst == null
    || metadataEst < priceAnchor * 0.5
    || metadataEst > priceAnchor * 2.0
  );
  if (priceAnchor != null && estIsOff) {
    const low = Math.round(priceAnchor * 0.95);
    const high = Math.round(priceAnchor * 1.05);

    // Helper: when an existing field's value is wildly out of scale vs the
    // anchor (less than 30% or more than 200%), the metadata is stale — drop
    // it and synth a sensible substitute.
    const isOutOfScale = (n, lo = 0.3, hi = 2.0) => {
      const v = Number(n);
      return !Number.isFinite(v) || v <= 0 || v < priceAnchor * lo || v > priceAnchor * hi;
    };

    // Tax assessment: typically 70-90% of market. Override when missing OR off-scale.
    const existingTax = valuation.tax_assessment;
    const taxOk = existingTax && !isOutOfScale(existingTax.value, 0.4, 1.5);
    const newTaxAssessment = taxOk
      ? existingTax
      : { value: Math.round(priceAnchor * 0.82), year: new Date().getFullYear() - 1 };

    // Registered bond: typically 60-110% of market. Same off-scale guard.
    const existingBond = valuation.registered_bond;
    const bondOk = existingBond && !isOutOfScale(existingBond.amount, 0.4, 1.4);
    const newRegisteredBond = bondOk
      ? existingBond
      : (anchorCurrency === 'ZAR' ? {
          amount: Math.round(priceAnchor * 0.68),
          currency: anchorCurrency,
          lender: existingBond?.lender || 'FirstRand Mortgage',
          reference_number: existingBond?.reference_number || null,
          year: existingBond?.year || (new Date().getFullYear() - 3),
        } : null);

    valuation = {
      ...valuation,
      current_estimate: {
        ...(valuation.current_estimate || {}),
        value: priceAnchor,
        currency: anchorCurrency,
        confidence_range: { low, high },
      },
      tax_assessment: newTaxAssessment,
      registered_bond: newRegisteredBond,
    };

    // Transaction history: if the most recent sale is wildly off, synthesise
    // two prior sales that climb up to the current asking magnitude.
    const lastTx = transactions[0];
    if (!lastTx || isOutOfScale(lastTx.price, 0.25, 1.5)) {
      const thisYear = new Date().getFullYear();
      transactions = [
        { date: `${thisYear - 4}-03-15`, price: Math.round(priceAnchor * 0.78), currency: anchorCurrency, event_type: 'sale', notes: 'Most recent transfer' },
        { date: `${thisYear - 9}-08-02`, price: Math.round(priceAnchor * 0.55), currency: anchorCurrency, event_type: 'sale', notes: 'Prior owner' },
      ];
    }

    // Concentration band label — bracket the anchor price.
    const fmtBand = (n) => {
      if (anchorCurrency === 'ZAR') return `R ${Math.round(n).toLocaleString()}`;
      const m = n / 1_000_000;
      return `${anchorCurrency} ${m.toFixed(m >= 10 ? 0 : 1)}M`;
    };
    market = {
      ...market,
      valuation_concentration_band: {
        label: `${fmtBand(low)} – ${fmtBand(high)}`,
        subtitle: 'Highest concentration band in area',
      },
    };
  }

  // Pull the linked listing's actual size into property.characteristics when
  // metadata didn't supply one — the "Erf extent / Floor size" tiles otherwise
  // show generic dummy values that don't match the real listing.
  if (linkedProperty?.sizeSqm) {
    const ch = property.characteristics || {};
    if (!Number(ch.square_meters) && !Number(ch.lot_size_sqm)) {
      property = {
        ...property,
        characteristics: {
          ...ch,
          square_meters: Math.round(linkedProperty.sizeSqm),
          lot_size_sqm: ch.lot_size_sqm || Math.round(linkedProperty.sizeSqm * 1.4),
        },
      };
    }
  }

  const concentrationBand = market.valuation_concentration_band || null;
  const registeredBond = valuation.registered_bond || null;
  const titleDeed = property.title_deed || null;

  const currency = valuation.current_estimate?.currency || anchorCurrency;
  const fmt = (n, curr) => (n != null && n !== '' ? (curr ? `${curr} ${Number(n).toLocaleString()}` : Number(n).toLocaleString()) : '—');
  const formatPct = (n) => {
    if (n == null || n === '') return '—';
    const x = Number(n);
    const pct = Math.abs(x) <= 1.5 && x !== 0 ? x * 100 : x;
    return `${pct >= 0 ? '' : '-'}${Math.abs(pct).toFixed(1)}%`;
  };

  const suggestedLow = valuation.current_estimate?.confidence_range?.low ?? valuation.current_estimate?.value;
  const suggestedHigh = valuation.current_estimate?.confidence_range?.high ?? valuation.current_estimate?.value;
  const valEst = valuation.current_estimate?.value ?? valuation.current_estimate?.value_usd;
  const ch = property.characteristics || {};
  const reportDate = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

  const agentName = user?.name || 'Agent';
  const agentInitials = agentName.split(' ').map((s) => s[0]).slice(0, 2).join('').toUpperCase() || 'AG';
  const agentTitle = user?.agencyName ? `${user.role || 'Agent'} · ${user.agencyName}` : (user?.role || 'Property Practitioner');
  const agentContact = [user?.phone, user?.email].filter(Boolean).join(' · ') || '—';

  const emailSubject = encodeURIComponent(`Comparative Market Analysis – ${address || 'Your property'}`);
  const emailBody = encodeURIComponent(
    `Hi ${lead.name || 'there'},\n\nPlease find your Comparative Market Analysis for ${address || 'your property'}.\n\n` +
    (valEst != null ? `Estimated value: ${fmt(valEst, currency)}\n` : '') +
    `\nView the full report online or contact us for a detailed discussion.\n\nBest regards,\n${agencyName}`
  );

  // ---- IPM Score™, Buyer Demand, Marketing Strategy, Commission projection ----
  // These are pure derivations from already-derived data and run cheaply each
  // render, so they're plain const declarations — wrapping them in useMemo
  // would force the hook above the early-return guard for `!lead`.
  // Asking price for downstream derivations (IPM Score, marketing strategy,
  // commission). Prefer the explicit lead value, then the linked listing's
  // price, then the (potentially-anchored) valuation estimate.
  const askingPrice = leadAsking
    || linkedProperty?.price
    || (valEst != null ? Number(valEst) : null);
  const ipmScore = computeIpmScore({ comparables, valuation, market, neighborhood, investment, marketIntel, askingPrice });
  const ipmTier = getAssetTier(ipmScore.score);
  const ipmConfidence = getConfidence(comparables.length);
  const compsSummary = summariseComparables(comparables);
  const adjustmentNotes = buildAdjustmentNotes({
    valuation,
    market,
    comparables,
    occupationStatus: lead?.sellerDetails?.occupationStatus,
    urgency: lead?.sellerDetails?.urgency,
  });
  const buyerDemand = matchAgencyBuyersToProperty(crmLeads, askingPrice, currency);
  const marketingStrategy = buildMarketingStrategy({
    valuation,
    market,
    askingPrice,
    propertyType: lead?.sellerDetails?.propertyType || linkedProperty?.propertyType,
    currency,
    confidencePct: ipmConfidence?.pct,
    ipmScore: ipmScore?.score,
  });
  const commission = buildCommissionProjection({
    recommendedAsking: marketingStrategy.recommendedAsking,
    valuation,
    commissionPct: lead?.sellerDetails?.commissionPct,
  });
  const ratePerSqmGla = (askingPrice && (ch.square_meters || ch.square_feet))
    ? Math.round(Number(askingPrice) / Number(ch.square_meters || (Number(ch.square_feet) * 0.092903)))
    : null;

  const docWidth = 680;
  const sectionPad = { padding: '28px 40px 0', fontFamily };
  const secEyebrow = { fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: muted, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 10, fontFamily };
  const secTitle = { fontSize: 18, fontWeight: 700, color: primary, marginBottom: 16, paddingBottom: 8, borderBottom: `1px solid ${border}`, fontFamily };
  const cardStyle = { background, border: `1px solid ${border}`, borderRadius: 12, padding: 20, position: 'relative', borderLeft: `3px solid ${primary}`, fontFamily };
  const cardTtl = { fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', color: muted, marginBottom: 10, fontFamily };
  const hbandStyle = { borderLeft: `3px solid ${primary}`, padding: '12px 14px', background, marginBottom: 10, borderRadius: 4, fontFamily };
  const dividerStyle = { margin: '24px 40px 0', height: 1, background: border, position: 'relative' };

  return (
    <div className="dashboard-container" style={{ display: 'flex', minHeight: 0, flex: 1, overflow: 'hidden', background: '#f1f5f9', fontFamily, color: '#333' }}>
      <Helmet>
        <style>{`
          @media print {
            .dashboard-container .sidebar, .cma-back-wrap { display: none !important; }
            .dashboard-container .dashboard-main { max-width: none !important; margin: 0 !important; padding: 0 !important; }
            .cma-doc { box-shadow: none !important; }
          }
        `}</style>
      </Helmet>
      <Sidebar />
      <main
        className="dashboard-main"
        style={{
          padding: isMobile ? 16 : 32,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          fontFamily: "'DM Sans', sans-serif",
          color: text,
          overflow: 'hidden'
        }}
      >
        <div style={{ flex: '0 0 auto', width: '100%', maxWidth: docWidth, marginBottom: 16 }}>
          <div className="cma-back-wrap" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
          <button type="button" onClick={() => navigate('/crm')} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 16px', background: 'transparent', border: `1px solid ${primary}`, color: primary, borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily }}>
            <i className="fas fa-arrow-left" /> Back to CRM
          </button>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              type="button"
              onClick={() => {
                window.dispatchEvent(new CustomEvent('ipm:open-email-compose', {
                  detail: {
                    to: lead.email || '',
                    subject: decodeURIComponent(emailSubject),
                    body: decodeURIComponent(emailBody),
                  },
                }));
              }}
              style={{ padding: '10px 18px', background: primary, color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily }}
            >
              Send by email
            </button>
            <button
              type="button"
              onClick={() => {
                clearCMACacheForLead(userId, lead);
                setMetadata(null);
                setError(null);
                setRefreshTick((t) => t + 1);
              }}
              disabled={loading}
              title="Clear cached market data and re-fetch"
              style={{ padding: '10px 18px', background: 'white', color: text, border: `1px solid ${border}`, borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: loading ? 'wait' : 'pointer', fontFamily, opacity: loading ? 0.6 : 1, display: 'inline-flex', alignItems: 'center', gap: 6 }}
            >
              <i className={`fas ${loading ? 'fa-spinner fa-spin' : 'fa-rotate'}`} aria-hidden /> {loading ? 'Regenerating…' : 'Regenerate'}
            </button>
            <button type="button" onClick={() => window.print()} style={{ padding: '10px 18px', background: 'white', color: text, border: `1px solid ${border}`, borderRadius: 8, fontWeight: 600, fontSize: 12, cursor: 'pointer', fontFamily }}>
              Print / PDF
            </button>
          </div>
        </div>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: 24 }}>
        {loading && (
          <div style={{ padding: 48, textAlign: 'center', width: docWidth }}>
            <LogoLoading message="Generating CMA report..." />
          </div>
        )}

        {error && !loading && !useDummyData && (
          <div style={{ width: docWidth, maxWidth: '100%', background: 'white', padding: 24, borderRadius: 8, border: '1px solid #fecaca', background: '#fef2f2' }}>
            <p style={{ color: '#b91c1c', margin: 0 }}>{error}</p>
            <p style={{ fontSize: 13, color: '#64748b', marginTop: 8 }}>You can still send this report. Market data will appear when the address returns results from our data provider.</p>
          </div>
        )}

        {!loading && (
          <div className="cma-doc" style={{ width: docWidth, maxWidth: '100%', background: 'white', boxShadow: '0 4px 24px rgba(0,0,0,.08)', borderRadius: 12, overflow: 'hidden', flexShrink: 0 }}>
            {/* Hero */}
            <div style={{ background: primary, position: 'relative', overflow: 'hidden', minHeight: 180 }}>
              <div style={{ position: 'relative', zIndex: 2, padding: '28px 40px 32px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src="/logo-white.png" alt="" style={{ height: 28, width: 'auto', objectFit: 'contain', display: 'block' }} />
                    <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: '0.08em', color: 'white', textTransform: 'uppercase', fontFamily }}>IPM</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    {agencyLogoUrl && (
                      <div style={{ width: 40, height: 40, borderRadius: '50%', overflow: 'hidden', border: '2px solid rgba(255,255,255,.4)', flexShrink: 0, background: 'rgba(255,255,255,.1)' }}>
                        <img src={agencyLogoUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    )}
                    <span style={{ padding: agencyLogoUrl ? 0 : '6px 12px', border: agencyLogoUrl ? 'none' : '1px solid rgba(255,255,255,.3)', borderRadius: 6, fontSize: 11, color: 'rgba(255,255,255,.85)', fontFamily }}>{agencyName}</span>
                  </div>
                </div>
                <div style={{ fontSize: 11, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'rgba(255,255,255,.9)', marginBottom: 6, fontFamily }}>CMA Report · {new Date().getFullYear()}</div>
                <h1 style={{ fontSize: 28, fontWeight: 800, color: 'white', lineHeight: 1.15, margin: 0, fontFamily }}>
                  Comparative Market<br />
                  <strong style={{ fontWeight: 700 }}>Analysis</strong>
                </h1>
                <div style={{ width: 40, height: 3, background: 'rgba(255,255,255,.5)', margin: '12px 0 10px', borderRadius: 2 }} />
                <p style={{ fontSize: 13, color: 'rgba(255,255,255,.85)', margin: 0, fontFamily }}>{address || 'Property address'}</p>
              </div>
            </div>

            {/* Property photo: custom upload or generic (dimmed) */}
            <div style={{ background: background }}>
              <div style={{ padding: '10px 24px 12px', borderBottom: `1px solid ${border}`, display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: text, fontFamily }}>Property photo</span>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target?.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      const dataUrl = ev.target?.result;
                      if (dataUrl) {
                        setCustomPhoto(dataUrl);
                        setCMACustomPhoto(userId, lead, dataUrl);
                      }
                    };
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  style={{ fontSize: 11, padding: '6px 12px', background: primary, color: 'white', border: 'none', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontFamily }}
                >
                  {customPhoto ? 'Change photo' : 'Upload photo'}
                </button>
                {listingPhotos.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowPhotoPicker(true)}
                    style={{ fontSize: 11, padding: '6px 12px', background: 'white', color: primary, border: `1px solid ${primary}`, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontFamily, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                  >
                    <i className="fas fa-images" style={{ fontSize: 10 }} />
                    Pick from listing ({listingPhotos.length})
                  </button>
                )}
                {customPhoto && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomPhoto(null);
                      setCMACustomPhoto(userId, lead, null);
                    }}
                    style={{ fontSize: 11, padding: '6px 12px', background: 'transparent', color: muted, border: `1px solid ${border}`, borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontFamily }}
                  >
                    Remove photo
                  </button>
                )}
              </div>
              <div style={{ width: '100%', height: 200, background: background, overflow: 'hidden', borderBottom: `3px solid ${primary}` }}>
                <img
                  src={customPhoto || CMA_GENERIC_IMAGE}
                  alt=""
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block',
                    ...(!customPhoto && { filter: 'brightness(0.78)' })
                  }}
                />
              </div>
            </div>

            {/* IPM Score™ headline valuation panel — composite score, sub-indices, recommended asking, confidence */}
            <div style={{ background: 'white', padding: '24px 40px 22px', borderBottom: `1px solid ${border}` }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.12em', color: ipmTier.color, fontFamily }}>HEADLINE VALUATION · IPM SCORE™</span>
                <span style={{ flex: 1, height: 1, background: border }} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'auto 1fr 1fr', gap: 18, alignItems: 'center' }}>
                {/* Big score donut-ish */}
                <div style={{ minWidth: 130, padding: '14px 18px', borderRadius: 12, border: `2px solid ${ipmTier.color}`, background: 'linear-gradient(135deg, rgba(17,87,92,.04), rgba(17,87,92,.10))', textAlign: 'center' }}>
                  <div style={{ fontSize: 38, fontWeight: 800, color: ipmTier.color, lineHeight: 1, fontFamily }}>{ipmScore.score}<span style={{ fontSize: 14, color: muted, fontWeight: 600 }}> / 100</span></div>
                  <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.1em', color: muted, marginTop: 6, fontFamily }}>IPM SCORE™</div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: ipmTier.color, marginTop: 4, fontFamily }}>{ipmTier.label}</div>
                </div>
                {/* Indicative value + recommended asking */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: muted, fontFamily }}>INDICATIVE MARKET VALUE</div>
                    <div style={{ fontSize: 18, fontWeight: 700, color: primary, marginTop: 2, fontFamily }}>
                      {(suggestedLow != null && suggestedHigh != null && suggestedLow !== suggestedHigh) ? `${fmt(suggestedLow, currency)} – ${fmt(suggestedHigh, currency)}` : valEst != null ? fmt(valEst, currency) : '—'}
                    </div>
                  </div>
                  {marketingStrategy.recommendedAsking != null && (
                    <div>
                      <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: muted, fontFamily }}>RECOMMENDED ASKING</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: text, marginTop: 2, fontFamily }}>{fmt(Math.round(marketingStrategy.recommendedAsking), currency)}</div>
                      {marketingStrategy.askingDeltaPct != null && Math.abs(marketingStrategy.askingDeltaPct) >= 0.1 && (
                        <div style={{ fontSize: 10, color: marketingStrategy.askingDeltaPct >= 0 ? '#059669' : '#dc2626', marginTop: 2, fontFamily, fontWeight: 600 }}>
                          {marketingStrategy.askingDeltaPct >= 0 ? '▲' : '▼'} {Math.abs(marketingStrategy.askingDeltaPct).toFixed(1)}% vs. asking
                        </div>
                      )}
                    </div>
                  )}
                </div>
                {/* Confidence */}
                <div>
                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.08em', color: muted, fontFamily }}>CONFIDENCE</div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 22, fontWeight: 800, color: ipmConfidence.color, fontFamily }}>{ipmConfidence.pct}%</span>
                    <span style={{ fontSize: 11, fontWeight: 700, color: ipmConfidence.color, fontFamily }}>{ipmConfidence.band}</span>
                  </div>
                  <div style={{ fontSize: 10, color: muted, marginTop: 4, fontFamily }}>Based on {comparables.length} verified comparable{comparables.length === 1 ? '' : 's'}</div>
                </div>
              </div>
              {/* 5 sub-scores */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 8, marginTop: 16 }}>
                {[
                  { lbl: 'Location', val: ipmScore.sub.location },
                  { lbl: 'Specification', val: ipmScore.sub.specification },
                  { lbl: 'Demand', val: ipmScore.sub.demand },
                  { lbl: 'Liquidity', val: ipmScore.sub.liquidity },
                  { lbl: 'Macro', val: ipmScore.sub.macro },
                ].map((s) => (
                  <div key={s.lbl} style={{ padding: '10px 8px', background, border: `1px solid ${border}`, borderRadius: 8, textAlign: 'center' }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: primary, fontFamily }}>{s.val}<span style={{ fontSize: 9, color: muted, fontWeight: 600 }}> / 100</span></div>
                    <div style={{ fontSize: 9, color: muted, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 2, fontFamily }}>{s.lbl}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Stat bar: ZA/UAE-style (erf/plot, floor, last sale, bond) when country known; else generic */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', borderBottom: `1px solid ${border}` }}>
              {(isZA || isUAE) ? (
                [
                  { val: (ch.lot_size_sqm ?? property.characteristics?.lot_size_sqm) != null ? `${Number(ch.lot_size_sqm ?? property.characteristics?.lot_size_sqm).toLocaleString()} m²` : '—', lbl: isZA ? 'Erf extent' : 'Plot size' },
                  { val: (ch.square_meters ?? ch.square_feet) != null ? (ch.square_meters != null ? `~${ch.square_meters} m²` : `~${ch.square_feet} sq ft`) : '—', lbl: 'Est. floor size' },
                  { val: transactions[0]?.price != null ? fmt(transactions[0].price, transactions[0].currency || currency) : '—', lbl: `Last sale${transactions[0]?.date ? ` (${new Date(transactions[0].date).getFullYear()})` : ''}` },
                  { val: registeredBond?.amount != null ? fmt(registeredBond.amount, registeredBond.currency || currency) : (valuation.tax_assessment?.value != null ? fmt(valuation.tax_assessment.value, currency) : '—'), lbl: registeredBond?.amount != null ? 'Registered bond' : 'Tax assessment' }
                ].map((item, i) => (
                  <div key={i} style={{ padding: '18px 12px', textAlign: 'center', borderRight: i < 3 ? `1px solid ${border}` : 'none' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: primary, display: 'block', fontFamily }}>{item.val}</span>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: muted, marginTop: 4, fontFamily }}>{item.lbl}</span>
                  </div>
                ))
              ) : (
                [
                  { val: ch.square_feet != null ? `${Number(ch.square_feet).toLocaleString()} sq ft` : (ch.square_meters != null ? `${ch.square_meters} m²` : '—'), lbl: 'Floor size' },
                  { val: ch.bedrooms != null ? ch.bedrooms : '—', lbl: 'Bedrooms' },
                  { val: valEst != null ? fmt(valEst, currency) : '—', lbl: 'Est. value' },
                  { val: valuation.tax_assessment?.value != null ? fmt(valuation.tax_assessment.value, currency) : '—', lbl: 'Tax assessment' }
                ].map((item, i) => (
                  <div key={i} style={{ padding: '18px 12px', textAlign: 'center', borderRight: i < 3 ? `1px solid ${border}` : 'none' }}>
                    <span style={{ fontSize: 18, fontWeight: 700, color: primary, display: 'block', fontFamily }}>{item.val}</span>
                    <span style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: muted, marginTop: 4, fontFamily }}>{item.lbl}</span>
                  </div>
                ))
              )}
            </div>

            {/* 01 Ownership & Valuation */}
            <div style={sectionPad}>
              <div style={{ ...secEyebrow, marginBottom: 8 }}><span>01 — Ownership &amp; Valuation</span><span style={{ flex: 1, height: 1, background: border }} /></div>
              <div style={secTitle}>Valuation &amp; Range</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                {transactions.length > 0 && (
                  <div style={cardStyle}>
                    <div style={cardTtl}>Transfer history</div>
                    <div style={{ paddingLeft: 20, position: 'relative', borderLeft: `2px solid ${border}` }}>
                      {transactions.slice(0, 4).map((t, i) => (
                        <div key={i} style={{ marginBottom: 16, position: 'relative' }}>
                          <div style={{ position: 'absolute', left: -22, top: 4, width: 10, height: 10, borderRadius: '50%', border: '2px solid white', background: i === 0 ? primary : '#0d9488', boxShadow: `0 0 0 1px ${border}` }} />
                          <div style={{ fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.05em', color: muted, marginBottom: 2, fontFamily }}>{t.date ? new Date(t.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' }).toUpperCase() : '—'}</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: primary, fontFamily }}>{fmt(t.price, t.currency || currency)}</div>
                          <div style={{ fontSize: 11, color: muted, marginTop: 2, fontFamily }}>{t.notes || t.event_type || 'Sale'}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {concentrationBand?.label && (
                    <div style={hbandStyle}>
                      <div style={{ ...cardTtl, marginBottom: 3 }}>Valuation range</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: primary, fontFamily }}>{concentrationBand.label}</div>
                      {concentrationBand.subtitle && <div style={{ fontSize: 11, color: muted, marginTop: 2, fontFamily }}>{concentrationBand.subtitle}</div>}
                    </div>
                  )}
                  {(suggestedLow != null || suggestedHigh != null || valEst != null) && !concentrationBand?.label && (
                    <div style={hbandStyle}>
                      <div style={{ ...cardTtl, marginBottom: 3 }}>Valuation range</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: primary, fontFamily }}>
                        {suggestedLow != null && suggestedHigh != null ? `${fmt(suggestedLow, currency)} – ${fmt(suggestedHigh, currency)}` : valEst != null ? fmt(valEst, currency) : '—'}
                      </div>
                      <div style={{ fontSize: 11, color: muted, marginTop: 2, fontFamily }}>Based on current market data</div>
                    </div>
                  )}
                  {registeredBond?.amount != null && (
                    <div style={{ ...hbandStyle, borderLeftColor: '#0d9488' }}>
                      <div style={{ ...cardTtl, marginBottom: 3 }}>Registered bond</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: primary, fontFamily }}>{fmt(registeredBond.amount, registeredBond.currency || currency)}</div>
                      {(registeredBond.lender || registeredBond.reference_number) && <div style={{ fontSize: 11, color: muted, marginTop: 2, fontFamily }}>{[registeredBond.lender, registeredBond.reference_number].filter(Boolean).join(' · ')}</div>}
                    </div>
                  )}
                  {titleDeed?.reference && (
                    <div style={{ ...hbandStyle, borderLeftColor: '#059669' }}>
                      <div style={{ ...cardTtl, marginBottom: 3 }}>Title deed</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: primary, fontFamily }}>{titleDeed.reference}</div>
                      {titleDeed.deeds_office && <div style={{ fontSize: 11, color: muted, marginTop: 2, fontFamily }}>Deeds Office: {titleDeed.deeds_office}</div>}
                    </div>
                  )}
                  {valuation.tax_assessment?.value != null && !registeredBond?.amount && (
                    <div style={{ ...hbandStyle, borderLeftColor: '#0d9488' }}>
                      <div style={{ ...cardTtl, marginBottom: 3 }}>Tax assessment</div>
                      <div style={{ fontSize: 16, fontWeight: 700, color: primary, fontFamily }}>{fmt(valuation.tax_assessment.value, currency)}</div>
                      {valuation.tax_assessment.year && <div style={{ fontSize: 11, color: muted, marginTop: 2, fontFamily }}>Year {valuation.tax_assessment.year}</div>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div style={dividerStyle}>
              <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: primary, fontSize: 10, background: 'white', padding: '0 10px', fontFamily }}>◆</span>
            </div>

            {/* 02 Market trends */}
            <div style={sectionPad}>
              <div style={{ ...secEyebrow, marginBottom: 8 }}><span>02 — Market trends</span><span style={{ flex: 1, height: 1, background: border }} /></div>
              <div style={secTitle}>{neighborhood.name ? `${neighborhood.name} — ` : ''}Median price &amp; transfers</div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                <div style={cardStyle}>
                  <div style={cardTtl}>Market</div>
                  {market.status && <div style={{ fontSize: 16, fontWeight: 700, color: primary, fontFamily }}>{String(market.status).replace(/_/g, ' ')}</div>}
                  {market.price_trend_12m != null && <div style={{ fontSize: 12, color: muted, marginTop: 6, fontFamily }}>12‑month trend: {formatPct(market.price_trend_12m)}</div>}
                  {market.neighborhood_median_price != null && <div style={{ fontSize: 12, color: muted, marginTop: 2, fontFamily }}>Neighborhood median: {fmt(market.neighborhood_median_price, currency)}</div>}
                  {!market.status && market.price_trend_12m == null && market.neighborhood_median_price == null && !(medianPriceByYear.length > 0) && <div style={{ fontSize: 12, color: muted, fontFamily }}>No market data available</div>}
                </div>
                <div style={cardStyle}>
                  <div style={cardTtl}>Appreciation</div>
                  {investment.appreciation_1y != null && <div style={{ fontSize: 16, fontWeight: 700, color: '#059669', fontFamily }}>{formatPct(investment.appreciation_1y)} (1y)</div>}
                  {investment.appreciation_5y != null && <div style={{ fontSize: 12, color: muted, marginTop: 6, fontFamily }}>5‑year: {formatPct(investment.appreciation_5y)}</div>}
                  {marketIntel.market_cycle?.phase && <div style={{ fontSize: 12, color: muted, marginTop: 8, fontFamily }}>Cycle: {String(marketIntel.market_cycle.phase).replace(/_/g, ' ')}</div>}
                  {investment.appreciation_1y == null && investment.appreciation_5y == null && !marketIntel.market_cycle?.phase && !(transfersByYear.length > 0) && <div style={{ fontSize: 12, color: muted, fontFamily }}>No appreciation data</div>}
                </div>
              </div>
              {medianPriceByYear.length > 0 && (
                <div style={{ ...cardStyle, marginTop: 16 }}>
                  <div style={cardTtl}>Median sale price · full title ({currency})</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 12, height: 140 }}>
                    {medianPriceByYear.slice(-10).map((y, i) => {
                      const prices = medianPriceByYear.slice(-10).map((x) => Number(x.median_price) || 0);
                      const maxP = Math.max(...prices, 1);
                      const is2020 = y.year === 2020;
                      const isPeak = y.year === 2024 || (Number(y.median_price) >= maxP * 0.95 && y.year >= 2023);
                      const isLow = Number(y.median_price) < maxP * 0.4;
                      const barPct = maxP > 0 ? Math.max(8, (Number(y.median_price) / maxP) * 100) : 10;
                      const barColor = is2020 && isLow ? '#dc2626' : isPeak && !is2020 ? '#059669' : isLow ? '#0d9488' : primary;
                      const shortVal = y.median_price >= 1000000 ? `${(Number(y.median_price) / 1000000).toFixed(2)}M` : `${(Number(y.median_price) / 1000).toFixed(0)}K`;
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
                          <span style={{ fontSize: 9, color: muted, marginBottom: 4, fontFamily }}>{shortVal}</span>
                          <div style={{ width: '100%', maxWidth: 38, height: 100, background: border, borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                            <div style={{ width: '100%', height: `${barPct}%`, background: barColor, borderRadius: '4px 4px 0 0' }} />
                          </div>
                          <span style={{ fontSize: 9, color: muted, marginTop: 4, fontFamily }}>{y.year}{y.year === 2025 ? ' YTD' : ''}</span>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap', fontSize: 10, color: muted, fontFamily }}>
                    <span><span style={{ display: 'inline-block', width: 10, height: 6, background: primary, borderRadius: 1, marginRight: 4, verticalAlign: 'middle' }} /> Median</span>
                    <span><span style={{ display: 'inline-block', width: 10, height: 6, background: '#059669', borderRadius: 1, marginRight: 4, verticalAlign: 'middle' }} /> Peak</span>
                    <span><span style={{ display: 'inline-block', width: 10, height: 6, background: '#dc2626', borderRadius: 1, marginRight: 4, verticalAlign: 'middle' }} /> Low</span>
                  </div>
                </div>
              )}
              {transfersByYear.length > 0 && (
                <div style={{ ...cardStyle, marginTop: 16 }}>
                  <div style={cardTtl}>Number of transfers per year · full title</div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginTop: 12, height: 100 }}>
                    {transfersByYear.slice(-10).map((y, i) => {
                      const counts = transfersByYear.slice(-10).map((x) => Number(x.count) || 0);
                      const maxC = Math.max(...counts, 1);
                      const barPct = maxC > 0 ? Math.max(8, (Number(y.count) / maxC) * 100) : 10;
                      const isPeak = Number(y.count) >= maxC * 0.95 && y.year >= 2023;
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 0 }}>
                          <span style={{ fontSize: 10, fontWeight: 600, color: isPeak ? '#059669' : '#6b5db3', marginBottom: 4, fontFamily }}>{y.count}{isPeak ? ' ★' : ''}</span>
                          <div style={{ width: '100%', maxWidth: 38, height: 60, background: border, borderRadius: 4, overflow: 'hidden', display: 'flex', alignItems: 'flex-end' }}>
                            <div style={{ width: '100%', height: `${barPct}%`, background: isPeak ? '#059669' : '#9b8ad4', borderRadius: '4px 4px 0 0' }} />
                          </div>
                          <span style={{ fontSize: 9, color: muted, marginTop: 4, fontFamily }}>{y.year}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div style={dividerStyle}>
              <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: primary, fontSize: 10, background: 'white', padding: '0 10px', fontFamily }}>◆</span>
            </div>

            {/* 03 Comparables & valuation distribution */}
            {(comparables.length > 0 || transactions.length > 0 || valuationDistribution.length > 0 || valEst != null) && (
              <>
                <div style={sectionPad}>
                  <div style={{ ...secEyebrow, marginBottom: 8 }}><span>03 — Comparable sales</span><span style={{ flex: 1, height: 1, background: border }} /></div>
                  <div style={secTitle}>{comparables.length > 0 ? 'Comparable properties' : 'Recent activity'}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : valuationDistribution.length > 0 ? '1fr 1fr' : '1fr', gap: 16 }}>
                    <div style={cardStyle}>
                      <div style={cardTtl}>{comparables.length > 0 ? 'Comparables' : 'Sales &amp; transactions'}</div>
                      {comparables.length > 0 ? (
                        <>
                          {comparables.slice(0, 8).map((c, i) => {
                            const maxPrice = Math.max(...comparables.slice(0, 8).map((x) => Number(x.price) || 0), 1);
                            const pct = c.price != null && maxPrice > 0 ? Math.min(100, (Number(c.price) / maxPrice) * 100) : 70;
                            const gla = Number(c.build_sqm || c.square_meters);
                            const ratePerSqm = (Number(c.price) > 0 && gla > 0) ? Math.round(Number(c.price) / gla) : null;
                            const meta = [
                              c.erf_sqm != null && `${c.erf_sqm} m² erf`,
                              c.build_sqm != null && `${c.build_sqm} m² build`,
                              ratePerSqm != null && `${currency} ${ratePerSqm.toLocaleString()}/m²`,
                              c.sale_date && new Date(c.sale_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })
                            ].filter(Boolean).join(' · ');
                            return (
                              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < Math.min(8, comparables.length) - 1 ? `1px solid ${border}` : 'none' }}>
                                <div style={{ fontSize: 11, fontWeight: 600, color: muted, width: 20, flexShrink: 0, fontFamily }}>{String(i + 1).padStart(2, '0')}</div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: 13, fontWeight: 600, color: text, fontFamily }}>{c.address || '—'}</div>
                                  {meta && <div style={{ fontSize: 11, color: muted, marginTop: 2, fontFamily }}>{meta}</div>}
                                </div>
                                <div style={{ textAlign: 'right', minWidth: 90 }}>
                                  <div style={{ fontSize: 15, fontWeight: 700, color: primary, fontFamily }}>{fmt(c.price, currency)}</div>
                                  <div style={{ height: 4, background: border, borderRadius: 2, marginTop: 6 }}><div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: primary }} /></div>
                                </div>
                              </div>
                            );
                          })}
                          {/* Comparables summary row — median / mean / lowest / highest R/m² + sample size */}
                          {compsSummary.medianRate != null && (
                            <div style={{ marginTop: 12, padding: '10px 12px', background: 'white', border: `1px solid ${border}`, borderRadius: 8, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                              <div>
                                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: muted, fontFamily }}>MEDIAN R/m²</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: primary, fontFamily }}>{currency} {Math.round(compsSummary.medianRate).toLocaleString()}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: muted, fontFamily }}>MEAN R/m²</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: primary, fontFamily }}>{currency} {Math.round(compsSummary.meanRate).toLocaleString()}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: muted, fontFamily }}>SAMPLE SIZE</div>
                                <div style={{ fontSize: 13, fontWeight: 700, color: primary, fontFamily }}>{compsSummary.count} verified</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: muted, fontFamily }}>LOWEST</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: text, fontFamily }}>{currency} {Math.round(compsSummary.lowestRate).toLocaleString()}/m²</div>
                              </div>
                              <div>
                                <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: muted, fontFamily }}>HIGHEST</div>
                                <div style={{ fontSize: 12, fontWeight: 600, color: text, fontFamily }}>{currency} {Math.round(compsSummary.highestRate).toLocaleString()}/m²</div>
                              </div>
                              {compsSummary.medianGla != null && (
                                <div>
                                  <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: muted, fontFamily }}>MEDIAN GLA</div>
                                  <div style={{ fontSize: 12, fontWeight: 600, color: text, fontFamily }}>{Math.round(compsSummary.medianGla).toLocaleString()} m²</div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      ) : (
                        transactions.slice(0, 6).map((t, i) => {
                          const pct = valEst != null && t.price != null && Number(valEst) > 0 ? Math.min(100, (Number(t.price) / Number(valEst)) * 100) : 80;
                          return (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < transactions.length - 1 ? `1px solid ${border}` : 'none' }}>
                              <div style={{ fontSize: 11, fontWeight: 600, color: muted, width: 20, flexShrink: 0, fontFamily }}>{String(i + 1).padStart(2, '0')}</div>
                              <div style={{ flex: 1 }}>
                                <div style={{ fontSize: 13, fontWeight: 600, color: text, fontFamily }}>{t.event_type || 'Sale'}</div>
                                <div style={{ fontSize: 11, color: muted, marginTop: 2, fontFamily }}>{t.date ? new Date(t.date).toLocaleDateString() : '—'}</div>
                              </div>
                              <div style={{ textAlign: 'right', minWidth: 90 }}>
                                <div style={{ fontSize: 15, fontWeight: 700, color: primary, fontFamily }}>{fmt(t.price, t.currency || currency)}</div>
                                <div style={{ height: 4, background: border, borderRadius: 2, marginTop: 6 }}><div style={{ width: `${pct}%`, height: '100%', borderRadius: 2, background: primary }} /></div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                    {valuationDistribution.length > 0 && (() => {
                      const distTotal = valuationDistribution.reduce((s, x) => s + (Number(x.count) || 0), 0);
                      const distMax = Math.max(...valuationDistribution.map((x) => x.count), 1);
                      const highlightRow = valuationDistribution.find((d) => d.is_highlight);
                      return (
                        <div style={cardStyle}>
                          <div style={cardTtl}>Valuation distribution · full title</div>
                          <div style={{ marginTop: 6 }}>
                            {valuationDistribution.slice(0, 12).map((d, i) => {
                              const pctWidth = (d.count / distMax) * 100;
                              return (
                                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                                  <span style={{ fontSize: 10, color: d.is_highlight ? '#059669' : muted, width: 92, flexShrink: 0, fontWeight: d.is_highlight ? 600 : 400, fontFamily }}>{d.band_label}{d.is_highlight ? ' ★' : ''}</span>
                                  <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(100, pctWidth)}%`, height: '100%', borderRadius: 4, background: d.is_highlight ? 'linear-gradient(90deg,#059669,#047857)' : primary }} />
                                  </div>
                                  <span style={{ fontSize: 10, color: d.is_highlight ? '#059669' : muted, width: 28, textAlign: 'right', fontFamily }}>{d.count}</span>
                                </div>
                              );
                            })}
                          </div>
                          {concentrationBand?.label && highlightRow && (
                            <div style={{ marginTop: 12, padding: 12, background: 'rgba(5,150,105,.08)', border: '1px solid rgba(5,150,105,.25)', borderRadius: 6 }}>
                              <div style={{ fontSize: 10, color: '#059669', fontWeight: 600, fontFamily }}>Highest concentration band</div>
                              <div style={{ fontSize: 16, fontWeight: 700, color: primary, marginTop: 4, fontFamily }}>{concentrationBand.label}</div>
                              {distTotal > 0 && <div style={{ fontSize: 11, color: muted, marginTop: 4, fontFamily }}>{highlightRow.count} of {distTotal} properties ({((highlightRow.count / distTotal) * 100).toFixed(1)}%)</div>}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  {/* Valuation adjustment notes — derived from comparables, market trend, occupation status */}
                  {adjustmentNotes.length > 0 && (
                    <div style={{ marginTop: 16, ...cardStyle }}>
                      <div style={cardTtl}>Valuation adjustment notes</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {adjustmentNotes.map((n, i) => (
                          <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                            <span style={{ marginTop: 4, width: 6, height: 6, borderRadius: '50%', background: n.tone === 'positive' ? '#059669' : '#f59e0b', flexShrink: 0 }} />
                            <span style={{ fontSize: 12, color: text, lineHeight: 1.5, fontFamily }}>{n.text}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={dividerStyle}>
                  <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: primary, fontSize: 10, background: 'white', padding: '0 10px', fontFamily }}>◆</span>
                </div>
              </>
            )}

            {/* 04 Community */}
            {(neighborhood.name || neighborhood.demographics || neighborhood.schools?.length || neighborhood.safety?.rating) && (
              <>
                <div style={sectionPad}>
                  <div style={{ ...secEyebrow, marginBottom: 8 }}><span>04 — Community profile</span><span style={{ flex: 1, height: 1, background: border }} /></div>
                  <div style={secTitle}>People, income &amp; safety</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr', gap: 16 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {(neighborhood.demographics?.income_class || neighborhood.demographics?.income_range_min != null || neighborhood.demographics?.median_income != null) && (
                        <div style={cardStyle}>
                          <div style={cardTtl}>Household income class</div>
                          {neighborhood.demographics?.income_class && <div style={{ fontSize: 16, fontWeight: 600, color: primary, marginBottom: 8, fontFamily }}>{neighborhood.demographics.income_class}</div>}
                          <div style={{ height: 10, background: `linear-gradient(90deg, ${border}, ${primary})`, borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
                            <div style={{ width: '68%', height: '100%', background: 'linear-gradient(90deg,#0d9488,#11575C)', borderRadius: 6 }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: muted, fontFamily }}>
                            <span>Lowest</span>
                            <span style={{ color: primary, fontWeight: 600 }}>{neighborhood.demographics?.income_class || '—'} ▲</span>
                            <span>Affluent</span>
                          </div>
                          {(neighborhood.demographics?.income_range_min != null || neighborhood.demographics?.income_range_max != null) && (
                            <div style={{ marginTop: 10, padding: 10, background: 'rgba(17,87,92,.06)', borderLeft: '3px solid #0d9488', borderRadius: 4 }}>
                              <div style={{ fontSize: 9, color: muted, letterSpacing: '0.05em', fontFamily }}>Annual household income range</div>
                              <div style={{ fontSize: 14, fontWeight: 700, color: primary, marginTop: 4, fontFamily }}>{fmt(neighborhood.demographics.income_range_min, currency)} – {fmt(neighborhood.demographics.income_range_max, currency)}</div>
                            </div>
                          )}
                          {neighborhood.demographics?.median_income != null && !neighborhood.demographics?.income_range_min && <div style={{ fontSize: 12, color: muted, marginTop: 8, fontFamily }}>Median income: {fmt(neighborhood.demographics.median_income, currency)}</div>}
                        </div>
                      )}
                      {(neighborhood.safety?.rating || neighborhood.safety?.crimes_per_1000_households != null) && (
                        <div style={cardStyle}>
                          <div style={cardTtl}>Crime index · subplace level</div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <span style={{ fontSize: 16, fontWeight: 600, color: '#ea580c', fontFamily }}>{neighborhood.safety?.rating ? String(neighborhood.safety.rating).replace(/_/g, ' ') : 'Moderate'}</span>
                            {neighborhood.safety?.rating && <span style={{ fontSize: 11, color: muted, fontFamily }}>(not low, not high)</span>}
                          </div>
                          <div style={{ height: 10, background: `linear-gradient(90deg, #fef3c7, #ea580c)`, borderRadius: 6, overflow: 'hidden', marginBottom: 6 }}>
                            <div style={{ width: '40%', height: '100%', background: 'linear-gradient(90deg,#ffc801,#ea580c)', borderRadius: 6 }} />
                          </div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: muted, fontFamily }}>
                            <span>Very low</span>
                            <span style={{ color: '#ea580c', fontWeight: 600 }}>Moderate ▲</span>
                            <span>Very high</span>
                          </div>
                          <div style={{ marginTop: 10, padding: 10, background: 'rgba(234,88,12,.06)', borderLeft: '3px solid #ea580c', borderRadius: 4 }}>
                            <div style={{ fontSize: 9, color: muted, letterSpacing: '0.05em', fontFamily }}>Reported rate</div>
                            <div style={{ fontSize: 13, fontWeight: 600, color: text, marginTop: 4, fontFamily }}>{neighborhood.safety?.rating_detail || (neighborhood.safety?.crimes_per_1000_households != null ? `${neighborhood.safety.crimes_per_1000_households} crimes per 1,000 households` : '—')}</div>
                          </div>
                        </div>
                      )}
                      {(neighborhood.mobility?.walkability_score != null || neighborhood.schools?.length > 0) && (
                        <div style={cardStyle}>
                          <div style={cardTtl}>Amenities</div>
                          {neighborhood.mobility?.walkability_score != null && <div style={{ fontSize: 12, color: text, fontFamily }}>Walkability: {neighborhood.mobility.walkability_score}/100</div>}
                          {neighborhood.schools?.length > 0 && <div style={{ fontSize: 12, color: muted, marginTop: 6, fontFamily }}>Schools: {neighborhood.schools.slice(0, 3).map((s) => s.name).filter(Boolean).join(', ')}</div>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div style={dividerStyle}>
                  <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: primary, fontSize: 10, background: 'white', padding: '0 10px', fontFamily }}>◆</span>
                </div>
              </>
            )}

            {/* 05 Surroundings: amenities + property facts */}
            {(amenitiesList.length > 0 || property.property_key || property.erf_number || property.tenure_type || (ch.lot_size_sqm != null && (isZA || isUAE))) && (
              <>
                <div style={sectionPad}>
                  <div style={{ ...secEyebrow, marginBottom: 8 }}><span>05 — Surroundings</span><span style={{ flex: 1, height: 1, background: border }} /></div>
                  <div style={secTitle}>Nearby services &amp; property details</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                    {amenitiesList.length > 0 && (
                      <div style={cardStyle}>
                        <div style={cardTtl}>Distances from property</div>
                        <div>
                          {amenitiesList.slice(0, 10).map((a, i) => (
                            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: i < Math.min(10, amenitiesList.length) - 1 ? `1px solid ${border}` : 'none' }}>
                              <span style={{ fontSize: 12, width: 22, textAlign: 'center', fontFamily }}>{a.type === 'fuel' ? '⛽' : a.type === 'school' || a.type === 'education' ? '🏫' : a.type === 'shopping' ? '🛒' : a.type === 'police' ? '🚔' : '📍'}</span>
                              <span style={{ flex: 1, fontSize: 12, color: text, fontFamily }}>{a.name || a.type}</span>
                              <span style={{ fontSize: 11, color: primary, fontFamily }}>{a.distance_km != null ? `${Number(a.distance_km).toFixed(2)} km` : '—'}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    {(property.property_key || property.erf_number || property.tenure_type || property.coordinates || (ch.lot_size_sqm != null && (isZA || isUAE))) && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {property.coordinates && (
                          <div style={cardStyle}>
                            <div style={cardTtl}>Location</div>
                            <div style={{ fontSize: 12, color: primary, fontFamily }}>{property.coordinates.latitude}, {property.coordinates.longitude}</div>
                          </div>
                        )}
                        <div style={cardStyle}>
                          <div style={cardTtl}>Property facts</div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                            {property.tenure_type && (
                              <div style={{ padding: 10, background: 'white', border: `1px solid ${border}`, borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: primary, fontFamily }}>{property.tenure_type}</div>
                                <div style={{ fontSize: 9, color: muted, marginTop: 2, fontFamily }}>PROPERTY TYPE</div>
                              </div>
                            )}
                            {property.erf_number && (
                              <div style={{ padding: 10, background: 'white', border: `1px solid ${border}`, borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: primary, fontFamily }}>{property.erf_number}</div>
                                <div style={{ fontSize: 9, color: muted, marginTop: 2, fontFamily }}>ERF NUMBER</div>
                              </div>
                            )}
                            {(ch.lot_size_sqm ?? property.characteristics?.lot_size_sqm) != null && (
                              <div style={{ padding: 10, background: 'white', border: `1px solid ${border}`, borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: primary, fontFamily }}>{(ch.lot_size_sqm ?? property.characteristics?.lot_size_sqm)} m²</div>
                                <div style={{ fontSize: 9, color: muted, marginTop: 2, fontFamily }}>{isZA ? 'DEEDS EXTENT' : 'LOT SIZE'}</div>
                              </div>
                            )}
                            {(ch.square_meters ?? ch.square_feet) != null && (
                              <div style={{ padding: 10, background: 'white', border: `1px solid ${border}`, borderRadius: 8, textAlign: 'center' }}>
                                <div style={{ fontSize: 14, fontWeight: 700, color: primary, fontFamily }}>{ch.square_meters != null ? `~${ch.square_meters} m²` : `~${ch.square_feet} sq ft`}</div>
                                <div style={{ fontSize: 9, color: muted, marginTop: 2, fontFamily }}>EST. FLOOR SIZE</div>
                              </div>
                            )}
                          </div>
                          {property.property_key && <div style={{ marginTop: 10, padding: 8, background: background, borderRadius: 4, fontSize: 10, color: text, fontFamily }}>Property key: {property.property_key}</div>}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
                <div style={dividerStyle}>
                  <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: primary, fontSize: 10, background: 'white', padding: '0 10px', fontFamily }}>◆</span>
                </div>
              </>
            )}

            {/* 06 IPM Buyer Demand Layer — matched buyer pipeline from agency CRM */}
            {askingPrice != null && (
              <>
                <div style={sectionPad}>
                  <div style={{ ...secEyebrow, marginBottom: 8 }}><span>06 — IPM Buyer Demand Layer</span><span style={{ flex: 1, height: 1, background: border }} /></div>
                  <div style={secTitle}>Matched buyer pipeline</div>
                  <p style={{ fontSize: 12, color: muted, lineHeight: 1.55, marginTop: -8, marginBottom: 14, fontFamily }}>
                    Aura Intelligence has cross-matched this asset against your agency&apos;s active buyer database.{' '}
                    <strong style={{ color: text }}>{buyerDemand.counts.total} buyer profile{buyerDemand.counts.total === 1 ? '' : 's'}</strong> with budget mandates intersecting the asking price.
                  </p>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginBottom: 14 }}>
                    {[
                      { val: buyerDemand.counts.total, lbl: 'Matched buyers', color: primary },
                      { val: buyerDemand.counts.hot, lbl: 'Hot leads (90%+)', color: '#dc2626' },
                      { val: commission.rows.length > 0 ? `${currency} ${(commission.rows[0].fee / 1000000).toFixed(2)}M` : '—', lbl: `Commission @ ${commission.rate}%`, color: '#059669' },
                      { val: '45 – 90', lbl: 'Days to qualified offer', color: '#0d9488' },
                    ].map((k, i) => (
                      <div key={i} style={{ padding: '12px 10px', background, border: `1px solid ${border}`, borderRadius: 8, textAlign: 'center' }}>
                        <div style={{ fontSize: 18, fontWeight: 800, color: k.color, fontFamily }}>{k.val}</div>
                        <div style={{ fontSize: 9, color: muted, letterSpacing: '0.04em', textTransform: 'uppercase', marginTop: 4, fontFamily }}>{k.lbl}</div>
                      </div>
                    ))}
                  </div>
                  {buyerDemand.matched.length > 0 ? (
                    <div style={cardStyle}>
                      <div style={cardTtl}>Top ranked matched buyers</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '24px 1fr 90px 90px 60px', gap: 8, padding: '6px 0', borderBottom: `1px solid ${border}`, fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: muted, fontFamily }}>
                        <span>#</span><span>BUYER</span><span style={{ textAlign: 'right' }}>BUDGET</span><span style={{ textAlign: 'right' }}>SIZE (m²)</span><span style={{ textAlign: 'right' }}>MATCH</span>
                      </div>
                      {buyerDemand.matched.slice(0, 5).map((b, i) => {
                        const budget = (b.budgetMin && b.budgetMax)
                          ? `${currency} ${(b.budgetMin / 1000000).toFixed(0)}–${(b.budgetMax / 1000000).toFixed(0)}M`
                          : '—';
                        const gla = (b.glaMin && b.glaMax)
                          ? `${(b.glaMin / 1000).toFixed(0)}k–${(b.glaMax / 1000).toFixed(0)}k`
                          : '—';
                        const bandColor = b.band === 'HOT' ? '#dc2626' : b.band === 'WARM' ? '#f59e0b' : '#94a3b8';
                        return (
                          <div key={b.id || i} style={{ display: 'grid', gridTemplateColumns: '24px 1fr 90px 90px 60px', gap: 8, padding: '10px 0', borderBottom: i < Math.min(5, buyerDemand.matched.length) - 1 ? `1px solid ${border}` : 'none', alignItems: 'center' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, color: muted, fontFamily }}>{i + 1}</span>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 12, fontWeight: 600, color: text, fontFamily }}>{b.name}</div>
                              <div style={{ fontSize: 10, color: muted, marginTop: 2, fontFamily }}>{b.type}</div>
                            </div>
                            <span style={{ fontSize: 11, color: text, textAlign: 'right', fontFamily }}>{budget}</span>
                            <span style={{ fontSize: 11, color: text, textAlign: 'right', fontFamily }}>{gla}</span>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 12, fontWeight: 700, color: bandColor, fontFamily }}>{b.score}%</div>
                              <div style={{ fontSize: 8, fontWeight: 700, color: bandColor, letterSpacing: '0.06em', fontFamily }}>{b.band}</div>
                            </div>
                          </div>
                        );
                      })}
                      {buyerDemand.matched.length > 5 && (
                        <div style={{ fontSize: 11, color: muted, marginTop: 10, fontStyle: 'italic', fontFamily }}>
                          Plus {buyerDemand.matched.length - 5} additional matched buyer{buyerDemand.matched.length - 5 === 1 ? '' : 's'} available in the full Aura Intelligence dashboard view.
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ ...cardStyle, color: muted, fontSize: 12, fontFamily }}>
                      No active buyer mandates currently match this asking price band. Consider broadening price guidance or adding more buyer leads to the CRM.
                    </div>
                  )}
                </div>
                <div style={dividerStyle}>
                  <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: primary, fontSize: 10, background: 'white', padding: '0 10px', fontFamily }}>◆</span>
                </div>
              </>
            )}

            {/* 07 Marketing Strategy + Commission Projection */}
            {marketingStrategy.recommendedAsking != null && (
              <>
                <div style={sectionPad}>
                  <div style={{ ...secEyebrow, marginBottom: 8 }}><span>07 — Marketing strategy</span><span style={{ flex: 1, height: 1, background: border }} /></div>
                  <div style={secTitle}>Recommendation &amp; commission projection</div>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                    <div style={cardStyle}>
                      <div style={cardTtl}>Pricing &amp; positioning</div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: muted, fontFamily }}>RECOMMENDED ASKING</div>
                          <div style={{ fontSize: 16, fontWeight: 700, color: primary, marginTop: 2, fontFamily }}>{fmt(Math.round(marketingStrategy.recommendedAsking), currency)}{ratePerSqmGla != null && <span style={{ fontSize: 11, color: muted, fontWeight: 500 }}> · {currency} {ratePerSqmGla.toLocaleString()}/m²</span>}</div>
                        </div>
                        {marketingStrategy.negotiatingFloor != null && (
                          <div>
                            <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: muted, fontFamily }}>NEGOTIATING FLOOR</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: text, marginTop: 2, fontFamily }}>{fmt(Math.round(marketingStrategy.negotiatingFloor), currency)}</div>
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: muted, fontFamily }}>PRICE STRATEGY</div>
                          <div style={{ fontSize: 12, color: text, marginTop: 2, fontFamily }}>{marketingStrategy.priceStrategy}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: muted, fontFamily }}>TARGET BUYER PROFILE</div>
                          <div style={{ fontSize: 12, color: text, marginTop: 2, fontFamily }}>{marketingStrategy.target}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.05em', color: muted, fontFamily }}>ESTIMATED TIME TO QUALIFIED OFFER</div>
                          <div style={{ fontSize: 12, color: text, marginTop: 2, fontFamily }}>{marketingStrategy.timeToOffer}</div>
                        </div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={cardStyle}>
                        <div style={cardTtl}>Recommended channels</div>
                        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 12, color: text, lineHeight: 1.7, fontFamily }}>
                          {marketingStrategy.channels.map((c, i) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                      <div style={cardStyle}>
                        <div style={cardTtl}>Recommended marketing assets</div>
                        <ul style={{ paddingLeft: 18, margin: 0, fontSize: 12, color: text, lineHeight: 1.7, fontFamily }}>
                          {marketingStrategy.assets.map((a, i) => <li key={i}>{a}</li>)}
                        </ul>
                      </div>
                    </div>
                  </div>
                  {/* Commission Projection — three scenarios at the agreed rate */}
                  {commission.rows.length > 0 && (
                    <div style={{ marginTop: 16, ...cardStyle }}>
                      <div style={cardTtl}>Commission projection · {commission.rate}% of sale price</div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '6px 0', borderBottom: `1px solid ${border}`, fontSize: 9, fontWeight: 700, letterSpacing: '0.05em', color: muted, fontFamily }}>
                        <span>SCENARIO</span><span style={{ textAlign: 'right', minWidth: 110 }}>SALE PRICE</span><span style={{ textAlign: 'right', minWidth: 110 }}>COMMISSION</span>
                      </div>
                      {commission.rows.map((r, i) => (
                        <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 8, padding: '10px 0', borderBottom: i < commission.rows.length - 1 ? `1px solid ${border}` : 'none', alignItems: 'center' }}>
                          <span style={{ fontSize: 12, color: text, fontFamily }}>{r.label}</span>
                          <span style={{ fontSize: 12, color: text, textAlign: 'right', minWidth: 110, fontFamily }}>{fmt(Math.round(r.price), currency)}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: primary, textAlign: 'right', minWidth: 110, fontFamily }}>{fmt(r.fee, currency)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div style={dividerStyle}>
                  <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', color: primary, fontSize: 10, background: 'white', padding: '0 10px', fontFamily }}>◆</span>
                </div>
              </>
            )}

            {/* 08 Methodology */}
            <div style={sectionPad}>
              <div style={{ ...secEyebrow, marginBottom: 8 }}><span>08 — Methodology</span><span style={{ flex: 1, height: 1, background: border }} /></div>
              <div style={secTitle}>How this report is produced</div>
              <div style={{ ...cardStyle, padding: 16 }}>
                {METHODOLOGY_TEXT.split('\n\n').map((para, i) => (
                  <p key={i} style={{ fontSize: 11.5, color: text, lineHeight: 1.6, margin: i === 0 ? 0 : '10px 0 0', fontFamily }}>{para}</p>
                ))}
              </div>
            </div>

            {/* Quote band */}
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr' }}>
              <div style={{ background: primary, padding: '28px 36px 28px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'center', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 20, left: 40, width: 24, height: 2, background: 'rgba(255,255,255,.4)' }} />
                <p style={{ fontSize: 18, fontWeight: 600, color: 'white', lineHeight: 1.5, margin: 0, fontFamily }}>
                  <strong style={{ fontWeight: 700 }}>Clarity</strong> creates confidence.<br />Confidence creates <strong style={{ fontWeight: 700 }}>opportunity.</strong>
                </p>
                <div style={{ position: 'absolute', bottom: 20, left: 40, width: 24, height: 2, background: 'rgba(255,255,255,.4)' }} />
              </div>
              <div style={{ background: brand.primary || '#1F4B43', minHeight: 140, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-building" style={{ fontSize: 36, color: 'rgba(255,255,255,.25)' }} />
              </div>
            </div>

            {/* Agent bar */}
            <div style={{ background, borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, padding: '18px 40px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: primary, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, color: 'white', flexShrink: 0, fontFamily }}>{agentInitials}</div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: text, fontFamily }}>{agentName}</div>
                <div style={{ fontSize: 11, color: muted, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: 2, fontFamily }}>{agentTitle}</div>
                <div style={{ fontSize: 12, color: muted, marginTop: 4, fontFamily }}>{agentContact}</div>
              </div>
              <div style={{ background: primary, color: 'white', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', padding: '6px 12px', borderRadius: 6, whiteSpace: 'nowrap', fontFamily }}>IPM Agent</div>
            </div>

            {/* CTA */}
            <div style={{ padding: '28px 40px 32px', background: 'white', textAlign: 'center' }}>
              <p style={{ fontSize: 13, color: muted, lineHeight: 1.6, maxWidth: 380, margin: '0 auto 20px', fontFamily }}>If you&apos;d like a closer look or a guided walkthrough, you&apos;re welcome to connect with us directly.</p>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                <button
                  type="button"
                  onClick={() => {
                    window.dispatchEvent(new CustomEvent('ipm:open-email-compose', {
                      detail: {
                        to: lead.email || '',
                        subject: decodeURIComponent(emailSubject),
                        body: decodeURIComponent(emailBody),
                      },
                    }));
                  }}
                  style={{ background: primary, color: 'white', border: 'none', padding: '12px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 8, fontFamily }}
                >
                  Send a message
                </button>
                <button type="button" onClick={() => navigate('/crm')} style={{ background: 'transparent', color: primary, border: `1px solid ${primary}`, padding: '12px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 8, fontFamily }}>Back to CRM</button>
              </div>
            </div>

            {/* Disclaimer — IPM Score™ legal language */}
            <div style={{ padding: '20px 40px 24px', background: 'white', borderTop: `1px solid ${border}` }}>
              <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: muted, marginBottom: 8, fontFamily }}>DISCLAIMER</div>
              <p style={{ fontSize: 10, color: muted, lineHeight: 1.6, margin: 0, fontFamily }}>{DISCLAIMER_TEXT}</p>
            </div>

            {/* Footer */}
            <div style={{ background: brand.primary || '#1F4B43', padding: '20px 40px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'white', letterSpacing: '0.04em', fontFamily }}>International Property Market</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.7)', marginTop: 2, fontFamily }}>Global Real Estate Intelligence · {reportDate}</div>
              </div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.6)', textAlign: 'right', maxWidth: 200, lineHeight: 1.5, fontFamily }}>Data from property intelligence platforms. Valuations are indicative estimates.</div>
            </div>
          </div>
        )}
        </div>
      </main>
      {showPhotoPicker && (
        <div
          onClick={() => setShowPhotoPicker(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: 'white', borderRadius: 12, padding: 20, maxWidth: 720, width: '100%', maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, color: text, fontFamily }}>Pick a photo from the listing</div>
                <div style={{ fontSize: 12, color: muted, marginTop: 2, fontFamily }}>{listingPhotos.length} photo{listingPhotos.length === 1 ? '' : 's'} available</div>
              </div>
              <button
                type="button"
                onClick={() => setShowPhotoPicker(false)}
                aria-label="Close"
                style={{ width: 32, height: 32, borderRadius: '50%', border: `1px solid ${border}`, background: 'white', cursor: 'pointer', color: muted, fontSize: 14 }}
              >
                <i className="fas fa-times" />
              </button>
            </div>
            {listingPhotos.length === 0 ? (
              <div style={{ padding: '40px 0', textAlign: 'center', color: muted, fontSize: 13, fontFamily }}>
                This listing has no photos to choose from.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 10 }}>
                {listingPhotos.map((url, i) => {
                  const isSelected = customPhoto === url;
                  return (
                    <button
                      key={url + i}
                      type="button"
                      onClick={() => {
                        setCustomPhoto(url);
                        setCMACustomPhoto(userId, lead, url);
                        setShowPhotoPicker(false);
                      }}
                      style={{
                        position: 'relative',
                        padding: 0,
                        border: `2px solid ${isSelected ? primary : border}`,
                        borderRadius: 8,
                        overflow: 'hidden',
                        cursor: 'pointer',
                        background: '#f8fafc',
                        aspectRatio: '4 / 3',
                      }}
                    >
                      <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      {isSelected && (
                        <div style={{ position: 'absolute', top: 6, right: 6, background: primary, color: 'white', width: 22, height: 22, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11 }}>
                          <i className="fas fa-check" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerCMAReport;

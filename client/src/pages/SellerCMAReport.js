import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import Sidebar from '../components/Sidebar';
import LogoLoading from '../components/LogoLoading';
import { useIsMobile } from '../hooks/useMediaQuery';
import { setCMACacheEntry, getCachedCustomPhotoForLead, setCMACustomPhoto } from '../utils/crmCmaCache';
import { sanitizeAgencyBranchDisplay } from '../utils/display';
import { brand } from '../config/brandColors';

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

  const address = lead ? buildSellerAddress(lead.sellerDetails || {}) : '';
  const sellerCountry = (lead?.sellerDetails?.propertyCountry || lead?.sellerDetails?.country || '').toString().trim().toUpperCase();
  const inferredCountry = sellerCountry || (address.match(/\b(Dubai|Abu Dhabi|UAE|Sharjah|Riyadh)\b/i) ? 'AE' : address.match(/\b(South Africa|ZA|Cape Town|Johannesburg|Pretoria|Hartbeespoort|Durban)\b/i) ? 'ZA' : null);

  // Restore custom photo from cache when lead is set
  useEffect(() => {
    if (!lead || !userId) return;
    setCustomPhoto(getCachedCustomPhotoForLead(userId, lead) || null);
  }, [lead?.id || lead?._id, userId]);

  useEffect(() => {
    if (!lead) {
      setLoading(false);
      return;
    }
    if (cachedMetadataFromState) {
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
  }, [lead?.id || lead?.email, address, cachedMetadataFromState, userId]);

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
  const property = m.property || {};
  const valuation = m.valuation || {};
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
  const transactions = Array.isArray(m.transaction_history) ? m.transaction_history : [];
  const comparables = Array.isArray(market.comparable_properties) ? market.comparable_properties : [];
  const amenitiesList = m.amenities?.nearby || [];
  const medianPriceByYear = Array.isArray(market.median_price_by_year) ? market.median_price_by_year : [];
  const transfersByYear = Array.isArray(market.transfers_by_year) ? market.transfers_by_year : [];
  const valuationDistribution = Array.isArray(market.valuation_distribution) ? market.valuation_distribution : [];
  const concentrationBand = market.valuation_concentration_band || null;
  const registeredBond = valuation.registered_bond || null;
  const titleDeed = property.title_deed || null;
  const metaCountry = (m.metadata?.country || '').toString().toUpperCase();
  const isZA = metaCountry === 'ZA' || inferredCountry === 'ZA';
  const isUAE = metaCountry === 'AE' || inferredCountry === 'AE' || metaCountry === 'UAE';
  const currency = valuation.current_estimate?.currency || m.metadata?.currency || 'USD';
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
            <a href={`mailto:${lead.email || ''}?subject=${emailSubject}&body=${emailBody}`} style={{ padding: '10px 18px', background: primary, color: 'white', borderRadius: 8, fontWeight: 600, fontSize: 12, textDecoration: 'none', fontFamily }}>
              Send by email
            </a>
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
                        comparables.slice(0, 8).map((c, i) => {
                          const maxPrice = Math.max(...comparables.slice(0, 8).map((x) => Number(x.price) || 0), 1);
                          const pct = c.price != null && maxPrice > 0 ? Math.min(100, (Number(c.price) / maxPrice) * 100) : 70;
                          const meta = [c.erf_sqm != null && `${c.erf_sqm} m² erf`, c.build_sqm != null && `${c.build_sqm} m² build`, c.sale_date && new Date(c.sale_date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })].filter(Boolean).join(' · ');
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
                        })
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
                <a href={`mailto:${lead.email || ''}?subject=${emailSubject}&body=${emailBody}`} style={{ background: primary, color: 'white', border: 'none', padding: '12px 24px', fontSize: 13, fontWeight: 600, textDecoration: 'none', borderRadius: 8, fontFamily }}>Send a message</a>
                <button type="button" onClick={() => navigate('/crm')} style={{ background: 'transparent', color: primary, border: `1px solid ${primary}`, padding: '12px 24px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: 8, fontFamily }}>Back to CRM</button>
              </div>
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
    </div>
  );
};

export default SellerCMAReport;

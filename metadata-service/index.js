/**
 * myIPM Property Intelligence API v3.2 — Real Data First
 *
 * TIER 1: Google Geocoding + Places Nearby + Elevation (verified, real)
 * TIER 2: Free APIs — Open-Meteo, BigDataCloud, REST Countries, UK Land Registry, US ZipMarketData
 * TIER 3: Tavily web search + Claude extraction — real-time web data for valuations, comps, market data
 * TIER 4: Claude enrichment — ONLY summarises real data from Tiers 1-3, never invents facts
 *
 * Environment variables:
 *   GOOGLE_API_KEY      – Google Maps Platform (Geocoding + Places + Elevation) [required]
 *   TAVILY_API_KEY      – Tavily Search API for web research [required for Tier 3]
 *   ANTHROPIC_API_KEY   – Claude extraction + enrichment [required for Tiers 3-4]
 *
 * Deploy to Cloud Run / Cloud Functions. Same POST interface:
 *   Body: { address, requestId?, country? }
 */
const Anthropic = require('@anthropic-ai/sdk');
const express = require('express');

const app = express();
app.use(express.json({ limit: '10mb' }));

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY;
const TAVILY_API_KEY = process.env.TAVILY_API_KEY;
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

const anthropic = ANTHROPIC_API_KEY ? new Anthropic({ apiKey: ANTHROPIC_API_KEY }) : null;

const log = (msg) => console.log(`[${new Date().toISOString()}] ${msg}`);

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).send('');
  next();
});

// ---------------------------------------------------------------------------
// Health check
// ---------------------------------------------------------------------------
app.get('/', (req, res) => {
  res.json({
    status: 'ok',
    service: 'myIPM Property Intelligence API',
    version: '3.2.0',
    description: 'Real-data-first property intelligence with Tavily web search + Claude analysis.',
    tiers: {
      tier1: 'Google Geocoding + Places Nearby + Elevation (verified)',
      tier2: 'Open-Meteo, BigDataCloud, REST Countries, UK Land Registry, US ZipMarketData (free)',
      tier3: 'Tavily web search + Claude extraction (real-time web data for valuations, comps, market)',
      tier4: 'Claude summarises & enriches all verified data'
    },
    configured: {
      google_api: !!GOOGLE_API_KEY,
      tavily_api: !!TAVILY_API_KEY,
      anthropic_api: !!ANTHROPIC_API_KEY
    }
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// TIER 1 — Google APIs (verified, real data)
// ═══════════════════════════════════════════════════════════════════════════

async function googleGeocode(address) {
  if (!GOOGLE_API_KEY) return null;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
  const resp = await fetch(url);
  const data = await resp.json();
  if (data.status !== 'OK' || !data.results?.length) return null;
  const result = data.results[0];
  const comps = result.address_components || [];
  const find = (type) => comps.find(c => c.types?.includes(type));
  return {
    formatted_address: result.formatted_address,
    place_id: result.place_id,
    latitude: result.geometry.location.lat,
    longitude: result.geometry.location.lng,
    viewport: result.geometry.viewport,
    country: find('country')?.long_name || null,
    country_code: find('country')?.short_name || null,
    state: find('administrative_area_level_1')?.long_name || null,
    city: find('locality')?.long_name || find('administrative_area_level_2')?.long_name || null,
    suburb: find('sublocality_level_1')?.long_name || find('sublocality')?.long_name || null,
    postal_code: find('postal_code')?.long_name || null,
    street_number: find('street_number')?.long_name || null,
    route: find('route')?.long_name || null,
    _raw_components: comps
  };
}

const PLACE_SEARCH_CATEGORIES = [
  { type: 'school',          label: 'school',        radius: 3000 },
  { type: 'hospital',        label: 'hospital',      radius: 5000 },
  { type: 'supermarket',     label: 'grocery',       radius: 3000 },
  { type: 'park',            label: 'park',          radius: 3000 },
  { type: 'shopping_mall',   label: 'shopping',      radius: 5000 },
  { type: 'transit_station', label: 'transit',       radius: 3000 },
];

function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function googlePlacesNearby(lat, lng) {
  if (!GOOGLE_API_KEY) return { amenities: [], schools: [] };
  const allAmenities = [];
  const schoolsDetailed = [];

  const fetches = PLACE_SEARCH_CATEGORIES.map(async ({ type, label, radius }) => {
    try {
      const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_API_KEY}`;
      const resp = await fetch(url);
      const data = await resp.json();
      if (data.status !== 'OK' || !data.results?.length) return;
      for (const place of data.results.slice(0, 5)) {
        const pLat = place.geometry?.location?.lat;
        const pLng = place.geometry?.location?.lng;
        const dist = (pLat && pLng) ? haversineKm(lat, lng, pLat, pLng) : null;
        const entry = {
          type: label, name: place.name,
          distance_km: dist ? Math.round(dist * 100) / 100 : null,
          rating: place.rating || null,
          user_ratings_total: place.user_ratings_total || null,
          vicinity: place.vicinity || null,
          open_now: place.opening_hours?.open_now ?? null,
          place_id: place.place_id
        };
        allAmenities.push(entry);
        if (type === 'school') {
          schoolsDetailed.push({ name: place.name, type: inferSchoolType(place.name), rating: place.rating || null, distance_km: entry.distance_km });
        }
      }
    } catch (err) { log(`Places error type=${type}: ${err.message}`); }
  });
  await Promise.all(fetches);
  allAmenities.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
  schoolsDetailed.sort((a, b) => (a.distance_km ?? 999) - (b.distance_km ?? 999));
  return { amenities: allAmenities, schools: schoolsDetailed };
}

function inferSchoolType(name) {
  const n = (name || '').toLowerCase();
  if (n.includes('primary') || n.includes('elementary') || n.includes('pre-school') || n.includes('preparatory')) return 'elementary';
  if (n.includes('middle') || n.includes('intermediate')) return 'middle';
  if (n.includes('high') || n.includes('secondary') || n.includes('college')) return 'high';
  if (n.includes('university') || n.includes('varsity')) return 'university';
  return 'school';
}

async function googleElevation(lat, lng) {
  if (!GOOGLE_API_KEY) return null;
  try {
    const url = `https://maps.googleapis.com/maps/api/elevation/json?locations=${lat},${lng}&key=${GOOGLE_API_KEY}`;
    const resp = await fetch(url);
    const data = await resp.json();
    if (data.status === 'OK' && data.results?.length) return Math.round(data.results[0].elevation);
  } catch (e) { log(`Elevation error: ${e.message}`); }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER 2 — Free / cheap public APIs
// ═══════════════════════════════════════════════════════════════════════════

async function openMeteoClimate(lat, lng) {
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,uv_index_max&timezone=auto&forecast_days=7`;
    const resp = await fetch(url);
    const data = await resp.json();
    const daily = data.daily || {};
    return {
      current_temp_c: data.current?.temperature_2m ?? null,
      avg_max_temp_c: average(daily.temperature_2m_max),
      avg_min_temp_c: average(daily.temperature_2m_min),
      weekly_precipitation_mm: Math.round(((daily.precipitation_sum || []).reduce((s, v) => s + (v || 0), 0)) * 10) / 10,
      avg_uv_index: average(daily.uv_index_max),
      timezone: data.timezone || null
    };
  } catch (e) { log(`Open-Meteo error: ${e.message}`); return null; }
}

async function openMeteoAirQuality(lat, lng) {
  try {
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lng}&current=european_aqi,us_aqi,pm10,pm2_5,nitrogen_dioxide,ozone`;
    const resp = await fetch(url);
    const data = await resp.json();
    const c = data.current || {};
    const aqi = c.us_aqi ?? c.european_aqi ?? null;
    return { aqi_avg: aqi, pm2_5: c.pm2_5 ?? null, pm10: c.pm10 ?? null, no2: c.nitrogen_dioxide ?? null, ozone: c.ozone ?? null, rating: aqiRating(aqi) };
  } catch (e) { log(`AQI error: ${e.message}`); return null; }
}

function aqiRating(aqi) {
  if (aqi == null) return 'unknown';
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 150) return 'unhealthy_sensitive';
  return 'unhealthy';
}

async function bigDataCloudReverse(lat, lng) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`;
    const resp = await fetch(url);
    return await resp.json();
  } catch (e) { log(`BigDataCloud error: ${e.message}`); return null; }
}

async function restCountriesData(countryCode) {
  if (!countryCode) return null;
  try {
    const url = `https://restcountries.com/v3.1/alpha/${countryCode}?fields=name,currencies,population,area,gini,timezones,region,subregion,languages,capital`;
    const resp = await fetch(url);
    return resp.ok ? await resp.json() : null;
  } catch (e) { log(`REST Countries error: ${e.message}`); return null; }
}

// UK Land Registry — free, no API key needed, SPARQL endpoint
async function ukLandRegistryTransactions(address, postcode) {
  if (!postcode) return null;
  try {
    const sparql = `
      PREFIX ppd: <http://landregistry.data.gov.uk/def/ppi/>
      PREFIX lrcommon: <http://landregistry.data.gov.uk/def/common/>
      SELECT ?date ?price ?propertyType ?newBuild ?street ?locality ?town ?county ?postcode
      WHERE {
        ?txn ppd:pricePaid ?price ;
             ppd:transactionDate ?date ;
             ppd:propertyAddress ?addr ;
             ppd:propertyType ?ptUri .
        ?addr lrcommon:postcode "${postcode.toUpperCase()}"^^<http://www.w3.org/2001/XMLSchema#string> .
        OPTIONAL { ?addr lrcommon:street ?street }
        OPTIONAL { ?addr lrcommon:locality ?locality }
        OPTIONAL { ?addr lrcommon:town ?town }
        OPTIONAL { ?addr lrcommon:county ?county }
        OPTIONAL { ?addr lrcommon:postcode ?postcode }
        BIND(REPLACE(STR(?ptUri), ".*#", "") AS ?propertyType)
        OPTIONAL { ?txn ppd:newBuild ?newBuild }
      }
      ORDER BY DESC(?date)
      LIMIT 20
    `;
    const url = `https://landregistry.data.gov.uk/app/root/qonsole/query?output=json&q=${encodeURIComponent(sparql)}`;
    const resp = await fetch(url, { headers: { Accept: 'application/sparql-results+json' } });
    if (!resp.ok) return null;
    const data = await resp.json();
    const bindings = data.results?.bindings || [];
    if (!bindings.length) return null;
    return bindings.map(b => ({
      date: b.date?.value || null,
      price: b.price?.value ? parseInt(b.price.value) : null,
      currency: 'GBP',
      property_type: b.propertyType?.value || null,
      street: b.street?.value || null,
      town: b.town?.value || null,
      postcode: b.postcode?.value || null,
      new_build: b.newBuild?.value === 'true'
    }));
  } catch (e) { log(`UK Land Registry error: ${e.message}`); return null; }
}

// US ZipMarketData — free tier (50 calls/month), median prices & market stats
async function usZipMarketData(zipCode) {
  if (!zipCode) return null;
  try {
    const url = `https://api.zipmarketdata.com/v1/market?zip=${zipCode}`;
    const resp = await fetch(url);
    if (!resp.ok) return null;
    return await resp.json();
  } catch (e) { log(`ZipMarketData error: ${e.message}`); return null; }
}

const CURRENCY_BY_COUNTRY = {
  ZA: 'ZAR', US: 'USD', GB: 'GBP', AE: 'AED', NL: 'EUR', DE: 'EUR', ES: 'EUR',
  IT: 'EUR', MT: 'EUR', GR: 'EUR', AU: 'AUD', CA: 'CAD', BR: 'BRL', SG: 'SGD',
  HK: 'HKD', JP: 'JPY', CN: 'CNY', IN: 'INR', MX: 'MXN', SA: 'SAR', CH: 'CHF',
  NZ: 'NZD', ID: 'IDR'
};

function currencyForCountry(code) {
  return CURRENCY_BY_COUNTRY[(code || '').toUpperCase()] || 'USD';
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER 3 — Tavily Web Search + Claude Extraction (real-time web data)
// ═══════════════════════════════════════════════════════════════════════════

function buildTavilyQueries(address, countryCode, geo) {
  const suburb = geo.suburb || '';
  const city = geo.city || '';
  const postalCode = geo.postal_code || '';
  const area = suburb || city;

  const domainHints = {
    ZA: { property: ['property24.co.za', 'privateproperty.co.za'], stats: ['numbeo.com', 'statssa.gov.za'] },
    US: { property: ['zillow.com', 'redfin.com', 'realtor.com'], stats: ['neighborhoodscout.com', 'areavibes.com'] },
    GB: { property: ['rightmove.co.uk', 'zoopla.co.uk'], stats: ['police.uk', 'plumplot.co.uk'] },
    AE: { property: ['bayut.com', 'propertyfinder.ae'], stats: ['numbeo.com'] },
  };
  const domains = domainHints[countryCode] || { property: [], stats: [] };

  const listingQueries = [];
  if (countryCode === 'ZA') {
    listingQueries.push(
      { label: 'area_listings', query: `site:privateproperty.co.za "${area}" house for sale`, include_domains: ['privateproperty.co.za'], search_depth: 'advanced', max_results: 10 },
      { label: 'area_listings_2', query: `site:property24.co.za "${area}" property for sale`, include_domains: ['property24.co.za'], search_depth: 'advanced', max_results: 8 },
      { label: 'area_listings_3', query: `"${area}" bedroom house for sale R price ${new Date().getFullYear()}`, include_domains: domains.property, search_depth: 'advanced', max_results: 5 },
    );
  } else if (countryCode === 'AE') {
    listingQueries.push(
      { label: 'area_listings', query: `site:propertyfinder.ae "${area}" apartment for sale AED`, include_domains: ['propertyfinder.ae'], search_depth: 'advanced', max_results: 10 },
      { label: 'area_listings_2', query: `site:bayut.com "${area}" property for sale`, include_domains: ['bayut.com'], search_depth: 'advanced', max_results: 8 },
      { label: 'area_listings_3', query: `"${area}" property for sale AED bedrooms ${new Date().getFullYear()}`, include_domains: domains.property, search_depth: 'advanced', max_results: 5 },
    );
  } else if (countryCode === 'US') {
    listingQueries.push(
      { label: 'area_listings', query: `site:redfin.com "${postalCode || area}" home for sale`, include_domains: ['redfin.com'], search_depth: 'advanced', max_results: 10 },
      { label: 'area_listings_2', query: `site:zillow.com "${postalCode || area}" house for sale`, include_domains: ['zillow.com'], search_depth: 'advanced', max_results: 8 },
      { label: 'area_listings_3', query: `"${area}" ${postalCode} property for sale bedrooms price`, include_domains: domains.property, search_depth: 'advanced', max_results: 5 },
    );
  } else {
    listingQueries.push(
      { label: 'area_listings', query: `properties for sale in ${area} price bedrooms ${new Date().getFullYear()}`, include_domains: domains.property, search_depth: 'advanced', max_results: 10 },
      { label: 'area_listings_2', query: `${area} ${postalCode} property for sale price bedrooms sqm`, include_domains: [], search_depth: 'advanced', max_results: 5 },
    );
  }

  return [
    {
      label: 'property_valuation',
      query: `${address} property listing price valuation`,
      include_domains: domains.property,
      search_depth: 'advanced',
    },
    {
      label: 'market_comparable',
      query: `${area} ${postalCode} average property price median house price comparable sales ${new Date().getFullYear()}`,
      include_domains: domains.property,
      search_depth: 'basic',
    },
    ...listingQueries,
    {
      label: 'rental_market',
      query: `${area} rental price average rent yield ${new Date().getFullYear()}`,
      include_domains: domains.property,
      search_depth: 'basic',
    },
    {
      label: 'crime_demographics',
      query: `${city || area} crime rate safety statistics demographics population`,
      include_domains: domains.stats,
      search_depth: 'basic',
    },
  ];
}

async function tavilySearch(query, options = {}) {
  const body = {
    query,
    api_key: TAVILY_API_KEY,
    search_depth: options.search_depth || 'basic',
    max_results: options.max_results || 5,
    include_answer: true,
  };
  if (options.include_raw_content) body.include_raw_content = true;
  if (options.include_domains?.length) body.include_domains = options.include_domains;

  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    throw new Error(`Tavily ${resp.status}: ${errText}`);
  }
  return resp.json();
}

async function tavilyPropertySearch(address, countryCode, currency, geo) {
  if (!TAVILY_API_KEY || !anthropic) return null;
  try {
    const queries = buildTavilyQueries(address, countryCode, geo);
    const allResults = {};
    const allSources = [];
    const searchQueries = [];

    const isListingQuery = (label) => label.startsWith('area_listings');
    const searches = queries.map(async (q) => {
      try {
        const result = await tavilySearch(q.query, {
          search_depth: q.search_depth,
          include_domains: q.include_domains,
          max_results: q.max_results || 5,
          include_raw_content: isListingQuery(q.label),
        });
        searchQueries.push(q.query);
        const items = (result.results || []).map(r => {
          const item = { title: r.title, url: r.url, content: r.content, score: r.score };
          if (isListingQuery(q.label) && r.raw_content) {
            const maxRaw = 6000;
            item.raw_content = r.raw_content.length > maxRaw ? r.raw_content.substring(0, maxRaw) : r.raw_content;
          }
          return item;
        });
        allResults[q.label] = { answer: result.answer || null, results: items };
        for (const r of items) {
          allSources.push({ title: r.title, url: r.url, relevance: r.score });
        }
      } catch (e) {
        log(`Tavily search error (${q.label}): ${e.message}`);
        allResults[q.label] = null;
      }
    });
    await Promise.all(searches);

    if (!Object.values(allResults).some(v => v && v.results?.length)) {
      log('Tavily: no results from any search');
      return null;
    }

    log(`Tavily found ${allSources.length} web sources across ${searchQueries.length} queries`);

    const extractionPrompt = `You are a property data extraction specialist. Below are REAL web search results about a property and its area. Extract structured data from these results.

ADDRESS: ${address}
COUNTRY CODE: ${countryCode || 'Unknown'}
CITY: ${geo.city || 'Unknown'}
SUBURB/AREA: ${geo.suburb || geo.state || 'Unknown'}
CURRENCY: ${currency}

=== PROPERTY VALUATION SEARCH RESULTS ===
${formatTavilyResults(allResults.property_valuation)}

=== MARKET & COMPARABLE SALES SEARCH RESULTS ===
${formatTavilyResults(allResults.market_comparable)}

=== AREA LISTINGS — INDIVIDUAL PROPERTY PAGES (SET 1) ===
${formatTavilyResults(allResults.area_listings)}

=== AREA LISTINGS — INDIVIDUAL PROPERTY PAGES (SET 2) ===
${formatTavilyResults(allResults.area_listings_2)}

=== AREA LISTINGS — INDIVIDUAL PROPERTY PAGES (SET 3) ===
${formatTavilyResults(allResults.area_listings_3)}

=== RENTAL MARKET SEARCH RESULTS ===
${formatTavilyResults(allResults.rental_market)}

=== CRIME & DEMOGRAPHICS SEARCH RESULTS ===
${formatTavilyResults(allResults.crime_demographics)}

Extract ONLY data that is explicitly stated in the search results above. Return a JSON object:

{
  "valuation": {
    "estimated_value": <integer or null>,
    "estimated_value_source": "<source name and URL or null>",
    "confidence_range_low": <integer or null>,
    "confidence_range_high": <integer or null>,
    "price_per_sqm": <integer or null>,
    "price_per_sqft": <integer or null>
  },
  "transaction_history": [
    { "date": "<ISO date>", "price": <integer>, "event_type": "sale|listing", "source": "<URL>" }
  ],
  "comparable_sales": [
    { "address": "<string>", "price": <integer>, "bedrooms": <int or null>, "square_meters": <int or null>, "sale_date": "<ISO date or null>", "distance_km": <float or null>, "source": "<URL>" }
  ],
  "area_housing": {
    "summary": {
      "avg_asking_price": <integer or null>,
      "min_price": <integer or null>,
      "max_price": <integer or null>,
      "avg_price_per_sqm": <integer or null>,
      "avg_price_per_sqft": <integer or null>,
      "total_listings_found": <integer or null>,
      "property_types_available": ["apartment", "villa", "house", "townhouse", etc.]
    },
    "listings": [
      {
        "title": "<listing title — include address or unit info>",
        "price": <integer — the ACTUAL listed price, NOT an average>,
        "bedrooms": <int or null>,
        "bathrooms": <int or null>,
        "size_sqm": <int or null — property size in square meters>,
        "size_sqft": <int or null — property size in square feet>,
        "lot_size_sqm": <int or null — land/erf size if mentioned>,
        "property_type": "<apartment|house|villa|townhouse|penthouse|land|duplex|other>",
        "address": "<street address or area if available>",
        "url": "<FULL direct URL to this specific listing — REQUIRED>",
        "source_portal": "<portal name e.g. Zillow, Property24, Bayut>"
      }
    ],
    "source": "<primary portal name and URL>"
  },
  "market_data": {
    "neighborhood_median_price": <integer or null>,
    "price_trend_12m_pct": <float or null — e.g. 0.05 for 5%>,
    "avg_days_on_market": <integer or null>,
    "listing_inventory": <integer or null>,
    "median_rent_monthly": <integer or null>,
    "source": "<source name and URL>"
  },
  "rental_data": {
    "estimated_monthly_rent": <integer or null>,
    "rental_yield_pct": <float or null — e.g. 0.065 for 6.5%>,
    "rental_demand": "high|moderate|low|null",
    "source": "<URL>"
  },
  "crime_safety": {
    "crime_index": <float or null>,
    "safety_rating": "very_safe|safe|moderate|unsafe|very_unsafe|null",
    "detail": "<string or null>",
    "source": "<URL>"
  },
  "demographics": {
    "population": <integer or null>,
    "median_income": <integer or null>,
    "median_age": <float or null>,
    "source": "<URL>"
  },
  "web_sources": [
    { "title": "<page title>", "url": "<URL>", "data_found": "<what data came from this source>" }
  ]
}

RULES:
1. ONLY extract data explicitly found in the search results — NEVER invent numbers
2. Every price must include the source URL where you found it
3. All prices as integers in ${currency}
4. If data is not found, set to null
5. CRITICAL for area_housing.listings — FOLLOW THESE URL RULES EXACTLY:
   a. Extract up to 20 individual property listings from the search results
   b. Each listing MUST have a real "price" (actual asking price as integer) AND a "url" (direct link)
   c. The "url" MUST be a DIRECT LINK to that SPECIFIC property's detail page. Examples of VALID urls:
      - privateproperty.co.za/.../T4103178 (has listing ID)
      - property24.com/for-sale/.../<listing-number> (individual property)
      - bayut.com/property/details-12345.html (has detail ID)
      - propertyfinder.ae/en/plp/.../<property-id>.html (individual property)
      - redfin.com/NY/New-York/.../home/12345 (has home ID)
      - zillow.com/homedetails/.../12345_zpid/ (has zpid)
   d. INVALID urls (NEVER use these — they are search/area pages, not individual listings):
      - .../for-sale/.../port-d-afrique/1833 (area search page)
      - .../houses-for-sale/estate-d-afrique/5117 (area search page)
      - .../for-sale/apartments/dubai/dubai-marina/ (area search page)
      - .../homes/for_sale/10018_rb/ (area search page)
      - Any URL that does NOT contain a unique property/listing ID
   e. If a result page lists multiple properties but you cannot find the unique URL for each one, SKIP those listings
   f. Only include listings where you found the SPECIFIC property URL from the search result's own URL field (shown in brackets)
   g. Include the property size (size_sqm or size_sqft) and lot_size_sqm when mentioned
   h. Include the street address or location description in "address"
6. Return ONLY JSON, no markdown`;

    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 6000,
      messages: [{ role: 'user', content: extractionPrompt }],
    });

    let text = msg.content[0].text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last === -1) {
      log('Tavily+Claude: no JSON found in extraction response');
      return null;
    }
    const parsed = JSON.parse(text.substring(first, last + 1));

    return {
      data: parsed,
      grounding: {
        search_queries: searchQueries,
        sources: allSources,
        source_count: allSources.length,
      },
      extraction_usage: {
        input_tokens: msg.usage.input_tokens,
        output_tokens: msg.usage.output_tokens,
      },
    };
  } catch (e) {
    log(`Tavily+Claude search error: ${e.message}`);
    return null;
  }
}

function formatTavilyResults(searchResult) {
  if (!searchResult || !searchResult.results?.length) return 'No results found.';
  let out = '';
  if (searchResult.answer) out += `Summary: ${searchResult.answer}\n\n`;
  for (const r of searchResult.results) {
    out += `[${r.title}](${r.url})\n${r.content}\n`;
    if (r.raw_content) {
      out += `\nFULL PAGE CONTENT (extract individual listing URLs from here):\n${r.raw_content}\n`;
    }
    out += '\n';
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════════════════
// TIER 4 — Claude enrichment (ONLY on real data from Tiers 1-3)
// ═══════════════════════════════════════════════════════════════════════════

async function claudeEnrich(realData) {
  if (!anthropic) return null;

  const prompt = `You are a property intelligence analyst. You have been given VERIFIED, REAL data collected from Google Maps, weather services, public databases, and web searches for a property.

Your job is to ANALYSE and SUMMARISE this data. You must:
1. ONLY use the data provided below — do NOT invent any numbers
2. Where a field cannot be determined from the data, set it to null
3. For regulatory and cross-border fields: provide GENERAL KNOWLEDGE about the country's property laws
4. Write a compelling neighborhood summary using the real amenities and market data

VERIFIED REAL DATA:
${JSON.stringify(realData, null, 2)}

Return a JSON object:
{
  "market_intelligence": {
    "market_cycle": { "phase": "recovery|expansion|peak|correction|bottom", "commentary": "<based on the real market_data provided>" }
  },
  "investment_signals": {
    "recommendation": "buy|hold|sell|wait|null",
    "confidence": <float 0-1 based on how much real data was available>,
    "reasoning": ["<observations from the REAL data only>"],
    "risk_factors": ["<from real data>"],
    "opportunities": ["<from real data>"]
  },
  "regulatory_info": {
    "foreign_ownership": { "restrictions": <bool>, "additional_taxes": <bool>, "summary": "<country knowledge>" },
    "property_tax": { "current_rate": <float or null>, "annual_amount": <int or null> }
  },
  "cross_border_analysis": {
    "international_buyer_suitability": { "key_factors": ["<array>"], "ideal_buyer_profiles": ["investor|expat|retiree|vacation_home"] },
    "tax_implications": {
      "purchase_taxes": { "stamp_duty": <float or null>, "transfer_tax": <float or null>, "total_estimated_pct": <float or null> },
      "capital_gains_tax": { "rate_local": <float or null>, "rate_foreign": <float or null> }
    }
  },
  "esg_analysis": {
    "environmental_score": { "climate_resilience": "high|moderate|low" },
    "social_score": { "walkability": "high|moderate|low", "public_transport_access": "excellent|good|moderate|poor" }
  },
  "expat_analysis": {
    "expat_friendliness_score": <float 0-1 or null>,
    "visa_pathway": { "summary": "<country knowledge>" }
  },
  "neighborhood_summary": "<2-3 compelling sentences for property buyers, using REAL school names, amenity names, and market data from the data provided>",
  "data_confidence_notes": ["<notes about what was verified vs general knowledge>"]
}

Return ONLY JSON. No markdown.`;

  try {
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4000,
      messages: [{ role: 'user', content: prompt }]
    });
    let text = message.content[0].text.trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    const first = text.indexOf('{');
    const last = text.lastIndexOf('}');
    if (first === -1 || last === -1) return null;
    return {
      enrichment: JSON.parse(text.substring(first, last + 1)),
      usage: {
        input_tokens: message.usage.input_tokens,
        output_tokens: message.usage.output_tokens,
        estimated_cost_usd: ((message.usage.input_tokens * 0.003) / 1000 + (message.usage.output_tokens * 0.015) / 1000).toFixed(4)
      }
    };
  } catch (e) { log(`Claude error: ${e.message}`); return null; }
}

// ═══════════════════════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════════════════════

function average(arr) {
  if (!arr?.length) return null;
  const valid = arr.filter(v => v != null);
  return valid.length ? Math.round((valid.reduce((s, v) => s + v, 0) / valid.length) * 10) / 10 : null;
}

function computeWalkability(amenities) {
  if (!amenities?.length) return null;
  const w1 = amenities.filter(a => a.distance_km != null && a.distance_km <= 1).length;
  const w2 = amenities.filter(a => a.distance_km != null && a.distance_km <= 2).length;
  return Math.min(100, Math.round(w1 * 6 + w2 * 2));
}

function computeTransitScore(amenities) {
  const t = amenities.filter(a => a.type === 'transit');
  if (!t.length) return null;
  const closest = Math.min(...t.map(x => x.distance_km ?? 99));
  if (closest <= 0.3) return 90;
  if (closest <= 0.5) return 75;
  if (closest <= 1) return 60;
  if (closest <= 2) return 40;
  return 20;
}

function countInternationalSchools(schools) {
  return schools.filter(s => {
    const n = (s.name || '').toLowerCase();
    return n.includes('international') || n.includes('american') || n.includes('british') || n.includes('french') || n.includes('german');
  }).length;
}

function buildBrowseLinks(countryCode, geo, area) {
  const city = geo.city || '';
  const suburb = geo.suburb || area || '';
  const postal = geo.postal_code || '';
  const enc = encodeURIComponent;
  const links = [];

  const dubaiAreaMap = {
    'marsa dubai': 'dubai-marina', 'dubai marina': 'dubai-marina',
    'nakheel harbour & tower': 'palm-jumeirah', 'palm jumeirah': 'palm-jumeirah',
    'jumeirah beach residence': 'jbr', 'downtown dubai': 'downtown-dubai',
    'business bay': 'business-bay', 'jumeirah lake towers': 'jlt',
    'arabian ranches': 'arabian-ranches', 'dubai hills estate': 'dubai-hills-estate',
    'dubai creek harbour': 'dubai-creek-harbour', 'al barsha': 'al-barsha',
    'jumeirah village circle': 'jumeirah-village-circle',
    'dubai south': 'dubai-south', 'damac hills': 'damac-hills',
    'al furjan': 'al-furjan', 'mirdif': 'mirdif',
  };

  if (countryCode === 'US') {
    if (postal) links.push({ portal: 'Zillow', url: `https://www.zillow.com/homes/for_sale/${postal}_rb/` });
    if (postal) links.push({ portal: 'Realtor.com', url: `https://www.realtor.com/realestateandhomes-search/${postal}` });
    if (postal) links.push({ portal: 'Redfin', url: `https://www.redfin.com/zipcode/${postal}` });
  } else if (countryCode === 'ZA') {
    const searchTerm = suburb || city;
    links.push({ portal: 'Private Property', url: `https://www.google.com/search?q=${enc(searchTerm + ' for sale site:privateproperty.co.za')}` });
    links.push({ portal: 'Property24', url: `https://www.google.com/search?q=${enc(searchTerm + ' for sale site:property24.com')}` });
  } else if (countryCode === 'AE') {
    const rawArea = (suburb || city || '').toLowerCase().trim();
    const dubaiSlug = dubaiAreaMap[rawArea] || rawArea.replace(/[^a-z0-9]+/g, '-').replace(/-+$/, '');
    links.push({ portal: 'Property Finder', url: `https://www.propertyfinder.ae/en/buy/dubai/properties-for-sale-${dubaiSlug}.html` });
    links.push({ portal: 'Bayut', url: `https://www.bayut.com/for-sale/apartments/dubai/${dubaiSlug}/` });
  } else if (countryCode === 'GB') {
    if (postal) links.push({ portal: 'Rightmove', url: `https://www.rightmove.co.uk/house-prices/${postal.replace(/\s/g, '-')}.html` });
    links.push({ portal: 'Zoopla', url: `https://www.zoopla.co.uk/for-sale/details/?q=${enc(suburb || city)}` });
  }

  if (!links.length) {
    links.push({ portal: 'Google', url: `https://www.google.com/search?q=${enc(`properties for sale in ${suburb || city} ${geo.country || ''}`)}` });
  }
  return links;
}

function walkLabel(s) { return s == null ? null : s >= 70 ? 'high' : s >= 40 ? 'moderate' : 'low'; }
function transitLabel(s) { return s == null ? null : s >= 70 ? 'excellent' : s >= 50 ? 'good' : s >= 30 ? 'moderate' : 'poor'; }
function solarPotential(uv) { return uv >= 7 ? 'excellent' : uv >= 5 ? 'good' : uv >= 3 ? 'moderate' : 'poor'; }

function walkabilityDescription(w, t) {
  const p = [];
  if (w != null) p.push(w >= 70 ? 'Highly walkable area with many amenities within walking distance' : w >= 40 ? 'Moderately walkable with some amenities nearby' : 'Car-dependent area');
  if (t != null) p.push(t >= 70 ? 'excellent public transit access' : t >= 40 ? 'moderate public transit options' : 'limited public transit');
  return p.join('; ') || 'Data not available';
}

function computeDataQuality(geo, places, climate, aq, bigData, webData, ukData, usData) {
  let s = 0;
  if (geo) s += 0.2;
  if (places?.amenities?.length > 5) s += 0.15; else if (places?.amenities?.length > 0) s += 0.08;
  if (climate) s += 0.1;
  if (aq?.aqi_avg != null) s += 0.1;
  if (bigData) s += 0.05;
  if (webData?.data?.valuation?.estimated_value != null) s += 0.15;
  if (webData?.data?.comparable_sales?.length > 0) s += 0.1;
  if (webData?.data?.market_data?.neighborhood_median_price != null) s += 0.1;
  if (ukData?.length > 0 || usData) s += 0.05;
  return Math.min(1, Math.round(s * 100) / 100);
}

// ═══════════════════════════════════════════════════════════════════════════
// Main endpoint — orchestrate all 4 tiers
// ═══════════════════════════════════════════════════════════════════════════

app.post('/', async (req, res) => {
  const startTime = Date.now();
  const sources = [];

  try {
    const { address, requestId, country } = req.body;

    if (!address) {
      return res.status(400).json({
        error: 'Missing required parameter: address',
        example: { address: '123 Main Street, City, Country', requestId: 'optional-uuid', country: 'ZA (optional)' }
      });
    }

    log(`Request ${requestId || '-'} | Processing: ${address}`);

    // ── TIER 1: Google Geocoding ──────────────────────────────────────
    const geo = await googleGeocode(address);
    if (!geo) {
      return res.status(422).json({ error: 'Could not geocode address.', address, request_id: requestId || null });
    }
    sources.push('Google Geocoding API');
    log(`Geocoded: ${geo.formatted_address} (${geo.latitude}, ${geo.longitude})`);

    const countryCode = geo.country_code || (country ? country.toUpperCase().slice(0, 2) : null);
    const currency = currencyForCountry(countryCode);

    // ── TIER 1+2: parallel calls ──────────────────────────────────────
    const isUK = countryCode === 'GB';
    const isUS = countryCode === 'US';

    const [placesResult, elevation, climate, airQuality, bigData, countryInfo, ukTransactions, usMarket] = await Promise.all([
      googlePlacesNearby(geo.latitude, geo.longitude),
      googleElevation(geo.latitude, geo.longitude),
      openMeteoClimate(geo.latitude, geo.longitude),
      openMeteoAirQuality(geo.latitude, geo.longitude),
      bigDataCloudReverse(geo.latitude, geo.longitude),
      restCountriesData(countryCode),
      isUK ? ukLandRegistryTransactions(address, geo.postal_code) : Promise.resolve(null),
      isUS ? usZipMarketData(geo.postal_code) : Promise.resolve(null)
    ]);

    if (placesResult.amenities.length) sources.push('Google Places Nearby Search');
    if (elevation != null) sources.push('Google Elevation API');
    if (climate) sources.push('Open-Meteo Weather API');
    if (airQuality) sources.push('Open-Meteo Air Quality API');
    if (bigData) sources.push('BigDataCloud');
    if (countryInfo) sources.push('REST Countries API');
    if (ukTransactions?.length) sources.push('HM Land Registry (free, open data)');
    if (usMarket) sources.push('ZipMarketData API');

    log(`Tier 1+2 done: ${placesResult.amenities.length} amenities, ${placesResult.schools.length} schools`);

    // ── TIER 3: Tavily Web Search + Claude Extraction ────────────────
    let webSearchResult = null;
    if (TAVILY_API_KEY && anthropic) {
      log('Starting Tier 3: Tavily web search + Claude extraction...');
      webSearchResult = await tavilyPropertySearch(address, countryCode, currency, geo);
      if (webSearchResult) {
        sources.push(`Tavily Web Search (${webSearchResult.grounding.source_count} web sources)`);
        log(`Tavily+Claude found ${webSearchResult.grounding.source_count} web sources across ${webSearchResult.grounding.search_queries.length} queries`);
      }
    }

    const gd = webSearchResult?.data || {};

    // ── Build combined real data for Claude ────────────────────────────
    const walkScore = computeWalkability(placesResult.amenities);
    const transitScore = computeTransitScore(placesResult.amenities);
    const intlSchools = countInternationalSchools(placesResult.schools);
    const neighborhoodName = geo.suburb || bigData?.locality || geo.city || null;

    const realDataForClaude = {
      address: geo.formatted_address,
      country: geo.country, country_code: countryCode,
      city: geo.city, suburb: geo.suburb,
      coordinates: { lat: geo.latitude, lng: geo.longitude },
      amenities_count: placesResult.amenities.length,
      schools: placesResult.schools.slice(0, 5).map(s => s.name),
      international_schools: intlSchools,
      walkability_score: walkScore, transit_score: transitScore,
      elevation_m: elevation,
      climate, air_quality: airQuality,
      web_valuation: gd.valuation || null,
      web_market_data: gd.market_data || null,
      web_rental_data: gd.rental_data || null,
      web_crime_safety: gd.crime_safety || null,
      web_demographics: gd.demographics || null,
      uk_transactions: ukTransactions ? ukTransactions.slice(0, 5) : null,
      us_market: usMarket || null
    };

    // ── TIER 4: Claude enrichment ─────────────────────────────────────
    let claudeResult = null;
    if (anthropic) {
      log('Starting Tier 4: Claude enrichment...');
      claudeResult = await claudeEnrich(realDataForClaude);
      if (claudeResult) sources.push('Claude AI (analysis of verified data)');
    }

    const ai = claudeResult?.enrichment || {};

    // ── Merge UK Land Registry into transaction_history ────────────────
    let transactionHistory = [];
    if (ukTransactions?.length) {
      transactionHistory = ukTransactions.map(t => ({
        date: t.date, price: t.price, currency: 'GBP',
        event_type: 'sale', price_change_pct: null,
        notes: `${t.property_type || ''} ${t.new_build ? '(new build)' : ''} — ${t.street || ''}, ${t.postcode || ''}`.trim(),
        source: 'HM Land Registry (verified)'
      }));
    }
    if (gd.transaction_history?.length) {
      for (const t of gd.transaction_history) {
        transactionHistory.push({
          date: t.date, price: t.price, currency, event_type: t.event_type || 'sale',
          price_change_pct: null, notes: null,
          source: t.source || 'Tavily web search'
        });
      }
    }

    // ── Merge comparable sales ─────────────────────────────────────────
    let comparables = [];
    if (gd.comparable_sales?.length) {
      comparables = gd.comparable_sales.map(c => ({
        address: c.address, price: c.price, bedrooms: c.bedrooms || null,
        square_meters: c.square_meters || null, erf_sqm: null, build_sqm: null,
        distance_km: c.distance_km || null, sale_date: c.sale_date || null,
        source: c.source || 'Tavily web search'
      }));
    }

    // ── Merge market data ──────────────────────────────────────────────
    const medianPrice = gd.market_data?.neighborhood_median_price
      || (usMarket?.median_sale_price)
      || null;
    const priceTrend = gd.market_data?.price_trend_12m_pct
      || (usMarket?.price_change_yoy)
      || null;
    const medianRent = gd.rental_data?.estimated_monthly_rent || gd.market_data?.median_rent_monthly || null;
    const rentalYield = gd.rental_data?.rental_yield_pct || null;

    // ── Safety from Gemini ─────────────────────────────────────────────
    const safetyData = gd.crime_safety || {};
    const demoData = gd.demographics || {};

    // ── Assemble final response (matches v2.x schema) ─────────────────
    const propertyData = {
      metadata: {
        query_address: address,
        query_timestamp: new Date().toISOString(),
        country: countryCode,
        data_quality_score: computeDataQuality(geo, placesResult, climate, airQuality, bigData, webSearchResult, ukTransactions, usMarket),
        sources,
        currency,
        request_id: requestId || null,
        data_tiers: {
          tier1_google: true,
          tier2_free_apis: !!(climate || airQuality || bigData || countryInfo || ukTransactions || usMarket),
          tier3_web_search: !!webSearchResult,
          tier4_ai_enrichment: !!claudeResult
        }
      },

      property: {
        formatted_address: geo.formatted_address,
        coordinates: { latitude: geo.latitude, longitude: geo.longitude },
        property_type: null, tenure_type: null, erf_number: null, property_key: null,
        characteristics: {
          bedrooms: null, bathrooms: null, square_feet: null, square_meters: null,
          lot_size_sqft: null, lot_size_sqm: null, year_built: null, parking_spaces: null,
          features: [], elevation_m: elevation
        },
        title_deed: { reference: null, deeds_office: null, captured_date: null }
      },

      valuation: {
        current_estimate: gd.valuation?.estimated_value != null ? {
          value: gd.valuation.estimated_value,
          currency,
          value_usd: null,
          last_updated: new Date().toISOString().split('T')[0],
          confidence_range: {
            low: gd.valuation.confidence_range_low || null,
            high: gd.valuation.confidence_range_high || null
          },
          source: gd.valuation.estimated_value_source || 'Tavily web search'
        } : null,
        price_per_sqft: gd.valuation?.price_per_sqft || null,
        price_per_sqm: gd.valuation?.price_per_sqm || null,
        tax_assessment: { value: null, year: null },
        registered_bond: null
      },

      transaction_history: transactionHistory,

      market_data: {
        status: null,
        listing_price: null,
        rent_estimate: { monthly: medianRent, currency },
        price_trend_12m: priceTrend,
        neighborhood_median_price: medianPrice,
        valuation_concentration_band: null,
        median_price_by_year: [],
        transfers_by_year: [],
        valuation_distribution: [],
        comparable_properties: comparables,
        avg_days_on_market: gd.market_data?.avg_days_on_market || null,
        source: gd.market_data?.source || null
      },

      area_housing: (() => {
        const ah = gd.area_housing || {};
        const areaPagePatterns = [
          /privateproperty\.co\.za\/for-sale\/[^T]*$/,
          /privateproperty\.co\.za\/houses-for-sale\/[^T]*$/,
          /property24\.co\.za\/for-sale\/[^/]*\/[^/]*\/[^/]*\/$/,
          /bayut\.com\/for-sale\/(property|apartments)\/dubai\/[^/]+\/$/,
          /propertyfinder\.ae\/.*properties-for-sale[^/]*\.html$/,
          /zillow\.com\/homes\/for_sale\//,
          /redfin\.com\/zipcode\//,
          /realtor\.com\/realestateandhomes-search\//,
        ];
        const isAreaPage = (url) => areaPagePatterns.some(p => p.test(url));
        const listings = (ah.listings || [])
          .filter(l => l.price && l.url && !isAreaPage(l.url))
          .map(l => ({
            title: l.title || null,
            price: l.price,
            currency,
            bedrooms: l.bedrooms || null,
            bathrooms: l.bathrooms || null,
            size_sqm: l.size_sqm || null,
            size_sqft: l.size_sqft || null,
            lot_size_sqm: l.lot_size_sqm || null,
            property_type: l.property_type || null,
            address: l.address || null,
            url: l.url,
            source_portal: l.source_portal || null,
          }));
        return {
          summary: {
            avg_asking_price: ah.summary?.avg_asking_price || null,
            min_price: ah.summary?.min_price || null,
            max_price: ah.summary?.max_price || null,
            avg_price_per_sqm: ah.summary?.avg_price_per_sqm || null,
            avg_price_per_sqft: ah.summary?.avg_price_per_sqft || null,
            total_listings_found: ah.summary?.total_listings_found || null,
            property_types_available: ah.summary?.property_types_available || [],
            currency,
          },
          listings,
          browse_links: buildBrowseLinks(countryCode, geo, neighborhoodName),
          source: ah.source || null,
        };
      })(),

      market_intelligence: {
        national_index: null, regional_index: null,
        market_cycle: ai.market_intelligence?.market_cycle || null
      },

      neighborhood: {
        name: neighborhoodName,
        demographics: {
          population: demoData.population || countryInfo?.population || null,
          daytime_population: null, nighttime_population: null, population_density_per_km2: null,
          median_income: demoData.median_income || null,
          income_class: null, income_range_min: null, income_range_max: null,
          median_age: demoData.median_age || null,
          owner_occupied_pct: null,
          source: demoData.source || null
        },
        schools: placesResult.schools.slice(0, 10),
        safety: {
          crime_index: safetyData.crime_index || null,
          violent_crime_rate: null,
          crimes_per_1000_households: null,
          rating: safetyData.safety_rating || null,
          rating_detail: safetyData.detail || null,
          source: safetyData.source || null
        },
        mobility: { walkability_score: walkScore, transit_score: transitScore, description: walkabilityDescription(walkScore, transitScore) },
        summary: ai.neighborhood_summary || null
      },

      amenities: {
        nearby: placesResult.amenities.slice(0, 40).map(a => ({
          type: a.type, name: a.name, distance_km: a.distance_km, rating: a.rating, user_ratings_total: a.user_ratings_total
        }))
      },

      investment_metrics: {
        rental_yield: rentalYield,
        cap_rate: null,
        appreciation_1y: priceTrend,
        appreciation_5y: null,
        vacancy_rate: null
      },

      rental_market: {
        vacancy_rate: null,
        rental_demand: gd.rental_data?.rental_demand || null,
        short_term_rental: null
      },

      environmental_data: {
        climate_risk: { flood_risk: null, fire_risk: null, earthquake_risk: null, overall_risk_score: null, insurance_implications: null },
        air_quality: airQuality ? { aqi_avg: airQuality.aqi_avg, pm2_5: airQuality.pm2_5, pm10: airQuality.pm10, rating: airQuality.rating } : { aqi_avg: null, rating: null },
        sustainability: {
          solar_potential: climate?.avg_uv_index != null ? solarPotential(climate.avg_uv_index) : null,
          climate_resilience: ai.esg_analysis?.environmental_score?.climate_resilience || null
        },
        climate: climate ? {
          current_temp_c: climate.current_temp_c, avg_high_c: climate.avg_max_temp_c, avg_low_c: climate.avg_min_temp_c,
          weekly_precipitation_mm: climate.weekly_precipitation_mm, avg_uv_index: climate.avg_uv_index, timezone: climate.timezone
        } : null
      },

      economic_context: countryInfo ? { country: { interest_rate: null, inflation_rate: null, unemployment_rate: null, economic_outlook: null }, affordability_metrics: null } : null,

      regulatory_info: ai.regulatory_info || { zoning: { current: null, allowed_uses: [] }, property_tax: { current_rate: null, annual_amount: null }, foreign_ownership: null },

      cross_border_analysis: ai.cross_border_analysis || null,

      esg_analysis: {
        overall_esg_score: null,
        environmental_score: {
          score: null, energy_efficiency_rating: null,
          solar_ready: climate?.avg_uv_index != null ? climate.avg_uv_index >= 4 : null,
          climate_resilience: ai.esg_analysis?.environmental_score?.climate_resilience || null
        },
        social_score: {
          score: null, walkability: walkLabel(walkScore),
          public_transport_access: ai.esg_analysis?.social_score?.public_transport_access || transitLabel(transitScore)
        },
        governance_score: null
      },

      portfolio_integration: null,

      expat_analysis: {
        expat_friendliness_score: ai.expat_analysis?.expat_friendliness_score || null,
        visa_pathway: ai.expat_analysis?.visa_pathway || null,
        expat_community: { expat_population_pct: null, english_fluency_pct: null, international_schools_nearby: intlSchools || null },
        cost_of_living_for_expats: null
      },

      investment_signals: ai.investment_signals || { recommendation: null, confidence: null, reasoning: [], risk_factors: [], opportunities: [] },

      predictions: null,
      comparative_analysis: null,
      purchasing_power_analysis: null,

      additional_info: {
        hoa_fees: null, property_taxes_annual: null, insurance_estimate_annual: null, total_ownership_cost_monthly: null,
        notes: [`Data from: ${sources.join(', ')}.`, ...(ai.data_confidence_notes || [])].join(' ')
      },

      _processing: {
        version: 'v3.2-real-data-first-tavily-search',
        tiers_used: sources,
        request_id: requestId || null,
        processing_time_ms: Date.now() - startTime,
        web_search_grounding: webSearchResult ? {
          search_queries: webSearchResult.grounding.search_queries,
          web_sources: gd.web_sources || webSearchResult.grounding.sources,
          source_count: webSearchResult.grounding.source_count
        } : null,
        ai_enrichment: claudeResult?.usage || null,
        extraction_usage: webSearchResult?.extraction_usage || null,
        estimated_cost_usd: (
          0.005 + // geocoding
          PLACE_SEARCH_CATEGORIES.length * 0.032 + // places
          (elevation != null ? 0.005 : 0) +
          (webSearchResult ? 0.0 : 0) + // tavily free tier
          parseFloat(claudeResult?.usage?.estimated_cost_usd || 0)
        ).toFixed(4),
        timestamp: new Date().toISOString(),
        data_provenance: {
          coordinates: 'Google Geocoding API (verified)',
          address: 'Google Geocoding API (verified)',
          amenities: 'Google Places Nearby Search (verified)',
          schools: 'Google Places Nearby Search (verified)',
          elevation: elevation != null ? 'Google Elevation API (verified)' : 'n/a',
          air_quality: airQuality ? 'Open-Meteo (real-time)' : 'n/a',
          climate: climate ? 'Open-Meteo (real-time)' : 'n/a',
          walkability: walkScore != null ? 'Computed from Google Places' : 'n/a',
          valuation: gd.valuation?.estimated_value_source || 'n/a',
          transaction_history: ukTransactions?.length ? 'HM Land Registry (verified UK government data)' : (gd.transaction_history?.length ? 'Tavily web search (with citations)' : 'n/a'),
          comparable_sales: gd.comparable_sales?.length ? 'Tavily web search (with citations)' : 'n/a',
          area_housing: gd.area_housing?.listings?.length ? 'Tavily web search (real listings with URLs)' : 'n/a',
          market_data: gd.market_data?.source || (usMarket ? 'ZipMarketData API' : 'n/a'),
          demographics: demoData.source || (bigData ? 'BigDataCloud' : 'n/a'),
          crime_safety: safetyData.source || 'n/a',
          ai_analysis: claudeResult ? 'Claude (analysis of verified data only)' : 'n/a'
        }
      }
    };

    log(`SUCCESS in ${Date.now() - startTime}ms | Sources: ${sources.join(', ')}`);
    return res.status(200).json(propertyData);

  } catch (error) {
    log(`ERROR: ${error.message}`);
    console.error('Stack:', error.stack);
    return res.status(500).json({
      error: error.message, type: error.constructor.name,
      request_id: req.body?.requestId || null,
      timestamp: new Date().toISOString(), address: req.body?.address
    });
  }
});

// ── Server ────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  log('════════════════════════════════════════════════════════════');
  log('myIPM Property Intelligence API v3.2');
  log('Real Data First — Google → Free APIs → Tavily Search → Claude');
  log(`Port: ${PORT}`);
  log(`Google Maps API: ${GOOGLE_API_KEY ? '✅' : '❌ Missing'}`);
  log(`Tavily API:      ${TAVILY_API_KEY ? '✅' : '⚠️  No Tier 3 web search'}`);
  log(`Anthropic API:   ${ANTHROPIC_API_KEY ? '✅' : '⚠️  No Tier 3-4 enrichment'}`);
  log('════════════════════════════════════════════════════════════');
});

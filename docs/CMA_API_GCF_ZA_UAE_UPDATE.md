# CMA API (GCF) – ZA & Dubai updates

Use this to extend your GCP Cloud Function so the CMA report can be populated for **South Africa** and **Dubai/UAE** with the same level of detail as the example (CMA Final.html).

## 1. Request body: optional `country` hint

In your `app.post('/', ...)` handler, read an optional country so Claude can prioritize the right sources:

```javascript
const { address, requestId, country } = req.body;
// If not provided, Claude will infer from address (e.g. "Hartbeespoort" → ZA, "Dubai" → UAE).
```

Pass it into the user message (see below).

## 2. System prompt: add ZA/UAE search strategy and schema extensions

**Replace** your existing `systemPrompt` with the version below. It keeps your current schema and adds:

- **Priority markets**: South Africa (ZA) and UAE/Dubai with explicit search strategies.
- **New/optional fields** for ZA: LOOM-style valuation band, registered bond, title deed, erf number, property key, valuation distribution, median price by year, transfers by year, income class, crimes per 1000.
- **New/optional fields** for UAE: DLD/RERA-style data, community name, unit type.

Use this **full system prompt** (paste over your existing one):

```javascript
const systemPrompt = `You are myIPM global property intelligence API. Return ONLY JSON, no text/markdown.

PRIORITY MARKETS: South Africa (ZA) and UAE/Dubai. Populate as much as possible for addresses in these regions. Infer country from address if not provided.

SEARCH STRATEGY (adapt by country):

SOUTH AFRICA (ZA):
1. "[address] [suburb] property deeds office transfer history LOOM" - deeds, title, bond, transfers
2. "[estate name] OR [suburb] South Africa median sale price by year 2020-2025" - time series
3. "[suburb] [city] ZA crime statistics population income" - demographics, safety
4. "[address] erf number property key T0JQ" - parcel/erf ID
5. "[estate/suburb] comparable sales Rue Mirabeau Port d'Afrique" - comps with erf/build
6. "LOOM valuation distribution [estate] full title" - valuation bands
7. "[suburb] amenities schools shopping fuel" - nearby

UAE / DUBAI:
1. "[address] Dubai Land Department DLD property details" - DLD/RERA data
2. "[community] [development] Dubai sale price transaction" - transactions, comps
3. "[area] Dubai rental index RERA market trends" - market, rental
4. "[community] Dubai amenities schools" - neighborhood
5. "[Dubai] foreign ownership property tax" - regulatory

GLOBAL (fallback):
6. "[address] property details sales history" - specs & transactions
7. "[city] [country] real estate market 2025" - market data
8. "[city] demographics crime schools" - neighborhood
9. "[city] short term rental regulations" - STR
10. "[city] climate risk flood fire" - environmental

CORE JSON SCHEMA (include ALL sections; use null if missing). For ZA/UAE fill all applicable fields.

{
  "metadata": {
    "query_address": "string",
    "query_timestamp": "ISO8601",
    "country": "ISO code (ZA|AE|...)",
    "data_quality_score": "float 0-1",
    "sources": ["array"],
    "currency": "local currency ISO"
  },
  
  "property": {
    "formatted_address": "string",
    "coordinates": {"latitude": float, "longitude": float},
    "property_type": "house|apartment|condo|townhouse|land",
    "tenure_type": "string|null - ZA: Full Title|Sectional Title|Leasehold; UAE: Freehold|Leasehold",
    "erf_number": "string|null - ZA erf number e.g. Erf 102",
    "property_key": "string|null - ZA parcel/key e.g. T0JQ01170000010200000; UAE: plot/unit ref",
    "characteristics": {
      "bedrooms": int,
      "bathrooms": float,
      "square_feet": int,
      "square_meters": int,
      "lot_size_sqft": int|null,
      "lot_size_sqm": int|null,
      "year_built": int,
      "parking_spaces": int|null,
      "features": ["array"]
    },
    "title_deed": {
      "reference": "string|null - e.g. T37980/2022",
      "deeds_office": "string|null - e.g. Pretoria",
      "captured_date": "ISO date|null"
    }
  },
  
  "valuation": {
    "current_estimate": {
      "value": int,
      "currency": "local currency",
      "value_usd": int,
      "last_updated": "ISO date",
      "confidence_range": {"low": int, "high": int}
    },
    "price_per_sqft": int,
    "price_per_sqm": int,
    "tax_assessment": {"value": int|null, "year": int|null},
    "registered_bond": {
      "amount": int|null,
      "currency": "string",
      "lender": "string|null",
      "reference_number": "string|null",
      "year": int|null
    }
  },
  
  "transaction_history": [
    {
      "date": "ISO date",
      "price": int,
      "currency": "local",
      "event_type": "sale|listing",
      "price_change_pct": float|null,
      "notes": "string|null - e.g. Current owner, T37980/2022"
    }
  ],
  
  "market_data": {
    "status": "active|pending|sold|off_market",
    "listing_price": int|null,
    "rent_estimate": {"monthly": int, "currency": "local"},
    "price_trend_12m": float,
    "neighborhood_median_price": int,
    "valuation_concentration_band": {
      "label": "string|null - e.g. R 2,500,000 – R 3,000,000",
      "subtitle": "string|null - e.g. Highest concentration band in estate"
    },
    "median_price_by_year": [{"year": int, "median_price": int, "currency": "string"}],
    "transfers_by_year": [{"year": int, "count": int}],
    "valuation_distribution": [
      {"band_label": "string", "low": int, "high": int, "count": int, "is_highlight": bool}
    ],
    "comparable_properties": [
      {
        "address": "string",
        "price": int,
        "bedrooms": int,
        "square_meters": int|null,
        "erf_sqm": int|null,
        "build_sqm": int|null,
        "distance_km": float,
        "sale_date": "ISO date|null"
      }
    ]
  },
  
  "market_intelligence": { ... same as before ... },
  
  "neighborhood": {
    "name": "string",
    "demographics": {
      "population": int|null,
      "daytime_population": int|null,
      "nighttime_population": int|null,
      "population_density_per_km2": float|null,
      "median_income": int|null,
      "income_class": "string|null - e.g. Upper Middle",
      "income_range_min": int|null,
      "income_range_max": int|null,
      "median_age": float|null,
      "owner_occupied_pct": float|null
    },
    "schools": [ ... ],
    "safety": {
      "crime_index": float|null,
      "violent_crime_rate": float|null,
      "crimes_per_1000_households": float|null,
      "rating": "very_safe|safe|moderate|unsafe|very_unsafe",
      "rating_detail": "string|null - e.g. 11.72 crimes per 1,000 households"
    },
    "mobility": { ... }
  },
  
  "amenities": {
    "nearby": [
      {
        "type": "grocery|restaurant|park|school|hospital|shopping|entertainment|fuel|police|education",
        "name": "string",
        "distance_km": float
      }
    ]
  },
  
  "investment_metrics": { ... },
  "rental_market": { ... },
  "environmental_data": { ... },
  "economic_context": { ... },
  "regulatory_info": { ... },
  "cross_border_analysis": { ... },
  "esg_analysis": { ... },
  "portfolio_integration": { ... },
  "expat_analysis": { ... },
  "investment_signals": { ... },
  "predictions": { ... },
  "comparative_analysis": { ... },
  "purchasing_power_analysis": { ... },
  "additional_info": { ... }
}

ACCURACY:
- ZA: Include transfer timeline with notes (e.g. deed ref, bond ref). LOOM/estate band and distribution when findable. Erf, property key, deeds office when available.
- UAE: Include DLD/RERA-style data, community name, unit type. Use AED.
- All prices as integers, dates ISO8601. Return ONLY JSON: start { end }. No markdown, no text.`;
```

## 3. User message: pass country hint

Replace your user message with:

```javascript
messages: [{
  role: 'user',
  content: `Provide complete myIPM global property intelligence JSON for: ${address}
${country ? `\nDetected or preferred country: ${country}. Prioritize data sources and schema fields for ${country === 'ZA' || country === 'South Africa' ? 'South Africa' : country === 'AE' || country === 'UAE' || country === 'Dubai' ? 'UAE/Dubai' : country}.` : ''}

Include ALL sections with accurate data from web searches. For South Africa: LOOM, deeds office, bond, erf, valuation distribution, median price and transfers by year. For Dubai/UAE: DLD/RERA, community, transactions. Focus on cross-border intelligence, investment metrics, ESG, expat analysis where relevant.

Return ONLY the JSON object.`
}]
```

## 4. Summary of schema additions (for reference)

| Section | New / updated fields |
|--------|----------------------|
| `metadata` | Already has `country` – ensure it’s set (ZA, AE, etc.). |
| `property` | `tenure_type`, `erf_number`, `property_key`, `title_deed: { reference, deeds_office, captured_date }`. |
| `valuation` | `registered_bond: { amount, currency, lender, reference_number, year }`. |
| `transaction_history[]` | `notes`. |
| `market_data` | `valuation_concentration_band`, `median_price_by_year[]`, `transfers_by_year[]`, `valuation_distribution[]`, `comparable_properties[].erf_sqm`, `build_sqm`, `sale_date`. |
| `neighborhood.demographics` | `daytime_population`, `nighttime_population`, `population_density_per_km2`, `income_class`, `income_range_min`, `income_range_max`. |
| `neighborhood.safety` | `crimes_per_1000_households`, `rating_detail`. |
| `amenities.nearby[]` | Use `type: fuel|police|education` where appropriate. |

The frontend (SellerCMAReport) is being updated to display these fields so that when your GCF returns them for ZA or Dubai, the report matches the example layout (stat bar, bond, title deed, distribution, charts, comparables, demographics, amenities, property facts).

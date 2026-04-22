# Listing Metadata – Google Cloud Function

This app calls your Cloud Function to enrich property listings with metadata. The response is stored on the property as `listingMetadata` and shown in the **Listing Insights** section on the property view page.

## When is metadata saved?

- **Only during add/edit** in the property upload flow: when the user clicks **Next** after the address step (step 3), the client calls the metadata API with the composed address and stores the response in form state.
- On **Submit**, that object is sent as `listingMetadata` and saved on the property document.
- **Existing or seeded listings** never had this step, so they have no `listingMetadata` unless you re-save them via the property upload form (edit and go through the address step, then submit).

## How the client calls the function

- **URL:** `POST` to `REACT_APP_LISTING_METADATA_URL` or default  
  `https://get-listing-metadata-541421913321.europe-west4.run.app`
- **Body:** `{ "address": "<full address string>", "requestId": "<UUID>" }`.  
  The client always sends a UUID (`requestId`) with each request so responses can be matched reliably.
- **Response:** Must be JSON. The client only accepts the response if you **echo `requestId`** in the response (same key, same value). The **entire response** is then stored as `listingMetadata` on the property (no wrapping in a `data` key).  
  If you don’t return `requestId`, the client falls back to address matching via `metadata.query_address`.

## Response shape the Property page expects

The property view reads `prop.listingMetadata` and expects an object with **top-level** keys (or nested under the same names). Missing keys are fine; they're read as `{}` or empty arrays.

| Key | Used for |
|-----|----------|
| `metadata` | `query_address`, `currency`, `data_quality_score`, `sources` |
| `property` | `formatted_address`, `property_type`, `coordinates`, `characteristics` (bedrooms, bathrooms, square_feet / square_meters) |
| `valuation` | `current_estimate` (value, value_usd, currency, confidence_range), `price_per_sqft`, `price_per_sqm`, `tax_assessment` |
| `market_data` | `status`, `listing_price`, `rent_estimate.monthly`, `price_trend_12m` (decimal), `neighborhood_median_price` |
| `neighborhood` | `name`, `demographics.median_income`, `mobility` (walkability_score, transit_score), `safety.rating`, `schools` |
| `transaction_history` | Array of `{ date, event_type, price, currency, price_change_pct }` |
| `investment_metrics` | `rental_yield`, `cap_rate`, `appreciation_1y`, `appreciation_5y`, `vacancy_rate` (decimals 0–1) |
| `market_intelligence` | `market_cycle.phase`, `market_cycle.commentary`, `national_index`, `regional_index` |
| `rental_market` | `rental_demand`, `short_term_rental` (allowed, avg_daily_rate, occupancy_rate) |
| `environmental_data` | `climate_risk`, `air_quality`, `sustainability` |
| `investment_signals` | `recommendation`, `confidence`, `reasoning[]` |
| `predictions` | `price_forecast_12m` / `price_forecast_36m` (low, expected, high) |
| `esg_analysis` | `overall_esg_score`, `environmental_score.energy_efficiency_rating` |
| `regulatory_info` | `zoning.current`, `property_tax.annual_amount` |
| `portfolio_integration` | `portfolio_fit_score`, `diversification_analysis` |
| `expat_analysis` | `expat_friendliness_score`, `visa_pathway.summary` |
| `additional_info` | `hoa_fees`, `property_taxes_annual`, `total_ownership_cost_monthly`, `insurance_estimate_annual`, `notes` |

- **Percentages:** Stored as decimals (e.g. `0.05` for 5%). The UI uses `pctDecimal()` to show as "5.0%".
- **Request matching:** The client sends `requestId` (UUID) in the request body. **Echo it in your response** (e.g. `response.requestId = request.requestId`) so the client can match the response to the request. If both are present, matching is by `requestId` only. If you don’t support `requestId`, the client falls back to address matching via `metadata.query_address`.

## Checklist when debugging "metadata not showing"

1. **Property document:** In MongoDB, does this property have a `listingMetadata` field? If not, the frontend will show the placeholder until metadata is saved (re-save the property via the upload form and go through the address step).
2. **Cloud Function:** For the same address (e.g. `26319 Beech Drive, Moreno Valley, CA, USA`), does the function return 200 and a JSON object with at least some of the keys above (e.g. `metadata`, `property`, `valuation`)? If it returns `{ data: { ... } }` or another wrapper, either change the function to return the object at the top level or normalize when saving/displaying.
3. **CORS:** If the client calls the function from the browser, the function must allow your site's origin (and `Content-Type: application/json` if needed).

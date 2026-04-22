# Market trends: real values and YoY actuals

- **`marketTrendsMonthly.json`** – Historical monthly data and year‑on‑year actuals per region. The dashboard uses this for Market Trends charts, YoY %, and source/methodology text.

## JSON format (per country)

**Preferred: year-keyed actuals with `_source` (official indices, do not compare raw numbers across countries):**

```json
{
  "_comment": "Each country uses its own native index scale and base year — do NOT compare raw numbers across countries.",
  "Dubai": {
    "_source": "REIDIN UAE Residential Property Sales Price Index. Base: January 2014 = 100. ...",
    "2023": [ { "month": "Jan", "value": 95.0 }, ... ],
    "2024": [ { "month": "Jan", "value": 111.9 }, ... ]
  }
}
```

- **\_source** – Methodology/source string (e.g. index name, base year). Shown under each trend as interpretation; tooltip shows full text.
- **"2023" / "2024"** – Arrays of `{ "month": "Jan"|"Feb"|...|"Dec", "value": number }`. Raw index values; YoY is computed from latest year’s last month vs previous year’s last month.

**Legacy (still supported):**

- **monthlyData** + optional **yoyPercent** – `{ "monthlyData": [...], "yoyPercent": "+7.8" }`.
- **Array only** – `[ { "month": "Jan", "value": 268 }, ... ]`; YoY falls back to DB `priceChange`.

## Updating data

1. Edit **`marketTrendsMonthly.json`** with your historical series and `yoyPercent` per country.
2. No re-seed required: the dashboard API merges this file into the response. Redeploy or restart so the updated file is loaded.
3. Optional: run your seed if you also want the DB’s `MarketTrend` documents to have `monthlyData` stored (API still prefers merging from this file when present).

## Optional: live API

To drive this from an external source (e.g. Dubai Pulse, OECD), add a job or route that fetches indices, builds `monthlyData` + `yoyPercent` per country, and overwrites this JSON or writes to the API’s merge source.

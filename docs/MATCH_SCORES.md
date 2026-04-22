# Listing–Buyer/Investor Match Scores

Match scores (0–100%) are computed by Claude using listing metadata and buyer/investor preferences. They run automatically when:

- **A new listing is created** → scores for that listing vs all buyers/investors (CRM leads + registered users). Capped at 200 targets; runs in background (fire-and-forget).
- **A new buyer or investor lead is added (CRM)** → scores for that lead vs up to 100 published listings. Runs in background.
- **A user registers as buyer or investor** → scores for that user vs up to 100 published listings. Runs in background.

## Environment

- **`ANTHROPIC_API_KEY`** – Required for matching. If unset, matching is skipped (no errors; scores stay empty).

## APIs

- **POST `/api/match/run-listing-matches`** – Body: `{ propertyId }`. Runs matching for one listing. Called automatically after property create.
- **POST `/api/match/run-lead-matches`** – Body: `{ lead, ownerId }`. Runs matching for one CRM lead. Called automatically after add-lead (buyer/investor).
- **POST `/api/match/run-user-matches`** – Body: `{ userId }`. Runs matching for one registered buyer/investor. Called automatically after register.
- **GET `/api/match/scores`** – Query:
  - `propertyId=...` – Top matching buyers/leads for this listing.
  - `targetType=lead&targetId=...&ownerId=...` – Top matching listings for this lead.
  - `targetType=user&targetId=...` – Top matching listings for this user.
  - `limit=20` (optional, default 20, max 100).

## Data

- **MatchScore** (MongoDB): `propertyId`, `targetType` ('lead' | 'user'), `targetId`, `ownerId` (for leads: agency/agent id), `score` (0–100), `updatedAt`.
- Listing summary: title, location, price, listingType, description, locationDetails, pricing, propertySize, residential, listingMetadata.
- Buyer summary (lead): budget, buyerDetails (minBedrooms, locationPreferences, etc.), investorDetails (dealSize, targetYield, etc.).
- Buyer summary (user): preferredCities, preferredPropertyTypes, location.

## Performance

- Matching is triggered immediately but runs in a **separate** serverless invocation so create/register responses stay fast.
- Listing run: up to 200 buyers, batches of 10 parallel Claude calls.
- Lead/user run: up to 100 listings, batches of 10. Set **`ANTHROPIC_API_KEY`** in Vercel (and locally) for matching to run.

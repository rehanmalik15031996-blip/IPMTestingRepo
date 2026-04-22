# IPM Data Structure & Integration Guide

This document describes the **entire data structure** of the IPM (International Property Market) platform. Use it to map fields when pulling data continuously from **PropData** and **HubSpot** APIs.

---

## 1. Overview of Collections

| Collection (MongoDB) | Purpose |
|----------------------|--------|
| **users** | Users (investors, buyers, sellers, agents, agencies), preferences, portfolio, CRM leads, agency/agent stats |
| **properties** | Listings (for sale/rent/auction), full property details, media, status, pricing |
| **developments** | Off-plan / multi-unit developments with floor plans and towers |
| **markettrends** | Market trend labels per country (actual series live in `server/data/marketTrendsMonthly.json`) |
| **news** | News articles (title, category, content, country) |
| **files** | Vault files and property documents (userId, propertyId, path, documentType) |
| **matchscores** | Listing–lead match scores (propertyId, targetType, targetId, score) |
| **inquiries** | Contact form inquiries (name, email, phone, message, propertyId) |
| **meetings** | Viewing/meeting requests (firstName, lastName, email, date, time, propertyTitle, agentName) |
| **agencyinvites** | Agency invite tokens (email, agencyId, branchId, expiresAt, used) |

---

## 2. Property (Listings) – For PropData Sync

**Collection:** `properties`  
**Use case:** Ingest listings from PropData; map their fields into this schema.

### 2.1 Core Fields (required / primary)

| IPM Field | Type | Required | Notes / PropData → IPM mapping |
|-----------|------|----------|-------------------------------|
| **title** | String | Yes | PropData: `title`, `listing_title`, `heading` |
| **location** | String | Yes | PropData: `address`, `location`, `suburb` + `city` + `country` concatenated |
| **price** | String | Yes | PropData: `price`, `asking_price`, `list_price` (store as string e.g. "450000" or "1.2M") |
| **agentId** | ObjectId (ref User) | Yes | Map PropData `agent_id` / `listing_agent_id` to your User `_id`; or default to one IPM user |
| **listingType** | String | Yes | Enum: `for_sale`, `for_rent`, `for_auction`, `Residential`, `Commercial`, `Industrial`, `Land`, `Auction`, `Retail` — map PropData `listing_type`, `category` |

### 2.2 Status & Visibility

| IPM Field | Type | Notes |
|------------|------|--------|
| **status** | String | Enum: `Draft`, `Published`, `Sold`, `Archived`, `Unavailable`, `Under Offer` — map PropData `status`, `listing_status` |
| **websiteStatus** | String | Enum: `Draft`, `Published`, `Featured` (optional override) |
| **isFeatured** | Boolean | PropData: `featured`, `highlighted` |
| **salePrice** | Number | When status = Sold |
| **saleDate** | Date | When status = Sold |
| **offerPrice** | Number | When status = Under Offer |
| **offerDate** | Date | When status = Under Offer |
| **underOfferDaysActive** | Number | Days to keep listing active when Under Offer |
| **soldDaysActive** | Number | Days to keep listing active after sale |
| **onShowDay** | String | e.g. "Saturday 15 March" |
| **onShowTimes** | String | e.g. "10am – 2pm" |
| **priceReduced** | Boolean | Listing has had a price reduction |

### 2.3 Description & Media

| IPM Field | Type | Notes |
|-----------|------|--------|
| **description** | String | PropData: `description`, `full_description`, `body` |
| **imageUrl** | String | PropData: `main_image`, `primary_photo`, `image_url` (primary image URL) |
| **media.coverImage** | String | Same as primary image if not set |
| **media.imageGallery** | [String] | PropData: `images[]`, `photos[]` (array of URLs) |
| **media.walkthroughVideo** | String | PropData: `video_url`, `virtual_tour` |
| **media.floorplans** | [String] | PropData: `floor_plans[]` |

### 2.4 Location Details

| IPM Field | Type | Notes |
|-----------|------|--------|
| **locationDetails.country** | String | PropData: `country`, `address_country` |
| **locationDetails.city** | String | PropData: `city`, `town`, `address_city` |
| **locationDetails.suburb** | String | PropData: `suburb`, `area`, `district` |
| **locationDetails.streetAddress** | String | PropData: `street`, `address_line_1`, `full_address` |
| **locationDetails.coordinates** | { lat, lng } | PropData: `latitude`, `longitude`, `geo` |

### 2.5 Property Category & Type

| IPM Field | Type | Notes |
|-----------|------|--------|
| **propertyCategory** | String | Enum: `Residential`, `Commercial`, `Retail`, `Industrial`, `Land`, `Office`, `Agricultural`, `Development` — map PropData `property_type`, `category` |
| **type** | String | e.g. Villa, Apartment, House — PropData: `sub_type`, `property_subtype` |

### 2.6 Size & Specs (display / filters)

| IPM Field | Type | Notes |
|-----------|------|--------|
| **specs.beds** | Number | PropData: `bedrooms`, `beds` |
| **specs.baths** | Number | PropData: `bathrooms`, `baths` |
| **specs.sqft** | Number | PropData: `floor_area`, `square_feet`, `size_sqft` |
| **propertySize.size** | Number | Same as above (preferred for new data) |
| **propertySize.unitSystem** | String | `sqft` or `sqm` |
| **propertySize.landSize** | Number | PropData: `land_size`, `plot_size` |
| **residential.bedrooms** | Number | Same as specs.beds |
| **residential.bathrooms** | Number | Same as specs.baths |
| **residential.livingAreaSize** | Number | Living area sqft/sqm |
| **residential.parkingSpaces** | Number | PropData: `parking`, `garage` |

### 2.7 Pricing (structured)

| IPM Field | Type | Notes |
|-----------|------|--------|
| **pricing.currency** | String | PropData: `currency`, `price_currency` (e.g. USD, AED, GBP) |
| **pricing.askingPrice** | Number | Numeric price for sorting/filters |
| **pricing.monthlyRental** | Number | For rentals |
| **availability.availableFrom** | Date | PropData: `available_date`, `date_available` |

### 2.8 Development Link (off-plan)

| IPM Field | Type | Notes |
|-----------|------|--------|
| **developmentId** | ObjectId (ref Development) | If listing is a unit in a development |
| **developmentUnitGroup** | String | e.g. "Type A", "2-Bed" |
| **developmentUnitLabel** | String | e.g. "Unit 401" |

### 2.9 Other Useful Fields

| IPM Field | Type | Notes |
|-----------|------|--------|
| **listingMetadata** | Mixed | Store raw PropData response or enrichment (valuation, etc.) for reference |
| **ipmScore** | Number (0–100) | Internal completion score; can leave null when syncing from PropData |
| **createdAt** / **updatedAt** | Date | Set by server; use for “last synced” logic |

---

## 3. User – For HubSpot (Contacts) & Leads Sync

**Collection:** `users`  
**Use case:** Map HubSpot contacts/deals to users (investors, agents) and to CRM leads inside `agencyStats.crmLeads` / `agentStats.crmLeads`.

### 3.1 User Core Fields

| IPM Field | Type | Required | HubSpot / PropData mapping |
|-----------|------|----------|----------------------------|
| **name** | String | Yes | HubSpot: `firstname` + `lastname`, or `name` |
| **email** | String | Yes (unique) | HubSpot: `email` |
| **password** | String | Yes | Not from HubSpot; set on first sync or invite |
| **role** | String | No (default investor) | `investor`, `buyer`, `seller`, `agent`, `independent_agent`, `agency`, `agency_agent` — map from HubSpot `lifecyclestage`, `persona`, or custom |
| **phone** | String | No | HubSpot: `phone`, `mobilephone` |
| **location** | String | No | HubSpot: `address`, `city`, `country` |
| **preferredCities** | [String] | No | HubSpot: custom “Preferred cities” multi-select |
| **preferredPropertyTypes** | [String] | No | HubSpot: custom “Property types” |

### 3.2 Agent / Agency Fields

| IPM Field | Type | Notes |
|-----------|------|--------|
| **agencyName** | String | HubSpot company name for agency |
| **agencyId** | ObjectId | Ref to User (agency); for agency_agent only |
| **branchName** | String | HubSpot: custom “Branch” |
| **branchId** | String | Internal branch id |
| **agentTier** | String | `silver`, `gold`, `platinum` (computed or from HubSpot) |
| **agentScore** | Number | 0–100 (computed or from HubSpot) |
| **monthlyRevenueTarget** | Number | HubSpot: custom “Monthly target” |

### 3.3 CRM Leads (inside User)

Stored under **agencyStats.crmLeads** (agency) or **agentStats.crmLeads** (agent). Sync HubSpot contacts/deals as “leads” here.

| IPM Field | Type | HubSpot mapping |
|-----------|------|-----------------|
| **id** | String | HubSpot `contact.id` or `deal.id` (string) for dedup/update |
| **name** | String | HubSpot: `firstname` + `lastname`, or contact name |
| **email** | String | HubSpot: `email` |
| **mobile** | String | HubSpot: `phone`, `mobilephone` |
| **type** | String | e.g. Buyer, Seller — HubSpot: `contact_type`, deal type |
| **budget** | String | HubSpot: `budget`, deal `amount` |
| **status** | String | HubSpot: deal stage, lifecycle stage |
| **lastContact** | String | HubSpot: `notes_last_updated`, last activity date |
| **propertyOfInterest** | String | HubSpot: associated listing name or deal name |
| **dateAdded** | String | HubSpot: `createdate` |
| **source** | String | HubSpot: `hs_analytics_source`, or "HubSpot" |
| **leadType** | String | Enum: `buyer`, `seller`, `investor` — map from HubSpot type |
| **buyerDetails** | Mixed | Min beds, baths, areas, locations from HubSpot custom props |
| **sellerDetails** | Mixed | Property address, beds, baths from HubSpot |
| **investorDetails** | Mixed | Portfolio preferences from HubSpot |
| **viewingScheduledProperty** | String | Linked property title |
| **viewingScheduledDate** | String | Date of viewing |
| **viewingScheduledTime** | String | Time of viewing |
| **activities** | Mixed | Array of notes/emails from HubSpot engagements |
| **linkedProperties** | Mixed | Associated property IDs or titles |
| **leadScore** | Number | 0–100; compute or from HubSpot score |
| **assignedAgentId** | String | HubSpot deal owner id → map to IPM agent User id |

---

## 4. Development

**Collection:** `developments`  
**Use case:** Off-plan projects; can be synced from PropData if they expose “projects” or “developments”.

| IPM Field | Type | Notes |
|-----------|------|--------|
| **title** | String | Required |
| **subtitle** | String | Optional |
| **location** | String | Required |
| **completion** | String | e.g. "Q2 2027" |
| **priceStart** | String | e.g. "$1.25M" |
| **yieldRange** | String | e.g. "up to 5.6%" |
| **imageUrl** | String | Required |
| **description** | String | Required |
| **agentId** / **agencyId** | ObjectId | Ref User |
| **floorPlans** | Array | { name, imageUrl, files[], sizeSqft, sizeSqm, beds, baths, unitType, priceFrom } |
| **towers** | Array | { name } |
| **gallery** | Array | { url, caption } |

---

## 5. News

**Collection:** `news`

| IPM Field | Type | Notes |
|-----------|------|--------|
| **title** | String | Required |
| **category** | String | Required (e.g. "Market Trends") |
| **author** | String | Required |
| **date** | String | e.g. "Oct 24, 2025" |
| **image** | String | URL required |
| **desc** | String | Short description (max 200) |
| **content** | String | Full body |
| **country** | String | For dashboard filter |
| **tags** | [String] | Optional |
| **sourceUrl** | String | Canonical URL |

---

## 6. MarketTrend

**Collection:** `markettrends`  
**Note:** Actual series and YoY come from `server/data/marketTrendsMonthly.json`; this collection can hold seed rows (country, status, color, priceChange). Sentiment is derived from YoY in code.

| IPM Field | Type | Notes |
|-----------|------|--------|
| **country** | String | e.g. "South Africa", "Dubai", "London" |
| **status** | String | Excellent, Good, Stable, Caution |
| **color** | String | Hex for pill |
| **priceChange** | String | e.g. "+7.8%" (fallback if no JSON) |
| **monthlyData** | [{ month, value }] | Optional; usually from JSON file |

---

## 7. File (Vault)

**Collection:** `files`

| IPM Field | Type | Notes |
|-----------|------|--------|
| **userId** | String | Owner |
| **name** | String | Filename |
| **path** | String | Stored path/URL |
| **propertyId** | ObjectId | If attached to a listing |
| **documentType** | String | e.g. levy_bills, floorplans, deed |
| **folder** | String | Optional |

---

## 8. MatchScore

**Collection:** `matchscores`  
Links listings to leads/users with a 0–100 score.

| IPM Field | Type | Notes |
|-----------|------|--------|
| **propertyId** | ObjectId | Ref Property |
| **targetType** | String | `lead` or `user` |
| **targetId** | String | lead.id or user _id |
| **ownerId** | ObjectId | Agency/agent for leads |
| **score** | Number | 0–100 |

---

## 9. Inquiry

**Collection:** `inquiries`

| IPM Field | Type | Notes |
|-----------|------|--------|
| **name** | String | Required |
| **email** | String | Required |
| **phone** | String | Required |
| **message** | String | Required |
| **propertyId** | String | Optional |
| **propertyName** | String | Optional |
| **date** | Date | Default now |

---

## 10. Meeting

**Collection:** `meetings`

| IPM Field | Type | Notes |
|-----------|------|--------|
| **firstName** | String | Required |
| **lastName** | String | Required |
| **email** | String | Required |
| **phone** | String | Optional |
| **meetingType** | String | "In Person" or "Video Chat" |
| **date** | String | e.g. "December 16, 2025" |
| **time** | String | e.g. "10:00 AM" |
| **propertyTitle** | String | Optional |
| **agentName** | String | Optional |

---

## 11. AgencyInvite

**Collection:** `agencyinvites`

| IPM Field | Type | Notes |
|-----------|------|--------|
| **token** | String | Unique |
| **pin** | String | 4-digit |
| **email** | String | Invitee |
| **agencyId** | ObjectId | Ref User (agency) |
| **branchId** | String | Required |
| **branchName** | String | Optional |
| **expiresAt** | Date | Required |
| **used** | Boolean | Default false |

---

## 12. PropData → IPM Quick Mapping (Listings)

When pulling from PropData API, map at minimum:

- **title** ← listing title / heading  
- **location** ← address or suburb + city + country  
- **price** ← list price (string)  
- **agentId** ← resolve agent by external id or use default IPM user  
- **listingType** ← map their type to our enum  
- **status** ← map their status to Draft/Published/Sold/Under Offer/Unavailable  
- **description** ← full description  
- **imageUrl** ← main image URL  
- **locationDetails** ← country, city, suburb, streetAddress, coordinates  
- **specs** or **residential** ← bedrooms, bathrooms, floor area  
- **propertyCategory** / **type** ← property type and subtype  
- **media.imageGallery** ← array of image URLs  

Store PropData’s raw object in **listingMetadata** if you need to keep their IDs or extra fields for sync/updates.

---

## 13. HubSpot → IPM Quick Mapping

- **Contacts → Users or CRM leads:**  
  Map `email`, `firstname`+`lastname` → **name**, `phone`/`mobilephone` → **phone**; custom props → **preferredCities**, **preferredPropertyTypes**, **leadType**; store in **User** or in **agencyStats.crmLeads** / **agentStats.crmLeads** with **id** = HubSpot contact id for dedup.

- **Deals → CRM leads or status:**  
  Deal amount → **budget**; stage → **status**; associated listing → **propertyOfInterest**; deal owner → **assignedAgentId** (map to IPM agent).  
  If a deal represents a Sold listing, update **Property** with **status: Sold**, **salePrice**, **saleDate**.

- **Companies → Agencies:**  
  Company name → **agencyName**; link agents (contacts) via **agencyId**.

Use **id** (string) in crmLeads to store HubSpot contact/deal id so you can update the same lead on subsequent syncs.

---

*Document generated for IPM. Use it to design continuous sync from PropData (listings) and HubSpot (contacts, deals, companies) into the IPM data structure.*

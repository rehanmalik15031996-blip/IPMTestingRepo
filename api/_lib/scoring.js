/**
 * Scoring utilities for agents, properties (listings), and leads.
 * Used to compute tier/score that can be persisted and displayed.
 */

/**
 * Compute agent tier and score from REAL activity (sales count, listings,
 * leads, avg days to close). When no activity is present (newly seeded /
 * onboarded agents with no history), returns score=0 and tier='silver' so the
 * UI honestly shows zeros rather than fake placeholder numbers.
 *
 * @param { {
 *   agentId?: string,
 *   email?: string,
 *   name?: string,
 *   activity?: {
 *     closedCount?: number,        // total closed transactions
 *     totalSales?: number,         // gross revenue closed (any currency)
 *     totalListings?: number,      // active or all-time listings
 *     leadCount?: number,          // CRM leads attached to this agent
 *     avgDaysToClose?: number,     // optional, for speed bonus
 *   }
 * } } inputs
 * @returns { { tier: 'silver'|'gold'|'platinum', score: number } }
 */
function computeAgentTierAndScore(inputs) {
  const a = (inputs && inputs.activity) || {};
  const closedCount = Number(a.closedCount) || 0;
  const totalSales = Number(a.totalSales) || 0;
  const totalListings = Number(a.totalListings) || 0;
  const leadCount = Number(a.leadCount) || 0;
  const avgDays = Number(a.avgDaysToClose);

  // No activity = no score. Honest zero rather than seeded placeholder.
  if (closedCount === 0 && totalListings === 0 && leadCount === 0 && totalSales === 0) {
    return { tier: 'silver', score: 0 };
  }

  // Weighted contribution: closed deals (40%), listings (20%), leads (20%),
  // sales volume bucket (15%), speed bonus (5%). Each capped at 100.
  const closedScore = Math.min(100, closedCount * 10);   // 10 closed = 100
  const listingsScore = Math.min(100, totalListings * 5); // 20 listings = 100
  const leadsScore = Math.min(100, leadCount * 4);        // 25 leads = 100
  const salesBucket = totalSales >= 5_000_000 ? 100
                    : totalSales >= 1_000_000 ? 75
                    : totalSales >= 250_000 ? 50
                    : totalSales >= 50_000 ? 25
                    : totalSales > 0 ? 10 : 0;
  const speedBonus = Number.isFinite(avgDays) && avgDays > 0
    ? Math.max(0, Math.min(100, Math.round((90 - avgDays) * 100 / 90)))
    : 0;

  const score = Math.round(
    closedScore * 0.40 +
    listingsScore * 0.20 +
    leadsScore * 0.20 +
    salesBucket * 0.15 +
    speedBonus * 0.05
  );

  let tier = 'silver';
  if (score >= 70) tier = 'platinum';
  else if (score >= 40) tier = 'gold';
  return { tier, score: Math.min(100, Math.max(0, score)) };
}

/**
 * Compute IPM Score (0-99) for a property based on how complete the listing is.
 * Partial completion scores accordingly. Never returns 100 so scores stay granular and "room to improve".
 * @param { object } prop - Property document (plain or mongoose)
 * @returns { number }
 */
function computePropertyIpmScore(prop) {
  if (!prop || typeof prop !== 'object') return 0;
  let total = 0;
  let max = 0;

  const add = (filled, weight) => {
    max += weight;
    if (filled) total += weight;
  };

  const addPartial = (value, maxWeight) => {
    // value 0..1 (fraction) or 0..maxWeight for partial credit
    const v = typeof value === 'number' && !Number.isNaN(value) ? Math.max(0, Math.min(1, value)) : 0;
    max += maxWeight;
    total += v * maxWeight;
  };

  // Required basics
  add(!!(prop.title && String(prop.title).trim()), 8);
  add(!!(prop.location && String(prop.location).trim()), 8);
  add(!!(prop.price && String(prop.price).trim()) || !!(prop.pricing && (prop.pricing.askingPrice != null || prop.pricing.monthlyRental != null)), 6);
  add(!!(prop.listingType && String(prop.listingType).trim()), 3);
  add(!!(prop.propertyCategory || prop.type), 3);

  // Description: partial by length (50 chars = 0.25, 150 = 0.5, 300+ = 1)
  const descLen = (prop.description && String(prop.description).trim()) ? String(prop.description).trim().length : 0;
  addPartial(descLen >= 300 ? 1 : descLen >= 150 ? 0.7 : descLen >= 50 ? 0.4 : descLen > 0 ? 0.2 : 0, 8);

  // Media: partial by count (cover or 1 image = 0.4, 3+ = 0.7, 5+ = 1)
  const hasCover = !!(prop.imageUrl && String(prop.imageUrl).trim());
  const imageCount = (prop.media && Array.isArray(prop.media.images)) ? prop.media.images.filter((i) => i && (i.url || i.fileUrl)).length : 0;
  const mediaCount = hasCover ? imageCount + 1 : imageCount;
  addPartial(mediaCount >= 5 ? 1 : mediaCount >= 3 ? 0.75 : mediaCount >= 1 ? 0.5 : 0, 10);

  // Location details: partial by how many fields (city, suburb, country, street)
  const loc = prop.locationDetails || {};
  const locFields = [loc.city, loc.suburb, loc.country, loc.streetAddress].filter((x) => x != null && String(x).trim());
  addPartial(locFields.length / 4, 6);

  // Property size: partial if only one of size/landSize
  const hasSize = prop.propertySize && (prop.propertySize.size != null || prop.propertySize.landSize != null);
  const hasBoth = prop.propertySize && prop.propertySize.size != null && prop.propertySize.landSize != null;
  add(hasBoth, 4);
  add(hasSize && !hasBoth, 2);

  // Declarations: partial by how many checked
  const decl = prop.declarations || {};
  const declCount = [decl.informationAccurate, decl.agentDeclaration, decl.noMaterialFactsOmitted].filter(Boolean).length;
  addPartial(declCount / 3, 4);

  // Mandatory docs: partial by share uploaded
  const mandatory = Array.isArray(prop.mandatoryDocs) ? prop.mandatoryDocs : [];
  const uploaded = mandatory.filter((d) => d && d.uploaded).length;
  addPartial(mandatory.length ? uploaded / Math.max(mandatory.length, 1) : 0, 4);

  // Optional: availability, jurisdiction, specs (beds/baths) — small weights for granularity
  add(!!(prop.availability && (prop.availability.status || prop.availability.availableFrom != null)), 2);
  add(!!(prop.jurisdiction && prop.jurisdiction.country), 2);
  add(!!((prop.specs && (prop.specs.beds != null || prop.specs.baths != null)) || (prop.residential && (prop.residential.bedrooms != null || prop.residential.bathrooms != null))), 2);

  if (max === 0) return 0;
  const raw = (total / max) * 100;
  // Cap at 99 so score is never 100
  return Math.round(Math.min(99, Math.max(0, raw)));
}

/**
 * Compute lead score (0-100) from info completeness and optional property match quality.
 * @param { object } lead - Lead object (crmLeads item)
 * @param { number } [avgMatchScore] - Optional average match score from MatchScore collection (0-100)
 * @returns { number }
 */
function computeLeadScore(lead, avgMatchScore) {
  if (!lead || typeof lead !== 'object') return 0;
  let total = 0;
  let max = 0;

  const add = (filled, weight) => {
    max += weight;
    if (filled) total += weight;
  };

  add(!!(lead.name && String(lead.name).trim()), 20);
  add(!!(lead.email && String(lead.email).trim()), 20);
  add(!!(lead.mobile && String(lead.mobile).trim()), 15);
  add(!!(lead.budget && String(lead.budget).trim()), 10);
  add(!!(lead.leadType && String(lead.leadType).trim()), 5);
  const details = lead.buyerDetails || lead.sellerDetails || lead.investorDetails;
  add(!!(details && typeof details === 'object' && Object.keys(details).length > 0), 15);
  add(!!(lead.propertyOfInterest && String(lead.propertyOfInterest).trim()), 5);
  add(Array.isArray(lead.linkedProperties) && lead.linkedProperties.length > 0, 10);

  const completenessScore = max === 0 ? 0 : (total / max) * 100;
  const matchComponent = avgMatchScore != null && !Number.isNaN(Number(avgMatchScore)) ? Math.max(0, Math.min(100, Number(avgMatchScore))) : 50; // default 50 if no matches
  const score = Math.round(0.5 * completenessScore + 0.5 * matchComponent);
  return Math.min(100, Math.max(0, score));
}

module.exports = {
  computeAgentTierAndScore,
  computePropertyIpmScore,
  computeLeadScore,
};

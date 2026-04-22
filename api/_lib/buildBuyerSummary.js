/**
 * Build a short text summary of a buyer/investor for Claude matching.
 * For CRM leads: use buyerDetails or investorDetails + budget, type, etc.
 * For registered users: use preferredCities, preferredPropertyTypes, etc.
 */
function buildBuyerSummaryFromLead(lead) {
  if (!lead) return '';
  const parts = [];
  if (lead.name) parts.push(`Name: ${lead.name}`);
  if (lead.budget && lead.budget !== '—') parts.push(`Budget: ${lead.budget}`);
  if (lead.propertyOfInterest) parts.push(`Interest: ${lead.propertyOfInterest}`);
  if (lead.type && lead.type !== '—') parts.push(`Type: ${lead.type}`);
  const b = lead.buyerDetails;
  if (b && typeof b === 'object') {
    if (b.budgetMin || b.budgetMax) parts.push(`Budget range: ${b.budgetMin || '?'} - ${b.budgetMax || '?'}`);
    if (b.minBedrooms) parts.push(`Min bedrooms: ${b.minBedrooms}`);
    if (b.minBathrooms) parts.push(`Min bathrooms: ${b.minBathrooms}`);
    if (b.minFloorSizeM2) parts.push(`Min floor size: ${b.minFloorSizeM2} m²`);
    if (b.propertyTypePreference) parts.push(`Property type: ${b.propertyTypePreference}`);
    if (b.locationPreferences) parts.push(`Locations: ${b.locationPreferences}`);
    if (b.mustHaveFeatures) parts.push(`Must have: ${b.mustHaveFeatures}`);
    if (b.urgency) parts.push(`Urgency: ${b.urgency}`);
  }
  const inv = lead.investorDetails;
  if (inv && typeof inv === 'object') {
    if (inv.dealSizeMin || inv.dealSizeMax) parts.push(`Deal size: ${inv.dealSizeMin || '?'} - ${inv.dealSizeMax || '?'}`);
    if (inv.targetYieldPct) parts.push(`Target yield: ${inv.targetYieldPct}%`);
    if (inv.targetRoiPct) parts.push(`Target ROI: ${inv.targetRoiPct}%`);
    if (inv.capitalAvailable) parts.push(`Capital: ${inv.capitalAvailable}`);
    if (inv.investmentStrategy && inv.investmentStrategy.length) parts.push(`Strategy: ${inv.investmentStrategy.join(', ')}`);
  }
  return parts.join('\n') || 'No preferences specified.';
}

function buildBuyerSummaryFromUser(user) {
  if (!user) return '';
  const parts = [];
  if (user.name) parts.push(`Name: ${user.name}`);
  if (user.role) parts.push(`Role: ${user.role}`);
  if (user.location) parts.push(`Location: ${user.location}`);
  if (user.preferredCities && user.preferredCities.length) parts.push(`Preferred cities: ${user.preferredCities.join(', ')}`);
  if (user.preferredPropertyTypes && user.preferredPropertyTypes.length) parts.push(`Property types: ${user.preferredPropertyTypes.join(', ')}`);
  return parts.join('\n') || 'No preferences specified.';
}

module.exports = { buildBuyerSummaryFromLead, buildBuyerSummaryFromUser };

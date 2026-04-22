/**
 * Build a short text summary of a listing for Claude matching.
 * Uses property fields + listingMetadata when available.
 */
function buildListingSummary(property) {
  if (!property || typeof property !== 'object') return '';
  const p = property;
  const meta = (p.listingMetadata && typeof p.listingMetadata === 'object')
    ? (p.listingMetadata.metadata || p.listingMetadata.property || p.listingMetadata)
    : {};
  const parts = [];
  if (p.title) parts.push(`Title: ${p.title}`);
  if (p.location) parts.push(`Location: ${p.location}`);
  if (p.price) parts.push(`Price: ${p.price}`);
  if (p.listingType) parts.push(`Listing type: ${p.listingType}`);
  if (p.propertyCategory) parts.push(`Category: ${p.propertyCategory}`);
  if (p.type) parts.push(`Type: ${p.type}`);
  if (p.description) parts.push(`Description: ${String(p.description).slice(0, 600)}`);
  const loc = p.locationDetails;
  if (loc && (loc.city || loc.suburb || loc.country)) {
    parts.push(`Area: ${[loc.suburb, loc.city, loc.country].filter(Boolean).join(', ')}`);
  }
  const pricing = p.pricing;
  if (pricing) {
    if (pricing.askingPrice != null) parts.push(`Asking price: ${pricing.askingPrice}`);
    if (pricing.monthlyRental != null) parts.push(`Monthly rental: ${pricing.monthlyRental}`);
  }
  const size = p.propertySize;
  if (size && (size.size != null || size.landSize != null)) {
    parts.push(`Size: ${size.size != null ? size.size + ' m²' : ''} ${size.landSize != null ? 'Land: ' + size.landSize : ''}`.trim());
  }
  const res = p.residential;
  if (res) {
    if (res.bedrooms != null) parts.push(`Bedrooms: ${res.bedrooms}`);
    if (res.bathrooms != null) parts.push(`Bathrooms: ${res.bathrooms}`);
    if (res.livingAreaSize != null) parts.push(`Living area: ${res.livingAreaSize} m²`);
    if (res.propertyFeatures && res.propertyFeatures.length) parts.push(`Features: ${res.propertyFeatures.slice(0, 8).join(', ')}`);
  }
  if (meta && typeof meta === 'object') {
    const area = meta.area || meta.locality || meta.suburb;
    if (area) parts.push(`Metadata area: ${area}`);
    if (meta.propertyType) parts.push(`Metadata type: ${meta.propertyType}`);
  }
  const nearby = p.listingMetadata?.amenities?.nearby;
  if (Array.isArray(nearby) && nearby.length > 0) {
    const nearbyStr = nearby.slice(0, 12).map((a) => {
      const name = a.name || a.type || 'POI';
      const dist = a.distance_km != null ? `${a.distance_km} km` : '';
      const type = (a.type || '').replace(/_/g, ' ');
      return type ? `${name} (${type}${dist ? ', ' + dist : ''})` : `${name}${dist ? ' ' + dist : ''}`;
    }).join('; ');
    parts.push(`Nearby: ${nearbyStr}`);
  }
  return parts.join('\n');
}

module.exports = { buildListingSummary };

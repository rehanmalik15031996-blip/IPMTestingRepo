/**
 * GET /api/properties/search-for-leads?q=...&userId=...
 * For agents and agencies: fetch properties visible to the user, then use Claude to rank
 * by relevance to the search query (for their leads). Returns { results: [ { property, score } ] }.
 * Env: ANTHROPIC_API_KEY
 */
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const User = require('../../server/models/User');
const Property = require('../../server/models/Property');
const { buildListingSummary } = require('../_lib/buildListingSummary');
const mongoose = require('mongoose');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-haiku-4-5-20251001';

// Location phrases that often appear in lead queries (lowercase). Used to include matching properties first.
const COUNTRY_PHRASES = [
  'south africa', 'united states', 'usa', 'u.s.a.', 'uk', 'united kingdom', 'australia',
  'germany', 'france', 'spain', 'portugal', 'netherlands', 'ireland', 'canada', 'new zealand',
  'namibia', 'botswana', 'zimbabwe', 'mozambique', 'kenya', 'uae', 'dubai'
];

function getLocationHint(query) {
  const lower = (query || '').toLowerCase();
  for (const phrase of COUNTRY_PHRASES) {
    if (lower.includes(phrase)) return new RegExp(phrase.replace(/\s+/g, '\\s+'), 'i');
  }
  return null;
}

function propertyMatchesLocation(property, locationRegex) {
  if (!locationRegex) return false;
  const loc = (property.location || '').toString();
  const country = (property.locationDetails && property.locationDetails.country) ? String(property.locationDetails.country) : '';
  return locationRegex.test(loc) || locationRegex.test(country);
}

// Fallback when Claude is unavailable: score by keyword overlap and location so results aren't irrelevant.
function fallbackRankByQuery(properties, query, locationRegex) {
  const q = (query || '').toLowerCase();
  const queryWords = q.replace(/[^\w\s]/g, ' ').split(/\s+/).filter((w) => w.length > 1);
  const textFor = (p) => [
    p.title,
    p.location,
    (p.description || '').slice(0, 600),
    (p.locationDetails && p.locationDetails.country) || ''
  ].filter(Boolean).join(' ').toLowerCase();

  const isOceanQuery = /\b(ocean|sea|beach|waterfront|coastal|marina|seaside|beachfront|ocean view|sea view|near (the )?water)\b/i.test(q);
  const oceanKeywords = /\b(ocean|beach|waterfront|sea\b|coastal|marina|beachfront|seaside|waterfront|long beach|cape town|durban|sandton)\b/i;

  const scored = properties.map((p) => {
    const text = textFor(p);
    let score = 50;
    let reason = 'Ranked by keyword match.';

    if (queryWords.length > 0) {
      const matchCount = queryWords.filter((w) => text.includes(w)).length;
      const ratio = matchCount / queryWords.length;
      score = Math.round(25 + ratio * 65);
      score = Math.min(95, Math.max(15, score));
      if (ratio >= 0.5) reason = 'Matches your search terms.';
      else if (ratio > 0) reason = 'Some matching keywords.';
      else reason = 'Few matching keywords; consider different search terms.';
    }

    if (isOceanQuery) {
      const hasOcean = oceanKeywords.test(text);
      score = hasOcean ? Math.max(score, 85) : Math.min(score, 25);
      reason = hasOcean
        ? 'Listing mentions coastal/waterfront; matches ocean request.'
        : 'No ocean or water mention in listing; likely not close to ocean.';
    }

    // When query implies a location, strongly demote properties that don't match that location.
    if (locationRegex) {
      const matchesLocation = propertyMatchesLocation(p, locationRegex);
      if (!matchesLocation) {
        score = Math.min(score, 35);
        reason = 'Different location from your search; does not match.';
      } else {
        score = Math.max(score, 65);
        if (reason === 'Ranked by keyword match.') reason = 'Matches your search location and terms.';
      }
    }

    return { property: p, score, reason };
  });

  scored.sort((a, b) => (b.score - a.score));
  return scored;
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const q = (req.query.q || '').trim();
  const userId = (req.query.userId || '').trim();
  if (!q) return res.status(400).json({ error: 'Query q is required' });
  if (!userId) return res.status(400).json({ error: 'userId is required' });

  try {
    await connectDB();
    const user = await User.findById(userId).lean();
    if (!user) return res.status(404).json({ error: 'User not found' });

    const role = (user.role || '').toLowerCase();
    const allowedRoles = ['agency', 'agency_agent', 'independent_agent', 'agent'];
    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: 'Search for leads is only available for agents and agencies' });
    }

    let agentIds = [];
    if (role === 'agency') {
      const fromTopAgents = (user.agencyStats?.topAgents || []).map((a) => a._id || a.id).filter(Boolean).map((aid) => String(aid));
      const agencyMembers = await User.find({ agencyId: userId }).select('_id').lean();
      const fromAgencyMembers = (agencyMembers || []).map((u) => String(u._id));
      agentIds = [userId, ...new Set([...fromTopAgents, ...fromAgencyMembers])];
    } else {
      agentIds = [userId];
    }

    const validIds = agentIds.filter((aid) => mongoose.Types.ObjectId.isValid(aid)).map((aid) => new mongoose.Types.ObjectId(aid));
    if (validIds.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const baseFilter = { agentId: { $in: validIds }, status: { $in: ['Published', 'Under Offer', 'Draft'] } };
    const locationHint = getLocationHint(q);
    let properties = [];
    if (locationHint) {
      // Fetch extra so location-matching ones aren't dropped by limit (e.g. "in south africa").
      const all = await Property.find(baseFilter).sort({ createdAt: -1 }).limit(200).lean();
      const matchingFirst = all.filter((p) => propertyMatchesLocation(p, locationHint));
      const restIds = new Set(matchingFirst.map((p) => String(p._id)));
      const others = all.filter((p) => !restIds.has(String(p._id)));
      properties = [...matchingFirst, ...others].slice(0, 100);
    } else {
      properties = await Property.find(baseFilter).sort({ createdAt: -1 }).limit(100).lean();
    }

    if (properties.length === 0) {
      return res.status(200).json({ results: [] });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const fallback = fallbackRankByQuery(properties, q, locationHint);
      return res.status(200).json({
        results: fallback,
        message: 'Results ranked by keyword match. For AI-powered relevance, configure your API key in settings.'
      });
    }

    const list = properties.map((p) => ({
      id: String(p._id),
      summary: buildListingSummary(p)
    }));

    const prompt = `You are a real estate assistant. A client/lead search query is given below. You have a list of properties (each with an id and a short summary). Rank them using FUZZY, SEMANTIC matching: interpret the lead's intent and match on meaning, not just keywords.

CRITICAL RULES (apply in order):
1. LOCATION/COUNTRY: If the lead specifies a location or country (e.g. "in South Africa"), properties that do NOT match must get relevanceScore 0-30. Matching ones can get 70-100.
2. PROXIMITY / AMENITY (fuzzy): Interpret the lead's intent broadly. Examples:
   - "close to the ocean" / "near the ocean" / "ocean view" → match listings that mention: ocean, beach, waterfront, sea, coastal, marina, beachfront, sea view, ocean view, lakeside, riverfront, or any water/coastal context. If the listing has NO such mention and is clearly landlocked (e.g. inland city, no water in title/description/location), give relevanceScore 0-25.
   - "close to schools" / "near mall" → use Description and any "Nearby:" line; score 70-100 when the listing mentions matching amenities, 0-40 when there is no mention.
3. Use the FULL 0-100 range. Do not give every property the same score. Best matches first in the array.
4. For EACH property you must provide a short "reason" (one sentence) explaining why it matches or does not match the search (e.g. "Beachfront listing; matches ocean request." or "Inland location with no water/ocean mention; does not match.").

SEARCH QUERY FROM LEAD:
${q}

PROPERTIES (id and summary per block):
${list.map((l) => `ID: ${l.id}\n${l.summary}`).join('\n---\n')}

Reply with ONLY a valid JSON array. One object per property, best match first. Each object must have: "propertyId" (string), "relevanceScore" (number 0-100), and "reason" (string, one short sentence). Example:
[{"propertyId":"abc123","relevanceScore":92,"reason":"Waterfront with ocean views; matches lead request."},{"propertyId":"def456","relevanceScore":18,"reason":"Inland property with no ocean or water mention."}]`;

    let claudeRes;
    try {
      claudeRes = await fetch(ANTHROPIC_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 2048,
          system: 'You output only valid JSON. No markdown, no explanation, no other text.',
          messages: [{ role: 'user', content: prompt }],
        }),
      });
    } catch (networkErr) {
      const errMsg = networkErr.message || String(networkErr);
      console.error('[search-for-leads] AI request failed (network)', errMsg);
      const fallback = fallbackRankByQuery(properties, q, locationHint);
      return res.status(200).json({
        results: fallback,
        message: 'Results ranked by keyword. Smart matching is temporarily unavailable.',
        smartMatchError: `Smart matching failed: ${errMsg}. Check your connection and try again.`
      });
    }

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('[search-for-leads] AI ranking failed', claudeRes.status, errText.slice(0, 800));
      let smartMatchError = `HTTP ${claudeRes.status}. `;
      try {
        const errJson = JSON.parse(errText);
        const err = errJson.error;
        const msg = err?.message ?? errJson.message ?? errJson.error;
        const type = err?.type ?? errJson.type;
        if (typeof msg === 'string') smartMatchError += msg;
        else if (msg) smartMatchError += JSON.stringify(msg);
        if (type && type !== 'error') smartMatchError += ` (${type})`;
      } catch (_) {
        if (errText.length > 0) smartMatchError += errText.length > 300 ? errText.slice(0, 300) + '…' : errText;
      }
      const fallback = fallbackRankByQuery(properties, q, locationHint);
      return res.status(200).json({
        results: fallback,
        message: 'Results ranked by keyword. Smart matching is temporarily unavailable.',
        smartMatchError: smartMatchError.trim()
      });
    }

    const data = await claudeRes.json();
    const firstTextBlock = Array.isArray(data?.content) ? data.content.find((b) => b && b.type === 'text') : null;
    const text = (firstTextBlock?.text ?? data?.content?.[0]?.text ?? '').trim();
    let ranked = [];
    let parseErrorMsg = null;
    try {
      const cleaned = text.replace(/```json?\s*|\s*```/g, '').trim();
      const parsed = JSON.parse(cleaned);
      if (Array.isArray(parsed)) ranked = parsed;
    } catch (parseErr) {
      parseErrorMsg = parseErr.message || 'Invalid JSON';
      console.warn('[search-for-leads] Claude response was not valid JSON:', text.slice(0, 300), parseErrorMsg);
    }
    if (ranked.length === 0) {
      const fallback = fallbackRankByQuery(properties, q, locationHint);
      return res.status(200).json({
        results: fallback,
        message: 'Results ranked by keyword. Smart matching did not return valid results.',
        smartMatchError: parseErrorMsg
          ? `Claude response was not valid JSON: ${parseErrorMsg}. Using keyword ranking instead.`
          : 'Smart matching returned an empty list. Using keyword ranking instead.'
      });
    }

    const idToMeta = {};
    ranked.forEach((r) => {
      if (r && r.propertyId != null) {
        const pid = String(r.propertyId);
        const score = typeof r.relevanceScore === 'number' ? Math.min(100, Math.max(0, r.relevanceScore)) : null;
        const reason = typeof r.reason === 'string' ? r.reason.trim() : null;
        idToMeta[pid] = { score, reason };
      }
    });
    const propMap = {};
    properties.forEach((p) => { propMap[String(p._id)] = p; });
    const ordered = [];
    ranked.forEach((r) => {
      const pid = r && r.propertyId ? String(r.propertyId) : null;
      if (pid && propMap[pid]) {
        const meta = idToMeta[pid] || {};
        ordered.push({
          property: propMap[pid],
          score: typeof meta.score === 'number' ? meta.score : null,
          reason: meta.reason || null
        });
        delete propMap[pid];
      }
    });
    Object.values(propMap).forEach((p) => ordered.push({ property: p, score: null, reason: null }));

    return res.status(200).json({ results: ordered });
  } catch (err) {
    console.error('[search-for-leads]', err);
    return res.status(500).json({ error: err.message || 'Search failed' });
  }
};

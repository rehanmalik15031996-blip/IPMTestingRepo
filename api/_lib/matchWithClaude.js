/**
 * Call Claude to compute a single match score (0-100) between a listing summary and a buyer/investor summary.
 * Uses Messages API; returns a number or null on failure.
 */
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-3-5-haiku-20241022';

async function matchWithClaude(listingSummary, buyerSummary) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn('[match] ANTHROPIC_API_KEY not set, skipping Claude call');
    return null;
  }
  const userContent = `You are a real estate match scorer. Given a LISTING and a BUYER/INVESTOR profile, output a single integer from 0 to 100 indicating how well the listing matches their needs (100 = perfect match). Consider location, price/budget, property type, size, features, and any stated preferences. Reply with ONLY the number, no explanation.

LISTING:
${listingSummary}

BUYER/INVESTOR PROFILE:
${buyerSummary}

Score (0-100):`;

  const body = {
    model: MODEL,
    max_tokens: 20,
    system: 'Reply with only a single integer between 0 and 100. No other text.',
    messages: [{ role: 'user', content: userContent }],
  };

  const res = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error('[match] Claude API error', res.status, errText);
    return null;
  }

  const data = await res.json();
  const text = data.content && data.content[0] && data.content[0].text ? data.content[0].text.trim() : '';
  const num = parseInt(text.replace(/\D/g, ''), 10);
  if (Number.isNaN(num)) return null;
  return Math.min(100, Math.max(0, num));
}

module.exports = { matchWithClaude };

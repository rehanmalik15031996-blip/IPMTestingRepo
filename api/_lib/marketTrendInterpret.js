/**
 * Market Trends: use the same Claude LLM as chat (ANTHROPIC_API_KEY, claude-3-5-haiku).
 * One call per region returns: actual monthly values for the line chart, YoY %, interpretation, sentiment.
 * Fallback: return null and caller uses static JSON + optional separate interpret.
 */
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
// Same model as api/chat.js and server/server.js (the "working" chat LLM)
const MODEL = process.env.CLAUDE_MARKET_TREND_MODEL || 'claude-3-5-haiku-20241022';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const SENTIMENTS = ['GOOD', 'EXCELLENT', 'STABLE', 'CAUTION'];

/** Derive sentiment from actual YoY so labels align with the trend data (not LLM). */
function getSentimentFromYoY(yoyPercent) {
  const str = String(yoyPercent || '').trim();
  const num = parseFloat(str.replace(/[^0-9.-]/g, '')) || 0;
  if (num < 0) return 'CAUTION';
  if (num < 3) return 'STABLE';
  if (num < 9) return 'GOOD';
  return 'EXCELLENT';
}

function parseJsonFromText(text) {
  const trimmed = (text || '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}') + 1;
  if (start === -1 || end <= start) return null;
  try {
    return JSON.parse(trimmed.slice(start, end));
  } catch (_) {
    return null;
  }
}

/**
 * Get market trend actuals and interpretation from Claude.
 * @param {string} region - e.g. "South Africa", "Dubai", "London"
 * @param {Array<{month:string, value:number}>} existingMonthlyData - optional; if provided Claude uses these (or refines) for the chart
 * @param {string} sourceText - optional methodology/source
 * @returns {Promise<{ monthlyData: Array<{month, value}>, yoyPercent: string, interpretation: string, sentiment: string } | null>}
 */
async function getMarketTrendFromClaude(region, existingMonthlyData, sourceText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const hasExisting = Array.isArray(existingMonthlyData) && existingMonthlyData.length >= 6;
  const dataContext = hasExisting
    ? `Existing monthly index values (use these for the chart; compute YoY from last month vs same period prior year if two years given, else year-over-year from first to last):\n${JSON.stringify(existingMonthlyData.slice(-24), null, 0)}\n`
    : `No existing series provided. For ${region}, output 12 monthly index values for the most recent full calendar year (Jan–Dec), using standard house price index methodology. `;
  const userContent = `You are a real estate market analyst. For the region "${region}", produce actual values and interpretation.

${dataContext}
${sourceText ? `Source/methodology: ${sourceText.slice(0, 400)}` : ''}

Reply with ONLY a single JSON object, no markdown or explanation, with this exact structure:
{
  "monthlyData": [ {"month": "Jan", "value": number}, {"month": "Feb", "value": number}, ... 12 months ],
  "yoyPercent": "+X.X%" or "-X.X%" (year-over-year change),
  "interpretation": "One short sentence for investors, max 15 words.",
  "sentiment": "GOOD" | "EXCELLENT" | "STABLE" | "CAUTION"
}
Use EXCELLENT for strong growth; GOOD for positive; STABLE for flat; CAUTION for declining or risky.`;

  const body = {
    model: MODEL,
    max_tokens: 600,
    system: 'Reply with only one JSON object. Keys: monthlyData (array of {month, value}), yoyPercent (string), interpretation (string), sentiment (one of GOOD, EXCELLENT, STABLE, CAUTION). No other text.',
    messages: [{ role: 'user', content: userContent }],
  };

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content && data.content[0] && data.content[0].text ? data.content[0].text : '').trim();
    const parsed = parseJsonFromText(text);
    if (!parsed || !Array.isArray(parsed.monthlyData) || parsed.monthlyData.length < 6) return null;
    const monthlyData = parsed.monthlyData
      .map((d, i) => ({ month: (d.month && String(d.month).trim()) || MONTHS[i] || '', value: Number(d.value) }))
      .filter((d) => d.month && !Number.isNaN(d.value));
    if (monthlyData.length < 6) return null;
    const yoyPercent = typeof parsed.yoyPercent === 'string' ? parsed.yoyPercent.trim() : null;
    const interpretation = typeof parsed.interpretation === 'string' ? parsed.interpretation.trim() : null;
    const sentimentRaw = (parsed.sentiment || '').toUpperCase().replace(/\s/g, '');
    const sentiment = SENTIMENTS.includes(sentimentRaw) ? sentimentRaw : null;
    return {
      monthlyData,
      yoyPercent: yoyPercent || null,
      interpretation: interpretation || null,
      sentiment: sentiment || null,
    };
  } catch (e) {
    console.warn('[marketTrendInterpret]', e.message);
    return null;
  }
}

/**
 * Legacy: interpretation + sentiment only (no chart data). Used when getMarketTrendFromClaude is not used.
 */
async function interpretMarketTrend(region, yoyPercent, sourceText) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const userContent = `You are a real estate market analyst. For the following region and data, output exactly two lines:

Line 1: One short interpretation sentence (max 15 words) for investors: e.g. "Steady appreciation; solid for medium-term holds." or "Declining prices; review holdings and exit strategy."
Line 2: Exactly one word — the sentiment label: GOOD, EXCELLENT, STABLE, or CAUTION (use CAUTION for declining or risky markets; EXCELLENT for strong growth; GOOD for positive; STABLE for flat/sideways).

Region: ${region}
Year-over-year change: ${yoyPercent != null && yoyPercent !== '' ? yoyPercent : 'data not available'}
${sourceText ? `Source/methodology: ${sourceText.slice(0, 300)}` : ''}

Reply with only Line 1 then Line 2, no other text.`;

  const body = {
    model: MODEL,
    max_tokens: 120,
    system: 'Output exactly two lines: first line = one short interpretation sentence; second line = one of GOOD, EXCELLENT, STABLE, CAUTION.',
    messages: [{ role: 'user', content: userContent }],
  };

  try {
    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = (data.content && data.content[0] && data.content[0].text ? data.content[0].text : '').trim();
    const lines = text.split(/\n/).map((s) => s.trim()).filter(Boolean);
    const interpretation = lines[0] || null;
    const sentimentRaw = (lines[1] || '').toUpperCase().replace(/\s/g, '');
    const sentiment = SENTIMENTS.includes(sentimentRaw) ? sentimentRaw : null;
    if (!interpretation && !sentiment) return null;
    return { interpretation: interpretation || null, sentiment: sentiment || null };
  } catch (e) {
    console.warn('[marketTrendInterpret]', e.message);
    return null;
  }
}

module.exports = { getMarketTrendFromClaude, interpretMarketTrend, getSentimentFromYoY };

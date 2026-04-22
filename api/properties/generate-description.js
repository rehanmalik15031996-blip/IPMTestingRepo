/**
 * POST /api/properties/generate-description
 * Body: { context: string } — property/listing context built by the client.
 * Uses Claude to generate a specific title and description. Requires auth.
 * Env: ANTHROPIC_API_KEY
 */
const { handleCors } = require('../_lib/cors');
const { getUserIdFromRequest } = require('../_lib/auth');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-3-5-haiku-20241022';

const SYSTEM = `You are an expert real estate copywriter. Your job is to write a SPECIFIC, vivid listing that could only describe THIS property—using every relevant detail provided. Do NOT use generic filler.
Reply in this exact format only (no other text):
TITLE:
<one line, specific to this property>

DESCRIPTION:
<4-8 sentences, specific and vivid>`;

function buildUserPrompt(context) {
  return `You are an expert real estate copywriter. Your job is to write a SPECIFIC, vivid listing that could only describe THIS property—using every relevant detail below. Do NOT use generic filler.

RULES:
- Use the exact address, price/rent, bed/bath/size, and all features/amenities listed. Name the area, neighborhood, or city when provided.
- Write 4–8 sentences: engaging, sales-focused prose (no bullet points). Vary sentence length. Sound professional and credible.
- FORBIDDEN phrases (never use these): "worth a closer look", "ideal for anyone seeking this type of property", "a solid opportunity", "designed to appeal", "well suited to a range of lifestyles", "perfect for buyers or investors", "this inviting property", "stands out with", "combines location and liveability", "compelling package", "ideal for...", "great opportunity", or any sentence that could apply to any listing.
- The description must mention concrete details (e.g. "3 bedrooms and 2 bathrooms", the actual price, the street or area name, specific features like pool or security). If fixtures/features are listed, weave the most attractive ones into the copy.

Property and listing data:
${context}

Reply in this exact format only (no other text):
TITLE:
<one line, specific to this property>

DESCRIPTION:
<4-8 sentences, specific and vivid>`;
}

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const userId = getUserIdFromRequest(req, res);
  if (!userId) return;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ message: 'AI description service is not configured' });
  }

  const context = typeof req.body?.context === 'string' ? req.body.context.trim() : '';
  if (!context) {
    return res.status(400).json({ message: 'Missing or invalid context' });
  }

  try {
    const res2 = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: SYSTEM,
        messages: [{ role: 'user', content: buildUserPrompt(context) }],
      }),
    });

    if (!res2.ok) {
      const errText = await res2.text();
      console.error('[generate-description] Claude API error', res2.status, errText);
      return res.status(502).json({ message: 'AI service error', detail: errText.slice(0, 200) });
    }

    const data = await res2.json();
    const text = (data.content && data.content[0] && data.content[0].text) ? data.content[0].text.trim() : '';
    if (!text) {
      return res.status(502).json({ message: 'Empty response from AI' });
    }

    const titleMatch = text.match(/TITLE:\s*\n?(.+?)(?=\n\nDESCRIPTION:|\nDESCRIPTION:|$)/is);
    const descMatch = text.match(/DESCRIPTION:\s*\n?([\s\S]+?)$/im);
    const propertyTitle = titleMatch ? titleMatch[1].trim().replace(/\n/g, ' ') : '';
    const shortDescription = descMatch ? descMatch[1].trim().replace(/\n+/g, ' ') : '';

    return res.status(200).json({ propertyTitle, shortDescription });
  } catch (err) {
    console.error('[generate-description]', err);
    return res.status(500).json({ message: 'Failed to generate description', detail: err.message });
  }
};

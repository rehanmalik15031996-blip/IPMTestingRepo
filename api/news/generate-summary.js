/**
 * POST /api/news/generate-summary
 * Body: { title, category?, desc?, articleId? }
 * Uses only title (and our own category/desc) — never fetches or sends publisher article text.
 * Returns { summary }. If articleId provided, also updates the News doc and returns { summary, updated: true }.
 * Env: ANTHROPIC_API_KEY
 */
const connectDB = require('../_lib/mongodb');
const { handleCors } = require('../_lib/cors');
const News = require('../../server/models/News');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const CLAUDE_MODEL = 'claude-3-5-haiku-20241022';

module.exports = async (req, res) => {
  if (handleCors(req, res)) return;
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ error: 'ANTHROPIC_API_KEY not set' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (_) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
  }
  const { title, category, desc, articleId } = body || {};
  if (!title || typeof title !== 'string' || !title.trim()) {
    return res.status(400).json({ error: 'title is required' });
  }

  const prompt = `You are writing a very short summary for a news or property article. Use ONLY the information below (article title and optional category/description). Do not invent or add facts. Write 1–2 sentences, under 200 characters, neutral and factual.

Title: ${title.trim()}
${category ? `Category: ${category}` : ''}
${desc && desc.trim() ? `Existing short description: ${String(desc).trim().slice(0, 300)}` : ''}

Reply with only the summary text, no quotes or labels.`;

  try {
    const claudeRes = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 256,
        system: 'You output only the requested summary text, nothing else. No preamble or explanation.',
        messages: [{ role: 'user', content: prompt }],
      }),
    });

    if (!claudeRes.ok) {
      const errText = await claudeRes.text();
      console.error('[news/generate-summary] Claude error', claudeRes.status, errText.slice(0, 200));
      return res.status(502).json({ error: 'AI summary failed', detail: errText.slice(0, 200) });
    }

    const data = await claudeRes.json();
    const summary = (data?.content?.[0]?.text || '').trim().slice(0, 500);

    if (articleId && summary) {
      await connectDB();
      const updated = await News.findByIdAndUpdate(
        articleId,
        { aiSummary: summary },
        { new: true }
      );
      if (updated) {
        return res.status(200).json({ summary, updated: true, article: updated });
      }
    }

    return res.status(200).json({ summary });
  } catch (e) {
    console.error('[news/generate-summary]', e);
    return res.status(500).json({ error: 'Summary generation failed', detail: e.message });
  }
};

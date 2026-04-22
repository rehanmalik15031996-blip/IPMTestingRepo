/**
 * POST /api/chat (copy for when Vercel root is "client").
 * Uses ANTHROPIC_API_KEY (Claude).
 */
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-3-5-haiku-20241022';

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed', reply: '' });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
        return res.status(503).json({ reply: '', error: 'Chat not configured' });
    }

    const message = req.body?.message;
    if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message required' });
    }

    try {
        const response = await fetch(ANTHROPIC_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: MODEL,
                max_tokens: 1024,
                system: 'You are a helpful AI assistant for the International Property Market (IPM) platform. Answer concisely about real estate, property investments, market trends, and ESG. Be professional and accurate.',
                messages: [{ role: 'user', content: message }],
            }),
        });
        const data = await response.json();

        if (!response.ok) {
            const errMsg = data?.error?.message || data?.message || response.statusText;
            return res.status(response.status >= 500 ? 502 : response.status).json({ error: errMsg, reply: '' });
        }

        const text = (data?.content?.[0]?.text || '').trim() || 'No response.';
        return res.status(200).json({ reply: text });
    } catch (err) {
        console.error('Claude chat error:', err);
        return res.status(500).json({ error: err.message || 'Server error', reply: '' });
    }
};

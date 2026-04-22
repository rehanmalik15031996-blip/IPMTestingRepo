/**
 * Contact / calendar endpoints — uses fetch so no axios JWT is ever attached.
 *
 * If REACT_APP_API_URL points at production while you run the app on localhost,
 * cross-origin POSTs often get 403 (deployment protection). In that case we use
 * same-origin /api so the dev proxy hits local Express.
 */

function apiBaseForContact() {
    const configured = (process.env.REACT_APP_API_URL || '').replace(/\/$/, '');
    if (!configured) return '';
    if (typeof window === 'undefined') return configured;
    const onLocal =
        window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    const remote =
        configured.startsWith('http') &&
        !/localhost|127\.0\.0\.1/i.test(configured);
    if (process.env.NODE_ENV === 'development' && onLocal && remote) {
        return '';
    }
    return configured;
}

function absoluteUrl(path) {
    const p = path.startsWith('/') ? path : `/${path}`;
    const base = apiBaseForContact();
    if (!base) return p;
    return `${base}${p}`;
}

async function fetchJson(method, path, body) {
    const url = absoluteUrl(path);
    const opts = {
        method,
        headers: { Accept: 'application/json' },
        credentials: 'omit',
    };
    if (method !== 'GET' && body != null) {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
    }
    const res = await fetch(url, opts);
    const text = await res.text();
    let data = null;
    try {
        data = text ? JSON.parse(text) : null;
    } catch {
        data = text;
    }
    if (!res.ok) {
        const msg =
            typeof data === 'object' && data && data.message
                ? data.message
                : typeof data === 'string' && data
                  ? data
                  : res.statusText || `HTTP ${res.status}`;
        const err = new Error(msg);
        err.response = { status: res.status, data };
        throw err;
    }
    return data;
}

export const contactPublicFetch = {
    postInquiry: (payload) => fetchJson('POST', '/api/contact?type=inquiry', payload),
    getAppointments: () => fetchJson('GET', '/api/contact?type=appointments'),
    getMeetings: (date, agentName) =>
        fetchJson(
            'GET',
            `/api/contact?type=meetings&date=${encodeURIComponent(date)}&agentName=${encodeURIComponent(agentName)}`
        ),
    postMeeting: (payload) => fetchJson('POST', '/api/contact?type=meetings', payload),
};

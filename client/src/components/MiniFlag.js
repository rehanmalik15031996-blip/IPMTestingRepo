import React from 'react';

const COUNTRY_CODE_MAP = {
    'south africa': 'SA', 'sa': 'SA', 'za': 'SA', 'zaf': 'SA',
    'united arab emirates': 'UAE', 'uae': 'UAE', 'ae': 'UAE',
    'united kingdom': 'UK', 'uk': 'UK', 'gb': 'UK', 'england': 'UK', 'scotland': 'UK', 'wales': 'UK',
    'united states': 'USA', 'usa': 'USA', 'us': 'USA', 'united states of america': 'USA',
    'netherlands': 'NL', 'nl': 'NL', 'holland': 'NL',
    'germany': 'DE', 'de': 'DE', 'deutschland': 'DE',
    'spain': 'ES', 'es': 'ES', 'españa': 'ES',
    'australia': 'AU', 'au': 'AU',
};

export function resolveCountryCode(text) {
    if (!text) return null;
    const clean = text.trim();
    const upper = clean.toUpperCase();
    if (['SA', 'UAE', 'UK', 'USA', 'NL', 'DE', 'ES', 'AU'].includes(upper)) return upper;
    const lower = clean.toLowerCase();
    if (COUNTRY_CODE_MAP[lower]) return COUNTRY_CODE_MAP[lower];
    const parts = clean.split(',').map((p) => p.trim()).filter(Boolean);
    for (let i = parts.length - 1; i >= 0; i--) {
        const part = parts[i].toLowerCase();
        if (COUNTRY_CODE_MAP[part]) return COUNTRY_CODE_MAP[part];
    }
    return null;
}

export function countryDisplayName(text) {
    const code = resolveCountryCode(text);
    const names = { SA: 'South Africa', UAE: 'UAE', UK: 'United Kingdom', USA: 'USA', NL: 'Netherlands', DE: 'Germany', ES: 'Spain', AU: 'Australia' };
    return names[code] || text || 'Unknown';
}

export default function MiniFlag({ country, size = 20 }) {
    const code = resolveCountryCode(country) || country;
    const w = size;
    const h = Math.round(size * 0.67);
    const style = { borderRadius: 3, display: 'block', border: '1px solid rgba(0,0,0,0.08)', flexShrink: 0 };
    const t = h / 3;

    const flags = {
        SA: (() => {
            const m = h / 2;
            const yw = w * 0.38;
            return (
                <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={style}>
                    <rect fill="#DE3831" x="0" y="0" width={w} height={m} />
                    <rect fill="#002395" x="0" y={m} width={w} height={m} />
                    <rect fill="#FFFFFF" x={yw} y={m * 0.72} width={w - yw} height={m * 0.56} />
                    <rect fill="#007A4D" x={yw} y={m * 0.82} width={w - yw} height={m * 0.36} />
                    <polygon fill="#FFFFFF" points={`0,0 ${yw + w * 0.06},${m} 0,${h}`} />
                    <polygon fill="#007A4D" points={`0,${m * 0.18} ${yw},${m} 0,${h - m * 0.18}`} />
                    <polygon fill="#FFB612" points={`0,${m * 0.34} ${yw - w * 0.06},${m} 0,${h - m * 0.34}`} />
                    <polygon fill="#000000" points={`0,${m * 0.5} ${yw - w * 0.12},${m} 0,${h - m * 0.5}`} />
                </svg>
            );
        })(),
        UAE: (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={style}>
                <rect fill="#00732F" x="0" y="0" width={w} height={t} />
                <rect fill="#FFFFFF" x="0" y={t} width={w} height={t} />
                <rect fill="#000000" x="0" y={t * 2} width={w} height={t} />
                <rect fill="#FF0000" x="0" y="0" width={w * 0.25} height={h} />
            </svg>
        ),
        UK: (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={style}>
                <rect fill="#00247D" x="0" y="0" width={w} height={h} />
                <line x1="0" y1="0" x2={w} y2={h} stroke="#fff" strokeWidth="3" />
                <line x1={w} y1="0" x2="0" y2={h} stroke="#fff" strokeWidth="3" />
                <line x1="0" y1="0" x2={w} y2={h} stroke="#CF142B" strokeWidth="1.5" />
                <line x1={w} y1="0" x2="0" y2={h} stroke="#CF142B" strokeWidth="1.5" />
                <rect fill="#fff" x={w * 0.4} y="0" width={w * 0.2} height={h} />
                <rect fill="#fff" x="0" y={h * 0.35} width={w} height={h * 0.3} />
                <rect fill="#CF142B" x={w * 0.43} y="0" width={w * 0.14} height={h} />
                <rect fill="#CF142B" x="0" y={h * 0.4} width={w} height={h * 0.2} />
            </svg>
        ),
        USA: (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={style}>
                {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((i) => (
                    <rect key={i} fill={i % 2 === 0 ? '#B22234' : '#fff'} x="0" y={i * (h / 13)} width={w} height={h / 13} />
                ))}
                <rect fill="#3C3B6E" x="0" y="0" width={w * 0.4} height={h * 0.54} />
            </svg>
        ),
        NL: (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={style}>
                <rect fill="#AE1C28" x="0" y="0" width={w} height={t} />
                <rect fill="#FFFFFF" x="0" y={t} width={w} height={t} />
                <rect fill="#21468B" x="0" y={t * 2} width={w} height={t} />
            </svg>
        ),
        DE: (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={style}>
                <rect fill="#000000" x="0" y="0" width={w} height={t} />
                <rect fill="#DD0000" x="0" y={t} width={w} height={t} />
                <rect fill="#FFCC00" x="0" y={t * 2} width={w} height={t} />
            </svg>
        ),
        ES: (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={style}>
                <rect fill="#AA151B" x="0" y="0" width={w} height={h * 0.25} />
                <rect fill="#F1BF00" x="0" y={h * 0.25} width={w} height={h * 0.5} />
                <rect fill="#AA151B" x="0" y={h * 0.75} width={w} height={h * 0.25} />
            </svg>
        ),
        AU: (
            <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={style}>
                <rect fill="#00008B" x="0" y="0" width={w} height={h} />
                <rect fill="#fff" x={w * 0.15} y="0" width={w * 0.08} height={h * 0.5} />
                <rect fill="#fff" x="0" y={h * 0.17} width={w * 0.38} height={h * 0.16} />
                <rect fill="#CF142B" x={w * 0.17} y="0" width={w * 0.04} height={h * 0.5} />
                <rect fill="#CF142B" x="0" y={h * 0.2} width={w * 0.38} height={h * 0.1} />
                <circle fill="#fff" cx={w * 0.65} cy={h * 0.65} r={h * 0.08} />
            </svg>
        ),
    };

    return flags[code] || <div style={{ width: w, height: h, borderRadius: 3, background: '#e2e8f0' }} />;
}

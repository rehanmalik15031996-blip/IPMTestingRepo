import React from 'react';

export const brand = {
    primary: '#10575C',
    gold: '#E7A11A',
    goldBright: '#F2BC33',
    text: '#384046',
    muted: '#8B8F94',
    mutedLight: '#A0A4AA',
    border: '#E6E7E9',
    borderLight: '#E4E6E8',
    borderRow: '#F1F2F4',
    pageBg: '#F3F4F6',
    kpiBg: '#EBECEE',
    darkPanel: '#101214',
    darkTrack: '#293037',
    darkText: '#E1E6EA',
    darkMuted: '#818991',
    danger: '#A4260E',
    dangerBg: 'rgba(164,38,14,0.18)',
    success: '#0F5A4A',
    successBg: 'rgba(15,90,74,0.14)',
    warn: '#A65F0A',
    warnBg: 'rgba(200,120,20,0.18)',
    money: '#C9951C',
};

export const card = {
    background: '#fff',
    border: `1px solid ${brand.border}`,
    borderRadius: 12,
    boxShadow: '0 4px 16px rgba(6, 6, 6, 0.04)',
};

export const sectionTitle = {
    margin: 0,
    fontSize: 11,
    color: brand.muted,
    textTransform: 'uppercase',
    fontWeight: 600,
};

export const kpiDeltaStyle = (k) => {
    const base = { fontSize: 9, borderRadius: 999, display: 'inline-block', fontWeight: 600 };
    if (k.deltaMuted) return { ...base, color: '#6B7280', background: 'transparent', padding: 0, fontWeight: 500 };
    if (k.danger) return { ...base, color: brand.danger, background: brand.dangerBg, padding: '3px 7px' };
    const tone = k.deltaTone || 'teal';
    if (tone === 'success') return { ...base, color: brand.success, background: brand.successBg, padding: '3px 7px' };
    if (tone === 'yellow') return { ...base, color: '#8A5F0A', background: 'rgba(231,161,26,0.22)', padding: '3px 7px' };
    return { ...base, color: brand.primary, background: 'rgba(16,87,92,0.13)', padding: '3px 7px' };
};

export const KpiSection = ({ isMobile, cards, valueColors = {} }) => (
    <section style={{ ...card, padding: '12px 12px', marginBottom: 12, background: brand.kpiBg }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : `repeat(${cards.length}, minmax(0,1fr))`, gap: 10 }}>
            {cards.map((k) => (
                <article key={k.label} style={{ border: `1px solid ${brand.borderLight}`, background: '#fff', borderRadius: 10, padding: '9px 9px 8px' }}>
                    <div style={{ fontSize: 9, color: '#575D63', textTransform: 'uppercase', fontWeight: 600 }}>{k.label}</div>
                    <div style={{ fontSize: 39, lineHeight: 1, fontWeight: 300, color: valueColors[k.label] || brand.primary, margin: '6px 0 7px' }}>{k.value}</div>
                    {k.delta && <div style={kpiDeltaStyle(k)}>{k.delta}</div>}
                </article>
            ))}
        </div>
    </section>
);

export const InsightBanner = ({ text, boldText, buttonText, onButtonClick }) => (
    <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '12px 16px', marginBottom: 14, borderRadius: 999, background: 'linear-gradient(135deg, #e8f2f3 0%, #eef4f5 100%)', border: '1px solid #d4e4e6' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 36, height: 36, borderRadius: '50%', background: brand.primary, color: '#fff', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-lightbulb" style={{ fontSize: 14 }} />
            </span>
            <span style={{ fontSize: 13, color: brand.text, lineHeight: 1.45 }}>
                {boldText && <strong style={{ color: brand.primary }}>{boldText} </strong>}
                {text}
            </span>
        </div>
        {buttonText && onButtonClick && (
            <button type="button" onClick={onButtonClick} style={{ border: 'none', borderRadius: 999, padding: '8px 16px', fontSize: 12, fontWeight: 700, background: brand.primary, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                {buttonText} <i className="fas fa-arrow-right" style={{ fontSize: 11 }} />
            </button>
        )}
    </div>
);

export const statusPill = (status) => {
    const map = {
        ok: { bg: brand.successBg, color: brand.success },
        live: { bg: brand.successBg, color: brand.success },
        active: { bg: brand.successBg, color: brand.success },
        processed: { bg: brand.successBg, color: brand.success },
        syncing: { bg: brand.warnBg, color: brand.warn },
        pending: { bg: 'rgba(107,114,128,0.16)', color: '#4B5563' },
        warn: { bg: brand.warnBg, color: brand.warn },
        danger: { bg: brand.dangerBg, color: brand.danger },
        overdue: { bg: 'rgba(180,35,24,0.12)', color: '#B42318' },
    };
    const s = map[(status || '').toLowerCase()] || map.pending;
    return { padding: '3px 10px', borderRadius: 999, fontSize: 9, fontWeight: 700, background: s.bg, color: s.color, display: 'inline-block' };
};

export const pageShell = (isMobile) => ({
    container: { display: 'flex', background: brand.pageBg, minHeight: '100vh' },
    main: { padding: isMobile ? '14px' : '16px 18px', fontFamily: "'Poppins', sans-serif" },
});

export const darkTable = {
    wrapper: { borderRadius: 6, background: brand.darkPanel, padding: 10, display: 'grid', gap: 8 },
    text: { fontSize: 10, color: brand.darkText, fontWeight: 600 },
    sub: { fontSize: 9, color: brand.darkMuted },
    accent: { color: brand.goldBright },
    track: { height: 4, background: brand.darkTrack, borderRadius: 999 },
    drillIn: { background: '#332C14', color: '#E8BE52', border: '1px solid #52451e', borderRadius: 999, fontSize: 8, fontWeight: 700, padding: '4px 7px', cursor: 'pointer' },
};

export const tealPill = {
    borderRadius: 999,
    background: '#0f5f64',
    color: '#fff',
    fontSize: 9,
    fontWeight: 700,
    padding: '4px 12px',
};

export const tableHeader = {
    fontSize: 10,
    fontWeight: 700,
    color: brand.muted,
    textTransform: 'uppercase',
    borderBottom: `2px solid ${brand.border}`,
    padding: '8px 0',
};

export const tableRow = {
    borderBottom: `1px solid ${brand.borderRow}`,
    padding: '10px 0',
    fontSize: 11,
};

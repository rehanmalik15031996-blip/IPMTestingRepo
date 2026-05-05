import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Sidebar from '../components/Sidebar';
import { useIsMobile } from '../hooks/useMediaQuery';
import api from '../config/api';
import { getMarketingCache, setMarketingCache, takeMarketingInvalidated } from '../config/marketingCache';
import LogoLoading from '../components/LogoLoading';
import { usePreferences, convertCurrency } from '../context/PreferencesContext';
import { getDemoState } from '../components/DemoModeBar';
import enterpriseDemoData from '../data/enterpriseDemoData';

// Returns the canned enterprise demo data when an admin is previewing the
// enterprise dashboard via the "Demo Dashboards" launcher, or null otherwise.
// The demo user typically has no real listings/franchises, so this lets us
// drive the UI from a rich illustrative dataset for sales pitches.
const getDemoOverride = () => {
    const ds = getDemoState();
    if (ds && ds.selectedRole === 'enterprise') return enterpriseDemoData;
    return null;
};

const FONT = "'Poppins', sans-serif";
const GAP = { section: 14, card: 16 };
const FONT_SIZE = {
    sectionHeading: 14,
    cardHeading: 11,
    kpiLabel: 10,
    kpiValue: 28,
    kpiDelta: 10,
    tableHeader: 11,
    tableBody: 13,
    body: 13,
    sub: 11,
    small: 10,
    badge: 11,
    button: 12,
};

const card = {
    background: '#fff',
    border: '2px solid #E1E1E1',
    borderRadius: 20,
    boxShadow: '0 4px 16px rgba(6, 6, 6, 0.04)'
};

const sectionHeading = { margin: 0, fontSize: FONT_SIZE.sectionHeading, color: '#C2C3C3', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' };

const InsightsBanner = ({ text }) => (
    <section style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 14, padding: '0 24px', marginBottom: GAP.section, borderRadius: 20,
        background: '#D2E4E5', border: 'none', height: 80, minHeight: 80
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <img
                    src="/enterprise-assets/centralized-network.svg" alt=""
                    style={{ width: 26, height: 26, objectFit: 'contain' }}
                />
            </div>
            <p style={{ margin: 0, fontSize: 14, color: '#4E4E4E', lineHeight: 1.4, fontWeight: 300 }}>
                IPM insights + {text}
            </p>
        </div>
        <button
            type="button"
            style={{
                border: 'none', borderRadius: 20, height: 40, padding: '0 24px', fontSize: FONT_SIZE.body,
                fontWeight: 400, cursor: 'pointer', background: '#FBFBFB', color: '#10575C',
                display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0,
                fontFamily: FONT
            }}
        >
            Take Action <i className="fas fa-arrow-right" style={{ fontSize: 13 }} aria-hidden />
        </button>
    </section>
);

const COUNTRY_META = {
    'South Africa': { code: 'ZA', flag: '/enterprise-assets/flag-za.png', mapTop: '65%', mapLeft: '36%', mapSize: 'lg', bg: 'rgba(16,87,92,0.80)' },
    'United Arab Emirates': { code: 'UAE', flag: '/enterprise-assets/flag-ae.png', mapTop: '38%', mapLeft: '68%', mapSize: 'lg', bg: 'rgba(201,149,28,0.85)' },
    'United Kingdom': { code: 'UK', flag: '/enterprise-assets/flag-gb.png', mapTop: '20%', mapLeft: '42%', bg: 'rgba(16,87,92,0.75)' },
    'Netherlands': { code: 'NL', flag: '/enterprise-assets/flag-nl.png', mapTop: '18%', mapLeft: '48%', bg: 'rgba(16,87,92,0.75)' },
    'United States': { code: 'USA', flag: '/enterprise-assets/flag-us.png', mapTop: '38%', mapLeft: '10%', bg: 'rgba(16,87,92,0.75)' },
    'Australia': { code: 'AU', flag: '/enterprise-assets/flag-au.png', mapTop: '72%', mapLeft: '82%', bg: 'rgba(16,87,92,0.75)' },
    'Canada': { code: 'CA', flag: '/enterprise-assets/flag-ca.png', mapTop: '25%', mapLeft: '15%', bg: 'rgba(16,87,92,0.75)' },
    'Germany': { code: 'DE', flag: '/enterprise-assets/flag-de.png', mapTop: '22%', mapLeft: '47%', bg: 'rgba(16,87,92,0.75)' },
    'Portugal': { code: 'PT', flag: '/enterprise-assets/flag-pt.png', mapTop: '30%', mapLeft: '38%', bg: 'rgba(16,87,92,0.75)' },
    'Spain': { code: 'ES', flag: '/enterprise-assets/flag-es.png', mapTop: '30%', mapLeft: '40%', bg: 'rgba(16,87,92,0.75)' },
    'Mauritius': { code: 'MU', flag: '/enterprise-assets/flag-mu.png', mapTop: '62%', mapLeft: '55%', bg: 'rgba(16,87,92,0.75)' },
};
const getCountryMeta = (name) => COUNTRY_META[name] || { code: (name || '??').substring(0, 3).toUpperCase(), flag: '' };
const _fmtVal = (v, sym = '$') => {
    if (v == null || isNaN(v)) return '—';
    if (v >= 1e9) return `${sym}${(v / 1e9).toFixed(1)}B`;
    if (v >= 1e6) return `${sym}${(v / 1e6).toFixed(2)}M`;
    if (v >= 1e3) return `${sym}${(v / 1e3).toFixed(1)}K`;
    if (v === 0) return `${sym}0`;
    return `${sym}${Number(v).toLocaleString()}`;
};
const GTV_BAR_COLORS = ['#10575C', '#2E7CF6', '#C17A28', '#D4A843', '#8B8F94', '#4CB5AE', '#C95B53'];

const buildCountryKpis = (s, rows, fmtVal) => {
    const totalBranches = rows.reduce((a, r) => a + (r.branches || 0), 0);
    const totalAgents = rows.reduce((a, r) => a + (r.agents || 0), 0);
    return [
        { label: 'Franchises', value: String(s.agencyCount || 0), delta: `${rows.length} countr${rows.length !== 1 ? 'ies' : 'y'}`, deltaMuted: true },
        { label: 'Branches', value: String(totalBranches), delta: 'Across network', deltaMuted: true },
        { label: 'Active Agents', value: String(totalAgents || s.totalAgents || 0), delta: totalAgents > 0 ? 'Active' : '—', deltaMuted: true },
        { label: 'GTV (MTD)', value: fmtVal(s.totalRevenue || 0), delta: s.totalRevenue > 0 ? 'Revenue to date' : '—', deltaMuted: true },
        { label: 'Active Listings', value: String(s.activeListings || s.totalListings || 0), delta: s.newListingsLast30 > 0 ? `+${s.newListingsLast30} last 30d` : '—' },
    ];
};

const buildFranchiseKpis = (s, branches, defaults, fmtVal) => {
    const totalBranchAgents = branches.reduce((a, r) => a + (r.agents || 0), 0);
    const totalBranchRev = branches.reduce((a, r) => a + (r.revenue || 0), 0);
    const royaltyRate = (defaults?.branchToFranchise || 0);
    return [
        { label: 'Branches', value: String(branches.length || s.totalBranches || 0), delta: 'Across franchise', deltaMuted: true },
        { label: 'Agents', value: String(totalBranchAgents || s.totalAgents || 0), delta: 'Active', deltaMuted: true },
        { label: 'GTV (MTD)', value: fmtVal(totalBranchRev || s.totalRevenue || 0), delta: totalBranchRev > 0 ? 'Revenue to date' : '—', deltaMuted: true },
        { label: 'Active Listings', value: String(s.activeListings || s.totalListings || 0), delta: '—' },
        { label: 'Royalties Due', value: fmtVal(totalBranchRev * (royaltyRate / 100)), delta: `${royaltyRate}% of GTV` },
    ];
};

const buildBranchKpis = (s, agents, branches, defaults, fmtVal) => {
    const activeAgents = agents.filter(a => a.status === 'active');
    const totalGtv = activeAgents.reduce((a, r) => a + (r.totalSales || 0), 0);
    const commRate = defaults?.branchToFranchise || 0;
    const totalComm = activeAgents.reduce((a, r) => a + ((r.totalSales || 0) * ((r.commissionRate || 0) / 100)), 0);
    return [
        { label: 'Branch Agents', value: String(activeAgents.length), delta: 'Active', deltaMuted: true },
        { label: 'Active Listings', value: String(s.activeListings || s.totalListings || 0), delta: 'Across all branches', deltaMuted: true },
        { label: 'Properties Sold', value: String(s.totalPropertiesSold || 0), delta: s.totalPropertiesSold > 0 ? 'To date' : '—', deltaMuted: true },
        { label: 'Pipeline Leads', value: String(s.totalLeads || 0), delta: s.totalLeads > 0 ? 'Active leads' : '—', deltaMuted: true },
        { label: 'GTV (MTD)', value: fmtVal(totalGtv || s.totalRevenue || 0), delta: totalGtv > 0 ? 'Revenue to date' : '—', deltaMuted: true },
        { label: 'Commission Due (MTD)', value: fmtVal(totalComm), delta: totalComm > 0 ? 'Earned' : '—', deltaTone: 'yellow' },
    ];
};

const kpiDeltaStyle = (k) => {
    const base = { fontSize: FONT_SIZE.kpiDelta, borderRadius: 20, padding: '3px 10px', display: 'inline-block', fontWeight: 600, whiteSpace: 'nowrap' };
    if (k.deltaMuted) {
        return { ...base, color: '#6B7280', background: 'transparent', padding: '3px 0' };
    }
    if (k.danger) {
        return { ...base, color: '#A4260E', background: '#FFCFC5' };
    }
    const tone = k.deltaTone || 'teal';
    if (tone === 'yellow') {
        return { ...base, color: '#8A5F0A', background: 'rgba(231,161,26,0.22)' };
    }
    return { ...base, color: '#10575C', background: '#D2E4E5' };
};

const KpiSection = ({ isMobile, cards, valueColors = {} }) => (
    <section style={{ ...card, padding: 12, marginBottom: GAP.section, background: '#EBEBEB', border: 'none', boxShadow: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : `repeat(${cards.length}, minmax(0,1fr))`, gap: 8 }}>
            {cards.map((k) => (
                <article key={k.label} style={{ background: '#fff', borderRadius: 16, padding: '10px 12px 9px', overflow: 'hidden' }}>
                    <div style={{ fontSize: FONT_SIZE.kpiLabel, color: '#4E4E4E', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
                    <div style={{ fontSize: FONT_SIZE.kpiValue, lineHeight: 1.1, fontWeight: 600, color: valueColors[k.label] || (k.danger ? '#A4260E' : '#10575C'), margin: '6px 0 6px' }}>{k.value}</div>
                    <div style={kpiDeltaStyle(k)}>{k.delta}</div>
                </article>
            ))}
        </div>
    </section>
);

const cardHeading = { margin: 0, fontSize: FONT_SIZE.cardHeading, color: '#8B8F94', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' };

const renderDashboard = (isMobile, data, fmtVal) => {
    const s = data?.summary || {};
    const countries = data?.performanceByCountry || [];
    const agents = (data?.agentRows || []).filter(a => a.status === 'active');
    const totalBranches = countries.reduce((sum, c) => sum + (c.branches || 0), 0);
    const totalGtv = countries.reduce((sum, c) => sum + (c.gtv || 0), 0);
    const maxGtv = Math.max(...countries.map(c => c.gtv || 0), 1);

    const kpis = [
        { label: 'Countries Active', value: String(countries.length) },
        { label: 'Total Franchises', value: String(s.agencyCount || 0) },
        { label: 'Total Listings', value: String(s.totalListings || 0) },
        { label: 'Active Branches', value: String(totalBranches) },
        { label: 'Network Agents', value: String(s.totalAgents || 0) },
        { label: 'Network GTV [MTD]', value: fmtVal(s.totalRevenue || 0) },
        { label: 'Royalties [MTD]', value: s.totalRoyalties ? fmtVal(s.totalRoyalties) : '—' }
    ];

    const mapPins = countries
        .map(c => { const m = getCountryMeta(c.country); return m.mapTop ? { code: m.code, flag: m.flag, top: m.mapTop, left: m.mapLeft, bg: m.bg || 'rgba(16,87,92,0.75)', size: m.mapSize } : null; })
        .filter(Boolean);

    const topAgents = agents.slice(0, 4).map((a, i) => ({
        rank: i + 1, name: a.name || 'Agent', sub: a.franchise || '', gtv: fmtVal(a.totalSales || 0)
    }));

    return (
        <>
            <InsightsBanner text={data?.auraBanners?.dashboard || 'Suggestions based on platform activity...'} />

            <KpiSection isMobile={isMobile} cards={kpis} />

            <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: GAP.section, marginBottom: GAP.section }}>
                {/* Active Markets */}
                <article style={{ ...card, padding: GAP.card, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={cardHeading}>Active Markets</h3>
                    <div style={{
                        marginTop: 10, borderRadius: 10, flex: 1, minHeight: 160, position: 'relative', overflow: 'hidden',
                        background: '#EDF4F2'
                    }}>
                        <img
                            src="https://api.mapbox.com/styles/v1/mapbox/light-v11/static/20,15,0.8,0/480x320@2x?access_token=pk.eyJ1IjoiY29ybmVuYWdlbCIsImEiOiJjbHI0dXJsczQxY3NmMmtudjM4bXF6NjZmIn0.fVUB99qeVRcQYcA3FUGgaw"
                            alt="World map"
                            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', opacity: 0.55 }}
                        />
                        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(16,87,92,0.08) 0%, rgba(16,87,92,0.18) 100%)' }} />
                        {mapPins.map((m) => (
                            <div key={m.code} style={{
                                position: 'absolute', top: m.top, left: m.left,
                                display: 'flex', alignItems: 'center', gap: 6,
                                background: m.bg, backdropFilter: 'blur(4px)', color: '#fff', borderRadius: 20,
                                padding: m.size === 'lg' ? '6px 14px 6px 10px' : '5px 12px 5px 8px',
                                fontSize: m.size === 'lg' ? FONT_SIZE.body : FONT_SIZE.sub, fontWeight: 700, letterSpacing: '0.02em',
                                boxShadow: '0 2px 8px rgba(0,0,0,0.18)', whiteSpace: 'nowrap',
                                zIndex: 2
                            }}>
                                {m.flag && <img src={m.flag} alt="" style={{ width: m.size === 'lg' ? 20 : 16, height: m.size === 'lg' ? 14 : 11, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
                                {m.code}
                            </div>
                        ))}
                    </div>
                </article>

                {/* GTV by Market */}
                <article style={{ ...card, padding: GAP.card, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={cardHeading}>GTV by Market</h3>
                    <div style={{ marginTop: 12, flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 12 }}>
                        {countries.length === 0 ? (
                            <p style={{ color: '#8B8F94', fontSize: FONT_SIZE.sub, textAlign: 'center' }}>No market data yet.</p>
                        ) : countries.map((c, i) => {
                            const meta = getCountryMeta(c.country);
                            const pct = Math.min(100, Math.round(((c.gtv || 0) / maxGtv) * 100));
                            return (
                                <div key={c.country} style={{ display: 'grid', gridTemplateColumns: '62px 1fr 54px', alignItems: 'center', gap: 8 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                        {meta.flag && <img src={meta.flag} alt="" style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
                                        <span style={{ fontSize: FONT_SIZE.body, color: '#060606', fontWeight: 700 }}>{meta.code}</span>
                                    </div>
                                    <div style={{ height: 6, background: '#E8E8E8', borderRadius: 20 }}>
                                        <div style={{ width: `${pct}%`, height: '100%', borderRadius: 20, background: GTV_BAR_COLORS[i % GTV_BAR_COLORS.length] }} />
                                    </div>
                                    <span style={{ color: '#10575C', fontWeight: 700, textAlign: 'right', fontSize: FONT_SIZE.body }}>{fmtVal(c.gtv)}</span>
                                </div>
                            );
                        })}
                    </div>
                    <div style={{ paddingTop: 10, borderTop: '1px solid #E1E1E1', fontSize: FONT_SIZE.sub, color: '#384046', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
                        <span>Total Network GTV — Month to Date</span>
                        <strong style={{ color: '#10575C', fontSize: FONT_SIZE.sectionHeading }}>{fmtVal(totalGtv)}</strong>
                    </div>
                </article>

                {/* Network Alerts */}
                <article style={{ ...card, padding: GAP.card, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, gap: 8 }}>
                        <h3 style={cardHeading}>Network Alerts</h3>
                        {(data?.networkAlerts || []).length > 0 && (
                            <span style={{ background: '#FFCFC5', color: '#A4260E', borderRadius: 20, fontSize: FONT_SIZE.small, padding: '3px 10px', fontWeight: 700 }}>
                                {data.networkAlerts.length} active
                            </span>
                        )}
                    </div>
                    {(data?.networkAlerts || []).length === 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                            <p style={{ color: '#8B8F94', fontSize: FONT_SIZE.sub }}>No alerts at this time.</p>
                        </div>
                    ) : (
                        <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 0, flex: 1 }}>
                            {data.networkAlerts.map((alert, i) => {
                                const isUrgent = alert.tone === 'urgent';
                                const pillBg = isUrgent ? '#FFCFC5' : 'rgba(231,161,26,0.22)';
                                const pillFg = isUrgent ? '#A4260E' : '#8A5F0A';
                                return (
                                    <li key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', padding: '10px 0', borderTop: i ? '1px solid #F1F2F4' : 'none' }}>
                                        <span style={{ background: pillBg, color: pillFg, borderRadius: 20, padding: '2px 9px', fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.02em', whiteSpace: 'nowrap', flexShrink: 0, marginTop: 1 }}>
                                            {alert.label || (isUrgent ? 'Urgent' : 'Action')}
                                        </span>
                                        <span style={{ fontSize: FONT_SIZE.sub, color: '#384046', lineHeight: 1.45 }}>{alert.text}</span>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </article>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: GAP.section }}>
                {/* Royalty Flow Engine */}
                <article style={{ ...card, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h3 style={cardHeading}>Royalty Flow Engine</h3>
                        </div>
                        <div style={{ fontSize: 9, color: '#8B8F94', marginTop: 2 }}>Live fee collection across the hierarchy</div>
                    </div>
                    <div style={{ flex: 1, padding: '0 16px 12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, fontSize: 9, color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', padding: '8px 0 6px', borderBottom: '1px solid #F1F2F4', letterSpacing: '0.02em' }}>
                            <span>Branch → Franchise <span style={{ color: '#C9951C' }}>{(data?.royaltyDefaults?.branchToFranchise ?? 3)}%</span></span>
                            <span>Franchise → Country <span style={{ color: '#C9951C' }}>{(data?.royaltyDefaults?.franchiseToCountry ?? 5)}%</span></span>
                            <span>Country → Global HQ <span style={{ color: '#C9951C' }}>{(data?.royaltyDefaults?.countryToHq ?? 1.5)}%</span></span>
                        </div>
                        {(() => {
                            const royaltyRows = (data?.performanceByFranchise || [])
                                .filter((f) => (f.royalties?.total || 0) > 0)
                                .sort((a, b) => (b.royalties?.total || 0) - (a.royalties?.total || 0))
                                .slice(0, 6);
                            if (royaltyRows.length === 0) {
                                return (
                                    <div style={{ padding: '24px 0', textAlign: 'center', color: '#8B8F94', fontSize: FONT_SIZE.sub }}>
                                        No royalty flow data available yet.
                                    </div>
                                );
                            }
                            return (
                                <div style={{ maxHeight: 220, overflowY: 'auto' }}>
                                    {royaltyRows.map((f) => {
                                        const meta = getCountryMeta(f.country);
                                        return (
                                            <div key={f._id || f.name} style={{ padding: '8px 0', borderBottom: '1px solid #F1F2F4' }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                                    {meta.flag && <img src={meta.flag} alt="" style={{ width: 16, height: 11, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
                                                    <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f.name}</span>
                                                </div>
                                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#C9951C' }}>{fmtVal(f.royalties?.branchToFranchise || 0)}</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#C9951C' }}>{fmtVal(f.royalties?.franchiseToCountry || 0)}</span>
                                                    <span style={{ fontSize: 11, fontWeight: 700, color: '#C9951C' }}>{fmtVal(f.royalties?.countryToHq || 0)}</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            );
                        })()}
                    </div>
                </article>

                {/* Country License Performance */}
                <article style={{ ...card, padding: 0, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                        <h3 style={cardHeading}>Country License Performance</h3>
                    </div>
                    <div style={{ flex: 1, padding: '0 16px 12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, padding: '8px 0 6px', fontSize: 9, color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #F1F2F4', letterSpacing: '0.02em' }}>
                            <span>Country</span>
                            <span style={{ textAlign: 'right', minWidth: 60 }}>GTV MTD</span>
                            <span style={{ textAlign: 'center', minWidth: 55 }}>Compliance</span>
                            <span style={{ textAlign: 'right', minWidth: 50 }}>Royalties</span>
                        </div>
                        {countries.length === 0 ? (
                            <div style={{ padding: '24px 0', textAlign: 'center', color: '#8B8F94', fontSize: FONT_SIZE.sub }}>No country data yet.</div>
                        ) : countries.map((c, i) => {
                            const meta = getCountryMeta(c.country);
                            const barPct = Math.min(100, Math.round(((c.gtv || 0) / maxGtv) * 100));
                            const barColor = GTV_BAR_COLORS[i % GTV_BAR_COLORS.length];
                            return (
                                <div key={meta.code} style={{ padding: '8px 0', borderBottom: '1px solid #F1F2F4', display: 'grid', gridTemplateColumns: '1fr auto auto auto', gap: 10, alignItems: 'center' }}>
                                    <div style={{ minWidth: 0 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                                            {meta.flag && <img src={meta.flag} alt="" style={{ width: 20, height: 14, objectFit: 'cover', borderRadius: 2, flexShrink: 0 }} />}
                                            <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606' }}>{c.country}</span>
                                        </div>
                                        <div style={{ fontSize: 9, color: '#8B8F94', marginTop: 1 }}>
                                            {c.franchises} franchises · {c.branches} branches · {c.agents} agents
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: 60 }}>
                                        <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: '#10575C' }}>{fmtVal(c.gtv)}</div>
                                        <div style={{ height: 4, background: '#E8E8E8', borderRadius: 20, marginTop: 2, width: 55 }}>
                                            <div style={{ width: `${barPct}%`, height: '100%', borderRadius: 20, background: barColor }} />
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'center', minWidth: 55 }}>
                                        <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: c.compliance >= 95 ? '#0F8453' : c.compliance >= 90 ? '#C9951C' : c.compliance != null ? '#A4260E' : '#060606' }}>
                                            {c.compliance != null ? `${c.compliance}%` : '—'}
                                        </div>
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: 50 }}>
                                        <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: '#C9951C' }}>
                                            {c.royaltiesMtd ? fmtVal(c.royaltiesMtd) : '—'}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </article>

                {/* Agent Ranking */}
                <article style={{ ...card, padding: GAP.card, display: 'flex', flexDirection: 'column' }}>
                    <h3 style={cardHeading}>Agent Ranking</h3>
                    <div style={{ marginTop: 8, flex: 1 }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: '4px 8px', fontSize: 9, color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4, padding: '0 2px' }}>
                            <span>#</span><span>Agent</span><span style={{ textAlign: 'right' }}>GTV MTD</span>
                        </div>
                        {topAgents.length === 0 ? (
                            <p style={{ color: '#8B8F94', fontSize: FONT_SIZE.sub, textAlign: 'center', marginTop: 16 }}>No agent data yet.</p>
                        ) : topAgents.map((a) => (
                            <div key={a.rank} style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: '2px 8px', alignItems: 'center', padding: '7px 2px', borderTop: '1px solid #F1F2F4' }}>
                                <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: '#C2C3C3' }}>{a.rank}</span>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.name}</div>
                                    {a.sub && <div style={{ fontSize: 9, color: '#8B8F94', marginTop: 1 }}>{a.sub}</div>}
                                </div>
                                <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: a.rank === 1 ? '#C9951C' : '#10575C', textAlign: 'right' }}>{a.gtv}</span>
                            </div>
                        ))}
                    </div>
                </article>
            </section>
        </>
    );
};

const renderCountry = (isMobile, data, fmtVal) => {
    const s = data?.summary || {};
    const countries = data?.performanceByCountry || [];
    const franchises = data?.performanceByFranchise || [];
    const maxRev = Math.max(...countries.map(c => c.revenue || 0), 1);
    const tones = ['#4CB5AE', '#C7A35A', '#5BB38D', '#A47837', '#C95B53'];
    const franchiseTones = ['#C9951C', '#10575C', '#10B981', '#E8922A', '#D93025', '#4CB5AE', '#C7A35A'];
    const topCountry = countries.length > 0 ? countries[0].country : 'Network';

    return (
    <>
        <InsightsBanner text={data?.auraBanners?.country || 'Suggestions based on platform activity...'} />
        <KpiSection isMobile={isMobile} cards={buildCountryKpis(s, countries, fmtVal)} />

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: GAP.section, marginBottom: GAP.section }}>
            <article style={{ ...card, padding: GAP.card }}>
                <h3 style={sectionHeading}>Province GTV</h3>
                <div style={{ marginTop: GAP.section, display: 'grid', gap: 12, maxHeight: 240, overflowY: 'auto' }}>
                    {countries.map((row, idx) => (
                        <div key={row.country} style={{ display: 'grid', gridTemplateColumns: '70px 1fr 56px', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontSize: FONT_SIZE.body, fontWeight: 600, color: '#384046' }}>{row.country}</span>
                            <div style={{ height: 6, background: '#E6E8EA', borderRadius: 20 }}>
                                <div style={{ width: `${Math.round(((row.revenue || 0) / maxRev) * 100)}%`, height: '100%', borderRadius: 20, background: tones[idx % tones.length] }} />
                            </div>
                            <span style={{ fontSize: FONT_SIZE.body, color: '#10575C', textAlign: 'right', fontWeight: 600 }}>{fmtVal(row.revenue || 0)}</span>
                        </div>
                    ))}
                    {countries.length === 0 && <span style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94' }}>No country data</span>}
                </div>
            </article>

            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <h3 style={sectionHeading}>Franchise Performance</h3>
                    <span style={{ borderRadius: 20, background: '#D2E4E5', color: '#10575C', fontSize: FONT_SIZE.small, fontWeight: 700, padding: '4px 12px' }}>{topCountry}</span>
                </div>
                <div style={{ flex: 1, padding: '0 16px 12px', maxHeight: 280, overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 0.4fr 0.4fr 0.5fr 0.55fr 0.35fr 0.4fr', gap: '0 10px', padding: '8px 0 6px', fontSize: 9, color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #F1F2F4', letterSpacing: '0.02em', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                        <span>Franchise</span><span>Units</span><span>Agents</span><span>GTV</span><span>Performance</span><span>Score</span><span />
                    </div>
                    {franchises.map((row, idx) => {
                        const maxFrRev = Math.max(...franchises.map(f => f.revenue || 0), 1);
                        const perfPct = Math.round(((row.revenue || 0) / maxFrRev) * 100);
                        const tone = franchiseTones[idx % franchiseTones.length];
                        return (
                        <div key={row.name} style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.6fr 0.4fr 0.4fr 0.5fr 0.55fr 0.35fr 0.4fr', alignItems: 'center', gap: '0 10px', padding: '8px 0', borderBottom: '1px solid #F1F2F4' }}>
                            <div>
                                <div style={{ fontSize: FONT_SIZE.sub, color: '#060606', fontWeight: 600 }}>{row.name}</div>
                                <div style={{ fontSize: 9, color: '#8B8F94' }}>{row.country || topCountry}</div>
                            </div>
                            <div style={{ color: '#10575C', fontSize: FONT_SIZE.sub, fontWeight: 600 }}>{row.branches || 0}</div>
                            <div style={{ color: '#10575C', fontSize: FONT_SIZE.sub, fontWeight: 600 }}>{row.agents || 0}</div>
                            <div>
                                <div style={{ color: '#C9951C', fontSize: FONT_SIZE.sub, fontWeight: 700 }}>{fmtVal(row.revenue || 0)}</div>
                            </div>
                            <div style={{ height: 6, background: '#E8E8E8', borderRadius: 20 }}>
                                <div style={{ width: `${perfPct}%`, height: '100%', borderRadius: 20, background: tone }} />
                            </div>
                            <div style={{ color: tone, fontSize: FONT_SIZE.sub, fontWeight: 700 }}>{perfPct}%</div>
                            <button type="button" style={{ background: '#D2E4E5', color: '#10575C', border: 'none', borderRadius: 20, fontSize: 9, fontWeight: 700, padding: '4px 10px', cursor: 'pointer' }}>Drill In</button>
                        </div>
                        );
                    })}
                    {franchises.length === 0 && <div style={{ padding: 12, fontSize: FONT_SIZE.sub, color: '#8B8F94' }}>No franchise data</div>}
                </div>
            </article>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: GAP.section }}>
            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <h3 style={sectionHeading}>Compliance Status</h3>
                    <span style={{ background: '#FFCFC5', color: '#A4260E', borderRadius: 20, fontSize: FONT_SIZE.small, padding: '3px 10px', fontWeight: 700 }}>3 Actions</span>
                </div>
                <div style={{ flex: 1, padding: '0 16px 12px' }}>
                    {[
                        { item: 'FAIS License Compliant', score: '99.2%', color: '#10575C', icon: 'fa-check-circle' },
                        { item: 'FAIS Renewals Overdue', score: '3 agents', color: '#D93025', icon: 'fa-exclamation-circle' },
                        { item: 'Franchise Agreements Active', score: '100%', color: '#10B981', icon: 'fa-check-circle' },
                        { item: 'QI Royalty Status', score: fmtVal(s.totalRoyalties || 0), color: '#C9951C', icon: 'fa-coins' },
                        { item: 'Portal Sync (Property24)', score: '98%', color: '#10575C', icon: 'fa-sync-alt' }
                    ].map((row, idx) => (
                        <div key={row.item} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: FONT_SIZE.sub, padding: '9px 0', borderBottom: '1px solid #F1F2F4' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <i className={`fas ${row.icon}`} style={{ fontSize: 10, color: row.color }} aria-hidden />
                                <span style={{ color: '#384046' }}>{row.item}</span>
                            </div>
                            <span style={{ color: row.color, fontWeight: 700 }}>{row.score}</span>
                        </div>
                    ))}
                </div>
            </article>

            <article style={{ ...card, minHeight: 160 }} />
        </section>
    </>
    );
};

const renderFranchise = (isMobile, data, fmtVal) => {
    const s = data?.summary || {};
    const branches = data?.performanceByBranch || [];
    const agents = (data?.agentRows || []).filter(a => a.status === 'active');
    const defaults = data?.royaltyDefaults || { branchToFranchise: 3 };
    const branchLeaders = [...branches].sort((a, b) => (b.revenue || 0) - (a.revenue || 0));
    const maxBranchRev = Math.max(...branches.map(b => b.revenue || 0), 1);
    const branchTones = ['#10575C', '#10575C', '#C9951C', '#E8922A', '#D93025', '#E8922A', '#4CB5AE'];
    const topFranchise = data?.performanceByFranchise?.[0]?.name || 'Network';

    const grossComm = agents.reduce((a, r) => a + ((r.totalSales || 0) * ((r.commissionRate || 0) / 100)), 0);
    const avgAgentSplit = agents.length > 0 ? Math.round(agents.reduce((a, r) => a + (r.commissionRate || 0), 0) / agents.length) : 0;
    const franchiseRetention = defaults.branchToFranchise || 0;
    const netFranchiseRev = grossComm * (franchiseRetention / 100);

    return (
    <>
        <InsightsBanner text={data?.auraBanners?.franchise || 'Suggestions based on platform activity...'} />
        <KpiSection isMobile={isMobile} cards={buildFranchiseKpis(s, branches, defaults, fmtVal)} valueColors={{ 'Royalties Due': '#E7A11A' }} />

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: GAP.section }}>
            <div style={{ display: 'grid', gap: GAP.section }}>
                <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                        <h3 style={sectionHeading}>Branch Leader Board</h3>
                    </div>
                    <div style={{ flex: 1, padding: '0 16px 12px', maxHeight: 200, overflowY: 'auto' }}>
                        {branchLeaders.map((b, idx) => (
                            <div key={b.branch || idx} style={{ display: 'grid', gridTemplateColumns: '18px 1fr auto', gap: 8, alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F1F2F4' }}>
                                <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: idx < 3 ? '#C9951C' : '#C2C3C3' }}>{idx + 1}</span>
                                <div>
                                    <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606' }}>{b.branch}</div>
                                    <div style={{ fontSize: 9, color: '#8B8F94' }}>{b.agents || 0} agents</div>
                                </div>
                                <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: '#10575C' }}>{fmtVal(b.revenue || 0)}</span>
                            </div>
                        ))}
                        {branchLeaders.length === 0 && <span style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94', padding: '8px 0' }}>No branch data</span>}
                    </div>
                </article>

                <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                        <h3 style={sectionHeading}>Commission Engine</h3>
                        <div style={{ fontSize: 9, color: '#8B8F94', marginTop: 2 }}>Franchise-level commission split</div>
                    </div>
                    <div style={{ flex: 1, padding: '0 16px 12px', maxHeight: 160, overflowY: 'auto' }}>
                        {[
                            { label: 'Franchise retention rate', value: `${franchiseRetention}%`, color: '#10575C' },
                            { label: 'Avg agent split', value: avgAgentSplit > 0 ? `${avgAgentSplit}%` : '—', color: '#C9951C' },
                            { label: 'Gross commissions [MTD]', value: fmtVal(grossComm), color: '#10575C' },
                            { label: 'Net franchise revenue', value: fmtVal(netFranchiseRev), color: '#C9951C' }
                        ].map((r, idx) => (
                            <div key={r.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F1F2F4' }}>
                                <span style={{ fontSize: FONT_SIZE.sub, color: '#384046' }}>{r.label}</span>
                                <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: r.color }}>{r.value}</span>
                            </div>
                        ))}
                    </div>
                </article>
            </div>

            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <h3 style={sectionHeading}>Branch Performance</h3>
                    <span style={{ borderRadius: 20, background: '#D2E4E5', color: '#10575C', fontSize: FONT_SIZE.small, fontWeight: 700, padding: '4px 12px' }}>{topFranchise}</span>
                </div>
                <div style={{ flex: 1, padding: '0 16px 12px', maxHeight: 320, overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.5fr 0.5fr 0.5fr 0.6fr 0.4fr', gap: '0 10px', padding: '8px 0 6px', fontSize: 9, color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #F1F2F4', letterSpacing: '0.02em', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                        <span>Branch</span><span>Agents</span><span>Listings</span><span>GTV</span><span>Performance</span><span>Score</span>
                    </div>
                    {branches.map((row, idx) => {
                        const perfPct = Math.round(((row.revenue || 0) / maxBranchRev) * 100);
                        const tone = branchTones[idx % branchTones.length];
                        return (
                        <div key={row.branch || idx} style={{ display: 'grid', gridTemplateColumns: '1.4fr 0.5fr 0.5fr 0.5fr 0.6fr 0.4fr', alignItems: 'center', gap: '0 10px', padding: '8px 0', borderBottom: '1px solid #F1F2F4' }}>
                            <div>
                                <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606' }}>{row.branch}</div>
                                <div style={{ fontSize: 9, color: '#8B8F94' }}>{row.franchise}</div>
                            </div>
                            <span style={{ fontSize: FONT_SIZE.sub, color: '#10575C', fontWeight: 600 }}>{row.agents || 0}</span>
                            <span style={{ fontSize: FONT_SIZE.sub, color: '#384046' }}>{row.listings || 0}</span>
                            <div>
                                <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: '#C9951C' }}>{fmtVal(row.revenue || 0)}</div>
                            </div>
                            <div style={{ height: 6, background: '#E8E8E8', borderRadius: 20 }}>
                                <div style={{ width: `${perfPct}%`, height: '100%', borderRadius: 20, background: tone }} />
                            </div>
                            <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: tone }}>{perfPct}%</span>
                        </div>
                        );
                    })}
                    {branches.length === 0 && <div style={{ padding: 12, fontSize: FONT_SIZE.sub, color: '#8B8F94' }}>No branch data</div>}
                </div>
            </article>
        </section>
    </>
    );
};

const renderBranch = (isMobile, data, fmtVal) => {
    const s = data?.summary || {};
    const agents = data?.agentRows || [];
    const branches = data?.performanceByBranch || [];
    const defaults = data?.royaltyDefaults || { branchToFranchise: 3 };
    const activeAgents = agents.filter(a => a.status === 'active');
    const totalListings = s.activeListings || s.totalListings || 0;
    const soldCount = s.totalPropertiesSold || 0;
    const topBranch = branches.length > 0 ? branches[0].branch : 'Network';
    const topFranchise = data?.performanceByFranchise?.[0]?.name || 'Enterprise';
    const topCountry = data?.performanceByCountry?.[0]?.country || 'Network';

    const listDistRows = [
        { label: 'Active / Published', value: Math.max(totalListings - soldCount, 0), total: Math.max(totalListings, 1), color: '#10575C' },
        { label: 'Sold (MTD)', value: soldCount, total: Math.max(totalListings, 1), color: '#10B981' },
    ];

    const hierarchy = [
        { level: 'Master Franchisor', name: 'IPM Corp', color: '#10575C', indent: 0 },
        { level: 'Country License', name: topCountry, color: '#10575C', indent: 1 },
        { level: 'Franchise', name: topFranchise, color: '#C9951C', indent: 2 },
        { level: 'Branch', name: topBranch, color: '#C9951C', indent: 3 },
    ];

    return (
    <>
        <InsightsBanner text={data?.auraBanners?.branch || 'Suggestions based on platform activity...'} />
        <KpiSection isMobile={isMobile} cards={buildBranchKpis(s, agents, branches, defaults, fmtVal)} valueColors={{ 'Commission Due (MTD)': '#E7A11A' }} />

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: GAP.section }}>
            <div style={{ display: 'grid', gap: GAP.section }}>
                <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                        <h3 style={sectionHeading}>Listing Distribution</h3>
                        <div style={{ fontSize: 9, color: '#8B8F94', marginTop: 2 }}>Active listings by status</div>
                    </div>
                    <div style={{ flex: 1, padding: '0 16px 12px', maxHeight: 200, overflowY: 'auto' }}>
                        {listDistRows.map((r) => (
                            <div key={r.label} style={{ padding: '8px 0', borderBottom: '1px solid #F1F2F4' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: FONT_SIZE.sub, color: '#384046' }}>{r.label}</span>
                                    <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: r.color }}>{r.value}</span>
                                </div>
                                <div style={{ height: 5, background: '#E8E8E8', borderRadius: 20 }}>
                                    <div style={{ width: `${Math.round((r.value / r.total) * 100)}%`, height: '100%', borderRadius: 20, background: r.color }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </article>

                <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                        <h3 style={sectionHeading}>Reporting Hierarchy</h3>
                    </div>
                    <div style={{ flex: 1, padding: '10px 16px 12px', maxHeight: 220, overflowY: 'auto' }}>
                        {hierarchy.map((r, idx) => (
                            <div key={r.level} style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: r.indent * 14, marginBottom: idx < hierarchy.length - 1 ? 8 : 0 }}>
                                <div style={{ width: 8, height: 8, borderRadius: '50%', background: r.color, flexShrink: 0 }} />
                                <div>
                                    <div style={{ fontSize: 9, color: '#8B8F94', textTransform: 'uppercase', fontWeight: 700 }}>{r.level}</div>
                                    <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606' }}>{r.name}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </div>

            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8', display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center' }}>
                    <h3 style={sectionHeading}>Agent Roster</h3>
                    <span style={{ borderRadius: 20, background: '#D2E4E5', color: '#10575C', fontSize: FONT_SIZE.small, fontWeight: 700, padding: '4px 12px' }}>{topBranch}</span>
                </div>
                <div style={{ flex: 1, padding: '0 16px 12px', maxHeight: 320, overflowY: 'auto' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.5fr 0.5fr 0.5fr 0.6fr 0.35fr', gap: '0 10px', padding: '8px 0 6px', fontSize: 9, color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', borderBottom: '1px solid #F1F2F4', letterSpacing: '0.02em', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                        <span>Agent</span><span>Listings</span><span>Sales</span><span>GTV</span><span>Commission</span><span>Status</span>
                    </div>
                    {agents.map((row) => {
                        const commAmt = (row.totalSales || 0) * ((row.commissionRate || 0) / 100);
                        const statusColor = row.status === 'active' ? '#10B981' : row.status === 'review' ? '#C9951C' : '#6B7280';
                        return (
                        <div key={row.name} style={{ display: 'grid', gridTemplateColumns: '1.5fr 0.5fr 0.5fr 0.5fr 0.6fr 0.35fr', alignItems: 'center', gap: '0 10px', padding: '7px 0', borderBottom: '1px solid #F1F2F4' }}>
                            <div>
                                <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606' }}>{row.name}</div>
                                <div style={{ fontSize: 9, color: '#8B8F94' }}>{row.franchise || row.branch || '—'}</div>
                            </div>
                            <span style={{ fontSize: FONT_SIZE.sub, color: '#384046' }}>{row.listings || 0}</span>
                            <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#10575C' }}>{row.propertiesSold || 0}</span>
                            <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: '#C9951C' }}>{fmtVal(row.totalSales || 0)}</span>
                            <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#10575C' }}>{fmtVal(commAmt)}</span>
                            <span style={{ fontSize: 9, fontWeight: 700, color: statusColor, background: statusColor + '18', borderRadius: 20, padding: '2px 8px', textAlign: 'center' }}>{row.status || '—'}</span>
                        </div>
                        );
                    })}
                    {agents.length === 0 && <div style={{ padding: 12, fontSize: FONT_SIZE.sub, color: '#8B8F94' }}>No agent data</div>}
                </div>
            </article>
        </section>
    </>
    );
};

const renderRoyalty = (isMobile, data, fmtVal) => {
    const s = data?.summary || {};
    const franchises = data?.performanceByFranchise || [];
    const branches = data?.performanceByBranch || [];
    const agents = (data?.agentRows || []).filter(a => a.status === 'active');
    const defaults = data?.royaltyDefaults || { branchToFranchise: 3, franchiseToCountry: 5, countryToHq: 1.5 };

    const totalRoyalties = s.totalRoyalties || 0;
    const topMarket = franchises.length > 0 ? franchises[0] : null;
    const topMarketRoyalty = topMarket ? (topMarket.royalties?.total || 0) : 0;
    const monthly = data?.monthlyRoyalties || [];

    const commRows = agents.slice(0, 8).map((a) => {
        const pct = a.commissionRate || 0;
        const gross = (a.totalSales || 0) * (pct / 100);
        const retention = gross * (defaults.branchToFranchise / 100);
        const net = gross - retention;
        return { ...a, pct, gross, retention, net };
    });
    const totalPayouts = commRows.reduce((sum, r) => sum + r.net, 0);

    return (
        <>
            <InsightsBanner text={data?.auraBanners?.royalty || 'Suggestions based on platform activity...'} />

            <section style={{ ...card, padding: 12, marginBottom: GAP.section, background: '#EBEBEB', border: 'none', boxShadow: 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 8 }}>
                    <article style={{ background: '#fff', borderRadius: 16, padding: '10px 12px 9px', overflow: 'hidden' }}>
                        <div style={{ fontSize: FONT_SIZE.kpiLabel, color: '#4E4E4E', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>Total Royalties [MTD]</div>
                        <div style={{ fontSize: FONT_SIZE.kpiValue, lineHeight: 1.1, fontWeight: 600, color: '#10575C', margin: '6px 0 6px' }}>{fmtVal(totalRoyalties)}</div>
                        <div style={kpiDeltaStyle({})}>{franchises.length} franchise{franchises.length !== 1 ? 's' : ''} contributing</div>
                    </article>
                    <article style={{ background: '#fff', borderRadius: 16, padding: '10px 12px 9px', overflow: 'hidden' }}>
                        <div style={{ fontSize: FONT_SIZE.kpiLabel, color: '#4E4E4E', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>Largest Single Market</div>
                        <div style={{ fontSize: FONT_SIZE.kpiValue, lineHeight: 1.1, fontWeight: 600, color: '#10575C', margin: '6px 0 6px' }}>{topMarket ? fmtVal(topMarketRoyalty) : '—'}</div>
                        <div style={kpiDeltaStyle({ deltaMuted: true })}>{topMarket?.name || '—'}</div>
                    </article>
                    <article style={{ background: '#fff', borderRadius: 16, padding: '10px 12px 9px', overflow: 'hidden' }}>
                        <div style={{ fontSize: FONT_SIZE.kpiLabel, color: '#4E4E4E', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap' }}>Royalties by Month</div>
                        {(() => {
                            const maxVal = Math.max(...monthly.map((m) => m.royalty), 1);
                            const totalMonthly = monthly.reduce((s, m) => s + m.royalty, 0);
                            return (
                                <>
                                    <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 4, marginTop: 6, height: 48 }}>
                                        {monthly.map((m, i) => {
                                            const pct = m.royalty > 0 ? Math.max((m.royalty / maxVal) * 100, 6) : 6;
                                            const isLast = i === monthly.length - 1;
                                            return (
                                                <div key={`${m.month}-${m.year}`} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                                                    <div style={{ width: '100%', maxWidth: 28, height: `${pct}%`, minHeight: 4, borderRadius: 3, background: isLast ? '#C9951C' : '#D5D7DB' }} />
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                                        {monthly.map((m) => (
                                            <div key={`${m.month}-${m.year}-lbl`} style={{ flex: 1, textAlign: 'center', fontSize: 7, fontWeight: 600, color: '#8B8F94', textTransform: 'uppercase' }}>{m.month}</div>
                                        ))}
                                    </div>
                                    <div style={{ textAlign: 'center', marginTop: 2, fontSize: 11, fontWeight: 700, color: '#C9951C' }}>{fmtVal(totalMonthly)}</div>
                                </>
                            );
                        })()}
                    </article>
                </div>
            </section>

            <article style={{ ...card, padding: GAP.card, marginBottom: GAP.section }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: GAP.section }}>
                    <h3 style={sectionHeading}>Live Royalty Flow</h3>
                    <span style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94', fontWeight: 600 }}>Branch {defaults.branchToFranchise}% → Franchise {defaults.franchiseToCountry}% → Country {defaults.countryToHq}% → Global HQ</span>
                </div>
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 180 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT_SIZE.tableBody, minWidth: isMobile ? 0 : 700 }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                            <tr style={{ borderBottom: '2px solid #E1E1E1' }}>
                                {[
                                    '', `Branch → Franchise (${defaults.branchToFranchise}%)`,
                                    '', `Franchise → Country (${defaults.franchiseToCountry}%)`,
                                    '', `Country → Global HQ (${defaults.countryToHq}%)`
                                ].map((h, i) => (
                                    <th key={i} style={{ textAlign: 'left', padding: '8px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', fontSize: FONT_SIZE.tableHeader, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {franchises.length === 0 ? (
                                <tr><td colSpan={6} style={{ padding: 18, textAlign: 'center', color: '#8B8F94', fontSize: FONT_SIZE.sub }}>No franchise data yet.</td></tr>
                            ) : franchises.map((f) => {
                                const rates = f.royaltyRates || defaults;
                                const royalties = f.royalties || {};
                                return (
                                    <tr key={f._id} style={{ borderBottom: '1px solid #F1F2F4' }}>
                                        <td style={{ padding: '10px 8px' }}>
                                            <div style={{ fontWeight: 600, color: '#060606' }}>{f.name}</div>
                                            <div style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94' }}>{f.location || '—'}</div>
                                        </td>
                                        <td style={{ padding: '10px 8px', color: '#C9951C', fontWeight: 700 }}>{fmtVal(royalties.branchToFranchise)}</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <div style={{ fontWeight: 600, color: '#060606' }}>{f.name}</div>
                                            <div style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94' }}>{rates.branchToFranchise !== defaults.branchToFranchise ? `Custom: ${rates.branchToFranchise}%` : 'Default rate'}</div>
                                        </td>
                                        <td style={{ padding: '10px 8px', color: '#C9951C', fontWeight: 700 }}>{fmtVal(royalties.franchiseToCountry)}</td>
                                        <td style={{ padding: '10px 8px' }}>
                                            <div style={{ fontWeight: 600, color: '#060606' }}>Global HQ</div>
                                            <div style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94' }}>Enterprise</div>
                                        </td>
                                        <td style={{ padding: '10px 8px', color: '#C9951C', fontWeight: 700 }}>{fmtVal(royalties.countryToHq)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </article>

            <article style={{ ...card, padding: GAP.card }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: GAP.section }}>
                    <h3 style={sectionHeading}>Commission Engine</h3>
                    <span style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94', fontWeight: 600 }}>{totalPayouts > 0 ? `${fmtVal(totalPayouts)} total payouts` : '—'}</span>
                </div>
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 180 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 740, fontSize: FONT_SIZE.tableBody }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                            <tr style={{ borderBottom: '2px solid #E1E1E1' }}>
                                {['Agent', 'GTV MTD', 'Commission %', 'Gross payout', 'Franchise retention', 'Net agent payout', 'Status'].map((h) => (
                                    <th key={h} style={{ textAlign: 'left', padding: '8px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', fontSize: FONT_SIZE.tableHeader }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {commRows.length === 0 ? (
                                <tr><td colSpan={7} style={{ padding: 18, textAlign: 'center', color: '#8B8F94', fontSize: FONT_SIZE.sub }}>No agent commission data yet.</td></tr>
                            ) : commRows.map((row) => (
                                <tr key={row._id || row.name} style={{ borderBottom: '1px solid #F1F2F4' }}>
                                    <td style={{ padding: '10px 8px', verticalAlign: 'middle' }}>
                                        <div style={{ fontWeight: 600, color: '#060606' }}>{row.name}</div>
                                        <div style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94' }}>{row.tier} tier · {row.franchise || '—'}</div>
                                    </td>
                                    <td style={{ padding: '10px 8px', color: '#C9951C', fontWeight: 700 }}>{fmtVal(row.totalSales)}</td>
                                    <td style={{ padding: '10px 8px', color: '#384046' }}>{row.pct > 0 ? `${row.pct}%` : '—'}</td>
                                    <td style={{ padding: '10px 8px', color: '#384046', fontWeight: 600 }}>{row.pct > 0 ? fmtVal(row.gross) : '—'}</td>
                                    <td style={{ padding: '10px 8px', color: '#384046' }}>{row.pct > 0 ? fmtVal(row.retention) : '—'}</td>
                                    <td style={{ padding: '10px 8px', color: '#10575C', fontWeight: 700 }}>{row.pct > 0 ? fmtVal(row.net) : '—'}</td>
                                    <td style={{ padding: '10px 8px' }}>
                                        <span style={{
                                            display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: FONT_SIZE.button, fontWeight: 700,
                                            background: row.pct > 0 ? '#D2E4E5' : 'rgba(200,120,20,0.18)',
                                            color: row.pct > 0 ? '#10575C' : '#A65F0A'
                                        }}>
                                            {row.pct > 0 ? 'Active' : 'No rate set'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </article>
        </>
    );
};

const complianceKpis = [
    { label: 'Critical Issues', value: '3', delta: 'Require immediate action', variant: 'danger' },
    { label: 'Smart Vault Reviews [MTD]', value: '38', delta: '+4 risk flags extracted', variant: 'teal' },
    { label: 'GDPR Compliance', value: '100%', delta: 'NL + UK', variant: 'muted' },
    { label: 'Overall Network Score', value: '87%', delta: '+3 this month', variant: 'teal' }
];

const complianceKpiPill = (variant) => {
    const base = { fontSize: FONT_SIZE.kpiDelta, borderRadius: 20, padding: '3px 10px', display: 'inline-block', fontWeight: 600, whiteSpace: 'nowrap' };
    if (variant === 'danger') return { ...base, color: '#A4260E', background: '#FFCFC5' };
    if (variant === 'teal') return { ...base, color: '#10575C', background: '#D2E4E5' };
    return { ...base, color: '#6B7280', background: 'rgba(107,114,128,0.12)' };
};

const criticalIssues = [
    { who: 'James Okonkwo — Dubai Marina', issue: 'FAIS licence overdue', action: 'Resolve' },
    { who: 'Sarah Joubert — Cape Town', issue: 'Trust account audit pending', action: 'Remind' },
    { who: 'RE/MAX NL Central', issue: 'AML doc pack incomplete', action: 'Submit' }
];

const complianceByMarket = [
    { code: 'USA', label: 'USA', pct: 78 },
    { code: 'UAE', label: 'UAE', pct: 88 },
    { code: 'UK', label: 'UK', pct: 93 },
    { code: 'SA', label: 'SA', pct: 85 },
    { code: 'NL', label: 'NL', pct: 91 }
];

const vaultReviewRows = [
    { doc: 'Mandate — Atlantic Seaboard', market: 'ZA', status: 'clear', flags: 0, reviewed: '12 Apr 2026' },
    { doc: 'Buyer KYC — Palm Jumeirah', market: 'AE', status: 'flag', flags: 1, reviewed: '11 Apr 2026' },
    { doc: 'Franchise addendum v3', market: 'NL', status: 'clear', flags: 0, reviewed: '10 Apr 2026' },
    { doc: 'POA — Notarised scan', market: 'UK', status: 'flag', flags: 2, reviewed: '09 Apr 2026' }
];

const regulatoryFrameworks = [
    { name: 'GDPR (EU)', detail: 'Active', tone: 'ok' },
    { name: 'FICA (South Africa)', detail: 'Active', tone: 'ok' },
    { name: 'RERA (UAE)', detail: 'Active', tone: 'ok' },
    { name: 'NVM (Netherlands)', detail: '6 pending', tone: 'warn' },
    { name: 'eIDAS (eSignature)', detail: 'Active', tone: 'ok' }
];

const renderCompliance = (isMobile, data) => {
    const c = data?.compliance || {};
    const kpis = c.kpis || complianceKpis;
    const issues = c.criticalIssues || criticalIssues;
    const byMarket = c.byMarket || complianceByMarket;
    const vaultRows = c.vaultReviews || vaultReviewRows;
    const frameworks = c.frameworks || regulatoryFrameworks;
    const criticalCount = issues.filter((i) => /resolve|submit/i.test(i.action || '')).length || issues.length;
    return (
    <>
        <InsightsBanner text={data?.auraBanners?.compliance || 'Suggestions based on platform activity, vault signals, and regulatory calendars.'} />

        <section style={{ ...card, padding: 12, marginBottom: GAP.section, background: '#EBEBEB', border: 'none', boxShadow: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 8 }}>
                {kpis.map((k) => (
                    <article key={k.label} style={{ background: '#fff', borderRadius: 16, padding: '10px 12px 9px', overflow: 'hidden' }}>
                        <div style={{ fontSize: FONT_SIZE.kpiLabel, color: '#4E4E4E', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
                        <div style={{ fontSize: FONT_SIZE.kpiValue, lineHeight: 1.1, fontWeight: 600, color: k.variant === 'danger' ? '#A4260E' : '#10575C', margin: '6px 0 6px' }}>{k.value}</div>
                        <div style={complianceKpiPill(k.variant)}>{k.delta}</div>
                    </article>
                ))}
            </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: GAP.section, marginBottom: GAP.section }}>
            <article style={{ ...card, padding: GAP.card }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: GAP.section }}>
                    <h2 style={sectionHeading}>Critical compliance issues</h2>
                    <span style={{ background: '#FFCFC5', color: '#A4260E', borderRadius: 20, fontSize: FONT_SIZE.button, fontWeight: 700, padding: '5px 14px', whiteSpace: 'nowrap' }}>{criticalCount} Critical</span>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }}>
                    {issues.map((row, idx) => (
                        <li key={row.who} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 0', borderTop: idx ? '1px solid #F1F2F4' : 'none', fontSize: FONT_SIZE.body }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontWeight: 600, color: '#060606' }}>{row.who}</div>
                                <div style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94', marginTop: 4 }}>{row.issue}</div>
                            </div>
                            <button type="button" style={{ background: 'none', border: 'none', color: '#A4260E', fontWeight: 700, fontSize: FONT_SIZE.body, cursor: 'pointer', padding: 0 }}>{row.action}</button>
                        </li>
                    ))}
                </ul>
            </article>

            <article style={{ ...card, padding: GAP.card }}>
                <h2 style={{ ...sectionHeading, marginBottom: GAP.section }}>Compliance by market</h2>
                <div style={{ display: 'grid', gap: 12 }}>
                    {byMarket.map((m) => (
                        <div key={m.code} style={{ display: 'grid', gridTemplateColumns: '92px 1fr 44px', alignItems: 'center', gap: 12 }}>
                            <span style={{ fontSize: FONT_SIZE.body, fontWeight: 600, color: '#384046' }}>{m.label}</span>
                            <div style={{ height: 6, background: '#ECEEF2', borderRadius: 20, overflow: 'hidden' }}>
                                <div style={{ width: `${m.pct}%`, height: '100%', borderRadius: 20, background: 'linear-gradient(90deg, #10575C, #1a7a80)' }} />
                            </div>
                            <span style={{ fontSize: FONT_SIZE.body, fontWeight: 700, color: '#10575C', textAlign: 'right' }}>{m.pct}%</span>
                        </div>
                    ))}
                </div>
            </article>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: GAP.section }}>
            <article style={{ ...card, padding: GAP.card }}>
                <h2 style={{ ...sectionHeading, marginBottom: GAP.section }}>Smart Vault contract reviews [MTD]</h2>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT_SIZE.tableBody, minWidth: isMobile ? 0 : 440 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #E1E1E1' }}>
                                {['Document', 'Market', 'Status', 'Flags', 'Reviewed'].map((h) => (
                                    <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', fontSize: FONT_SIZE.tableHeader }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {vaultRows.map((r) => (
                                <tr key={r.doc} style={{ borderBottom: '1px solid #F1F2F4' }}>
                                    <td style={{ padding: '12px 8px', color: '#060606', fontWeight: 600, maxWidth: 200 }}>{r.doc}</td>
                                    <td style={{ padding: '12px 8px', color: '#384046' }}>{r.market}</td>
                                    <td style={{ padding: '12px 8px' }}>
                                        {r.status === 'clear'
                                            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: '#D2E4E5', color: '#10575C', fontWeight: 700, fontSize: FONT_SIZE.button }}><i className="fas fa-check" style={{ fontSize: 10 }} aria-hidden /> Clear</span>
                                            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', borderRadius: 20, background: 'rgba(180,100,20,0.16)', color: '#A65F0A', fontWeight: 700, fontSize: FONT_SIZE.button }}><i className="fas fa-exclamation" style={{ fontSize: 10 }} aria-hidden /> Flag</span>
                                        }
                                    </td>
                                    <td style={{ padding: '12px 8px', color: '#384046', fontWeight: 600 }}>{r.flags}</td>
                                    <td style={{ padding: '12px 8px', color: '#8B8F94', whiteSpace: 'nowrap' }}>{r.reviewed}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </article>

            <article style={{ ...card, padding: GAP.card }}>
                <h2 style={{ ...sectionHeading, marginBottom: GAP.section }}>Active regulatory frameworks</h2>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }}>
                    {frameworks.map((f, idx) => (
                        <li key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderTop: idx ? '1px solid #F1F2F4' : 'none', fontSize: FONT_SIZE.body }}>
                            <span style={{ fontWeight: 600, color: '#060606' }}>{f.name}</span>
                            {f.tone === 'ok'
                                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10575C', fontWeight: 700, fontSize: FONT_SIZE.body }}><i className="fas fa-check-circle" aria-hidden /> {f.detail || 'Active'}</span>
                                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#A65F0A', fontWeight: 700, fontSize: FONT_SIZE.body }}><i className="fas fa-exclamation-triangle" aria-hidden /> {f.detail}</span>
                            }
                        </li>
                    ))}
                </ul>
            </article>
        </section>
    </>
    );
};

const portalKpis = [
    { label: 'Total Listings Live', value: '4,294', delta: '+8 new today', variant: 'teal' },
    { label: 'Pending Sync', value: '18', delta: 'Action required', variant: 'danger' },
    { label: 'Portals Active', value: '18', delta: 'Across 5 countries', variant: 'teal' },
    { label: 'IPM Intelligence [MTD]', value: '847', delta: '8 sec/listing', variant: 'teal' }
];

const portalStatusRows = [
    { portal: 'Property Finder', listings: '1,842', status: 'live' },
    { portal: 'Bayut', listings: '1,204', status: 'syncing' },
    { portal: 'Dubizzle', listings: '892', status: 'live' },
    { portal: 'Rightmove', listings: '624', status: 'pending' },
    { portal: 'Funda', listings: '412', status: 'live' },
    { portal: 'Zillow / Opendoor feed', listings: '320', status: 'syncing' }
];

const portalPendingActions = [
    { portal: 'Bayut', detail: 'RERA documents required to publish', action: 'Resolve', tone: 'danger' },
    { portal: 'Rightmove', detail: 'Floor plan required for UK compliance', action: 'Upload', tone: 'warn' },
    { portal: 'Funda', detail: 'NVM description template incomplete', action: 'Complete', tone: 'warn' }
];

const portalListingsByMarket = [
    { market: 'South Africa', code: 'ZA', count: 1284 },
    { market: 'UAE', code: 'AE', count: 1102 },
    { market: 'United Kingdom', code: 'UK', count: 892 },
    { market: 'Netherlands', code: 'NL', count: 644 },
    { market: 'USA', code: 'US', count: 374 }
];

const portalAiFeatures = [
    { label: 'AI copy generation', badge: 'Active', kind: 'status' },
    { label: 'Virtual staging ready', badge: null, kind: 'action', actionLabel: 'Stage All' },
    { label: 'IPM Score\u2122 attached', badge: 'Live', kind: 'status' },
    { label: 'Multi-language auto-translate', badge: 'Active', kind: 'status' }
];

const portalStatusPill = (status) => {
    if (status === 'live') return { label: 'Live', bg: '#D2E4E5', color: '#10575C' };
    if (status === 'syncing') return { label: 'Syncing', bg: 'rgba(200,120,20,0.18)', color: '#A65F0A' };
    return { label: 'Pending', bg: 'rgba(107,114,128,0.16)', color: '#4B5563' };
};

const renderPortalSyndication = (isMobile, data) => {
    const p = data?.portal || {};
    const kpiCards = p.kpis || portalKpis;
    const portals = p.portals || portalStatusRows;
    const pendingActions = p.pendingActions || portalPendingActions;
    const listingsByMarket = p.byMarket || portalListingsByMarket;
    const aiFeatures = p.aiFeatures || portalAiFeatures;
    const maxListings = Math.max(...listingsByMarket.map((m) => m.count || 0), 1);
    const pendingCount = pendingActions.reduce((sum, a) => {
        const match = (a.detail || '').match(/(\d+)\s+(?:UAE|UK|Japanese|listings)/i);
        return sum + (match ? parseInt(match[1], 10) : 1);
    }, 0);
    return (
        <>
            <InsightsBanner text={data?.auraBanners?.portal || 'Suggestions based on platform activity, portal health, and syndication queues.'} />

            <section style={{ ...card, padding: 12, marginBottom: GAP.section, background: '#EBEBEB', border: 'none', boxShadow: 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 8 }}>
                    {kpiCards.map((k) => (
                        <article key={k.label} style={{ background: '#fff', borderRadius: 16, padding: '10px 12px 9px', overflow: 'hidden' }}>
                            <div style={{ fontSize: FONT_SIZE.kpiLabel, color: '#4E4E4E', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
                            <div style={{ fontSize: FONT_SIZE.kpiValue, lineHeight: 1.1, fontWeight: 600, color: k.variant === 'danger' ? '#A4260E' : '#10575C', margin: '6px 0 6px' }}>{k.value}</div>
                            <div style={complianceKpiPill(k.variant)}>{k.delta}</div>
                        </article>
                    ))}
                </div>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: GAP.section, marginBottom: GAP.section }}>
                <article style={{ ...card, padding: GAP.card }}>
                    <h2 style={{ ...sectionHeading, marginBottom: GAP.section }}>Portal status — all markets</h2>
                    <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT_SIZE.tableBody, minWidth: isMobile ? 0 : 360 }}>
                            <thead>
                                <tr style={{ borderBottom: '2px solid #E1E1E1' }}>
                                    <th style={{ textAlign: 'left', padding: '10px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', fontSize: FONT_SIZE.tableHeader }}>Portal</th>
                                    {portals[0] && portals[0].market !== undefined && (
                                        <th style={{ textAlign: 'left', padding: '10px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', fontSize: FONT_SIZE.tableHeader }}>Market</th>
                                    )}
                                    <th style={{ textAlign: 'right', padding: '10px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', fontSize: FONT_SIZE.tableHeader }}>Listings</th>
                                    <th style={{ textAlign: 'right', padding: '10px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', fontSize: FONT_SIZE.tableHeader }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portals.map((row) => {
                                    const pill = portalStatusPill(row.status);
                                    const listingsLabel = typeof row.listings === 'number' ? row.listings.toLocaleString() : row.listings;
                                    return (
                                        <tr key={row.portal} style={{ borderBottom: '1px solid #F1F2F4' }}>
                                            <td style={{ padding: '12px 8px', fontWeight: 600, color: '#060606' }}>{row.portal}</td>
                                            {row.market !== undefined && (
                                                <td style={{ padding: '12px 8px', color: '#384046' }}>{row.market}</td>
                                            )}
                                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#384046' }}>{listingsLabel}</td>
                                            <td style={{ padding: '12px 8px', textAlign: 'right' }}>
                                                <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: FONT_SIZE.button, fontWeight: 700, background: pill.bg, color: pill.color }}>{pill.label}</span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </article>

                <article style={{ ...card, padding: GAP.card }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: GAP.section }}>
                        <h2 style={sectionHeading}>Pending actions</h2>
                        <span style={{ background: '#FFCFC5', color: '#A4260E', borderRadius: 20, fontSize: FONT_SIZE.button, fontWeight: 700, padding: '5px 14px', whiteSpace: 'nowrap' }}>{pendingCount} pending</span>
                    </div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }}>
                        {pendingActions.map((row, idx) => (
                            <li key={row.portal} style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '14px 0', borderTop: idx ? '1px solid #F1F2F4' : 'none', fontSize: FONT_SIZE.body }}>
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 700, color: '#10575C' }}>{row.portal}</div>
                                    <div style={{ fontSize: FONT_SIZE.body, color: '#8B8F94', marginTop: 4 }}>{row.detail}</div>
                                </div>
                                <button type="button" style={{ border: 'none', borderRadius: 20, padding: '7px 16px', fontSize: FONT_SIZE.body, fontWeight: 700, cursor: 'pointer', background: row.tone === 'danger' ? '#A4260E' : '#10575C', color: '#fff' }}>{row.action}</button>
                            </li>
                        ))}
                    </ul>
                </article>
            </section>

            <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: GAP.section }}>
                <article style={{ ...card, padding: GAP.card }}>
                    <h2 style={{ ...sectionHeading, marginBottom: GAP.section }}>Listings by market</h2>
                    <div style={{ display: 'grid', gap: 12 }}>
                        {listingsByMarket.map((m) => (
                            <div key={m.code} style={{ display: 'grid', gridTemplateColumns: '30px 1fr minmax(0,1fr) 56px', alignItems: 'center', gap: 12 }}>
                                <span style={{ fontSize: FONT_SIZE.button, fontWeight: 800, color: '#10575C', textAlign: 'center' }}>{m.code}</span>
                                <span style={{ fontSize: FONT_SIZE.body, fontWeight: 600, color: '#384046', minWidth: 0 }}>{m.market}</span>
                                <div style={{ height: 6, background: '#ECEEF2', borderRadius: 20, overflow: 'hidden', minWidth: 0 }}>
                                    <div style={{ width: `${Math.round((m.count / maxListings) * 100)}%`, height: '100%', borderRadius: 20, background: 'linear-gradient(90deg, #10575C, #1a7a80)' }} />
                                </div>
                                <span style={{ fontSize: FONT_SIZE.body, fontWeight: 700, color: '#10575C', textAlign: 'right' }}>{m.count.toLocaleString()}</span>
                            </div>
                        ))}
                    </div>
                </article>

                <article style={{ ...card, padding: GAP.card }}>
                    <h2 style={{ ...sectionHeading, marginBottom: GAP.section }}>AI listing features</h2>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }}>
                        {aiFeatures.map((f, idx) => (
                            <li key={f.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderTop: idx ? '1px solid #F1F2F4' : 'none', fontSize: FONT_SIZE.body }}>
                                <span style={{ fontWeight: 600, color: '#060606' }}>{f.label}</span>
                                {f.kind === 'action'
                                    ? <button type="button" style={{ border: '2px solid #10575C', borderRadius: 20, padding: '6px 14px', fontSize: FONT_SIZE.button, fontWeight: 700, cursor: 'pointer', background: '#fff', color: '#10575C' }}>{f.actionLabel}</button>
                                    : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 12px', borderRadius: 20, background: '#D2E4E5', color: '#10575C', fontWeight: 700, fontSize: FONT_SIZE.button }}>
                                        {f.badge === 'Live' ? <><i className="fas fa-broadcast-tower" style={{ fontSize: 10 }} aria-hidden /> {f.badge}</> : f.badge}
                                    </span>
                                }
                            </li>
                        ))}
                    </ul>
                </article>
            </section>
        </>
    );
};

const PLATFORM_META = {
    facebook: { label: 'Facebook', icon: 'fa-facebook-f', color: '#1877F2', bg: '#1877F2' },
    instagram: { label: 'Instagram', icon: 'fa-instagram', color: '#E4405F', bg: 'linear-gradient(135deg,#f58529,#dd2a7b,#8134af)' },
    x: { label: 'X', icon: 'fa-x-twitter', color: '#000', bg: '#000' },
    linkedin: { label: 'LinkedIn', icon: 'fa-linkedin-in', color: '#0A66C2', bg: '#0A66C2' },
    tiktok: { label: 'TikTok', icon: 'fa-tiktok', color: '#000', bg: '#000' },
    youtube: { label: 'YouTube', icon: 'fa-youtube', color: '#FF0000', bg: '#FF0000' },
    pinterest: { label: 'Pinterest', icon: 'fa-pinterest-p', color: '#BD081C', bg: '#BD081C' },
    threads: { label: 'Threads', icon: 'fa-threads', color: '#000', bg: '#000' },
    bluesky: { label: 'Bluesky', icon: 'fa-cloud', color: '#0085FF', bg: '#0085FF' },
    google_business: { label: 'Google Business', icon: 'fa-google', color: '#4285F4', bg: '#4285F4' },
};

const getWeekDays = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return days.map((day, i) => {
        const d = new Date(monday);
        d.setDate(monday.getDate() + i);
        return { day, date: String(d.getDate()), slots: [] };
    });
};

const getWeekLabel = () => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7));
    return `Week of ${monday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;
};

const renderEnterpriseMarketing = (isMobile, mktState, data) => {
    const {
        accounts: liveAccounts = [],
        networks = [],
        showPicker,
        setShowPicker,
        onConnectPlatform,
        onDisconnect,
        connectingPlatform,
        onSyncAccounts,
        onMockConnect,
        syncBusy,
        syncMessage,
        onDismissSyncMessage,
        summary,
        scheduledRows,
        composer,
        onOpenComposer,
        onCloseComposer,
        onSavePost,
        onDeletePost,
        selectedPost,
        onSelectPost,
        onClosePost,
    } = mktState;
    // Three possible data sources for the marketing tab:
    //   1. data.marketing — admin demo fixture (canned)
    //   2. summary — server-derived numbers built from the user's listings
    //      (returned alongside connected accounts whenever they have any)
    //   3. neither — show "—" placeholders and the connect call-to-action.
    const m = data?.marketing || null;
    const demoMode = !!m;
    const live = !demoMode && summary ? summary : null;

    const accounts = demoMode ? (m.accounts || []) : liveAccounts;
    const kpiCards = demoMode
        ? (m.kpis || [])
        : (live?.kpis || [
            { label: 'Reach', value: '—', delta: liveAccounts.length > 0 ? 'From connected accounts' : 'Connect accounts to track', variant: liveAccounts.length > 0 ? 'teal' : 'muted' },
            { label: 'Engagement rate', value: '—', delta: liveAccounts.length > 0 ? 'Across platforms' : '—', variant: liveAccounts.length > 0 ? 'teal' : 'muted' },
            { label: 'Link clicks', value: '—', delta: liveAccounts.length > 0 ? 'Tracked via Outstand' : '—', variant: liveAccounts.length > 0 ? 'teal' : 'muted' },
            { label: 'Lead inquiries', value: '—', delta: liveAccounts.length > 0 ? 'From social channels' : '—', variant: liveAccounts.length > 0 ? 'teal' : 'muted' },
        ]);
    const recentPosts = demoMode ? (m.recentPosts || []) : (live?.recentPosts || []);
    const calendarDays = demoMode ? (m.calendar || getWeekDays()) : (live?.calendar || getWeekDays());
    const calendarLabel = demoMode ? (m.calendarLabel || getWeekLabel()) : (live?.calendarLabel || getWeekLabel());
    // Scheduled rows: prefer the user-editable list when we have one, fall
    // back to the server-generated calendar for first paint.
    const contentCalendar = demoMode
        ? (m.contentCalendar || [])
        : (Array.isArray(scheduledRows) && scheduledRows.length
            ? scheduledRows
            : (live?.contentCalendar || []));
    // Whether this user can compose / edit posts. Disabled only when the
    // marketing tab is being driven by an admin demo fixture (no handlers).
    const canCompose = !demoMode && typeof onOpenComposer === 'function';
    const statusOptions = ['Scheduled', 'Draft', 'Approval', 'Posted'];
    const composerProperties = (live?.properties || []);
    const composerAccounts = Array.isArray(liveAccounts) ? liveAccounts : [];

    return (
    <>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <InsightsBanner text={data?.auraBanners?.marketing || 'Suggestions based on platform activity, campaign performance, and content gaps.'} />
            </div>
            {canCompose && (
                <button
                    type="button"
                    onClick={() => onOpenComposer('create')}
                    title="Compose a new post"
                    style={{
                        flexShrink: 0, height: 44, padding: '0 18px', borderRadius: 22,
                        background: '#10575C', color: '#fff', border: 'none', cursor: 'pointer',
                        fontFamily: FONT, fontSize: FONT_SIZE.body, fontWeight: 700,
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        boxShadow: '0 6px 16px rgba(16,87,92,0.25)',
                    }}
                >
                    <i className="fas fa-plus" style={{ fontSize: 12 }} aria-hidden /> New post
                </button>
            )}
        </div>

        <section style={{ ...card, padding: 8, marginBottom: 10, background: '#EBEBEB', border: 'none', boxShadow: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 6 }}>
                {kpiCards.map((k) => (
                    <article key={k.label} style={{ background: '#fff', borderRadius: 14, padding: '8px 12px 7px', overflow: 'hidden' }}>
                        <div style={{ fontSize: FONT_SIZE.kpiLabel, color: '#4E4E4E', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
                        <div style={{ fontSize: FONT_SIZE.kpiValue, lineHeight: 1.1, fontWeight: 600, color: k.variant === 'danger' ? '#A4260E' : '#10575C', margin: '4px 0 4px' }}>{k.value}</div>
                        <div style={complianceKpiPill(k.variant)}>{k.delta}</div>
                    </article>
                ))}
            </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.05fr 0.95fr', gap: 10, marginBottom: 10 }}>
            <div style={{ display: 'grid', gap: 10 }}>
                <article style={{ ...card, padding: 12, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <h2 style={sectionHeading}>Manage Accounts</h2>
                        <div style={{ display: 'inline-flex', gap: 8, alignItems: 'center' }}>
                            {onSyncAccounts && (
                                <button
                                    type="button"
                                    onClick={onSyncAccounts}
                                    disabled={syncBusy}
                                    title="Refresh connected accounts from Outstand"
                                    style={{
                                        border: '1px solid #10575C', borderRadius: 20, height: 32, padding: '0 14px',
                                        fontSize: FONT_SIZE.sub, fontWeight: 700, cursor: syncBusy ? 'progress' : 'pointer',
                                        background: '#fff', color: '#10575C', display: 'inline-flex', alignItems: 'center',
                                        gap: 6, fontFamily: FONT, opacity: syncBusy ? 0.7 : 1,
                                    }}
                                >
                                    <i className={`fas ${syncBusy ? 'fa-spinner fa-spin' : 'fa-sync-alt'}`} style={{ fontSize: 10 }} aria-hidden />
                                    {syncBusy ? 'Refreshing…' : 'Refresh'}
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setShowPicker(!showPicker)}
                                style={{
                                    border: 'none', borderRadius: 20, height: 32, padding: '0 16px', fontSize: FONT_SIZE.sub,
                                    fontWeight: 700, cursor: 'pointer', background: '#10575C', color: '#fff',
                                    display: 'inline-flex', alignItems: 'center', gap: 6, fontFamily: FONT
                                }}
                            >
                                <i className="fas fa-plus" style={{ fontSize: 10 }} aria-hidden /> Add Account
                            </button>
                        </div>
                    </div>
                    {syncMessage && (
                        <div
                            role="status"
                            style={{
                                marginBottom: 10, padding: '8px 12px', borderRadius: 10, fontSize: FONT_SIZE.sub,
                                fontFamily: FONT, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12,
                                border: '1px solid ' + (syncMessage.tone === 'success' ? '#10B981' : syncMessage.tone === 'warning' ? '#F59E0B' : '#10575C'),
                                background: syncMessage.tone === 'success' ? '#ECFDF5' : syncMessage.tone === 'warning' ? '#FFFBEB' : '#F0F9FA',
                                color: syncMessage.tone === 'success' ? '#065F46' : syncMessage.tone === 'warning' ? '#92400E' : '#10575C',
                            }}
                        >
                            <span style={{ fontWeight: 500, lineHeight: 1.4 }}>
                                <i
                                    className={`fas ${syncMessage.tone === 'success' ? 'fa-check-circle' : syncMessage.tone === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'}`}
                                    style={{ marginRight: 8, fontSize: 11 }}
                                    aria-hidden
                                />
                                {syncMessage.text}
                            </span>
                            {onDismissSyncMessage && (
                                <button type="button" onClick={onDismissSyncMessage} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: 'inherit' }}>
                                    <i className="fas fa-times" style={{ fontSize: 12 }} aria-hidden />
                                </button>
                            )}
                        </div>
                    )}
                    {showPicker && (
                        <div style={{ marginBottom: 12, padding: 12, background: '#F9FAFB', borderRadius: 14, border: '1px solid #E1E1E1' }}>
                            <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#384046', marginBottom: 8 }}>Select a platform to connect:</div>
                            {/*
                              Instagram has no standalone OAuth consent flow on Meta's
                              Graph API — IG access is granted via Facebook Business
                              Login. If the user clicks "Instagram" first they often
                              just land on instagram.com without seeing an Allow
                              screen. This callout makes the order explicit.
                            */}
                            <div style={{
                                marginBottom: 10, padding: '8px 10px', borderRadius: 8,
                                background: '#FFFBEB', border: '1px solid #FCD34D',
                                fontSize: FONT_SIZE.small, color: '#78350F', lineHeight: 1.45,
                            }}>
                                <i className="fas fa-info-circle" style={{ marginRight: 6, fontSize: 11 }} aria-hidden />
                                <strong>Connecting Instagram?</strong> Click <strong>Facebook</strong> first and approve the consent screen — Instagram Business / Creator accounts authorise via the linked Facebook Page. Personal Instagram accounts can&apos;t be connected.
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {networks.map((net) => {
                                    const pm = PLATFORM_META[net.network] || { label: net.network, icon: 'fa-globe', color: '#8B8F94' };
                                    const alreadyConnected = accounts.some(a => a.platform === net.network);
                                    const isConnecting = connectingPlatform === net.network;
                                    return (
                                        <div
                                            key={net.id}
                                            style={{
                                                display: 'inline-flex', alignItems: 'stretch',
                                                borderRadius: 12, border: '2px solid ' + (alreadyConnected ? '#10B981' : '#E1E1E1'),
                                                background: alreadyConnected ? '#ECFDF5' : '#fff',
                                                opacity: isConnecting ? 0.6 : 1, fontFamily: FONT, fontSize: FONT_SIZE.sub,
                                                overflow: 'hidden',
                                            }}
                                        >
                                            <button
                                                type="button"
                                                disabled={isConnecting}
                                                onClick={() => !alreadyConnected && onConnectPlatform(net.network)}
                                                style={{
                                                    display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                                                    background: 'transparent', border: 'none', cursor: alreadyConnected ? 'default' : 'pointer',
                                                    fontFamily: FONT, fontSize: FONT_SIZE.sub,
                                                }}
                                            >
                                                <i className={`fab ${pm.icon}`} style={{ fontSize: 16, color: pm.color }} aria-hidden />
                                                <span style={{ fontWeight: 600, color: '#384046' }}>{pm.label}</span>
                                                {alreadyConnected && <i className="fas fa-check-circle" style={{ fontSize: 12, color: '#10B981' }} aria-hidden />}
                                                {isConnecting && <span style={{ fontSize: 10, color: '#8B8F94' }}>Connecting...</span>}
                                            </button>
                                            {!alreadyConnected && onMockConnect && (
                                                <button
                                                    type="button"
                                                    onClick={() => onMockConnect(net.network)}
                                                    title={`Add a demo ${pm.label} account without OAuth`}
                                                    style={{
                                                        padding: '0 10px', borderLeft: '1px dashed #CBD5E1',
                                                        background: '#F8FAFC', border: 'none', cursor: 'pointer',
                                                        color: '#64748B', fontSize: 10, fontWeight: 700, letterSpacing: 0.3,
                                                        textTransform: 'uppercase',
                                                    }}
                                                >
                                                    <i className="fas fa-flask" style={{ marginRight: 4, fontSize: 9 }} aria-hidden />
                                                    Demo
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            {onMockConnect && (
                                <div style={{ marginTop: 8, fontSize: FONT_SIZE.small, color: '#64748B' }}>
                                    <i className="fas fa-circle-info" style={{ marginRight: 4 }} aria-hidden />
                                    No Facebook/IG credentials? Click <strong>Demo</strong> next to any platform to populate the dashboard with a stand-in connection.
                                </div>
                            )}
                        </div>
                    )}
                    {accounts.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {accounts.map((acct, accIdx) => {
                                const pm = PLATFORM_META[acct.platform] || { label: acct.platform, icon: 'fa-globe', color: '#8B8F94' };
                                const followerLabel = acct.followers != null
                                    ? (acct.followers >= 1000 ? `${(acct.followers / 1000).toFixed(1)}K` : String(acct.followers))
                                    : null;
                                return (
                                    <div key={acct.outstandAccountId || acct._id || `${acct.platform}-${accIdx}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F4F5F6', borderRadius: 20, padding: '6px 14px 6px 10px' }}>
                                        <i className={`fab ${pm.icon}`} style={{ fontSize: 14, color: pm.color }} aria-hidden />
                                        <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#384046' }}>{acct.username || pm.label}</span>
                                        {followerLabel && <span style={{ fontSize: 9, color: '#8B8F94', fontWeight: 600 }}>{followerLabel} followers</span>}
                                        {acct.isMock ? (
                                            <span style={{ fontSize: 9, color: '#92400E', fontWeight: 700, background: '#FFFBEB', padding: '1px 6px', borderRadius: 8 }}>Demo</span>
                                        ) : (
                                            <span style={{ fontSize: 9, color: '#10B981', fontWeight: 700 }}>Connected</span>
                                        )}
                                        {!demoMode && (
                                            <button type="button" onClick={() => onDisconnect(acct.outstandAccountId)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 2 }}>
                                                <i className="fas fa-times" style={{ fontSize: 10, color: '#D93025' }} aria-hidden />
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0' }}>
                            <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#F4F5F6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                <i className="fas fa-link" style={{ fontSize: 14, color: '#C2C3C3' }} aria-hidden />
                            </div>
                            <div>
                                <div style={{ fontSize: FONT_SIZE.sub, color: '#384046', fontWeight: 600 }}>No accounts connected</div>
                                <div style={{ fontSize: FONT_SIZE.small, color: '#8B8F94', marginTop: 2 }}>Connect your social media accounts via Outstand to start publishing and tracking.</div>
                            </div>
                        </div>
                    )}
                </article>

                <article style={{ ...card, padding: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                        <h2 style={sectionHeading}>Content calendar</h2>
                        <span style={{ fontSize: FONT_SIZE.body, fontWeight: 600, color: '#8B8F94' }}>{calendarLabel}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(7, minmax(72px, 1fr))' : 'repeat(7, minmax(0, 1fr))', gap: 5, overflowX: isMobile ? 'auto' : undefined, WebkitOverflowScrolling: 'touch', paddingBottom: isMobile ? 4 : 0 }}>
                        {calendarDays.map((d) => (
                            <div key={d.day} style={{ border: '2px solid #E1E1E1', borderRadius: 12, background: '#fafbfc', minHeight: 50, padding: '5px 5px', display: 'flex', flexDirection: 'column', gap: 3 }}>
                                <div style={{ fontSize: FONT_SIZE.small, fontWeight: 700, color: '#8B8F94', textTransform: 'uppercase' }}>{d.day}</div>
                                <div style={{ fontSize: 13, fontWeight: 300, color: '#10575C', lineHeight: 1 }}>{d.date}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 'auto' }}>
                                    {(d.slots || []).map((s) => (
                                        <span key={s.label} style={{ fontSize: 9, fontWeight: 700, padding: '2px 4px', borderRadius: 5, background: s.bg, color: s.fg, textAlign: 'center', lineHeight: 1.15 }}>{s.label}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </div>

            <article style={{ ...card, padding: 12, display: 'flex', flexDirection: 'column' }}>
                <h2 style={{ ...sectionHeading, marginBottom: 8 }}>Recent posts</h2>
                {recentPosts.length > 0 ? (
                    <ul style={{ listStyle: 'none', margin: 0, padding: '0 4px 0 0', display: 'grid', gap: 0, maxHeight: isMobile ? 280 : 300, overflowY: 'auto' }}>
                        {recentPosts.map((p, idx) => (
                            <li
                                key={p.id || idx}
                                onClick={onSelectPost ? () => onSelectPost(p) : undefined}
                                onKeyDown={onSelectPost ? (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelectPost(p); } } : undefined}
                                role={onSelectPost ? 'button' : undefined}
                                tabIndex={onSelectPost ? 0 : undefined}
                                style={{
                                    display: 'grid',
                                    gridTemplateColumns: isMobile ? '52px 1fr' : '60px 1fr auto',
                                    gap: 12,
                                    alignItems: 'center',
                                    padding: '8px 6px',
                                    borderTop: idx ? '1px solid #F1F2F4' : 'none',
                                    cursor: onSelectPost ? 'pointer' : 'default',
                                    borderRadius: 8,
                                    transition: 'background 120ms ease',
                                }}
                                onMouseEnter={onSelectPost ? (e) => { e.currentTarget.style.background = '#F8FAFC'; } : undefined}
                                onMouseLeave={onSelectPost ? (e) => { e.currentTarget.style.background = 'transparent'; } : undefined}
                            >
                                {p.thumb ? (
                                    <img src={p.thumb} alt="" style={{ width: '100%', aspectRatio: '3/2', objectFit: 'cover', borderRadius: 10, display: 'block' }} />
                                ) : (
                                    <div style={{ width: '100%', aspectRatio: '3/2', borderRadius: 10, background: '#F4F5F6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <i className="fas fa-image" style={{ fontSize: 18, color: '#C2C3C3' }} aria-hidden />
                                    </div>
                                )}
                                <div style={{ minWidth: 0 }}>
                                    <div style={{ fontWeight: 600, color: '#060606', fontSize: FONT_SIZE.body, lineHeight: 1.35 }}>{p.title || p.content?.substring(0, 60) || 'Post'}</div>
                                    <div style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94', marginTop: 4 }}>{p.meta || p.platform || '—'}</div>
                                    {isMobile && (
                                        <div style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94', marginTop: 6, lineHeight: 1.4 }}>
                                            Reach <strong style={{ color: '#10575C' }}>{p.reach || '—'}</strong>{' \u00b7 '}Eng. <strong style={{ color: '#10575C' }}>{p.engagement || '—'}</strong>{' \u00b7 '}{p.clicks || '—'}
                                        </div>
                                    )}
                                </div>
                                {!isMobile && (
                                    <div style={{ display: 'grid', gap: 4, textAlign: 'right', fontSize: FONT_SIZE.sub, color: '#8B8F94', minWidth: 130 }}>
                                        <div><span style={{ color: '#8B8F94' }}>Reach</span> <strong style={{ color: '#10575C' }}>{p.reach || '—'}</strong></div>
                                        <div><span style={{ color: '#8B8F94' }}>Engagement</span> <strong style={{ color: '#10575C' }}>{p.engagement || '—'}</strong></div>
                                        <div><span style={{ color: '#8B8F94' }}>Clicks</span> <strong style={{ color: '#10575C' }}>{p.clicks || '—'}</strong></div>
                                    </div>
                                )}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '36px 16px', textAlign: 'center' }}>
                        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#F4F5F6', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                            <i className="fas fa-paper-plane" style={{ fontSize: 20, color: '#C2C3C3' }} aria-hidden />
                        </div>
                        <div style={{ fontSize: FONT_SIZE.body, fontWeight: 600, color: '#384046', marginBottom: 4 }}>No posts yet</div>
                        <div style={{ fontSize: FONT_SIZE.sub, color: '#8B8F94', maxWidth: 280, lineHeight: 1.4 }}>Connect your social accounts and start creating posts to see activity here.</div>
                    </div>
                )}
            </article>
        </section>

        {(contentCalendar.length > 0 || canCompose) && (
            <article style={{ ...card, padding: 12, marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8, flexWrap: 'wrap' }}>
                    <h2 style={{ ...sectionHeading, margin: 0 }}>Scheduled content — this week</h2>
                    {canCompose && (
                        <button
                            type="button"
                            onClick={() => onOpenComposer('create')}
                            style={{
                                height: 34, padding: '0 14px', borderRadius: 17,
                                background: '#fff', color: '#10575C',
                                border: '1px solid #10575C', cursor: 'pointer',
                                fontFamily: FONT, fontSize: FONT_SIZE.button, fontWeight: 700,
                                display: 'inline-flex', alignItems: 'center', gap: 6,
                            }}
                        >
                            <i className="fas fa-plus" style={{ fontSize: 11 }} aria-hidden /> Add post
                        </button>
                    )}
                </div>
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: isMobile ? 240 : 260 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT_SIZE.tableBody, minWidth: isMobile ? 0 : 720 }}>
                        <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                            <tr style={{ borderBottom: '2px solid #E1E1E1' }}>
                                {['Day', 'Post', 'Market', 'Platforms', 'Status', ''].map((h, i) => (
                                    <th key={h || `col-${i}`} style={{ textAlign: 'left', padding: '10px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', fontSize: FONT_SIZE.tableHeader, whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {contentCalendar.length === 0 && (
                                <tr>
                                    <td colSpan={6} style={{ padding: '24px 8px', textAlign: 'center', color: '#8B8F94', fontSize: FONT_SIZE.body }}>
                                        No scheduled posts this week. Click <strong style={{ color: '#10575C' }}>Add post</strong> to get started.
                                    </td>
                                </tr>
                            )}
                            {contentCalendar.map((row, rowIdx) => {
                                const tonePill = row.tone === 'ok'
                                    ? { bg: '#D2E4E5', color: '#10575C' }
                                    : row.tone === 'warn'
                                        ? { bg: 'rgba(200,120,20,0.18)', color: '#A65F0A' }
                                        : { bg: 'rgba(107,114,128,0.16)', color: '#4B5563' };
                                const rowKey = row.id || `${row.day}-${rowIdx}`;
                                return (
                                    <tr key={rowKey} style={{ borderBottom: '1px solid #F1F2F4' }}>
                                        <td style={{ padding: '12px 8px', color: '#10575C', fontWeight: 700, whiteSpace: 'nowrap' }}>
                                            <div>{row.day}</div>
                                            {row.scheduleLabel && (
                                                <div style={{ fontSize: 11, color: '#64748B', fontWeight: 500, marginTop: 2 }}>{row.scheduleLabel}</div>
                                            )}
                                        </td>
                                        <td style={{ padding: '12px 8px', color: '#060606', fontWeight: 600 }}>{row.post}</td>
                                        <td style={{ padding: '12px 8px', color: '#384046', whiteSpace: 'nowrap' }}>{row.market}</td>
                                        <td style={{ padding: '12px 8px', color: '#384046', whiteSpace: 'nowrap' }}>{row.platform}</td>
                                        <td style={{ padding: '12px 8px' }}>
                                            <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: FONT_SIZE.button, fontWeight: 700, background: tonePill.bg, color: tonePill.color }}>{row.status}</span>
                                        </td>
                                        <td style={{ padding: '8px 8px', whiteSpace: 'nowrap', textAlign: 'right' }}>
                                            {canCompose && (
                                                <span style={{ display: 'inline-flex', gap: 4 }}>
                                                    <button
                                                        type="button"
                                                        onClick={() => onOpenComposer('edit', { ...row })}
                                                        title="Edit post"
                                                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #E1E4E8', background: '#fff', color: '#10575C', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                                                    >
                                                        <i className="fas fa-pen" aria-hidden />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            if (window.confirm(`Delete "${row.post}"?`)) onDeletePost(row.id);
                                                        }}
                                                        title="Delete post"
                                                        style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #FECACA', background: '#fff', color: '#DC2626', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}
                                                    >
                                                        <i className="fas fa-trash" aria-hidden />
                                                    </button>
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </article>
        )}

        {selectedPost && (
            <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => { if (e.target === e.currentTarget) onClosePost(); }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 10050,
                    background: 'rgba(15,23,42,0.55)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16,
                }}
            >
                <PostDetailDialog post={selectedPost} onClose={onClosePost} />
            </div>
        )}

        {composer && (
            <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => { if (e.target === e.currentTarget) onCloseComposer(); }}
                style={{
                    position: 'fixed', inset: 0, zIndex: 10050,
                    background: 'rgba(15,23,42,0.45)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    padding: 16,
                }}
            >
                <PostComposerForm
                    initial={composer.draft}
                    mode={composer.mode}
                    statusOptions={statusOptions}
                    accounts={composerAccounts}
                    properties={composerProperties}
                    onCancel={onCloseComposer}
                    onSubmit={onSavePost}
                />
            </div>
        )}
    </>
    );
};

const PLATFORM_THEME = {
    Facebook: { bg: '#1877F2', icon: 'fa-facebook-f' },
    Instagram: { bg: 'linear-gradient(45deg, #f09433 0%, #e6683c 25%, #dc2743 50%, #cc2366 75%, #bc1888 100%)', icon: 'fa-instagram' },
    LinkedIn: { bg: '#0A66C2', icon: 'fa-linkedin-in' },
    Threads: { bg: '#000', icon: 'fa-at' },
    'X (Twitter)': { bg: '#000', icon: 'fa-x-twitter' },
    X: { bg: '#000', icon: 'fa-x-twitter' },
    YouTube: { bg: '#FF0000', icon: 'fa-youtube' },
    TikTok: { bg: '#000', icon: 'fa-tiktok' },
    Pinterest: { bg: '#E60023', icon: 'fa-pinterest-p' },
    Bluesky: { bg: '#0085FF', icon: 'fa-cloud' },
    'Google Business': { bg: '#4285F4', icon: 'fa-google' },
};

const PostDetailDialog = ({ post, onClose }) => {
    const [imgIdx, setImgIdx] = useState(0);
    if (!post) return null;
    const gallery = Array.isArray(post.gallery) && post.gallery.length ? post.gallery : (post.thumb ? [post.thumb] : []);
    const theme = PLATFORM_THEME[post.platform] || { bg: '#10575C', icon: 'fa-share-nodes' };
    const handle = post.account?.username
        ? `@${post.account.username.replace(/^@/, '')}`
        : '@yourbrand';
    const stat = (label, value) => (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: '#64748B' }}>{label}</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#0F172A' }}>{value || '—'}</span>
        </div>
    );

    return (
        <div
            style={{
                width: '100%', maxWidth: 760, maxHeight: '90vh',
                background: '#fff', borderRadius: 16, overflow: 'hidden',
                boxShadow: '0 30px 60px -20px rgba(15,23,42,0.5)',
                fontFamily: FONT,
                display: 'flex', flexDirection: 'column',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 18px', borderBottom: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: theme.bg, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
                        <i className={`fab ${theme.icon}`} aria-hidden />
                    </div>
                    <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {handle}
                            {post.account?.isMock && (
                                <span style={{ marginLeft: 8, padding: '2px 8px', borderRadius: 10, background: '#FEF3C7', color: '#92400E', fontSize: 10, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase' }}>Demo</span>
                            )}
                        </div>
                        <div style={{ fontSize: 12, color: '#64748B' }}>{post.platform} · {post.ageLabel || post.meta || 'Recent'}</div>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    aria-label="Close"
                    style={{ width: 34, height: 34, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B', fontSize: 16, flexShrink: 0 }}
                >
                    <i className="fas fa-times" aria-hidden />
                </button>
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
                {gallery.length > 0 && (
                    <div style={{ position: 'relative', width: '100%', background: '#0F172A' }}>
                        <img
                            src={gallery[Math.min(imgIdx, gallery.length - 1)]}
                            alt={post.title || 'Post image'}
                            style={{ width: '100%', maxHeight: 380, objectFit: 'cover', display: 'block' }}
                        />
                        {gallery.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    onClick={() => setImgIdx((i) => (i - 1 + gallery.length) % gallery.length)}
                                    aria-label="Previous image"
                                    style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(15,23,42,0.55)', color: '#fff', cursor: 'pointer', fontSize: 14 }}
                                >
                                    <i className="fas fa-chevron-left" aria-hidden />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setImgIdx((i) => (i + 1) % gallery.length)}
                                    aria-label="Next image"
                                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', width: 36, height: 36, borderRadius: '50%', border: 'none', background: 'rgba(15,23,42,0.55)', color: '#fff', cursor: 'pointer', fontSize: 14 }}
                                >
                                    <i className="fas fa-chevron-right" aria-hidden />
                                </button>
                                <div style={{ position: 'absolute', bottom: 10, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 6 }}>
                                    {gallery.map((_, i) => (
                                        <button
                                            key={`dot-${i}`}
                                            type="button"
                                            aria-label={`Image ${i + 1}`}
                                            onClick={() => setImgIdx(i)}
                                            style={{ width: 7, height: 7, borderRadius: '50%', border: 'none', cursor: 'pointer', background: i === imgIdx ? '#fff' : 'rgba(255,255,255,0.5)' }}
                                        />
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                )}
                <div style={{ padding: '18px 20px' }}>
                    <h3 style={{ margin: '0 0 8px', fontSize: 18, fontWeight: 700, color: '#0F172A', lineHeight: 1.35 }}>{post.title || 'Post'}</h3>
                    {post.content && (
                        <p style={{ margin: '0 0 12px', whiteSpace: 'pre-wrap', fontSize: 14, color: '#1F2937', lineHeight: 1.55 }}>{post.content}</p>
                    )}
                    {Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 16 }}>
                            {post.hashtags.map((t) => (
                                <span key={t} style={{ fontSize: 13, color: '#1D4ED8', fontWeight: 600 }}>{t}</span>
                            ))}
                        </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '12px 0', borderTop: '1px solid #E2E8F0', borderBottom: '1px solid #E2E8F0', color: '#475569', fontSize: 13 }}>
                        <span><i className="fas fa-heart" style={{ color: '#EF4444', marginRight: 6 }} aria-hidden />{post.likesLabel || post.likes || 0} likes</span>
                        <span><i className="fas fa-comment" style={{ color: '#3B82F6', marginRight: 6 }} aria-hidden />{post.commentsLabel || post.comments || 0} comments</span>
                        <span><i className="fas fa-share" style={{ color: '#10B981', marginRight: 6 }} aria-hidden />{post.sharesLabel || post.shares || 0} shares</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 16, padding: '16px 0', borderBottom: Array.isArray(post.sampleComments) && post.sampleComments.length ? '1px solid #E2E8F0' : 'none' }}>
                        {stat('Reach', post.reach)}
                        {stat('Engagement', post.engagement)}
                        {stat('Clicks', post.clicks)}
                    </div>

                    {Array.isArray(post.sampleComments) && post.sampleComments.length > 0 && (
                        <div style={{ paddingTop: 14 }}>
                            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: '#64748B', marginBottom: 10 }}>Top comments</div>
                            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 10 }}>
                                {post.sampleComments.map((c, i) => (
                                    <li key={`cmt-${i}`} style={{ display: 'grid', gridTemplateColumns: '32px 1fr', gap: 10, alignItems: 'flex-start' }}>
                                        <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#E2E8F0', color: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                            {(c.who || '?').split(/\s+/).map((s) => s[0]).slice(0, 2).join('').toUpperCase()}
                                        </div>
                                        <div>
                                            <div style={{ fontSize: 13, color: '#0F172A' }}>
                                                <strong style={{ marginRight: 6 }}>{c.who || 'Anonymous'}</strong>
                                                <span style={{ color: '#64748B' }}>{c.text}</span>
                                            </div>
                                            <div style={{ fontSize: 11, color: '#94A3B8', marginTop: 2 }}>{c.ago || ''}</div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 18px', borderTop: '1px solid #E2E8F0', background: '#F8FAFC' }}>
                <button
                    type="button"
                    onClick={onClose}
                    style={{ height: 36, padding: '0 16px', borderRadius: 18, border: '1px solid #CBD5E1', background: '#fff', color: '#0F172A', cursor: 'pointer', fontWeight: 600 }}
                >
                    Close
                </button>
            </div>
        </div>
    );
};

// ---------------------------------------------------------------------------
// Per-platform live preview cards. Mirrors the look of each platform feed so
// the user can see exactly how their post lands before scheduling. Ported
// from the original AdminMarketing composer.
// ---------------------------------------------------------------------------
const InstagramPreviewCard = ({ username, caption, mediaUrl, locationLabel }) => (
    <div style={{ width: '100%', maxWidth: 380, background: '#fff', border: '1px solid #dbdbdb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px' }}>
            <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'linear-gradient(45deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)', flexShrink: 0 }} />
            <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 13, color: '#262626' }}>{username || 'username'}</div>
                {locationLabel && <div style={{ fontSize: 11, color: '#8e8e8e' }}>{locationLabel}</div>}
            </div>
            <i className="fas fa-ellipsis-h" style={{ color: '#262626' }} aria-hidden />
        </div>
        <div style={{ aspectRatio: '1', background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {mediaUrl ? (
                <img src={mediaUrl} alt="Post" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
            ) : (
                <div style={{ color: '#666', fontSize: 13 }}>No image</div>
            )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '6px 14px 4px' }}>
            <i className="far fa-heart" style={{ fontSize: 20, color: '#262626' }} aria-hidden />
            <i className="far fa-comment" style={{ fontSize: 20, color: '#262626' }} aria-hidden />
            <i className="far fa-paper-plane" style={{ fontSize: 20, color: '#262626' }} aria-hidden />
            <i className="far fa-bookmark" style={{ fontSize: 20, color: '#262626', marginLeft: 'auto' }} aria-hidden />
        </div>
        <div style={{ padding: '0 14px 12px', fontSize: 13, color: '#262626', wordBreak: 'break-word' }}>
            <span style={{ fontWeight: 600, marginRight: 6 }}>{username || 'username'}</span>
            <span style={{ whiteSpace: 'pre-wrap' }}>{caption || ''}</span>
        </div>
    </div>
);

const FacebookPreviewCard = ({ username, caption, mediaUrl, locationLabel }) => (
    <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #dadde1', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#1877F2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                {(username || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#050505' }}>{username || 'Page name'}</div>
                <div style={{ fontSize: 12, color: '#65676B' }}>Just now {locationLabel ? `· ${locationLabel}` : ''} · 🌐</div>
            </div>
        </div>
        <div style={{ padding: '0 12px 10px', fontSize: 14, color: '#050505', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4 }}>{caption || ''}</div>
        {mediaUrl && (
            <div style={{ background: '#000' }}>
                <img src={mediaUrl} alt="Post" style={{ width: '100%', display: 'block', maxHeight: 400, objectFit: 'cover' }} />
            </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '6px 0', borderTop: '1px solid #ced0d4', fontSize: 13, color: '#65676B' }}>
            <span><i className="far fa-thumbs-up" aria-hidden /> Like</span>
            <span><i className="far fa-comment" aria-hidden /> Comment</span>
            <span><i className="fas fa-share" aria-hidden /> Share</span>
        </div>
    </div>
);

const XPreviewCard = ({ username, caption, mediaUrl }) => (
    <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #cfd9de', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 12, padding: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#0f1419', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                {(username || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 700, fontSize: 14, color: '#0f1419' }}>{username || 'username'}</span>
                    <span style={{ fontSize: 14, color: '#536471' }}>@{(username || 'handle').replace(/^@/, '')}</span>
                </div>
                <div style={{ fontSize: 14, color: '#0f1419', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.4 }}>{caption || ''}</div>
                {mediaUrl && (
                    <div style={{ marginTop: 10, borderRadius: 14, overflow: 'hidden', border: '1px solid #cfd9de' }}>
                        <img src={mediaUrl} alt="Post" style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover' }} />
                    </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, color: '#536471', fontSize: 13, maxWidth: 280 }}>
                    <span><i className="far fa-comment" aria-hidden /> 0</span>
                    <span><i className="fas fa-retweet" aria-hidden /> 0</span>
                    <span><i className="far fa-heart" aria-hidden /> 0</span>
                    <span><i className="fas fa-chart-bar" aria-hidden /> 0</span>
                </div>
            </div>
        </div>
    </div>
);

const LinkedInPreviewCard = ({ username, caption, mediaUrl }) => (
    <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #e0e0e0', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: 12, display: 'flex', gap: 10 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#0A66C2', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                {(username || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#000' }}>{username || 'Name'}</div>
                <div style={{ fontSize: 12, color: '#666', marginBottom: 8 }}>Real estate professional · 1st</div>
                <div style={{ fontSize: 14, color: '#000', whiteSpace: 'pre-wrap', wordBreak: 'break-word', lineHeight: 1.45 }}>{caption || ''}</div>
            </div>
        </div>
        {mediaUrl && (
            <div style={{ background: '#f3f2ef' }}>
                <img src={mediaUrl} alt="Post" style={{ width: '100%', display: 'block', maxHeight: 380, objectFit: 'cover' }} />
            </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'space-around', padding: '8px 0', borderTop: '1px solid #e0e0e0', fontSize: 13, color: '#666' }}>
            <span><i className="far fa-thumbs-up" aria-hidden /> Like</span>
            <span><i className="far fa-comment" aria-hidden /> Comment</span>
            <span><i className="fas fa-retweet" aria-hidden /> Repost</span>
            <span><i className="far fa-paper-plane" aria-hidden /> Send</span>
        </div>
    </div>
);

const ThreadsPreviewCard = ({ username, caption, mediaUrl }) => (
    <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #d3d3d3', borderRadius: 14, overflow: 'hidden' }}>
        <div style={{ display: 'flex', gap: 10, padding: 14 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#000', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, flexShrink: 0 }}>
                {(username || 'U').charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#000' }}>{username || 'username'}</div>
                <div style={{ fontSize: 14, color: '#000', whiteSpace: 'pre-wrap', wordBreak: 'break-word', marginTop: 4 }}>{caption || ''}</div>
                {mediaUrl && (
                    <div style={{ marginTop: 10, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
                        <img src={mediaUrl} alt="Post" style={{ width: '100%', display: 'block', maxHeight: 360, objectFit: 'cover' }} />
                    </div>
                )}
            </div>
        </div>
    </div>
);

const EmailPreviewCard = ({ title, caption, mediaUrl }) => (
    <div style={{ width: '100%', maxWidth: 420, background: '#fff', border: '1px solid #ddd', borderRadius: 8, overflow: 'hidden' }}>
        <div style={{ padding: 14, borderBottom: '1px solid #eee', background: '#f8fafc' }}>
            <div style={{ fontSize: 11, color: '#666', textTransform: 'uppercase', letterSpacing: 0.4, marginBottom: 4 }}>Subject</div>
            <div style={{ fontWeight: 600, fontSize: 15, color: '#0f172a' }}>{title || '(No subject)'}</div>
        </div>
        {mediaUrl && (
            <img src={mediaUrl} alt="" style={{ width: '100%', maxHeight: 240, objectFit: 'cover', display: 'block' }} />
        )}
        <div style={{ padding: 16, fontSize: 14, color: '#333', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>{caption || ''}</div>
    </div>
);

const PLATFORM_PREVIEWS = [
    { id: 'instagram', label: 'Instagram', icon: 'fa-instagram', component: InstagramPreviewCard, brandColor: '#E1306C' },
    { id: 'facebook', label: 'Facebook', icon: 'fa-facebook-f', component: FacebookPreviewCard, brandColor: '#1877F2' },
    { id: 'x', label: 'X', icon: 'fa-x-twitter', component: XPreviewCard, brandColor: '#000' },
    { id: 'linkedin', label: 'LinkedIn', icon: 'fa-linkedin-in', component: LinkedInPreviewCard, brandColor: '#0A66C2' },
    { id: 'threads', label: 'Threads', icon: 'fa-at', component: ThreadsPreviewCard, brandColor: '#000' },
    { id: 'email', label: 'Email', icon: 'fa-envelope', component: EmailPreviewCard, brandColor: '#0f172a' },
];

const PLATFORM_DISPLAY_LABEL = {
    instagram: 'Instagram',
    facebook: 'Facebook',
    x: 'X',
    twitter: 'X',
    linkedin: 'LinkedIn',
    threads: 'Threads',
    email: 'Email',
    youtube: 'YouTube',
    tiktok: 'TikTok',
    pinterest: 'Pinterest',
    bluesky: 'Bluesky',
    google_business: 'Google Business',
};

// Maps the long day name used internally to the short label shown in the
// scheduled-content table. Index 0 = Sunday to match JS Date.getDay().
const COMPOSER_DAYS_FULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const COMPOSER_DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const formatComposerSchedule = (sched) => {
    if (!sched) return null;
    if (sched.type === 'once') {
        if (!sched.at) return null;
        try {
            const d = new Date(sched.at);
            if (!Number.isNaN(d.getTime())) return d.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
        } catch (_) {}
        return null;
    }
    if (sched.type === 'recurring') {
        const parts = [];
        const indices = sched.everyDay ? [0, 1, 2, 3, 4, 5, 6] : (Array.isArray(sched.days) ? sched.days : []);
        if (sched.everyDay) parts.push('Daily');
        else if (indices.length) parts.push(indices.map((i) => COMPOSER_DAYS_SHORT[i]).join(', '));
        if (sched.timesPerWeek && !sched.everyDay) parts.push(`${sched.timesPerWeek}×/wk`);
        if (sched.time) parts.push(sched.time);
        if (sched.startDate) parts.push(`from ${new Date(sched.startDate).toLocaleDateString()}`);
        if (sched.endDate) parts.push(`to ${new Date(sched.endDate).toLocaleDateString()}`);
        return parts.join(' · ') || 'Recurring';
    }
    return null;
};

// Pick a single weekday label (Mon/Tue/…) for the table's `day` column from
// whatever schedule the user configured.
const dayShortFromSchedule = (sched, fallback = 'Mon') => {
    if (!sched) return fallback;
    if (sched.type === 'once' && sched.at) {
        try {
            const d = new Date(sched.at);
            if (!Number.isNaN(d.getTime())) return COMPOSER_DAYS_SHORT[d.getDay()];
        } catch (_) {}
    }
    if (sched.type === 'recurring') {
        if (sched.everyDay) return 'Daily';
        if (Array.isArray(sched.days) && sched.days.length) return COMPOSER_DAYS_SHORT[sched.days[0]];
    }
    return fallback;
};

const PostComposerForm = ({ initial, mode, statusOptions, accounts, properties, onCancel, onSubmit }) => {
    const isEdit = mode === 'edit';
    // Try to back-derive previously selected platforms when editing.
    const initialPlatformIds = (() => {
        if (!initial?.platform) return [];
        return String(initial.platform)
            .split(/[+,]/)
            .map((s) => s.trim().toLowerCase())
            .map((s) => {
                const match = PLATFORM_PREVIEWS.find((p) => p.id === s || p.label.toLowerCase() === s);
                return match?.id || null;
            })
            .filter(Boolean);
    })();

    // Derive a sensible default schedule on first open: a one-time post a few
    // hours from now on the day matching the row's `day` (so editing existing
    // rows surfaces them on the right weekday by default).
    const initialSchedule = (() => {
        if (initial?.schedule && typeof initial.schedule === 'object') return initial.schedule;
        const baseDayShort = initial?.day || 'Mon';
        const dayIdx = Math.max(0, COMPOSER_DAYS_SHORT.indexOf(baseDayShort));
        const now = new Date();
        const target = new Date(now);
        const diff = ((dayIdx - now.getDay()) + 7) % 7 || 0;
        target.setDate(now.getDate() + diff);
        target.setHours(9, 0, 0, 0);
        const yyyy = target.getFullYear();
        const mm = String(target.getMonth() + 1).padStart(2, '0');
        const dd = String(target.getDate()).padStart(2, '0');
        return {
            type: 'once',
            at: `${yyyy}-${mm}-${dd}T09:00`,
            time: '09:00',
            timesPerWeek: 3,
            everyDay: false,
            days: dayIdx >= 0 ? [dayIdx] : [1],
            startDate: '',
            endDate: '',
        };
    })();

    const [draft, setDraft] = useState(() => {
        const linkedProp = initial?.propertyId
            ? (properties || []).find((p) => p.id === initial.propertyId)
            : null;
        return {
            id: initial?.id || null,
            title: initial?.title || (linkedProp ? linkedProp.title : ''),
            content: initial?.content || initial?.post || '',
            hashtags: initial?.hashtags || '',
            mediaUrl: initial?.mediaUrl || (linkedProp ? (linkedProp.thumb || (linkedProp.gallery || [])[0] || '') : ''),
            propertyId: initial?.propertyId || '',
            propertyLabel: initial?.market || (linkedProp ? linkedProp.city : ''),
            status: initial?.status || 'Scheduled',
            schedule: initialSchedule,
        };
    });

    const setSchedule = (patch) => setDraft((d) => ({ ...d, schedule: { ...d.schedule, ...patch } }));
    const toggleScheduleDay = (idx) => setDraft((d) => {
        const days = d.schedule?.days || [];
        const next = days.includes(idx) ? days.filter((x) => x !== idx) : [...days, idx].sort((a, b) => a - b);
        return { ...d, schedule: { ...d.schedule, days: next } };
    });

    // Default selected platforms: previously-saved selection if editing,
    // otherwise the platforms with at least one connected account, with
    // Instagram + Facebook as a sensible fallback for fresh users.
    const accountPlatformIds = Array.from(new Set((accounts || [])
        .map((a) => String(a.platform || '').toLowerCase())
        .filter(Boolean)));
    const defaultPlatformIds = (() => {
        if (initialPlatformIds.length) return initialPlatformIds;
        const known = accountPlatformIds.filter((p) => PLATFORM_PREVIEWS.some((x) => x.id === p));
        if (known.length) return known.slice(0, 4);
        return ['instagram', 'facebook'];
    })();
    const [selectedPlatforms, setSelectedPlatforms] = useState(defaultPlatformIds);
    const [activePreviewTab, setActivePreviewTab] = useState(defaultPlatformIds[0] || 'instagram');

    const togglePlatform = (id) => {
        setSelectedPlatforms((prev) => {
            const next = prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id];
            if (next.length && !next.includes(activePreviewTab)) setActivePreviewTab(next[0]);
            return next;
        });
    };

    const handlePropertyChange = (id) => {
        const prop = properties.find((p) => p.id === id);
        setDraft((d) => ({
            ...d,
            propertyId: id,
            propertyLabel: prop ? (prop.city || prop.title || '') : '',
            mediaUrl: prop && !d.mediaUrl ? (prop.thumb || (prop.gallery || [])[0] || '') : d.mediaUrl,
            title: prop && !d.title ? prop.title : d.title,
        }));
    };

    const captionForPreview = [draft.content, draft.hashtags].filter((s) => s && s.trim()).join('\n\n');
    const previewUsername = (() => {
        const acct = (accounts || [])[0];
        if (acct?.username) return acct.username;
        return 'yourbrand';
    })();
    const labelStyle = { display: 'block', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.4, color: '#64748B', marginBottom: 6 };
    const inputStyle = { width: '100%', boxSizing: 'border-box', height: 38, padding: '0 12px', borderRadius: 8, border: '1px solid #CBD5E1', fontFamily: FONT, fontSize: 14, color: '#0F172A', background: '#fff' };
    const textareaStyle = { ...inputStyle, height: 'auto', padding: '10px 12px', minHeight: 96, resize: 'vertical', lineHeight: 1.5 };

    const submit = (e) => {
        e.preventDefault();
        if (!draft.content.trim() && !draft.title.trim()) return;
        // Pack rich draft back into the table-row shape the marketing tab
        // already understands, while preserving the rich fields so an edit
        // round-trip restores everything.
        const platformLabels = selectedPlatforms
            .map((id) => PLATFORM_PREVIEWS.find((p) => p.id === id)?.label || id)
            .join(' + ') || 'Facebook';
        const headline = (draft.title || draft.content || '').trim();
        const post = headline.length > 80 ? `${headline.slice(0, 77)}…` : headline;
        // Normalize schedule: drop unused branch's fields so the row stays tidy.
        const sched = draft.schedule || { type: 'once' };
        const cleanSchedule = sched.type === 'once'
            ? { type: 'once', at: sched.at || '' }
            : {
                type: 'recurring',
                everyDay: !!sched.everyDay,
                days: sched.everyDay ? [0, 1, 2, 3, 4, 5, 6] : (sched.days || []),
                timesPerWeek: sched.timesPerWeek || 1,
                time: sched.time || '09:00',
                startDate: sched.startDate || '',
                endDate: sched.endDate || '',
            };
        const dayShort = dayShortFromSchedule(cleanSchedule, 'Mon');
        const scheduleLabel = formatComposerSchedule(cleanSchedule);
        onSubmit({
            id: draft.id,
            day: dayShort,
            post,
            market: draft.propertyLabel || '—',
            platform: platformLabels,
            status: draft.status,
            // Rich fields preserved on the row.
            title: draft.title,
            content: draft.content,
            hashtags: draft.hashtags,
            mediaUrl: draft.mediaUrl,
            propertyId: draft.propertyId,
            platformIds: selectedPlatforms,
            schedule: cleanSchedule,
            scheduleLabel,
        });
    };

    const ActivePreview = (PLATFORM_PREVIEWS.find((p) => p.id === activePreviewTab) || PLATFORM_PREVIEWS[0]).component;

    return (
        <form
            onSubmit={submit}
            autoComplete="off"
            data-form-type="other"
            data-lpignore="true"
            data-1p-ignore="true"
            style={{
                width: '100%', maxWidth: 1080, maxHeight: '92vh', background: '#fff', borderRadius: 16,
                boxShadow: '0 30px 60px -20px rgba(15,23,42,0.4)',
                fontFamily: FONT,
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 22px', borderBottom: '1px solid #E2E8F0' }}>
                <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#0F172A' }}>
                    {isEdit ? 'Edit post' : 'New post'}
                </h3>
                <button type="button" onClick={onCancel} aria-label="Close" style={{ width: 32, height: 32, border: 'none', background: 'transparent', cursor: 'pointer', color: '#64748B', fontSize: 16 }}>
                    <i className="fas fa-times" aria-hidden />
                </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 0 }}>
                {/* Left: form */}
                <div style={{ padding: 22, display: 'grid', gap: 14, borderRight: '1px solid #E2E8F0', minWidth: 0 }}>
                    <div>
                        <label style={labelStyle}>Title <span style={{ color: '#94A3B8', fontWeight: 500, textTransform: 'none' }}>(optional)</span></label>
                        <input
                            type="text"
                            name="ipmComposerTitle"
                            autoComplete="off"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={draft.title}
                            onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
                            placeholder="e.g. Just listed in Sandton"
                            style={inputStyle}
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Caption</label>
                        <textarea
                            name="ipmComposerCaption"
                            autoComplete="off"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={draft.content}
                            onChange={(e) => setDraft((d) => ({ ...d, content: e.target.value }))}
                            placeholder="What do you want to share?"
                            style={textareaStyle}
                            autoFocus
                        />
                    </div>
                    <div>
                        <label style={labelStyle}>Hashtags</label>
                        <input
                            type="text"
                            name="ipmComposerHashtags"
                            autoComplete="off"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={draft.hashtags}
                            onChange={(e) => setDraft((d) => ({ ...d, hashtags: e.target.value }))}
                            placeholder="#luxury #realestate #property"
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Link a property <span style={{ color: '#94A3B8', fontWeight: 500, textTransform: 'none' }}>(optional)</span></label>
                        <select
                            name="ipmComposerProperty"
                            autoComplete="off"
                            value={draft.propertyId || ''}
                            onChange={(e) => handlePropertyChange(e.target.value)}
                            style={inputStyle}
                        >
                            <option value="">None</option>
                            {properties.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.title}{p.city ? ` — ${p.city}` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={labelStyle}>Media URL <span style={{ color: '#94A3B8', fontWeight: 500, textTransform: 'none' }}>(image)</span></label>
                        <input
                            type="url"
                            name="ipmComposerMediaUrl"
                            autoComplete="off"
                            data-lpignore="true"
                            data-1p-ignore="true"
                            value={draft.mediaUrl}
                            onChange={(e) => setDraft((d) => ({ ...d, mediaUrl: e.target.value }))}
                            placeholder="https://… or pick a property above"
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={labelStyle}>Post to</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {PLATFORM_PREVIEWS.map((p) => {
                                const on = selectedPlatforms.includes(p.id);
                                return (
                                    <button
                                        type="button"
                                        key={p.id}
                                        onClick={() => togglePlatform(p.id)}
                                        style={{
                                            display: 'inline-flex', alignItems: 'center', gap: 6,
                                            padding: '7px 12px', borderRadius: 18,
                                            border: `1.5px solid ${on ? p.brandColor : '#CBD5E1'}`,
                                            background: on ? `${p.brandColor}10` : '#fff',
                                            color: on ? p.brandColor : '#475569',
                                            fontWeight: 600, fontSize: 12, cursor: 'pointer',
                                        }}
                                    >
                                        <i className={`fab ${p.icon}`} aria-hidden style={{ fontSize: 13 }} />
                                        {p.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div style={{ borderTop: '1px solid #E2E8F0', paddingTop: 14, display: 'grid', gap: 12 }}>
                        <label style={labelStyle}>Schedule</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                            {[{ id: 'once', label: 'One-time' }, { id: 'recurring', label: 'Recurring' }].map((opt) => {
                                const on = draft.schedule.type === opt.id;
                                return (
                                    <button
                                        type="button"
                                        key={opt.id}
                                        onClick={() => setSchedule({ type: opt.id })}
                                        style={{
                                            flex: 1,
                                            padding: '8px 12px',
                                            borderRadius: 10,
                                            border: `1.5px solid ${on ? '#10575C' : '#CBD5E1'}`,
                                            background: on ? '#E0F2F1' : '#fff',
                                            color: on ? '#10575C' : '#475569',
                                            fontWeight: 600,
                                            fontSize: 13,
                                            cursor: 'pointer',
                                        }}
                                    >
                                        <i className={on ? 'fas fa-check-circle' : 'far fa-circle'} style={{ marginRight: 6 }} aria-hidden />
                                        {opt.label}
                                    </button>
                                );
                            })}
                        </div>

                        {draft.schedule.type === 'once' ? (
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                <div>
                                    <label style={labelStyle}>Date & time</label>
                                    <input
                                        type="datetime-local"
                                        name="ipmComposerScheduleAt"
                                        autoComplete="off"
                                        value={draft.schedule.at || ''}
                                        onChange={(e) => setSchedule({ at: e.target.value })}
                                        style={inputStyle}
                                    />
                                </div>
                                <div>
                                    <label style={labelStyle}>Status</label>
                                    <select name="ipmComposerStatus" autoComplete="off" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))} style={inputStyle}>
                                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gap: 12 }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0F172A', cursor: 'pointer' }}>
                                    <input
                                        type="checkbox"
                                        checked={!!draft.schedule.everyDay}
                                        onChange={(e) => setSchedule({ everyDay: e.target.checked })}
                                    />
                                    Post every day
                                </label>
                                {!draft.schedule.everyDay && (
                                    <div>
                                        <div style={{ ...labelStyle, marginBottom: 6 }}>Days of the week</div>
                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                            {COMPOSER_DAYS_FULL.map((d, i) => {
                                                const on = (draft.schedule.days || []).includes(i);
                                                return (
                                                    <button
                                                        key={d}
                                                        type="button"
                                                        onClick={() => toggleScheduleDay(i)}
                                                        style={{
                                                            width: 36, height: 36, borderRadius: '50%',
                                                            border: `1.5px solid ${on ? '#10575C' : '#CBD5E1'}`,
                                                            background: on ? '#10575C' : '#fff',
                                                            color: on ? '#fff' : '#475569',
                                                            fontWeight: 700, fontSize: 12, cursor: 'pointer',
                                                        }}
                                                    >
                                                        {COMPOSER_DAYS_SHORT[i].charAt(0)}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                )}
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={labelStyle}>Times per week</label>
                                        <input
                                            type="number"
                                            min={1}
                                            max={7}
                                            name="ipmComposerTimesPerWeek"
                                            autoComplete="off"
                                            value={draft.schedule.timesPerWeek || 1}
                                            onChange={(e) => setSchedule({ timesPerWeek: Math.max(1, Math.min(7, Number(e.target.value) || 1)) })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Time</label>
                                        <input
                                            type="time"
                                            name="ipmComposerTime"
                                            autoComplete="off"
                                            value={draft.schedule.time || '09:00'}
                                            onChange={(e) => setSchedule({ time: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                                    <div>
                                        <label style={labelStyle}>Start date</label>
                                        <input
                                            type="date"
                                            name="ipmComposerStartDate"
                                            autoComplete="off"
                                            value={draft.schedule.startDate || ''}
                                            onChange={(e) => setSchedule({ startDate: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>End date <span style={{ color: '#94A3B8', fontWeight: 500, textTransform: 'none' }}>(optional)</span></label>
                                        <input
                                            type="date"
                                            name="ipmComposerEndDate"
                                            autoComplete="off"
                                            value={draft.schedule.endDate || ''}
                                            onChange={(e) => setSchedule({ endDate: e.target.value })}
                                            style={inputStyle}
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label style={labelStyle}>Status</label>
                                    <select name="ipmComposerStatus" autoComplete="off" value={draft.status} onChange={(e) => setDraft((d) => ({ ...d, status: e.target.value }))} style={inputStyle}>
                                        {statusOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                                    </select>
                                </div>
                            </div>
                        )}

                        {(() => {
                            const label = formatComposerSchedule(draft.schedule);
                            return label ? (
                                <div style={{ fontSize: 12, color: '#10575C', background: '#E0F2F1', padding: '8px 10px', borderRadius: 8, fontWeight: 600 }}>
                                    <i className="far fa-clock" style={{ marginRight: 6 }} aria-hidden />
                                    {label}
                                </div>
                            ) : null;
                        })()}
                    </div>
                </div>

                {/* Right: preview */}
                <div style={{ padding: 22, background: '#F8FAFC', display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
                    <div>
                        <div style={{ ...labelStyle, marginBottom: 8 }}>Preview</div>
                        <p style={{ margin: 0, fontSize: 12, color: '#64748B' }}>How your post will appear on each selected platform.</p>
                    </div>
                    {selectedPlatforms.length === 0 ? (
                        <div style={{ padding: 24, background: '#fff', border: '1px dashed #CBD5E1', borderRadius: 12, color: '#64748B', fontSize: 13, textAlign: 'center' }}>
                            Select at least one platform on the left to see a preview.
                        </div>
                    ) : (
                        <>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                {selectedPlatforms.map((pid) => {
                                    const p = PLATFORM_PREVIEWS.find((x) => x.id === pid);
                                    if (!p) return null;
                                    const on = activePreviewTab === pid;
                                    return (
                                        <button
                                            type="button"
                                            key={pid}
                                            onClick={() => setActivePreviewTab(pid)}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 6,
                                                padding: '6px 12px', borderRadius: 14,
                                                border: 'none', cursor: 'pointer',
                                                background: on ? p.brandColor : '#fff',
                                                color: on ? '#fff' : '#0F172A',
                                                fontWeight: 600, fontSize: 12,
                                                boxShadow: on ? 'none' : 'inset 0 0 0 1px #CBD5E1',
                                            }}
                                        >
                                            <i className={`fab ${p.icon}`} aria-hidden style={{ fontSize: 12 }} />
                                            {p.label}
                                        </button>
                                    );
                                })}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'center' }}>
                                <ActivePreview
                                    username={previewUsername}
                                    title={draft.title}
                                    caption={captionForPreview}
                                    mediaUrl={draft.mediaUrl || null}
                                    locationLabel={draft.propertyLabel || undefined}
                                />
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '14px 22px', borderTop: '1px solid #E2E8F0', background: '#fff' }}>
                <button
                    type="button"
                    onClick={onCancel}
                    style={{ height: 38, padding: '0 16px', borderRadius: 19, border: '1px solid #CBD5E1', background: '#fff', color: '#0F172A', cursor: 'pointer', fontWeight: 600 }}
                >
                    Cancel
                </button>
                <button
                    type="submit"
                    disabled={!draft.content.trim() && !draft.title.trim()}
                    style={{
                        height: 38, padding: '0 18px', borderRadius: 19, border: 'none',
                        background: (draft.content.trim() || draft.title.trim()) ? '#10575C' : '#94A3B8',
                        color: '#fff',
                        cursor: (draft.content.trim() || draft.title.trim()) ? 'pointer' : 'not-allowed',
                        fontWeight: 700,
                    }}
                >
                    {isEdit ? 'Save changes' : 'Add post'}
                </button>
            </div>
        </form>
    );
};

const vaultKpis = [
    { label: 'Total documents', value: '147', delta: '+12 this month', variant: 'teal' },
    { label: 'Expiring soon', value: '4', delta: 'Within next month', variant: 'danger' },
    { label: 'Shared documents', value: '31', delta: 'Across franchises', variant: 'teal' },
    { key: 'storage', label: 'Storage used', value: '2.4 GB', sub: 'of 10 GB', pct: 24, variant: 'bar' }
];

const vaultLegalRows = [
    { doc: 'FAIS accreditation pack', type: 'Certificate', linked: 'RE/MAX UAE HQ', status: 'active', expiry: '12 Aug 2027' },
    { doc: 'Trust account audit letter', type: 'Compliance', linked: 'Atlantic Seaboard', status: 'expiring', expiry: '02 May 2026' },
    { doc: 'Franchise disclosure \u2014 NL', type: 'Legal', linked: 'NVM Central', status: 'signed', expiry: '\u2014' },
    { doc: 'AML policy v4 draft', type: 'Policy', linked: 'Network', status: 'draft', expiry: '\u2014' }
];

const vaultListingRows = [
    { doc: 'Mandate \u2014 V&A Waterfront', type: 'Listing', value: 'R18.5M', status: 'Active' },
    { doc: 'OTP \u2014 buyer signed', type: 'Transaction', value: 'R4.2M', status: 'Signed' },
    { doc: 'Commission invoice #4412', type: 'Finance', value: 'R42,180', status: 'Paid' },
    { doc: 'Bond approval letter', type: 'Transaction', value: '\u2014', status: 'Pending' }
];

const vaultDocStatusPill = (status) => {
    const map = {
        active: { label: 'Active', bg: '#D2E4E5', color: '#10575C' },
        expiring: { label: 'Expiring', bg: '#FFCFC5', color: '#A4260E' },
        signed: { label: 'Signed', bg: 'rgba(16,87,92,0.12)', color: '#10575C' },
        draft: { label: 'Draft', bg: 'rgba(107,114,128,0.14)', color: '#4B5563' }
    };
    const p = map[status] || map.draft;
    return <span style={{ display: 'inline-block', padding: '4px 12px', borderRadius: 20, fontSize: FONT_SIZE.button, fontWeight: 700, background: p.bg, color: p.color }}>{p.label}</span>;
};

const renderEnterpriseVault = (isMobile) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity, expiries, and shared vault traffic across the network." />

        <section style={{ ...card, padding: 12, marginBottom: GAP.section, background: '#EBEBEB', border: 'none', boxShadow: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 8 }}>
                {vaultKpis.map((k) => (
                    <article key={k.label} style={{ background: '#fff', borderRadius: 16, padding: '10px 12px 9px', overflow: 'hidden', ...(k.variant === 'danger' ? { boxShadow: 'inset 0 -3px 0 rgba(180,35,24,0.25)' } : {}) }}>
                        <div style={{ fontSize: FONT_SIZE.kpiLabel, color: '#4E4E4E', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
                        {k.variant === 'bar' ? (
                            <>
                                <div style={{ fontSize: FONT_SIZE.kpiValue, lineHeight: 1.1, fontWeight: 600, color: '#10575C', margin: '6px 0 3px' }}>{k.value}</div>
                                <div style={{ fontSize: FONT_SIZE.kpiLabel, color: '#8B8F94', marginBottom: 6 }}>{k.sub}</div>
                                <div style={{ height: 6, background: '#ECEEF2', borderRadius: 20, overflow: 'hidden' }}>
                                    <div style={{ width: `${k.pct}%`, height: '100%', borderRadius: 20, background: 'linear-gradient(90deg, #10575C, #1a7a80)' }} />
                                </div>
                            </>
                        ) : (
                            <>
                                <div style={{ fontSize: FONT_SIZE.kpiValue, lineHeight: 1.1, fontWeight: 600, color: k.variant === 'danger' ? '#A4260E' : '#10575C', margin: '6px 0 6px' }}>{k.value}</div>
                                <div style={complianceKpiPill(k.variant)}>{k.delta}</div>
                            </>
                        )}
                    </article>
                ))}
            </div>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: GAP.section, marginBottom: GAP.section }}>
            <article style={{ ...card, padding: GAP.card }}>
                <h2 style={{ ...sectionHeading, marginBottom: 4 }}>Legal compliance</h2>
                <p style={{ margin: '0 0 14px', fontSize: FONT_SIZE.sub, color: '#8B8F94', lineHeight: 1.4 }}>Certificates, OTPs, and statuses: Active, Expiring, Signed, or Draft.</p>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT_SIZE.tableBody, minWidth: isMobile ? 0 : 440 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #E1E1E1' }}>
                                {['Document', 'Type', 'Linked to', 'Status', 'Expiry'].map((h) => (
                                    <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', fontSize: FONT_SIZE.tableHeader }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {vaultLegalRows.map((r) => (
                                <tr key={r.doc} style={{ borderBottom: '1px solid #F1F2F4' }}>
                                    <td style={{ padding: '12px 8px', fontWeight: 600, color: '#060606', maxWidth: 150 }}>{r.doc}</td>
                                    <td style={{ padding: '12px 8px', color: '#384046' }}>{r.type}</td>
                                    <td style={{ padding: '12px 8px', color: '#384046' }}>{r.linked}</td>
                                    <td style={{ padding: '12px 8px' }}>{vaultDocStatusPill(r.status)}</td>
                                    <td style={{ padding: '12px 8px', color: '#8B8F94', whiteSpace: 'nowrap' }}>{r.expiry}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </article>

            <article style={{ ...card, padding: GAP.card }}>
                <h2 style={{ ...sectionHeading, marginBottom: 4 }}>Listing + transactions</h2>
                <p style={{ margin: '0 0 14px', fontSize: FONT_SIZE.sub, color: '#8B8F94', lineHeight: 1.4 }}>Approvals, mandates, and commission documents tied to deals.</p>
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: FONT_SIZE.tableBody, minWidth: isMobile ? 0 : 360 }}>
                        <thead>
                            <tr style={{ borderBottom: '2px solid #E1E1E1' }}>
                                {['Document', 'Type', 'Value', 'Status'].map((h) => (
                                    <th key={h} style={{ textAlign: 'left', padding: '10px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap', fontSize: FONT_SIZE.tableHeader }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {vaultListingRows.map((r) => (
                                <tr key={r.doc} style={{ borderBottom: '1px solid #F1F2F4' }}>
                                    <td style={{ padding: '12px 8px', fontWeight: 600, color: '#060606', maxWidth: 170 }}>{r.doc}</td>
                                    <td style={{ padding: '12px 8px', color: '#384046' }}>{r.type}</td>
                                    <td style={{ padding: '12px 8px', color: '#10575C', fontWeight: 600 }}>{r.value}</td>
                                    <td style={{ padding: '12px 8px', color: '#384046', fontWeight: 600 }}>{r.status}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </article>
        </section>

        <article style={{ ...card, padding: GAP.card, minHeight: isMobile ? 140 : 180 }}>
            <h2 style={sectionHeading}>Document activity</h2>
            <p style={{ margin: '14px 0 0', fontSize: FONT_SIZE.sectionHeading, color: '#8B8F94', lineHeight: 1.5 }}>
                Uploads, shares, and expiries across markets will chart here once activity feeds are connected.
            </p>
        </article>
    </>
);

const CURRENCY_SYMBOLS = { USD: '$', EUR: '€', GBP: '£', CHF: 'CHF ', AED: 'د.إ', SAR: '﷼', CAD: 'C$', AUD: 'A$', JPY: '¥', CNY: '¥', INR: '₹', ZAR: 'R', MXN: 'MX$', BRL: 'R$', SGD: 'S$', HKD: 'HK$' };

const EnterpriseDashboard = ({ activeTab = 'dashboard' }) => {
    const isMobile = useIsMobile();
    const { currency: prefCurrency } = usePreferences();
    const fmtVal = useMemo(() => (v) => _fmtVal(v, CURRENCY_SYMBOLS[prefCurrency] || prefCurrency + ' '), [prefCurrency]);
    const [dashData, setDashData] = useState(null);
    const needsData = ['dashboard', 'royalty', 'country', 'franchise', 'branch'];
    const [dashLoading, setDashLoading] = useState(needsData.includes(activeTab));

    // Cache key for the marketing tab — scoped by user when available so a
    // demo-mode switch doesn't bleed cached accounts across users.
    const mktCacheKey = useMemo(() => {
        try {
            const u = JSON.parse(localStorage.getItem('user') || '{}');
            return u?._id ? String(u._id) : 'enterprise-marketing';
        } catch (_) { return 'enterprise-marketing'; }
    }, []);
    const mktCacheBoot = useMemo(() => getMarketingCache(mktCacheKey), [mktCacheKey]);

    const [mktAccounts, setMktAccounts] = useState(mktCacheBoot?.accounts || []);
    const [mktNetworks, setMktNetworks] = useState(mktCacheBoot?.networks || []);
    const [mktSummary, setMktSummary] = useState(mktCacheBoot?.summary || null);
    // User-editable scheduled content (seeded from the server but kept in
    // localStorage so user edits/adds/deletes persist across refreshes).
    const [mktScheduled, setMktScheduled] = useState(null);
    // Compose / edit dialog state. null = closed, otherwise { mode, draft }.
    const [mktComposer, setMktComposer] = useState(null);
    // Recent-post detail dialog (null = closed, otherwise the post object).
    const [mktSelectedPost, setMktSelectedPost] = useState(null);
    const [mktShowPicker, setMktShowPicker] = useState(false);
    const [mktConnecting, setMktConnecting] = useState(null);
    // Banner under "Manage Accounts" with sync feedback (e.g. "Looking for new
    // accounts…", "Connected 1 new Instagram account", "No accounts came
    // through — make sure you finished the connection in the popup.").
    const [mktSyncMessage, setMktSyncMessage] = useState(null);
    const [mktSyncBusy, setMktSyncBusy] = useState(false);
    // Only show the full-page spinner when we have nothing cached. With cache
    // we render immediately and revalidate in the background.
    const [mktLoading, setMktLoading] = useState(activeTab === 'marketing' && !mktCacheBoot);
    const mktPopupRef = useRef(null);
    const mktPollRef = useRef(null);
    const mktAccountsRef = useRef(mktAccounts);
    useEffect(() => { mktAccountsRef.current = mktAccounts; }, [mktAccounts]);

    useEffect(() => {
        // In demo mode (admin previewing the enterprise dashboard via the
        // "Demo Dashboards" launcher), use the canned fixture for every tab so
        // the UI looks populated for client demos without backend changes.
        const demoOverride = getDemoOverride();
        if (demoOverride) {
            setDashData(demoOverride);
            setDashLoading(false);
            return undefined;
        }
        if (!needsData.includes(activeTab)) return undefined;
        let cancelled = false;
        setDashLoading(true);
        (async () => {
            try {
                const res = await api.get('/api/enterprise/dashboard');
                if (!cancelled) setDashData(res.data);
            } catch (err) {
                console.error('Enterprise dashboard fetch error:', err);
            } finally {
                if (!cancelled) setDashLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [activeTab]);

    useEffect(() => {
        if (activeTab !== 'marketing') return undefined;
        const demoOverride = getDemoOverride();
        if (demoOverride) {
            // Demo mode renders marketing entirely from the fixture; skip API calls.
            setMktLoading(false);
            return undefined;
        }
        // Cache-first: render whatever we have immediately, refresh in the
        // background. Only show the spinner when the cache is empty AND the
        // store wasn't invalidated since last load.
        const cached = getMarketingCache(mktCacheKey);
        const invalidatedFor = takeMarketingInvalidated();
        const cacheUsable = cached && (!invalidatedFor || invalidatedFor !== mktCacheKey);
        if (cacheUsable) {
            setMktAccounts(cached.accounts || []);
            setMktNetworks(cached.networks || []);
            setMktSummary(cached.summary || null);
            setMktLoading(false);
        } else {
            setMktLoading(true);
        }
        let cancelled = false;
        (async () => {
            try {
                const [acctRes, netRes] = await Promise.all([
                    api.get('/api/enterprise/marketing?action=accounts'),
                    api.get('/api/enterprise/marketing?action=networks'),
                ]);
                if (cancelled) return;
                const accounts = acctRes.data?.connectedAccounts || [];
                const networks = netRes.data?.networks || [];
                const summary = acctRes.data?.marketingSummary || null;
                setMktAccounts(accounts);
                setMktNetworks(networks);
                setMktSummary(summary);
                setMarketingCache(mktCacheKey, { accounts, networks, summary });
            } catch (err) {
                console.error('Marketing data fetch error:', err);
            } finally {
                if (!cancelled) setMktLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [activeTab, mktCacheKey]);

    // If we land on /marketing?outstand=connected (e.g. a full-page redirect
    // fallback when the OAuth flow wasn't opened in a popup), sync the
    // connected accounts and clean the URL.
    useEffect(() => {
        if (activeTab !== 'marketing') return;
        if (typeof window === 'undefined') return;
        const params = new URLSearchParams(window.location.search);
        if (params.get('outstand') !== 'connected') return;
        (async () => {
            try {
                const syncRes = await api.post('/api/enterprise/marketing', { action: 'sync-accounts' });
                const accounts = syncRes.data?.connectedAccounts || [];
                const summary = syncRes.data?.marketingSummary || null;
                setMktAccounts(accounts);
                setMktSummary(summary);
                const prev = getMarketingCache(mktCacheKey) || {};
                setMarketingCache(mktCacheKey, { accounts, networks: prev.networks || [], summary });
            } catch (e) { console.error('Sync error:', e); }
            params.delete('outstand');
            const qs = params.toString();
            window.history.replaceState({}, '', window.location.pathname + (qs ? `?${qs}` : ''));
        })();
    }, [activeTab, mktCacheKey]);

    const syncMarketingAccounts = useCallback(async () => {
        try {
            const syncRes = await api.post('/api/enterprise/marketing', { action: 'sync-accounts' });
            const accounts = syncRes.data?.connectedAccounts || [];
            const summary = syncRes.data?.marketingSummary || null;
            setMktAccounts(accounts);
            setMktSummary(summary);
            const prev = getMarketingCache(mktCacheKey) || {};
            setMarketingCache(mktCacheKey, { accounts, networks: prev.networks || [], summary });
            return accounts;
        } catch (e) {
            console.error('Sync error:', e);
            return null;
        }
    }, [mktCacheKey]);

    /**
     * Outstand sometimes finishes the OAuth flow on its side a few seconds
     * after the popup closes (especially for IG/FB pages that need to be
     * resolved through the Meta Graph API). A single sync immediately on
     * close therefore often misses the new account.
     *
     * This helper:
     *   1. takes a snapshot of the current connected-account ids,
     *   2. polls /sync-accounts up to ~25s with backoff,
     *   3. surfaces a status banner so the user knows what happened, and
     *   4. stops as soon as a new account appears.
     */
    const runResilientSync = useCallback(async ({ platform, expectNew }) => {
        const beforeIds = new Set((mktAccountsRef.current || []).map((a) => a.outstandAccountId));
        const platformLabel = platform ? (PLATFORM_META[platform]?.label || platform) : 'account';
        const delaysMs = expectNew ? [0, 2500, 5000, 8000, 12000] : [0];
        setMktSyncBusy(true);
        if (expectNew) {
            setMktSyncMessage({ tone: 'info', text: `Looking for the new ${platformLabel} connection…` });
        }
        let foundNew = null;
        for (let i = 0; i < delaysMs.length; i += 1) {
            if (delaysMs[i] > 0) {
                await new Promise((resolve) => setTimeout(resolve, delaysMs[i]));
            }
            const accounts = await syncMarketingAccounts();
            if (!accounts) continue;
            const added = accounts.filter((a) => !beforeIds.has(a.outstandAccountId));
            if (added.length > 0) { foundNew = added; break; }
        }
        setMktSyncBusy(false);
        if (foundNew && foundNew.length > 0) {
            const names = foundNew.map((a) => `${PLATFORM_META[a.platform]?.label || a.platform}${a.username ? ` (${a.username})` : ''}`).join(', ');
            setMktSyncMessage({ tone: 'success', text: `Connected ${foundNew.length === 1 ? 'account' : `${foundNew.length} accounts`}: ${names}.` });
        } else if (expectNew) {
            setMktSyncMessage({
                tone: 'warning',
                text: `We couldn't find a new ${platformLabel} connection. Make sure you finished the OAuth approval inside the popup before closing it, then click Refresh to try again.`,
            });
        } else {
            setMktSyncMessage({ tone: 'info', text: 'Connected accounts refreshed.' });
        }
    }, [syncMarketingAccounts]);

    const handleManualSync = useCallback(() => runResilientSync({ platform: null, expectNew: false }), [runResilientSync]);

    // Whenever a fresh summary lands (or the week changes), seed the local
    // scheduled-content list. We key the localStorage entry by user + week
    // so edits roll forward week-to-week and don't bleed across users.
    const userIdForKeys = useMemo(() => {
        try { return JSON.parse(localStorage.getItem('user') || '{}')?._id || ''; }
        catch (_) { return ''; }
    }, []);
    // Bump this version when the seeded scheduled-row shape changes so
    // users pick up the new rich fields without manually clearing storage.
    const SCHEDULED_STORAGE_VERSION = 'v2';
    useEffect(() => {
        const cal = mktSummary?.contentCalendar;
        const weekKey = mktSummary?.calendarLabel || '';
        if (!Array.isArray(cal) || !weekKey) {
            setMktScheduled(null);
            return;
        }
        const storageKey = `mkt_scheduled_${SCHEDULED_STORAGE_VERSION}_${userIdForKeys}_${weekKey}`;
        let saved = null;
        try { saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch (_) {}
        if (Array.isArray(saved) && saved.length) {
            setMktScheduled(saved);
            return;
        }
        const seeded = cal.map((row, idx) => ({
            ...row,
            id: row.id || `srv_${idx}_${row.day || 'x'}`,
        }));
        setMktScheduled(seeded);
        try { localStorage.setItem(storageKey, JSON.stringify(seeded)); } catch (_) {}
    }, [mktSummary?.calendarLabel, mktSummary?.contentCalendar, userIdForKeys]);

    const persistScheduled = useCallback((rows) => {
        const weekKey = mktSummary?.calendarLabel;
        if (!weekKey) return;
        const storageKey = `mkt_scheduled_${SCHEDULED_STORAGE_VERSION}_${userIdForKeys}_${weekKey}`;
        try { localStorage.setItem(storageKey, JSON.stringify(rows)); } catch (_) {}
    }, [mktSummary?.calendarLabel, userIdForKeys]);

    const handleSavePost = useCallback((draft) => {
        if (!draft || (!draft.post && !draft.title && !draft.content)) return;
        const safe = {
            day: draft.day || 'Mon',
            post: String(draft.post || draft.title || draft.content || '').trim(),
            market: String(draft.market || '').trim() || '—',
            platform: String(draft.platform || 'Facebook').trim(),
            status: draft.status || 'Scheduled',
            tone: draft.status === 'Posted' ? 'muted' : (draft.status === 'Draft' || draft.status === 'Approval' ? 'warn' : 'ok'),
            // Rich fields from the composer — kept on the row so Edit can
            // round-trip caption/media/property selection back into the form.
            title: draft.title || '',
            content: draft.content || '',
            hashtags: draft.hashtags || '',
            mediaUrl: draft.mediaUrl || '',
            propertyId: draft.propertyId || '',
            platformIds: Array.isArray(draft.platformIds) ? draft.platformIds : [],
            schedule: draft.schedule || null,
            scheduleLabel: draft.scheduleLabel || '',
        };
        setMktScheduled((prev) => {
            const list = prev || [];
            let next;
            if (draft.id) {
                next = list.map((r) => r.id === draft.id ? { ...r, ...safe, id: draft.id } : r);
            } else {
                next = [...list, { ...safe, id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 6)}` }];
            }
            persistScheduled(next);
            return next;
        });
        setMktComposer(null);
    }, [persistScheduled]);

    const handleDeletePost = useCallback((id) => {
        setMktScheduled((prev) => {
            const next = (prev || []).filter((r) => r.id !== id);
            persistScheduled(next);
            return next;
        });
    }, [persistScheduled]);

    /**
     * Adds a synthetic "connected" account on the user's profile without
     * doing a real OAuth handshake. Useful for demos and for environments
     * where the Outstand / Meta credentials aren't set up yet — the rest
     * of the marketing dashboard (KPIs, calendar, recent posts, composer)
     * can then be exercised end-to-end.
     */
    const handleMockConnect = useCallback(async (platform) => {
        setMktSyncMessage(null);
        setMktSyncBusy(true);
        try {
            const res = await api.post('/api/enterprise/marketing', { action: 'mock-connect', platform });
            const accounts = res.data?.connectedAccounts || [];
            const summary = res.data?.marketingSummary || null;
            setMktAccounts(accounts);
            setMktSummary(summary);
            const prev = getMarketingCache(mktCacheKey) || {};
            setMarketingCache(mktCacheKey, { accounts, networks: prev.networks || [], summary });
            const platformLabel = PLATFORM_META[platform]?.label || platform;
            setMktSyncMessage({ tone: 'success', text: `Added a demo ${platformLabel} account and seeded the dashboard with sample posts based on your listings. Disconnect any time.` });
        } catch (err) {
            setMktSyncMessage({ tone: 'warning', text: err.response?.data?.message || 'Could not add a demo account.' });
        } finally {
            setMktSyncBusy(false);
        }
    }, [mktCacheKey]);

    // Listen for the popup's "outstand:connected" postMessage (sent from
    // OutstandOAuthCallback after successful finalize). When received, close
    // the popup if still open and refresh the connected-accounts list.
    // NOTE: must be declared *after* runResilientSync to avoid a TDZ
    // ReferenceError on first render (the deps array is read at call time).
    useEffect(() => {
        const onMessage = async (event) => {
            if (event.origin !== window.location.origin) return;
            if (event.data?.type !== 'outstand:connected') return;
            if (mktPollRef.current) {
                clearInterval(mktPollRef.current);
                mktPollRef.current = null;
            }
            const popup = mktPopupRef.current;
            if (popup && !popup.closed) {
                try { popup.close(); } catch (_) { /* ignore */ }
            }
            mktPopupRef.current = null;
            const platform = mktConnecting;
            setMktConnecting(null);
            await runResilientSync({ platform, expectNew: true });
        };
        window.addEventListener('message', onMessage);
        return () => window.removeEventListener('message', onMessage);
    }, [runResilientSync, mktConnecting]);

    const handleConnectPlatform = useCallback(async (platform) => {
        setMktConnecting(platform);
        setMktSyncMessage(null);
        try {
            // Outstand redirects to its registered callback path which our
            // OutstandOAuthCallback page handles (calls /finalize, then posts a
            // message back to this window). Pass that page as the redirect URI
            // so Outstand always lands the popup somewhere we control.
            const redirectUri = `${window.location.origin}/outstand/oauth-callback`;
            const res = await api.post('/api/enterprise/marketing', { action: 'auth-url', platform, redirectUri });
            if (res.data?.authUrl) {
                // Diagnostic: log the URL we open. If this points to instagram.com
                // directly (instead of facebook.com/v.../dialog/oauth or similar),
                // Outstand's Meta app is not configured to issue an OAuth consent
                // and the connection cannot succeed without fixing it on their side.
                console.info('[outstand] opening auth URL for', platform, '→', res.data.authUrl);
                const w = 600, h = 700;
                const left = window.screenX + (window.outerWidth - w) / 2;
                const top = window.screenY + (window.outerHeight - h) / 2;
                const popup = window.open(res.data.authUrl, 'outstand_oauth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);
                mktPopupRef.current = popup;
                if (mktPollRef.current) clearInterval(mktPollRef.current);
                mktPollRef.current = setInterval(async () => {
                    try {
                        if (!popup || popup.closed) {
                            clearInterval(mktPollRef.current);
                            mktPollRef.current = null;
                            mktPopupRef.current = null;
                            setMktConnecting(null);
                            // Popup closed (whether the user finished OAuth or
                            // just dismissed it). Aggressively retry sync — if
                            // they did complete the flow, Outstand may still be
                            // resolving the page list.
                            await runResilientSync({ platform, expectNew: true });
                            return;
                        }
                        // Same-origin URL checks: if the popup ends up on our
                        // marketing page (e.g. ?outstand=connected) or carries
                        // the legacy oauth_callback=1 query, treat it as done.
                        let popupUrl = '';
                        try { popupUrl = popup.location.href; } catch (_) { return; }
                        if (!popupUrl) return;
                        if (popupUrl.includes('oauth_callback=1') || popupUrl.includes('outstand=connected')) {
                            try { popup.close(); } catch (_) { /* ignore */ }
                            clearInterval(mktPollRef.current);
                            mktPollRef.current = null;
                            mktPopupRef.current = null;
                            setMktConnecting(null);
                            await runResilientSync({ platform, expectNew: true });
                        }
                    } catch (_) { /* cross-origin - ignore until redirect back */ }
                }, 500);
            }
        } catch (err) {
            console.error('Connect platform error:', err);
            setMktConnecting(null);
            setMktSyncMessage({ tone: 'warning', text: err.response?.data?.message || 'Could not start the connection. Please try again.' });
        }
    }, [runResilientSync]);

    const handleDisconnect = useCallback(async (outstandAccountId) => {
        try {
            const res = await api.post('/api/enterprise/marketing', { action: 'disconnect', outstandAccountId });
            const accounts = res.data?.connectedAccounts || [];
            const summary = res.data?.marketingSummary || null;
            setMktAccounts(accounts);
            setMktSummary(summary);
            const prev = getMarketingCache(mktCacheKey) || {};
            setMarketingCache(mktCacheKey, { accounts, networks: prev.networks || [], summary });
        } catch (err) {
            console.error('Disconnect error:', err);
        }
    }, []);

    const renderMainDash = () => {
        if (dashLoading) return <LogoLoading message="Loading dashboard..." style={{ minHeight: '40vh' }} />;
        return renderDashboard(isMobile, dashData, fmtVal);
    };

    return (
        <div className="dashboard-container" style={{ background: '#ffffff' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ padding: isMobile ? '14px' : '18px 22px' }}>
                {activeTab === 'country'
                    ? (dashLoading ? <LogoLoading message="Loading country data..." style={{ minHeight: '40vh' }} /> : renderCountry(isMobile, dashData, fmtVal))
                    : activeTab === 'franchise'
                        ? (dashLoading ? <LogoLoading message="Loading franchise data..." style={{ minHeight: '40vh' }} /> : renderFranchise(isMobile, dashData, fmtVal))
                        : activeTab === 'branch'
                            ? (dashLoading ? <LogoLoading message="Loading branch data..." style={{ minHeight: '40vh' }} /> : renderBranch(isMobile, dashData, fmtVal))
                            : activeTab === 'royalty'
                                ? (dashLoading ? <LogoLoading message="Loading royalty data..." style={{ minHeight: '40vh' }} /> : renderRoyalty(isMobile, dashData, fmtVal))
                                : activeTab === 'compliance'
                                    ? renderCompliance(isMobile, dashData)
                                    : activeTab === 'portal'
                                        ? renderPortalSyndication(isMobile, dashData)
                                        : activeTab === 'marketing'
                                            ? (mktLoading ? <LogoLoading message="Loading marketing..." style={{ minHeight: '40vh' }} /> : renderEnterpriseMarketing(isMobile, {
                                                accounts: mktAccounts,
                                                networks: mktNetworks,
                                                showPicker: mktShowPicker,
                                                setShowPicker: setMktShowPicker,
                                                onConnectPlatform: handleConnectPlatform,
                                                onDisconnect: handleDisconnect,
                                                connectingPlatform: mktConnecting,
                                                onSyncAccounts: handleManualSync,
                                                onMockConnect: handleMockConnect,
                                                syncBusy: mktSyncBusy,
                                                syncMessage: mktSyncMessage,
                                                onDismissSyncMessage: () => setMktSyncMessage(null),
                                                summary: mktSummary,
                                                scheduledRows: mktScheduled,
                                                composer: mktComposer,
                                                onOpenComposer: (mode, row) => setMktComposer({ mode: mode || 'create', draft: row || { day: 'Mon', post: '', market: '', platform: 'Facebook', status: 'Scheduled' } }),
                                                onCloseComposer: () => setMktComposer(null),
                                                onSavePost: handleSavePost,
                                                onDeletePost: handleDeletePost,
                                                selectedPost: mktSelectedPost,
                                                onSelectPost: setMktSelectedPost,
                                                onClosePost: () => setMktSelectedPost(null),
                                            }, dashData))
                                            : activeTab === 'vault'
                                                ? renderEnterpriseVault(isMobile)
                                                : renderMainDash()}
            </main>
        </div>
    );
};

export default EnterpriseDashboard;

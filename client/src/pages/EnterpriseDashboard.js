import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Sidebar from '../components/Sidebar';
import { useIsMobile } from '../hooks/useMediaQuery';
import api from '../config/api';
import LogoLoading from '../components/LogoLoading';
import { usePreferences, convertCurrency } from '../context/PreferencesContext';

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
        { label: 'Royalties [MTD]', value: '—' }
    ];

    const mapPins = countries
        .map(c => { const m = getCountryMeta(c.country); return m.mapTop ? { code: m.code, flag: m.flag, top: m.mapTop, left: m.mapLeft, bg: m.bg || 'rgba(16,87,92,0.75)', size: m.mapSize } : null; })
        .filter(Boolean);

    const topAgents = agents.slice(0, 4).map((a, i) => ({
        rank: i + 1, name: a.name || 'Agent', sub: a.franchise || '', gtv: fmtVal(a.totalSales || 0)
    }));

    return (
        <>
            <InsightsBanner text="Suggestions based on platform activity..." />

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
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, flex: 1, alignItems: 'center', justifyContent: 'center' }}>
                        <p style={{ color: '#8B8F94', fontSize: FONT_SIZE.sub }}>No alerts at this time.</p>
                    </div>
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
                            <span>Branch → Franchise <span style={{ color: '#C9951C' }}>3%</span></span>
                            <span>Franchise → Country <span style={{ color: '#C9951C' }}>5%</span></span>
                            <span>Country → Global HQ <span style={{ color: '#C9951C' }}>1.5%</span></span>
                        </div>
                        <div style={{ padding: '24px 0', textAlign: 'center', color: '#8B8F94', fontSize: FONT_SIZE.sub }}>
                            No royalty flow data available yet.
                        </div>
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
                                        <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: '#060606' }}>—</div>
                                    </div>
                                    <div style={{ textAlign: 'right', minWidth: 50 }}>
                                        <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: '#C9951C' }}>—</div>
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
        <InsightsBanner text="Suggestions based on platform activity..." />
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
        <InsightsBanner text="Suggestions based on platform activity..." />
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
        <InsightsBanner text="Suggestions based on platform activity..." />
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
            <InsightsBanner text="Suggestions based on platform activity..." />

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

const renderCompliance = (isMobile) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity, vault signals, and regulatory calendars." />

        <section style={{ ...card, padding: 12, marginBottom: GAP.section, background: '#EBEBEB', border: 'none', boxShadow: 'none' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 8 }}>
                {complianceKpis.map((k) => (
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
                    <span style={{ background: '#FFCFC5', color: '#A4260E', borderRadius: 20, fontSize: FONT_SIZE.button, fontWeight: 700, padding: '5px 14px', whiteSpace: 'nowrap' }}>3 Critical</span>
                </div>
                <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }}>
                    {criticalIssues.map((row, idx) => (
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
                    {complianceByMarket.map((m) => (
                        <div key={m.code} style={{ display: 'grid', gridTemplateColumns: '72px 1fr 44px', alignItems: 'center', gap: 12 }}>
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
                            {vaultReviewRows.map((r) => (
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
                    {regulatoryFrameworks.map((f, idx) => (
                        <li key={f.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '14px 0', borderTop: idx ? '1px solid #F1F2F4' : 'none', fontSize: FONT_SIZE.body }}>
                            <span style={{ fontWeight: 600, color: '#060606' }}>{f.name}</span>
                            {f.tone === 'ok'
                                ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#10575C', fontWeight: 700, fontSize: FONT_SIZE.body }}><i className="fas fa-check-circle" aria-hidden /> Active</span>
                                : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#A65F0A', fontWeight: 700, fontSize: FONT_SIZE.body }}><i className="fas fa-exclamation-triangle" aria-hidden /> {f.detail}</span>
                            }
                        </li>
                    ))}
                </ul>
            </article>
        </section>
    </>
);

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

const renderPortalSyndication = (isMobile) => {
    const maxListings = Math.max(...portalListingsByMarket.map((m) => m.count), 1);
    return (
        <>
            <InsightsBanner text="Suggestions based on platform activity, portal health, and syndication queues." />

            <section style={{ ...card, padding: 12, marginBottom: GAP.section, background: '#EBEBEB', border: 'none', boxShadow: 'none' }}>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 8 }}>
                    {portalKpis.map((k) => (
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
                                    <th style={{ textAlign: 'right', padding: '10px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', fontSize: FONT_SIZE.tableHeader }}>Listings</th>
                                    <th style={{ textAlign: 'right', padding: '10px 8px', color: '#8B8F94', fontWeight: 700, textTransform: 'uppercase', fontSize: FONT_SIZE.tableHeader }}>Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {portalStatusRows.map((row) => {
                                    const pill = portalStatusPill(row.status);
                                    return (
                                        <tr key={row.portal} style={{ borderBottom: '1px solid #F1F2F4' }}>
                                            <td style={{ padding: '12px 8px', fontWeight: 600, color: '#060606' }}>{row.portal}</td>
                                            <td style={{ padding: '12px 8px', textAlign: 'right', color: '#384046' }}>{row.listings}</td>
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
                        <span style={{ background: '#FFCFC5', color: '#A4260E', borderRadius: 20, fontSize: FONT_SIZE.button, fontWeight: 700, padding: '5px 14px', whiteSpace: 'nowrap' }}>18 pending</span>
                    </div>
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }}>
                        {portalPendingActions.map((row, idx) => (
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
                        {portalListingsByMarket.map((m) => (
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
                        {portalAiFeatures.map((f, idx) => (
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

const renderEnterpriseMarketing = (isMobile, mktState) => {
    const { accounts = [], networks = [], showPicker, setShowPicker, onConnectPlatform, onDisconnect, connectingPlatform } = mktState;
    const kpis = { reach: 0, engagementRate: 0, linkClicks: 0, leadInquiries: 0 };
    const recentPosts = [];
    const calendarDays = getWeekDays();

    const kpiCards = [
        { label: 'Reach', value: kpis.reach > 0 ? Number(kpis.reach).toLocaleString() : '—', delta: accounts.length > 0 ? 'From connected accounts' : 'Connect accounts to track', variant: accounts.length > 0 ? 'teal' : 'muted' },
        { label: 'Engagement rate', value: kpis.engagementRate > 0 ? `${kpis.engagementRate}%` : '—', delta: accounts.length > 0 ? 'Across platforms' : '—', variant: kpis.engagementRate > 0 ? 'teal' : 'muted' },
        { label: 'Link clicks', value: kpis.linkClicks > 0 ? Number(kpis.linkClicks).toLocaleString() : '—', delta: accounts.length > 0 ? 'Tracked via Outstand' : '—', variant: kpis.linkClicks > 0 ? 'teal' : 'muted' },
        { label: 'Lead inquiries', value: kpis.leadInquiries > 0 ? String(kpis.leadInquiries) : '—', delta: accounts.length > 0 ? 'From social channels' : '—', variant: kpis.leadInquiries > 0 ? 'teal' : 'muted' },
    ];

    return (
    <>
        <InsightsBanner text="Suggestions based on platform activity, campaign performance, and content gaps." />

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

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.05fr 0.95fr', gap: GAP.section, marginBottom: GAP.section }}>
            <div style={{ display: 'grid', gap: GAP.section }}>
                <article style={{ ...card, padding: GAP.card, position: 'relative' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 10, flexWrap: 'wrap' }}>
                        <h2 style={sectionHeading}>Manage Accounts</h2>
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
                    {showPicker && (
                        <div style={{ marginBottom: 12, padding: 12, background: '#F9FAFB', borderRadius: 14, border: '1px solid #E1E1E1' }}>
                            <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#384046', marginBottom: 8 }}>Select a platform to connect:</div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                {networks.map((net) => {
                                    const pm = PLATFORM_META[net.network] || { label: net.network, icon: 'fa-globe', color: '#8B8F94' };
                                    const alreadyConnected = accounts.some(a => a.platform === net.network);
                                    const isConnecting = connectingPlatform === net.network;
                                    return (
                                        <button
                                            key={net.id}
                                            type="button"
                                            disabled={isConnecting}
                                            onClick={() => !alreadyConnected && onConnectPlatform(net.network)}
                                            style={{
                                                display: 'inline-flex', alignItems: 'center', gap: 8, padding: '8px 14px',
                                                borderRadius: 12, border: '2px solid ' + (alreadyConnected ? '#10B981' : '#E1E1E1'),
                                                background: alreadyConnected ? '#ECFDF5' : '#fff', cursor: alreadyConnected ? 'default' : 'pointer',
                                                opacity: isConnecting ? 0.6 : 1, fontFamily: FONT, fontSize: FONT_SIZE.sub,
                                            }}
                                        >
                                            <i className={`fab ${pm.icon}`} style={{ fontSize: 16, color: pm.color }} aria-hidden />
                                            <span style={{ fontWeight: 600, color: '#384046' }}>{pm.label}</span>
                                            {alreadyConnected && <i className="fas fa-check-circle" style={{ fontSize: 12, color: '#10B981' }} aria-hidden />}
                                            {isConnecting && <span style={{ fontSize: 10, color: '#8B8F94' }}>Connecting...</span>}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                    {accounts.length > 0 ? (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {accounts.map((acct) => {
                                const pm = PLATFORM_META[acct.platform] || { label: acct.platform, icon: 'fa-globe', color: '#8B8F94' };
                                return (
                                    <div key={acct.outstandAccountId || acct._id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#F4F5F6', borderRadius: 20, padding: '6px 14px 6px 10px' }}>
                                        <i className={`fab ${pm.icon}`} style={{ fontSize: 14, color: pm.color }} aria-hidden />
                                        <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#384046' }}>{acct.username || pm.label}</span>
                                        <span style={{ fontSize: 9, color: '#10B981', fontWeight: 700 }}>Connected</span>
                                        <button type="button" onClick={() => onDisconnect(acct.outstandAccountId)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginLeft: 2 }}>
                                            <i className="fas fa-times" style={{ fontSize: 10, color: '#D93025' }} aria-hidden />
                                        </button>
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

                <article style={{ ...card, padding: GAP.card }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 10, marginBottom: 8, flexWrap: 'wrap' }}>
                        <h2 style={sectionHeading}>Content calendar</h2>
                        <span style={{ fontSize: FONT_SIZE.body, fontWeight: 600, color: '#8B8F94' }}>{getWeekLabel()}</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(7, minmax(72px, 1fr))' : 'repeat(7, minmax(0, 1fr))', gap: 6, overflowX: isMobile ? 'auto' : undefined, WebkitOverflowScrolling: 'touch', paddingBottom: isMobile ? 4 : 0 }}>
                        {calendarDays.map((d) => (
                            <div key={d.day} style={{ border: '2px solid #E1E1E1', borderRadius: 14, background: '#fafbfc', minHeight: 64, padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                                <div style={{ fontSize: FONT_SIZE.small, fontWeight: 700, color: '#8B8F94', textTransform: 'uppercase' }}>{d.day}</div>
                                <div style={{ fontSize: 15, fontWeight: 300, color: '#10575C', lineHeight: 1 }}>{d.date}</div>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginTop: 'auto' }}>
                                    {(d.slots || []).map((s) => (
                                        <span key={s.label} style={{ fontSize: 9, fontWeight: 700, padding: '4px 5px', borderRadius: 6, background: s.bg, color: s.fg, textAlign: 'center', lineHeight: 1.2 }}>{s.label}</span>
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                </article>
            </div>

            <article style={{ ...card, padding: GAP.card }}>
                <h2 style={{ ...sectionHeading, marginBottom: GAP.section }}>Recent posts</h2>
                {recentPosts.length > 0 ? (
                    <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'grid', gap: 0 }}>
                        {recentPosts.map((p, idx) => (
                            <li key={p.id || idx} style={{ display: 'grid', gridTemplateColumns: isMobile ? '56px 1fr' : '72px 1fr auto', gap: 14, alignItems: 'center', padding: '14px 0', borderTop: idx ? '1px solid #F1F2F4' : 'none' }}>
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

        <article style={{ ...card, padding: GAP.card, minHeight: isMobile ? 160 : 200, position: 'relative' }}>
            <h2 style={sectionHeading}>Post creation</h2>
            <p style={{ margin: '14px 0 0', fontSize: FONT_SIZE.sectionHeading, color: '#8B8F94', maxWidth: 480, lineHeight: 1.5 }}>
                Compose, schedule, and publish across channels from one workspace. Connect accounts to enable live posting.
            </p>
        </article>
    </>
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

    const [mktAccounts, setMktAccounts] = useState([]);
    const [mktNetworks, setMktNetworks] = useState([]);
    const [mktShowPicker, setMktShowPicker] = useState(false);
    const [mktConnecting, setMktConnecting] = useState(null);
    const [mktLoading, setMktLoading] = useState(activeTab === 'marketing');

    useEffect(() => {
        if (!needsData.includes(activeTab)) return;
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
        if (activeTab !== 'marketing') return;
        let cancelled = false;
        setMktLoading(true);
        (async () => {
            try {
                const [acctRes, netRes] = await Promise.all([
                    api.get('/api/enterprise/marketing?action=accounts'),
                    api.get('/api/enterprise/marketing?action=networks'),
                ]);
                if (!cancelled) {
                    setMktAccounts(acctRes.data?.connectedAccounts || []);
                    setMktNetworks(netRes.data?.networks || []);
                }
            } catch (err) {
                console.error('Marketing data fetch error:', err);
            } finally {
                if (!cancelled) setMktLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [activeTab]);

    const handleConnectPlatform = useCallback(async (platform) => {
        setMktConnecting(platform);
        try {
            const currentUrl = window.location.href.split('?')[0];
            const redirectUri = currentUrl + '?oauth_callback=1';
            const res = await api.post('/api/enterprise/marketing', { action: 'auth-url', platform, redirectUri });
            if (res.data?.authUrl) {
                const w = 600, h = 700;
                const left = window.screenX + (window.outerWidth - w) / 2;
                const top = window.screenY + (window.outerHeight - h) / 2;
                const popup = window.open(res.data.authUrl, 'outstand_oauth', `width=${w},height=${h},left=${left},top=${top},toolbar=no,menubar=no`);
                const pollTimer = setInterval(async () => {
                    try {
                        if (!popup || popup.closed) {
                            clearInterval(pollTimer);
                            setMktConnecting(null);
                            try {
                                const syncRes = await api.post('/api/enterprise/marketing', { action: 'sync-accounts' });
                                setMktAccounts(syncRes.data?.connectedAccounts || []);
                            } catch (e) { console.error('Sync error:', e); }
                            return;
                        }
                        const popupUrl = popup.location.href;
                        if (popupUrl && popupUrl.includes('oauth_callback=1')) {
                            popup.close();
                            clearInterval(pollTimer);
                            setMktConnecting(null);
                            const syncRes = await api.post('/api/enterprise/marketing', { action: 'sync-accounts' });
                            setMktAccounts(syncRes.data?.connectedAccounts || []);
                        }
                    } catch (_) { /* cross-origin - ignore until redirect back */ }
                }, 500);
            }
        } catch (err) {
            console.error('Connect platform error:', err);
            setMktConnecting(null);
        }
    }, []);

    const handleDisconnect = useCallback(async (outstandAccountId) => {
        try {
            const res = await api.post('/api/enterprise/marketing', { action: 'disconnect', outstandAccountId });
            setMktAccounts(res.data?.connectedAccounts || []);
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
                                    ? renderCompliance(isMobile)
                                    : activeTab === 'portal'
                                        ? renderPortalSyndication(isMobile)
                                        : activeTab === 'marketing'
                                            ? (mktLoading ? <LogoLoading message="Loading marketing..." style={{ minHeight: '40vh' }} /> : renderEnterpriseMarketing(isMobile, {
                                                accounts: mktAccounts,
                                                networks: mktNetworks,
                                                showPicker: mktShowPicker,
                                                setShowPicker: setMktShowPicker,
                                                onConnectPlatform: handleConnectPlatform,
                                                onDisconnect: handleDisconnect,
                                                connectingPlatform: mktConnecting,
                                            }))
                                            : activeTab === 'vault'
                                                ? renderEnterpriseVault(isMobile)
                                                : renderMainDash()}
            </main>
        </div>
    );
};

export default EnterpriseDashboard;

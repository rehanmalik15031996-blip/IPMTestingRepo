import React, { useEffect } from 'react';
import Sidebar from '../components/Sidebar';
import { useIsMobile } from '../hooks/useMediaQuery';

const FONT = "'Poppins', sans-serif";
const GAP = { section: 14, card: 16 };
const FONT_SIZE = {
    sectionHeading: 14, cardHeading: 11, kpiLabel: 10, kpiValue: 28, kpiDelta: 10,
    tableHeader: 11, tableBody: 13, body: 13, sub: 11, small: 10, badge: 11, button: 12,
};

const card = { background: '#fff', border: '2px solid #E1E1E1', borderRadius: 20, boxShadow: '0 4px 16px rgba(6,6,6,0.04)' };
const sectionHeading = { margin: 0, fontSize: FONT_SIZE.sectionHeading, color: '#C2C3C3', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' };
const cardHeading = { margin: 0, fontSize: FONT_SIZE.cardHeading, color: '#8B8F94', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' };

const InsightsBanner = ({ text }) => (
    <section style={{
        display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between',
        gap: 14, padding: '0 24px', marginBottom: GAP.section, borderRadius: 20,
        background: '#D2E4E5', border: 'none', height: 80, minHeight: 80
    }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, minWidth: 0, flex: 1 }}>
            <img src="/enterprise-assets/centralized-network.svg" alt="" style={{ width: 22, height: 46, flexShrink: 0, objectFit: 'contain' }} />
            <p style={{ margin: 0, fontSize: 14, color: '#4E4E4E', lineHeight: 1.4, fontWeight: 300 }}>
                IPM insights + {text}
            </p>
        </div>
        <button type="button" style={{
            border: 'none', borderRadius: 20, height: 40, padding: '0 24px', fontSize: FONT_SIZE.body,
            fontWeight: 400, cursor: 'pointer', background: '#FBFBFB', color: '#10575C',
            display: 'inline-flex', alignItems: 'center', gap: 10, flexShrink: 0, fontFamily: FONT
        }}>
            Take Action <i className="fas fa-arrow-right" style={{ fontSize: 13 }} aria-hidden />
        </button>
    </section>
);

const kpiDeltaStyle = (k) => {
    const base = { fontSize: FONT_SIZE.kpiDelta, borderRadius: 20, padding: '3px 10px', display: 'inline-block', fontWeight: 600, whiteSpace: 'nowrap' };
    if (k.muted) return { ...base, color: '#6B7280', background: 'transparent', padding: '3px 0' };
    if (k.danger) return { ...base, color: '#A4260E', background: '#FFCFC5' };
    if (k.tone === 'yellow') return { ...base, color: '#8A5F0A', background: 'rgba(231,161,26,0.22)' };
    return { ...base, color: '#10575C', background: '#D2E4E5' };
};

const KpiSection = ({ isMobile, cards }) => (
    <section style={{ ...card, padding: 12, marginBottom: GAP.section, background: '#EBEBEB', border: 'none', boxShadow: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : `repeat(${cards.length},minmax(0,1fr))`, gap: 8 }}>
            {cards.map((k) => (
                <article key={k.label} style={{ background: '#fff', borderRadius: 16, padding: '10px 12px 9px', overflow: 'hidden' }}>
                    <div style={{ fontSize: FONT_SIZE.kpiLabel, color: '#4E4E4E', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
                    <div style={{ fontSize: FONT_SIZE.kpiValue, lineHeight: 1.1, fontWeight: 600, color: k.danger ? '#A4260E' : (k.valueColor || '#10575C'), margin: '6px 0 6px' }}>{k.value}</div>
                    <div style={kpiDeltaStyle(k)}>{k.delta}</div>
                </article>
            ))}
        </div>
    </section>
);

/* ───────── TAB 1: DASHBOARD ───────── */
const dashboardKpis = [
    { label: 'Active', value: '16', delta: '+1 this month' },
    { label: 'Applications [MTD]', value: '28', delta: '+6 this month' },
    { label: 'Registered', value: '12', delta: '+13 this month' },
    { label: 'Avg Days to Reg.', value: '74%', delta: '-2% this month', danger: true },
    { label: 'Fees Earned [MTD]', value: 'R4.1M', delta: '+12% this month' },
    { label: 'Awaiting Docs', value: '3', delta: 'Action needed', tone: 'yellow' },
];

const pipelineColumns = [
    { label: 'OTP Received', count: 24, cards: [
        { name: 'Smith — Clifton', value: 'R12.4M', sub: 'Agent: S. Joubert' },
        { name: 'Johnson — Gardens', value: 'R4.8M', sub: 'Agent: P. Botha' },
    ]},
    { label: 'FICA + Docs', count: 46, cards: [
        { name: 'van der Berg', value: 'R8.2M', sub: 'Stellenbosch' },
        { name: 'A. Mokoena', value: 'R3.1M', sub: 'Docs outstanding', warn: true },
    ]},
    { label: 'Bond + Guarantees', count: 23, cards: [
        { name: 'Pillay — Seapoint', value: 'R6.4M', sub: 'FNB Bond granted' },
    ]},
    { label: 'Transfer Lodged', count: 30, cards: [
        { name: 'Du Plessis', value: 'R5.7M', sub: 'Lodged: 02 Apr 2026' },
    ]},
    { label: 'Registered', count: 123, registered: true, cards: [
        { name: 'Nel — Constantia', value: 'R9.8M', sub: 'Reg: 04 Apr 2026 ✓' },
    ]},
];

const recentActivity = [
    { text: 'OTP received — Smith, Clifton R12.4M', time: '2 min ago', icon: 'fa-file-signature', color: '#10575C' },
    { text: 'FICA docs uploaded — van der Berg', time: '14 min ago', icon: 'fa-upload', color: '#10575C' },
    { text: 'Bond granted — Pillay, Sandpoint', time: '1h ago', icon: 'fa-check-circle', color: '#10B981' },
    { text: 'Transfer lodged — Du Plessis R5.7M', time: '3h ago', icon: 'fa-building', color: '#C9951C' },
    { text: 'Registration complete — Nel R9.8M', time: 'Yesterday', icon: 'fa-flag-checkered', color: '#10B981' },
];

const renderDashboard = (isMobile) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={dashboardKpis} />

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.55fr 0.45fr', gap: GAP.section, marginBottom: GAP.section }}>
            <article style={{ ...card, padding: 0, overflow: 'hidden' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                    <h3 style={sectionHeading}>Transfer Pipeline</h3>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${pipelineColumns.length}, 1fr)`, gap: 0 }}>
                    {pipelineColumns.map((col) => (
                        <div key={col.label} style={{
                            borderRight: '1px solid #F1F2F4',
                            background: col.registered ? 'rgba(16,185,129,0.08)' : '#FAFBFC',
                            padding: '12px 10px 14px',
                            display: 'flex', flexDirection: 'column', gap: 8, minHeight: 180
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                                <span style={{ fontSize: 9, color: col.registered ? '#10B981' : '#8B8F94', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em' }}>
                                    {col.label}{col.registered && ' ✓'}
                                </span>
                                <span style={{ fontSize: 9, fontWeight: 700, color: '#fff', background: col.registered ? '#10B981' : '#10575C', borderRadius: 20, padding: '2px 8px', minWidth: 20, textAlign: 'center' }}>{col.count}</span>
                            </div>
                            {col.cards.map((c) => (
                                <div key={c.name} style={{
                                    padding: '10px 12px', borderRadius: 10, background: '#fff',
                                    border: '1px solid #E8E8E8', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                    borderLeft: c.warn ? '3px solid #E8922A' : '1px solid #E8E8E8'
                                }}>
                                    <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606', lineHeight: 1.3 }}>
                                        {c.warn && <span style={{ color: '#E8922A', marginRight: 4 }}>⚠</span>}
                                        {c.name}
                                    </div>
                                    <div style={{ fontSize: FONT_SIZE.body, fontWeight: 700, color: c.warn ? '#D93025' : '#C9951C', marginTop: 3 }}>{c.value}</div>
                                    <div style={{ fontSize: 9, color: c.warn ? '#D93025' : '#8B8F94', marginTop: 2 }}>{c.sub}</div>
                                </div>
                            ))}
                        </div>
                    ))}
                </div>
            </article>

            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                    <h3 style={sectionHeading}>Recent Activity</h3>
                </div>
                <div style={{ flex: 1, padding: '0 16px 12px' }}>
                    {recentActivity.map((a, idx) => (
                        <div key={a.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: idx < recentActivity.length - 1 ? '1px solid #F1F2F4' : 'none' }}>
                            <i className={`fas ${a.icon}`} style={{ fontSize: 12, color: a.color, marginTop: 2, flexShrink: 0 }} aria-hidden />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: FONT_SIZE.sub, color: '#060606', fontWeight: 500, lineHeight: 1.35 }}>{a.text}</div>
                                <div style={{ fontSize: 9, color: '#8B8F94', marginTop: 2 }}>{a.time}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </article>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: GAP.section }}>
            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                    <h3 style={sectionHeading}>Partner Referrals</h3>
                </div>
                <div style={{ flex: 1, padding: '0 16px 12px' }}>
                    {[
                        { from: 'Agent S. Joubert', ref: 'Smith — Clifton', value: 'R12.4M', status: 'Active' },
                        { from: 'Agent P. Botha', ref: 'Johnson — Gardens', value: 'R6.8M', status: 'Pending' },
                        { from: 'Agent N. van Wyk', ref: 'De Villiers — Camps Bay', value: 'R18.2M', status: 'Active' },
                        { from: 'RE/MAX W. Cape', ref: 'Malan — Winelands', value: 'R4.1M', status: 'Registered' },
                    ].map((r, idx) => (
                        <div key={r.ref} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: idx < 3 ? '1px solid #F1F2F4' : 'none' }}>
                            <div>
                                <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606' }}>{r.ref}</div>
                                <div style={{ fontSize: 9, color: '#8B8F94' }}>{r.from}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: '#C9951C' }}>{r.value}</div>
                                <span style={{ fontSize: 9, fontWeight: 700, color: r.status === 'Registered' ? '#10B981' : r.status === 'Active' ? '#10575C' : '#8B8F94', background: r.status === 'Registered' ? '#D2F5E8' : r.status === 'Active' ? '#D2E4E5' : '#F1F2F4', borderRadius: 20, padding: '2px 8px' }}>{r.status}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </article>

            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                    <h3 style={sectionHeading}>Live Activity</h3>
                </div>
                <div style={{ flex: 1, padding: '0 16px 12px' }}>
                    {[
                        { text: 'New OTP instruction from Agent Joubert', time: 'Just now', dot: '#10575C' },
                        { text: 'FICA complete — van der Berg matter', time: '12 min ago', dot: '#10B981' },
                        { text: 'Bond approval notification received', time: '45 min ago', dot: '#C9951C' },
                        { text: 'Transfer duty paid — Du Plessis', time: '2h ago', dot: '#10575C' },
                        { text: 'Client follow-up reminder (3 overdue)', time: '3h ago', dot: '#D93025' },
                    ].map((a, idx) => (
                        <div key={a.text} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: idx < 4 ? '1px solid #F1F2F4' : 'none' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.dot, flexShrink: 0, marginTop: 4 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: FONT_SIZE.sub, color: '#060606', fontWeight: 500 }}>{a.text}</div>
                                <div style={{ fontSize: 9, color: '#8B8F94', marginTop: 2 }}>{a.time}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </article>
        </section>
    </>
);

/* ───────── TAB 2: PIPELINE ───────── */
const pipelineKpis = [
    { label: 'OTP Received', value: '123', delta: '+1 this month' },
    { label: 'Due Diligence', value: '24', delta: '+1 this month' },
    { label: 'Bond Registration', value: '46', delta: '+1 this month' },
    { label: 'Transfer Lodge', value: '23', delta: '+15 this month' },
    { label: 'Registered', value: '30', delta: '+5 this month' },
];

const pipelineTabColumns = ['Instruction Received', 'FICA + Documentation', 'Bond + Guarantees', 'Lodged', 'Registered Properties'];

const renderPipeline = (isMobile) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={pipelineKpis} />

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${pipelineTabColumns.length}, 1fr)`, gap: GAP.section }}>
            {pipelineTabColumns.map((col) => (
                <article key={col} style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', minHeight: 300 }}>
                    <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                        <h3 style={cardHeading}>{col}</h3>
                    </div>
                    <div style={{ flex: 1, padding: '8px 12px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                        {[1, 2, 3].map((i) => (
                            <div key={i} style={{ padding: '10px', borderRadius: 10, background: '#FAFBFC', border: '1px solid #F1F2F4' }}>
                                <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606' }}>Matter #{Math.floor(Math.random() * 900) + 100}</div>
                                <div style={{ fontSize: 9, color: '#8B8F94', marginTop: 2 }}>Agent referral · R{(Math.random() * 12 + 1).toFixed(1)}M</div>
                            </div>
                        ))}
                    </div>
                </article>
            ))}
        </section>
    </>
);

/* ───────── TAB 3: CRM ───────── */
const crmKpis = [
    { label: 'Total Clients', value: '123', delta: '+1 this month' },
    { label: 'Active Matters', value: '24', delta: '+1% this month' },
    { label: 'Fees [MTD]', value: 'R312K', delta: '+1 this month' },
    { label: 'Follow Ups', value: '23', delta: '+15% this month' },
    { label: 'Repeat Clients', value: '14', delta: '+5% this month' },
];

const renderCRM = (isMobile) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={crmKpis} />

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: GAP.section, marginBottom: GAP.section }}>
            <article style={{ ...card, padding: GAP.card, minHeight: 320 }}>
                <h3 style={sectionHeading}>Client Lists</h3>
            </article>

            <div style={{ display: 'grid', gap: GAP.section }}>
                <article style={{ ...card, padding: GAP.card, minHeight: 160 }}>
                    <h3 style={sectionHeading}>Client Type</h3>
                </article>

                <article style={{ ...card, padding: GAP.card, minHeight: 140 }}>
                    <h3 style={sectionHeading}>Follow Ups Today</h3>
                </article>
            </div>
        </section>
    </>
);

/* ───────── TAB 4: IPM PARTNERS ───────── */
const partnersKpis = [
    { label: 'Agents', value: '34', delta: '+1 Engagements' },
    { label: 'Buyers', value: '56', delta: '+1 Engagements' },
    { label: 'Sellers', value: '34', delta: '+1 Engagements' },
    { label: 'Conveyancers', value: '12', delta: '+5 Engagements' },
    { label: 'Banks', value: '5', delta: '+5 Engagements' },
];

const directories = [
    { title: 'Agent Directory', icon: 'fa-user-tie', items: [{ name: 'S. Joubert', org: 'Seeff W. Cape', deals: 14 }, { name: 'P. Botha', org: 'RE/MAX Gauteng', deals: 11 }, { name: 'N. van Wyk', org: 'Seeff Atlantic', deals: 9 }] },
    { title: 'Buyer Directory', icon: 'fa-users', items: [{ name: 'Smith Trust', org: 'Residential', deals: 4 }, { name: 'Pillay Holdings', org: 'Investment', deals: 3 }, { name: 'Johnson Family', org: 'Residential', deals: 2 }] },
    { title: 'Seller Directory', icon: 'fa-home', items: [{ name: 'Nel Investments', org: 'Portfolio seller', deals: 6 }, { name: 'Malan Estate', org: 'Winelands', deals: 3 }] },
    { title: 'Conveyancer Directory', icon: 'fa-gavel', items: [{ name: 'Adams & Partners', org: 'Cape Town', deals: 22 }, { name: 'Du Toit Attorneys', org: 'Johannesburg', deals: 18 }] },
    { title: 'Banks Directory', icon: 'fa-university', items: [{ name: 'FNB Home Loans', org: 'National', deals: 44 }, { name: 'Standard Bank', org: 'National', deals: 38 }] },
];

const renderPartners = (isMobile) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={partnersKpis} />

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: GAP.section, marginBottom: GAP.section }}>
            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                    <h3 style={sectionHeading}>Recent Engagements</h3>
                </div>
                <div style={{ flex: 1, padding: '0 16px 12px' }}>
                    {[
                        { who: 'Agent S. Joubert', action: 'Referred Smith — Clifton transfer', time: '2h ago', color: '#10575C' },
                        { who: 'FNB Home Loans', action: 'Bond approved — Pillay R5.4M', time: '4h ago', color: '#10B981' },
                        { who: 'Buyer — Johnson Family', action: 'New instruction received', time: 'Yesterday', color: '#C9951C' },
                        { who: 'Adams & Partners', action: 'Co-instruction on Malan Estate', time: '2 days ago', color: '#10575C' },
                    ].map((e, idx) => (
                        <div key={e.who + e.action} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: idx < 3 ? '1px solid #F1F2F4' : 'none' }}>
                            <span style={{ width: 8, height: 8, borderRadius: '50%', background: e.color, flexShrink: 0, marginTop: 4 }} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606' }}>{e.who}</div>
                                <div style={{ fontSize: 9, color: '#8B8F94', marginTop: 1 }}>{e.action}</div>
                                <div style={{ fontSize: 9, color: '#8B8F94', marginTop: 1 }}>{e.time}</div>
                            </div>
                        </div>
                    ))}
                </div>
            </article>

            <div style={{ display: 'grid', gap: GAP.section }}>
                {directories.map((d) => (
                    <article key={d.title} style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        <div style={{ padding: '12px 16px 8px', borderBottom: '1px solid #E8E8E8', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <i className={`fas ${d.icon}`} style={{ fontSize: 10, color: '#10575C' }} aria-hidden />
                            <h3 style={cardHeading}>{d.title}</h3>
                        </div>
                        <div style={{ padding: '0 16px 8px' }}>
                            {d.items.map((item, idx) => (
                                <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: idx < d.items.length - 1 ? '1px solid #F1F2F4' : 'none' }}>
                                    <div>
                                        <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606' }}>{item.name}</div>
                                        <div style={{ fontSize: 9, color: '#8B8F94' }}>{item.org}</div>
                                    </div>
                                    <span style={{ fontSize: 9, fontWeight: 700, color: '#10575C', background: '#D2E4E5', borderRadius: 20, padding: '2px 8px' }}>{item.deals} deals</span>
                                </div>
                            ))}
                        </div>
                    </article>
                ))}
            </div>
        </section>
    </>
);

/* ───────── TAB 5: VAULT ───────── */
const vaultKpis = [
    { label: 'Total Documents', value: '147', delta: '+12 this month' },
    { label: 'Awaiting Verification', value: '4', delta: 'Uploaded today', muted: true },
    { label: 'FICA Alerts', value: '31', delta: 'Needs review', danger: true },
    { label: 'Storage Used', value: '2.4 GB', delta: 'of 10GB', muted: true },
];

const renderVault = (isMobile) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={vaultKpis} />

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: GAP.section, marginBottom: GAP.section }}>
            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                    <h3 style={sectionHeading}>FICA & Compliance</h3>
                </div>
                <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: FONT_SIZE.body, color: '#8B8F94', fontStyle: 'italic', textAlign: 'center' }}>Incoming client-supplied documents</p>
                </div>
            </article>

            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                    <h3 style={sectionHeading}>Transfer & Deeds Documents</h3>
                </div>
                <div style={{ flex: 1, padding: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ fontSize: FONT_SIZE.body, color: '#8B8F94', fontStyle: 'italic', textAlign: 'center' }}>All outgoing/completed documents</p>
                </div>
            </article>
        </section>

        <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                <h3 style={sectionHeading}>Document Activity</h3>
            </div>
            <div style={{ flex: 1, padding: '0 16px 12px' }}>
                {[
                    { doc: 'FICA pack — Smith Trust', action: 'Uploaded', time: '10 min ago', icon: 'fa-upload', color: '#10575C' },
                    { doc: 'Bond approval letter — Pillay', action: 'Verified', time: '1h ago', icon: 'fa-check-circle', color: '#10B981' },
                    { doc: 'Transfer duty receipt — Du Plessis', action: 'Filed', time: '3h ago', icon: 'fa-file-alt', color: '#C9951C' },
                    { doc: 'Deed of sale — Nel', action: 'Completed', time: 'Yesterday', icon: 'fa-flag-checkered', color: '#10B981' },
                ].map((d, idx) => (
                    <div key={d.doc} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: idx < 3 ? '1px solid #F1F2F4' : 'none' }}>
                        <i className={`fas ${d.icon}`} style={{ fontSize: 12, color: d.color, marginTop: 2, flexShrink: 0 }} aria-hidden />
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606' }}>{d.doc}</div>
                            <div style={{ fontSize: 9, color: '#8B8F94', marginTop: 2 }}>{d.action} · {d.time}</div>
                        </div>
                    </div>
                ))}
            </div>
        </article>
    </>
);

/* ───────── TAB 6: ADVERTISING ───────── */
const adKpis = [
    { label: 'Monthly Spend', value: 'R4,820', delta: 'R3,180 remaining', muted: true },
    { label: 'Total Impressions', value: '24.1K', delta: '+18% this month' },
    { label: 'Click-Throughs', value: '312', delta: '+9% this month' },
    { label: 'Cost Per Click', value: 'R15.45', delta: '-R3 this month' },
];

const renderAdvertising = (isMobile) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={adKpis} />

        <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column', marginBottom: GAP.section }}>
            <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                <h3 style={sectionHeading}>Ad Previews</h3>
            </div>
            <div style={{ flex: 1, padding: '12px 16px', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 12 }}>
                {[
                    { title: 'Conveyancing services — Cape Town', status: 'Active', impressions: '8.2K', clicks: 124 },
                    { title: 'Transfer specialists — Gauteng', status: 'Active', impressions: '6.4K', clicks: 98 },
                    { title: 'FICA compliance solutions', status: 'Paused', impressions: '3.1K', clicks: 47 },
                ].map((ad) => (
                    <div key={ad.title} style={{ border: '1px solid #F1F2F4', borderRadius: 12, padding: '14px', background: '#FAFBFC' }}>
                        <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606', lineHeight: 1.35 }}>{ad.title}</div>
                        <span style={{ fontSize: 9, fontWeight: 700, color: ad.status === 'Active' ? '#10575C' : '#8B8F94', background: ad.status === 'Active' ? '#D2E4E5' : '#F1F2F4', borderRadius: 20, padding: '2px 8px', display: 'inline-block', marginTop: 6 }}>{ad.status}</span>
                        <div style={{ display: 'flex', gap: 12, marginTop: 8, fontSize: 9, color: '#8B8F94' }}>
                            <span>{ad.impressions} views</span>
                            <span>{ad.clicks} clicks</span>
                        </div>
                    </div>
                ))}
            </div>
        </article>

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: GAP.section, marginBottom: GAP.section }}>
            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                    <h3 style={sectionHeading}>Active Campaigns</h3>
                </div>
                <div style={{ flex: 1, padding: '0 16px 12px' }}>
                    {[
                        { name: 'Brand awareness — W. Cape', budget: 'R2,400', spent: 'R1,680', pct: 70, color: '#10575C' },
                        { name: 'Lead generation — Gauteng', budget: 'R1,800', spent: 'R920', pct: 51, color: '#C9951C' },
                        { name: 'Retargeting — National', budget: 'R620', spent: 'R220', pct: 35, color: '#10B981' },
                    ].map((c) => (
                        <div key={c.name} style={{ padding: '9px 0', borderBottom: '1px solid #F1F2F4' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                                <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606' }}>{c.name}</span>
                                <span style={{ fontSize: 9, color: '#8B8F94' }}>{c.spent} / {c.budget}</span>
                            </div>
                            <div style={{ height: 5, background: '#E8E8E8', borderRadius: 20 }}>
                                <div style={{ width: `${c.pct}%`, height: '100%', borderRadius: 20, background: c.color }} />
                            </div>
                        </div>
                    ))}
                </div>
            </article>

            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                    <h3 style={sectionHeading}>Spend by Placement</h3>
                </div>
                <div style={{ flex: 1, padding: '0 16px 12px' }}>
                    {[
                        { placement: 'IPM Portal Banner', spend: 'R1,840', pct: 38, color: '#10575C' },
                        { placement: 'Search Results', spend: 'R1,290', pct: 27, color: '#C9951C' },
                        { placement: 'Agent Dashboard Sidebar', spend: 'R980', pct: 20, color: '#10B981' },
                        { placement: 'Email Newsletter', spend: 'R710', pct: 15, color: '#E8922A' },
                    ].map((p) => (
                        <div key={p.placement} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #F1F2F4' }}>
                            <div style={{ flex: 1 }}>
                                <span style={{ fontSize: FONT_SIZE.sub, color: '#384046' }}>{p.placement}</span>
                            </div>
                            <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: p.color }}>{p.spend}</span>
                        </div>
                    ))}
                </div>
            </article>
        </section>

        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: GAP.section }}>
            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                    <h3 style={sectionHeading}>Top Performing</h3>
                </div>
                <div style={{ flex: 1, padding: '0 16px 12px' }}>
                    {[
                        { ad: 'Conveyancing services — Cape Town', ctr: '5.2%', cpc: 'R12.30', roi: '+34%' },
                        { ad: 'Transfer specialists — Gauteng', ctr: '3.8%', cpc: 'R14.80', roi: '+22%' },
                        { ad: 'Bond registration experts', ctr: '3.1%', cpc: 'R18.20', roi: '+15%' },
                    ].map((a) => (
                        <div key={a.ad} style={{ padding: '9px 0', borderBottom: '1px solid #F1F2F4' }}>
                            <div style={{ fontSize: FONT_SIZE.sub, fontWeight: 600, color: '#060606', marginBottom: 4 }}>{a.ad}</div>
                            <div style={{ display: 'flex', gap: 14, fontSize: 9, color: '#8B8F94' }}>
                                <span>CTR <strong style={{ color: '#10575C' }}>{a.ctr}</strong></span>
                                <span>CPC <strong style={{ color: '#C9951C' }}>{a.cpc}</strong></span>
                                <span>ROI <strong style={{ color: '#10B981' }}>{a.roi}</strong></span>
                            </div>
                        </div>
                    ))}
                </div>
            </article>

            <article style={{ ...card, padding: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                <div style={{ padding: '14px 16px 10px', borderBottom: '1px solid #E8E8E8' }}>
                    <h3 style={sectionHeading}>Monthly Budget</h3>
                </div>
                <div style={{ flex: 1, padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <span style={{ fontSize: FONT_SIZE.sub, color: '#384046' }}>Budget</span>
                        <span style={{ fontSize: FONT_SIZE.sub, fontWeight: 700, color: '#10575C' }}>R8,000</span>
                    </div>
                    <div style={{ height: 8, background: '#E8E8E8', borderRadius: 20, marginBottom: 12 }}>
                        <div style={{ width: '60%', height: '100%', borderRadius: 20, background: 'linear-gradient(90deg, #10575C, #1a7a80)' }} />
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: '#8B8F94' }}>
                        <span>Spent: <strong style={{ color: '#C9951C' }}>R4,820</strong></span>
                        <span>Remaining: <strong style={{ color: '#10575C' }}>R3,180</strong></span>
                    </div>
                </div>
            </article>
        </section>
    </>
);

/* ───────── MAIN COMPONENT ───────── */
const PartnerDashboard = ({ activeTab = 'dashboard' }) => {
    const isMobile = useIsMobile();

    useEffect(() => {
        document.title = 'Dashboard Partner Conveyancer';
    }, []);

    return (
        <div className="dashboard-container" style={{ background: '#ffffff' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ padding: isMobile ? '14px' : '18px 22px' }}>
                {activeTab === 'pipeline'
                    ? renderPipeline(isMobile)
                    : activeTab === 'crm'
                        ? renderCRM(isMobile)
                        : activeTab === 'partners'
                            ? renderPartners(isMobile)
                            : activeTab === 'vault'
                                ? renderVault(isMobile)
                                : activeTab === 'advertising'
                                    ? renderAdvertising(isMobile)
                                    : renderDashboard(isMobile)}
            </main>
        </div>
    );
};

export default PartnerDashboard;

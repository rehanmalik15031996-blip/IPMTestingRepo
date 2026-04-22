import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useIsMobile } from '../hooks/useMediaQuery';

const FONT = "'Poppins', sans-serif";
const GAP = { section: 14, card: 16 };
const FONT_SIZE = {
    sectionHeading: 14, cardHeading: 11, kpiLabel: 10, kpiValue: 28, kpiDelta: 10,
    tableHeader: 11, tableBody: 13, body: 13, sub: 11, small: 10, badge: 11, button: 12,
};

const card = {
    background: '#fff',
    border: '2px solid #E1E1E1',
    borderRadius: 20,
    boxShadow: '0 4px 16px rgba(6, 6, 6, 0.04)'
};

const sectionHeading = { margin: 0, fontSize: FONT_SIZE.sectionHeading, color: '#C2C3C3', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' };

const kpiDeltaStyle = (k) => {
    const base = { fontSize: FONT_SIZE.kpiDelta, borderRadius: 20, padding: '3px 10px', display: 'inline-block', fontWeight: 600, whiteSpace: 'nowrap' };
    if (k.muted || k.deltaMuted) return { ...base, color: '#6B7280', background: 'transparent', padding: '3px 0' };
    if (k.danger) return { ...base, color: '#A4260E', background: '#FFCFC5' };
    if (k.actionNeeded) return { ...base, color: '#A4260E', background: '#FFCFC5' };
    const tone = k.tone || k.deltaTone || 'teal';
    if (tone === 'yellow') return { ...base, color: '#8A5F0A', background: 'rgba(231,161,26,0.22)' };
    return { ...base, color: '#10575C', background: '#D2E4E5' };
};

const conveyancerMainKpis = [
    { label: 'Active', value: '16', delta: '+1 this month', success: true },
    { label: 'Applications [MTD]', value: '28', delta: '+6 this month', success: true },
    { label: 'Registered', value: '12', delta: '+13 this month', success: true },
    { label: 'Avg. days to reg.', value: '74%', delta: '-2% this month', danger: true },
    { label: 'Fees earned [MTD]', value: 'R4.1M', delta: '+12% this month', success: true },
    { label: 'Awaiting docs', value: '3', delta: 'Action needed', actionNeeded: true }
];

/** Conveyancer Pipeline view (`/conveyancer/pipeline`). */
const conveyancerPipelineSummary = [
    { label: 'OTP received', value: '123', delta: '+1 this month' },
    { label: 'Due diligence', value: '24', delta: '+1 this month' },
    { label: 'Bond registration', value: '46', delta: '+1 this month' },
    { label: 'Transfer lodge', value: '23', delta: '+15 this month' },
    { label: 'Registered', value: '30', delta: '+5 this month' }
];

const conveyancerPipelineBoardColumns = [
    { id: 'instruction', header: 'Instruction received' },
    { id: 'fica', header: 'FICA + documentation' },
    { id: 'bond', header: 'Bond + guarantees' },
    { id: 'lodged', header: 'Lodged' },
    { id: 'registered-props', header: 'Registered properties' }
];

/** Conveyancer CRM view (`/conveyancer/crm`). */
const conveyancerCrmSummary = [
    { label: 'Total clients', value: '123', delta: '+1 this month' },
    { label: 'Active matters', value: '24', delta: '+1% this month' },
    { label: 'Fees [MTD]', value: 'R312K', delta: '+1 this month' },
    { label: 'Follow ups', value: '23', delta: '+15% this month' },
    { label: 'Repeat clients', value: '14', delta: '+5% this month' }
];

/** Conveyancer IPM Partners (`/conveyancer/partners`) — same structure as bond partners view. */
const conveyancerPartnersSummary = [
    { label: 'Agents', value: '34', delta: '+1 Engagements', sky: true },
    { label: 'Buyers', value: '56', delta: '+1 Engagements', sky: true },
    { label: 'Sellers', value: '34', delta: '+1 Engagements', sky: true },
    { label: 'Conveyancers', value: '12', delta: '+5 Engagements', sky: true },
    { label: 'Banks', value: '5', delta: '+5 Engagements', sky: true }
];

const conveyancerPartnerDirectoryLabels = [
    'Agent directory',
    'Buyer directory',
    'Seller directory',
    'Conveyancer directory',
    'Banks directory'
];

/** Conveyancer Vault (`/conveyancer/vault`) — FICA-focused copy vs bond vault. */
const conveyancerVaultSummary = [
    { label: 'Total documents', value: '147', delta: '+12 this month' },
    { label: 'Awaiting verification', value: '4', delta: 'Uploaded today' },
    { label: 'FICA alerts', value: '31', delta: 'Needs review' },
    { label: 'Storage used', value: '2.4 GB', delta: 'of 10GB' }
];

const conveyancerAdvertisingGridPanels = [
    { id: 'campaigns', title: 'Active campaigns' },
    { id: 'placement', title: 'Spend by placement' },
    { id: 'top', title: 'Top performing' },
    { id: 'budget', title: 'Monthly budget' }
];


const transferPipelineColumns = [
    {
        id: 'otp',
        header: 'OTP received',
        count: 24,
        registeredHighlight: false,
        cards: [
            { title: 'Smith — Clifton', amount: 'R12.4M', warn: false },
            { title: 'Naidoo — Umhlanga', amount: 'R8.1M', warn: false }
        ]
    },
    {
        id: 'fica',
        header: 'FICA + docs',
        count: 46,
        registeredHighlight: false,
        cards: [
            { title: 'Van Wyk — Sea Point', amount: 'R4.2M', warn: true },
            { title: 'Molefe — Sandton', amount: 'R2.9M', warn: false }
        ]
    },
    {
        id: 'bond',
        header: 'Bond + guarantees',
        count: 33,
        registeredHighlight: false,
        cards: [
            { title: 'Patel — Bryanston', amount: 'R6.4M', warn: false },
            { title: 'Botha — Stellenbosch', amount: 'R3.5M', warn: false }
        ]
    },
    {
        id: 'lodged',
        header: 'Transfer lodged',
        count: 30,
        registeredHighlight: false,
        cards: [{ title: 'Khumalo — Midrand', amount: 'R1.95M', warn: false }]
    },
    {
        id: 'registered',
        header: 'Registered',
        count: 123,
        registeredHighlight: true,
        cards: [
            { title: 'Jones — Constantia', amount: 'R15.2M', warn: false },
            { title: 'Du Preez — Paarl', amount: 'R2.1M', warn: false }
        ]
    }
];

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

const KpiSection = ({ isMobile, cards }) => (
    <section style={{ ...card, padding: 12, marginBottom: GAP.section, background: '#EBEBEB', border: 'none', boxShadow: 'none' }}>
        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,minmax(0,1fr))' : `repeat(${cards.length},minmax(0,1fr))`, gap: 8 }}>
            {cards.map((k) => (
                <article key={k.label} style={{ background: '#fff', borderRadius: 16, padding: '10px 12px 9px', overflow: 'hidden' }}>
                    <div style={{ fontSize: FONT_SIZE.kpiLabel, color: '#4E4E4E', textTransform: 'uppercase', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{k.label}</div>
                    <div style={{ fontSize: FONT_SIZE.kpiValue, lineHeight: 1.1, fontWeight: 600, color: k.danger ? '#A4260E' : '#10575C', margin: '6px 0 6px' }}>{k.value}</div>
                    <div style={kpiDeltaStyle(k)}>{k.delta}</div>
                </article>
            ))}
        </div>
    </section>
);

/* Pipeline KPI uses the shared KpiSection */

const ConveyancerEmptyPipelineBoard = ({ isMobile }) => (
    <section
        style={{
            display: 'grid',
            gridTemplateColumns: isMobile ? 'repeat(5, minmax(200px, 1fr))' : 'repeat(5, minmax(0, 1fr))',
            gap: 10,
            overflowX: isMobile ? 'auto' : 'visible',
            paddingBottom: isMobile ? 6 : 0,
            WebkitOverflowScrolling: 'touch'
        }}
    >
        {conveyancerPipelineBoardColumns.map((col) => (
            <div
                key={col.id}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: isMobile ? 300 : 360,
                    borderRadius: 14,
                    border: '1px solid #E4E6E8',
                    background: '#fff',
                    boxShadow: '0 4px 16px rgba(6, 6, 6, 0.04)',
                    overflow: 'hidden'
                }}
            >
                <div
                    style={{
                        padding: '10px 12px',
                        fontSize: 10,
                        fontWeight: 700,
                        color: '#8B8F94',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em',
                        background: '#F3F4F6',
                        borderBottom: '1px solid #E8EAED'
                    }}
                >
                    {col.header}
                </div>
                <div style={{ flex: 1, background: '#FAFBFC', minHeight: 0 }} />
            </div>
        ))}
    </section>
);

/* CRM KPI uses the shared KpiSection */

const CrmView = ({ isMobile }) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={conveyancerCrmSummary} />
        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: GAP.section }}>
            <article style={{ ...card, padding: GAP.card, minHeight: isMobile ? 300 : 400, display: 'flex', flexDirection: 'column' }}>
                <h2 style={sectionHeading}>Client lists</h2>
                <div style={{ flex: 1, marginTop: 12, borderRadius: 10, background: '#FAFBFC', border: '1px solid #eef2f7', minHeight: isMobile ? 220 : 320 }} />
            </article>
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP.section }}>
                <PlaceholderPanel title="Client type" isMobile={isMobile} />
                <PlaceholderPanel title="Follow ups today" isMobile={isMobile} />
            </div>
        </section>
    </>
);

/* Partners KPI uses the shared KpiSection */

/* Vault KPI uses the shared KpiSection */

const ConveyancerAdvertisingView = ({ isMobile }) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={[
            { label: 'Monthly Spend', value: 'R4,820', delta: 'R3,180 remaining', muted: true },
            { label: 'Total Impressions', value: '24.1K', delta: '+18% this month' },
            { label: 'Click-Throughs', value: '312', delta: '+9% this month' },
            { label: 'Cost Per Click', value: 'R15.45', delta: '-R3 this month' },
        ]} />
        <article style={{ ...card, padding: GAP.card, minHeight: isMobile ? 160 : 200, marginBottom: GAP.section, display: 'flex', flexDirection: 'column' }}>
            <h2 style={sectionHeading}>Ad previews</h2>
            <div style={{ flex: 1, marginTop: 14, borderRadius: 10, background: '#FAFBFC', border: '1px solid #eef2f7', minHeight: isMobile ? 100 : 140 }} />
        </article>
        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, minmax(0, 1fr))', gap: GAP.section }}>
            {conveyancerAdvertisingGridPanels.map((p) => (
                <article key={p.id} style={{ ...card, padding: GAP.card, minHeight: isMobile ? 140 : 180, display: 'flex', flexDirection: 'column' }}>
                    <h2 style={sectionHeading}>{p.title}</h2>
                    <div style={{ flex: 1, marginTop: 14, borderRadius: 10, background: '#FAFBFC', border: '1px solid #eef2f7', minHeight: isMobile ? 90 : 120 }} />
                </article>
            ))}
        </section>
    </>
);

const ConveyancerVaultView = ({ isMobile }) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={conveyancerVaultSummary} />
        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: GAP.section, marginBottom: GAP.section }}>
            <article style={{ ...card, padding: GAP.card, minHeight: 140 }}>
                <h2 style={sectionHeading}>FICA & compliance</h2>
                <p style={{ marginTop: 12, fontSize: FONT_SIZE.body, color: '#8B8F94', lineHeight: 1.55 }}>Incoming client-supplied documents</p>
            </article>
            <article style={{ ...card, padding: GAP.card, minHeight: 140 }}>
                <h2 style={sectionHeading}>Transfer & deeds documents</h2>
                <p style={{ marginTop: 12, fontSize: FONT_SIZE.body, color: '#8B8F94', lineHeight: 1.55 }}>All outgoing/completed documents</p>
            </article>
        </section>
        <article style={{ ...card, padding: GAP.card, minHeight: isMobile ? 200 : 260, display: 'flex', flexDirection: 'column' }}>
            <h2 style={sectionHeading}>Document activity</h2>
            <div style={{ flex: 1, marginTop: 14, borderRadius: 10, background: '#FAFBFC', border: '1px solid #eef2f7', minHeight: isMobile ? 140 : 200 }} />
        </article>
    </>
);

const ConveyancerPartnersView = ({ isMobile }) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={conveyancerPartnersSummary} />
        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.2fr 0.8fr', gap: GAP.section }}>
            <article style={{ ...card, padding: GAP.card, minHeight: isMobile ? 260 : 400, display: 'flex', flexDirection: 'column' }}>
                <h2 style={sectionHeading}>Recent engagements</h2>
                <div style={{ flex: 1, marginTop: 14, borderRadius: 10, background: '#FAFBFC', border: '1px solid #eef2f7', minHeight: isMobile ? 180 : 280 }} />
            </article>
            <div style={{ display: 'flex', flexDirection: 'column', gap: GAP.section }}>
                {conveyancerPartnerDirectoryLabels.map((label) => (
                    <div key={label} style={{ ...card, padding: '14px 16px' }}>
                        <span style={{ fontSize: FONT_SIZE.cardHeading, fontWeight: 600, color: '#8B8F94', textTransform: 'uppercase', letterSpacing: '0.03em' }}>{label}</span>
                    </div>
                ))}
            </div>
        </section>
    </>
);

const PipelineView = ({ isMobile }) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={conveyancerPipelineSummary} />
        <h2 style={{ ...sectionHeading, marginBottom: 10 }}>Live activity</h2>
        <ConveyancerEmptyPipelineBoard isMobile={isMobile} />
    </>
);

const KanbanCard = ({ title, amount, warn }) => (
    <div
        style={{
            fontSize: 10,
            background: '#fff',
            borderRadius: 10,
            padding: '10px 10px',
            border: '1px solid #eef2f7',
            color: '#384046',
            boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        }}
    >
        <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>{title}</div>
        <div style={{ fontWeight: 600, color: '#10575C' }}>{amount}</div>
        {warn && (
            <div style={{ marginTop: 8, fontSize: 9, fontWeight: 600, color: '#b91c1c', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="fas fa-exclamation-circle" aria-hidden />
                Docs outstanding
            </div>
        )}
    </div>
);

const TransferPipeline = ({ isMobile }) => (
    <article style={{ ...card, padding: GAP.card, overflow: 'hidden' }}>
        <h2 style={{ ...sectionHeading, marginBottom: 12 }}>Transfer pipeline</h2>
        <div
            style={{
                display: 'grid',
                gridTemplateColumns: isMobile ? 'repeat(5, minmax(180px, 1fr))' : 'repeat(5, minmax(0, 1fr))',
                gap: 8,
                overflowX: isMobile ? 'auto' : 'visible',
                paddingBottom: isMobile ? 4 : 0,
                WebkitOverflowScrolling: 'touch'
            }}
        >
            {transferPipelineColumns.map((col) => (
                <div
                    key={col.id}
                    style={{
                        borderRadius: 12,
                        border: '1px solid #e2e8f0',
                        background: col.registeredHighlight ? '#ecfdf5' : '#f8fafc',
                        padding: 8,
                        minHeight: 280,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <div style={{ fontSize: 10, fontWeight: 700, color: '#10575C', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {col.header}{' '}
                        <span style={{ color: '#64748b', fontWeight: 600 }}>({col.count})</span>
                    </div>
                    <div style={{ display: 'grid', gap: 8, flex: 1, alignContent: 'start' }}>
                        {col.cards.map((c, idx) => (
                            <KanbanCard key={`${col.id}-${idx}`} title={c.title} amount={c.amount} warn={c.warn} />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    </article>
);

const emptyPanelBody = {
    flex: 1,
    marginTop: 12,
    borderRadius: 10,
    background: '#FAFBFC',
    border: '1px solid #eef2f7',
    minHeight: 120
};

const PlaceholderPanel = ({ title, isMobile }) => (
    <article style={{ ...card, padding: GAP.card, minHeight: isMobile ? 160 : 200, display: 'flex', flexDirection: 'column' }}>
        <h2 style={sectionHeading}>{title}</h2>
        <div style={emptyPanelBody} />
    </article>
);

const MainDashboard = ({ isMobile }) => (
    <>
        <InsightsBanner text="Suggestions based on platform activity..." />
        <KpiSection isMobile={isMobile} cards={conveyancerMainKpis} />
        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.35fr 0.65fr', gap: GAP.section, marginBottom: GAP.section }}>
            <TransferPipeline isMobile={isMobile} />
            <PlaceholderPanel title="Recent activity" isMobile={isMobile} />
        </section>
        <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: GAP.section }}>
            <PlaceholderPanel title="Partner referrals" isMobile={isMobile} />
            <PlaceholderPanel title="Live activity" isMobile={isMobile} />
        </section>
    </>
);

const ConveyancerDashboard = () => {
    const isMobile = useIsMobile();
    const { pathname } = useLocation();

    const userStr = localStorage.getItem('user');
    const user = userStr ? (() => { try { return JSON.parse(userStr); } catch (_) { return null; } })() : null;
    const ok = user?.role === 'partner' && String(user?.partnerType || '').toLowerCase() === 'conveyancer';
    if (!ok) return <Navigate to="/my-ads" replace />;

    let body;
    if (pathname === '/conveyancer/pipeline') {
        body = <PipelineView isMobile={isMobile} />;
    } else if (pathname === '/conveyancer/crm') {
        body = <CrmView isMobile={isMobile} />;
    } else if (pathname === '/conveyancer/partners') {
        body = <ConveyancerPartnersView isMobile={isMobile} />;
    } else if (pathname === '/conveyancer/vault') {
        body = <ConveyancerVaultView isMobile={isMobile} />;
    } else if (pathname === '/conveyancer/advertising') {
        body = <ConveyancerAdvertisingView isMobile={isMobile} />;
    } else {
        body = <MainDashboard isMobile={isMobile} />;
    }

    return (
        <div className="dashboard-container" style={{ background: '#ffffff' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ padding: isMobile ? '14px' : '18px 22px' }}>
                {body}
            </main>
        </div>
    );
};

export default ConveyancerDashboard;

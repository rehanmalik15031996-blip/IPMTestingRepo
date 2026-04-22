import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import { useIsMobile } from '../hooks/useMediaQuery';
import MiniFlag from '../components/MiniFlag';
import { brand, card, sectionTitle, pageShell, InsightBanner, statusPill as getStatusPill } from '../components/enterpriseTheme';

const KNOWN_PORTALS = [
    { name: 'Property24', country: 'SA' },
    { name: 'Private Property', country: 'SA' },
    { name: 'Bayut', country: 'UAE' },
    { name: 'Rightmove', country: 'UK' },
    { name: 'Zoopla', country: 'UK' },
    { name: 'Realtor.com', country: 'USA' },
    { name: 'Zillow', country: 'USA' },
    { name: 'Funda', country: 'NL' },
    { name: 'Immowelt', country: 'DE' },
    { name: 'OnTheMarket', country: 'UK' },
    { name: 'Idealista', country: 'ES' },
    { name: 'Domain', country: 'AU' },
];

const AI_FEATURES = [
    { name: 'AI copy generation', desc: 'Auto-write listing descriptions · SEO-optimised', icon: 'fas fa-robot' },
    { name: 'Virtual staging ready', desc: 'Stage empty-room listings · Renders in seconds', icon: 'fas fa-couch' },
    { name: 'IPM Score\u2122 attached', desc: 'Score all live listings automatically', icon: 'fas fa-star' },
    { name: 'Multi-language auto-translate', desc: 'Descriptions in EN/AR/NL/FR on relevant portals', icon: 'fas fa-language' },
];

const portalKpis = [
    { label: 'Total Listings Live', value: '0', variant: 'muted' },
    { label: 'Pending Sync', value: '0', variant: 'muted' },
    { label: 'Portals Active', value: '0', variant: 'muted' },
    { label: 'IPM Intelligence (MTD)', value: '0', variant: 'muted' },
];

const kpiPill = (variant) => {
    if (variant === 'danger') return { fontSize: 9, color: brand.danger, background: 'rgba(164,38,14,0.14)', padding: '3px 8px', borderRadius: 999, display: 'inline-block', fontWeight: 600 };
    if (variant === 'teal') return { fontSize: 9, color: brand.success, background: 'rgba(16,87,92,0.12)', padding: '3px 8px', borderRadius: 999, display: 'inline-block', fontWeight: 600 };
    return { fontSize: 9, color: '#6B7280', background: 'rgba(107,114,128,0.12)', padding: '3px 8px', borderRadius: 999, display: 'inline-block', fontWeight: 600 };
};

export default function EnterprisePortalSyndication() {
    const isMobile = useIsMobile();
    const [showAddModal, setShowAddModal] = useState(false);
    const [portals] = useState([]);
    const [selectedPortal, setSelectedPortal] = useState('');

    const hasPortals = portals.length > 0;
    const shell = pageShell(isMobile);

    return (
        <div className="dashboard-container" style={shell.container}>
            <Sidebar />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
                <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, ...shell.main, overflow: 'hidden' }}>
                    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                        <div>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: brand.text }}>
                                <i className="fas fa-globe" style={{ color: brand.gold, marginRight: 8 }}></i>Portal Syndication
                            </h2>
                            <p style={{ color: brand.muted, margin: '2px 0 0', fontSize: 11 }}>Manage listing distribution across international property portals.</p>
                        </div>
                        <button
                            type="button"
                            onClick={() => setShowAddModal(true)}
                            style={{ padding: '8px 16px', borderRadius: 999, border: 'none', background: brand.primary, color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                            <i className="fas fa-plus"></i> Add Portal
                        </button>
                    </header>

                    <InsightBanner
                        boldText="Syndication Tip:"
                        text="Connect your first portal to start distributing listings globally. IPM auto-syncs new listings within minutes."
                        buttonText="Learn more"
                        onButtonClick={() => {}}
                    />

                    {/* KPI grid */}
                    <section style={{ ...card, padding: '12px 12px', marginBottom: 12, background: brand.kpiBg }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2, minmax(0,1fr))' : 'repeat(4, minmax(0,1fr))', gap: 10 }}>
                            {portalKpis.map((k) => (
                                <article key={k.label} style={{ border: `1px solid ${brand.borderLight}`, background: '#fff', borderRadius: 10, padding: '10px 10px 9px' }}>
                                    <div style={{ fontSize: 9, color: '#575D63', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.02em' }}>{k.label}</div>
                                    <div style={{ fontSize: k.value.length > 5 ? 30 : 36, lineHeight: 1, fontWeight: 300, color: k.variant === 'danger' ? '#B42318' : brand.primary, margin: '6px 0 7px' }}>{k.value}</div>
                                    <div style={kpiPill(k.variant)}>No portals yet</div>
                                </article>
                            ))}
                        </div>
                    </section>

                    {/* Portal Status + Pending Actions */}
                    <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <article style={{ ...card, padding: 14 }}>
                            <h3 style={{ ...sectionTitle, letterSpacing: '0.04em', fontWeight: 700 }}>Portal Status — All Markets</h3>
                            <div style={{ marginTop: 10 }}>
                                {!hasPortals ? (
                                    <div style={{ textAlign: 'center', padding: '20px 12px', color: brand.muted }}>
                                        <i className="fas fa-satellite-dish" style={{ fontSize: 24, marginBottom: 6, display: 'block', opacity: 0.3 }}></i>
                                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>No portals connected</div>
                                        <div style={{ fontSize: 10, marginBottom: 10 }}>Add a portal to start syndicating listings.</div>
                                        <button type="button" onClick={() => setShowAddModal(true)} style={{ padding: '5px 12px', borderRadius: 999, border: `1px solid ${brand.primary}`, background: '#fff', color: brand.primary, fontSize: 10, fontWeight: 600, cursor: 'pointer' }}>
                                            <i className="fas fa-plus" style={{ marginRight: 4 }}></i> Add Portal
                                        </button>
                                    </div>
                                ) : (
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11, minWidth: isMobile ? 0 : 360 }}>
                                        <tbody>
                                            {portals.map((p) => (
                                                <tr key={p.name} style={{ borderBottom: `1px solid ${brand.borderRow}` }}>
                                                    <td style={{ padding: '8px 4px', fontWeight: 600, color: brand.text }}>{p.name}</td>
                                                    <td style={{ padding: '8px 4px', textAlign: 'right' }}>
                                                        <span style={getStatusPill(p.status)}>{p.status}</span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                )}
                            </div>
                        </article>

                        <article style={{ ...card, padding: 14 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h3 style={sectionTitle}>Pending Actions</h3>
                                <span style={{ fontSize: 9, fontWeight: 600, color: brand.muted, background: 'rgba(107,114,128,0.12)', padding: '3px 8px', borderRadius: 999 }}>0 pending</span>
                            </div>
                            <div style={{ marginTop: 10 }}>
                                {!hasPortals ? (
                                    <div style={{ textAlign: 'center', padding: '20px 12px', color: brand.muted }}>
                                        <i className="fas fa-clipboard-check" style={{ fontSize: 24, marginBottom: 6, display: 'block', opacity: 0.3 }}></i>
                                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>No pending actions</div>
                                        <div style={{ fontSize: 10 }}>Document uploads and compliance reviews will appear here.</div>
                                    </div>
                                ) : (
                                    <p style={{ color: brand.muted, fontSize: 11 }}>Pending actions will appear here.</p>
                                )}
                            </div>
                        </article>
                    </section>

                    {/* Listings by Market + AI Features */}
                    <section style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <article style={{ ...card, padding: 14 }}>
                            <h3 style={sectionTitle}>Listings by Market</h3>
                            <div style={{ marginTop: 10 }}>
                                {!hasPortals ? (
                                    <div style={{ textAlign: 'center', padding: '20px 12px', color: brand.muted }}>
                                        <i className="fas fa-map-marked-alt" style={{ fontSize: 24, marginBottom: 6, display: 'block', opacity: 0.3 }}></i>
                                        <div style={{ fontSize: 11, fontWeight: 600, marginBottom: 4 }}>No market data yet</div>
                                        <div style={{ fontSize: 10 }}>Connect portals to see listing distribution.</div>
                                    </div>
                                ) : (
                                    <p style={{ color: brand.muted, fontSize: 11 }}>Market distribution will appear here.</p>
                                )}
                            </div>
                        </article>

                        <article style={{ ...card, padding: 14 }}>
                            <h3 style={sectionTitle}>AI Listing Features</h3>
                            <div style={{ marginTop: 8 }}>
                                {AI_FEATURES.map((feat) => (
                                    <div key={feat.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${brand.borderRow}` }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                            <div style={{ width: 28, height: 28, borderRadius: 8, background: brand.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                                <i className={feat.icon} style={{ color: brand.primary, fontSize: 10 }}></i>
                                            </div>
                                            <div>
                                                <div style={{ fontSize: 10, fontWeight: 600, color: brand.text }}>{feat.name}</div>
                                                <div style={{ fontSize: 9, color: brand.muted }}>{feat.desc}</div>
                                            </div>
                                        </div>
                                        <span style={{ ...getStatusPill(hasPortals ? 'active' : 'pending'), fontSize: 9 }}>
                                            {hasPortals ? 'Live' : 'Inactive'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </article>
                    </section>
                </div>

                {/* Add Portal Modal */}
                {showAddModal && (
                    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100, padding: 20 }} onClick={() => setShowAddModal(false)}>
                        <div style={{ background: '#fff', borderRadius: 12, maxWidth: 520, width: '100%', padding: '24px 28px', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }} onClick={(e) => e.stopPropagation()}>
                            <h2 style={{ margin: '0 0 8px', fontSize: 18, color: brand.text, fontWeight: 700 }}>
                                <i className="fas fa-globe" style={{ color: brand.gold, marginRight: 8 }}></i>Add Portal
                            </h2>
                            <p style={{ margin: '0 0 16px', fontSize: 12, color: brand.muted }}>
                                Select a property portal to connect. Listings will automatically syndicate.
                            </p>

                            <label style={{ display: 'block', fontSize: 11, fontWeight: 600, color: brand.text, marginBottom: 8, textTransform: 'uppercase' }}>Select portal</label>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 18, maxHeight: 300, overflowY: 'auto' }}>
                                {KNOWN_PORTALS.map((p) => (
                                    <button
                                        key={p.name}
                                        type="button"
                                        onClick={() => setSelectedPortal(p.name)}
                                        style={{
                                            padding: '10px 12px', borderRadius: 10, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: 8, textAlign: 'left',
                                            border: selectedPortal === p.name ? `2px solid ${brand.primary}` : `2px solid ${brand.border}`,
                                            background: selectedPortal === p.name ? 'rgba(16,87,92,0.08)' : '#fff',
                                            color: selectedPortal === p.name ? brand.primary : brand.muted,
                                        }}
                                    >
                                        <MiniFlag country={p.country} size={20} />
                                        <div>
                                            <div>{p.name}</div>
                                            <div style={{ fontSize: 9, fontWeight: 500, opacity: 0.7 }}>{p.country}</div>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                                <button style={{ border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 600, fontSize: 12, padding: '8px 16px', background: brand.pageBg, color: brand.text }} onClick={() => { setShowAddModal(false); setSelectedPortal(''); }}>Cancel</button>
                                <button
                                    style={{ border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 12, padding: '8px 16px', background: brand.primary, color: '#fff', opacity: selectedPortal ? 1 : 0.5 }}
                                    disabled={!selectedPortal}
                                    onClick={() => {
                                        alert(`Portal "${selectedPortal}" will be connected once the syndication API is configured. Coming soon.`);
                                        setShowAddModal(false);
                                        setSelectedPortal('');
                                    }}
                                >
                                    Connect Portal
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
            </div>
        </div>
    );
}

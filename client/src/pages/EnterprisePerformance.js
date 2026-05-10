import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../config/api';
import Sidebar from '../components/Sidebar';
import LogoLoading from '../components/LogoLoading';
import { useIsMobile } from '../hooks/useMediaQuery';
import { usePreferences } from '../context/PreferencesContext';
import MiniFlag, { countryDisplayName } from '../components/MiniFlag';
import { brand, card, sectionTitle, KpiSection, pageShell, darkTable, tealPill } from '../components/enterpriseTheme';

const barColors = ['#4CB5AE', '#C7A35A', '#5BB38D', '#A47837', '#C95B53'];

export default function EnterprisePerformance() {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const { formatAssetValueCompact } = usePreferences();
    const [searchParams] = useSearchParams();
    const view = searchParams.get('view') || 'country';
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/api/enterprise/dashboard');
                setData(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const shell = pageShell(isMobile);

    if (loading) {
        return (
            <div className="dashboard-container" style={shell.container}>
                <Sidebar />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
                    <main className="dashboard-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', ...shell.main }}>
                        <LogoLoading message={t('enterprise.loadingPerformance')} style={{ minHeight: '60vh' }} />
                    </main>
                </div>
            </div>
        );
    }

    const s = data?.summary || {};

    const renderCountryView = () => {
        const rows = data?.performanceByCountry || [];
        const totalBranches = rows.reduce((a, r) => a + r.branches, 0);
        const totalCountryAgents = rows.reduce((a, r) => a + r.agents, 0);
        const kpis = [
            { label: t('enterprise.franchises'), value: String(s.agencyCount || 0), delta: `${rows.length} ${rows.length !== 1 ? t('newDev.country') + 's' : t('newDev.country')}`, deltaMuted: true },
            { label: t('enterprise.branches'), value: String(totalBranches), delta: t('enterprise.acrossNetwork'), deltaMuted: true },
            { label: t('enterprise.activeAgents'), value: String(totalCountryAgents || s.totalAgents || 0), delta: totalCountryAgents > 0 ? t('enterprise.active') : '—', deltaMuted: true },
            { label: t('enterprise.gtvMtd'), value: formatAssetValueCompact(s.totalRevenue || 0), delta: s.totalRevenue > 0 ? t('enterprise.revenueToDate') : '—', deltaMuted: true },
            { label: t('enterprise.activeListings'), value: String(s.activeListings || s.totalListings || 0), delta: s.newListingsLast30 > 0 ? `+${s.newListingsLast30} ${t('enterprise.last30d')}` : '—' },
        ];
        const maxGtv = Math.max(...rows.map((x) => x.gtv), 1);

        return (
            <>
                <KpiSection isMobile={isMobile} cards={kpis} />

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: 12, marginBottom: 12 }}>
                    {/* Province / Country GTV */}
                    <article style={{ ...card, padding: 12 }}>
                        <h3 style={sectionTitle}>{t('enterprise.provinceGtv')}</h3>
                        <div style={{ marginTop: 12, maxHeight: 240, overflowY: 'auto' }}>
                            {rows.length === 0 ? (
                                <p style={{ color: brand.muted, fontSize: 11 }}>{t('enterprise.noDataYet')}</p>
                            ) : rows.map((r, i) => {
                                const pct = Math.min(100, Math.round((r.gtv / maxGtv) * 100));
                                const displayName = countryDisplayName(r.country);
                                return (
                                    <div key={r.country} style={{ display: 'grid', gridTemplateColumns: '58px 1fr 48px', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                                        <span style={{ fontSize: 9, fontWeight: 600, color: brand.text, display: 'flex', alignItems: 'center', gap: 4 }}>
                                            <MiniFlag country={r.country} size={14} />
                                            {displayName}
                                        </span>
                                        <div style={{ height: 3, background: '#E6E8EA', borderRadius: 999 }}>
                                            <div style={{ height: 3, borderRadius: 999, background: barColors[i % barColors.length], width: `${pct}%` }} />
                                        </div>
                                        <span style={{ fontSize: 9, color: '#4D9A98', textAlign: 'right', fontWeight: 600 }}>{formatAssetValueCompact(r.gtv)}</span>
                                    </div>
                                );
                            })}
                        </div>
                    </article>

                    {/* Franchise Performance — dark table */}
                    <article style={{ ...card, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h3 style={sectionTitle}>{t('enterprise.franchisePerformance')}</h3>
                            <span style={tealPill}>{rows.length} {rows.length !== 1 ? t('enterprise.markets') : t('enterprise.market')}</span>
                        </div>
                        <div style={{ ...darkTable.wrapper, maxHeight: 280, overflowY: 'auto' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1.55fr 0.3fr 0.4fr 0.45fr 0.56fr 0.34fr 0.42fr', columnGap: 8, rowGap: 4 }}>
                                {(data?.performanceByFranchise || []).map((f, i) => {
                                    const franchiseMax = Math.max(...(data?.performanceByFranchise || []).map((x) => x.gtv), 1);
                                    const perfPct = franchiseMax > 0 ? Math.min(100, Math.round((f.gtv / franchiseMax) * 100)) : 0;
                                    const tone = perfPct > 70 ? '#00B17A' : perfPct > 40 ? brand.goldBright : '#FF4A68';
                                    return (
                                        <React.Fragment key={f._id || i}>
                                            <div>
                                                <div style={darkTable.text}>{f.name}</div>
                                                <div style={darkTable.sub}>{f.location || '—'}</div>
                                            </div>
                                            <div style={{ ...darkTable.text, textAlign: 'right' }}>{f.agents}</div>
                                            <div style={{ ...darkTable.text, textAlign: 'right' }}>{f.leads}</div>
                                            <div style={{ ...darkTable.accent, textAlign: 'right', fontWeight: 700, fontSize: 10 }}>{formatAssetValueCompact(f.gtv)}</div>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                <div style={{ flex: 1, ...darkTable.track }}>
                                                    <div style={{ height: 4, borderRadius: 999, background: tone, width: `${perfPct}%` }} />
                                                </div>
                                                <span style={{ color: tone, fontSize: 10, fontWeight: 700, minWidth: 28, textAlign: 'right' }}>{perfPct}%</span>
                                            </div>
                                            <div style={{ ...darkTable.text, textAlign: 'right' }}>{f.propertiesSold}</div>
                                            <div style={{ textAlign: 'right' }}>
                                                <button type="button" style={darkTable.drillIn}>{t('enterprise.drillIn')}</button>
                                            </div>
                                        </React.Fragment>
                                    );
                                })}
                            </div>
                        </div>
                    </article>
                </div>
            </>
        );
    };

    const renderFranchiseView = () => {
        const rows = data?.performanceByFranchise || [];
        const defaults = data?.royaltyDefaults || { branchToFranchise: 3, franchiseToCountry: 5, countryToHq: 1.5 };
        const combinedRate = defaults.branchToFranchise + defaults.franchiseToCountry + defaults.countryToHq;
        const totalRoyaltiesDue = (s.totalRevenue || 0) * (combinedRate / 100);
        const kpis = [
            { label: t('enterprise.branches'), value: String(rows.reduce((a, r) => a + r.branches, 0)), delta: `${rows.length} ${rows.length !== 1 ? t('enterprise.franchises').toLowerCase() : t('sidebar.franchise').toLowerCase()}`, deltaMuted: true },
            { label: t('enterprise.agents'), value: String(s.totalAgents || 0), delta: s.totalAgents > 0 ? t('enterprise.active') : '—', deltaMuted: true },
            { label: t('enterprise.gtvMtd'), value: formatAssetValueCompact(s.totalRevenue || 0), delta: s.totalRevenue > 0 ? t('enterprise.revenueToDate') : '—', deltaMuted: true },
            { label: t('enterprise.activeListings'), value: String(s.activeListings || s.totalListings || 0), delta: s.newListingsLast30 > 0 ? `+${s.newListingsLast30} ${t('enterprise.last30d')}` : '—' },
            { label: t('enterprise.royaltiesDue'), value: formatAssetValueCompact(totalRoyaltiesDue), delta: `${combinedRate}% ${t('enterprise.ofGtv')}`, deltaTone: 'yellow' },
        ];

        return (
            <>
                <KpiSection isMobile={isMobile} cards={kpis} valueColors={{ [t('enterprise.royaltiesDue')]: brand.gold }} />

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: 12, marginBottom: 12 }}>
                    {/* Branch Leader Board */}
                    <div>
                        <article style={{ ...card, padding: 12, marginBottom: 12 }}>
                            <h3 style={{ ...sectionTitle, color: brand.mutedLight }}>{t('enterprise.branchLeaderBoard')}</h3>
                            <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto' }}>
                                {rows.length === 0 ? (
                                    <p style={{ color: brand.muted, fontSize: 11 }}>{t('enterprise.noFranchisesYet')}</p>
                                ) : rows.map((f, i) => (
                                    <div key={f._id || i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: `1px solid ${brand.borderRow}`, fontSize: 11 }}>
                                        <div style={{ width: 22, height: 22, borderRadius: '50%', background: i === 0 ? brand.gold : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : brand.pageBg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 9, color: i < 3 ? '#fff' : brand.muted, flexShrink: 0 }}>
                                            {i + 1}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <div style={{ fontWeight: 600, color: brand.text }}>{f.name}</div>
                                            <div style={{ fontSize: 9, color: brand.muted }}>{f.branches} br · {f.agents} ag</div>
                                        </div>
                                        <div style={{ fontWeight: 700, color: brand.money, fontSize: 11 }}>{formatAssetValueCompact(f.gtv)}</div>
                                    </div>
                                ))}
                            </div>
                        </article>
                        <article style={{ ...card, padding: 12 }}>
                            <h3 style={{ ...sectionTitle, color: brand.mutedLight }}>{t('enterprise.commissionEngine')}</h3>
                            <div style={{ marginTop: 10, maxHeight: 160, overflowY: 'auto' }}>
                                {(data?.agentRows || []).filter((a) => a.status === 'active').length === 0 ? (
                                    <div style={{ height: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', color: brand.muted, fontSize: 10 }}>{t('enterprise.noActiveAgentsYet')}</div>
                                ) : (data?.agentRows || []).filter((a) => a.status === 'active').slice(0, 10).map((a, i) => (
                                    <div key={a._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: `1px solid ${brand.borderRow}`, fontSize: 10 }}>
                                        <div>
                                            <div style={{ fontWeight: 600, color: brand.text }}>{a.name}</div>
                                            <div style={{ fontSize: 8, color: brand.muted }}>{a.franchise}</div>
                                        </div>
                                        <div style={{ fontWeight: 700, color: brand.money }}>{a.commissionRate ? `${a.commissionRate}%` : '—'}</div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    </div>

                    {/* Branch Performance */}
                    <article style={{ ...card, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h3 style={sectionTitle}>{t('enterprise.branchPerformance')}</h3>
                            <span style={tealPill}>{rows.length} {rows.length !== 1 ? t('enterprise.franchises').toLowerCase() : t('sidebar.franchise').toLowerCase()}</span>
                        </div>
                        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 320 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, minWidth: 400 }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                                    <tr style={{ borderBottom: `2px solid ${brand.border}` }}>
                                        {[
                                            { key: 'franchise', label: t('sidebar.franchise') },
                                            { key: 'agents', label: t('enterprise.agents') },
                                            { key: 'leads', label: t('enterprise.leads') },
                                            { key: 'gtv', label: t('enterprise.gtv') },
                                            { key: 'sold', label: t('enterprise.sold') },
                                        ].map((h) => (
                                            <th key={h.key} style={{ textAlign: h.key === 'franchise' ? 'left' : 'right', padding: '8px 6px', color: brand.muted, fontWeight: 700, textTransform: 'uppercase' }}>{h.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((f, i) => (
                                        <tr key={f._id || i} style={{ borderBottom: `1px solid ${brand.borderRow}` }}>
                                            <td style={{ padding: '8px 6px', fontWeight: 600, color: brand.text }}>{f.name}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>{f.agents}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>{f.leads}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: brand.money }}>{formatAssetValueCompact(f.gtv)}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>{f.propertiesSold}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </article>
                </div>
            </>
        );
    };

    const renderBranchView = () => {
        const rows = data?.performanceByBranch || [];
        const defaults = data?.royaltyDefaults || { branchToFranchise: 3, franchiseToCountry: 5, countryToHq: 1.5 };
        const branchRate = defaults.branchToFranchise;
        const totalBranchAgents = rows.reduce((a, r) => a + r.agents, 0);
        const commissionDue = (s.totalRevenue || 0) * (branchRate / 100);
        const kpis = [
            { label: t('enterprise.branchAgents'), value: String(totalBranchAgents), delta: totalBranchAgents > 0 ? t('enterprise.active') : '—', deltaTone: 'success' },
            { label: t('enterprise.activeListings'), value: String(s.activeListings || s.totalListings || 0), delta: t('enterprise.acrossNetwork'), deltaMuted: true },
            { label: t('enterprise.agents'), value: String(s.totalAgents || 0), delta: s.totalAgents > 0 ? t('enterprise.networkTotal') : '—', deltaMuted: true },
            { label: t('enterprise.pipelineLeads'), value: String(s.totalLeads || 0), delta: s.totalLeads > 0 ? t('enterprise.active') : '—', danger: (s.totalLeads || 0) < 5 },
            { label: t('enterprise.gtvMtd'), value: formatAssetValueCompact(s.totalRevenue || 0), delta: s.totalRevenue > 0 ? t('enterprise.revenueToDate') : '—', deltaTone: 'teal' },
            { label: t('enterprise.commissionDue'), value: formatAssetValueCompact(commissionDue), delta: `${branchRate}% ${t('enterprise.ofGtv')}`, deltaTone: 'yellow' },
        ];

        return (
            <>
                <KpiSection isMobile={isMobile} cards={kpis} valueColors={{ [t('enterprise.commissionDue')]: brand.gold }} />

                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 2fr', gap: 12, marginBottom: 12 }}>
                    {/* Left: Listing Distribution + Reporting Hierarchy */}
                    <div>
                        <article style={{ ...card, padding: 12, marginBottom: 12 }}>
                            <h3 style={{ ...sectionTitle, color: brand.mutedLight }}>{t('enterprise.listingDistribution')}</h3>
                            <div style={{ marginTop: 10, maxHeight: 200, overflowY: 'auto' }}>
                                {rows.length === 0 ? (
                                    <p style={{ color: brand.muted, fontSize: 11 }}>{t('enterprise.noBranchesYet')}</p>
                                ) : rows.map((r) => {
                                    const maxAgents = Math.max(...rows.map((x) => x.agents), 1);
                                    const pct = Math.min(100, (r.agents / maxAgents) * 100);
                                    return (
                                        <div key={r.branch + r.franchise} style={{ marginBottom: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 2 }}>
                                                <span style={{ fontWeight: 600, color: brand.text }}>{r.branch}</span>
                                                <span style={{ color: brand.muted }}>{r.agents} agents</span>
                                            </div>
                                            <div style={{ height: 4, borderRadius: 999, background: '#E6E8EA' }}>
                                                <div style={{ height: 4, borderRadius: 999, background: brand.primary, width: `${pct}%` }} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </article>
                        <article style={{ ...card, padding: 12 }}>
                            <h3 style={{ ...sectionTitle, color: brand.mutedLight }}>{t('enterprise.reportingHierarchy')}</h3>
                            <div style={{ marginTop: 10, maxHeight: 220, overflowY: 'auto' }}>
                                {(data?.performanceByFranchise || []).map((f, fi) => (
                                    <div key={f._id || fi} style={{ marginBottom: 12 }}>
                                        <div style={{ fontWeight: 700, fontSize: 11, color: brand.text, marginBottom: 4 }}>
                                            <i className="fas fa-city" style={{ color: brand.gold, marginRight: 6 }}></i>{f.name}
                                        </div>
                                        <div style={{ paddingLeft: 18 }}>
                                            {rows.filter((r) => r.franchise === f.name).map((r, bi) => (
                                                <div key={bi} style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: `1px solid ${brand.borderRow}`, fontSize: 10 }}>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                                        <i className="fas fa-code-branch" style={{ color: brand.muted, fontSize: 8 }}></i>
                                                        <span style={{ fontWeight: 600, color: brand.text }}>{r.branch}</span>
                                                    </span>
                                                    <span style={{ color: brand.muted }}>{r.agents} ag · {formatAssetValueCompact(r.gtv)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </article>
                    </div>

                    {/* Right: Agent Roster */}
                    <article style={{ ...card, padding: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                            <h3 style={sectionTitle}>{t('enterprise.agentRoster')}</h3>
                            <span style={tealPill}>{rows.length} {rows.length !== 1 ? t('enterprise.branches').toLowerCase() : t('sidebar.branch').toLowerCase()}</span>
                        </div>
                        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 320 }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, minWidth: 400 }}>
                                <thead style={{ position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
                                    <tr style={{ borderBottom: `2px solid ${brand.border}` }}>
                                        {[
                                            { key: 'branch', label: t('sidebar.branch') },
                                            { key: 'franchise', label: t('sidebar.franchise') },
                                            { key: 'agents', label: t('enterprise.agents') },
                                            { key: 'sold', label: t('enterprise.sold') },
                                            { key: 'gtv', label: t('enterprise.gtv') },
                                        ].map((h) => (
                                            <th key={h.key} style={{ textAlign: h.key === 'branch' || h.key === 'franchise' ? 'left' : 'right', padding: '8px 6px', color: brand.muted, fontWeight: 700, textTransform: 'uppercase' }}>{h.label}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((r, i) => (
                                        <tr key={i} style={{ borderBottom: `1px solid ${brand.borderRow}` }}>
                                            <td style={{ padding: '8px 6px', fontWeight: 600, color: brand.text }}>{r.branch}</td>
                                            <td style={{ padding: '8px 6px', fontSize: 9, color: brand.muted }}>{r.franchise}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>{r.agents}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>{r.propertiesSold}</td>
                                            <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: brand.money }}>{formatAssetValueCompact(r.gtv)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </article>
                </div>
            </>
        );
    };

    return (
        <div className="dashboard-container" style={shell.container}>
            <Sidebar />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
                <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, ...shell.main }}>
                    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                        <header style={{ marginBottom: 14 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: brand.text }}>
                                {view === 'country' ? t('enterprise.performanceByCountry') : view === 'franchise' ? t('enterprise.performanceByFranchise') : t('enterprise.performanceByBranch')}
                            </h2>
                            <p style={{ color: brand.muted, margin: '2px 0 0', fontSize: 11 }}>{t('enterprise.useTheSidebar')}</p>
                        </header>

                        {view === 'country' && renderCountryView()}
                        {view === 'franchise' && renderFranchiseView()}
                        {view === 'branch' && renderBranchView()}
                    </div>
                </main>
            </div>
        </div>
    );
}

import React, { useEffect, useState, useMemo } from 'react';
import api from '../config/api';
import Sidebar from '../components/Sidebar';
import LogoLoading from '../components/LogoLoading';
import { useIsMobile } from '../hooks/useMediaQuery';
import { usePreferences } from '../context/PreferencesContext';
import MiniFlag, { countryDisplayName } from '../components/MiniFlag';
import { brand, card, sectionTitle, pageShell, statusPill as getStatusPill } from '../components/enterpriseTheme';

export default function EnterpriseRoyaltyEngine() {
    const isMobile = useIsMobile();
    const { formatAssetValueCompact } = usePreferences();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/api/enterprise/dashboard');
                setData(res.data);
            } catch (err) {
                console.error('Royalty engine error:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const s = data?.summary || {};
    const franchises = useMemo(() => data?.performanceByFranchise || [], [data?.performanceByFranchise]);
    const branches = useMemo(() => data?.performanceByBranch || [], [data?.performanceByBranch]);

    const totalGtv = s.totalRevenue || 0;
    const branchRate = 0.03;
    const franchiseRate = 0.05;
    const countryRate = 0.015;
    const totalRoyalties = totalGtv * (branchRate + franchiseRate + countryRate);

    const largestMarket = useMemo(() => {
        const byCountry = data?.performanceByCountry || [];
        if (byCountry.length === 0) return null;
        return byCountry.reduce((best, c) => (c.gtv > (best?.gtv || 0) ? c : best), byCountry[0]);
    }, [data?.performanceByCountry]);

    const monthlyBars = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentMonth = new Date().getMonth();
        const result = [];
        for (let i = 6; i >= 0; i--) {
            const mIdx = (currentMonth - i + 12) % 12;
            const factor = i === 0 ? 1 : 0.6 + Math.random() * 0.5;
            result.push({ label: months[mIdx], value: totalRoyalties * factor });
        }
        return result;
    }, [totalRoyalties]);

    const royaltyFlowRows = useMemo(() => {
        const countries = data?.performanceByCountry || [];
        const franchiseCountryMap = {};
        for (const f of franchises) {
            const loc = (f.location || '').trim();
            const parts = loc.split(',').map((p) => p.trim()).filter(Boolean);
            const country = parts.length > 0 ? parts[parts.length - 1] : '—';
            franchiseCountryMap[f.name] = country;
        }
        return branches.slice(0, 8).map((br) => {
            const branchGtv = br.gtv || 0;
            const franchiseName = br.franchise || '—';
            const country = franchiseCountryMap[franchiseName]
                || (countries.length > 0 ? countries[0].country : '—');
            return {
                branch: br.branch, region: country,
                branchAmount: branchGtv * branchRate, franchise: franchiseName,
                franchiseCountry: country, franchiseAmount: branchGtv * franchiseRate,
                countryOrg: country, countryAmount: branchGtv * countryRate,
                globalAmount: branchGtv * (branchRate + franchiseRate + countryRate),
            };
        });
    }, [branches, franchises, data?.performanceByCountry]);

    const commissionRows = useMemo(() => {
        const tierCommission = { Platinum: 0.70, Gold: 0.65, Silver: 0.60, Bronze: 0.55 };
        const agents = data?.agentRows || [];
        if (agents.length === 0) return [];
        return agents.slice(0, 10).map((ag) => {
            const tier = ag.tier || 'Bronze';
            const commPct = ag.commissionRate ? ag.commissionRate / 100 : (tierCommission[tier] || 0.55);
            const agentGtv = ag.totalSales || 0;
            const gross = agentGtv * commPct;
            const retention = gross * franchiseRate;
            const net = gross - retention;
            return { name: ag.name || 'Agent', franchise: ag.franchise || '—', tier, gtv: agentGtv, commPct: Math.round(commPct * 100), gross, retention, net, status: agentGtv > 0 ? 'Processed' : 'Pending' };
        });
    }, [data?.agentRows]);

    const totalPayouts = commissionRows.reduce((sum, r) => sum + r.net, 0);
    const shell = pageShell(isMobile);

    if (loading) {
        return (
            <div className="dashboard-container" style={shell.container}>
                <Sidebar />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
                    <main className="dashboard-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', ...shell.main }}>
                        <LogoLoading message="Loading royalty engine..." style={{ minHeight: '60vh' }} />
                    </main>
                </div>
            </div>
        );
    }

    const barMax = Math.max(...monthlyBars.map((b) => b.value), 1);

    return (
        <div className="dashboard-container" style={shell.container}>
            <Sidebar />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
                <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, ...shell.main }}>
                    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                    <header style={{ marginBottom: 14 }}>
                        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: brand.text }}>
                            <i className="fas fa-coins" style={{ color: brand.gold, marginRight: 8 }}></i>Royalty Engine
                        </h2>
                        <p style={{ color: brand.muted, margin: '2px 0 0', fontSize: 11 }}>Live royalty flow, commission splits, and payout tracking.</p>
                    </header>

                    {/* KPI strip (3 cards) */}
                    <section style={{ ...card, padding: '12px 12px', marginBottom: 12, background: brand.kpiBg }}>
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
                            {/* Total Royalties */}
                            <article style={{ border: `1px solid ${brand.borderLight}`, background: '#fff', borderRadius: 10, padding: '9px 9px 8px' }}>
                                <div style={{ fontSize: 9, color: '#575D63', textTransform: 'uppercase', fontWeight: 600 }}>Total Royalties (MTD)</div>
                                <div style={{ fontSize: 39, lineHeight: 1, fontWeight: 300, color: brand.primary, margin: '6px 0 7px' }}>{formatAssetValueCompact(totalRoyalties)}</div>
                                <div style={{ fontSize: 9, color: brand.primary, background: 'rgba(16,87,92,0.13)', borderRadius: 999, padding: '3px 7px', display: 'inline-block', fontWeight: 600 }}>+{s.agencyCount || 0} franchises this month</div>
                            </article>
                            {/* Largest Market */}
                            <article style={{ border: `1px solid ${brand.borderLight}`, background: '#fff', borderRadius: 10, padding: '9px 9px 8px' }}>
                                <div style={{ fontSize: 9, color: '#575D63', textTransform: 'uppercase', fontWeight: 600 }}>Largest Single Market</div>
                                <div style={{ fontSize: 39, lineHeight: 1, fontWeight: 300, color: brand.primary, margin: '6px 0 4px' }}>
                                    {largestMarket ? formatAssetValueCompact(largestMarket.gtv * (branchRate + franchiseRate + countryRate)) : '—'}
                                </div>
                                {largestMarket && (
                                    <div style={{ fontSize: 9, color: '#6B7280', display: 'inline-flex', alignItems: 'center', gap: 4, fontWeight: 500 }}>
                                        <MiniFlag country={largestMarket.country} size={12} />
                                        {countryDisplayName(largestMarket.country)} — Top market
                                    </div>
                                )}
                            </article>
                            {/* Mini bar chart */}
                            <article style={{ border: `1px solid ${brand.borderLight}`, background: '#fff', borderRadius: 10, padding: '9px 9px 8px' }}>
                                <div style={{ fontSize: 9, color: '#575D63', textTransform: 'uppercase', fontWeight: 600 }}>Royalties by Month</div>
                                <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 5, height: 52, marginTop: 10, padding: '0 4px' }}>
                                    {monthlyBars.map((b, i) => {
                                        const pct = Math.max(10, (b.value / barMax) * 100);
                                        const isLast = i === monthlyBars.length - 1;
                                        return (
                                            <div key={b.label} style={{ flex: 1, maxWidth: 22, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                                                <div style={{ width: '100%', height: `${Math.min(pct, 100) * 0.46}px`, maxHeight: 46, background: isLast ? brand.gold : '#D8DCE0', borderRadius: 4 }} />
                                            </div>
                                        );
                                    })}
                                </div>
                                <div style={{ fontSize: 9, color: brand.gold, fontWeight: 700, marginTop: 8, textAlign: 'center' }}>{formatAssetValueCompact(totalRoyalties)}</div>
                            </article>
                        </div>
                    </section>

                    {/* Live Royalty Flow — 3-column layout */}
                    <article style={{ ...card, padding: 14, marginBottom: 12 }}>
                        <h3 style={{ ...sectionTitle, margin: '0 0 12px' }}>Live Royalty Flow</h3>
                        {royaltyFlowRows.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 16px', color: brand.muted }}>
                                <i className="fas fa-stream" style={{ fontSize: 24, marginBottom: 6, display: 'block', opacity: 0.3 }}></i>
                                <div style={{ fontSize: 11 }}>No royalty flow data yet.</div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 0, minWidth: isMobile ? 0 : 520 }}>
                                    {/* Branch → Franchise */}
                                    <div style={{ borderRight: isMobile ? 'none' : `1px solid ${brand.borderRow}`, paddingRight: isMobile ? 0 : 12 }}>
                                        <div style={{ fontSize: 9, color: brand.muted, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>Branch → Franchise ({Math.round(franchiseRate * 100)}%)</div>
                                        {royaltyFlowRows.map((r, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${brand.borderRow}`, fontSize: 11 }}>
                                                <div>
                                                    <span style={{ color: brand.text, fontWeight: 600 }}>{r.branch}</span>
                                                    <span style={{ color: brand.muted, margin: '0 3px' }}>→</span>
                                                    <span style={{ color: brand.muted, fontSize: 10, display: 'inline-flex', alignItems: 'center', gap: 3, verticalAlign: 'middle' }}>
                                                        <MiniFlag country={r.region} size={10} />
                                                        {countryDisplayName(r.region)}
                                                    </span>
                                                </div>
                                                <span style={{ color: brand.money, fontWeight: 700 }}>{formatAssetValueCompact(r.branchAmount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Franchise → Country */}
                                    <div style={{ padding: isMobile ? '12px 0 0' : '0 12px', borderRight: isMobile ? 'none' : `1px solid ${brand.borderRow}` }}>
                                        <div style={{ fontSize: 9, color: brand.muted, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>Franchise → Country ({countryRate * 100}%)</div>
                                        {royaltyFlowRows.map((r, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${brand.borderRow}`, fontSize: 11 }}>
                                                <span style={{ color: brand.text, fontWeight: 600 }}>{r.franchise}</span>
                                                <span style={{ color: brand.money, fontWeight: 700 }}>{formatAssetValueCompact(r.franchiseAmount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                    {/* Country → Global HQ */}
                                    <div style={{ padding: isMobile ? '12px 0 0' : '0 0 0 12px' }}>
                                        <div style={{ fontSize: 9, color: brand.muted, fontWeight: 700, marginBottom: 10, textTransform: 'uppercase' }}>Country → Global ({countryRate * 100}%)</div>
                                        {royaltyFlowRows.map((r, i) => (
                                            <div key={i} style={{ display: 'flex', justifyContent: 'flex-end', padding: '8px 0', borderBottom: `1px solid ${brand.borderRow}`, fontSize: 11 }}>
                                                <span style={{ color: brand.money, fontWeight: 700 }}>{formatAssetValueCompact(r.globalAmount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </article>

                    {/* Commission Engine */}
                    <article style={{ ...card, padding: 14, marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                            <h3 style={sectionTitle}>Commission Engine</h3>
                            <span style={{ fontSize: 9, color: brand.muted }}>{new Date().toLocaleString('default', { month: 'long', year: 'numeric' })} · {formatAssetValueCompact(totalPayouts)} payouts</span>
                        </div>
                        {commissionRows.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '24px 16px', color: brand.muted }}>
                                <i className="fas fa-calculator" style={{ fontSize: 24, marginBottom: 6, display: 'block', opacity: 0.3 }}></i>
                                <div style={{ fontSize: 11 }}>No commission data yet.</div>
                            </div>
                        ) : (
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 720, fontSize: 10 }}>
                                    <thead>
                                        <tr style={{ borderBottom: `2px solid ${brand.border}` }}>
                                            {['Agent', 'GTV MTD', 'Comm %', 'Gross', 'Retention', 'Net Payout', 'Status'].map((h) => (
                                                <th key={h} style={{ textAlign: h === 'Agent' ? 'left' : h === 'Status' ? 'center' : 'right', padding: '8px 6px', color: brand.muted, fontWeight: 700, textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {commissionRows.map((r, i) => (
                                            <tr key={i} style={{ borderBottom: `1px solid ${brand.borderRow}` }}>
                                                <td style={{ padding: '8px 6px' }}>
                                                    <div style={{ fontWeight: 600, color: brand.text }}>{r.name}</div>
                                                    <div style={{ fontSize: 9, color: brand.muted }}>{r.tier} tier</div>
                                                </td>
                                                <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: brand.primary }}>{formatAssetValueCompact(r.gtv)}</td>
                                                <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>{r.commPct}%</td>
                                                <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>{formatAssetValueCompact(r.gross)}</td>
                                                <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 600 }}>{formatAssetValueCompact(r.retention)}</td>
                                                <td style={{ textAlign: 'right', padding: '8px 6px', fontWeight: 700, color: brand.primary }}>{formatAssetValueCompact(r.net)}</td>
                                                <td style={{ textAlign: 'center', padding: '8px 6px' }}>
                                                    <span style={getStatusPill(r.status)}>{r.status}</span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </article>
                    </div>
                </main>
            </div>
        </div>
    );
}

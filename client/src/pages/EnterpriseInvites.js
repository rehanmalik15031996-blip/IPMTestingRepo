import React, { useEffect, useState, useCallback } from 'react';
import api from '../config/api';
import Sidebar from '../components/Sidebar';
import LogoLoading from '../components/LogoLoading';
import { useIsMobile } from '../hooks/useMediaQuery';
import { showNotification } from '../components/NotificationManager';
import { brand, card, sectionTitle, pageShell } from '../components/enterpriseTheme';

export default function EnterpriseInvites() {
    const isMobile = useIsMobile();
    const [user] = useState(() => { try { return JSON.parse(localStorage.getItem('user') || '{}'); } catch { return {}; } });
    const [invites, setInvites] = useState([]);
    const [loading, setLoading] = useState(true);

    const role = String(user?.role || '').toLowerCase();
    const isEnterprise = role === 'enterprise';

    const refresh = useCallback(async () => {
        try {
            const res = await api.get('/api/enterprise/pending-invites');
            setInvites(res.data?.invites || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { refresh(); }, [refresh]);

    const handleAccept = async (token) => {
        try {
            const res = await api.post('/api/enterprise/accept-invite', { token });
            showNotification(res.data?.message || 'Invite accepted!', 'success');
            if (res.data?.enterpriseName && user) {
                const updated = { ...user, enterpriseId: 'linked', enterpriseName: res.data.enterpriseName };
                localStorage.setItem('user', JSON.stringify(updated));
            }
            refresh();
        } catch (err) {
            showNotification(err.response?.data?.message || 'Failed to accept invite.', 'error');
        }
    };

    const shell = pageShell(isMobile);

    if (loading) {
        return (
            <div className="dashboard-container" style={shell.container}>
                <Sidebar />
                <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
                    <main className="dashboard-main" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', ...shell.main }}>
                        <LogoLoading message="Loading invites..." style={{ minHeight: '60vh' }} />
                    </main>
                </div>
            </div>
        );
    }

    return (
        <div className="dashboard-container" style={shell.container}>
            <Sidebar />
            <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: '100vh' }}>
                <main className="dashboard-main" style={{ display: 'flex', flexDirection: 'column', minHeight: 0, flex: 1, ...shell.main }}>
                    <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
                        <header style={{ marginBottom: 14 }}>
                            <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: brand.text }}>
                                <i className="fas fa-paper-plane" style={{ color: brand.gold, marginRight: 8 }}></i>
                                {isEnterprise ? 'Pending Invites' : 'Enterprise Invites'}
                            </h2>
                            <p style={{ color: brand.muted, margin: '2px 0 0', fontSize: 11 }}>
                                {isEnterprise
                                    ? 'Invites you have sent to franchises / branches that are waiting for acceptance.'
                                    : 'Enterprise groups that have invited your franchise to join.'}
                            </p>
                        </header>

                        <article style={{ ...card, padding: 14 }}>
                            <h3 style={sectionTitle}>
                                {isEnterprise ? 'SENT INVITES' : 'RECEIVED INVITES'} ({invites.length})
                            </h3>
                            {invites.length === 0 ? (
                                <div style={{ textAlign: 'center', padding: '30px 16px', color: brand.muted }}>
                                    <i className="fas fa-inbox" style={{ fontSize: 28, marginBottom: 8, opacity: 0.3, display: 'block' }}></i>
                                    <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 4 }}>No pending invites</div>
                                    <div style={{ fontSize: 11 }}>
                                        {isEnterprise ? 'All invites accepted or none sent yet.' : 'No enterprise has invited your franchise yet.'}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ marginTop: 10, overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 10, minWidth: 400 }}>
                                        <thead>
                                            <tr style={{ borderBottom: `2px solid ${brand.border}` }}>
                                                <th style={{ textAlign: 'left', padding: '8px 6px', color: brand.muted, fontWeight: 700, textTransform: 'uppercase' }}>{isEnterprise ? 'Franchise / Branch' : 'Enterprise'}</th>
                                                <th style={{ textAlign: 'left', padding: '8px 6px', color: brand.muted, fontWeight: 700, textTransform: 'uppercase' }}>{isEnterprise ? 'Email' : 'Details'}</th>
                                                <th style={{ textAlign: 'center', padding: '8px 6px', color: brand.muted, fontWeight: 700, textTransform: 'uppercase' }}>Status</th>
                                                {isEnterprise && <th style={{ textAlign: 'center', padding: '8px 6px', color: brand.muted, fontWeight: 700, textTransform: 'uppercase' }}>Type</th>}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {invites.map((inv) => (
                                                <tr key={inv._id} style={{ borderBottom: `1px solid ${brand.borderRow}` }}>
                                                    {isEnterprise ? (
                                                        <>
                                                            <td style={{ padding: '10px 6px', fontWeight: 600, color: brand.text }}>{inv.agencyName || 'Unknown'}</td>
                                                            <td style={{ padding: '10px 6px', color: brand.muted }}>{inv.agencyEmail}</td>
                                                            <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                                                                <span style={{ fontSize: 9, color: '#8A5F0A', fontWeight: 600, background: 'rgba(231,161,26,0.22)', padding: '3px 8px', borderRadius: 999 }}>Awaiting</span>
                                                            </td>
                                                            <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                                                                <span style={{ fontSize: 9, color: brand.muted, background: 'rgba(107,114,128,0.12)', padding: '3px 8px', borderRadius: 999, fontWeight: 600 }}>{inv.type === 'new' ? 'New signup' : 'Existing'}</span>
                                                            </td>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <td style={{ padding: '10px 6px', fontWeight: 600, color: brand.text }}>{inv.enterpriseName || 'Enterprise Group'}</td>
                                                            <td style={{ padding: '10px 6px' }}>
                                                                <div style={{ fontSize: 10, color: brand.muted }}>Wants to add your franchise</div>
                                                                <div style={{ fontSize: 9, color: brand.muted }}>Expires {new Date(inv.expiresAt).toLocaleDateString()}</div>
                                                            </td>
                                                            <td style={{ padding: '10px 6px', textAlign: 'center' }}>
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleAccept(inv.token)}
                                                                    style={{ border: 'none', borderRadius: 999, cursor: 'pointer', fontWeight: 700, fontSize: 10, padding: '6px 12px', background: brand.primary, color: '#fff', display: 'inline-flex', alignItems: 'center', gap: 4 }}
                                                                >
                                                                    <i className="fas fa-check"></i> Accept
                                                                </button>
                                                            </td>
                                                        </>
                                                    )}
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

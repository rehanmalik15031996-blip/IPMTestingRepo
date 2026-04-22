import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const BAR_BG = '#11575C';

const EnterpriseTopBar = ({ onAddClick }) => {
    const userStr = localStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    const displayName = user?.agencyName || user?.name || 'Enterprise';
    const firstName = displayName.split(' ')[0];
    const userInitial = firstName.charAt(0).toUpperCase();

    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    const [addOpen, setAddOpen] = useState(false);

    return (
        <header className="enterprise-topbar" style={{
            background: BAR_BG,
            display: 'flex',
            alignItems: 'center',
            padding: '0 20px',
            height: 52,
            borderRadius: 0,
            gap: 16,
            fontFamily: "'Poppins', sans-serif",
            flexShrink: 0,
        }}>
            {/* Greeting */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, whiteSpace: 'nowrap' }}>
                <span style={{ color: '#fff', fontSize: 15, fontWeight: 400 }}>Good day,</span>
                <span style={{ color: '#fff', fontSize: 17, fontWeight: 600, fontStyle: 'italic', fontFamily: "'Georgia', 'Times New Roman', serif" }}>{firstName}</span>
            </div>

            {/* Date */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 8 }}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>DATE</span>
                <span style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{dateStr}</span>
            </div>

            {/* Search */}
            <div style={{
                flex: 1,
                maxWidth: 340,
                height: 34,
                borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.25)',
                background: 'rgba(255,255,255,0.08)',
                display: 'flex',
                alignItems: 'center',
                padding: '0 14px',
                gap: 8,
                marginLeft: 8,
            }}>
                <i className="fas fa-search" style={{ color: 'rgba(255,255,255,0.5)', fontSize: 12 }} />
                <input
                    type="text"
                    placeholder="Find Agent, Agency..."
                    style={{
                        flex: 1,
                        border: 'none',
                        background: 'transparent',
                        color: '#fff',
                        fontSize: 13,
                        outline: 'none',
                        fontFamily: 'inherit',
                    }}
                />
            </div>

            {/* Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                <Link to="/enterprise-dashboard" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>
                    <i className="fas fa-home" style={{ color: '#fff', fontSize: 13 }} />
                </Link>
                <button type="button" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                    <i className="fas fa-bell" style={{ color: '#fff', fontSize: 13 }} />
                </button>
                <button type="button" style={{ width: 32, height: 32, borderRadius: '50%', background: 'rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', cursor: 'pointer' }}>
                    <i className="fas fa-user" style={{ color: '#fff', fontSize: 13 }} />
                </button>
            </div>

            {/* Download */}
            <button type="button" style={{
                display: 'flex', alignItems: 'center', gap: 6,
                padding: '7px 14px', borderRadius: 999,
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'transparent',
                color: '#fff', fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
            }}>
                <i className="fas fa-download" style={{ fontSize: 11 }} /> Download
            </button>

            {/* + Add */}
            <div style={{ position: 'relative' }}>
                <button
                    type="button"
                    onClick={() => setAddOpen(!addOpen)}
                    style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '7px 14px', borderRadius: 999,
                        border: 'none',
                        background: '#0d9488',
                        color: '#fff', fontSize: 12, fontWeight: 700,
                        cursor: 'pointer', fontFamily: 'inherit',
                    }}
                >
                    <i className="fas fa-plus" style={{ fontSize: 10 }} /> Add
                    <i className="fas fa-chevron-down" style={{ fontSize: 9, marginLeft: 2 }} />
                </button>
                {addOpen && (
                    <div style={{
                        position: 'absolute', top: '110%', right: 0,
                        background: '#fff', borderRadius: 10,
                        boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
                        minWidth: 180, zIndex: 100, overflow: 'hidden',
                    }}>
                        <button type="button" onClick={() => { setAddOpen(false); onAddClick?.(); }} style={{
                            display: 'block', width: '100%', padding: '10px 14px',
                            border: 'none', background: 'transparent', textAlign: 'left',
                            fontSize: 12, color: '#384046', cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                            <i className="fas fa-city" style={{ marginRight: 8, color: '#11575C' }} /> Link Franchise / Branch
                        </button>
                        <button type="button" onClick={() => setAddOpen(false)} style={{
                            display: 'block', width: '100%', padding: '10px 14px',
                            border: 'none', background: 'transparent', textAlign: 'left',
                            fontSize: 12, color: '#384046', cursor: 'pointer', fontFamily: 'inherit',
                        }}>
                            <i className="fas fa-user-plus" style={{ marginRight: 8, color: '#11575C' }} /> Invite Agent
                        </button>
                    </div>
                )}
            </div>

            {/* User avatar */}
            <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: '#ffc801', color: '#fff',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 700, fontSize: 13, flexShrink: 0,
            }}>
                {userInitial}
            </div>
        </header>
    );
};

export default EnterpriseTopBar;

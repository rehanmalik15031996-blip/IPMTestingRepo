import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../config/api';
import CommsPanel from './CommsPanel';
import NotificationPanel from './NotificationPanel';

const dashboardHomePath = (user) => {
    const r = String(user?.role || '').toLowerCase();
    const pt = String(user?.partnerType || '').toLowerCase();
    if (['agent', 'independent_agent', 'agency_agent'].includes(r)) return '/agent-dashboard';
    if (r === 'enterprise') return '/enterprise-dashboard';
    if (r === 'partner' && pt === 'bond_originator') return '/bond-originator';
    if (r === 'partner' && pt === 'conveyancer') return '/conveyancer';
    if (r === 'partner') return '/partner-dashboard';
    return '/dashboard';
};

const RED_DOT = {
    position: 'absolute', top: 2, right: 2, width: 8, height: 8,
    borderRadius: '50%', background: '#E53E3E', border: '1.5px solid #1a2332',
};

const DashboardSplitTopBar = ({ user, searchValue, onSearchChange, onLeadSearchSubmit, isAgentOrAgency }) => {
    const navigate = useNavigate();
    const [addOpen, setAddOpen] = useState(false);
    const [commsOpen, setCommsOpen] = useState(false);
    const [bellOpen, setBellOpen] = useState(false);
    const [chatUnread, setChatUnread] = useState(0);
    const [bellUnread, setBellUnread] = useState(0);
    const addWrapRef = useRef(null);
    const bellWrapRef = useRef(null);

    const pollUnread = useCallback(async () => {
        try {
            const [convRes, notifRes] = await Promise.all([
                api.get('/api/comms/conversations', { params: { unreadOnly: 'true' } }).catch(() => null),
                api.get('/api/comms/notifications', { params: { unreadOnly: 'true' } }).catch(() => null),
            ]);
            if (convRes?.data?.success) setChatUnread(convRes.data.totalUnread || 0);
            if (notifRes?.data?.success) setBellUnread(notifRes.data.unreadCount || 0);
        } catch { /* silent */ }
    }, []);

    useEffect(() => {
        if (!user) return;
        pollUnread();
        const iv = setInterval(pollUnread, 30000);
        return () => clearInterval(iv);
    }, [user, pollUnread]);

    useEffect(() => {
        if (!addOpen) return;
        const close = (e) => {
            if (addWrapRef.current && !addWrapRef.current.contains(e.target)) setAddOpen(false);
        };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [addOpen]);

    if (!user) return null;

    const firstName = user?.name?.split(' ')?.[0] || 'User';
    const userInitial = firstName.charAt(0).toUpperCase();
    const homePath = dashboardHomePath(user);
    const role = String(user.role || '').toLowerCase();
    const partnerType = String(user?.partnerType || '').toLowerCase();
    const isEnterprise = role === 'enterprise';
    const isBondOriginator = role === 'partner' && partnerType === 'bond_originator';
    const isConveyancer = role === 'partner' && partnerType === 'conveyancer';
    const isPartner = role === 'partner';
    const today = new Date();
    const dateStr = today.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

    return (
        <header className="dash-split-topbar" role="banner">
            <Link to="/" className="dash-split-topbar__brand" aria-label="IPM home">
                <img src="/logo-white.png" alt="" className="dash-split-topbar__brand-logo" />
            </Link>
            <div className="dash-split-topbar__main">
                <div className="dash-split-topbar__greet">
                    <span className="dash-split-topbar__greet-prefix">Good day, </span>
                    <span className="dash-split-topbar__greet-name">{firstName}</span>
                </div>
                <div className="dash-split-topbar__search-wrap">
                    <span className="dash-split-topbar__date-value">{dateStr}</span>
                    {isAgentOrAgency ? (
                        <form className="dash-split-topbar__search-form" onSubmit={onLeadSearchSubmit}>
                            <input
                                type="text"
                                className="dash-split-topbar__search-input"
                                placeholder="Find Agent, Agency..."
                                value={searchValue}
                                onChange={(e) => onSearchChange(e.target.value)}
                                aria-label="Find agent or agency"
                            />
                        </form>
                    ) : (
                        <div className="dash-split-topbar__search-form dash-split-topbar__search-form--muted">
                            <input
                                type="text"
                                className="dash-split-topbar__search-input"
                                placeholder="Find Agent, Agency..."
                                readOnly
                                aria-readonly="true"
                            />
                        </div>
                    )}
                </div>
                <div className="dash-split-topbar__icons" aria-label="Quick links">
                    <Link to="/news" className="dash-split-topbar__icon-btn" title="Announcements" aria-label="Announcements">
                        <i className="fas fa-bullhorn" />
                    </Link>
                    <div style={{ position: 'relative' }} ref={bellWrapRef}>
                        <button type="button" className="dash-split-topbar__icon-btn" title="Notifications" aria-label="Notifications"
                            onClick={() => { setBellOpen(v => !v); setCommsOpen(false); }}>
                            <i className="fas fa-bell" />
                            {bellUnread > 0 && <span style={RED_DOT} />}
                        </button>
                        <NotificationPanel
                            open={bellOpen}
                            onClose={() => setBellOpen(false)}
                            onUnreadCountChange={setBellUnread}
                        />
                    </div>
                    <button type="button" className="dash-split-topbar__icon-btn" title="Messages" aria-label="Messages"
                        style={{ position: 'relative' }}
                        onClick={() => { setCommsOpen(true); setBellOpen(false); }}>
                        <i className="fas fa-comment-dots" />
                        {chatUnread > 0 && <span style={RED_DOT} />}
                    </button>
                </div>
                <div className="dash-split-topbar__actions">
                    <button type="button" className="dash-split-topbar__pill dash-split-topbar__pill--teal" title="Download">
                        <i className="fas fa-download" aria-hidden />
                        Download
                    </button>
                    <div className="dash-split-topbar__add-wrap" ref={addWrapRef}>
                        <button
                            type="button"
                            className="dash-split-topbar__pill dash-split-topbar__pill--teal"
                            aria-expanded={addOpen}
                            aria-haspopup="true"
                            onClick={() => setAddOpen((v) => !v)}
                        >
                            <i className="fas fa-plus" aria-hidden />
                            Add
                            <i className={`fas fa-chevron-down dash-split-topbar__add-chev${addOpen ? ' is-open' : ''}`} aria-hidden />
                        </button>
                        {addOpen && (
                            <div className="dash-split-topbar__add-menu" role="menu">
                                {isEnterprise ? (
                                    <>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/enterprise/agencies'); }}>
                                            <i className="fas fa-city" style={{ marginRight: 8, color: '#11575C' }} /> Link Franchise / Branch
                                        </button>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/enterprise/invites'); }}>
                                            <i className="fas fa-user-plus" style={{ marginRight: 8, color: '#11575C' }} /> Invite Agent
                                        </button>
                                    </>
                                ) : isBondOriginator ? (
                                    <>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/bond-originator/pipeline'); }}>
                                            <i className="fas fa-stream" style={{ marginRight: 8, color: '#11575C' }} /> New Pipeline Entry
                                        </button>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/bond-originator/crm'); }}>
                                            <i className="fas fa-address-book" style={{ marginRight: 8, color: '#11575C' }} /> Add CRM Contact
                                        </button>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/bond-originator/partners'); }}>
                                            <i className="fas fa-handshake" style={{ marginRight: 8, color: '#11575C' }} /> IPM Partners
                                        </button>
                                    </>
                                ) : isConveyancer ? (
                                    <>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/conveyancer/pipeline'); }}>
                                            <i className="fas fa-stream" style={{ marginRight: 8, color: '#11575C' }} /> New Pipeline Entry
                                        </button>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/conveyancer/crm'); }}>
                                            <i className="fas fa-address-book" style={{ marginRight: 8, color: '#11575C' }} /> Add CRM Contact
                                        </button>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/conveyancer/partners'); }}>
                                            <i className="fas fa-handshake" style={{ marginRight: 8, color: '#11575C' }} /> IPM Partners
                                        </button>
                                    </>
                                ) : isPartner ? (
                                    <>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/partner/pipeline'); }}>
                                            <i className="fas fa-stream" style={{ marginRight: 8, color: '#11575C' }} /> New Pipeline Entry
                                        </button>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/partner/crm'); }}>
                                            <i className="fas fa-address-book" style={{ marginRight: 8, color: '#11575C' }} /> Add CRM Contact
                                        </button>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/partner/partners'); }}>
                                            <i className="fas fa-handshake" style={{ marginRight: 8, color: '#11575C' }} /> IPM Partners
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/add-listing'); }}>
                                            Add listing
                                        </button>
                                        {['agency', 'independent_agent', 'agency_agent', 'agent'].includes(role) && (
                                            <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/crm?action=addLead'); }}>
                                                Add lead
                                            </button>
                                        )}
                                        {role === 'agency' && (
                                            <button type="button" className="dash-split-topbar__add-item" role="menuitem" onClick={() => { setAddOpen(false); navigate('/agents'); }}>
                                                Manage agents
                                            </button>
                                        )}
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                    <Link to="/" className="dash-split-topbar__home" title="Home" aria-label="Home">
                        <i className="fas fa-home" />
                    </Link>
                </div>
            </div>
            <CommsPanel
                open={commsOpen}
                onClose={() => { setCommsOpen(false); pollUnread(); }}
                currentUserId={user?._id || user?.id}
            />
        </header>
    );
};

export default DashboardSplitTopBar;

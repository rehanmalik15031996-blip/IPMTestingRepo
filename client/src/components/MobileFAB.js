import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useIsMobile } from '../hooks/useMediaQuery';
import LeadActionSheet from './LeadActionSheet';
import './MobileFAB.css';

const NAV_ACTIONS = [
    { id: 'add-lead', label: 'Add Lead', icon: 'fas fa-user-plus', path: '/crm', param: 'action=addLead' },
    { id: 'add-listing', label: 'Add Listing', icon: 'fas fa-home', path: '/add-listing' },
];

export default function MobileFAB() {
    const isMobile = useIsMobile();
    const [open, setOpen] = useState(false);
    const [showLeadAction, setShowLeadAction] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const fabRef = useRef(null);

    const userStr = localStorage.getItem('user');
    const user = userStr ? (() => { try { return JSON.parse(userStr); } catch { return null; } })() : null;
    const userId = user?._id != null ? String(user._id) : undefined;

    useEffect(() => { setOpen(false); }, [location.pathname]);

    useEffect(() => {
        if (!open || showLeadAction) return;
        const handleClickOutside = (e) => {
            if (fabRef.current && !fabRef.current.contains(e.target)) setOpen(false);
        };
        document.addEventListener('pointerdown', handleClickOutside);
        return () => document.removeEventListener('pointerdown', handleClickOutside);
    }, [open, showLeadAction]);

    if (!isMobile || !user) return null;

    const handleNav = (action) => {
        setOpen(false);
        navigate(action.param ? `${action.path}?${action.param}` : action.path);
    };

    return (
        <>
            <div className="mobile-fab-container" ref={fabRef}>
                {open && <div className="mobile-fab-backdrop" />}

                <div className={`mobile-fab-actions ${open ? 'mobile-fab-actions--open' : ''}`}>
                    <button
                        className="mobile-fab-action-btn"
                        style={{ transitionDelay: open ? '0ms' : '0ms' }}
                        onClick={() => { setOpen(false); setShowLeadAction(true); }}
                        aria-label="Lead Action"
                    >
                        <span className="mobile-fab-action-label">Lead Action</span>
                        <span className="mobile-fab-action-icon mobile-fab-action-icon--amber">
                            <i className="fas fa-bolt" />
                        </span>
                    </button>
                    {NAV_ACTIONS.map((action, i) => (
                        <button
                            key={action.id}
                            className="mobile-fab-action-btn"
                            style={{ transitionDelay: open ? `${(i + 1) * 60}ms` : '0ms' }}
                            onClick={() => handleNav(action)}
                            aria-label={action.label}
                        >
                            <span className="mobile-fab-action-label">{action.label}</span>
                            <span className="mobile-fab-action-icon">
                                <i className={action.icon} />
                            </span>
                        </button>
                    ))}
                </div>

                <button
                    className={`mobile-fab-toggle ${open ? 'mobile-fab-toggle--open' : ''}`}
                    onClick={() => setOpen((v) => !v)}
                    aria-label={open ? 'Close quick actions' : 'Quick actions'}
                    aria-expanded={open}
                >
                    <i className="fas fa-plus" />
                </button>
            </div>

            {showLeadAction && (
                <LeadActionSheet userId={userId} onClose={() => setShowLeadAction(false)} />
            )}
        </>
    );
}

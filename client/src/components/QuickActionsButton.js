import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import LeadActionSheet from './LeadActionSheet';
import './QuickActionsButton.css';

/**
 * Desktop "Quick Actions" dropdown button.
 * Props:
 *   userId       – current user id (required for Lead Action sheet)
 *   onAddAgent   – callback when "Add Agent" is picked (optional, agency-only)
 *   extraActions – additional { id, label, icon, onClick } entries (optional)
 */
export default function QuickActionsButton({ userId, onAddAgent, extraActions }) {
    const [open, setOpen] = useState(false);
    const [showLeadAction, setShowLeadAction] = useState(false);
    const ref = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        if (!open) return;
        const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
        document.addEventListener('pointerdown', close);
        return () => document.removeEventListener('pointerdown', close);
    }, [open]);

    const go = (path) => { setOpen(false); navigate(path); };

    const actions = [
        { id: 'lead-action', label: 'Lead Action', icon: 'fas fa-bolt', color: '#d4a017',
          onClick: () => { setOpen(false); setShowLeadAction(true); } },
        { id: 'add-lead', label: 'Add Lead', icon: 'fas fa-user-plus', color: '#11575C',
          onClick: () => go('/crm?action=addLead') },
        { id: 'add-listing', label: 'Add Listing', icon: 'fas fa-home', color: '#10575c',
          onClick: () => go('/add-listing') },
        ...(onAddAgent ? [{
            id: 'add-agent', label: 'Add Agent', icon: 'fas fa-user-tie', color: '#04342c',
            onClick: () => { setOpen(false); onAddAgent(); },
        }] : []),
        ...(extraActions || []),
    ];

    return (
        <>
            <div className="qa-btn-wrap" ref={ref}>
                <button
                    className="qa-btn-trigger"
                    onClick={() => setOpen((v) => !v)}
                    aria-haspopup="true"
                    aria-expanded={open}
                >
                    <span className="qa-btn-icon-circle">
                        <i className="fas fa-plus" />
                    </span>
                    <span className="qa-btn-label">Quick Actions</span>
                    <i className={`fas fa-chevron-down qa-btn-chevron ${open ? 'qa-btn-chevron--open' : ''}`} />
                </button>

                {open && (
                    <div className="qa-dropdown">
                        {actions.map((a) => (
                            <button key={a.id} className="qa-dropdown-item" onClick={a.onClick}>
                                <span className="qa-dropdown-icon" style={{ background: a.color }}>
                                    <i className={a.icon} />
                                </span>
                                {a.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {showLeadAction && (
                <LeadActionSheet userId={userId} onClose={() => setShowLeadAction(false)} />
            )}
        </>
    );
}

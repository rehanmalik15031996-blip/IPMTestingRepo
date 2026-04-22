import React, { useState, useEffect } from 'react';

const TEAL = '#11575C';
const TXT = '#1f2937';
const TXT2 = '#64748b';

const HOWTO_OPTIONS = [
    { key: 'addAgent',   title: 'Add an Agent',   icon: 'fas fa-user-plus',  question: 'How do I add an agent?' },
    { key: 'addLead',    title: 'Add a Lead',      icon: 'fas fa-user-tag',   question: 'How do I add a lead?' },
    { key: 'addListing', title: 'Add a Listing',   icon: 'fas fa-building',   question: 'How do I add a listing?' },
    { key: 'allGuides',  title: 'All Guides & FAQs', icon: 'fas fa-book-open', question: 'Show me all guides' },
];

const TourMenu = ({ onSelect, onClose, anchorRect }) => {
    const left = anchorRect ? anchorRect.right + 12 : 280;
    const bottom = anchorRect ? (window.innerHeight - anchorRect.top + 8) : 100;

    return (
        <>
            <div onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9998 }} />
            <div style={{
                position: 'fixed', bottom, left, zIndex: 9999, width: 260,
                background: '#fff', borderRadius: 16, padding: 16,
                boxShadow: '0 12px 40px rgba(0,0,0,0.18)', fontFamily: "'Inter', sans-serif",
                animation: 'tourFadeIn 0.2s ease',
            }}>
                <style>{`@keyframes tourFadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }`}</style>
                <h4 style={{ margin: '0 0 4px', fontSize: 15, fontWeight: 800, color: TXT }}>How-To Guides</h4>
                <p style={{ margin: '0 0 14px', fontSize: 11, color: TXT2 }}>Step-by-step walkthroughs via IPM AI</p>
                {HOWTO_OPTIONS.map((opt) => (
                    <button
                        key={opt.key}
                        onClick={() => onSelect(opt.question)}
                        style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: 12,
                            padding: '10px 12px', marginBottom: 6, border: '1px solid #e2e8f0',
                            borderRadius: 12, background: '#f8f9fa', cursor: 'pointer',
                            transition: 'all 0.15s', fontFamily: 'inherit', textAlign: 'left',
                        }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = TEAL; e.currentTarget.style.background = 'rgba(17,87,92,0.04)'; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8f9fa'; }}
                    >
                        <span style={{
                            width: 34, height: 34, borderRadius: '50%', background: TEAL,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 14, flexShrink: 0,
                        }}><i className={opt.icon} /></span>
                        <div>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: TXT }}>{opt.title}</p>
                            <p style={{ margin: 0, fontSize: 10, color: TXT2 }}>Step-by-step guide</p>
                        </div>
                        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" style={{ marginLeft: 'auto', flexShrink: 0 }}>
                            <path d="M7.5 5L12.5 10L7.5 15" stroke={TXT2} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                    </button>
                ))}
            </div>
        </>
    );
};

export default function GuidedTour() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [menuAnchor, setMenuAnchor] = useState(null);

    useEffect(() => {
        const handler = (e) => {
            setMenuAnchor(e.detail?.anchor || null);
            setMenuOpen(prev => !prev);
        };
        window.addEventListener('open-howto-menu', handler);
        return () => window.removeEventListener('open-howto-menu', handler);
    }, []);

    const handleSelect = (question) => {
        setMenuOpen(false);
        window.dispatchEvent(new CustomEvent('chatbot-ask', { detail: { question } }));
    };

    return (
        <>
            {menuOpen && (
                <TourMenu
                    anchorRect={menuAnchor}
                    onSelect={handleSelect}
                    onClose={() => setMenuOpen(false)}
                />
            )}
        </>
    );
}

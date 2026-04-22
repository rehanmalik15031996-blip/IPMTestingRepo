import React, { useState, useEffect, useCallback } from 'react';
import api from '../config/api';
import { invalidateDashboardCache } from '../config/dashboardCache';

const NOTE_CHANNELS = [
    { value: '', label: 'General' },
    { value: 'Phone call', label: 'Phone call' },
    { value: 'Email', label: 'Email' },
    { value: 'WhatsApp', label: 'WhatsApp' },
    { value: 'In person', label: 'In person' },
    { value: 'SMS', label: 'SMS' },
];

export const LEAD_ACTIONS = [
    { id: 'follow-up',    label: 'Schedule Follow-Up', icon: 'fas fa-calendar-check', color: '#d4a017' },
    { id: 'add-note',     label: 'Add Note',           icon: 'fas fa-sticky-note',    color: '#11575C' },
    { id: 'call',         label: 'Call',                icon: 'fas fa-phone-alt',      color: '#10575c' },
    { id: 'send-listing', label: 'Send Listing',       icon: 'fas fa-paper-plane',    color: '#04342c' },
    { id: 'viewing',      label: 'Schedule Viewing',   icon: 'fas fa-eye',            color: '#ffc801' },
];

export default function LeadActionSheet({ userId, onClose }) {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [selectedLead, setSelectedLead] = useState(null);
    const [activeAction, setActiveAction] = useState(null);
    const [saving, setSaving] = useState(false);

    const [fuDate, setFuDate] = useState('');
    const [fuTime, setFuTime] = useState('09:00');
    const [fuNote, setFuNote] = useState('');

    const [noteText, setNoteText] = useState('');
    const [noteChannel, setNoteChannel] = useState('');

    const [vwProperty, setVwProperty] = useState('');
    const [vwDate, setVwDate] = useState('');
    const [vwTime, setVwTime] = useState('10:00');

    // Send Listing
    const [slSearch, setSlSearch] = useState('');
    const [listings, setListings] = useState([]);
    const [slSelected, setSlSelected] = useState(null);
    const [slChannel, setSlChannel] = useState('email');
    const [slNote, setSlNote] = useState('');

    useEffect(() => {
        if (!userId) return;
        let cancelled = false;
        api.get(`/api/users/${userId}?type=dashboard&_=${Date.now()}`)
            .then((res) => {
                if (cancelled) return;
                const src = res.data.agentStats || res.data.stats;
                setLeads(src?.crmLeads || []);
                setListings(src?.portfolio || res.data.stats?.portfolio || []);
            })
            .catch(() => {})
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [userId]);

    const filtered = leads.filter((l) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        return (l.name || '').toLowerCase().includes(q) || (l.email || '').toLowerCase().includes(q) || (l.mobile || '').includes(q);
    });

    const resetForms = () => {
        setFuDate(''); setFuTime('09:00'); setFuNote('');
        setNoteText(''); setNoteChannel('');
        setVwProperty(''); setVwDate(''); setVwTime('10:00');
        setSlSearch(''); setSlSelected(null); setSlChannel('email'); setSlNote('');
    };

    const goBackToActions = () => { setActiveAction(null); resetForms(); };
    const goBackToLeads = () => { setSelectedLead(null); setActiveAction(null); resetForms(); };

    const handleActionTap = (action) => {
        if (!selectedLead) return;
        const phone = selectedLead.mobile || selectedLead.phone || '';
        const email = selectedLead.email || '';

        if (action.id === 'call') {
            if (phone) window.location.href = `tel:${phone.replace(/\s/g, '')}`;
            else alert('No phone number on this lead.');
            return;
        }
        setActiveAction(action.id);
    };

    const saveActivity = useCallback(async (summary, channel) => {
        if (!selectedLead || saving) return;
        setSaving(true);
        try {
            await api.put('/api/update-lead', {
                userId,
                leadId: selectedLead.id || selectedLead._id,
                lead: { name: selectedLead.name, email: selectedLead.email, status: selectedLead.status },
                activitySummary: summary,
                ...(channel ? { noteChannel: channel } : {}),
            });
            invalidateDashboardCache(userId);
            onClose();
        } catch {
            alert('Could not save. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [selectedLead, saving, userId, onClose]);

    const saveFollowUp = () => {
        if (!fuDate) return;
        const dt = fuTime ? `${fuDate}T${fuTime}` : fuDate;
        const pretty = new Date(dt).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        const summary = `Follow-up scheduled for ${pretty}${fuTime ? ` at ${fuTime}` : ''}${fuNote.trim() ? ` — ${fuNote.trim()}` : ''}`;
        saveActivity(summary, 'follow_up');
    };

    const saveNote = () => {
        if (!noteText.trim()) return;
        saveActivity(noteText.trim(), noteChannel || undefined);
    };

    const saveViewing = useCallback(async () => {
        if (!vwDate || !selectedLead || saving) return;
        setSaving(true);
        const pretty = new Date(vwDate).toLocaleDateString('en-ZA', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
        const summary = `Viewing scheduled for ${pretty}${vwTime ? ` at ${vwTime}` : ''}${vwProperty.trim() ? ` — ${vwProperty.trim()}` : ''}`;
        try {
            await api.put('/api/update-lead', {
                userId,
                leadId: selectedLead.id || selectedLead._id,
                lead: {
                    name: selectedLead.name,
                    email: selectedLead.email,
                    status: 'viewing_scheduled',
                    viewingScheduledProperty: vwProperty.trim() || undefined,
                    viewingScheduledDate: vwDate,
                    viewingScheduledTime: vwTime || undefined,
                },
                activitySummary: summary,
            });
            invalidateDashboardCache(userId);
            onClose();
        } catch {
            alert('Could not save. Please try again.');
        } finally {
            setSaving(false);
        }
    }, [vwDate, vwTime, vwProperty, selectedLead, saving, userId, onClose]);

    const handleSendListing = () => {
        if (!slSelected || !selectedLead) return;
        const title = slSelected.title || 'Property';
        const url = `${window.location.origin}/property/${slSelected._id || slSelected.id}`;
        const leadEmail = selectedLead.email || '';
        const leadPhone = selectedLead.mobile || selectedLead.phone || '';
        const body = `Hi ${selectedLead.name || ''},\n\nI'd like to share this property with you:\n${title}\n${url}${slNote.trim() ? `\n\n${slNote.trim()}` : ''}`;

        if (slChannel === 'email' && leadEmail) {
            window.location.href = `mailto:${leadEmail}?subject=${encodeURIComponent(`Property: ${title}`)}&body=${encodeURIComponent(body)}`;
        } else if (slChannel === 'whatsapp' && leadPhone) {
            const num = leadPhone.replace(/[\s+\-()]/g, '');
            window.open(`https://wa.me/${num}?text=${encodeURIComponent(body)}`, '_blank');
        } else if (slChannel === 'sms' && leadPhone) {
            window.location.href = `sms:${leadPhone.replace(/\s/g, '')}?body=${encodeURIComponent(body)}`;
        } else {
            alert(`No ${slChannel === 'email' ? 'email' : 'phone number'} on this lead.`);
            return;
        }

        saveActivity(`Sent listing "${title}" via ${slChannel}`, 'send_listing');
    };

    const filteredListings = listings.filter((p) => {
        if (!slSearch.trim()) return true;
        const q = slSearch.toLowerCase();
        return (p.title || '').toLowerCase().includes(q) || (p.location || '').toLowerCase().includes(q);
    });

    const renderLeadPicker = () => (
        <div className="fab-sheet-body">
            <input
                type="text"
                className="fab-sheet-search"
                placeholder="Search leads by name, email or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                autoFocus
            />
            <div className="fab-sheet-lead-list">
                {loading ? (
                    <p className="fab-sheet-hint"><i className="fas fa-circle-notch fa-spin" /> Loading leads…</p>
                ) : filtered.length === 0 ? (
                    <p className="fab-sheet-hint">No leads found.</p>
                ) : (
                    filtered.slice(0, 25).map((l) => (
                        <button
                            key={l.id || l._id || l.email}
                            className="fab-sheet-lead-row"
                            onClick={() => { setSelectedLead(l); setSearch(''); }}
                        >
                            <span className="fab-sheet-lead-avatar">{(l.name || '?')[0].toUpperCase()}</span>
                            <span className="fab-sheet-lead-info">
                                <span className="fab-sheet-lead-name">{l.name || 'Unnamed'}</span>
                                <span className="fab-sheet-lead-email">{l.email || l.mobile || '—'}</span>
                            </span>
                            <i className="fas fa-chevron-right" style={{ color: '#cbd5e1', fontSize: 12, marginLeft: 'auto' }} />
                        </button>
                    ))
                )}
            </div>
        </div>
    );

    const renderActionGrid = () => (
        <div className="fab-sheet-body">
            <button className="fab-sheet-back" onClick={goBackToLeads}>
                <i className="fas fa-arrow-left" /> Change lead
            </button>
            <div className="fab-sheet-selected-lead">
                <span className="fab-sheet-lead-avatar">{(selectedLead.name || '?')[0].toUpperCase()}</span>
                <span className="fab-sheet-lead-info">
                    <span className="fab-sheet-lead-name">{selectedLead.name || 'Unnamed'}</span>
                    <span className="fab-sheet-lead-email">{selectedLead.email || selectedLead.mobile || '—'}</span>
                </span>
            </div>
            <div className="fab-sheet-action-grid">
                {LEAD_ACTIONS.map((a) => (
                    <button key={a.id} className="fab-sheet-action-tile" onClick={() => handleActionTap(a)}>
                        <span className="fab-sheet-action-tile-icon" style={{ background: a.color }}>
                            <i className={a.icon} />
                        </span>
                        <span className="fab-sheet-action-tile-label">{a.label}</span>
                    </button>
                ))}
            </div>
        </div>
    );

    const renderFollowUpForm = () => (
        <div className="fab-sheet-body">
            <button className="fab-sheet-back" onClick={goBackToActions}>
                <i className="fas fa-arrow-left" /> Follow-Up for {selectedLead.name}
            </button>
            <label className="fab-sheet-label">Date</label>
            <input type="date" className="fab-sheet-input" value={fuDate} onChange={(e) => setFuDate(e.target.value)} />
            <label className="fab-sheet-label">Time <span className="fab-sheet-optional">(optional)</span></label>
            <input type="time" className="fab-sheet-input" value={fuTime} onChange={(e) => setFuTime(e.target.value)} />
            <label className="fab-sheet-label">Note <span className="fab-sheet-optional">(optional)</span></label>
            <textarea className="fab-sheet-input fab-sheet-textarea" rows={2} placeholder="e.g. Call back about Waterfall unit" value={fuNote} onChange={(e) => setFuNote(e.target.value)} />
            <button className="fab-sheet-save" disabled={!fuDate || saving} onClick={saveFollowUp}>
                {saving ? <><i className="fas fa-circle-notch fa-spin" /> Saving…</> : <><i className="fas fa-check" /> Schedule Follow-Up</>}
            </button>
        </div>
    );

    const renderNoteForm = () => (
        <div className="fab-sheet-body">
            <button className="fab-sheet-back" onClick={goBackToActions}>
                <i className="fas fa-arrow-left" /> Note for {selectedLead.name}
            </button>
            <label className="fab-sheet-label">Channel <span className="fab-sheet-optional">(optional)</span></label>
            <select className="fab-sheet-input" value={noteChannel} onChange={(e) => setNoteChannel(e.target.value)}>
                {NOTE_CHANNELS.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
            <label className="fab-sheet-label">Note</label>
            <textarea className="fab-sheet-input fab-sheet-textarea" rows={3} placeholder="What happened or what's next?" value={noteText} onChange={(e) => setNoteText(e.target.value)} autoFocus />
            <button className="fab-sheet-save" disabled={!noteText.trim() || saving} onClick={saveNote}>
                {saving ? <><i className="fas fa-circle-notch fa-spin" /> Saving…</> : <><i className="fas fa-check" /> Save Note</>}
            </button>
        </div>
    );

    const renderViewingForm = () => (
        <div className="fab-sheet-body">
            <button className="fab-sheet-back" onClick={goBackToActions}>
                <i className="fas fa-arrow-left" /> Viewing for {selectedLead.name}
            </button>
            <label className="fab-sheet-label">Property <span className="fab-sheet-optional">(optional)</span></label>
            <input type="text" className="fab-sheet-input" placeholder="e.g. 12 Elm St, Sandton" value={vwProperty} onChange={(e) => setVwProperty(e.target.value)} />
            <label className="fab-sheet-label">Date</label>
            <input type="date" className="fab-sheet-input" value={vwDate} onChange={(e) => setVwDate(e.target.value)} />
            <label className="fab-sheet-label">Time <span className="fab-sheet-optional">(optional)</span></label>
            <input type="time" className="fab-sheet-input" value={vwTime} onChange={(e) => setVwTime(e.target.value)} />
            <button className="fab-sheet-save" disabled={!vwDate || saving} onClick={saveViewing}>
                {saving ? <><i className="fas fa-circle-notch fa-spin" /> Saving…</> : <><i className="fas fa-check" /> Schedule Viewing</>}
            </button>
        </div>
    );

    const renderSendListingForm = () => (
        <div className="fab-sheet-body">
            <button className="fab-sheet-back" onClick={goBackToActions}>
                <i className="fas fa-arrow-left" /> Send Listing to {selectedLead.name}
            </button>

            {!slSelected ? (
                <>
                    <input
                        type="text"
                        className="fab-sheet-search"
                        placeholder="Search your listings…"
                        value={slSearch}
                        onChange={(e) => setSlSearch(e.target.value)}
                        autoFocus
                    />
                    <div className="fab-sheet-lead-list">
                        {filteredListings.length === 0 ? (
                            <p className="fab-sheet-hint">No listings found.</p>
                        ) : (
                            filteredListings.slice(0, 20).map((p) => (
                                <button
                                    key={p._id || p.id}
                                    className="fab-sheet-lead-row"
                                    onClick={() => setSlSelected(p)}
                                >
                                    <span className="fab-sheet-lead-avatar" style={{ background: '#10575c' }}>
                                        <i className="fas fa-home" style={{ fontSize: 14 }} />
                                    </span>
                                    <span className="fab-sheet-lead-info">
                                        <span className="fab-sheet-lead-name">{p.title || 'Untitled'}</span>
                                        <span className="fab-sheet-lead-email">{p.location || p.suburb || '—'}</span>
                                    </span>
                                    <i className="fas fa-chevron-right" style={{ color: '#cbd5e1', fontSize: 12, marginLeft: 'auto' }} />
                                </button>
                            ))
                        )}
                    </div>
                </>
            ) : (
                <>
                    <div className="fab-sheet-selected-lead" style={{ marginBottom: 12 }}>
                        <span className="fab-sheet-lead-avatar" style={{ background: '#10575c' }}>
                            <i className="fas fa-home" style={{ fontSize: 14 }} />
                        </span>
                        <span className="fab-sheet-lead-info">
                            <span className="fab-sheet-lead-name">{slSelected.title || 'Untitled'}</span>
                            <span className="fab-sheet-lead-email">{slSelected.location || slSelected.suburb || '—'}</span>
                        </span>
                        <button type="button" onClick={() => setSlSelected(null)} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 12 }}>Change</button>
                    </div>

                    <label className="fab-sheet-label">Send via</label>
                    <select className="fab-sheet-input" value={slChannel} onChange={(e) => setSlChannel(e.target.value)}>
                        <option value="email">Email</option>
                        <option value="whatsapp">WhatsApp</option>
                        <option value="sms">SMS</option>
                    </select>

                    <label className="fab-sheet-label">Message <span className="fab-sheet-optional">(optional)</span></label>
                    <textarea className="fab-sheet-input fab-sheet-textarea" rows={2} placeholder="Add a personal note…" value={slNote} onChange={(e) => setSlNote(e.target.value)} />

                    <button className="fab-sheet-save" onClick={handleSendListing}>
                        <i className="fas fa-paper-plane" /> Send Listing
                    </button>
                </>
            )}
        </div>
    );

    let body;
    if (!selectedLead) body = renderLeadPicker();
    else if (!activeAction) body = renderActionGrid();
    else if (activeAction === 'follow-up') body = renderFollowUpForm();
    else if (activeAction === 'add-note') body = renderNoteForm();
    else if (activeAction === 'send-listing') body = renderSendListingForm();
    else if (activeAction === 'viewing') body = renderViewingForm();
    else body = renderActionGrid();

    return (
        <div className="fab-sheet-overlay" onClick={onClose}>
            <div className="fab-sheet" onClick={(e) => e.stopPropagation()}>
                <div className="fab-sheet-handle" />
                <div className="fab-sheet-header">
                    <h3>{!selectedLead ? 'Lead Action' : activeAction ? LEAD_ACTIONS.find((a) => a.id === activeAction)?.label || 'Lead Action' : selectedLead.name || 'Lead Action'}</h3>
                    <button type="button" className="fab-sheet-close" onClick={onClose} aria-label="Close">
                        <i className="fas fa-times" />
                    </button>
                </div>
                {body}
            </div>
        </div>
    );
}

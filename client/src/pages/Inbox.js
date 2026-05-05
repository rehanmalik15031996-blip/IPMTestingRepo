import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import api from '../config/api';

const Inbox = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const userId = user?._id;
    const [accounts, setAccounts] = useState([]);
    const [messages, setMessages] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [selectedMessage, setSelectedMessage] = useState(null);
    const [loading, setLoading] = useState(true);
    const [composeOpen, setComposeOpen] = useState(false);
    const [composeTo, setComposeTo] = useState('');
    const [composeSubject, setComposeSubject] = useState('');
    const [composeBody, setComposeBody] = useState('');
    const [sending, setSending] = useState(false);
    const [searchParams, setSearchParams] = useSearchParams();

    const fetchAccounts = useCallback(async () => {
        if (!userId) return;
        try {
            const res = await api.get(`/api/email/accounts?userId=${userId}`);
            setAccounts(res.data?.accounts || []);
        } catch {
            setAccounts([]);
        }
    }, [userId]);

    const fetchMessages = useCallback(async () => {
        if (!userId || accounts.length === 0) {
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            const res = await api.get(`/api/email/messages?userId=${userId}&limit=30`);
            setMessages(res.data?.messages || []);
        } catch {
            setMessages([]);
        } finally {
            setLoading(false);
        }
    }, [userId, accounts.length]);

    useEffect(() => {
        fetchAccounts();
    }, [fetchAccounts]);

    useEffect(() => {
        if (accounts.length > 0) fetchMessages();
        else setLoading(false);
    }, [accounts.length, fetchMessages]);

    // Open compose from query (e.g. /inbox?compose=1&to=lead@example.com&subject=...&body=...)
    useEffect(() => {
        const compose = searchParams.get('compose');
        const to = searchParams.get('to');
        const subject = searchParams.get('subject') || '';
        const body = searchParams.get('body') || '';
        if (compose === '1' && to && accounts.length > 0) {
            setComposeTo(decodeURIComponent(to));
            setComposeSubject(decodeURIComponent(subject));
            if (body) setComposeBody(decodeURIComponent(body));
            setComposeOpen(true);
            setSearchParams({});
        }
    }, [searchParams, accounts.length, setSearchParams]);

    useEffect(() => {
        if (!selectedId || !userId) {
            setSelectedMessage(null);
            return;
        }
        api.get(`/api/email/messages?userId=${userId}&id=${selectedId}`)
            .then((res) => setSelectedMessage(res.data))
            .catch(() => setSelectedMessage(null));
    }, [selectedId, userId]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!userId || !composeTo.trim() || !composeSubject.trim() || sending) return;
        setSending(true);
        try {
            await api.post('/api/email/send', {
                userId,
                to: composeTo.trim(),
                subject: composeSubject.trim(),
                body: composeBody.trim(),
            });
            setComposeOpen(false);
            setComposeTo('');
            setComposeSubject('');
            setComposeBody('');
            fetchMessages();
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to send');
        } finally {
            setSending(false);
        }
    };

    const formatDate = (d) => {
        if (!d) return '—';
        try {
            const dt = typeof d === 'string' ? new Date(d) : d;
            return dt.toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' });
        } catch {
            return String(d);
        }
    };

    const getPreview = (msg) => {
        const sub = msg.subject || '';
        const snip = (msg.snippet || msg.body || '').slice(0, 80);
        return sub ? `${sub} — ${snip}` : snip || 'No subject';
    };

    if (!userId) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: 280, padding: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <p style={{ color: '#64748b' }}>Please log in to view your inbox.</p>
                </main>
            </div>
        );
    }

    if (accounts.length === 0) {
        return (
            <div style={{ display: 'flex', minHeight: '100vh' }}>
                <Sidebar />
                <main style={{ flex: 1, marginLeft: 280, padding: 40, background: '#f8fafc' }}>
                    <h1 style={{ color: '#1f3a3d', marginBottom: 16 }}>Inbox</h1>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 32, maxWidth: 480, border: '1px solid #e2e8f0' }}>
                        <p style={{ color: '#64748b', marginBottom: 20 }}>Connect your email in Settings to read and send messages here.</p>
                        <Link to="/settings" style={{ display: 'inline-block', padding: '12px 24px', background: '#11575C', color: '#fff', borderRadius: 8, fontWeight: 600, textDecoration: 'none' }}>
                            Open Settings → Email
                        </Link>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <Sidebar />
            <main style={{ flex: 1, marginLeft: 280, padding: 24, background: '#f8fafc', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <h1 style={{ color: '#1f3a3d', margin: 0 }}>Inbox</h1>
                    <button
                        type="button"
                        onClick={() => setComposeOpen(true)}
                        style={{ padding: '10px 20px', background: '#11575C', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}
                    >
                        Compose
                    </button>
                </div>
                <div style={{ flex: 1, display: 'flex', gap: 16, minHeight: 0, background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <div style={{ width: 320, borderRight: '1px solid #e2e8f0', overflowY: 'auto' }}>
                        {loading ? (
                            <div style={{ padding: 24, color: '#64748b' }}>Loading…</div>
                        ) : messages.length === 0 ? (
                            <div style={{ padding: 24, color: '#64748b' }}>No messages</div>
                        ) : (
                            messages.map((m) => (
                                <div
                                    key={m.id}
                                    onClick={() => setSelectedId(m.id)}
                                    style={{
                                        padding: '12px 16px',
                                        borderBottom: '1px solid #f1f5f9',
                                        cursor: 'pointer',
                                        background: selectedId === m.id ? '#f0fdfa' : 'transparent',
                                    }}
                                >
                                    <div style={{ fontWeight: 600, color: '#334155', fontSize: 14 }}>{(m.from || m.from_email || [])[0]?.email || 'Unknown'}</div>
                                    <div style={{ fontSize: 13, color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{getPreview(m)}</div>
                                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>{formatDate(m.date || m.received_at)}</div>
                                </div>
                            ))
                        )}
                    </div>
                    <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
                        {selectedMessage ? (
                            <>
                                <div style={{ marginBottom: 16 }}>
                                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 4 }}>From</div>
                                    <div style={{ fontWeight: 600 }}>{(selectedMessage.from || selectedMessage.from_email || [])[0]?.email || '—'}</div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>Subject</div>
                                    <div style={{ fontWeight: 600 }}>{selectedMessage.subject || '—'}</div>
                                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 8 }}>{formatDate(selectedMessage.date || selectedMessage.received_at)}</div>
                                </div>
                                <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: 16, fontSize: 14, color: '#334155', whiteSpace: 'pre-wrap' }}>
                                    {selectedMessage.body || selectedMessage.snippet || '—'}
                                </div>
                            </>
                        ) : (
                            <div style={{ color: '#94a3b8' }}>Select a message</div>
                        )}
                    </div>
                </div>
            </main>

            {composeOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100 }} onClick={() => !sending && setComposeOpen(false)}>
                    <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 520 }} onClick={(e) => e.stopPropagation()}>
                        <h3 style={{ margin: '0 0 16px 0', color: '#1f3a3d' }}>New message</h3>
                        <form onSubmit={handleSend}>
                            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>To</label>
                            <input type="email" value={composeTo} onChange={(e) => setComposeTo(e.target.value)} required style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Subject</label>
                            <input type="text" value={composeSubject} onChange={(e) => setComposeSubject(e.target.value)} required style={{ width: '100%', padding: 10, marginBottom: 12, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            <label style={{ display: 'block', fontSize: 12, color: '#64748b', marginBottom: 4 }}>Message</label>
                            <textarea value={composeBody} onChange={(e) => setComposeBody(e.target.value)} rows={5} style={{ width: '100%', padding: 10, marginBottom: 16, borderRadius: 8, border: '1px solid #e2e8f0', resize: 'vertical' }} />
                            <div style={{ display: 'flex', gap: 10 }}>
                                <button type="submit" disabled={sending} style={{ padding: '10px 20px', background: '#11575C', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 600, cursor: sending ? 'not-allowed' : 'pointer' }}>
                                    {sending ? 'Sending…' : 'Send'}
                                </button>
                                <button type="button" onClick={() => !sending && setComposeOpen(false)} style={{ padding: '10px 20px', background: '#e2e8f0', color: '#475569', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                                    Cancel
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Inbox;

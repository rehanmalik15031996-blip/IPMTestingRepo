import React, { useState, useEffect, useRef, useCallback } from 'react';
import api from '../config/api';
import { brand } from './enterpriseTheme';
import { useIsMobile } from '../hooks/useMediaQuery';

const CHANNEL_META = {
    whatsapp: { label: 'WhatsApp', color: '#25D366', icon: 'fab fa-whatsapp' },
    email:    { label: 'Email',    color: '#4285F4', icon: 'fas fa-envelope' },
    internal: { label: 'Internal', color: brand.primary, icon: 'fas fa-users' },
};
const TABS = ['all', 'whatsapp', 'email', 'internal'];
const POLL_INTERVAL = 12000;

const ChannelPill = ({ channel }) => {
    const m = CHANNEL_META[channel] || CHANNEL_META.internal;
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px',
            borderRadius: 10, fontSize: 10, fontWeight: 600, color: '#fff', background: m.color,
            lineHeight: '16px', whiteSpace: 'nowrap',
        }}>
            <i className={m.icon} style={{ fontSize: 9 }} /> {m.label}
        </span>
    );
};

const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
};

const Toast = ({ message, type, onDone }) => {
    useEffect(() => {
        const t = setTimeout(onDone, 4000);
        return () => clearTimeout(t);
    }, [onDone]);
    if (!message) return null;
    const bg = type === 'error' ? '#E53E3E' : type === 'success' ? '#38A169' : brand.primary;
    return (
        <div style={{
            position: 'absolute', top: 56, left: 16, right: 16, zIndex: 10,
            background: bg, color: '#fff', padding: '8px 14px', borderRadius: 8,
            fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 8,
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
            <i className={type === 'error' ? 'fas fa-exclamation-circle' : 'fas fa-check-circle'} />
            {message}
        </div>
    );
};

const s = {
    backdrop: {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        zIndex: 9998, transition: 'opacity .2s',
    },
    panel: (isMobile) => ({
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: isMobile ? '100%' : 400, background: '#fff',
        zIndex: 9999, display: 'flex', flexDirection: 'column',
        boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        transition: 'transform .25s ease',
        fontFamily: "'Poppins', sans-serif",
    }),
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px 10px', borderBottom: `1px solid ${brand.border}`,
    },
    title: { fontWeight: 600, fontSize: 15, color: brand.text },
    closeBtn: {
        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
        fontSize: 18, color: brand.muted,
    },
    tabs: {
        display: 'flex', gap: 0, padding: '0 16px', borderBottom: `1px solid ${brand.border}`,
    },
    tab: (active) => ({
        flex: 1, padding: '10px 0', textAlign: 'center', fontSize: 11,
        fontWeight: 600, cursor: 'pointer', border: 'none', background: 'none',
        color: active ? brand.primary : brand.muted,
        borderBottom: active ? `2px solid ${brand.primary}` : '2px solid transparent',
        transition: 'all .15s',
    }),
    list: { flex: 1, overflowY: 'auto', padding: '6px 0' },
    row: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        cursor: 'pointer', transition: 'background .12s', borderBottom: `1px solid ${brand.borderRow}`,
    },
    avatar: (ch) => ({
        width: 38, height: 38, borderRadius: '50%', display: 'flex',
        alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        background: CHANNEL_META[ch]?.color || brand.primary, color: '#fff',
        fontSize: 14, fontWeight: 600,
    }),
    rowBody: { flex: 1, minWidth: 0 },
    rowName: { fontWeight: 600, fontSize: 13, color: brand.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
    rowPreview: { fontSize: 11, color: brand.muted, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 },
    rowRight: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 },
    rowTime: { fontSize: 10, color: brand.mutedLight },
    unreadBadge: {
        minWidth: 18, height: 18, borderRadius: 9, background: brand.primary,
        color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex',
        alignItems: 'center', justifyContent: 'center', padding: '0 5px',
    },
    threadHeader: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderBottom: `1px solid ${brand.border}`,
    },
    backBtn: {
        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
        fontSize: 16, color: brand.primary,
    },
    threadTitle: { flex: 1, fontWeight: 600, fontSize: 14, color: brand.text },
    callBtn: {
        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
        fontSize: 16, color: '#25D366',
    },
    msgArea: { flex: 1, overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 6 },
    msgBubble: (mine) => ({
        maxWidth: '78%', padding: '8px 12px', borderRadius: 12,
        fontSize: 13, lineHeight: '18px', wordBreak: 'break-word',
        alignSelf: mine ? 'flex-end' : 'flex-start',
        background: mine ? brand.primary : '#F1F2F4',
        color: mine ? '#fff' : brand.text,
        borderBottomRightRadius: mine ? 4 : 12,
        borderBottomLeftRadius: mine ? 12 : 4,
    }),
    msgTime: (mine) => ({
        fontSize: 9, color: mine ? 'rgba(255,255,255,0.7)' : brand.mutedLight,
        marginTop: 2, textAlign: mine ? 'right' : 'left',
    }),
    compose: {
        display: 'flex', alignItems: 'flex-end', gap: 8, padding: '10px 16px',
        borderTop: `1px solid ${brand.border}`, background: '#FAFBFC',
    },
    composeInput: {
        flex: 1, border: `1px solid ${brand.border}`, borderRadius: 8,
        padding: '8px 12px', fontSize: 13, fontFamily: "'Poppins', sans-serif",
        resize: 'none', outline: 'none', minHeight: 36, maxHeight: 100,
    },
    sendBtn: {
        background: brand.primary, color: '#fff', border: 'none', borderRadius: 8,
        padding: '8px 14px', cursor: 'pointer', fontSize: 13, fontWeight: 600,
        whiteSpace: 'nowrap', opacity: 1,
    },
    attachBtn: {
        background: 'none', border: 'none', cursor: 'pointer', padding: 4,
        fontSize: 16, color: brand.muted,
    },
    newHeader: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '12px 16px',
        borderBottom: `1px solid ${brand.border}`,
    },
    newTitle: { flex: 1, fontWeight: 600, fontSize: 14, color: brand.text },
    contactSearch: {
        border: `1px solid ${brand.border}`, borderRadius: 8, padding: '8px 12px',
        fontSize: 13, width: '100%', fontFamily: "'Poppins', sans-serif",
        outline: 'none', margin: '12px 16px', boxSizing: 'border-box',
    },
    contactRow: {
        display: 'flex', alignItems: 'center', gap: 10, padding: '10px 16px',
        cursor: 'pointer', borderBottom: `1px solid ${brand.borderRow}`,
    },
    contactAvatar: {
        width: 34, height: 34, borderRadius: '50%', background: brand.primary,
        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 600, flexShrink: 0,
    },
    contactName: { fontWeight: 600, fontSize: 13, color: brand.text },
    contactRole: { fontSize: 11, color: brand.muted },
    empty: {
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        flex: 1, color: brand.muted, fontSize: 13, gap: 8, padding: 32,
    },
    card: {
        padding: 14, border: `1px solid ${brand.border}`, borderRadius: 10, marginBottom: 12,
    },
    cardTitle: {
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10,
        fontWeight: 600, fontSize: 13, color: brand.text,
    },
};

const CommsPanel = ({ open, onClose, currentUserId, initialCompose, onInitialComposeConsumed }) => {
    const isMobile = useIsMobile();
    const [activeTab, setActiveTab] = useState('all');
    const [conversations, setConversations] = useState([]);
    const [totalUnread, setTotalUnread] = useState(0);
    const [selectedConvo, setSelectedConvo] = useState(null);
    const [messages, setMessages] = useState([]);
    const [draft, setDraft] = useState('');
    const [sending, setSending] = useState(false);
    const [view, setView] = useState('list');
    const [contacts, setContacts] = useState([]);
    const [contactSearch, setContactSearch] = useState('');
    const [loadingConvos, setLoadingConvos] = useState(false);
    const [loadingMsgs, setLoadingMsgs] = useState(false);
    const [attachments, setAttachments] = useState([]);
    const [propertyQuery, setPropertyQuery] = useState('');
    const [propertyResults, setPropertyResults] = useState([]);
    const [showPropertyPicker, setShowPropertyPicker] = useState(false);
    const [toast, setToast] = useState(null);
    const [newMsgMode, setNewMsgMode] = useState('internal');
    const [emailTo, setEmailTo] = useState('');
    const [emailCc, setEmailCc] = useState('');
    const [emailSubject, setEmailSubject] = useState('');
    const msgEndRef = useRef(null);
    const pollRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);

    // Setup state
    const [waStatus, setWaStatus] = useState(null);
    const [emailAccounts, setEmailAccounts] = useState([]);
    const [setupLoaded, setSetupLoaded] = useState(false);
    const [waConnecting, setWaConnecting] = useState(false);

    const showToast = useCallback((message, type = 'error') => {
        setToast({ message, type });
    }, []);

    const fetchConversations = useCallback(async () => {
        try {
            const { data } = await api.get('/api/comms/conversations', {
                params: { channel: activeTab === 'all' ? undefined : activeTab },
            });
            if (data.success) {
                setConversations(data.conversations || []);
                setTotalUnread(data.totalUnread || 0);
            }
        } catch (err) {
            console.error('Fetch conversations error:', err);
        }
    }, [activeTab]);

    const fetchSetupStatus = useCallback(async () => {
        try {
            const [waRes, emRes] = await Promise.all([
                api.get('/api/comms/whatsapp', { params: { action: 'status' } }).catch(() => null),
                api.get('/api/comms/email', { params: { action: 'accounts' } }).catch(() => null),
            ]);
            if (waRes?.data) setWaStatus(waRes.data);
            if (emRes?.data?.success) setEmailAccounts(emRes.data.accounts || []);
            setSetupLoaded(true);
        } catch (err) {
            console.error('Fetch setup error:', err);
            setSetupLoaded(true);
        }
    }, []);

    useEffect(() => {
        if (!open) return;
        setLoadingConvos(true);
        Promise.all([fetchConversations(), fetchSetupStatus()])
            .finally(() => setLoadingConvos(false));
        pollRef.current = setInterval(fetchConversations, POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [open, fetchConversations, fetchSetupStatus]);

    // External callers (e.g. the CMA report's "Send by email" button) can
    // request that we open in compose mode with prefilled fields. Wait until
    // setup has loaded so we know whether to route the user to the email
    // setup screen or straight into compose.
    useEffect(() => {
        if (!open || !initialCompose || !setupLoaded) return;
        if (emailAccounts.length === 0) {
            // No email accounts yet — drop the user on the setup screen so
            // they can connect Gmail/Outlook before sending.
            setView('setup');
        } else {
            setNewMsgMode('email');
            setEmailTo(initialCompose.to || '');
            setEmailCc(initialCompose.cc || '');
            setEmailSubject(initialCompose.subject || '');
            setDraft(initialCompose.body || '');
            setView('new');
        }
        if (onInitialComposeConsumed) onInitialComposeConsumed();
    }, [open, initialCompose, setupLoaded, emailAccounts.length, onInitialComposeConsumed]);

    useEffect(() => {
        if (view !== 'thread' || !selectedConvo) return;
        let cancelled = false;
        const load = async () => {
            setLoadingMsgs(true);
            try {
                const { data } = await api.get('/api/comms/messages', {
                    params: { conversationId: selectedConvo._id },
                });
                if (!cancelled && data.success) setMessages(data.messages || []);
            } catch (err) {
                console.error('Fetch messages error:', err);
            }
            if (!cancelled) setLoadingMsgs(false);
        };
        load();
        const iv = setInterval(load, POLL_INTERVAL);
        return () => { cancelled = true; clearInterval(iv); };
    }, [view, selectedConvo]);

    useEffect(() => {
        msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const openThread = (convo) => {
        setSelectedConvo(convo);
        setView('thread');
        setDraft('');
    };

    const handleSend = async () => {
        if ((!draft.trim() && !attachments.length) || sending) return;
        setSending(true);
        try {
            const ch = selectedConvo?.channel;
            let endpoint = '/api/comms/messages';
            let payload = { conversationId: selectedConvo._id, content: draft.trim(), attachments: attachments.length ? attachments : undefined };
            if (ch === 'whatsapp') {
                endpoint = '/api/comms/whatsapp';
                payload = { action: 'send', conversationId: selectedConvo._id, content: draft.trim() };
            } else if (ch === 'email') {
                endpoint = '/api/comms/email';
                payload = { action: 'send', conversationId: selectedConvo._id, content: draft.trim() };
            }
            const { data } = await api.post(endpoint, payload);
            if (data.success) {
                setMessages((prev) => [...prev, data.message]);
                setDraft('');
                setAttachments([]);
                fetchConversations();
            } else {
                showToast(data.message || 'Failed to send message');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to send message');
        }
        setSending(false);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    };

    const fetchContacts = async () => {
        try {
            const { data } = await api.get('/api/comms/contacts');
            if (data.success) setContacts(data.contacts || []);
        } catch (err) {
            console.error('Fetch contacts error:', err);
        }
    };

    const openNewMessage = () => {
        setView('new');
        setContactSearch('');
        setNewMsgMode('internal');
        setEmailTo('');
        setEmailCc('');
        setEmailSubject('');
        setDraft('');
        fetchContacts();
    };

    const startConvoWith = async (contact) => {
        try {
            const { data } = await api.post('/api/comms/conversations', {
                channel: 'internal',
                participantIds: [contact._id],
            });
            if (data.success) {
                setSelectedConvo(data.conversation);
                setView('thread');
                setDraft('');
                fetchConversations();
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to start conversation');
        }
    };

    const handleMarkChannelRead = async (channel) => {
        try {
            await api.post('/api/comms/conversations', { action: 'mark-channel-read', channel });
            showToast(`${CHANNEL_META[channel]?.label || channel} marked as read`, 'success');
            fetchConversations();
        } catch (err) {
            showToast('Failed to clear unread');
        }
    };

    const handleSendNewEmail = async () => {
        if (!emailTo.trim() || !emailSubject.trim() || !draft.trim()) {
            showToast('To, Subject, and body are all required');
            return;
        }
        setSending(true);
        try {
            const { data } = await api.post('/api/comms/email', {
                action: 'compose',
                to: emailTo.trim(),
                cc: emailCc.trim() || undefined,
                subject: emailSubject.trim(),
                content: draft.trim(),
            });
            if (data.success) {
                showToast('Email sent!', 'success');
                setSelectedConvo(data.conversation);
                setView('thread');
                setDraft('');
                fetchConversations();
            } else {
                showToast(data.message || 'Failed to send email');
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to send email');
        }
        setSending(false);
    };

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files || []);
        for (const f of files) {
            const reader = new FileReader();
            reader.onload = () => {
                setAttachments(prev => [...prev, { type: f.type, url: reader.result, name: f.name, size: f.size }]);
            };
            reader.readAsDataURL(f);
        }
        e.target.value = '';
    };

    const removeAttachment = (idx) => setAttachments(prev => prev.filter((_, i) => i !== idx));

    const searchProperties = useCallback(async (q) => {
        if (!q || q.length < 2) { setPropertyResults([]); return; }
        try {
            const { data } = await api.get('/api/comms/property-search', { params: { q } });
            if (data.success) setPropertyResults(data.properties || []);
        } catch { /* ok */ }
    }, []);

    useEffect(() => {
        const t = setTimeout(() => searchProperties(propertyQuery), 300);
        return () => clearTimeout(t);
    }, [propertyQuery, searchProperties]);

    const attachProperty = (prop) => {
        setAttachments(prev => [...prev, {
            type: 'property', name: prop.title, url: `/property/${prop._id}`, propertyId: prop._id,
        }]);
        setShowPropertyPicker(false);
        setPropertyQuery('');
    };

    // ─── WhatsApp connect (Meta Embedded Signup OAuth) ───
    const handleConnectWhatsApp = async () => {
        setWaConnecting(true);
        try {
            const { data } = await api.post('/api/comms/whatsapp', { action: 'auth-url' });
            if (data.url) {
                const w = 700, h = 750;
                const left = window.screenX + (window.outerWidth - w) / 2;
                const top = window.screenY + (window.outerHeight - h) / 2;
                const popup = window.open(data.url, 'waOAuth', `width=${w},height=${h},left=${left},top=${top}`);
                if (!popup) {
                    showToast('Popup blocked — please allow popups for this site');
                    setWaConnecting(false);
                    return;
                }
                const onMsg = (e) => {
                    if (e.data?.type === 'wa_oauth_done') {
                        window.removeEventListener('message', onMsg);
                        showToast(`WhatsApp connected: ${e.data.phone || 'Success'}`, 'success');
                        setWaConnecting(false);
                        fetchSetupStatus();
                    } else if (e.data?.type === 'wa_oauth_error') {
                        window.removeEventListener('message', onMsg);
                        showToast(e.data.error || 'WhatsApp connection failed');
                        setWaConnecting(false);
                    }
                };
                window.addEventListener('message', onMsg);
                const iv = setInterval(() => {
                    if (popup?.closed) {
                        clearInterval(iv);
                        window.removeEventListener('message', onMsg);
                        setWaConnecting(false);
                        fetchSetupStatus();
                    }
                }, 1000);
            } else {
                showToast(data.message || 'WhatsApp OAuth not available');
                setWaConnecting(false);
            }
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to start WhatsApp connection');
            setWaConnecting(false);
        }
    };

    const handleDisconnectWhatsApp = async () => {
        try {
            await api.post('/api/comms/whatsapp', { action: 'disconnect' });
            showToast('WhatsApp disconnected', 'success');
            fetchSetupStatus();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to disconnect');
        }
    };

    // ─── Email connect ───
    const handleConnectEmail = async (provider) => {
        try {
            const { data } = await api.post('/api/comms/email', { action: 'auth-url', provider });
            if (data.url) {
                const w = 600, h = 700;
                const left = window.screenX + (window.outerWidth - w) / 2;
                const top = window.screenY + (window.outerHeight - h) / 2;
                const popup = window.open(data.url, 'emailOAuth', `width=${w},height=${h},left=${left},top=${top}`);
                if (!popup) {
                    showToast('Popup blocked — please allow popups for this site');
                    return;
                }
                const onMsg = (e) => {
                    if (e.data?.type === 'email_oauth_done') {
                        window.removeEventListener('message', onMsg);
                        showToast('Email connected!', 'success');
                        fetchSetupStatus();
                    }
                };
                window.addEventListener('message', onMsg);
                const iv = setInterval(() => {
                    if (popup?.closed) { clearInterval(iv); fetchSetupStatus(); }
                }, 1000);
            } else {
                showToast(data.message || `${provider} OAuth is not configured. Add ${provider === 'gmail' ? 'GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET' : 'OUTLOOK_CLIENT_ID / OUTLOOK_CLIENT_SECRET'} to your environment variables.`);
            }
        } catch (err) {
            const msg = err.response?.data?.message || `Failed to connect ${provider}`;
            showToast(msg);
        }
    };

    const handleDisconnectEmail = async (accountId) => {
        try {
            await api.post('/api/comms/email', { action: 'disconnect', accountId });
            showToast('Email disconnected', 'success');
            fetchSetupStatus();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to disconnect');
        }
    };

    const handleSyncEmail = async (accountId) => {
        try {
            const { data } = await api.post('/api/comms/email', { action: 'sync', accountId });
            showToast(`Synced ${data.synced || 0} emails`, 'success');
            fetchConversations();
        } catch (err) {
            showToast(err.response?.data?.message || 'Failed to sync');
        }
    };

    // ─── Helpers ───
    const getConvoName = (convo) => {
        if (convo.title) return convo.title;
        if (convo.channel === 'whatsapp') return convo.metadata?.whatsappContactName || convo.metadata?.whatsappPhone || 'WhatsApp';
        if (convo.channel === 'email') return convo.metadata?.emailSubject || convo.metadata?.emailFrom || 'Email';
        const other = (convo.participantDetails || []).find(p => String(p._id) !== currentUserId);
        return other?.name || other?.agencyName || 'Conversation';
    };

    const getConvoInitial = (convo) => {
        const name = getConvoName(convo);
        return name.charAt(0).toUpperCase();
    };

    if (!open) return null;

    const hasNoChannels = setupLoaded && !waStatus?.connected && emailAccounts.length === 0;
    const isEmpty = conversations.length === 0 && !loadingConvos;

    const filteredContacts = contacts.filter(c =>
        (c.name || '').toLowerCase().includes(contactSearch.toLowerCase()) ||
        (c.agencyName || '').toLowerCase().includes(contactSearch.toLowerCase())
    );

    // ═══════════════════════════════════════════
    // VIEWS
    // ═══════════════════════════════════════════

    const renderSetup = () => (
        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: brand.text }}>Connect Channels</span>
                {view === 'setup' && (
                    <button onClick={() => setView('list')} style={{ ...s.backBtn, fontSize: 12 }}>
                        <i className="fas fa-arrow-left" style={{ marginRight: 4 }} /> Back
                    </button>
                )}
            </div>

            {/* WhatsApp */}
            <div style={s.card}>
                <div style={s.cardTitle}>
                    <i className="fab fa-whatsapp" style={{ fontSize: 18, color: '#25D366' }} />
                    WhatsApp Business
                </div>
                {waStatus?.connected ? (
                    <>
                        <div style={{ fontSize: 12, color: brand.text, marginBottom: 8 }}>
                            <i className="fas fa-check-circle" style={{ color: '#25D366', marginRight: 6 }} />
                            Connected{waStatus.displayPhone ? `: ${waStatus.displayPhone}` : ''}
                        </div>
                        <button onClick={handleDisconnectWhatsApp} style={{
                            ...s.sendBtn, background: '#E53E3E', fontSize: 11, padding: '5px 12px',
                        }}>
                            <i className="fas fa-unlink" style={{ marginRight: 4 }} /> Disconnect
                        </button>
                    </>
                ) : (
                    <>
                        <div style={{ fontSize: 11, color: brand.muted, marginBottom: 12, lineHeight: '16px' }}>
                            Connect your WhatsApp Business account by signing in with Meta. You'll be asked to approve access to your WhatsApp Business number.
                        </div>
                        <button onClick={handleConnectWhatsApp} disabled={waConnecting}
                            style={{ ...s.sendBtn, background: '#25D366', fontSize: 13, padding: '10px 16px', width: '100%',
                                opacity: waConnecting ? 0.6 : 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                borderRadius: 10 }}>
                            {waConnecting ? <i className="fas fa-spinner fa-spin" /> : <i className="fab fa-whatsapp" style={{ fontSize: 16 }} />}
                            {waConnecting ? 'Connecting...' : 'Connect with WhatsApp'}
                        </button>
                    </>
                )}
            </div>

            {/* Email */}
            <div style={s.card}>
                <div style={s.cardTitle}>
                    <i className="fas fa-envelope" style={{ fontSize: 16, color: '#4285F4' }} />
                    Email
                </div>
                {emailAccounts.length > 0 && emailAccounts.map(a => (
                    <div key={a._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, padding: '6px 8px', background: '#F7F8FA', borderRadius: 6 }}>
                        <span style={{ fontSize: 12, color: brand.text }}>
                            <i className={a.provider === 'gmail' ? 'fab fa-google' : 'fab fa-microsoft'}
                                style={{ marginRight: 6, color: a.provider === 'gmail' ? '#EA4335' : '#0078D4' }} />
                            {a.email}
                        </span>
                        <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => handleSyncEmail(a._id)} style={{ ...s.attachBtn, fontSize: 12, color: brand.primary }} title="Sync emails">
                                <i className="fas fa-sync-alt" />
                            </button>
                            <button onClick={() => handleDisconnectEmail(a._id)} style={{ ...s.attachBtn, fontSize: 12, color: '#E53E3E' }} title="Disconnect">
                                <i className="fas fa-times" />
                            </button>
                        </div>
                    </div>
                ))}
                <div style={{ fontSize: 11, color: brand.muted, marginBottom: 10, lineHeight: '16px' }}>
                    Connect your Gmail or Outlook account to send and receive emails within the app.
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => handleConnectEmail('gmail')} style={{
                        ...s.sendBtn, fontSize: 11, padding: '7px 14px', background: '#EA4335',
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                        <i className="fab fa-google" /> Add Gmail
                    </button>
                    <button onClick={() => handleConnectEmail('outlook')} style={{
                        ...s.sendBtn, fontSize: 11, padding: '7px 14px', background: '#0078D4',
                        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                    }}>
                        <i className="fab fa-microsoft" /> Add Outlook
                    </button>
                </div>
            </div>

            {/* Internal */}
            <div style={s.card}>
                <div style={s.cardTitle}>
                    <i className="fas fa-users" style={{ fontSize: 16, color: brand.primary }} />
                    In-App Messaging
                </div>
                <div style={{ fontSize: 12, color: brand.muted }}>
                    <i className="fas fa-check-circle" style={{ color: brand.primary, marginRight: 6 }} />
                    Active — message agents and managers in your organization.
                </div>
            </div>
        </div>
    );

    const renderWelcome = () => (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 32, textAlign: 'center' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${brand.primary}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                <i className="fas fa-comment-dots" style={{ fontSize: 28, color: brand.primary }} />
            </div>
            <div style={{ fontSize: 16, fontWeight: 600, color: brand.text, marginBottom: 6 }}>Welcome to Messages</div>
            <div style={{ fontSize: 12, color: brand.muted, lineHeight: '18px', marginBottom: 20, maxWidth: 280 }}>
                Connect your WhatsApp, Email, or start messaging your team right away.
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, width: '100%', maxWidth: 240 }}>
                <button onClick={() => setView('setup')} style={{
                    ...s.sendBtn, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                    <i className="fas fa-plug" /> Connect Channels
                </button>
                <button onClick={openNewMessage} style={{
                    ...s.sendBtn, width: '100%', background: '#fff', color: brand.primary,
                    border: `1.5px solid ${brand.primary}`, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                    <i className="fas fa-pen" /> New Internal Message
                </button>
            </div>
        </div>
    );

    const renderList = () => {
        const channelUnread = (ch) => conversations.filter(c => (ch === 'all' || c.channel === ch) && c.unread > 0).length;
        const tabUnread = channelUnread(activeTab);
        return (
        <>
            <div style={s.tabs}>
                {TABS.map((t) => {
                    const n = channelUnread(t);
                    return (
                        <button key={t} style={s.tab(activeTab === t)} onClick={() => setActiveTab(t)}>
                            {t === 'all' ? 'All' : CHANNEL_META[t]?.label || t}
                            {n > 0 && <span style={{ marginLeft: 4, minWidth: 16, height: 16, borderRadius: 8, background: brand.primary, color: '#fff', fontSize: 9, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>{n}</span>}
                        </button>
                    );
                })}
            </div>
            {tabUnread > 0 && (
                <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '4px 16px', borderBottom: `1px solid ${brand.borderRow}`, background: '#FAFBFC' }}>
                    {activeTab === 'all' ? (
                        <div style={{ display: 'flex', gap: 8 }}>
                            {['email', 'whatsapp', 'internal'].filter(ch => channelUnread(ch) > 0).map(ch => (
                                <button key={ch} onClick={() => handleMarkChannelRead(ch)}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: CHANNEL_META[ch]?.color || brand.primary, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                                    <i className="fas fa-check-double" style={{ fontSize: 9 }} /> Clear {CHANNEL_META[ch]?.label}
                                </button>
                            ))}
                        </div>
                    ) : (
                        <button onClick={() => handleMarkChannelRead(activeTab)}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 10, fontWeight: 600, color: brand.primary, padding: '2px 0', display: 'flex', alignItems: 'center', gap: 3 }}>
                            <i className="fas fa-check-double" style={{ fontSize: 9 }} /> Mark all as read
                        </button>
                    )}
                </div>
            )}
            <div style={s.list}>
                {loadingConvos && !conversations.length ? (
                    <div style={s.empty}><i className="fas fa-spinner fa-spin" /> Loading...</div>
                ) : !conversations.length ? (
                    <div style={s.empty}>
                        <i className="fas fa-comment-slash" style={{ fontSize: 28 }} />
                        No conversations yet
                        <button onClick={() => setView('setup')} style={{
                            ...s.sendBtn, fontSize: 11, padding: '6px 14px', marginTop: 8,
                        }}>
                            <i className="fas fa-plug" style={{ marginRight: 4 }} /> Connect a Channel
                        </button>
                    </div>
                ) : conversations.map((c) => (
                    <div key={c._id} style={s.row}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#F7F8FA'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                        onClick={() => openThread(c)}
                    >
                        <div style={s.avatar(c.channel)}>{getConvoInitial(c)}</div>
                        <div style={s.rowBody}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={s.rowName}>{c.channel === 'email' ? (c.metadata?.emailFrom || 'Email') : getConvoName(c)}</span>
                                <ChannelPill channel={c.channel} />
                            </div>
                            {c.channel === 'email' && c.metadata?.emailSubject && (
                                <div style={{ fontSize: 12, fontWeight: 600, color: brand.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 1 }}>
                                    {c.metadata.emailSubject}
                                </div>
                            )}
                            <div style={s.rowPreview}>{c.lastMessage?.content || 'No messages yet'}</div>
                        </div>
                        <div style={s.rowRight}>
                            <span style={s.rowTime}>{timeAgo(c.lastActivity)}</span>
                            {c.unread > 0 && <span style={s.unreadBadge}>{c.unread}</span>}
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ padding: '10px 16px', borderTop: `1px solid ${brand.border}` }}>
                <button onClick={openNewMessage} style={{
                    ...s.sendBtn, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                }}>
                    <i className="fas fa-pen" /> New Message
                </button>
            </div>
        </>
        );
    };

    const renderEmailMessage = (m) => {
        const mine = String(m.sender) === currentUserId;
        const fromLabel = mine ? 'You' : (m.senderExternal || selectedConvo?.metadata?.emailFrom || 'Unknown');
        const toLabel = m.metadata?.emailTo || selectedConvo?.metadata?.emailTo || '';
        const ccLabel = m.metadata?.emailCc || '';
        const dateStr = new Date(m.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const timeStr = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const metaLine = { fontSize: 11, color: brand.muted, marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' };
        return (
            <div key={m._id} style={{
                border: `1px solid ${brand.border}`, borderRadius: 10, marginBottom: 8,
                background: mine ? '#FAFBFC' : '#fff', overflow: 'hidden',
            }}>
                <div style={{
                    padding: '8px 12px', borderBottom: `1px solid ${brand.borderRow}`, background: mine ? '#F3F4F6' : '#FAFBFC',
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                            <div style={{
                                width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
                                background: mine ? brand.primary : '#4285F4', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 600,
                            }}>
                                {fromLabel.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 12, fontWeight: 600, color: brand.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {fromLabel}
                                </div>
                                <div style={{ fontSize: 10, color: brand.mutedLight }}>{dateStr} at {timeStr}</div>
                            </div>
                        </div>
                        {mine && m.status && (
                            <span style={{ fontSize: 10, color: brand.muted, flexShrink: 0 }}>
                                {m.status === 'sent' ? 'Sent' : m.status === 'delivered' ? 'Delivered' : m.status === 'read' ? 'Read' : m.status}
                            </span>
                        )}
                    </div>
                    {toLabel && <div style={metaLine}><strong>To:</strong> {toLabel}</div>}
                    {ccLabel && <div style={metaLine}><strong>Cc:</strong> {ccLabel}</div>}
                </div>
                <div style={{ padding: '10px 12px', fontSize: 13, color: brand.text, lineHeight: '20px', whiteSpace: 'pre-wrap' }}>
                    {m.content}
                </div>
                {m.attachments?.length > 0 && (
                    <div style={{ padding: '6px 12px 10px', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {m.attachments.map((a, i) => (
                            <a key={i} href={a.url} target="_blank" rel="noopener noreferrer"
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                                    borderRadius: 6, background: '#F1F2F4', fontSize: 11, color: brand.primary,
                                    textDecoration: 'none',
                                }}>
                                <i className="fas fa-paperclip" style={{ fontSize: 10 }} /> {a.name || 'Attachment'}
                            </a>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const renderThread = () => {
        const whatsappPhone = selectedConvo?.metadata?.whatsappPhone;
        const isEmail = selectedConvo?.channel === 'email';
        return (
            <>
                <div style={s.threadHeader}>
                    <button style={s.backBtn} onClick={() => setView('list')} title="Back">
                        <i className="fas fa-arrow-left" />
                    </button>
                    <span style={s.threadTitle}>{isEmail ? (selectedConvo?.metadata?.emailFrom || 'Email') : getConvoName(selectedConvo)}</span>
                    <ChannelPill channel={selectedConvo?.channel} />
                    {selectedConvo?.channel === 'whatsapp' && whatsappPhone && (
                        <a href={`whatsapp://call?phone=${whatsappPhone.replace(/[^0-9]/g, '')}`}
                            style={s.callBtn} title="Call via WhatsApp" target="_blank" rel="noopener noreferrer">
                            <i className="fas fa-phone-alt" />
                        </a>
                    )}
                </div>
                {isEmail && selectedConvo?.metadata?.emailSubject && (
                    <div style={{
                        padding: '8px 16px', borderBottom: `1px solid ${brand.border}`, background: '#FAFBFC',
                    }}>
                        <div style={{ fontSize: 10, fontWeight: 600, color: brand.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 }}>Subject</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: brand.text }}>{selectedConvo.metadata.emailSubject}</div>
                        {selectedConvo.metadata.emailFrom && (
                            <div style={{ fontSize: 11, color: brand.muted, marginTop: 3 }}>
                                <span style={{ fontWeight: 600 }}>From:</span> {selectedConvo.metadata.emailFrom}
                            </div>
                        )}
                        {selectedConvo.metadata.emailTo && (
                            <div style={{ fontSize: 11, color: brand.muted, marginTop: 1 }}>
                                <span style={{ fontWeight: 600 }}>To:</span> {selectedConvo.metadata.emailTo}
                            </div>
                        )}
                        {selectedConvo.metadata.emailCc && (
                            <div style={{ fontSize: 11, color: brand.muted, marginTop: 1 }}>
                                <span style={{ fontWeight: 600 }}>Cc:</span> {selectedConvo.metadata.emailCc}
                            </div>
                        )}
                    </div>
                )}
                <div style={s.msgArea}>
                    {loadingMsgs && !messages.length ? (
                        <div style={s.empty}><i className="fas fa-spinner fa-spin" /> Loading...</div>
                    ) : !messages.length ? (
                        <div style={s.empty}>
                            <i className={isEmail ? 'fas fa-envelope-open' : 'fas fa-paper-plane'} style={{ fontSize: 24 }} />
                            {isEmail ? 'No emails in this thread' : 'Send the first message'}
                        </div>
                    ) : isEmail ? messages.map(m => renderEmailMessage(m)) : messages.map((m) => {
                        const mine = String(m.sender) === currentUserId;
                        return (
                            <div key={m._id} style={{ alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '78%' }}>
                                <div style={s.msgBubble(mine)}>
                                    {m.attachments?.map((a, i) => (
                                        <div key={i} style={{ marginBottom: 4 }}>
                                            <a href={a.url} target="_blank" rel="noopener noreferrer"
                                                style={{ color: mine ? '#fff' : brand.primary, fontSize: 12 }}>
                                                <i className="fas fa-paperclip" /> {a.name || 'Attachment'}
                                            </a>
                                        </div>
                                    ))}
                                    {m.content}
                                </div>
                                <div style={s.msgTime(mine)}>
                                    {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    {mine && m.status && <span style={{ marginLeft: 4 }}>
                                        {m.status === 'read' ? '✓✓' : m.status === 'delivered' ? '✓✓' : m.status === 'sent' ? '✓' : ''}
                                    </span>}
                                </div>
                            </div>
                        );
                    })}
                    <div ref={msgEndRef} />
                </div>
                {attachments.length > 0 && (
                    <div style={{ padding: '6px 16px', display: 'flex', flexWrap: 'wrap', gap: 6, borderTop: `1px solid ${brand.border}` }}>
                        {attachments.map((a, i) => (
                            <span key={i} style={{
                                display: 'inline-flex', alignItems: 'center', gap: 4, padding: '3px 8px',
                                borderRadius: 6, background: '#F1F2F4', fontSize: 11, color: brand.text, maxWidth: 160,
                            }}>
                                <i className={a.type === 'property' ? 'fas fa-home' : 'fas fa-file'} style={{ fontSize: 10, color: brand.muted }} />
                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.name}</span>
                                <button onClick={() => removeAttachment(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: 10, color: brand.muted }}>
                                    <i className="fas fa-times" />
                                </button>
                            </span>
                        ))}
                    </div>
                )}
                {showPropertyPicker && (
                    <div style={{ padding: '8px 16px', borderTop: `1px solid ${brand.border}`, background: '#FAFBFC' }}>
                        <input
                            style={{ ...s.composeInput, width: '100%', marginBottom: 6, boxSizing: 'border-box' }}
                            placeholder="Search properties..."
                            value={propertyQuery}
                            onChange={(e) => setPropertyQuery(e.target.value)}
                            autoFocus
                        />
                        {propertyResults.map(p => (
                            <div key={p._id} style={{ ...s.contactRow, padding: '6px 0' }}
                                onClick={() => attachProperty(p)}>
                                <i className="fas fa-home" style={{ color: brand.primary, fontSize: 14 }} />
                                <div>
                                    <div style={{ fontSize: 12, fontWeight: 600, color: brand.text }}>{p.title}</div>
                                    <div style={{ fontSize: 10, color: brand.muted }}>{p.address}</div>
                                </div>
                            </div>
                        ))}
                        <button onClick={() => setShowPropertyPicker(false)}
                            style={{ ...s.attachBtn, fontSize: 11, color: brand.muted, marginTop: 4 }}>
                            Cancel
                        </button>
                    </div>
                )}
                <div style={s.compose}>
                    <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={handleFileSelect} />
                    <button style={s.attachBtn} title="Attach file" onClick={() => fileInputRef.current?.click()}>
                        <i className="fas fa-paperclip" />
                    </button>
                    {!isEmail && (
                        <button style={s.attachBtn} title="Attach property" onClick={() => setShowPropertyPicker(v => !v)}>
                            <i className="fas fa-home" />
                        </button>
                    )}
                    <textarea
                        ref={inputRef}
                        style={{ ...s.composeInput, minHeight: isEmail ? 60 : 36 }}
                        placeholder={isEmail ? 'Write your reply...' : 'Type a message...'}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        onKeyDown={isEmail ? undefined : handleKeyDown}
                        rows={isEmail ? 3 : 1}
                    />
                    <button style={{ ...s.sendBtn, opacity: (draft.trim() || attachments.length) ? 1 : 0.5 }} onClick={handleSend} disabled={sending}>
                        {sending ? <i className="fas fa-spinner fa-spin" /> : isEmail ? (
                            <><i className="fas fa-reply" style={{ marginRight: 4 }} /> Reply</>
                        ) : 'Send'}
                    </button>
                </div>
            </>
        );
    };

    const renderNew = () => {
        const modeTab = (mode, label, icon) => (
            <button key={mode} onClick={() => setNewMsgMode(mode)}
                style={{
                    flex: 1, padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', border: 'none', background: 'none',
                    color: newMsgMode === mode ? brand.primary : brand.muted,
                    borderBottom: newMsgMode === mode ? `2px solid ${brand.primary}` : '2px solid transparent',
                }}>
                <i className={icon} style={{ marginRight: 4 }} /> {label}
            </button>
        );

        const emailInput = { width: '100%', border: `1px solid ${brand.border}`, borderRadius: 6, padding: '7px 10px', fontSize: 12, fontFamily: "'Poppins', sans-serif", outline: 'none', boxSizing: 'border-box' };

        return (
            <>
                <div style={s.newHeader}>
                    <button style={s.backBtn} onClick={() => setView('list')} title="Back">
                        <i className="fas fa-arrow-left" />
                    </button>
                    <span style={s.newTitle}>New Message</span>
                </div>
                <div style={{ display: 'flex', borderBottom: `1px solid ${brand.border}` }}>
                    {modeTab('internal', 'In-App', 'fas fa-users')}
                    {modeTab('email', 'Email', 'fas fa-envelope')}
                </div>

                {newMsgMode === 'internal' ? (
                    <>
                        <input
                            style={s.contactSearch}
                            placeholder="Search contacts..."
                            value={contactSearch}
                            onChange={(e) => setContactSearch(e.target.value)}
                            autoFocus
                        />
                        <div style={s.list}>
                            {!filteredContacts.length ? (
                                <div style={s.empty}>
                                    <i className="fas fa-user-slash" style={{ fontSize: 24 }} />
                                    No contacts found
                                </div>
                            ) : filteredContacts.map((c) => (
                                <div key={c._id} style={s.contactRow}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#F7F8FA'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                    onClick={() => startConvoWith(c)}
                                >
                                    <div style={s.contactAvatar}>{(c.name || '?').charAt(0).toUpperCase()}</div>
                                    <div>
                                        <div style={s.contactName}>{c.name || 'Unknown'}</div>
                                        <div style={s.contactRole}>{c.role || ''} {c.agencyName ? `• ${c.agencyName}` : ''}</div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ) : (
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', padding: 16, gap: 10, overflowY: 'auto' }}>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: brand.muted, display: 'block', marginBottom: 3 }}>To *</label>
                            <input style={emailInput} placeholder="recipient@example.com" value={emailTo} onChange={(e) => setEmailTo(e.target.value)} autoFocus />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: brand.muted, display: 'block', marginBottom: 3 }}>Cc</label>
                            <input style={emailInput} placeholder="cc@example.com (optional)" value={emailCc} onChange={(e) => setEmailCc(e.target.value)} />
                        </div>
                        <div>
                            <label style={{ fontSize: 11, fontWeight: 600, color: brand.muted, display: 'block', marginBottom: 3 }}>Subject *</label>
                            <input style={emailInput} placeholder="Email subject" value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ fontSize: 11, fontWeight: 600, color: brand.muted, display: 'block', marginBottom: 3 }}>Message *</label>
                            <textarea
                                style={{ ...emailInput, minHeight: 120, resize: 'vertical' }}
                                placeholder="Write your email..."
                                value={draft}
                                onChange={(e) => setDraft(e.target.value)}
                            />
                        </div>
                        <button onClick={handleSendNewEmail} disabled={sending}
                            style={{ ...s.sendBtn, width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: sending ? 0.6 : 1 }}>
                            {sending ? <i className="fas fa-spinner fa-spin" /> : <><i className="fas fa-paper-plane" /> Send Email</>}
                        </button>
                    </div>
                )}
            </>
        );
    };

    return (
        <>
            <div style={s.backdrop} onClick={onClose} />
            <div style={s.panel(isMobile)}>
                <div style={s.header}>
                    <span style={s.title}>
                        <i className="fas fa-comment-dots" style={{ marginRight: 8, color: brand.primary }} />
                        Messages
                        {totalUnread > 0 && <span style={{
                            marginLeft: 8, ...s.unreadBadge, fontSize: 11, display: 'inline-flex',
                        }}>{totalUnread}</span>}
                    </span>
                    <div style={{ display: 'flex', gap: 6 }}>
                        <button style={{ ...s.closeBtn, color: view === 'setup' ? brand.primary : brand.muted }}
                            onClick={() => setView(v => v === 'setup' ? 'list' : 'setup')} title="Channel Settings">
                            <i className="fas fa-cog" />
                        </button>
                        <button style={s.closeBtn} onClick={onClose} title="Close">
                            <i className="fas fa-times" />
                        </button>
                    </div>
                </div>
                {toast && <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />}
                {view === 'setup' ? renderSetup() :
                 view === 'thread' ? renderThread() :
                 view === 'new' ? renderNew() :
                 (isEmpty && hasNoChannels) ? renderWelcome() :
                 renderList()}
            </div>
        </>
    );
};

export { CHANNEL_META };
export default CommsPanel;

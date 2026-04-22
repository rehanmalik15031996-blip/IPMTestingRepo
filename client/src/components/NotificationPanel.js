import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../config/api';
import { brand } from './enterpriseTheme';

const POLL_INTERVAL = 60000;

const ICON_MAP = {
    marketing: 'fas fa-bullhorn',
    system: 'fas fa-cog',
    message: 'fas fa-comment-dots',
};
const COLOR_MAP = {
    marketing: '#E7A11A',
    system: brand.primary,
    message: '#4285F4',
};

const timeAgo = (ts) => {
    if (!ts) return '';
    const diff = (Date.now() - new Date(ts).getTime()) / 1000;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
};

const s = {
    backdrop: {
        position: 'fixed', inset: 0, zIndex: 9996, background: 'transparent',
    },
    panel: {
        position: 'absolute', top: '100%', right: 0, marginTop: 8,
        width: 360, maxHeight: 440, background: '#fff',
        borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.16)',
        zIndex: 9997, display: 'flex', flexDirection: 'column',
        fontFamily: "'Poppins', sans-serif", overflow: 'hidden',
        border: `1px solid ${brand.border}`,
    },
    header: {
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px', borderBottom: `1px solid ${brand.border}`,
    },
    title: { fontWeight: 600, fontSize: 14, color: brand.text },
    markAll: {
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: 11, fontWeight: 600, color: brand.primary,
    },
    list: { flex: 1, overflowY: 'auto', maxHeight: 360 },
    item: (read) => ({
        display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 16px',
        cursor: 'pointer', borderBottom: `1px solid ${brand.borderRow}`,
        background: read ? 'transparent' : 'rgba(16,87,92,0.04)',
        transition: 'background .12s',
    }),
    iconWrap: (type) => ({
        width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: COLOR_MAP[type] || brand.primary, color: '#fff', fontSize: 13,
    }),
    body: { flex: 1, minWidth: 0 },
    itemTitle: (read) => ({
        fontWeight: read ? 500 : 600, fontSize: 12, color: brand.text,
        whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
    }),
    itemBody: { fontSize: 11, color: brand.muted, marginTop: 1, lineHeight: '15px' },
    itemTime: { fontSize: 10, color: brand.mutedLight, marginTop: 2 },
    empty: {
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', padding: 40, color: brand.muted, fontSize: 13, gap: 8,
    },
};

const NotificationPanel = ({ open, onClose, onUnreadCountChange }) => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);
    const panelRef = useRef(null);
    const pollRef = useRef(null);

    const fetchNotifications = useCallback(async () => {
        try {
            const { data } = await api.get('/api/comms/notifications');
            if (data.success) {
                setNotifications(data.notifications || []);
                onUnreadCountChange?.(data.unreadCount || 0);
            }
        } catch { /* silent */ }
    }, [onUnreadCountChange]);

    useEffect(() => {
        if (!open) return;
        setLoading(true);
        fetchNotifications().finally(() => setLoading(false));
        pollRef.current = setInterval(fetchNotifications, POLL_INTERVAL);
        return () => clearInterval(pollRef.current);
    }, [open, fetchNotifications]);

    const handleMarkAllRead = async () => {
        try {
            await api.post('/api/comms/notifications', { action: 'mark-all-read' });
            setNotifications((prev) => prev.map(n => ({ ...n, read: true })));
            onUnreadCountChange?.(0);
        } catch { /* silent */ }
    };

    const handleClick = async (notif) => {
        if (!notif.read) {
            try {
                await api.post('/api/comms/notifications', { action: 'mark-read', notificationId: notif._id });
                setNotifications((prev) => prev.map(n => n._id === notif._id ? { ...n, read: true } : n));
                onUnreadCountChange?.((prev) => Math.max(0, (typeof prev === 'number' ? prev : 0) - 1));
            } catch { /* silent */ }
        }
        if (notif.linkTo) {
            onClose();
            navigate(notif.linkTo);
        }
    };

    if (!open) return null;

    return (
        <>
            <div style={s.backdrop} onClick={onClose} />
            <div style={s.panel} ref={panelRef}>
                <div style={s.header}>
                    <span style={s.title}>Notifications</span>
                    {notifications.some(n => !n.read) && (
                        <button style={s.markAll} onClick={handleMarkAllRead}>Mark all read</button>
                    )}
                </div>
                <div style={s.list}>
                    {loading && !notifications.length ? (
                        <div style={s.empty}><i className="fas fa-spinner fa-spin" /> Loading...</div>
                    ) : !notifications.length ? (
                        <div style={s.empty}>
                            <i className="fas fa-bell-slash" style={{ fontSize: 24 }} />
                            No notifications
                        </div>
                    ) : notifications.map((n) => (
                        <div key={n._id} style={s.item(n.read)}
                            onMouseEnter={(e) => e.currentTarget.style.background = n.read ? '#F7F8FA' : 'rgba(16,87,92,0.07)'}
                            onMouseLeave={(e) => e.currentTarget.style.background = n.read ? 'transparent' : 'rgba(16,87,92,0.04)'}
                            onClick={() => handleClick(n)}
                        >
                            <div style={s.iconWrap(n.type)}>
                                <i className={ICON_MAP[n.type] || 'fas fa-bell'} />
                            </div>
                            <div style={s.body}>
                                <div style={s.itemTitle(n.read)}>{n.title}</div>
                                {n.body && <div style={s.itemBody}>{n.body}</div>}
                                <div style={s.itemTime}>{timeAgo(n.createdAt)}</div>
                            </div>
                            {!n.read && (
                                <div style={{
                                    width: 8, height: 8, borderRadius: '50%', background: brand.primary,
                                    flexShrink: 0, marginTop: 6,
                                }} />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default NotificationPanel;

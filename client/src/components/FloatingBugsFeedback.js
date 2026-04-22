import React, { useState, useRef } from 'react';
import api from '../config/api';

const FLOATING_BTN_YELLOW = '#ffc801';
const FLOATING_BTN_DARK = '#1f3a3d';
const FLOATING_BTN_MIN_WIDTH = 250;
const FLOATING_BTN_PADDING = '12px 20px';
const FLOATING_BTN_FONT_SIZE = 15;
const TEAL = '#11575C';

const CATEGORIES = ['Bug Report', 'Feedback', 'Feature Request', 'Other'];

const FloatingBugsFeedback = ({ variant = 'floating' }) => {
    const [open, setOpen] = useState(false);
    const isSidebar = variant === 'sidebar';
    const [message, setMessage] = useState('');
    const [category, setCategory] = useState('Bug Report');
    const [screenshot, setScreenshot] = useState(null);
    const [preview, setPreview] = useState(null);
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);
    const fileRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (file.size > 10 * 1024 * 1024) {
            alert('File too large. Maximum 10 MB.');
            return;
        }
        setScreenshot(file);
        const reader = new FileReader();
        reader.onloadend = () => setPreview(reader.result);
        reader.readAsDataURL(file);
    };

    const removeFile = () => {
        setScreenshot(null);
        setPreview(null);
        if (fileRef.current) fileRef.current.value = '';
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const text = message.trim();
        if (!text || sending) return;
        setSending(true);

        try {
            const userStr = localStorage.getItem('user');
            const user = userStr ? JSON.parse(userStr) : null;

            const formData = new FormData();
            formData.append('message', text);
            formData.append('category', category);
            formData.append('userName', user?.name || user?.agencyName || 'Anonymous');
            formData.append('userEmail', user?.email || '');
            if (screenshot) formData.append('screenshot', screenshot);

            await api.post('/api/bug-report', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
            });

            setSent(true);
            setMessage('');
            setCategory('Bug Report');
            removeFile();
            setTimeout(() => {
                setOpen(false);
                setSent(false);
            }, 2000);
        } catch (err) {
            const msg = err.response?.data?.message || 'Failed to send. Please try again.';
            alert(msg);
        } finally {
            setSending(false);
        }
    };

    const buttonStyle = isSidebar
        ? {}
        : {
            position: 'fixed', right: 24, bottom: 80, minWidth: FLOATING_BTN_MIN_WIDTH,
            zIndex: 9996, background: FLOATING_BTN_YELLOW, color: FLOATING_BTN_DARK,
            border: 'none', padding: FLOATING_BTN_PADDING, borderRadius: 9999,
            fontWeight: 700, fontSize: FLOATING_BTN_FONT_SIZE, cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)', display: 'flex',
            alignItems: 'center', justifyContent: 'center', gap: 6,
        };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                style={buttonStyle}
                className={isSidebar ? 'sb-footer-icon-btn' : ''}
                aria-label="Report Bugs and Feedback"
                title="Report Bugs &amp; Feedback"
            >
                {isSidebar ? <i className="fas fa-bug" /> : 'Report Bugs & Feedback'}
            </button>

            {open && (
                <>
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => !sending && setOpen(false)}
                        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 9998 }}
                        aria-label="Close"
                    />
                    <div
                        style={{
                            position: 'fixed', right: 24, bottom: 80,
                            width: 360, maxWidth: 'calc(100vw - 48px)', maxHeight: 'calc(100vh - 120px)',
                            background: '#fff', borderRadius: 14,
                            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                            zIndex: 9999, overflow: 'hidden',
                            border: '1px solid #e2e8f0',
                            display: 'flex', flexDirection: 'column',
                        }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div style={{
                            padding: '14px 16px', borderBottom: '1px solid #e2e8f0',
                            background: TEAL, color: '#fff',
                            fontWeight: 700, fontSize: 15,
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        }}>
                            <span><i className="fas fa-bug" style={{ marginRight: 8 }} />Report Bugs &amp; Feedback</span>
                            <button
                                type="button"
                                onClick={() => !sending && setOpen(false)}
                                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
                                aria-label="Close"
                            >&times;</button>
                        </div>

                        {sent ? (
                            <div style={{ padding: 32, textAlign: 'center' }}>
                                <div style={{ fontSize: 40, marginBottom: 12 }}>✅</div>
                                <div style={{ color: '#166534', fontWeight: 700, fontSize: 16, marginBottom: 4 }}>
                                    Thank you!
                                </div>
                                <div style={{ color: '#64748b', fontSize: 13 }}>
                                    Your report has been submitted and emailed to our team.
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} style={{ padding: 16, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
                                {/* Category */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                                        Category
                                    </label>
                                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                        {CATEGORIES.map((cat) => (
                                            <button
                                                key={cat}
                                                type="button"
                                                onClick={() => setCategory(cat)}
                                                style={{
                                                    padding: '6px 12px', borderRadius: 999, fontSize: 12, fontWeight: 600,
                                                    cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
                                                    border: category === cat ? `2px solid ${TEAL}` : '1px solid #e2e8f0',
                                                    background: category === cat ? 'rgba(17,87,92,0.08)' : '#fff',
                                                    color: category === cat ? TEAL : '#64748b',
                                                }}
                                            >
                                                {cat}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                                        Description
                                    </label>
                                    <textarea
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                        placeholder="Describe the bug or share feedback..."
                                        disabled={sending}
                                        required
                                        rows={4}
                                        style={{
                                            width: '100%', padding: 10, border: '1px solid #e2e8f0',
                                            borderRadius: 8, fontSize: 13, resize: 'vertical',
                                            outline: 'none', boxSizing: 'border-box',
                                            fontFamily: 'inherit', lineHeight: 1.5,
                                        }}
                                    />
                                </div>

                                {/* Screenshot */}
                                <div>
                                    <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4 }}>
                                        Attach Screenshot <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional, max 10 MB)</span>
                                    </label>
                                    {preview ? (
                                        <div style={{ position: 'relative', borderRadius: 8, overflow: 'hidden', border: '1px solid #e2e8f0' }}>
                                            <img
                                                src={preview}
                                                alt="Preview"
                                                style={{ width: '100%', maxHeight: 160, objectFit: 'cover', display: 'block' }}
                                            />
                                            <button
                                                type="button"
                                                onClick={removeFile}
                                                style={{
                                                    position: 'absolute', top: 6, right: 6,
                                                    width: 24, height: 24, borderRadius: '50%',
                                                    background: 'rgba(0,0,0,0.6)', color: '#fff',
                                                    border: 'none', cursor: 'pointer',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 14, lineHeight: 1,
                                                }}
                                                aria-label="Remove screenshot"
                                            >&times;</button>
                                            <div style={{
                                                padding: '4px 8px', background: 'rgba(0,0,0,0.5)',
                                                color: '#fff', fontSize: 11, position: 'absolute', bottom: 0, left: 0, right: 0,
                                            }}>
                                                {screenshot?.name}
                                            </div>
                                        </div>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={() => fileRef.current?.click()}
                                            disabled={sending}
                                            style={{
                                                width: '100%', padding: '14px 10px',
                                                border: '2px dashed #cbd5e1', borderRadius: 8,
                                                background: '#f8fafc', cursor: 'pointer',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                gap: 8, color: '#64748b', fontSize: 13, fontFamily: 'inherit',
                                            }}
                                        >
                                            <i className="fas fa-camera" style={{ fontSize: 16, color: TEAL }} />
                                            Click to attach an image
                                        </button>
                                    )}
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="image/*,.pdf"
                                        onChange={handleFileChange}
                                        style={{ display: 'none' }}
                                    />
                                </div>

                                {/* Submit */}
                                <button
                                    type="submit"
                                    disabled={sending || !message.trim()}
                                    style={{
                                        width: '100%', padding: '11px 16px',
                                        background: TEAL, color: '#fff', border: 'none',
                                        borderRadius: 8, fontWeight: 700, fontSize: 14,
                                        cursor: sending ? 'not-allowed' : 'pointer',
                                        opacity: sending || !message.trim() ? 0.6 : 1,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                                        fontFamily: 'inherit',
                                    }}
                                >
                                    {sending ? (
                                        <>
                                            <i className="fas fa-spinner fa-spin" /> Sending...
                                        </>
                                    ) : (
                                        <>
                                            <i className="fas fa-paper-plane" /> Submit Report
                                        </>
                                    )}
                                </button>
                            </form>
                        )}
                    </div>
                </>
            )}
        </>
    );
};

export default FloatingBugsFeedback;

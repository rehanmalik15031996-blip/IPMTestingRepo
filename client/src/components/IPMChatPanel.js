import React, { useState, useRef, useEffect } from 'react';
import api from '../config/api';

const IPMChatPanel = ({ open, onClose }) => {
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages]);

    const sendMessage = async () => {
        const text = input.trim();
        if (!text || loading) return;
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', text }]);
        setLoading(true);
        try {
            const res = await api.post('/api/chat', { message: text });
            const reply = res.data?.reply || 'Sorry, I couldn’t get a response.';
            setMessages((prev) => [...prev, { role: 'assistant', text: String(reply) }]);
        } catch (err) {
            const status = err.response?.status;
            const serverError = err.response?.data?.error;
            let msg = 'Something went wrong. Please try again.';
            if (status === 404) {
                msg = 'Chat is unavailable. Is the server running? Set REACT_APP_API_URL to your backend URL.';
            } else if (status === 503) {
                msg = 'Chat is not configured. Add ANTHROPIC_API_KEY on the server.';
            } else if (typeof serverError === 'string') {
                msg = serverError;
            } else if (err.message) {
                msg = String(err.message);
            }
            setMessages((prev) => [...prev, { role: 'assistant', text: msg }]);
        } finally {
            setLoading(false);
        }
    };

    if (!open) return null;

    return (
        <>
            <div
                role="button"
                tabIndex={0}
                onClick={onClose}
                onKeyDown={(e) => e.key === 'Escape' && onClose()}
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.2)',
                    zIndex: 9998,
                }}
                aria-label="Close chat overlay"
            />
            <div
                className="ipm-chat-panel"
                style={{
                    position: 'fixed',
                    bottom: 100,
                    left: 0,
                    width: 280,
                    maxWidth: 'calc(100vw - 24px)',
                    height: 420,
                    maxHeight: 'calc(100vh - 140px)',
                    background: '#fff',
                    borderRadius: 16,
                    boxShadow: '0 12px 40px rgba(0,0,0,0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 9999,
                    overflow: 'hidden',
                }}
            >
                <div style={{
                    padding: '14px 16px',
                    background: '#11575C',
                    color: '#fff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>IPM AI</span>
                    <button
                        type="button"
                        onClick={onClose}
                        style={{
                            background: 'none',
                            border: 'none',
                            color: '#fff',
                            cursor: 'pointer',
                            padding: 4,
                            fontSize: 18,
                            lineHeight: 1,
                        }}
                        aria-label="Close"
                    >
                        ×
                    </button>
                </div>
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10,
                }}>
                    {messages.length === 0 && (
                        <div style={{ color: '#64748b', fontSize: 13, textAlign: 'center', padding: 20 }}>
                            Ask me anything about properties or IPM.
                        </div>
                    )}
                    {messages.map((m, i) => (
                        <div
                            key={i}
                            style={{
                                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                maxWidth: '85%',
                                padding: '10px 14px',
                                borderRadius: 12,
                                background: m.role === 'user' ? '#11575C' : '#f1f5f9',
                                color: m.role === 'user' ? '#fff' : '#1e293b',
                                fontSize: 14,
                                lineHeight: 1.4,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                            }}
                        >
                            {m.text}
                        </div>
                    ))}
                    {loading && (
                        <div style={{
                            alignSelf: 'flex-start',
                            padding: '10px 14px',
                            borderRadius: 12,
                            background: '#f1f5f9',
                            color: '#64748b',
                            fontSize: 14,
                        }}>
                            …
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>
                <form
                    onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                    style={{
                        padding: 12,
                        borderTop: '1px solid #e2e8f0',
                        display: 'flex',
                        gap: 8,
                    }}
                >
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Type a message…"
                        disabled={loading}
                        style={{
                            flex: 1,
                            padding: '10px 14px',
                            border: '1px solid #e2e8f0',
                            borderRadius: 10,
                            fontSize: 14,
                            outline: 'none',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        style={{
                            padding: '10px 16px',
                            background: '#11575C',
                            color: '#fff',
                            border: 'none',
                            borderRadius: 10,
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading || !input.trim() ? 0.7 : 1,
                        }}
                    >
                        Send
                    </button>
                </form>
            </div>
        </>
    );
};

export default IPMChatPanel;

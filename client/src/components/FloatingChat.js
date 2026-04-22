import React, { useState, useRef, useEffect, useCallback } from 'react';
import api from '../config/api';
import { useIsMobile } from '../hooks/useMediaQuery';

const FLOATING_CHAT_RED = '#b91c1c';
const FLOATING_BTN_MIN_WIDTH = 250;
const FLOATING_BTN_PADDING = '12px 20px';
const FLOATING_BTN_FONT_SIZE = 15;
const IPM_MUSTARD = '#D4A017';

const LINK_SPLIT_RE = /(https?:\/\/[^\s<>'"]+|\/property\/[a-f0-9]{24})/gi;

const SUGGESTED_PROMPTS = [
    'How do I add a listing?',
    'How do I add a lead?',
    'How do I add an agent?',
    'Show me all guides',
    'Show me FAQs',
    'Show me properties in Dubai',
    'Find houses in Cape Town',
    'Neighborhood brief: Dubai Marina',
    'Compare Lisbon and Porto',
];

function AssistantMessageContent({ text }) {
    const raw = String(text || '');
    const lines = raw.split('\n');

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {lines.map((line, li) => {
                const trimmed = line.trim();
                if (!trimmed) return <div key={`br-${li}`} style={{ height: 6 }} />;
                if (/^—{5,}/.test(trimmed)) return <hr key={`hr-${li}`} style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '4px 0' }} />;
                if (trimmed === '---') return <hr key={`hr-${li}`} style={{ border: 'none', borderTop: '1px solid #cbd5e1', margin: '6px 0' }} />;

                const isHeading = /^(How to |Frequently Asked|IPM How-To|Q: )/.test(trimmed);
                const isTip = /^(Tip:|For an interactive|For more help|Visit the full)/.test(trimmed);
                const isNumbered = /^\d+\.\s/.test(trimmed);

                const parts = trimmed.split(LINK_SPLIT_RE);
                const rendered = parts.map((part, pi) => {
                    if (/^https?:\/\//i.test(part)) {
                        return (
                            <a key={`l-${li}-${pi}`} href={part} target="_blank" rel="noopener noreferrer"
                               style={{ color: '#0f766e', fontWeight: 600, wordBreak: 'break-all', textDecoration: 'underline' }}>
                                {part}
                            </a>
                        );
                    }
                    if (/^\/property\/[a-f0-9]{24}$/i.test(part)) {
                        return <a key={`p-${li}-${pi}`} href={part} style={{ color: '#0f766e', fontWeight: 600, textDecoration: 'underline' }}>View listing</a>;
                    }
                    return <span key={`t-${li}-${pi}`}>{part}</span>;
                });

                if (isHeading) {
                    return <div key={`h-${li}`} style={{ fontWeight: 700, fontSize: 14, color: '#1e293b', marginTop: 2 }}>{rendered}</div>;
                }
                if (isTip) {
                    return <div key={`tip-${li}`} style={{ fontSize: 12, color: '#64748b', fontStyle: 'italic', marginTop: 4 }}>{rendered}</div>;
                }
                if (isNumbered) {
                    return <div key={`n-${li}`} style={{ paddingLeft: 4 }}>{rendered}</div>;
                }
                return <div key={`d-${li}`}>{rendered}</div>;
            })}
        </div>
    );
}

const CHAT_DISABLED = false;

const FloatingChat = ({ variant = 'floating' }) => {
    const isMobile = useIsMobile();
    const isSidebar = variant === 'sidebar';
    const [open, setOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [position, setPosition] = useState({ right: 24, bottom: 24 });
    const dragRef = useRef({ isDragging: false, startX: 0, startY: 0, startRight: 0, startBottom: 0 });
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    useEffect(() => { scrollToBottom(); }, [messages]);

    useEffect(() => {
        const handler = (e) => {
            const question = e.detail?.question;
            if (!question) return;
            setOpen(true);
            setTimeout(() => sendMessage(question), 150);
        };
        window.addEventListener('chatbot-ask', handler);
        return () => window.removeEventListener('chatbot-ask', handler);
    }); // intentionally no deps — always uses latest sendMessage

    const sendMessage = useCallback(async (rawText) => {
        if (CHAT_DISABLED) return;
        const text = (rawText != null ? String(rawText) : input).trim();
        if (!text || loading) return;
        setInput('');
        const historyPayload = messages.slice(-20).map((m) => ({ role: m.role, text: m.text }));
        setMessages((prev) => [...prev, { role: 'user', text }]);
        setLoading(true);
        try {
            const res = await api.post('/api/chat', { message: text, history: historyPayload });
            const reply = res.data?.reply || "Sorry, I couldn't get a response.";
            setMessages((prev) => [...prev, { role: 'assistant', text: String(reply) }]);
        } catch (err) {
            const serverError = err.response?.data?.error;
            const rawMsg = typeof serverError === 'string' ? serverError : (err?.message && String(err.message));
            const status = err.response?.status;
            let msg = 'Something went wrong. Please try again.';
            if (status === 404) msg = 'Chat endpoint not found. Ensure /api/chat is deployed.';
            else if (status === 503) msg = 'Chat not configured. Set GOOGLE_API_KEY (or ANTHROPIC_API_KEY) on the server.';
            else if (typeof serverError === 'string') msg = serverError;
            if (msg === 'Something went wrong. Please try again.' && rawMsg) msg = rawMsg;
            setMessages((prev) => [...prev, { role: 'assistant', text: msg }]);
        } finally {
            setLoading(false);
        }
    }, [input, loading, messages]);

    const handleButtonMouseDown = (e) => {
        if (e.button !== 0) return;
        dragRef.current = { isDragging: false, startX: e.clientX, startY: e.clientY, startRight: position.right, startBottom: position.bottom };
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);
    };

    const handleMouseMove = (e) => {
        const dx = e.clientX - dragRef.current.startX;
        const dy = dragRef.current.startY - e.clientY;
        if (!dragRef.current.isDragging && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) dragRef.current.isDragging = true;
        if (dragRef.current.isDragging) {
            setPosition({ right: Math.max(0, dragRef.current.startRight - dx), bottom: Math.max(0, dragRef.current.startBottom - dy) });
        }
    };

    const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        if (dragRef.current.isDragging) { dragRef.current.isDragging = false; return; }
        if (CHAT_DISABLED) setMessages([{ role: 'assistant', text: 'Coming Soon' }]);
        setOpen(true);
    };

    const handleButtonClick = (e) => {
        if (dragRef.current.isDragging) { e.preventDefault(); e.stopPropagation(); }
    };

    const buttonStyle = isSidebar
        ? {}
        : {
            position: 'fixed', right: position.right, bottom: position.bottom,
            minWidth: FLOATING_BTN_MIN_WIDTH, cursor: 'grab', zIndex: 9997,
            background: FLOATING_CHAT_RED, color: '#fff', border: 'none',
            padding: FLOATING_BTN_PADDING, borderRadius: 9999, fontWeight: 700,
            fontSize: FLOATING_BTN_FONT_SIZE, boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        };

    return (
        <>
            <button
                type="button"
                className={isSidebar ? 'sb-footer-icon-btn' : 'floating-chat-btn'}
                style={buttonStyle}
                onMouseDown={isSidebar ? undefined : handleButtonMouseDown}
                onClick={isSidebar ? () => setOpen(true) : handleButtonClick}
                aria-label="Chat with IPM AI"
                title="Chat with IPM AI"
            >
                {isSidebar ? <i className="fas fa-comment-dots" /> : 'Chat with IPM AI'}
            </button>

            {open && (
                <>
                    <div
                        role="button"
                        tabIndex={0}
                        onClick={() => setOpen(false)}
                        onKeyDown={(e) => e.key === 'Escape' && setOpen(false)}
                        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9998 }}
                        aria-label="Close chat overlay"
                    />
                    <div
                        className="floating-chat-panel"
                        style={{
                            position: 'fixed',
                            top: isMobile ? 56 : 80,
                            right: isMobile ? 0 : 24,
                            bottom: isMobile ? 0 : 24,
                            left: isMobile ? 0 : undefined,
                            width: isMobile ? '100%' : 380,
                            maxWidth: isMobile ? '100%' : 'calc(100vw - 48px)',
                            background: '#f1f5f9',
                            borderRadius: isMobile ? '0' : 16,
                            boxShadow: '0 12px 40px rgba(0,0,0,0.2)',
                            display: 'flex', flexDirection: 'column',
                            zIndex: 9999, overflow: 'hidden', boxSizing: 'border-box',
                        }}
                    >
                        <div style={{ padding: '14px 16px', background: '#fff', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <span style={{ fontWeight: 700, fontSize: 16, color: '#334155' }}>IPM AI Assistant</span>
                            <button type="button" onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 4, fontSize: 20, lineHeight: 1 }} aria-label="Minimize">×</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
                            {messages.length === 0 && (
                                <div style={{ padding: '14px 16px', background: '#e2e8f0', borderRadius: 12, color: '#475569', fontSize: 13, lineHeight: 1.6 }}>
                                    <div style={{ fontWeight: 700, fontSize: 14, color: '#334155', marginBottom: 8 }}>Hi! Here's what I can help you with:</div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                                        <span><b>How-To Guides</b> — Add Agent, Add Lead, Add Listing</span>
                                        <span><b>FAQs</b> — investing, returns, security, minimum amounts</span>
                                        <span><b>Property Search</b> — find listings in any location with links</span>
                                        <span><b>Neighborhood Briefs</b> — area overviews for buyers & investors</span>
                                        <span><b>Compare Areas</b> — side-by-side analysis of two locations</span>
                                        <span><b>General Q&A</b> — real estate, market trends, ESG</span>
                                    </div>
                                    <div style={{ marginTop: 10, fontSize: 12, color: '#64748b' }}>
                                        Tip: For interactive on-screen walkthroughs, click "How To" in the sidebar footer.
                                    </div>
                                </div>
                            )}
                            {messages.length === 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                    {SUGGESTED_PROMPTS.map((p) => (
                                        <button
                                            key={p}
                                            type="button"
                                            onClick={() => sendMessage(p)}
                                            disabled={loading || CHAT_DISABLED}
                                            style={{
                                                fontSize: 12, padding: '8px 10px', borderRadius: 999,
                                                border: '1px solid #cbd5e1', background: '#fff',
                                                color: '#334155', cursor: loading ? 'not-allowed' : 'pointer', fontWeight: 600,
                                            }}
                                        >
                                            {p.length > 36 ? `${p.slice(0, 34)}…` : p}
                                        </button>
                                    ))}
                                </div>
                            )}
                            {messages.map((m, i) => (
                                <div
                                    key={i}
                                    style={{
                                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                                        maxWidth: '85%', padding: '10px 14px', borderRadius: 12,
                                        background: m.role === 'user' ? '#1f3a3d' : '#e2e8f0',
                                        color: m.role === 'user' ? '#fff' : '#1e293b',
                                        fontSize: 14, lineHeight: 1.4, whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                                    }}
                                >
                                    {m.role === 'user' ? m.text : <AssistantMessageContent text={m.text} />}
                                </div>
                            ))}
                            {loading && (
                                <div style={{ alignSelf: 'flex-start', padding: '10px 14px', borderRadius: 12, background: '#e2e8f0', color: '#64748b', fontSize: 14 }}>
                                    …
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                        <form
                            onSubmit={(e) => { e.preventDefault(); sendMessage(); }}
                            style={{ padding: isMobile ? '10px 12px' : 12, borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', gap: 8, boxSizing: 'border-box', width: '100%', minWidth: 0 }}
                        >
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                placeholder="Ask a question or try 'How do I add a listing?'"
                                disabled={loading || CHAT_DISABLED}
                                style={{ flex: 1, minWidth: 0, padding: '10px 14px', border: '1px solid #e2e8f0', borderRadius: 10, fontSize: 14, outline: 'none', boxSizing: 'border-box' }}
                            />
                            <button
                                type="submit"
                                disabled={loading || !input.trim() || CHAT_DISABLED}
                                style={{
                                    padding: isMobile ? '10px 14px' : '10px 18px',
                                    background: IPM_MUSTARD, color: '#1f3a3d', border: 'none',
                                    borderRadius: 10, fontWeight: 600,
                                    cursor: loading ? 'not-allowed' : 'pointer',
                                    opacity: loading || !input.trim() ? 0.7 : 1, flexShrink: 0,
                                }}
                            >
                                Send
                            </button>
                        </form>
                        <div style={{ padding: '8px 14px 12px', fontSize: 11, color: '#64748b', lineHeight: 1.35, background: '#fff', borderTop: '1px solid #f1f5f9' }}>
                            AI output may be incomplete. Not financial or legal advice. Listing links open the property page on this site.
                        </div>
                    </div>
                </>
            )}
        </>
    );
};

export default FloatingChat;

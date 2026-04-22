import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useMediaQuery';
import Sidebar from '../components/Sidebar';
import { brand } from '../config/brandColors';
import { isNewsOrPropertySourceUrl } from '../utils/newsUrl';

const STORAGE_KEY = (userId) => (userId ? `ipm_saved_news_${userId}` : 'ipm_saved_news');
const newsId = (item) => item._id || item.id || `${(item.title || '')}|${(item.date || '')}`;

const News = () => {
    const isMobile = useIsMobile();
    const { t } = useTranslation();
    const user = useMemo(() => {
        try {
            return JSON.parse(localStorage.getItem('user') || 'null');
        } catch (_) {
            return null;
        }
    }, []);
    const userId = user?._id;

    const [savedArticles, setSavedArticles] = useState([]);
    const [selectedArticle, setSelectedArticle] = useState(null);

    useEffect(() => {
        if (!userId) return;
        try {
            const raw = localStorage.getItem(STORAGE_KEY(userId));
            setSavedArticles(raw ? JSON.parse(raw) : []);
        } catch (_) {
            setSavedArticles([]);
        }
    }, [userId]);

    const removeSaved = (item) => {
        const id = newsId(item);
        const next = savedArticles.filter((n) => newsId(n) !== id);
        setSavedArticles(next);
        try {
            localStorage.setItem(STORAGE_KEY(userId), JSON.stringify(next));
        } catch (_) {}
        setSelectedArticle(null);
    };

    return (
        <div style={{ display: 'flex', backgroundColor: '#f4f7f9', flex: 1, minHeight: 0, overflow: 'hidden' }}>
            <Sidebar />
            <main className="dashboard-main" style={{ padding: isMobile ? 16 : 24, minHeight: 0, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
                <div style={{ maxWidth: 1200, margin: 0, flex: 1 }}>
                    <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', marginBottom: 8 }}>My IPM News</h1>
                    <p style={{ fontSize: 14, color: '#64748b', marginBottom: 24 }}>Articles you saved from the dashboard News Feeds.</p>

                    {savedArticles.length === 0 ? (
                        <div style={{ background: 'white', borderRadius: 16, padding: 48, textAlign: 'center', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9' }}>
                            <i className="far fa-newspaper" style={{ fontSize: 48, color: '#cbd5e1', marginBottom: 16 }} />
                            <p style={{ fontSize: 16, color: '#64748b', margin: 0 }}>No saved articles yet.</p>
                            <p style={{ fontSize: 14, color: '#94a3b8', marginTop: 8 }}>Save articles from the News Feeds card on your dashboard to see them here.</p>
                        </div>
                    ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
                            {savedArticles.map((article) => {
                                const url = article.sourceUrl || article.link || article.url;
                                const hasLink = url && isNewsOrPropertySourceUrl(url);
                                return (
                                    <div key={newsId(article)} style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                                        {article.image && (
                                            <div style={{ height: 160, background: '#f1f5f9' }}>
                                                {hasLink ? (
                                                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', width: '100%', height: '100%' }}>
                                                        <img src={article.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </a>
                                                ) : article._id ? (
                                                    <Link to={`/news/${article._id}`} style={{ display: 'block', width: '100%', height: '100%' }}>
                                                        <img src={article.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    </Link>
                                                ) : (
                                                    <img src={article.image} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                )}
                                            </div>
                                        )}
                                        <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, flex: 1 }}>
                                            <div style={{ fontSize: 15, fontWeight: 600, color: '#0f172a', lineHeight: 1.3 }}>{article.title}</div>
                                            {(article.aiSummary || article.desc) && (
                                                <p style={{ margin: 0, fontSize: 13, color: '#64748b', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{article.aiSummary || article.desc}</p>
                                            )}
                                            {hasLink ? (
                                                <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12, color: brand.primary, wordBreak: 'break-all' }}>Source: {url}</a>
                                            ) : article._id ? (
                                                <Link to={`/news/${article._id}`} style={{ fontSize: 12, color: brand.primary }}>View article</Link>
                                            ) : (
                                                <span style={{ fontSize: 12, color: brand.muted }}>No link</span>
                                            )}
                                            <button type="button" onClick={() => removeSaved(article)} style={{ alignSelf: 'flex-start', border: 'none', background: '#f1f5f9', color: brand.text, padding: '6px 12px', borderRadius: 6, fontSize: 12, cursor: 'pointer', marginTop: 4 }}>Remove</button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
};

export default News;

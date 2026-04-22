import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import api from '../config/api';
import { useIsMobile } from '../hooks/useMediaQuery';
import { isNewsOrPropertySourceUrl } from '../utils/newsUrl';
import { brand } from '../config/brandColors';

const NewsDetail = () => {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    const { id } = useParams();
    const navigate = useNavigate();
    const [article, setArticle] = useState(null);
    const [loading, setLoading] = useState(true);
    const [imageError, setImageError] = useState(false);
    const [generatingSummary, setGeneratingSummary] = useState(false);

    const fetchArticle = async () => {
        try {
            const res = await api.get(`/api/news?id=${id}`);
            setArticle(res.data);
        } catch (err) {
            console.error("Error fetching news:", err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchArticle();
    }, [id]);

    const handleGenerateSummary = async () => {
        if (!article || generatingSummary) return;
        setGeneratingSummary(true);
        try {
            const res = await api.post('/api/news/generate-summary', {
                articleId: id,
                title: article.title,
                category: article.category,
                desc: article.desc
            });
            if (res.data.article) setArticle(res.data.article);
            else if (res.data.summary) setArticle((prev) => ({ ...prev, aiSummary: res.data.summary }));
        } catch (err) {
            console.error("Generate summary failed:", err);
        } finally {
            setGeneratingSummary(false);
        }
    };

    if (loading) return <div style={loaderStyle}>{t('newsDetail.loading')}</div>;
    if (!article) return <div style={loaderStyle}>{t('newsDetail.notFound')}</div>;

    const url = article.sourceUrl || article.link || article.url;
    const hasLink = url && isNewsOrPropertySourceUrl(url);
    const summaryText = article.aiSummary || article.desc;

    return (
        <div style={{ ...containerStyle, padding: isMobile ? '24px 16px' : '40px 20px' }}>
            <button onClick={() => navigate(-1)} style={backBtn}>{t('newsDetail.backToNews')}</button>
            <h1 style={{ ...titleStyle, fontSize: isMobile ? '22px' : '28px' }}>{article.title}</h1>
            {article.image && article.image.trim() && !imageError ? (
                <a href={hasLink ? url : '#'} target={hasLink ? '_blank' : undefined} rel={hasLink ? 'noopener noreferrer' : undefined} style={{ display: 'block', marginBottom: 20, borderRadius: 12, overflow: 'hidden', background: '#f1f5f9' }}>
                    <img src={article.image} alt="" style={{ width: '100%', height: isMobile ? 220 : 360, objectFit: 'cover' }} onError={() => setImageError(true)} />
                </a>
            ) : null}
            {summaryText ? (
                <div style={{ marginBottom: 20 }}>
                    <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
                        {article.aiSummary ? 'AI summary' : 'Summary'}
                    </p>
                    <p style={{ margin: 0, fontSize: 16, color: '#334155', lineHeight: 1.5 }}>{summaryText}</p>
                </div>
            ) : null}
            <button type="button" onClick={handleGenerateSummary} disabled={generatingSummary} style={{ marginBottom: 20, padding: '10px 16px', background: brand.primary, color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: generatingSummary ? 'wait' : 'pointer' }}>
                {generatingSummary ? 'Generating…' : summaryText ? 'Regenerate AI summary' : 'Generate AI summary'}
            </button>
            {hasLink ? (
                <>
                    <p style={{ margin: '0 0 6px', fontSize: 14, color: '#64748b' }}>Source (read full article at publisher):</p>
                    <a href={url} target="_blank" rel="noopener noreferrer" style={{ fontSize: 14, color: brand.primary, wordBreak: 'break-all', fontWeight: 600 }}>{url}</a>
                </>
            ) : (
                <span style={{ fontSize: 14, color: '#64748b' }}>No source link</span>
            )}
        </div>
    );
};

// --- STYLES ---
const containerStyle = { maxWidth: '900px', margin: '0 auto', padding: '40px 20px', fontFamily: 'sans-serif' };
const backBtn = { background: 'none', border: 'none', color: '#115e59', cursor: 'pointer', fontWeight: 'bold', marginBottom: '20px' };
const titleStyle = { fontSize: '36px', color: '#0f172a', margin: '15px 0' };
const loaderStyle = { height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' };

export default NewsDetail;
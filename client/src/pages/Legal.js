import React from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useMediaQuery';

const Legal = () => {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
            <div style={{ maxWidth: '800px', margin: isMobile ? '30px auto' : '50px auto', padding: isMobile ? '24px 16px' : '40px', background: 'white', borderRadius: '16px' }}>
                <h1 style={{ color: '#1f3a3d', marginBottom: '10px' }}>{t('legal.title')}</h1>
                <p style={{ color: '#999', marginBottom: '30px', fontSize: '13px' }}>{t('legal.lastUpdated')}</p>

                <div style={{ lineHeight: '1.8', color: '#444' }}>
                    <p><strong>{t('legal.section1Title')}</strong><br/>{t('legal.section1Body')}</p>
                    <p><strong>{t('legal.section2Title')}</strong><br/>{t('legal.section2Body')}</p>
                    <p><strong>{t('legal.section3Title')}</strong><br/>{t('legal.section3Body')}</p>
                </div>
            </div>
        </div>
    );
};

export default Legal;
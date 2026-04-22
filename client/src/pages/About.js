import React from 'react';
import { useTranslation } from 'react-i18next';
import { useIsMobile } from '../hooks/useMediaQuery';

const LEGAL_COMPANY_DETAILS = {
    legalName: 'International Property Market B.V.',
    kvkNumber: '98220136',
    email: 'enquiries@internationalpropertymarket.com',
    phone: '+971 50 123 4567',
    address: 'Dubai Internet City, UAE',
};

const About = () => {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
            <div style={{ maxWidth: '800px', margin: isMobile ? '30px auto' : '50px auto', padding: isMobile ? '20px 16px' : '30px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                <h1 style={{ color: '#1f3a3d', fontSize: '36px', marginBottom: '20px' }}>{t('about.title')}</h1>
                <p style={{ lineHeight: '1.6', color: '#555', marginBottom: '20px' }}>
                    IPM (International Property Management) is an AI-driven real estate investment platform designed to democratize access to premium global assets. 
                    Founded in 2024, we leverage cutting-edge machine learning models to identify high-yield opportunities in markets like Dubai, London, and New York.
                </p>
                <img src="https://images.unsplash.com/photo-1497366216548-37526070297c?ixlib=rb-4.0.3" alt="Office" style={{ width: '100%', borderRadius: '12px', marginBottom: '20px' }} />
                <h3 style={{ color: '#1f3a3d' }}>{t('about.mission')}</h3>
                <p style={{ lineHeight: '1.6', color: '#555' }}>
                    To provide institutional-grade investment tools to individual investors, ensuring transparency, security via blockchain, and maximized returns through data analytics.
                </p>
                <div style={{ marginTop: '24px', padding: isMobile ? '16px' : '18px 20px', borderRadius: '12px', border: '1px solid rgba(16, 87, 92, 0.18)', background: 'rgba(16, 87, 92, 0.05)' }}>
                    <h3 style={{ color: '#10575c', margin: '0 0 10px' }}>Legal Company Information</h3>
                    <p style={{ margin: '0 0 6px', color: '#334155', lineHeight: '1.5' }}><strong>Legal company name:</strong> {LEGAL_COMPANY_DETAILS.legalName}</p>
                    <p style={{ margin: '0 0 6px', color: '#334155', lineHeight: '1.5' }}><strong>KvK number:</strong> {LEGAL_COMPANY_DETAILS.kvkNumber}</p>
                    <p style={{ margin: '0 0 6px', color: '#334155', lineHeight: '1.5' }}><strong>Email:</strong> {LEGAL_COMPANY_DETAILS.email}</p>
                    <p style={{ margin: '0 0 6px', color: '#334155', lineHeight: '1.5' }}><strong>Phone:</strong> {LEGAL_COMPANY_DETAILS.phone}</p>
                    <p style={{ margin: 0, color: '#334155', lineHeight: '1.5' }}><strong>Address:</strong> {LEGAL_COMPANY_DETAILS.address}</p>
                </div>
            </div>
        </div>
    );
};

export default About;
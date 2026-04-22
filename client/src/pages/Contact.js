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

const Contact = () => {
    const { t } = useTranslation();
    const isMobile = useIsMobile();
    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
            <div style={{ maxWidth: '900px', margin: '50px auto', display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: '30px', padding: isMobile ? '20px 16px' : '20px' }}>
                
                {/* Contact Info Card */}
                <div style={{ background: '#1f3a3d', color: 'white', padding: '40px', borderRadius: '16px' }}>
                    <h2>{t('contact.getInTouch')}</h2>
                    <p style={{ opacity: 0.8, marginBottom: '30px' }}>{t('contact.formIntro')}</p>
                    <div style={{ marginBottom: '20px' }}><i className="fas fa-phone" style={{ color: '#ffc801', width: '25px' }}></i> {LEGAL_COMPANY_DETAILS.phone}</div>
                    <div style={{ marginBottom: '20px' }}><i className="fas fa-envelope" style={{ color: '#ffc801', width: '25px' }}></i> {LEGAL_COMPANY_DETAILS.email}</div>
                    <div><i className="fas fa-map-marker-alt" style={{ color: '#ffc801', width: '25px' }}></i> {LEGAL_COMPANY_DETAILS.address}</div>
                    <div style={{ marginTop: '26px', borderTop: '1px solid rgba(255,255,255,0.18)', paddingTop: '16px' }}>
                        <h3 style={{ margin: '0 0 10px', fontSize: '16px' }}>Legal Company Information</h3>
                        <p style={{ margin: '0 0 6px', opacity: 0.92, lineHeight: 1.5 }}><strong>Legal company name:</strong> {LEGAL_COMPANY_DETAILS.legalName}</p>
                        <p style={{ margin: 0, opacity: 0.92, lineHeight: 1.5 }}><strong>KvK number:</strong> {LEGAL_COMPANY_DETAILS.kvkNumber}</p>
                    </div>
                </div>

                {/* Contact Form */}
                <div style={{ background: 'white', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
                    <form>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{display:'block', marginBottom:'5px', fontSize:'12px', fontWeight:'bold'}}>{t('contact.name')}</label>
                            <input type="text" style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px'}} />
                        </div>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{display:'block', marginBottom:'5px', fontSize:'12px', fontWeight:'bold'}}>{t('contact.email')}</label>
                            <input type="email" style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px'}} />
                        </div>
                        <div style={{ marginBottom: '20px' }}>
                            <label style={{display:'block', marginBottom:'5px', fontSize:'12px', fontWeight:'bold'}}>{t('contact.message')}</label>
                            <textarea rows="4" style={{width:'100%', padding:'10px', border:'1px solid #ddd', borderRadius:'8px'}}></textarea>
                        </div>
                        <button className="btn-filled" style={{width:'100%'}}>{t('contact.sendMessage')}</button>
                    </form>
                </div>

            </div>
        </div>
    );
};

export default Contact;
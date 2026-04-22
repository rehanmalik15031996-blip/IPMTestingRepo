import React from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';

const Privacy = () => {
    const isMobile = useIsMobile();
    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
            <div style={{ maxWidth: '800px', margin: isMobile ? '30px auto' : '50px auto', padding: isMobile ? '24px 16px' : '40px', background: 'white', borderRadius: '16px' }}>
                <h1 style={{ color: '#1f3a3d', marginBottom: '10px' }}>Privacy Policy</h1>
                <p style={{ color: '#999', marginBottom: '30px', fontSize: '13px' }}>Last Updated: October 24, 2025</p>
                
                <div style={{ lineHeight: '1.8', color: '#444' }}>
                    <p><strong>1. Data Collection</strong><br/>We collect information you provide directly to us, such as when you create an account, update your profile, or communicate with us.</p>
                    <p><strong>2. Use of Information</strong><br/>We use your information to provide, maintain, and improve our services, including processing transactions and sending related information.</p>
                    <p><strong>3. Data Security</strong><br/>We implement bank-grade encryption and blockchain verification to protect your personal and financial data.</p>
                </div>
            </div>
        </div>
    );
};

export default Privacy;
import React from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';

const Legal = () => {
    const isMobile = useIsMobile();
    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
            <div style={{ maxWidth: '800px', margin: isMobile ? '30px auto' : '50px auto', padding: isMobile ? '24px 16px' : '40px', background: 'white', borderRadius: '16px' }}>
                <h1 style={{ color: '#1f3a3d', marginBottom: '10px' }}>Terms of Service</h1>
                <p style={{ color: '#999', marginBottom: '30px', fontSize: '13px' }}>Last Updated: October 24, 2025</p>
                
                <div style={{ lineHeight: '1.8', color: '#444' }}>
                    <p><strong>1. Introduction</strong><br/>Welcome to IPM. By accessing our website, you agree to be bound by these terms regarding investment protocols and data usage.</p>
                    <p><strong>2. Investment Risks</strong><br/>Real estate investments carry risks. Historical performance does not guarantee future results. Users should consult financial advisors before making decisions.</p>
                    <p><strong>3. User Accounts</strong><br/>You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account.</p>
                </div>
            </div>
        </div>
    );
};

export default Legal;
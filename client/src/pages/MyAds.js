import React from 'react';

const MyAds = () => {
    return (
        <div style={{ padding: '24px', maxWidth: 900, margin: '0 auto', fontFamily: "'Poppins', sans-serif" }}>
            <h1 style={{ fontSize: '1.75rem', color: '#11575C', marginBottom: '8px' }}>My Ads</h1>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>Manage your advertising placements here.</p>
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '32px', textAlign: 'center', color: '#64748b' }}>
                Your ads will appear here once you have active campaigns.
            </div>
        </div>
    );
};

export default MyAds;

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import { useIsMobile } from '../hooks/useMediaQuery';
import { brand } from '../config/brandColors';

const Marketing = () => {
    const isMobile = useIsMobile();
    const navigate = useNavigate();
    const [user, setUser] = useState(null);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('user'));
        if (!storedUser) {
            navigate('/');
            return;
        }
        setUser(storedUser);
    }, [navigate]);

    if (!user) return null;

    const cardStyle = {
        background: '#fff',
        borderRadius: 16,
        padding: isMobile ? 16 : 24,
        boxShadow: `0 4px 15px ${brand.border}`,
        marginBottom: 24,
        fontFamily: "'Poppins', sans-serif",
    };

    return (
        <div style={{ display: 'flex', fontFamily: "'Poppins', sans-serif", minHeight: '100vh', background: brand.background }}>
            <Sidebar />
            <main
                className="dashboard-main"
                style={{
                    flex: 1,
                    background: brand.background,
                    minHeight: 0,
                    overflow: 'auto',
                    padding: isMobile ? 16 : 24,
                }}
            >
                <h1 style={{ margin: '0 0 8px', fontSize: 22, color: brand.text, fontWeight: 700 }}>Marketing</h1>
                <p style={{ margin: '0 0 24px', color: brand.muted, fontSize: 14 }}>
                    Manage your assets, connect social media, and target leads and listings from one place.
                </p>

                <div style={{
                    ...cardStyle,
                    border: `2px solid ${brand.primary}`,
                    textAlign: 'center',
                    maxWidth: 480,
                    margin: '0 auto',
                }}>
                    <i className="fas fa-clock" style={{ fontSize: 48, color: brand.primary, marginBottom: 16, display: 'block' }} aria-hidden />
                    <h2 style={{ margin: '0 0 12px', fontSize: 22, fontWeight: 700, color: brand.primary }}>Coming Soon</h2>
                    <p style={{ margin: 0, color: brand.muted, fontSize: 15, lineHeight: 1.5 }}>
                        Manage all your marketing and client engagements like a pro from one central place.
                    </p>
                </div>
            </main>
        </div>
    );
};

export default Marketing;

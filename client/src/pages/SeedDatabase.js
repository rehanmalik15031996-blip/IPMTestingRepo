// Simple page to seed the database - can be accessed without login
import React, { useState } from 'react';
import api from '../config/api';

const SeedDatabase = () => {
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSeed = async () => {
        if (!window.confirm('This will populate the database with sample data (properties, news, developments, users). Continue?')) {
            return;
        }

        setLoading(true);
        setResult(null);

        try {
            const res = await api.post('/api/users?action=seed');
            if (res.data.success) {
                setResult({
                    success: true,
                    message: '✅ Database seeded successfully!',
                    data: res.data.data
                });
                setTimeout(() => {
                    window.location.href = '/';
                }, 2000);
            } else {
                setResult({
                    success: false,
                    message: '❌ Seeding failed: ' + res.data.message
                });
            }
        } catch (err) {
            setResult({
                success: false,
                message: '❌ Error: ' + (err.response?.data?.message || err.message)
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px',
            fontFamily: "'Inter', sans-serif",
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '40px',
                maxWidth: '500px',
                width: '100%',
                boxShadow: '0 20px 60px rgba(0,0,0,0.3)'
            }}>
                <h1 style={{ color: '#115e59', marginBottom: '10px', fontSize: '28px' }}>
                    🌱 Seed Database
                </h1>
                <p style={{ color: '#64748b', marginBottom: '30px', lineHeight: '1.6' }}>
                    Click the button below to populate your database with sample data including properties, news articles, developments, and sample users.
                </p>

                <button
                    onClick={handleSeed}
                    disabled={loading}
                    style={{
                        width: '100%',
                        padding: '15px',
                        background: loading ? '#94a3b8' : '#115e59',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '16px',
                        fontWeight: 'bold',
                        cursor: loading ? 'not-allowed' : 'pointer',
                        marginBottom: '20px',
                        transition: 'all 0.3s'
                    }}
                >
                    {loading ? '⏳ Seeding Database...' : '🌱 Seed Database Now'}
                </button>

                {result && (
                    <div style={{
                        padding: '15px',
                        borderRadius: '8px',
                        background: result.success ? '#d1fae5' : '#fee2e2',
                        color: result.success ? '#065f46' : '#991b1b',
                        marginTop: '20px'
                    }}>
                        <p style={{ margin: 0, fontWeight: 'bold' }}>{result.message}</p>
                        {result.success && result.data && (
                            <div style={{ marginTop: '10px', fontSize: '14px' }}>
                                <p>✅ {result.data.marketTrends} Market Trends</p>
                                <p>✅ {result.data.news} News Articles</p>
                                <p>✅ {result.data.developments} Developments</p>
                                <p>✅ {result.data.properties} Properties</p>
                                <p>✅ {result.data.users} Sample Users</p>
                                <p style={{ marginTop: '10px', fontSize: '12px' }}>
                                    Redirecting to homepage...
                                </p>
                            </div>
                        )}
                    </div>
                )}

                <div style={{ marginTop: '30px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '14px', color: '#64748b', marginBottom: '10px' }}>Sample Login Credentials:</h3>
                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.8' }}>
                        <p><strong>Admin:</strong> admin@ipm.com / admin123</p>
                        <p><strong>Investor:</strong> investor@ipm.com / investor123</p>
                        <p><strong>Agent:</strong> agent@ipm.com / agent123</p>
                    </div>
                </div>

                <a href="/" style={{
                    display: 'block',
                    textAlign: 'center',
                    marginTop: '20px',
                    color: '#115e59',
                    textDecoration: 'none',
                    fontSize: '14px'
                }}>
                    ← Back to Home
                </a>
            </div>
        </div>
    );
};

export default SeedDatabase;


import React from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';

const Careers = () => {
    const isMobile = useIsMobile();
    return (
        <div style={{ background: '#f8f9fa', minHeight: '100vh' }}>
            <div style={{ maxWidth: '1000px', margin: isMobile ? '30px auto' : '50px auto', padding: isMobile ? '20px 16px' : '20px' }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 style={{ color: '#1f3a3d', fontSize: '40px' }}>Join the Future of Real Estate</h1>
                    <p style={{ color: '#666' }}>We are looking for innovators, data scientists, and real estate experts.</p>
                </div>
                <div style={{ display: 'grid', gap: '20px' }}>
                    {[
                        { title: 'Senior React Developer', loc: 'Remote', type: 'Full-time' },
                        { title: 'AI Data Scientist', loc: 'Dubai, UAE', type: 'Full-time' },
                        { title: 'Real Estate Analyst', loc: 'London, UK', type: 'Hybrid' }
                    ].map((job, i) => (
                        <div key={i} style={{ background: 'white', padding: '25px', borderRadius: '12px', display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? '16px' : 0, justifyContent: 'space-between', alignItems: isMobile ? 'stretch' : 'center', boxShadow: '0 2px 5px rgba(0,0,0,0.05)' }}>
                            <div>
                                <h3 style={{ margin: '0 0 5px 0', color: '#1f3a3d' }}>{job.title}</h3>
                                <div style={{ color: '#888', fontSize: '14px' }}><i className="fas fa-map-marker-alt"></i> {job.loc} &bull; {job.type}</div>
                            </div>
                            <button className="btn-filled">Apply Now</button>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default Careers;
import React, { useState, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Sidebar from '../components/Sidebar';
import PropertyUploadForm from '../components/PropertyUploadForm';
import { showNotification } from '../components/NotificationManager';
import { useIsMobile } from '../hooks/useMediaQuery';

/** Map listing type (Auction, Residential, etc.) to PropertyUploadForm initialData */
const getInitialDataForType = (type) => {
    if (!type) return null;
    if (type === 'Auction') return { listingType: 'for_auction' };
    return { listingType: 'for_sale', propertyCategory: type };
};

const AddListing = () => {
    const isMobile = useIsMobile();
    const location = useLocation();
    const navigate = useNavigate();
    const typeFromState = location.state?.type || null;
    const initialData = useMemo(() => getInitialDataForType(typeFromState), [typeFromState]);

    const [showUploadModal, setShowUploadModal] = useState(true);

    return (
        <div className="dashboard-container" style={{ display: 'flex', background: '#f8fafc', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            <Sidebar />
            <main className="dashboard-main" style={{ flex: 1, padding: isMobile ? '16px' : '30px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', gap: '16px' }}>
                {!showUploadModal && (
                    <>
                        <p style={{ color: '#64748b', fontSize: '14px' }}>Upload form closed.</p>
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <button type="button" onClick={() => setShowUploadModal(true)} style={btnPrimary}>Reopen upload form</button>
                            <button type="button" onClick={() => navigate('/listing-management')} style={btnSecondary}>Go to Listing Management</button>
                        </div>
                    </>
                )}
            </main>

            <PropertyUploadForm
                isOpen={showUploadModal}
                onClose={() => {
                    setShowUploadModal(false);
                    navigate('/listing-management');
                }}
                onSuccess={() => {
                    showNotification('Property uploaded successfully!', 'success');
                    setShowUploadModal(false);
                    navigate('/listing-management');
                }}
                initialData={initialData}
            />
        </div>
    );
};

const btnPrimary = { padding: '12px 24px', borderRadius: '12px', border: 'none', background: '#115e59', color: 'white', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' };
const btnSecondary = { padding: '12px 24px', borderRadius: '12px', border: '1px solid #115e59', background: 'white', color: '#115e59', fontWeight: 'bold', cursor: 'pointer', fontSize: '14px' };

export default AddListing;

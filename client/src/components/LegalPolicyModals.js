import React, { useId } from 'react';
import { TermsOfServiceContent, PRIVACY_POLICY_CONTENT } from '../content/legalContent';

const termsModalOverlay = {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: 'rgba(0,0,0,0.5)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1100,
    padding: '20px',
};

const termsModalHeader = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: '1px solid #e2e8f0',
};

const termsModalClose = {
    background: 'none',
    border: 'none',
    fontSize: '18px',
    color: '#64748b',
    cursor: 'pointer',
    padding: '4px 8px',
};

const termsModalBody = { overflowY: 'auto', padding: '20px', flex: 1, minHeight: 0 };

const termsModalFooter = { padding: '12px 20px', borderTop: '1px solid #e2e8f0' };

const termsModalBtn = {
    padding: '8px 16px',
    background: '#11575C',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    fontWeight: '600',
};

function termsModalContentStyle(isMobile) {
    return {
        background: '#fff',
        borderRadius: '12px',
        maxWidth: isMobile ? '95vw' : '600px',
        width: '100%',
        maxHeight: '85vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
    };
}

/**
 * Terms of Service + Privacy Policy modals (same copy and UX as site footer).
 * Content comes from `content/legalContent.js`.
 */
export default function LegalPolicyModals({
    showTermsModal,
    setShowTermsModal,
    showPrivacyModal,
    setShowPrivacyModal,
    isMobile,
}) {
    const termsTitleId = useId();
    const privacyTitleId = useId();
    const termsModalContent = termsModalContentStyle(isMobile);

    return (
        <>
            {showTermsModal && (
                <div style={termsModalOverlay} onClick={() => setShowTermsModal(false)} role="presentation">
                    <div style={termsModalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={termsTitleId}>
                        <div style={termsModalHeader}>
                            <h3 id={termsTitleId} style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>
                                Terms of Service
                            </h3>
                            <button type="button" style={termsModalClose} onClick={() => setShowTermsModal(false)} aria-label="Close">
                                <i className="fas fa-times" />
                            </button>
                        </div>
                        <div style={termsModalBody}>
                            <TermsOfServiceContent
                                onOpenPrivacy={() => {
                                    setShowTermsModal(false);
                                    setShowPrivacyModal(true);
                                }}
                            />
                        </div>
                        <div style={termsModalFooter}>
                            <button type="button" style={termsModalBtn} onClick={() => setShowTermsModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {showPrivacyModal && (
                <div style={termsModalOverlay} onClick={() => setShowPrivacyModal(false)} role="presentation">
                    <div style={termsModalContent} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby={privacyTitleId}>
                        <div style={termsModalHeader}>
                            <h3 id={privacyTitleId} style={{ margin: 0, fontSize: '18px', color: '#11575C' }}>
                                Privacy Policy
                            </h3>
                            <button type="button" style={termsModalClose} onClick={() => setShowPrivacyModal(false)} aria-label="Close">
                                <i className="fas fa-times" />
                            </button>
                        </div>
                        <div style={termsModalBody}>{PRIVACY_POLICY_CONTENT}</div>
                        <div style={termsModalFooter}>
                            <button type="button" style={termsModalBtn} onClick={() => setShowPrivacyModal(false)}>
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

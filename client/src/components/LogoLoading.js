import React from 'react';

/**
 * Loading indicator using the IPM logo with a yellow fill-from-bottom animation.
 * Use for page/section loading to match brand and feel smoother.
 */
const LogoLoading = ({ message = 'Loading...', style = {} }) => (
    <div
        className="logo-loading"
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            minHeight: '120px',
            color: '#64748b',
            fontFamily: "'Inter', 'Poppins', sans-serif",
            fontSize: '14px',
            ...style
        }}
    >
        <div className="logo-loading__logo-wrap">
            {/* Base: white logo + text (always visible) */}
            <div className="logo-loading__base" aria-hidden>
                <img src="/logo-white.png" alt="" className="logo-loading__img" />
                <span className="logo-loading__text">IPM</span>
            </div>
            {/* Yellow fill layer: revealed from bottom to top */}
            <div className="logo-loading__fill" aria-hidden>
                <img src="/logo-white.png" alt="" className="logo-loading__img logo-loading__img--yellow" />
                <span className="logo-loading__text logo-loading__text--yellow">IPM</span>
            </div>
        </div>
        {message && <span>{message}</span>}
    </div>
);

export default LogoLoading;

import React from 'react';

/**
 * Reusable loading indicator with spinning icon and optional message.
 * @param {string} [message] - Optional text below the spinner (e.g. "Loading...", "Loading Dashboard...")
 * @param {object} [style] - Optional container style overrides
 */
const LoadingSpinner = ({ message = 'Loading...', style = {} }) => (
    <div
        style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            minHeight: '120px',
            color: '#64748b',
            fontFamily: "'Inter', 'Poppins', sans-serif",
            fontSize: '14px',
            ...style
        }}
    >
        <i className="fas fa-circle-notch fa-spin" style={{ fontSize: '28px', color: '#11575C' }} aria-hidden />
        {message && <span>{message}</span>}
    </div>
);

export default LoadingSpinner;

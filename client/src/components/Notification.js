import React, { useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';

const Notification = ({ message, type = 'success', duration = 4000, onClose }) => {
  const isMobile = useIsMobile();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (duration > 0) {
      const timer = setTimeout(() => {
        setVisible(false);
        setTimeout(() => onClose && onClose(), 300); // Wait for fade out
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [duration, onClose]);

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onClose && onClose(), 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <i className="fas fa-check-circle"></i>;
      case 'error':
        return <i className="fas fa-exclamation-circle"></i>;
      case 'warning':
        return <i className="fas fa-exclamation-triangle"></i>;
      case 'info':
        return <i className="fas fa-info-circle"></i>;
      default:
        return <i className="fas fa-bell"></i>;
    }
  };

  const getStyles = () => {
    const baseStyles = {
      position: 'fixed',
      top: '20px',
      right: '20px',
      minWidth: isMobile ? 'auto' : '300px',
      maxWidth: isMobile ? 'calc(100vw - 32px)' : '400px',
      padding: '16px 20px',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      zIndex: 99999,
      transition: 'all 0.3s ease',
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateX(0)' : 'translateX(400px)',
      pointerEvents: visible ? 'auto' : 'none',
      fontFamily: "'Poppins', sans-serif",
      fontSize: '14px',
      fontWeight: '500'
    };

    switch (type) {
      case 'success':
        return {
          ...baseStyles,
          background: '#f0fdfa',
          border: '1px solid #10b981',
          color: '#065f46'
        };
      case 'error':
        return {
          ...baseStyles,
          background: '#fef2f2',
          border: '1px solid #ef4444',
          color: '#991b1b'
        };
      case 'warning':
        return {
          ...baseStyles,
          background: '#fffbeb',
          border: '1px solid #ffc801',
          color: '#92400e'
        };
      case 'info':
        return {
          ...baseStyles,
          background: '#eff6ff',
          border: '1px solid #3b82f6',
          color: '#1e40af'
        };
      default:
        return {
          ...baseStyles,
          background: '#f9fafb',
          border: '1px solid #6b7280',
          color: '#374151'
        };
    }
  };

  const iconStyles = {
    fontSize: '20px',
    flexShrink: 0
  };

  const messageStyles = {
    flex: 1,
    lineHeight: '1.5'
  };

  // Ensure we never render an object (React error #31)
  const safeMessage = typeof message === 'string' ? message : (message && typeof message.message === 'string' ? message.message : String(message != null ? message : ''));

  const closeButtonStyles = {
    background: 'none',
    border: 'none',
    color: 'inherit',
    cursor: 'pointer',
    padding: '4px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    opacity: 0.7,
    transition: 'opacity 0.2s',
    fontSize: '16px'
  };

  return (
    <div style={getStyles()}>
      <div style={iconStyles}>{getIcon()}</div>
      <div style={messageStyles}>{safeMessage}</div>
      <button
        onClick={handleClose}
        style={closeButtonStyles}
        onMouseEnter={(e) => (e.target.style.opacity = '1')}
        onMouseLeave={(e) => (e.target.style.opacity = '0.7')}
        aria-label="Close notification"
      >
        <i className="fas fa-times"></i>
      </button>
    </div>
  );
};

export default Notification;


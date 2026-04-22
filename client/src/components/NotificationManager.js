import React, { useState, useCallback, useEffect } from 'react';
import Notification from './Notification';
import { useIsMobile } from '../hooks/useMediaQuery';

let notificationIdCounter = 0;
let globalNotifications = [];
let globalSetNotifications = null;

// Global notification manager
export const showNotification = (message, type = 'success', duration = 4000) => {
  const id = notificationIdCounter++;
  const notification = { id, message, type, duration };
  
  if (globalSetNotifications) {
    globalSetNotifications(prev => [...prev, notification]);
  } else {
    globalNotifications.push(notification);
  }
  
  return id;
};

export const useNotification = () => {
  const [notifications, setNotifications] = useState([]);
  const isMobile = useIsMobile();

  useEffect(() => {
    globalSetNotifications = setNotifications;
    // Add any pending notifications
    if (globalNotifications.length > 0) {
      setNotifications([...globalNotifications]);
      globalNotifications = [];
    }
    return () => {
      globalSetNotifications = null;
    };
  }, []);

  const removeNotification = useCallback((id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  }, []);

  const NotificationContainer = () => (
    <>
      {notifications.map((notification, index) => (
        <div
          key={notification.id}
          style={{
            position: 'fixed',
            top: `${20 + index * 80}px`,
            ...(isMobile ? { left: '50%', transform: 'translateX(-50%)' } : { right: '20px' }),
            zIndex: 99999 + index
          }}
        >
          <Notification
            message={notification.message}
            type={notification.type}
            duration={notification.duration}
            onClose={() => removeNotification(notification.id)}
          />
        </div>
      ))}
    </>
  );

  return { showNotification, removeNotification, NotificationContainer };
};

export default useNotification;


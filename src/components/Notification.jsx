import { useEffect, useRef } from 'react';

export default function Notification({ notification, onDismiss }) {
  const timerRef = useRef(null);

  useEffect(() => {
    if (notification?.visible) {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        onDismiss?.();
      }, 3000);
    }
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [notification?.visible, notification?.message, onDismiss]);

  if (!notification) return null;

  const iconMap = {
    success: 'fa-solid fa-circle-check text-success',
    danger: 'fa-solid fa-circle-xmark text-danger',
    warning: 'fa-solid fa-triangle-exclamation text-warning',
    info: 'fa-solid fa-circle-info text-accent',
  };

  return (
    <div className={`notification-banner ${notification.type} ${notification.visible ? 'active' : ''}`}>
      <i className={iconMap[notification.type] || iconMap.info}></i>
      <span>{notification.message}</span>
    </div>
  );
}

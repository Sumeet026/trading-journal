import { useState, useCallback, useRef } from 'react';

export function useNotification() {
  const [notification, setNotification] = useState({
    message: '',
    type: 'info',
    visible: false,
  });

  const timeoutRef = useRef(null);

  const showNotification = useCallback((message, type = 'info') => {
    clearTimeout(timeoutRef.current);
    setNotification({ message, type, visible: true });
    timeoutRef.current = setTimeout(
      () => setNotification((prev) => ({ ...prev, visible: false })),
      4000,
    );
  }, []);

  const hideNotification = useCallback(() => {
    clearTimeout(timeoutRef.current);
    setNotification((prev) => ({ ...prev, visible: false }));
  }, []);

  return { notification, showNotification, hideNotification };
}

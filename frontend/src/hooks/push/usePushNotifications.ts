import { useEffect, useRef } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { registerWebPushForUser } from '../usePushRegistration';

/**
 * Silently registers Web Push after login when permission is already granted.
 * Manual opt-in (permission prompt) uses the bell control via usePushRegistration.
 */
export function usePushNotifications(isAuthenticated: boolean): void {
  const { session } = useAuth();
  const userId = session?.user?.id;
  const attempted = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !userId || attempted.current) return;
    if (Notification.permission !== 'granted') return;

    attempted.current = true;
    void registerWebPushForUser(userId).catch((err) => {
      if (import.meta.env.DEV) {
        console.warn('[push] silent registration failed:', err);
      }
    });
  }, [isAuthenticated, userId]);
}

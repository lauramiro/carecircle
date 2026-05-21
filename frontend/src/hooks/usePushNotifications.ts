import { useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../contexts/AuthContext';

const VAPID_PUBLIC_KEY = import.meta.env['VITE_VAPID_PUBLIC_KEY'] as string | undefined;

function urlBase64ToUint8Array(base64: string): Uint8Array {
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const b64     = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = window.atob(b64);
    return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
    const { session } = useAuth();
    const userId = session?.user?.id;

    useEffect(() => {
        if (!userId || !VAPID_PUBLIC_KEY) return;
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        void registerAndSubscribe(userId, VAPID_PUBLIC_KEY);
    }, [userId]);
}

async function registerAndSubscribe(userId: string, vapidPublicKey: string) {
    try {
        const registration = await navigator.serviceWorker.register('/sw.js');

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const existing = await registration.pushManager.getSubscription();
        const subscription = existing ?? await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });

        const subJson = subscription.toJSON() as { endpoint: string; keys: Record<string, string> };

        const { data: profile } = await supabase
            .from('profiles')
            .select('preferences')
            .eq('id', userId)
            .single();

        const prefs     = (profile?.preferences as Record<string, unknown> | null) ?? {};
        const existing_ = (prefs['pushSubscriptions'] as Array<{ endpoint: string }> | null) ?? [];

        if (!existing_.some(s => s.endpoint === subJson.endpoint)) {
            await supabase
                .from('profiles')
                .update({
                    preferences: {
                        ...prefs,
                        pushSubscriptions: [...existing_, subJson],
                    },
                })
                .eq('id', userId);
        }
    } catch (err) {
        console.error('[usePushNotifications] Setup failed:', err);
    }
}

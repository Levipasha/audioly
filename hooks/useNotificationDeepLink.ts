import * as Linking from 'expo-linking';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';

export function useNotificationDeepLink() {
    const router = useRouter();

    useEffect(() => {
        const handleDeepLink = (url: string) => {
            // Parse the URL
            const parsed = Linking.parse(url);
            console.log('[DeepLink] Parsed:', parsed);

            // Track Player uses trackplayer://notification.click
            // where "notification.click" is the hostname, not the path
            const isNotification =
                parsed.scheme === 'trackplayer' ||
                parsed.hostname === 'notification.click' ||
                parsed.path === 'notification.click' ||
                parsed.path?.includes('notification') ||
                parsed.hostname?.includes('notification');

            if (isNotification) {
                console.log('[DeepLink] Navigating to player from notification');
                // Use replace for instant navigation without history
                router.replace('/(tabs)/player');
                return;
            }

            // Handle other deep links if needed
            if (parsed.path) {
                try {
                    router.replace(parsed.path as any);
                } catch (error) {
                    console.error('[DeepLink] Navigation error:', error);
                    // Fallback to player if navigation fails
                    router.replace('/(tabs)/player');
                }
            }
        };

        // Handle initial URL when app is opened from notification
        Linking.getInitialURL().then((url) => {
            if (url) {
                console.log('[DeepLink] Initial URL:', url);
                handleDeepLink(url);
            }
        }).catch(err => {
            console.error('[DeepLink] Error getting initial URL:', err);
        });

        // Handle URL when app is already open
        const subscription = Linking.addEventListener('url', ({ url }) => {
            console.log('[DeepLink] URL received:', url);
            handleDeepLink(url);
        });

        return () => {
            subscription.remove();
        };
    }, [router]);
}

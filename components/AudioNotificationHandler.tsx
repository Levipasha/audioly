import Constants, { ExecutionEnvironment } from 'expo-constants';
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useNowPlaying } from './now-playing-context';

export function AudioNotificationHandler() {
    const { nowPlaying } = useNowPlaying();
    const router = useRouter();

    // Check if we are running in Expo Go
    // In SDK 53, expo-notifications MUST NOT be required in Expo Go as it crashes on Android
    const isExpoGo =
        Constants.executionEnvironment === ExecutionEnvironment.StoreClient ||
        Constants.appOwnership === 'expo' ||
        // Fallback check for some environments where the constants might be late or different
        (Platform.OS === 'android' && Constants.expoConfig?.name === 'Expo Go');

    useEffect(() => {
        // If in Expo Go, skip notification setup completely
        if (isExpoGo) return;

        let Notifications: any;
        try {
            // Lazy load expo-notifications inside the effect
            Notifications = require('expo-notifications');
        } catch (e) {
            console.warn('Failed to load expo-notifications:', e);
            return;
        }

        // Configure notification handler
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: false,
                shouldPlaySound: false,
                shouldSetBadge: false,
                shouldShowBanner: false,
                shouldShowList: false,
            }),
        });

        // Request permissions
        const requestPermissions = async () => {
            try {
                const { status: existingStatus } = await Notifications.getPermissionsAsync();
                let finalStatus = existingStatus;
                if (existingStatus !== 'granted') {
                    const { status } = await Notifications.requestPermissionsAsync();
                    finalStatus = status;
                }

                if (Platform.OS === 'android') {
                    await Notifications.setNotificationChannelAsync('media-controls', {
                        name: 'Media Controls',
                        importance: Notifications.AndroidImportance.LOW,
                        vibrationPattern: [0, 250, 250, 250],
                        lightColor: '#FF231F7C',
                    });
                }
            } catch (error) {
                console.warn('Error requesting permissions:', error);
            }
        };

        void requestPermissions();

        // Setup update listener
        const updateNotification = async () => {
            if (!nowPlaying) return;

            try {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title: nowPlaying.title,
                        body: `${nowPlaying.subtitle || 'Unknown Artist'}`,
                        data: {
                            route: '/(tabs)/player',
                            type: 'media-player'
                        },
                        sticky: true,
                        priority: Notifications.AndroidNotificationPriority.LOW,
                        color: '#3b82f6',
                        // Add Android-specific action to make it clickable
                        ...(Platform.OS === 'android' && {
                            categoryIdentifier: 'media-controls',
                        }),
                    },
                    trigger: null,
                    identifier: 'now-playing',
                });
            } catch (error) {
                console.warn('Failed to schedule notification:', error);
            }
        };

        void updateNotification();

        // Handle notification interactions
        const subscription = Notifications.addNotificationResponseReceivedListener((response: any) => {
            console.log('[AudioNotificationHandler] Notification tapped:', response);

            const { actionIdentifier, notification } = response;

            // Check if it's a tap on the notification itself (not an action button)
            if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
                // Always navigate to player when notification is tapped
                try {
                    console.log('[AudioNotificationHandler] Navigating to player screen');
                    router.push('/(tabs)/player');
                } catch (error) {
                    console.error('[AudioNotificationHandler] Navigation error:', error);
                }
            }
        });

        return () => {
            if (subscription && subscription.remove) {
                subscription.remove();
            }
        };
    }, [nowPlaying, isExpoGo, router]);

    return null;
}

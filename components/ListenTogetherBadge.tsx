import { listenTogetherService } from '@/services/listen-together';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';

export function ListenTogetherBadge() {
    const router = useRouter();
    const [requestCount, setRequestCount] = useState(0);

    useEffect(() => {
        loadRequestCount();

        // Poll every 30 seconds for new requests
        const interval = setInterval(loadRequestCount, 30000);

        return () => clearInterval(interval);
    }, []);

    const loadRequestCount = async () => {
        try {
            // Check if user is authenticated first
            const token = await AsyncStorage.getItem('accessToken') ||
                await AsyncStorage.getItem('userToken');

            if (!token) {
                // User not logged in, silently return
                setRequestCount(0);
                return;
            }

            const requests = await listenTogetherService.getRequests();
            setRequestCount(requests.length);
        } catch (error: any) {
            // Silently fail for auth errors (401)
            if (error.message?.includes('401')) {
                setRequestCount(0);
            } else {
                console.error('Error loading request count:', error);
            }
        }
    };

    if (requestCount === 0) {
        return null;
    }

    return (
        <TouchableOpacity
            style={styles.badge}
            onPress={() => router.push('/listen-together-requests' as any)}
        >
            <Ionicons name="notifications" size={20} color="#fff" />
            <View style={styles.countBadge}>
                <Text style={styles.countText}>{requestCount}</Text>
            </View>
        </TouchableOpacity>
    );
}

const styles = StyleSheet.create({
    badge: {
        position: 'relative',
        padding: 8,
    },
    countBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#ef4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 4,
    },
    countText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
    },
});

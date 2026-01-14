import { ListenTogetherRequestCard } from '@/components/ListenTogetherRequestCard';
import {
    ListenTogetherRequest,
    listenTogetherService,
} from '@/services/listen-together';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    View,
} from 'react-native';

export function ListenTogetherRequests() {
    const router = useRouter();
    const [requests, setRequests] = useState<ListenTogetherRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [processingId, setProcessingId] = useState<string | null>(null);

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        try {
            setLoading(true);
            const data = await listenTogetherService.getRequests();
            setRequests(data);
        } catch (error) {
            console.error('Error loading requests:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await loadRequests();
        setRefreshing(false);
    };

    const handleAccept = async (requestId: string) => {
        try {
            setProcessingId(requestId);
            const { session } = await listenTogetherService.acceptRequest(requestId);

            // Remove from list
            setRequests((prev) => prev.filter((r) => r._id !== requestId));

            // Navigate to player or show success message
            alert(`Session started! You're now listening together.`);

            // Optionally navigate to player
            // router.push('/(tabs)/player');
        } catch (error: any) {
            alert(error.message || 'Failed to accept request');
        } finally {
            setProcessingId(null);
        }
    };

    const handleDecline = async (requestId: string) => {
        try {
            setProcessingId(requestId);
            await listenTogetherService.declineRequest(requestId);

            // Remove from list
            setRequests((prev) => prev.filter((r) => r._id !== requestId));
        } catch (error: any) {
            alert(error.message || 'Failed to decline request');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading) {
        return (
            <View style={styles.centerContainer}>
                <ActivityIndicator color="#3b82f6" size="large" />
            </View>
        );
    }

    if (requests.length === 0) {
        return (
            <View style={styles.emptyContainer}>
                <Ionicons name="musical-notes-outline" size={64} color="#6b7280" />
                <Text style={styles.emptyText}>No pending requests</Text>
                <Text style={styles.emptySubtext}>
                    Invite friends to listen together from the Explore page
                </Text>
            </View>
        );
    }

    return (
        <FlatList
            data={requests}
            keyExtractor={(item) => item._id}
            renderItem={({ item }) => (
                <ListenTogetherRequestCard
                    request={item}
                    onAccept={handleAccept}
                    onDecline={handleDecline}
                    processing={processingId === item._id}
                />
            )}
            contentContainerStyle={styles.listContent}
            refreshControl={
                <RefreshControl
                    refreshing={refreshing}
                    onRefresh={handleRefresh}
                    tintColor="#3b82f6"
                />
            }
        />
    );
}

const styles = StyleSheet.create({
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#050816',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#050816',
        padding: 40,
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
        textAlign: 'center',
    },
    listContent: {
        padding: 16,
        backgroundColor: '#050816',
    },
});

import { Friend, listenTogetherService } from '@/services/listen-together';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ListenTogetherModalProps {
    visible: boolean;
    onClose: () => void;
}

export function ListenTogetherModal({ visible, onClose }: ListenTogetherModalProps) {
    const [friends, setFriends] = useState<Friend[]>([]);
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState<Set<string>>(new Set());
    const [sentTo, setSentTo] = useState<Set<string>>(new Set());
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (visible) {
            loadFriends();
        }
    }, [visible]);

    const loadFriends = async () => {
        try {
            setLoading(true);
            setError(null);

            // Check if user is authenticated
            const token = await AsyncStorage.getItem('accessToken') ||
                await AsyncStorage.getItem('userToken');

            if (!token) {
                setError('Please login to use Listen Together');
                setFriends([]);
                return;
            }

            const friendsList = await listenTogetherService.getFriends();
            setFriends(friendsList);
        } catch (error: any) {
            console.error('Error loading friends:', error);

            // Handle authentication errors gracefully
            if (error.message?.includes('401') || error.message?.includes('Unauthorized')) {
                setError('Please login to use Listen Together');
            } else {
                setError('Failed to load friends. Please try again.');
            }
            setFriends([]);
        } finally {
            setLoading(false);
        }
    };

    const handleInvite = async (userId: string) => {
        try {
            setSending((prev) => new Set(prev).add(userId));
            await listenTogetherService.sendInvite(userId);
            setSentTo((prev) => new Set(prev).add(userId));
        } catch (error: any) {
            alert(error.message || 'Failed to send invitation');
        } finally {
            setSending((prev) => {
                const next = new Set(prev);
                next.delete(userId);
                return next;
            });
        }
    };

    const renderFriend = ({ item }: { item: Friend }) => {
        const isSending = sending.has(item._id);
        const isSent = sentTo.has(item._id);

        return (
            <View style={styles.friendItem}>
                {item.profileImage?.url ? (
                    <Image
                        source={{ uri: item.profileImage.url }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={[styles.avatar, styles.defaultAvatar]}>
                        <Ionicons name="person-circle" size={48} color="#9ca3af" />
                    </View>
                )}
                <View style={styles.friendInfo}>
                    <Text style={styles.friendName}>{item.name}</Text>
                    <Text style={styles.friendUsername}>@{item.username}</Text>
                </View>
                <TouchableOpacity
                    style={[styles.inviteButton, isSent && styles.inviteButtonSent]}
                    onPress={() => handleInvite(item._id)}
                    disabled={isSending || isSent}
                >
                    {isSending ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <Text style={styles.inviteButtonText}>
                            {isSent ? 'Invited' : 'Invite'}
                        </Text>
                    )}
                </TouchableOpacity>
            </View>
        );
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent
            onRequestClose={onClose}
        >
            <View style={styles.container}>
                <View style={styles.modal}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Listen Together</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#fff" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>
                        Select friends to invite for a synchronized listening session
                    </Text>

                    {loading ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator color="#3b82f6" size="large" />
                        </View>
                    ) : error ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="lock-closed-outline" size={64} color="#ef4444" />
                            <Text style={styles.errorText}>{error}</Text>
                            <Text style={styles.emptySubtext}>
                                Login to your account to invite friends
                            </Text>
                        </View>
                    ) : friends.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="people-outline" size={64} color="#6b7280" />
                            <Text style={styles.emptyText}>No friends yet</Text>
                            <Text style={styles.emptySubtext}>
                                Add friends to invite them to listen together
                            </Text>
                        </View>
                    ) : (
                        <FlatList
                            data={friends}
                            keyExtractor={(item) => item._id}
                            renderItem={renderFriend}
                            contentContainerStyle={styles.listContent}
                            showsVerticalScrollIndicator={false}
                        />
                    )}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        justifyContent: 'flex-end',
    },
    modal: {
        backgroundColor: '#1f2937',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        maxHeight: '80%',
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    title: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    closeButton: {
        padding: 4,
    },
    subtitle: {
        fontSize: 14,
        color: '#9ca3af',
        paddingHorizontal: 20,
        paddingTop: 12,
        paddingBottom: 16,
    },
    loadingContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginTop: 16,
    },
    errorText: {
        fontSize: 18,
        fontWeight: '600',
        color: '#ef4444',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 8,
        textAlign: 'center',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    friendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#374151',
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#374151',
    },
    defaultAvatar: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    friendInfo: {
        flex: 1,
        marginLeft: 12,
    },
    friendName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    friendUsername: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 2,
    },
    inviteButton: {
        backgroundColor: '#3b82f6',
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        minWidth: 80,
        alignItems: 'center',
    },
    inviteButtonSent: {
        backgroundColor: '#10b981',
    },
    inviteButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});

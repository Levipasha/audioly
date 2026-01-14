import { ListenTogetherRequest } from '@/services/listen-together';
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Image,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';

interface ListenTogetherRequestCardProps {
    request: ListenTogetherRequest;
    onAccept: (requestId: string) => void;
    onDecline: (requestId: string) => void;
    processing: boolean;
}

export function ListenTogetherRequestCard({
    request,
    onAccept,
    onDecline,
    processing,
}: ListenTogetherRequestCardProps) {
    return (
        <View style={styles.card}>
            <View style={styles.header}>
                {request.from.profileImage?.url ? (
                    <Image
                        source={{ uri: request.from.profileImage.url }}
                        style={styles.avatar}
                    />
                ) : (
                    <View style={[styles.avatar, styles.defaultAvatar]}>
                        <Ionicons name="person-circle" size={48} color="#9ca3af" />
                    </View>
                )}
                <View style={styles.info}>
                    <Text style={styles.name}>{request.from.name}</Text>
                    <Text style={styles.message}>wants to listen together</Text>
                </View>
                <Ionicons name="musical-notes" size={24} color="#3b82f6" />
            </View>

            <View style={styles.actions}>
                <TouchableOpacity
                    style={[styles.button, styles.declineButton]}
                    onPress={() => onDecline(request._id)}
                    disabled={processing}
                >
                    {processing ? (
                        <ActivityIndicator color="#ef4444" size="small" />
                    ) : (
                        <>
                            <Ionicons name="close-circle-outline" size={20} color="#ef4444" />
                            <Text style={[styles.buttonText, styles.declineText]}>Decline</Text>
                        </>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.acceptButton]}
                    onPress={() => onAccept(request._id)}
                    disabled={processing}
                >
                    {processing ? (
                        <ActivityIndicator color="#fff" size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle-outline" size={20} color="#fff" />
                            <Text style={[styles.buttonText, styles.acceptText]}>Accept</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    card: {
        backgroundColor: '#1f2937',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#374151',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
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
    info: {
        flex: 1,
        marginLeft: 12,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
    },
    message: {
        fontSize: 14,
        color: '#9ca3af',
        marginTop: 2,
    },
    actions: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
        borderRadius: 8,
        gap: 6,
    },
    acceptButton: {
        backgroundColor: '#3b82f6',
    },
    declineButton: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: '#ef4444',
    },
    buttonText: {
        fontSize: 14,
        fontWeight: '600',
    },
    acceptText: {
        color: '#fff',
    },
    declineText: {
        color: '#ef4444',
    },
});

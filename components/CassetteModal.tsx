import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Dimensions, Image, Modal, Platform, StyleSheet, Text, TouchableOpacity, View, useColorScheme } from 'react-native';
import { getCassetteColor } from '../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface CassetteModalProps {
    isVisible: boolean;
    onClose: () => void;
    song: {
        id?: string;
        title: string;
        subtitle?: string;
        coverUrl?: string;
        audioUrl?: string;
    } | null;
    onPlay?: () => void;
}

export const CassetteModal = ({ isVisible, onClose, song, onPlay }: CassetteModalProps) => {
    const isDark = useColorScheme() === 'dark';
    if (!song) return null;

    const bodyColor = getCassetteColor(song.title);

    return (
        <Modal
            transparent
            visible={isVisible}
            animationType="fade"
            onRequestClose={onClose}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={onClose}
            >
                <View style={[styles.modalContent, { backgroundColor: isDark ? '#1a1a1a' : '#ffffff' }]}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={onClose}
                    >
                        <Ionicons name="close" size={24} color={isDark ? "#ffffff" : "#000000"} />
                    </TouchableOpacity>

                    <View style={[styles.cassetteContainer, { backgroundColor: bodyColor }]}>
                        {/* Cassette Details (Tape Screws etc) */}
                        <View style={[styles.screw, { top: 10, left: 10 }]} />
                        <View style={[styles.screw, { top: 10, right: 10 }]} />
                        <View style={[styles.screw, { bottom: 10, left: 10 }]} />
                        <View style={[styles.screw, { bottom: 10, right: 10 }]} />

                        <View style={styles.labelArea}>
                            {song.coverUrl && (
                                <Image
                                    key={typeof song.coverUrl === 'string' ? song.coverUrl : 'cover'}
                                    source={typeof song.coverUrl === 'string' ? { uri: song.coverUrl } : song.coverUrl}
                                    style={[StyleSheet.absoluteFill, { opacity: 0.7 }]}
                                    resizeMode="cover"
                                />
                            )}
                            <View style={styles.labelContent}>
                                <Text style={styles.labelTitle}>{song.title}</Text>
                                <View style={styles.labelDivider} />
                                <Text style={styles.labelArtist}>{song.subtitle}</Text>
                            </View>
                        </View>

                        <View style={styles.reelRow}>
                            <View style={styles.reelWindow}>
                                <View style={styles.reel}>
                                    <View style={styles.reelCore} />
                                </View>
                            </View>
                            <View style={styles.reelWindow}>
                                <View style={styles.reel}>
                                    <View style={styles.reelCore} />
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.infoArea}>
                        <Text numberOfLines={2} style={[styles.title, { color: isDark ? '#ffffff' : '#000000' }]}>{song.title}</Text>
                        <Text numberOfLines={1} style={[styles.subtitle, { color: isDark ? '#a0a0a0' : '#666666' }]}>{song.subtitle}</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.playButton}
                        onPress={() => {
                            if (onPlay) onPlay();
                            onClose();
                        }}
                    >
                        <Ionicons name="play" size={24} color="#ffffff" />
                        <Text style={styles.playButtonText}>PLAY CASSETTE</Text>
                    </TouchableOpacity>
                </View>
            </TouchableOpacity>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    modalContent: {
        width: '100%',
        maxWidth: 400,
        borderRadius: 20,
        padding: 20,
        alignItems: 'center',
    },
    closeButton: {
        alignSelf: 'flex-end',
        padding: 5,
        marginBottom: 10,
    },
    cassetteContainer: {
        width: '100%',
        aspectRatio: 1.5,
        borderRadius: 12,
        padding: 15,
        justifyContent: 'space-between',
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
    },
    screw: {
        position: 'absolute',
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: 'rgba(0,0,0,0.3)',
    },
    labelArea: {
        height: '50%',
        backgroundColor: '#f5ead2',
        borderRadius: 4,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        position: 'relative',
    },
    labelContent: {
        flex: 1,
        padding: 10,
        justifyContent: 'center',
        backgroundColor: 'rgba(252, 248, 227, 0.4)',
    },
    labelTitle: {
        fontSize: 16,
        fontWeight: '900',
        color: '#1a1a1a',
        fontFamily: Platform.OS === 'ios' ? 'Helvetica-Bold' : 'sans-serif-condensed',
    },
    labelDivider: {
        height: 2,
        backgroundColor: '#ee7722',
        marginVertical: 4,
    },
    labelArtist: {
        fontSize: 12,
        fontWeight: '700',
        color: '#444',
    },
    reelRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 40,
        alignItems: 'center',
        height: '35%',
    },
    reelWindow: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reel: {
        width: 36,
        height: 36,
        borderRadius: 18,
        borderWidth: 2,
        borderColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reelCore: {
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: '#000',
    },
    infoArea: {
        marginTop: 25,
        alignItems: 'center',
        paddingHorizontal: 10,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        textAlign: 'center',
        marginBottom: 8,
    },
    subtitle: {
        fontSize: 16,
        fontWeight: '500',
    },
    playButton: {
        marginTop: 30,
        backgroundColor: '#3b82f6',
        flexDirection: 'row',
        paddingVertical: 15,
        paddingHorizontal: 30,
        borderRadius: 30,
        alignItems: 'center',
        gap: 10,
        width: '100%',
        justifyContent: 'center',
        elevation: 5,
    },
    playButtonText: {
        color: '#ffffff',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    }
});

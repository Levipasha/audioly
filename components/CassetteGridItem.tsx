import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Animated, Dimensions, Easing, Image, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getCassetteColor } from '../utils/colors';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - 60) / 2; // 20px padding on each side + 20px gap

interface CassetteGridItemProps {
    title: string;
    subtitle?: string;
    coverUrl?: string;
    isActive?: boolean;
    isPlaying?: boolean;
    isLiked?: boolean;
    onPress: () => void;
    onFavorite?: () => void;
}


export const CassetteGridItem = React.memo(({ title, subtitle, coverUrl, isActive, isPlaying, isLiked, onPress, onFavorite }: CassetteGridItemProps) => {
    const bodyColor = getCassetteColor(title);
    const rotation = React.useRef(new Animated.Value(0)).current;

    React.useEffect(() => {
        if (isPlaying) {
            Animated.loop(
                Animated.timing(rotation, {
                    toValue: 1,
                    duration: 3000,
                    easing: Easing.linear,
                    useNativeDriver: true,
                })
            ).start();
        } else {
            rotation.stopAnimation();
        }
    }, [isPlaying]);

    const rotate1 = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const rotate2 = rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['360deg', '0deg'],
    });

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            style={[
                styles.container,
                isActive && styles.activeContainer
            ]}
        >
            <View style={[styles.cassetteBody, { backgroundColor: bodyColor }]}>
                {/* Screws */}
                <View style={[styles.screw, { top: 4, left: 4 }]} />
                <View style={[styles.screw, { top: 4, right: 4 }]} />
                <View style={[styles.screw, { bottom: 4, left: 4 }]} />
                <View style={[styles.screw, { bottom: 4, right: 4 }]} />

                {/* Label Area */}
                <View style={styles.labelArea}>
                    {coverUrl ? (
                        <Image
                            key={coverUrl}
                            source={{ uri: coverUrl }}
                            style={[StyleSheet.absoluteFill, { opacity: 0.6 }]}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="musical-notes" size={20} color="rgba(0,0,0,0.1)" />
                        </View>
                    )}

                    <View style={styles.labelContent}>
                        <Text numberOfLines={1} style={styles.labelTitle}>{title}</Text>
                        <View style={styles.labelDivider} />
                        <Text numberOfLines={1} style={styles.labelArtist}>{subtitle}</Text>
                    </View>
                </View>

                {/* Reels */}
                <View style={styles.reelRow}>
                    <View style={styles.reelWindow}>
                        <Animated.View style={[styles.reel, { transform: [{ rotate: rotate1 }] }]}>
                            <View style={styles.reelCore} />
                        </Animated.View>
                    </View>
                    <View style={styles.reelWindow}>
                        <Animated.View style={[styles.reel, { transform: [{ rotate: rotate2 }] }]}>
                            <View style={styles.reelCore} />
                        </Animated.View>
                    </View>
                </View>

                {/* Status Indicator */}
                {isActive && (
                    <View style={styles.statusIndicator}>
                        <Ionicons name={isPlaying ? "pause" : "play"} size={12} color="#fff" />
                    </View>
                )}
            </View>

            {onFavorite && (
                <TouchableOpacity
                    onPress={(e) => {
                        e.stopPropagation();
                        onFavorite();
                    }}
                    style={styles.favoriteButton}
                >
                    <Ionicons
                        name={isLiked ? "heart" : "heart-outline"}
                        size={18}
                        color={isLiked ? "#ff4d4d" : "rgba(255,255,255,0.4)"}
                    />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    container: {
        width: GRID_ITEM_WIDTH,
        height: GRID_ITEM_WIDTH * 0.7,
        marginBottom: 20,
        borderRadius: 6,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        backgroundColor: '#111',
    },
    activeContainer: {
        borderColor: '#3b82f6',
        borderWidth: 2,
        transform: [{ translateY: -12 }, { scale: 1.08 }],
        elevation: 20,
        shadowOpacity: 0.7,
        shadowRadius: 12,
        zIndex: 100,
    },
    cassetteBody: {
        flex: 1,
        padding: 6,
        justifyContent: 'space-between',
        borderRadius: 6,
        overflow: 'hidden',
    },
    screw: {
        position: 'absolute',
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#444',
    },
    labelArea: {
        height: '50%',
        backgroundColor: '#f5ead2',
        borderRadius: 2,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
    },
    labelContent: {
        flex: 1,
        padding: 4,
        justifyContent: 'center',
        backgroundColor: 'rgba(252, 248, 227, 0.3)',
    },
    labelTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: '#1a1a1a',
        fontFamily: Platform.OS === 'ios' ? 'Helvetica-Bold' : 'sans-serif-condensed',
    },
    labelDivider: {
        height: 1,
        backgroundColor: '#ee7722',
        marginVertical: 2,
    },
    labelArtist: {
        fontSize: 8,
        fontWeight: '600',
        color: '#444',
    },
    reelRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 20,
        alignItems: 'center',
        height: '30%',
    },
    reelWindow: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reel: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#555',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reelCore: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#000',
    },
    statusIndicator: {
        position: 'absolute',
        bottom: 4,
        right: 4,
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#3b82f6',
        justifyContent: 'center',
        alignItems: 'center',
    },
    favoriteButton: {
        position: 'absolute',
        top: 4,
        right: 12,
        zIndex: 10,
    }
});

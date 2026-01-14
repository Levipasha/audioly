import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, useColorScheme, View } from 'react-native';
import { getCassetteColor } from '../utils/colors';

interface CassetteListItemProps {
    title: string;
    subtitle?: string;
    isActive?: boolean;
    isPlaying?: boolean;
    isLiked?: boolean;
    onPress: () => void;
    onFavorite?: () => void;
}


export const CassetteListItem = React.memo(({ title, subtitle, isActive, isPlaying, isLiked, onPress, onFavorite }: CassetteListItemProps) => {
    const isDark = useColorScheme() === 'dark';
    const bodyColor = getCassetteColor(title);

    return (
        <TouchableOpacity
            style={[
                styles.spineContainer,
                isActive && { borderColor: '#3b82f6', borderWidth: 1 }
            ]}
            onPress={onPress}
            activeOpacity={0.7}
        >
            <View style={[styles.spineBody, { backgroundColor: bodyColor }]}>
                <View style={[styles.spineLabel, { backgroundColor: isDark ? '#f5ead2' : '#ffffff' }]}>
                    <Text numberOfLines={1} style={styles.spineText}>
                        {title}
                        {subtitle && <Text style={styles.spineSubtitle}> | {subtitle}</Text>}
                    </Text>
                </View>
                <View style={styles.spineIndicator}>
                    {isActive && isPlaying && <Ionicons name="stats-chart" size={12} color="#22c55e" />}
                </View>

                {onFavorite && (
                    <TouchableOpacity
                        onPress={(e) => {
                            e.stopPropagation();
                            onFavorite();
                        }}
                        style={styles.favoriteButton}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                        <Ionicons
                            name={isLiked ? "heart" : "heart-outline"}
                            size={18}
                            color={isLiked ? "#ff4d4d" : "rgba(255,255,255,0.4)"}
                        />
                    </TouchableOpacity>
                )}
            </View>
        </TouchableOpacity>
    );
});

const styles = StyleSheet.create({
    spineContainer: {
        marginBottom: 4,
        borderRadius: 4,
        overflow: 'hidden',
        height: 44,
        borderWidth: 1,
        borderColor: '#333',
    },
    spineBody: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        justifyContent: 'space-between',
    },
    spineLabel: {
        height: 28,
        flex: 1,
        borderRadius: 2,
        justifyContent: 'center',
        paddingHorizontal: 8,
        marginVertical: 8,
        borderLeftWidth: 4,
        borderLeftColor: '#3b82f6',
    },
    spineText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#000',
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    spineSubtitle: {
        fontSize: 12,
        fontWeight: '400',
        color: '#666',
    },
    spineIndicator: {
        width: 20,
        alignItems: 'flex-end',
    },
    favoriteButton: {
        paddingLeft: 12,
        justifyContent: 'center',
    },
});

import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    PanResponder,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
// import { Image } from 'expo-image';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Event, useTrackPlayerEvents } from 'react-native-track-player';

import { useProgress } from 'react-native-track-player';
import { CassetteGridItem } from '../../components/CassetteGridItem';
import { CassetteModal } from '../../components/CassetteModal';
import { parseArtistTitle, useNowPlaying } from '../../components/now-playing-context';
import { usePlaylist } from '../../components/playlist-context';
import { seekTo } from '../../components/track-player-service';
import { getCachedTracks } from '../../services/local-music-cache';
import { getCassetteColor } from '../../utils/colors';

const { width } = Dimensions.get('window');

type Track = {
    id: string;
    title: string;
    artist?: string;
    audio: { uri: string } | number;
    cover?: { uri: string };
    folder?: string;
    route?: string;
};

const TEST_BUNDLED_TRACK: Track = {
    id: 'bundled-test-track',
    title: 'Test Track (bundled)',
    artist: 'Audioly',
    audio: require('../../assets/videoplayback.m4a'),
    route: '/(tabs)/player',
};

const IMPORTED_KEY = 'localImportedTracks';



export default function PlayerScreen() {
    const router = useRouter();
    const isDark = true; // Always dark mode
    const { nowPlaying, playNext, playPrev, togglePlayPause, queue, setNowPlaying, playTrack, sourceName, sourceHistory, setQueue, setQueueWithPlayer, setSourceName, clearAll } = useNowPlaying();
    const [showSourceDropdown, setShowSourceDropdown] = useState(false);
    const { toggleLike, isLiked } = usePlaylist();

    // Local UI states derived from context
    const isPlaying = nowPlaying?.isPlaying ?? false;
    const currentTrack = nowPlaying;
    const tracks = queue;

    // Debug active track
    useEffect(() => {
        if (currentTrack) {
            console.log(`[Player] Current Track: ${currentTrack.title} | Cover: ${currentTrack.coverUrl ? 'Present' : 'Missing'}`);
        }
    }, [currentTrack?.id, currentTrack?.coverUrl]);

    // These states are still needed for UI progress bar smooth movement
    const [positionMillis, setPositionMillis] = useState(0);
    const [durationMillis, setDurationMillis] = useState(1);
    const [selectedSongForModal, setSelectedSongForModal] = useState<any | null>(null);
    const [loading, setLoading] = useState(false);
    const [cassetteColor, setCassetteColor] = useState('#2b2b2b');
    const [previousTrack, setPreviousTrack] = useState<string | null>(null);
    const [showHiss, setShowHiss] = useState(false);
    const [shuffleEnabled, setShuffleEnabled] = useState(false);
    const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>('off');
    const isSeekingRef = useRef(false);
    const [sliderValue, setSliderValue] = useState(0);
    const progressBarWidth = useRef(0);
    const progressBarX = useRef(0);
    const [isDragging, setIsDragging] = useState(false);
    const [dragPosition, setDragPosition] = useState(0);
    const progressBarRef = useRef<View>(null);
    const flatListRef = useRef<FlatList>(null);

    const { position, duration } = useProgress(250);

    // Store current duration and position in refs so PanResponder can access latest values
    const durationRef = useRef(duration);
    const positionRef = useRef(position);
    const lastDragUpdate = useRef(0);

    useEffect(() => {
        durationRef.current = duration;
        positionRef.current = position;
    }, [duration, position]);

    // PanResponder for smooth dragging
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt: any) => {
                setIsDragging(true);
                isSeekingRef.current = true;
                const touchX = evt.nativeEvent.pageX;
                const barX = progressBarX.current;
                const barWidth = progressBarWidth.current;
                const currentDuration = durationRef.current;

                if (barWidth > 0 && currentDuration > 0) {
                    const relativeX = touchX - barX;
                    const percentage = Math.max(0, Math.min(1, relativeX / barWidth));
                    const newPosition = percentage * currentDuration;
                    setDragPosition(newPosition);
                }
            },
            onPanResponderMove: (evt: any) => {
                const now = Date.now();
                // Throttle to 60fps (16ms) for smooth performance
                if (now - lastDragUpdate.current < 16) return;
                lastDragUpdate.current = now;

                const touchX = evt.nativeEvent.pageX;
                const barX = progressBarX.current;
                const barWidth = progressBarWidth.current;
                const currentDuration = durationRef.current;

                if (barWidth > 0 && currentDuration > 0) {
                    const relativeX = touchX - barX;
                    const percentage = Math.max(0, Math.min(1, relativeX / barWidth));
                    const newPosition = percentage * currentDuration;
                    setDragPosition(newPosition);
                }
            },
            onPanResponderRelease: async (evt: any) => {
                const touchX = evt.nativeEvent.pageX;
                const barX = progressBarX.current;
                const barWidth = progressBarWidth.current;
                const currentDuration = durationRef.current;

                let finalPosition = 0;
                if (barWidth > 0 && currentDuration > 0) {
                    const relativeX = touchX - barX;
                    const percentage = Math.max(0, Math.min(1, relativeX / barWidth));
                    finalPosition = percentage * currentDuration;
                }

                await seekTo(finalPosition);
                setIsDragging(false);
                isSeekingRef.current = false;
            },
            onPanResponderTerminate: () => {
                setIsDragging(false);
                isSeekingRef.current = false;
            },
        })
    ).current;

    // Sync slider with progress
    useEffect(() => {
        if (!isSeekingRef.current) {
            setSliderValue(position * 1000);
        }
    }, [position]);

    // Auto-advance to next track when current track ends
    useEffect(() => {
        // Check if we've reached the end of the track (within 0.5 seconds)
        // Only trigger if NOT dragging and NOT seeking
        if (duration > 0 && position > 0 && (duration - position) < 0.5 && !isSeekingRef.current && !isDragging) {
            console.log('[Player] Track ended, auto-advancing to next song...');
            // Small delay to ensure smooth transition
            const timer = setTimeout(() => {
                void playNext();
            }, 300);
            return () => clearTimeout(timer);
        }
    }, [position, duration, playNext, isDragging]);

    // Also listen for TrackPlayer events as backup
    useTrackPlayerEvents([Event.PlaybackQueueEnded, Event.PlaybackTrackChanged], async (event) => {
        if (event.type === Event.PlaybackQueueEnded) {
            console.log('[Player] Queue ended event received');
            await playNext();
        } else if (event.type === Event.PlaybackTrackChanged) {
            console.log('[Player] Track changed event');
        }
    });

    // Reset progress when track changes
    useEffect(() => {
        setPositionMillis(0);
        setDurationMillis(1);

        // Scroll to the playing track
        if (nowPlaying?.id && flatListRef.current) {
            const filteredQueue = queue.filter(item => item && item.title);
            const index = filteredQueue.findIndex(t => t.id === nowPlaying.id);

            if (index !== -1 && index < filteredQueue.length) {
                // Delay slightly to ensure list is ready
                setTimeout(() => {
                    // Double-check the bounds again before scrolling (queue might have changed)
                    const currentFilteredQueue = queue.filter(item => item && item.title);
                    const currentIndex = currentFilteredQueue.findIndex(t => t.id === nowPlaying.id);

                    if (currentIndex !== -1 && currentIndex < currentFilteredQueue.length && flatListRef.current) {
                        try {
                            flatListRef.current.scrollToIndex({
                                index: currentIndex,
                                animated: true,
                                viewPosition: 0.5 // Center the playing track
                            });
                        } catch (error) {
                            console.log('[Player] ScrollToIndex failed, trying scrollToOffset', error);
                            // Fallback to scrollToOffset if scrollToIndex fails
                            const ITEM_MARGIN = 20;
                            const GRID_ITEM_WIDTH = (width - 60) / 2;
                            const ITEM_HEIGHT = (GRID_ITEM_WIDTH * 0.7) + ITEM_MARGIN;
                            const offset = Math.floor(currentIndex / 2) * ITEM_HEIGHT;
                            flatListRef.current?.scrollToOffset({ offset, animated: true });
                        }
                    }
                }, 500);
            }
        }
    }, [nowPlaying?.id, nowPlaying?.title]);

    // Animation values
    const floatAnim = useRef(new Animated.Value(0)).current;
    const reel1Rotation = useRef(new Animated.Value(0)).current;
    const reel2Rotation = useRef(new Animated.Value(0)).current;
    const cassetteScale = useRef(new Animated.Value(1)).current;
    const cassetteOpacity = useRef(new Animated.Value(1)).current;
    const tapeHissOpacity = useRef(new Animated.Value(0)).current;

    // Floating animation
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(floatAnim, {
                    toValue: 1,
                    duration: 2500,
                    useNativeDriver: true,
                }),
                Animated.timing(floatAnim, {
                    toValue: 0,
                    duration: 2500,
                    useNativeDriver: true,
                }),
            ])
        ).start();
    }, []);

    // Reel rotation
    useEffect(() => {
        if (isPlaying) {
            setShowHiss(true);
            Animated.sequence([
                Animated.timing(tapeHissOpacity, {
                    toValue: 0.2,
                    duration: 400,
                    useNativeDriver: true,
                }),
                Animated.delay(1800),
                Animated.timing(tapeHissOpacity, {
                    toValue: 0,
                    duration: 800,
                    useNativeDriver: true,
                }),
            ]).start(() => setShowHiss(false));

            Animated.loop(
                Animated.parallel([
                    Animated.timing(reel1Rotation, {
                        toValue: 1,
                        duration: 2500,
                        useNativeDriver: true,
                    }),
                    Animated.timing(reel2Rotation, {
                        toValue: 1,
                        duration: 2500,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            Animated.spring(reel1Rotation, {
                toValue: 0,
                friction: 7,
                useNativeDriver: true,
            }).start();
            Animated.spring(reel2Rotation, {
                toValue: 0,
                friction: 7,
                useNativeDriver: true,
            }).start();
        }
    }, [isPlaying]);

    // Color extraction from track info (aligned with Cassette items)
    useEffect(() => {
        setCassetteColor(getCassetteColor(currentTrack?.title || 'default'));
    }, [currentTrack?.title]);

    // Cassette swap animation
    useEffect(() => {
        if (currentTrack?.title && previousTrack && currentTrack.title !== previousTrack) {
            Animated.sequence([
                Animated.parallel([
                    Animated.timing(cassetteScale, {
                        toValue: 1.15,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cassetteOpacity, {
                        toValue: 0,
                        duration: 250,
                        useNativeDriver: true,
                    }),
                ]),
                Animated.parallel([
                    Animated.spring(cassetteScale, {
                        toValue: 1,
                        friction: 6,
                        useNativeDriver: true,
                    }),
                    Animated.timing(cassetteOpacity, {
                        toValue: 1,
                        duration: 350,
                        useNativeDriver: true,
                    }),
                ]),
            ]).start();
        }
        if (currentTrack?.title) {
            setPreviousTrack(currentTrack.title);
        }
    }, [currentTrack?.title]);

    const syncFromMediaLibrary = (showLoading = true) => {
        console.log('Sync requested', showLoading);
    };

    const formatTime = (millis: number) => {
        const totalSeconds = Math.floor(millis / 1000);
        const minutes = Math.floor(totalSeconds / 60);
        const seconds = totalSeconds % 60;
        return `${minutes}:${seconds.toString().padStart(2, '0')} `;
    };

    // Load local tracks for the tracklist UI
    const [localTracks, setLocalTracks] = useState<Track[]>([]);
    useEffect(() => {
        void (async () => {
            const cached = await getCachedTracks();
            if (cached) setLocalTracks(cached);
        })();
    }, []);

    const playLocalTrack = async (track: Track) => {
        const queueItem = {
            id: track.id,
            title: track.title,
            subtitle: track.artist,
            audio: track.audio,
            route: '/(tabs)/player',
            coverUrl: track.cover?.uri || (track as any).coverUrl // Handle both formats
        };
        await playTrack(queueItem);
    };

    const renderItem = ({ item, index }: { item: any; index: number }) => {
        if (!item || !item.title) return null;
        const isActive = nowPlaying?.id === item.id;

        const metadata = parseArtistTitle(item.title, item.subtitle || 'Local Music');

        return (
            <CassetteGridItem
                title={metadata.title}
                subtitle={metadata.artist}
                coverUrl={item.coverUrl}
                isActive={isActive}
                isPlaying={isPlaying && isActive}
                onPress={() => setSelectedSongForModal({ ...item, title: metadata.title, subtitle: metadata.artist })}
            />
        );
    };

    const floatInterpolate = floatAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, -8],
    });

    const reel1RotationInterpolate = reel1Rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    const reel2RotationInterpolate = reel2Rotation.interpolate({
        inputRange: [0, 1],
        outputRange: ['0deg', '360deg'],
    });

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#3b82f6" />
                <Text style={{ color: '#9ca3af', marginTop: 12 }}>Loading music...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#0a0a0a' : '#f9fafb' }]}>
            {/* Sticky Player Section */}
            <View style={{ backgroundColor: isDark ? '#0a0a0a' : '#f9fafb', zIndex: 10 }}>
                {/* Header */}
                <View style={[styles.headerRow, { borderBottomColor: isDark ? '#1f2937' : '#e5e7eb' }]}>
                    <Text style={[styles.header, { color: isDark ? '#ffffff' : '#111827' }]}>Player</Text>
                    <TouchableOpacity onPress={() => void syncFromMediaLibrary(true)}>
                        <Ionicons name="sync" size={22} color="#9ca3af" />
                    </TouchableOpacity>
                </View>



                {/* Cassette Player */}
                <Animated.View
                    style={[
                        styles.cassetteContainer,
                        {
                            transform: [
                                { translateY: floatInterpolate },
                                { scale: cassetteScale },
                            ],
                            opacity: cassetteOpacity,
                        },
                    ]}
                >
                    <Animated.View
                        style={[
                            styles.cassetteShadow,
                            {
                                transform: [{
                                    scale: floatAnim.interpolate({
                                        inputRange: [0, 1],
                                        outputRange: [1, 0.85],
                                    })
                                }],
                                opacity: floatAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: [0.3, 0.15],
                                }),
                            },
                        ]}
                    />

                    <View style={[styles.cassetteBody, { backgroundColor: cassetteColor }]}>
                        <View style={styles.ribbedTexture}>
                            {[...Array(30)].map((_, i) => (
                                <View key={i} style={styles.ribbedLine} />
                            ))}
                        </View>

                        {showHiss && (
                            <Animated.View style={[styles.tapeHiss, { opacity: tapeHissOpacity }]} />
                        )}

                        <TouchableOpacity
                            style={styles.favoriteButton}
                            onPress={() => {
                                if (currentTrack) {
                                    toggleLike({
                                        id: currentTrack.id!,
                                        title: currentTrack.title,
                                        subtitle: currentTrack.subtitle,
                                        audioUrl: currentTrack.audio?.uri || currentTrack.audio,
                                        coverUrl: currentTrack.coverUrl,
                                        addedAt: Date.now()
                                    });
                                }
                            }}
                        >
                            <Ionicons
                                name={currentTrack?.id && isLiked(currentTrack.id) ? "heart" : "heart-outline"}
                                size={22}
                                color={currentTrack?.id && isLiked(currentTrack.id) ? "#ef4444" : "#ffffff"}
                            />
                        </TouchableOpacity>

                        <View style={[styles.screw, styles.screwTopLeft]}>
                            <View style={styles.screwSlot} />
                        </View>
                        <View style={[styles.screw, styles.screwTopRight]}>
                            <View style={styles.screwSlot} />
                        </View>
                        <View style={[styles.screw, styles.screwBottomLeft]}>
                            <View style={styles.screwSlot} />
                        </View>
                        <View style={[styles.screw, styles.screwBottomRight]}>
                            <View style={styles.screwSlot} />
                        </View>


                        <View style={styles.labelSection}>
                            <View style={styles.labelArea}>
                                {currentTrack?.coverUrl ? (
                                    <Image
                                        key={typeof currentTrack.coverUrl === 'string' ? currentTrack.coverUrl : 'cover-obj'}
                                        source={typeof currentTrack.coverUrl === 'string' ? { uri: currentTrack.coverUrl } : currentTrack.coverUrl}
                                        style={[StyleSheet.absoluteFill, { opacity: 1, borderRadius: 2 }]}
                                        resizeMode="cover"
                                        onError={() => console.log(`[Player] Image Load Error for ${currentTrack.title}`)}
                                    />
                                ) : (
                                    <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(59, 130, 246, 0.1)', justifyContent: 'center', alignItems: 'center' }]}>
                                        <Ionicons name="musical-notes" size={24} color="rgba(0,0,0,0.2)" />
                                    </View>
                                )}
                                <View style={{ position: 'relative', zIndex: 1 }}>
                                    <Text numberOfLines={1} style={styles.labelTitle}>
                                        {currentTrack?.title || 'NO TAPE LOADED'}
                                    </Text>
                                    <View style={styles.labelLine} />
                                    <Text numberOfLines={1} style={styles.labelArtist}>
                                        {currentTrack?.subtitle || '---'}
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.stripeContainer}>
                                <View style={styles.orangeStripe} />
                                <View style={styles.whiteStripe} />
                                <View style={styles.orangeStripe} />
                            </View>
                        </View>

                        <View style={styles.reelHousing}>
                            <View style={styles.reelWindowLeft}>
                                <Animated.View
                                    style={[
                                        styles.reel,
                                        { transform: [{ rotate: reel1RotationInterpolate }] },
                                    ]}
                                >
                                    <View style={styles.reelCore} />
                                    {[...Array(6)].map((_, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.reelSpoke,
                                                { transform: [{ rotate: `${i * 60} deg` }] },
                                            ]}
                                        />
                                    ))}
                                </Animated.View>
                            </View>

                            <View style={styles.tapeStrip} />

                            <View style={styles.reelWindowRight}>
                                <Animated.View
                                    style={[
                                        styles.reel,
                                        { transform: [{ rotate: reel2RotationInterpolate }] },
                                    ]}
                                >
                                    <View style={styles.reelCore} />
                                    {[...Array(6)].map((_, i) => (
                                        <View
                                            key={i}
                                            style={[
                                                styles.reelSpoke,
                                                { transform: [{ rotate: `${i * 60} deg` }] },
                                            ]}
                                        />
                                    ))}
                                </Animated.View>
                            </View>
                        </View>

                        <View style={styles.bottomSection}>
                            <View style={styles.tapeHole} />
                            <View style={[styles.screw, styles.screwCenter]}>
                                <View style={styles.screwSlot} />
                            </View>
                            <View style={styles.tapeHole} />
                        </View>
                    </View>
                </Animated.View>


                {/* Unified Controls Center */}
                <View style={styles.miniControls}>
                    {/* Progress bar inside controls */}
                    {currentTrack && (
                        <View style={styles.miniProgressContainer} pointerEvents="box-none">
                            <Text style={styles.miniTimeText}>{formatTime((isDragging ? dragPosition : position) * 1000)}</Text>

                            {/* Custom draggable progress bar */}
                            <View
                                ref={progressBarRef}
                                {...panResponder.panHandlers}
                                style={{ flex: 1, justifyContent: 'center', paddingVertical: 10 }}
                                onLayout={(e) => {
                                    progressBarWidth.current = e.nativeEvent.layout.width;
                                    // Measure absolute position on screen
                                    progressBarRef.current?.measureInWindow((x, y, width, height) => {
                                        progressBarX.current = x;
                                        progressBarWidth.current = width;
                                    });
                                }}
                            >
                                {/* Progress bar track */}
                                <View style={{
                                    height: 8,
                                    backgroundColor: '#d1d5db',
                                    borderRadius: 4,
                                    overflow: 'hidden'
                                }}>
                                    {/* Filled portion */}
                                    <View style={{
                                        height: '100%',
                                        width: `${duration > 0 ? ((isDragging ? dragPosition : position) / duration) * 100 : 0}%`,
                                        backgroundColor: '#3b82f6',
                                        borderRadius: 4
                                    }} />
                                </View>
                                {/* Thumb - follows finger when dragging */}
                                <View style={{
                                    position: 'absolute',
                                    left: `${duration > 0 ? ((isDragging ? dragPosition : position) / duration) * 100 : 0}%`,
                                    width: isDragging ? 24 : 20,
                                    height: isDragging ? 24 : 20,
                                    borderRadius: isDragging ? 12 : 10,
                                    backgroundColor: '#3b82f6',
                                    marginLeft: isDragging ? -12 : -10,
                                    borderWidth: 3,
                                    borderColor: '#fff',
                                    shadowColor: '#000',
                                    shadowOffset: { width: 0, height: 2 },
                                    shadowOpacity: isDragging ? 0.5 : 0.3,
                                    shadowRadius: isDragging ? 5 : 3,
                                    elevation: isDragging ? 6 : 4
                                }} />
                            </View>

                            <Text style={styles.miniTimeText}>{formatTime(duration * 1000)}</Text>
                        </View>
                    )}

                    <View style={styles.miniButtonsRow}>
                        <TouchableOpacity
                            style={styles.miniButton}
                            onPress={() => setShuffleEnabled(!shuffleEnabled)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="shuffle"
                                size={22}
                                color={shuffleEnabled ? '#000' : '#666'}
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.miniButton}
                            onPress={() => void playPrev()}
                            hitSlop={15}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="play-back-sharp" size={30} color="#1a1a1a" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.miniPlayButton, !currentTrack && { opacity: 0.3 }]}
                            onPress={() => void togglePlayPause()}
                            disabled={!currentTrack}
                            hitSlop={15}
                            activeOpacity={0.8}
                        >
                            <Ionicons
                                name={isPlaying ? 'pause' : 'play'}
                                size={34}
                                color="#fff"
                            />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.miniButton}
                            onPress={() => void playNext()}
                            hitSlop={15}
                            activeOpacity={0.7}
                        >
                            <Ionicons name="play-forward-sharp" size={30} color="#1a1a1a" />
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.miniButton}
                            onPress={() => {
                                if (repeatMode === 'off') setRepeatMode('all');
                                else if (repeatMode === 'all') setRepeatMode('one');
                                else setRepeatMode('off');
                            }}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name="repeat"
                                size={22}
                                color={repeatMode !== 'off' ? '#000' : '#666'}
                            />
                            {repeatMode === 'one' && (
                                <View style={styles.repeatOneBadge}>
                                    <Text style={styles.repeatOneBadgeText}>1</Text>
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Source Selection replacing Up Next */}
                <TouchableOpacity
                    style={[styles.trackListToggle, { marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}
                    onPress={() => setShowSourceDropdown(!showSourceDropdown)}
                >
                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                        <Ionicons name="folder-open" size={18} color="#3b82f6" style={{ marginRight: 10 }} />
                        <Text style={styles.trackListToggleText}>
                            {sourceName}
                        </Text>
                    </View>
                    <Ionicons name={showSourceDropdown ? "chevron-up" : "chevron-down"} size={20} color="#6b7280" />
                </TouchableOpacity>

                {showSourceDropdown && (
                    <View style={[styles.dropdownContainer, {
                        position: 'absolute',
                        top: '100%', // Positioned directly below the source selector
                        left: 20,
                        right: 20,
                        zIndex: 9999,
                        elevation: 10,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.5,
                        shadowRadius: 10,
                    }]}>
                        <Text style={styles.dropdownHeader}>Recent Sources</Text>
                        {sourceHistory.length === 0 ? (
                            <Text style={styles.emptyDropdown}>No recent folders</Text>
                        ) : (
                            sourceHistory.map((source, idx) => (
                                <TouchableOpacity
                                    key={`${source} -${idx} `}
                                    style={styles.dropdownItem}
                                    onPress={async () => {
                                        setShowSourceDropdown(false);
                                        // Handle switching source
                                        // Always fetch latest from cache to ensure we have the most recent scan
                                        const cached = await getCachedTracks();
                                        let tracksToFilter = cached || localTracks;

                                        if (source.toLowerCase().startsWith('folder:')) {
                                            const folderName = source.replace(/^folder:\s*/i, '').trim();

                                            const normalizeFolder = (str: string) => str.replace(/\s\([^)]+\)/g, '').toLowerCase().trim();
                                            const targetNorm = normalizeFolder(folderName);

                                            let filtered = tracksToFilter.filter(t => {
                                                if (!t.folder) return false;
                                                const tf = t.folder.trim().toLowerCase();
                                                const target = folderName.toLowerCase();
                                                // Try exact or path-end match first
                                                return tf === target || tf.endsWith('/' + target) || tf.endsWith('\\' + target);
                                            });

                                            // If no exact match, try fuzzy matching (ignoring parentheses/years)
                                            if (filtered.length === 0) {
                                                filtered = tracksToFilter.filter(t => {
                                                    if (!t.folder) return false;
                                                    return normalizeFolder(t.folder) === targetNorm;
                                                });
                                                if (filtered.length > 0) {
                                                    console.log(`[Player] Fuzzy match find: "${targetNorm}" matched ${filtered.length} tracks`);
                                                }
                                            }

                                            // De-duplicate filtered results
                                            const seen = new Set();
                                            const uniqueFiltered = filtered.filter(t => {
                                                const key = t.id || (t.audio as any)?.uri || t.audio;
                                                if (!key || seen.has(key)) return false;
                                                seen.add(key);
                                                return true;
                                            });

                                            console.log(`[Player] Switch to Folder: "${folderName}", library: ${tracksToFilter.length}, unique matches: ${uniqueFiltered.length}`);

                                            if (uniqueFiltered.length === 0 && tracksToFilter.length > 0) {
                                                const sample = [...new Set(tracksToFilter.map(t => t.folder).filter(Boolean))].slice(0, 5);
                                                console.log(`[Player] No match for "${folderName}". Sample folders in library: ${sample.join(', ')}`);
                                            }
                                            if (uniqueFiltered.length > 0) {
                                                const newQueue = uniqueFiltered.map(t => {
                                                    const metadata = parseArtistTitle(t.title, t.artist || 'Local Music');
                                                    return {
                                                        id: t.id,
                                                        title: metadata.title,
                                                        subtitle: metadata.artist,
                                                        audio: (t.audio as any)?.uri || t.audio,
                                                        coverUrl: (t.cover as any)?.uri || t.cover,
                                                        route: '/(tabs)/player'
                                                    };
                                                });
                                                await setQueueWithPlayer(newQueue);
                                                setSourceName(source);
                                                // Automatically play the first song in the selected folder
                                                await playTrack(newQueue[0]);
                                            }
                                        } else if (source.startsWith('Album:')) {
                                            const artistName = source.replace('Album: ', '').trim();
                                            const filtered = tracksToFilter.filter(t =>
                                                t.artist && t.artist.trim().toLowerCase() === artistName.toLowerCase()
                                            );

                                            // De-duplicate filtered results
                                            const seen = new Set();
                                            const uniqueFiltered = filtered.filter(t => {
                                                const key = t.id || (t.audio as any)?.uri || t.audio;
                                                if (!key || seen.has(key)) return false;
                                                seen.add(key);
                                                return true;
                                            });

                                            console.log(`[Player] Switch to Album: "${artistName}", found ${uniqueFiltered.length} tracks`);
                                            if (uniqueFiltered.length > 0) {
                                                const newQueue = uniqueFiltered.map(t => {
                                                    const metadata = parseArtistTitle(t.title, t.artist || 'Local Music');
                                                    return {
                                                        id: t.id,
                                                        title: metadata.title,
                                                        subtitle: metadata.artist,
                                                        audio: (t.audio as any)?.uri || t.audio,
                                                        coverUrl: (t.cover as any)?.uri || t.cover,
                                                        route: '/(tabs)/player'
                                                    };
                                                });
                                                await setQueueWithPlayer(newQueue);
                                                setSourceName(source);
                                                await playTrack(newQueue[0]);
                                            }
                                        } else if (source === 'Local Library' || source.startsWith('Local Library')) {
                                            // De-duplicate entire library
                                            const seen = new Set();
                                            const uniqueTracks = tracksToFilter.filter(t => {
                                                const key = t.id || (t.audio as any)?.uri || t.audio;
                                                if (!key || seen.has(key)) return false;
                                                seen.add(key);
                                                return true;
                                            });

                                            console.log(`[Player] Switch to Local Library, found ${uniqueTracks.length} unique tracks`);
                                            const newQueue = uniqueTracks.map(t => {
                                                const metadata = parseArtistTitle(t.title, t.artist || 'Local Music');
                                                return {
                                                    id: t.id,
                                                    title: metadata.title,
                                                    subtitle: metadata.artist,
                                                    audio: (t.audio as any)?.uri || t.audio,
                                                    coverUrl: (t.cover as any)?.uri || t.cover,
                                                    route: '/(tabs)/player'
                                                };
                                            });
                                            await setQueueWithPlayer(newQueue);
                                            setSourceName(source);
                                            await playTrack(newQueue[0]);
                                        }
                                    }}
                                >
                                    <Ionicons name="time-outline" size={16} color="#4b5563" style={{ marginRight: 10 }} />
                                    <Text style={styles.dropdownItemText}>{source}</Text>
                                </TouchableOpacity>
                            ))
                        )}
                        <TouchableOpacity
                            style={[styles.clearButton, { marginTop: 12 }]}
                            onPress={() => {
                                void clearAll();
                                setShowSourceDropdown(false);
                            }}
                        >
                            <Ionicons name="trash-outline" size={16} color="#ef4444" style={{ marginRight: 8 }} />
                            <Text style={styles.clearButtonText}>Clear Player</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>

            <FlatList
                ref={flatListRef}
                key={`player-grid-${2}`}
                numColumns={2}
                columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
                data={queue.filter(item => item && item.title)}
                renderItem={renderItem}
                extraData={nowPlaying}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                contentContainerStyle={[styles.listContent, { paddingTop: 30 }]}
                initialNumToRender={20}
                maxToRenderPerBatch={20}
                windowSize={7}
                removeClippedSubviews={true}
                onScrollToIndexFailed={(info) => {
                    console.log('[Player] Scroll to index failed:', info.index);
                    flatListRef.current?.scrollToOffset({
                        offset: info.averageItemLength * (info.index / 2),
                        animated: true
                    });
                }}
                getItemLayout={(data, index) => {
                    const ITEM_MARGIN = 20;
                    const GRID_ITEM_WIDTH = (width - 60) / 2;
                    const ITEM_HEIGHT = (GRID_ITEM_WIDTH * 0.7) + ITEM_MARGIN;
                    return {
                        length: ITEM_HEIGHT,
                        offset: Math.floor(index / 2) * ITEM_HEIGHT + 30, // 30 is paddingTop
                        index,
                    };
                }}
            />
            <CassetteModal
                isVisible={!!selectedSongForModal}
                song={selectedSongForModal}
                onClose={() => setSelectedSongForModal(null)}
                onPlay={() => {
                    if (selectedSongForModal) {
                        void playTrack(selectedSongForModal);
                    }
                    setSelectedSongForModal(null);
                }}
            />
        </SafeAreaView >
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
    },
    header: {
        fontSize: 24,
        fontWeight: '700',
        color: '#ffffff',
    },
    sourceSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2,
        marginTop: 2,
    },
    sourceText: {
        fontSize: 13,
        color: '#3b82f6',
        fontWeight: '600',
    },
    dropdownContainer: {
        backgroundColor: '#111',
        marginHorizontal: 16,
        marginTop: -8,
        marginBottom: 16,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: '#1f2937',
        zIndex: 100,
    },
    dropdownHeader: {
        fontSize: 12,
        color: '#6b7280',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    emptyDropdown: {
        color: '#4b5563',
        fontSize: 13,
        paddingVertical: 8,
        textAlign: 'center',
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        borderBottomWidth: 0.5,
        borderBottomColor: '#1f2937',
    },
    dropdownItemText: {
        color: '#e5e7eb',
        fontSize: 14,
        fontWeight: '500',
    },
    clearButton: {
        marginTop: 10,
        backgroundColor: '#1a1a1a',
        borderRadius: 8,
        paddingVertical: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#2d1a1a',
    },
    clearButtonText: {
        color: '#ef4444',
        fontSize: 14,
        fontWeight: '600',
    },
    cassetteContainer: {
        width: width * 0.85,
        aspectRatio: 1.58,
        marginHorizontal: width * 0.075,
        marginTop: 20,
        marginBottom: 30,
    },
    cassetteShadow: {
        position: 'absolute',
        bottom: -20,
        left: '10%',
        right: '10%',
        height: 15,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        borderRadius: 100,
    },
    cassetteBody: {
        flex: 1,
        borderRadius: 6,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.6,
        shadowRadius: 16,
        elevation: 20,
        borderWidth: 1.5,
        borderColor: '#000',
    },
    ribbedTexture: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        flexDirection: 'row',
        opacity: 0.12,
    },
    ribbedLine: {
        flex: 1,
        backgroundColor: '#000',
        marginHorizontal: 0.5,
    },
    tapeHiss: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#fff',
    },
    screw: {
        position: 'absolute',
        width: 14,
        height: 14,
        borderRadius: 7,
        backgroundColor: 'silver',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.3,
        shadowRadius: 2,
    },
    screwSlot: {
        width: 7,
        height: 1.2,
        backgroundColor: '#333',
    },
    screwTopLeft: { top: 6, left: 6 },
    screwTopRight: { top: 6, right: 6 },
    screwBottomLeft: { bottom: 6, left: 6 },
    screwBottomRight: { bottom: 6, right: 6 },
    screwCenter: { bottom: 8 },
    favoriteButton: {
        position: 'absolute',
        top: 10,
        left: 35,
        zIndex: 10,
        padding: 5,
    },
    labelSection: {
        marginTop: 20,
        marginHorizontal: 12,
    },
    labelArea: {
        backgroundColor: '#f5ead2',
        borderRadius: 3,
        padding: 10,
        paddingVertical: 12,
        overflow: 'hidden', // Ensure cover image stays within bounds
        height: 100, // Even taller for better artwork presence
        justifyContent: 'center',
    },
    labelAreaEmpty: {
        backgroundColor: '#f5ead2',
        borderRadius: 3,
        padding: 10,
        paddingVertical: 20,
        borderWidth: 1,
        borderColor: '#d4c5a1',
    },
    labelTitle: {
        fontSize: 11,
        fontWeight: '700',
        color: '#1a1a1a',
        fontFamily: 'monospace',
        letterSpacing: 0.8,
        marginBottom: 5,
    },
    labelLine: {
        height: 0.7,
        backgroundColor: '#2a2a2a',
        marginVertical: 5,
    },
    labelArtist: {
        fontSize: 9,
        color: '#444',
        fontFamily: 'monospace',
        letterSpacing: 0.4,
    },
    stripeContainer: {
        marginTop: 5,
        height: 20,
    },
    orangeStripe: {
        height: 7,
        backgroundColor: '#e87d5c',
        marginVertical: 0.8,
    },
    whiteStripe: {
        height: 3,
        backgroundColor: '#f5ead2',
    },
    reelHousing: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginTop: 10,
        flex: 1,
    },
    reelWindowLeft: {
        width: 65,
        height: 65,
        borderRadius: 33,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#1a1a1a',
    },
    reelWindowRight: {
        width: 65,
        height: 65,
        borderRadius: 33,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2.5,
        borderColor: '#1a1a1a',
    },
    reel: {
        width: 52,
        height: 52,
        borderRadius: 26,
        backgroundColor: '#1a1a1a',
        justifyContent: 'center',
        alignItems: 'center',
    },
    reelCore: {
        width: 17,
        height: 17,
        borderRadius: 9,
        backgroundColor: '#444',
        position: 'absolute',
    },
    reelSpoke: {
        position: 'absolute',
        width: 1.8,
        height: 21,
        backgroundColor: '#333',
    },
    tapeStrip: {
        width: 30,
        height: 3.5,
        backgroundColor: '#6b4423',
        borderRadius: 1,
    },
    bottomSection: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 35,
        paddingBottom: 10,
    },
    tapeHole: {
        width: 7,
        height: 7,
        borderRadius: 4,
        backgroundColor: '#000',
        borderWidth: 1,
        borderColor: '#333',
    },
    miniControls: {
        paddingHorizontal: 22,
        paddingVertical: 20,
        backgroundColor: '#f3f4f6',
        marginHorizontal: 20,
        borderRadius: 24,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.12,
        shadowRadius: 10,
        elevation: 6,
    },
    miniProgressContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 18,
    },
    slider: {
        flex: 1,
        height: 40,
        marginHorizontal: 0,
    },
    miniTimeText: {
        fontSize: 11,
        color: '#4b5563',
        fontFamily: 'monospace',
        fontWeight: '600',
        minWidth: 38,
    },
    miniButtonsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    miniButton: {
        padding: 6,
    },
    miniPlayButton: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    repeatOneBadge: {
        position: 'absolute',
        top: -2,
        right: -2,
        backgroundColor: '#000',
        borderRadius: 8,
        width: 14,
        height: 14,
        justifyContent: 'center',
        alignItems: 'center',
    },
    repeatOneBadgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: '700',
    },
    controls: {
        flexDirection: 'row',
        gap: 22,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    controlButton: {
        width: 70,
        height: 70,
        borderRadius: 35,
        backgroundColor: '#1f2937',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
        elevation: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#374151',
    },
    trackListToggle: {
        paddingHorizontal: 20,
        paddingVertical: 14,
        backgroundColor: '#111',
        marginHorizontal: 20,
        borderRadius: 8,
        marginBottom: 12,
        marginTop: 20,
    },
    trackListToggleText: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#ffffff',
        letterSpacing: 0.5,
    },
    folderHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        backgroundColor: '#111',
    },
    folderHeaderText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#e5e7eb',
    },
    folderCount: {
        fontSize: 12,
        color: '#6b7280',
    },
    trackItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    trackItemActive: {
        backgroundColor: '#1a1f2e',
    },
    coverSmall: {
        width: 48,
        height: 48,
        borderRadius: 4,
        marginRight: 12,
    },
    trackTextContainer: {
        flex: 1,
    },
    trackTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#e5e7eb',
        marginBottom: 2,
    },
    trackSubtitle: {
        fontSize: 12,
        color: '#9ca3af',
    },
    listContent: {
        paddingBottom: 100,
    },
});

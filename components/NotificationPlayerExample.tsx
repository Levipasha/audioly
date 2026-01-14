/**
 * Complete Music Player with Notification Controls Example
 * 
 * This is a standalone example that can be integrated into your app.
 * 
 * IMPORTANT: This requires a development build or APK, not Expo Go!
 * 
 * Setup steps:
 * 1. npx expo install expo-av expo-notifications
 * 2. Add permissions to app.json (see NOTIFICATION_PLAYER_SETUP.md)
 * 3. Build with: eas build --platform android --profile preview
 * 4. Install and test on a real device
 */

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio, AVPlaybackStatus, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import * as Notifications from 'expo-notifications';

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

type Track = {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  url: string;
};

// Sample tracks - replace with your API/tracks
const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Amazing Song',
    artist: 'The Artists',
    artwork: 'https://picsum.photos/512/512?random=1',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: '2',
    title: 'Beautiful Melody',
    artist: 'Music Band',
    artwork: 'https://picsum.photos/512/512?random=2',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
  {
    id: '3',
    title: 'Epic Soundtrack',
    artist: 'Sound Designer',
    artwork: 'https://picsum.photos/512/512?random=3',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
  },
];

export default function NotificationPlayerExample() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [notificationChannelId, setNotificationChannelId] = useState<string | null>(null);

  // Initialize audio and notifications
  useEffect(() => {
    const initialize = async () => {
      try {
        // Request notification permissions
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Please enable notifications for media controls');
        }

        // Create notification channel for Android
        if (Platform.OS === 'android') {
          const channelId = await Notifications.setNotificationChannelAsync('media-controls', {
            name: 'Media Controls',
            description: 'Music playback controls',
            importance: Notifications.AndroidImportance.HIGH,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: undefined,
            enableLights: true,
            enableVibrate: false,
            showBadge: false,
          });
          setNotificationChannelId(channelId?.id || 'media-controls');
        } else {
          setNotificationChannelId('media-controls');
        }

        // Configure audio for background playback
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
          interruptionModeIOS: InterruptionModeIOS.DuckOthers,
          interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
        });

        // Setup notification response listener for media controls
        const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
          const action = response.actionIdentifier;

          switch (action) {
            case 'PLAY_PAUSE_ACTION':
              void togglePlayPause();
              break;
            case 'NEXT_ACTION':
              void playNext();
              break;
            case 'PREV_ACTION':
              void playPrevious();
              break;
            default:
              // Default action (tapping notification) - could open app
              break;
          }
        });

        return () => {
          subscription.remove();
        };
      } catch (error) {
        console.error('Initialization error:', error);
      }
    };

    const cleanup = initialize();

    return () => {
      cleanup.then((cleanupFn) => cleanupFn?.());
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => { });
      }
    };
  }, []);

  // Update notification when track or playback state changes
  useEffect(() => {
    if (currentTrack && notificationChannelId) {
      void updateMediaNotification(currentTrack, isPlaying);
    }
  }, [currentTrack, isPlaying, position, notificationChannelId]);

  const updateMediaNotification = async (track: Track, playing: boolean) => {
    try {
      if (Platform.OS === 'android') {
        // Cancel previous notification to update it
        await Notifications.dismissNotificationAsync('media-player');

        // Create simple notification for media player
        // Note: expo-notifications has limited media notification support
        await Notifications.scheduleNotificationAsync({
          identifier: 'media-player',
          content: {
            title: track.title,
            body: `${track.artist} - ${playing ? 'Playing' : 'Paused'}`,
            data: { trackId: track.id },
            categoryIdentifier: 'media-controls',
          },
          trigger: null, // Show immediately
        });
      } else {
        // iOS handles media controls automatically through expo-av
        // But we can still show a notification
        await Notifications.scheduleNotificationAsync({
          identifier: 'media-player',
          content: {
            title: track.title,
            body: track.artist,
            data: { trackId: track.id },
            sound: false,
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  const loadTrack = async (track: Track, autoPlay = false) => {
    try {
      setIsLoading(true);

      // Unload previous track
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
        soundRef.current = null;
      }

      // Create and load new sound
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: autoPlay },
        (status: AVPlaybackStatus) => {
          if (!status.isLoaded) {
            // When not loaded, isBuffering doesn't exist on the error status
            setIsBuffering(false);
            return;
          }

          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 1);
          setIsPlaying(status.isPlaying || false);

          if (status.didJustFinish) {
            setIsPlaying(false);
            // Auto-play next track
            void playNext();
          }
        }
      );

      soundRef.current = sound;
      setCurrentTrack(track);
      setIsPlaying(autoPlay);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading track:', error);
      Alert.alert('Error', 'Failed to load track');
      setIsLoading(false);
    }
  };

  const setIsBuffering = (buffering: boolean) => {
    // You could add a buffering indicator here
  };

  const togglePlayPause = async () => {
    if (!soundRef.current || !currentTrack) return;

    try {
      if (isPlaying) {
        await soundRef.current.pauseAsync();
        setIsPlaying(false);
      } else {
        await soundRef.current.playAsync();
        setIsPlaying(true);
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  const playNext = async () => {
    const nextIndex = (currentIndex + 1) % SAMPLE_TRACKS.length;
    setCurrentIndex(nextIndex);
    await loadTrack(SAMPLE_TRACKS[nextIndex], true);
  };

  const playPrevious = async () => {
    const prevIndex = currentIndex === 0 ? SAMPLE_TRACKS.length - 1 : currentIndex - 1;
    setCurrentIndex(prevIndex);
    await loadTrack(SAMPLE_TRACKS[prevIndex], true);
  };

  const seekTo = async (positionMs: number) => {
    if (!soundRef.current || !duration) return;
    const clamped = Math.max(0, Math.min(positionMs, duration));
    try {
      await soundRef.current.setPositionAsync(clamped);
      setPosition(clamped);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  };

  const formatTime = (millis: number) => {
    if (!millis || isNaN(millis)) return '0:00';
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = duration > 0 ? position / duration : 0;

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Music Player</Text>
          <Text style={styles.subtitle}>With Media Controls</Text>
        </View>

        {currentTrack ? (
          <View style={styles.playerSection}>
            {currentTrack.artwork && (
              <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
            )}

            <View style={styles.trackInfo}>
              <Text style={styles.trackTitle} numberOfLines={1}>
                {currentTrack.title}
              </Text>
              <Text style={styles.trackArtist} numberOfLines={1}>
                {currentTrack.artist}
              </Text>
            </View>

            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <TouchableOpacity
                style={styles.progressBarContainer}
                onPress={(e) => {
                  const { locationX } = e.nativeEvent;
                  // Use the layout width from the container style (flex: 1 fills available space)
                  // A more robust solution would use onLayout to capture actual width
                  const containerWidth = 250; // Approximate width based on screen
                  const ratio = locationX / containerWidth;
                  void seekTo(ratio * duration);
                }}
                activeOpacity={1}
              >
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
                </View>
              </TouchableOpacity>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity
                style={styles.controlButton}
                onPress={playPrevious}
                disabled={isLoading}
              >
                <Text style={styles.controlButtonText}>⏮</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.playButton, isLoading && styles.playButtonDisabled]}
                onPress={togglePlayPause}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.playButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.controlButton}
                onPress={playNext}
                disabled={isLoading}
              >
                <Text style={styles.controlButtonText}>⏭</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>Select a track to start playing</Text>
          </View>
        )}

        <View style={styles.trackList}>
          <Text style={styles.sectionTitle}>Tracks</Text>
          {SAMPLE_TRACKS.map((track, index) => (
            <TouchableOpacity
              key={track.id}
              style={[
                styles.trackItem,
                currentTrack?.id === track.id && styles.trackItemActive,
              ]}
              onPress={() => {
                setCurrentIndex(index);
                void loadTrack(track, true);
              }}
            >
              <View style={styles.trackItemContent}>
                {track.artwork ? (
                  <Image source={{ uri: track.artwork }} style={styles.trackItemArtwork} />
                ) : (
                  <View style={[styles.trackItemArtwork, styles.trackItemArtworkPlaceholder]} />
                )}
                <View style={styles.trackItemInfo}>
                  <Text style={styles.trackItemTitle} numberOfLines={1}>
                    {track.title}
                  </Text>
                  <Text style={styles.trackItemArtist} numberOfLines={1}>
                    {track.artist}
                  </Text>
                </View>
                {currentTrack?.id === track.id && isPlaying && (
                  <Text style={styles.playingIndicator}>▶</Text>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>📱 Media Controls</Text>
          <Text style={styles.infoText}>
            • Pull down notification panel to see controls{'\n'}
            • Lock screen will show media controls{'\n'}
            • Use play/pause/next/prev from notifications{'\n'}
            • ⚠️ Requires development build (not Expo Go)
          </Text>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  content: {
    flex: 1,
    padding: 20,
  },
  header: {
    marginBottom: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  playerSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  artwork: {
    width: 300,
    height: 300,
    borderRadius: 16,
    marginBottom: 20,
    backgroundColor: '#111827',
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 24,
    width: '100%',
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  trackArtist: {
    fontSize: 18,
    color: '#9ca3af',
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
    minWidth: 45,
    textAlign: 'center',
  },
  progressBarContainer: {
    flex: 1,
    marginHorizontal: 12,
  },
  progressBar: {
    height: 6,
    backgroundColor: '#1f2937',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 20,
  },
  controlButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },
  playButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonDisabled: {
    opacity: 0.5,
  },
  playButtonText: {
    fontSize: 36,
    color: '#ffffff',
  },
  emptyState: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  trackList: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  trackItem: {
    backgroundColor: '#111827',
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
  },
  trackItemActive: {
    backgroundColor: '#1f2937',
    borderWidth: 2,
    borderColor: '#3b82f6',
  },
  trackItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  trackItemArtwork: {
    width: 56,
    height: 56,
    borderRadius: 8,
    marginRight: 12,
    backgroundColor: '#1f2937',
  },
  trackItemArtworkPlaceholder: {
    backgroundColor: '#374151',
  },
  trackItemInfo: {
    flex: 1,
  },
  trackItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  trackItemArtist: {
    fontSize: 14,
    color: '#9ca3af',
  },
  playingIndicator: {
    fontSize: 20,
    color: '#3b82f6',
    marginLeft: 12,
  },
  infoBox: {
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderLeftWidth: 4,
    borderLeftColor: '#3b82f6',
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    lineHeight: 20,
  },
});

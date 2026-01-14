import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notification handler for background actions
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: false, // We'll handle UI ourselves
    shouldPlaySound: false,
    shouldSetBadge: false,
    shouldShowBanner: false,
    shouldShowList: false,
  }),
});

// Request notification permissions
async function requestNotificationPermissions() {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === 'granted';
}

type Track = {
  id: string;
  title: string;
  artist: string;
  artwork?: string;
  url: string;
};

// Example tracks - replace with your own
const SAMPLE_TRACKS: Track[] = [
  {
    id: '1',
    title: 'Sample Track 1',
    artist: 'Artist Name',
    artwork: 'https://picsum.photos/300/300?random=1',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  },
  {
    id: '2',
    title: 'Sample Track 2',
    artist: 'Another Artist',
    artwork: 'https://picsum.photos/300/300?random=2',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  },
];

export default function MediaPlayerWithNotification() {
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const notificationListener = useRef<Notifications.Subscription | null>(null);
  const responseListener = useRef<Notifications.Subscription | null>(null);

  // Initialize audio mode for background playback
  useEffect(() => {
    const setupAudio = async () => {
      try {
        await Audio.setAudioModeAsync({
          staysActiveInBackground: true,
          playsInSilentModeIOS: true,
          shouldDuckAndroid: true,
          playThroughEarpieceAndroid: false,
        });
        await requestNotificationPermissions();
      } catch (error) {
        console.error('Error setting up audio:', error);
      }
    };

    void setupAudio();

    return () => {
      // Cleanup
      if (soundRef.current) {
        soundRef.current.unloadAsync().catch(() => { });
      }
    };
  }, []);

  // Setup notification listeners
  useEffect(() => {
    // Listener for when notification is received
    notificationListener.current = Notifications.addNotificationReceivedListener((notification) => {
      console.log('Notification received:', notification);
    });

    // Listener for notification actions (tap/button press)
    responseListener.current = Notifications.addNotificationResponseReceivedListener((response) => {
      const actionIdentifier = response.actionIdentifier;

      if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
        // User tapped the notification itself - you could open the app here
        return;
      }

      // Handle media controls
      switch (actionIdentifier) {
        case 'PLAY_PAUSE':
          void togglePlayPause();
          break;
        case 'NEXT':
          void playNext();
          break;
        case 'PREV':
          void playPrevious();
          break;
        default:
          console.log('Unknown action:', actionIdentifier);
      }
    });

    return () => {
      if (notificationListener.current) {
        notificationListener.current.remove();
      }
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  const updateNotification = async (track: Track, playing: boolean) => {
    try {
      // Update media notification
      // Note: expo-notifications has limited media notification support
      // For full media controls, consider using a dedicated library like react-native-track-player
      if (Platform.OS === 'android') {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: track.title,
            body: `${track.artist} - ${playing ? 'Playing' : 'Paused'}`,
            data: { trackId: track.id },
            categoryIdentifier: 'media-controls',
          },
          trigger: null, // Show immediately
          identifier: 'media-player', // Use same ID to update instead of create new
        });
      }
    } catch (error) {
      console.error('Error updating notification:', error);
    }
  };

  const loadTrack = async (track: Track) => {
    try {
      setIsLoading(true);

      // Unload previous track
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      // Load new track
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: false },
        (status: AVPlaybackStatus) => {
          if (!status.isLoaded) return;

          setPosition(status.positionMillis || 0);
          setDuration(status.durationMillis || 0);

          if (status.didJustFinish) {
            setIsPlaying(false);
            // Auto-play next track
            void playNext();
          }
        }
      );

      soundRef.current = sound;
      setCurrentTrack(track);
      setIsPlaying(false);

      // Update notification
      await updateNotification(track, false);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading track:', error);
      setIsLoading(false);
    }
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

      // Update notification with new play state
      await updateNotification(currentTrack, !isPlaying);
    } catch (error) {
      console.error('Error toggling play/pause:', error);
    }
  };

  const playNext = async () => {
    if (!currentTrack) return;
    const currentIndex = SAMPLE_TRACKS.findIndex((t) => t.id === currentTrack.id);
    const nextIndex = (currentIndex + 1) % SAMPLE_TRACKS.length;
    await loadTrack(SAMPLE_TRACKS[nextIndex]);
    await togglePlayPause(); // Auto-play
  };

  const playPrevious = async () => {
    if (!currentTrack) return;
    const currentIndex = SAMPLE_TRACKS.findIndex((t) => t.id === currentTrack.id);
    const prevIndex = currentIndex === 0 ? SAMPLE_TRACKS.length - 1 : currentIndex - 1;
    await loadTrack(SAMPLE_TRACKS[prevIndex]);
    await togglePlayPause(); // Auto-play
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Music Player</Text>
        <Text style={styles.subtitle}>With Notification Controls</Text>

        {currentTrack && (
          <View style={styles.trackInfo}>
            {currentTrack.artwork && (
              <Image source={{ uri: currentTrack.artwork }} style={styles.artwork} />
            )}
            <Text style={styles.trackTitle}>{currentTrack.title}</Text>
            <Text style={styles.trackArtist}>{currentTrack.artist}</Text>

            <View style={styles.progressContainer}>
              <Text style={styles.timeText}>{formatTime(position)}</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${(position / duration) * 100}%` }]} />
              </View>
              <Text style={styles.timeText}>{formatTime(duration)}</Text>
            </View>

            <View style={styles.controls}>
              <TouchableOpacity style={styles.controlButton} onPress={playPrevious}>
                <Text style={styles.controlButtonText}>⏮</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.playButton}
                onPress={togglePlayPause}
                disabled={isLoading}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.playButtonText}>{isPlaying ? '⏸' : '▶'}</Text>
                )}
              </TouchableOpacity>

              <TouchableOpacity style={styles.controlButton} onPress={playNext}>
                <Text style={styles.controlButtonText}>⏭</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <View style={styles.trackList}>
          <Text style={styles.trackListTitle}>Available Tracks</Text>
          {SAMPLE_TRACKS.map((track) => (
            <TouchableOpacity
              key={track.id}
              style={[
                styles.trackItem,
                currentTrack?.id === track.id && styles.trackItemActive,
              ]}
              onPress={() => loadTrack(track)}
            >
              <Text style={styles.trackItemTitle}>{track.title}</Text>
              <Text style={styles.trackItemArtist}>{track.artist}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoText}>
            📱 Check your notification panel and lock screen for media controls
          </Text>
          <Text style={styles.infoText}>
            ⚠️ Note: Full notification controls require a development build or APK (not Expo Go)
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
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 24,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 32,
  },
  artwork: {
    width: 280,
    height: 280,
    borderRadius: 16,
    marginBottom: 16,
    backgroundColor: '#111827',
  },
  trackTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 4,
    textAlign: 'center',
  },
  trackArtist: {
    fontSize: 16,
    color: '#9ca3af',
    marginBottom: 24,
    textAlign: 'center',
  },
  progressContainer: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressBar: {
    flex: 1,
    height: 4,
    backgroundColor: '#1f2937',
    borderRadius: 2,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3b82f6',
  },
  timeText: {
    fontSize: 12,
    color: '#9ca3af',
    minWidth: 40,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
  },
  controlButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1f2937',
    justifyContent: 'center',
    alignItems: 'center',
  },
  controlButtonText: {
    fontSize: 24,
    color: '#ffffff',
  },
  playButton: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#3b82f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButtonText: {
    fontSize: 32,
    color: '#ffffff',
  },
  trackList: {
    marginTop: 32,
  },
  trackListTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  trackItem: {
    padding: 16,
    backgroundColor: '#111827',
    borderRadius: 12,
    marginBottom: 8,
  },
  trackItemActive: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#3b82f6',
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
  infoBox: {
    marginTop: 24,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
  },
  infoText: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
    lineHeight: 20,
  },
});

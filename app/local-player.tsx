import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
} from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';

type Track = {
  id: string;
  title: string;
  artist?: string;
  // Can be a URI from MediaLibrary or a bundled module (require(...))
  audio: { uri: string } | number;
  cover?: { uri: string };
};

const TEST_BUNDLED_TRACK: Track = {
  id: 'bundled-test-track',
  title: 'Test Track (bundled)',
  artist: 'Audiloly',
  audio: require('../assets/videoplayback.m4a'),
};

export default function LocalPlayerScreen() {
  const router = useRouter();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [currentTrack, setCurrentTrack] = useState<Track | null>(null);
  // Always include the bundled test track; device tracks get added on top
  const [tracks, setTracks] = useState<Track[]>([TEST_BUNDLED_TRACK]);
  const [currentIndex, setCurrentIndex] = useState<number | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(1);
  const [loading, setLoading] = useState(true);
  const [permissionDenied, setPermissionDenied] = useState(false);

  const syncFromMediaLibrary = async () => {
    try {
      setLoading(true);
      setPermissionDenied(false);

      const { status, canAskAgain } = await MediaLibrary.requestPermissionsAsync();
      if (status !== 'granted') {
        setPermissionDenied(true);
        if (!canAskAgain) {
          console.warn('Media library permission permanently denied.');
        }
        return;
      }

      // Fetch as many audio items as the OS exposes, with simple pagination
      const pageSize = 200;
      let allAssets: MediaLibrary.Asset[] = [];
      let hasNextPage = true;
      let after: string | undefined;

      while (hasNextPage && allAssets.length < 2000) {
        const page = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: pageSize,
          sortBy: [MediaLibrary.SortBy.title],
          after,
        });

        // Debug logs to understand what the OS is returning
        console.log('MediaLibrary page:', {
          received: page.assets.length,
          totalCount: page.totalCount,
          hasNextPage: page.hasNextPage,
        });

        allAssets = allAssets.concat(page.assets);
        hasNextPage = page.hasNextPage;
        after = page.endCursor;
      }

      console.log('Total audio assets collected:', allAssets.length);

      const mappedTracks: Track[] = allAssets.map((asset, index) => ({
        id: asset.id ?? String(index),
        title: asset.filename ?? `Track ${index + 1}`,
        artist: undefined,
        audio: { uri: asset.uri },
      }));

      // Replace device tracks with latest scan, keep bundled test at the top
      setTracks([TEST_BUNDLED_TRACK, ...mappedTracks]);
    } catch (e) {
      console.warn('Error loading device audio', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void syncFromMediaLibrary();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, []);

  const importFromDevice = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['audio/*'],
        multiple: true,
        copyToCacheDirectory: false,
      });

      if (result.canceled || !result.assets?.length) return;

      const imported: Track[] = result.assets.map((asset, index) => ({
        id: `imported-${asset.uri}-${index}`,
        title: asset.name ?? `Imported ${index + 1}`,
        artist: 'Imported',
        audio: { uri: asset.uri },
      }));

      setTracks((prev) => [...prev, ...imported]);
    } catch (e) {
      console.warn('Error importing songs', e);
    }
  };

  const loadAndPlay = async (track: Track) => {
    try {
      if (currentTrack?.id === track.id && soundRef.current) {
        if (isPlaying) {
          await soundRef.current.pauseAsync();
          setIsPlaying(false);
        } else {
          await soundRef.current.playAsync();
          setIsPlaying(true);
        }
        return;
      }

      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(track.audio, {
        shouldPlay: true,
        progressUpdateIntervalMillis: 250,
      });

      soundRef.current = sound;
      setCurrentTrack(track);
      const index = tracks.findIndex((t) => t.id === track.id);
      setCurrentIndex(index >= 0 ? index : null);
      setIsPlaying(true);

      sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
        if (!status.isLoaded) return;
        setPositionMillis(status.positionMillis ?? 0);
        setDurationMillis(status.durationMillis ?? 1);
        if (status.didJustFinish) setIsPlaying(false);
      });
    } catch (e) {
      console.warn('Error playing audio', e);
    }
  };

  const togglePlayPause = async () => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded) return;
    if (status.isPlaying) {
      await soundRef.current.pauseAsync();
      setIsPlaying(false);
    } else {
      await soundRef.current.playAsync();
      setIsPlaying(true);
    }
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = positionMillis / durationMillis;
  const hasPrev = currentIndex !== null && currentIndex > 0;
  const hasNext = currentIndex !== null && currentIndex < tracks.length - 1;

  const playAdjacent = async (direction: 'prev' | 'next') => {
    if (currentIndex === null) return;
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= tracks.length) return;
    const nextTrack = tracks[newIndex];
    await loadAndPlay(nextTrack);
  };

  const renderTrackItem = ({ item }: { item: Track }) => {
    const isActive = currentTrack?.id === item.id;
    return (
      <TouchableOpacity
        style={[styles.trackItem, isActive && styles.trackItemActive]}
        onPress={() => void loadAndPlay(item)}
      >
        {item.cover ? (
          <Image source={item.cover} style={styles.coverSmall} />
        ) : (
          <View style={[styles.coverSmall, { backgroundColor: '#1f2937' }]} />
        )}
        <View style={styles.trackTextContainer}>
          <Text style={styles.trackTitle}>{item.title}</Text>
            {item.artist ? <Text style={styles.trackSubtitle}>{item.artist}</Text> : null}
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.header}>Local audio</Text>
        <View style={styles.headerActions}>
          <TouchableOpacity onPress={() => void syncFromMediaLibrary()}>
            <Text style={styles.syncText}>Sync</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => void importFromDevice()}>
            <Text style={styles.importText}>Import</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#ffffff" />
          <Text style={styles.loadingText}>Scanning your device audio…</Text>
        </View>
      ) : tracks.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>
            {permissionDenied
              ? 'We need permission to access your media library to show device audio.'
              : 'No audio files found on this device.'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={tracks}
          keyExtractor={(item) => item.id}
          renderItem={renderTrackItem}
          contentContainerStyle={styles.listContent}
        />
      )}

      {currentTrack && (
        <View style={styles.nowPlayingContainer}>
          <View style={styles.nowPlayingInfo}>
            <Image source={currentTrack.cover} style={styles.coverLarge} />
            <View style={styles.nowPlayingText}>
              <Text numberOfLines={1} style={styles.nowPlayingTitle}>
                {currentTrack.title}
              </Text>
              <Text style={styles.nowPlayingSubtitle}>{currentTrack.artist}</Text>
            </View>
          </View>

          <View style={styles.progressContainer}>
            <View style={styles.progressBackground}>
              <View style={[styles.progressFill, { flex: progress }]} />
              <View style={{ flex: 1 - progress }} />
            </View>
            <View style={styles.timeRow}>
              <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
              <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
            </View>
          </View>

          <View style={styles.controlsRow}>
            <TouchableOpacity
              style={[styles.smallControlButton, !hasPrev && styles.controlButtonDisabled]}
              disabled={!hasPrev}
              onPress={() => void playAdjacent('prev')}
            >
              <Text
                style={[
                  styles.smallControlButtonText,
                  !hasPrev && styles.controlButtonTextDisabled,
                ]}
              >
                ⏮
              </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.playButton} onPress={() => void togglePlayPause()}>
              <Text style={styles.playButtonText}>{isPlaying ? 'Pause' : 'Play'}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.smallControlButton, !hasNext && styles.controlButtonDisabled]}
              disabled={!hasNext}
              onPress={() => void playAdjacent('next')}
            >
              <Text
                style={[
                  styles.smallControlButtonText,
                  !hasNext && styles.controlButtonTextDisabled,
                ]}
              >
                ⏭
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050816' },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 6,
  },
  backText: {
    color: '#9ca3af',
    fontSize: 14,
    width: 60,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  syncText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  importText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: { paddingHorizontal: 16, paddingBottom: 140 },
  trackItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: '#111827',
  },
  trackItemActive: { borderColor: '#ffffff', borderWidth: 1 },
  coverSmall: { width: 48, height: 48, borderRadius: 8, marginRight: 12 },
  trackTextContainer: { flex: 1 },
  trackTitle: { color: '#f9fafb', fontSize: 16, fontWeight: '600' },
  trackSubtitle: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  nowPlayingContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
    backgroundColor: '#020617',
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
  },
  nowPlayingInfo: { flexDirection: 'row', alignItems: 'center' },
  coverLarge: { width: 64, height: 64, borderRadius: 12, marginRight: 12 },
  nowPlayingText: { flex: 1 },
  nowPlayingTitle: { color: '#f9fafb', fontSize: 18, fontWeight: '700' },
  nowPlayingSubtitle: { color: '#9ca3af', fontSize: 13, marginTop: 2 },
  progressContainer: { marginTop: 12 },
  progressBackground: {
    flexDirection: 'row',
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#ffffff33',
  },
  progressFill: { backgroundColor: '#ffffff' },
  timeRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  timeText: { color: '#e5e7eb', fontSize: 11 },
  controlsRow: { marginTop: 12, alignItems: 'center' },
  playButton: {
    paddingHorizontal: 32,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: '#ffffff',
  },
  playButtonText: { color: '#020617', fontSize: 16, fontWeight: '700' },
  smallControlButton: {
    width: 44,
    height: 44,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
  },
  smallControlButtonText: {
    color: '#ffffff',
    fontSize: 20,
  },
  controlButtonDisabled: {
    opacity: 0.4,
  },
  controlButtonTextDisabled: {
    color: '#6b7280',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  loadingText: {
    color: '#9ca3af',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 12,
  },
});



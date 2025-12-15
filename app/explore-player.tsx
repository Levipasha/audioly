import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Audio, AVPlaybackStatus } from 'expo-av';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { API_BASE_URL } from '@/constants/api';

type ExploreSong = {
  _id: string;
  title: string;
  category?: string;
  audioUrl: string;
  coverUrl?: string;
  owner?: {
    name: string;
  };
};

export default function ExplorePlayerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ songId?: string; category?: string }>();

  const [songs, setSongs] = useState<ExploreSong[]>([]);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(1);
  const [progressWidth, setProgressWidth] = useState(0);

  const currentSong = songs[currentIndex];
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < songs.length - 1;

  useEffect(() => {
    const fetchAndSelect = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/songs/explore`);
        const json: ExploreSong[] = await res.json();
        if (!res.ok) {
          setError((json as any)?.message || 'Failed to load songs');
          return;
        }

        let filtered = json;
        if (params.category) {
          filtered = json.filter((s) => s.category === params.category);
        }

        if (!filtered.length) {
          setError('No songs found for this category.');
          return;
        }

        let index = 0;
        if (params.songId) {
          const idx = filtered.findIndex((s) => s._id === params.songId);
          if (idx >= 0) index = idx;
        }

        setSongs(filtered);
        setCurrentIndex(index);
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    void fetchAndSelect();

    return () => {
      if (soundRef.current) {
        soundRef.current.unloadAsync();
      }
    };
  }, [params.songId, params.category]);

  useEffect(() => {
    if (!currentSong) return;

    const play = async () => {
      try {
        if (soundRef.current) {
          await soundRef.current.unloadAsync();
        }

        const { sound } = await Audio.Sound.createAsync(
          { uri: currentSong.audioUrl },
          { shouldPlay: true, progressUpdateIntervalMillis: 250 }
        );

        soundRef.current = sound;
        setIsPlaying(true);

        sound.setOnPlaybackStatusUpdate((status: AVPlaybackStatus) => {
          if (!status.isLoaded) return;
          setPositionMillis(status.positionMillis ?? 0);
          setDurationMillis(status.durationMillis ?? 1);
          if (status.didJustFinish) setIsPlaying(false);
        });
      } catch {
        setError('Failed to play this song');
      }
    };

    void play();
  }, [currentSong?._id]);

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

  const seekBy = async (deltaMs: number) => {
    if (!soundRef.current) return;
    const status = await soundRef.current.getStatusAsync();
    if (!status.isLoaded || typeof status.positionMillis !== 'number') return;
    const nextPos = Math.max(0, Math.min(status.positionMillis + deltaMs, status.durationMillis ?? status.positionMillis));
    await soundRef.current.setPositionAsync(nextPos);
  };

  const playAdjacent = (direction: 'prev' | 'next') => {
    if (!songs.length) return;
    setCurrentIndex((prev) => {
      const next = direction === 'prev' ? prev - 1 : prev + 1;
      if (next < 0 || next >= songs.length) return prev;
      return next;
    });
  };

  const formatTime = (millis: number) => {
    const totalSeconds = Math.floor(millis / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = positionMillis / durationMillis;

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <ActivityIndicator color="#ffffff" />
        </View>
      </SafeAreaView>
    );
  }

  if (error || !currentSong) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Explore player</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.center}>
          <Text style={styles.errorText}>{error ?? 'No song selected.'}</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backText}>{'< Back'}</Text>
        </TouchableOpacity>
        <Text style={styles.header}>{currentSong.category || 'Now playing'}</Text>
        <View style={{ width: 60 }} />
      </View>

      <View style={styles.content}>
        <View style={styles.coverWrapper}>
          {currentSong.coverUrl ? (
            <Image source={{ uri: currentSong.coverUrl }} style={styles.coverLarge} />
          ) : (
            <View style={[styles.coverLarge, { backgroundColor: '#111827' }]} />
          )}
        </View>
        <View style={styles.nowPlayingText}>
          <Text numberOfLines={1} style={styles.nowPlayingTitle}>
            {currentSong.title}
          </Text>
          <Text style={styles.nowPlayingSubtitle}>{currentSong.owner?.name ?? 'Unknown'}</Text>
        </View>

        <View style={styles.progressContainer}>
          <Pressable
            style={styles.progressBackground}
            onLayout={(e) => setProgressWidth(e.nativeEvent.layout.width)}
            onPress={async (e) => {
              if (!soundRef.current || !durationMillis || !progressWidth) return;
              const ratio = e.nativeEvent.locationX / progressWidth;
              const target = Math.max(0, Math.min(ratio, 1)) * durationMillis;
              try {
                await soundRef.current.setPositionAsync(target);
              } catch {
                // ignore
              }
            }}
          >
            <View style={[styles.progressFill, { flex: progress }]} />
            <View style={{ flex: 1 - progress }} />
          </Pressable>
          <View style={styles.timeRow}>
            <Text style={styles.timeText}>{formatTime(positionMillis)}</Text>
            <Text style={styles.timeText}>{formatTime(durationMillis)}</Text>
          </View>
        </View>

        <View style={styles.seekRow}>
          <TouchableOpacity style={styles.seekButton} onPress={() => void seekBy(-10000)}>
            <Text style={styles.seekText}>-10s</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.seekButton} onPress={() => void seekBy(10000)}>
            <Text style={styles.seekText}>+10s</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.controlsRow}>
          <TouchableOpacity
            style={[styles.smallControlButton, !hasPrev && styles.controlButtonDisabled]}
            disabled={!hasPrev}
            onPress={() => playAdjacent('prev')}
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
            onPress={() => playAdjacent('next')}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050816' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
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
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  coverWrapper: {
    alignItems: 'center',
    marginBottom: 16,
  },
  coverLarge: {
    width: 260,
    height: 260,
    borderRadius: 28,
  },
  nowPlayingText: {
    alignItems: 'center',
    marginTop: 8,
  },
  nowPlayingTitle: { color: '#f9fafb', fontSize: 22, fontWeight: '700' },
  nowPlayingSubtitle: { color: '#9ca3af', fontSize: 14, marginTop: 2 },
  progressContainer: { marginTop: 24 },
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
  seekRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginTop: 16,
  },
  seekButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#ffffff',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  seekText: {
    color: '#e5e7eb',
    fontSize: 13,
  },
  controlsRow: { marginTop: 28, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  playButton: {
    paddingHorizontal: 40,
    paddingVertical: 12,
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
    marginHorizontal: 16,
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
  errorText: {
    color: '#f97373',
  },
});



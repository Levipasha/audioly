import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useNowPlaying } from '@/components/now-playing-context';
import { ThemedText } from '@/components/themed-text';
import { getDownloadedSongs, type DownloadedSong } from '@/utils/downloads';

export default function OfflineSongsScreen() {
  const router = useRouter();
  const { playTrack, setQueue, setQueueWithPlayer, setSourceName } = useNowPlaying();
  const [downloadedSongs, setDownloadedSongs] = useState<DownloadedSong[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadSongs = async () => {
      try {
        setLoading(true);
        const songs = await getDownloadedSongs();
        setDownloadedSongs(songs);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    void loadSongs();
  }, []);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <Text style={styles.backText}>{'< Back'}</Text>
          </TouchableOpacity>
          <Text style={styles.header}>Offline Audiolys</Text>
          <View style={{ width: 60 }} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color="#ffffff" />
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
        <Text style={styles.header}>Offline Audiolys</Text>
        <View style={{ width: 60 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {downloadedSongs.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="cloud-offline-outline" size={64} color="#6b7280" />
            <ThemedText type="subtitle" style={styles.emptyTitle}>
              No Offline Songs
            </ThemedText>
            <ThemedText style={styles.emptyText}>
              Download songs to listen offline when you&apos;re not connected to the internet.
            </ThemedText>
          </View>
        ) : (
          <>
            <View style={styles.infoBanner}>
              <Ionicons name="wifi-outline" size={20} color="#fbbf24" />
              <ThemedText style={styles.infoText}>
                You&apos;re offline. These songs are available to play.
              </ThemedText>
            </View>

            {downloadedSongs.map((song) => (
              <TouchableOpacity
                key={song.id}
                style={styles.songCard}
                onPress={async () => {
                  // Map all downloaded songs to NowPlaying format for the queue
                  const queue = downloadedSongs.map(s => ({
                    id: s.id,
                    title: s.title,
                    subtitle: s.subtitle || s.owner?.name || 'Unknown Artist',
                    coverUrl: s.coverUrl,
                    audio: s.localPath,
                    route: '/offline-songs'
                  }));

                  // Update player state
                  await setQueueWithPlayer(queue);
                  setSourceName('Downloads');

                  // Play the selected song
                  const songToPlay = queue.find(q => q.id === song.id);
                  if (songToPlay) {
                    await playTrack(songToPlay);
                  }

                  router.push('/(tabs)/player');
                }}
              >
                <View style={styles.songCover}>
                  {song.coverUrl ? (
                    <Image source={typeof song.coverUrl === 'string' ? { uri: song.coverUrl } : song.coverUrl} style={styles.coverImage} />
                  ) : (
                    <View style={styles.coverPlaceholder}>
                      <Ionicons name="musical-notes" size={32} color="#6b7280" />
                    </View>
                  )}
                </View>
                <View style={styles.songInfo}>
                  <ThemedText type="defaultSemiBold" numberOfLines={1}>
                    {song.title}
                  </ThemedText>
                  <ThemedText style={styles.songSubtitle} numberOfLines={1}>
                    {song.subtitle || 'Unknown'}
                  </ThemedText>
                  <View style={styles.songMeta}>
                    <ThemedText style={styles.metaText}>
                      {song.category || 'Uncategorized'}
                    </ThemedText>
                    <View style={styles.offlineBadge}>
                      <Ionicons name="download" size={12} color="#3b82f6" />
                      <ThemedText style={styles.offlineText}>Offline</ThemedText>
                    </View>
                  </View>
                </View>
                <Ionicons name="play-circle" size={32} color="#ffffff" />
              </TouchableOpacity>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
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
    textAlign: 'center',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 32,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: 'center',
    opacity: 0.7,
    fontSize: 14,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#fbbf24',
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#111827',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    gap: 12,
  },
  songCover: {
    width: 64,
    height: 64,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#1f2937',
  },
  coverImage: {
    width: '100%',
    height: '100%',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  songInfo: {
    flex: 1,
    gap: 4,
  },
  songSubtitle: {
    fontSize: 13,
    opacity: 0.7,
  },
  songMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.6,
  },
  offlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1e3a5f',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    gap: 4,
  },
  offlineText: {
    fontSize: 10,
    color: '#3b82f6',
    fontWeight: '600',
  },
});

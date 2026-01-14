import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Keyboard,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { CassetteGridItem } from '@/components/CassetteGridItem';
import { CassetteListItem } from '@/components/CassetteListItem';
import { CassetteModal } from '@/components/CassetteModal';
import { ListenTogetherBadge } from '@/components/ListenTogetherBadge';
import { ListenTogetherModal } from '@/components/ListenTogetherModal';
import { useNowPlaying } from '@/components/now-playing-context';
import { usePlaylist } from '@/components/playlist-context';
import { useQueue } from '@/components/queue-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/api';
import { MetadataService } from '@/services/metadata';
import { Track } from '@/services/metadata/types';
import { Ionicons } from '@expo/vector-icons';

export default function ExploreScreen() {
  const router = useRouter();
  const isDark = true; // Always dark mode

  const [songs, setSongs] = useState<Track[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const { addToQueue, setQueue, setCurrentIndex } = useQueue();
  const { nowPlaying, playTrack, viewMode, setViewMode, setQueue: setGlobalQueue } = useNowPlaying();
  const { toggleLike, isLiked } = usePlaylist();
  const [selectedSongForModal, setSelectedSongForModal] = useState<any | null>(null);
  const [showListenTogetherModal, setShowListenTogetherModal] = useState(false);

  // Dynamic colors based on theme
  const colors = {
    background: isDark ? '#050816' : '#ffffff',
    cardBackground: isDark ? '#1f2937' : '#f3f4f6',
    inputBackground: isDark ? '#020617' : '#ffffff',
    inputBorder: isDark ? '#1f2937' : '#d1d5db',
    inputText: isDark ? '#f9fafb' : '#111827',
    titleText: isDark ? '#f9fafb' : '#111827',
    metaText: isDark ? '#9ca3af' : '#6b7280',
    placeholder: '#6b7280',
    coverPlaceholder: isDark ? '#111827' : '#e5e7eb',
    activityIndicator: isDark ? '#ffffff' : '#3b82f6',
  };

  // Load initial recommendations (public songs)
  const loadInitial = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/songs/explore`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const json = await res.json();
      if (!res.ok) throw new Error('Failed to load songs');

      // Map backend songs to Track interface
      const mappedSongs: Track[] = json.map((song: any) => ({
        id: song._id,
        title: song.title,
        artist: song.owner?.name || 'Unknown Artist',
        uri: song.audioUrl,
        artwork: song.coverUrl,
        duration: 0, // Backend doesn't store duration yet
      }));

      setSongs(mappedSongs);
    } catch {
      setError('Failed to load songs');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInitial();
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return loadInitial(); // Reset if empty
    Keyboard.dismiss();
    setLoading(true);
    setError(null);
    try {
      // Use RemoteProvider only for explicit search if desired, OR filter local results?
      // Since user wants "posted songs", maybe search posted songs?
      // For now, let's keep using MetadataService for explicit search if that's what "Search any song..." implies (e.g. YouTube).
      // BUT user complaint was "songs which is been posted is not getting fetched".
      // Let's rely on MetadataService for SEARCH (broad), but use Backend for INITIAL (community).
      // Or maybe search backend too? API doesn't seem to have search parameter on /explore.
      // Let's stick to MetadataService for search for now as it gives access to millions of songs.
      const provider = MetadataService.getInstance().getProvider();
      const results = await provider.search(query);
      setSongs(results);
      if (results.length === 0) setError('No results found');
    } catch {
      setError('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const playSong = async (track: Track) => {
    if (resolvingId) return;
    setResolvingId(track.id);

    try {
      let audioUrl = track.uri;

      // Check if it's a YouTube source that needs resolving
      if (track.uri && track.uri.startsWith('yt:')) {
        const res = await fetch(`${API_BASE_URL}/resolve-audio`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: track.title,
            artist: track.artist,
          })
        });

        const json = await res.json();
        if (!res.ok) throw new Error('Could not play song');
        audioUrl = json.audioUrl;
      }

      // Record play if it's a backend song
      if (!track.uri.startsWith('yt:') && !track.uri.startsWith('http')) {
        void fetch(`${API_BASE_URL}/songs/${track.id}/play`, { method: 'POST' }).catch(() => { });
      }

      // Map all current songs to the unified queue format
      const unifiedQueue = songs.map(s => ({
        id: s.id,
        title: s.title,
        subtitle: s.artist,
        audio: s.id === track.id ? audioUrl : s.uri,
        coverUrl: s.artwork,
        route: '/(tabs)/player'
      }));

      // Set global queue for the main player tab
      setGlobalQueue(unifiedQueue);

      // Update local queue state (optional, if explore needs it for UI feedback)
      setQueue(unifiedQueue.map(s => ({
        ...s,
        audioUrl: s.audio,
        owner: { name: s.subtitle }
      })));

      const idx = songs.findIndex(s => s.id === track.id);
      setCurrentIndex(idx >= 0 ? idx : 0);

      // Play the selected track immediately using the context
      const trackToPlay = unifiedQueue[idx >= 0 ? idx : 0];
      if (trackToPlay) {
        await playTrack(trackToPlay);
      }

      // Navigate to the main player tab
      router.push('/(tabs)/player');

    } catch (e) {
      alert('Failed to play song. Try another.');
    } finally {
      setResolvingId(null);
    }
  };

  const handleSongPress = (track: Track) => {
    setSelectedSongForModal({
      id: track.id,
      title: track.title,
      subtitle: track.artist || 'Explore Artist',
      coverUrl: typeof track.artwork === 'string' ? track.artwork : undefined,
      audio: { uri: track.uri }, // Note: may need resolve-audio logic inside playTrack or before
      isExplore: true,
      originalTrack: track // Keep original for playSong logic
    });
  };

  const onModalPlay = async () => {
    if (selectedSongForModal?.originalTrack) {
      await playSong(selectedSongForModal.originalTrack);
    }
    setSelectedSongForModal(null);
  };

  const renderItem = ({ item }: { item: Track }) => {
    const isActive = nowPlaying?.id === item.id;
    const isSongPlaying = nowPlaying?.isPlaying && isActive;
    const subtitle = item.artist || 'Unknown Artist';
    const coverUrl = typeof item.artwork === 'string' ? item.artwork : undefined;

    if (viewMode === 'grid') {
      return (
        <CassetteGridItem
          title={item.title}
          subtitle={subtitle}
          coverUrl={coverUrl}
          isActive={isActive}
          isPlaying={isSongPlaying}
          isLiked={isLiked(item.id)}
          onPress={() => handleSongPress(item)}
          onFavorite={() => toggleLike({
            id: item.id,
            title: item.title,
            subtitle: subtitle,
            audioUrl: item.uri,
            coverUrl: coverUrl,
            addedAt: Date.now()
          })}
        />
      );
    }

    return (
      <CassetteListItem
        title={item.title}
        subtitle={subtitle}
        isActive={isActive}
        isPlaying={isSongPlaying}
        isLiked={isLiked(item.id)}
        onPress={() => handleSongPress(item)}
        onFavorite={() => toggleLike({
          id: item.id,
          title: item.title,
          subtitle: subtitle,
          audioUrl: item.uri,
          coverUrl: coverUrl,
          addedAt: Date.now()
        })}
      />
    );
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingRight: 16 }}>
        <ThemedText type="title" style={styles.screenTitle}>Explore</ThemedText>
        <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
          <ListenTogetherBadge />
          <TouchableOpacity
            onPress={() => setShowListenTogetherModal(true)}
            style={styles.listenTogetherButton}
          >
            <Ionicons name="people" size={18} color="#fff" />
            <Text style={styles.listenTogetherText}>Listen Together</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            style={{ padding: 5 }}
          >
            <Ionicons name={viewMode === 'list' ? "grid-outline" : "list-outline"} size={22} color="#3b82f6" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={[styles.searchInput, {
            backgroundColor: colors.inputBackground,
            borderColor: colors.inputBorder,
            color: colors.inputText,
          }]}
          placeholder="Search any song..."
          placeholderTextColor={colors.placeholder}
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={() => void handleSearch()}
          returnKeyType="search"
        />
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => void handleSearch()}
        >
          <Ionicons name="search" size={20} color="#fff" />
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.activityIndicator} size="large" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText>{error}</ThemedText>
        </View>
      ) : (
        <FlatList
          key={viewMode}
          numColumns={viewMode === 'grid' ? 2 : 1}
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-between' } : undefined}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={loadInitial} tintColor={colors.activityIndicator} />
          }
        />
      )}
      <CassetteModal
        isVisible={!!selectedSongForModal}
        song={selectedSongForModal}
        onClose={() => setSelectedSongForModal(null)}
        onPlay={onModalPlay}
      />
      <ListenTogetherModal
        visible={showListenTogetherModal}
        onClose={() => setShowListenTogetherModal(false)}
      />
      {resolvingId && (
        <View style={styles.resolvingOverlay}>
          <ActivityIndicator color="#fff" size="large" />
          <Text style={styles.resolvingText}>Preparing Cassette...</Text>
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: 40,
  },
  screenTitle: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 16,
  },
  searchButton: {
    padding: 10,
    backgroundColor: '#3b82f6',
    borderRadius: 999,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    fontSize: 12,
    marginTop: 2,
  },
  resolvingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resolvingText: {
    color: '#fff',
    marginTop: 10,
    fontWeight: '600',
  },
  listenTogetherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  listenTogetherText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});


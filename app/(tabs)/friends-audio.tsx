import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { CassetteGridItem } from '@/components/CassetteGridItem';
import { CassetteListItem } from '@/components/CassetteListItem';
import { CassetteModal } from '@/components/CassetteModal';
import { useNowPlaying } from '@/components/now-playing-context';
import { useQueue } from '@/components/queue-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/api';
import { Ionicons } from '@expo/vector-icons';

type FriendsSong = {
  _id: string;
  title: string;
  category?: string;
  audioUrl: string;
  coverUrl?: string;
  owner?: {
    _id: string;
    name: string;
  };
};

export default function FriendsAudioScreen() {
  const router = useRouter();
  const [songs, setSongs] = useState<FriendsSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const { nowPlaying, playTrack, viewMode, setViewMode, setQueue: setGlobalQueue } = useNowPlaying();
  const { setQueue: setExploreQueue, setCurrentIndex } = useQueue();
  const isPlaying = nowPlaying?.isPlaying ?? false;
  const [selectedSongForModal, setSelectedSongForModal] = useState<any | null>(null);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        setAccessToken(token);
      } catch {
        // ignore
      }
    };
    void loadToken();
  }, []);

  useEffect(() => {
    const fetchFriendsSongs = async () => {
      if (!accessToken) {
        setError('Please log in to see friends audioly.');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/songs/feed`, {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const json = await res.json();
        if (!res.ok) {
          if (res.status === 401) {
            setError('Please log in to see friends audioly.');
          } else {
            setError(json.message || 'Failed to load friends audioly');
          }
          return;
        }
        setSongs(json);
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    if (accessToken !== null) {
      void fetchFriendsSongs();
    }
  }, [accessToken]);

  const filtered = useMemo(() => {
    if (!query.trim()) return songs;
    const q = query.trim().toLowerCase();
    return songs.filter((s) => {
      return (
        s.title.toLowerCase().includes(q) ||
        (s.category ?? '').toLowerCase().includes(q) ||
        (s.owner?.name ?? '').toLowerCase().includes(q)
      );
    });
  }, [songs, query]);

  const handleSongPress = (song: FriendsSong) => {
    setSelectedSongForModal({
      id: song._id,
      title: song.title,
      subtitle: song.owner?.name || 'Unknown Artist',
      coverUrl: song.coverUrl,
      audio: { uri: song.audioUrl },
      route: '/(tabs)/player'
    });
  };

  const renderItem = ({ item }: { item: FriendsSong }) => {
    const isActive = nowPlaying?.id === item._id;
    const isSongPlaying = isPlaying && isActive;
    const subtitle = item.owner?.name || 'Unknown Artist';

    if (viewMode === 'grid') {
      return (
        <CassetteGridItem
          title={item.title}
          subtitle={subtitle}
          coverUrl={item.coverUrl}
          isActive={isActive}
          isPlaying={isSongPlaying}
          onPress={() => handleSongPress(item)}
        />
      );
    }

    return (
      <CassetteListItem
        title={item.title}
        subtitle={subtitle}
        isActive={isActive}
        isPlaying={isSongPlaying}
        onPress={() => handleSongPress(item)}
      />
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <ThemedText type="title" style={styles.screenTitle}>
          Friends Audioly
        </ThemedText>
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          style={{ padding: 5 }}
        >
          <Ionicons name={viewMode === 'list' ? "grid-outline" : "list-outline"} size={22} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search by title, category, or friend name"
          placeholderTextColor="#6b7280"
          value={query}
          onChangeText={setQuery}
        />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText>{error}</ThemedText>
          {error.includes('log in') && (
            <TouchableOpacity
              style={styles.loginButton}
              onPress={() => router.push('/(tabs)/profile')}
            >
              <Text style={styles.loginButtonText}>Go to Login</Text>
            </TouchableOpacity>
          )}
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <ThemedText>
            {query.trim() ? 'No matching audiolys found.' : "Your friends haven't uploaded any audioly yet."}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          key={viewMode}
          numColumns={viewMode === 'grid' ? 2 : 1}
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-between' } : undefined}
        />
      )}
      <CassetteModal
        visible={!!selectedSongForModal}
        song={selectedSongForModal}
        onClose={() => setSelectedSongForModal(null)}
        onPlay={() => {
          if (selectedSongForModal) {
            // Set global queue for the main player tab
            const globalQueueItems = filtered.map(s => ({
              id: s._id,
              title: s.title,
              subtitle: s.owner?.name || s.category || 'Unknown Artist',
              audio: { uri: s.audioUrl },
              coverUrl: s.coverUrl,
              route: '/(tabs)/player'
            }));
            setGlobalQueue(globalQueueItems);

            // Set specific queue for explore-player compatibility
            const exploreQueueItems = filtered.map(s => ({
              id: s._id,
              title: s.title,
              subtitle: s.owner?.name || s.category || 'Unknown Artist',
              audioUrl: s.audioUrl,
              coverUrl: s.coverUrl,
              owner: s.owner
            }));
            setExploreQueue(exploreQueueItems);

            const idx = filtered.findIndex(s => s._id === selectedSongForModal._id);
            setCurrentIndex(idx >= 0 ? idx : 0);

            const track = {
              ...selectedSongForModal,
              route: '/(tabs)/player'
            };
            playTrack(track);
          }
          setSelectedSongForModal(null);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
    paddingTop: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  backButton: {
    marginRight: 12,
    padding: 4,
  },
  screenTitle: {
    flex: 1,
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
    borderColor: '#1f2937',
    paddingHorizontal: 14,
    paddingVertical: 8,
    color: '#f9fafb',
    backgroundColor: '#020617',
    fontSize: 14,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
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
    backgroundColor: '#020617',
    marginBottom: 8,
  },
  cover: {
    width: 56,
    height: 56,
    borderRadius: 12,
    marginRight: 12,
  },
  title: {
    color: '#f9fafb',
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  addToQueueButton: {
    padding: 8,
    marginLeft: 8,
  },
  loginButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: '#3b82f6',
    borderRadius: 8,
  },
  loginButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});

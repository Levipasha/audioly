import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
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

export default function ExploreScreen() {
  const router = useRouter();
  const [songs, setSongs] = useState<ExploreSong[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/songs/explore`);
        const json = await res.json();
        if (!res.ok) {
          setError(json.message || 'Failed to load songs');
          return;
        }
        setSongs(json);
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    void fetchSongs();
  }, []);

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

  const renderItem = ({ item }: { item: ExploreSong }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() =>
          router.push({
            pathname: '/explore-player',
            params: { songId: item._id, category: item.category ?? '' },
          })
        }
      >
        {item.coverUrl ? (
          <Image source={{ uri: item.coverUrl }} style={styles.cover} />
        ) : (
          <View style={[styles.cover, { backgroundColor: '#111827' }]} />
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.meta}>
            {item.category || 'Uncategorized'} • {item.owner?.name ?? 'Unknown'}
          </Text>
        </View>
        <Text style={styles.playBadge}>Play</Text>
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <ThemedText type="title" style={styles.screenTitle}>
        Explore
      </ThemedText>

      <TextInput
        style={styles.searchInput}
        placeholder="Search by title, category, or user"
        placeholderTextColor="#6b7280"
        value={query}
        onChangeText={setQuery}
      />

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText>{error}</ThemedText>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <ThemedText>No matching songs.</ThemedText>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
    paddingTop: 40,
  },
  screenTitle: {
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  searchInput: {
    marginHorizontal: 16,
    marginBottom: 12,
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
  playBadge: {
    color: '#ffffff',
    fontWeight: '700',
    marginLeft: 8,
  },
});

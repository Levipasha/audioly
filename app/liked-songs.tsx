import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CassetteGridItem } from '@/components/CassetteGridItem';
import { CassetteListItem } from '@/components/CassetteListItem';
import { CassetteModal } from '@/components/CassetteModal';
import { useNowPlaying } from '@/components/now-playing-context';
import { usePlaylist, type PlaylistSong } from '@/components/playlist-context';
import { useQueue } from '@/components/queue-context';

export default function LikedSongsScreen() {
  const router = useRouter();
  const { likedSongs } = usePlaylist();
  const { nowPlaying, playTrack, viewMode, setViewMode, setQueue: setGlobalQueue } = useNowPlaying();
  const { setQueue: setExploreQueue, setCurrentIndex } = useQueue();
  const isPlaying = nowPlaying?.isPlaying ?? false;
  const [selectedSongForModal, setSelectedSongForModal] = React.useState<any | null>(null);

  const handleSongPress = (song: PlaylistSong) => {
    setSelectedSongForModal({
      ...song,
      subtitle: song.subtitle || song.owner?.name || 'Unknown Artist',
      audio: { uri: song.audioUrl },
      route: '/(tabs)/player'
    });
  };

  const renderItem = ({ item }: { item: PlaylistSong }) => {
    const isActive = nowPlaying?.id === item.id;
    const isSongPlaying = isPlaying && isActive;
    const subtitle = item.subtitle || item.owner?.name || 'Local';

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
    <SafeAreaView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#ffffff" />
        </TouchableOpacity>
        <Text style={styles.header}>Liked Audiolys</Text>
        <TouchableOpacity
          onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
          style={{ padding: 5 }}
        >
          <Ionicons name={viewMode === 'list' ? "grid-outline" : "list-outline"} size={22} color="#3b82f6" />
        </TouchableOpacity>
      </View>

      {likedSongs.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="heart-outline" size={64} color="#6b7280" />
          <Text style={styles.emptyText}>No liked audiolys yet</Text>
          <Text style={styles.emptySubtext}>
            Like audiolys to see them here
          </Text>
        </View>
      ) : (
        <FlatList
          key={viewMode}
          numColumns={viewMode === 'grid' ? 2 : 1}
          data={likedSongs}
          keyExtractor={(item) => item.id}
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
            const globalQueueItems = likedSongs.map(s => ({
              id: s.id,
              title: s.title,
              subtitle: s.subtitle || s.owner?.name || 'Unknown Artist',
              audio: { uri: s.audioUrl },
              coverUrl: s.coverUrl,
              route: '/(tabs)/player'
            }));
            setGlobalQueue(globalQueueItems);

            // Set specific queue for explore-player compatibility
            const exploreQueueItems = likedSongs.map(s => ({
              id: s.id,
              title: s.title,
              subtitle: s.subtitle || s.owner?.name || 'Unknown Artist',
              audioUrl: s.audioUrl,
              coverUrl: s.coverUrl,
              owner: s.owner
            }));
            setExploreQueue(exploreQueueItems);

            const idx = likedSongs.findIndex(s => s.id === selectedSongForModal.id);
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
    paddingBottom: 16,
  },
  header: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
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
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
  },
  emptySubtext: {
    color: '#9ca3af',
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
});

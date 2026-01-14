import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQueue } from './queue-context';
import { usePlaylist } from './playlist-context';
import type { QueueSong } from './queue-context';
import type { PlaylistSong } from './playlist-context';

type QueueViewProps = {
  visible: boolean;
  onClose: () => void;
  onSongSelect: (index: number) => void;
};

export function QueueView({ visible, onClose, onSongSelect }: QueueViewProps) {
  const { queue, currentIndex, removeFromQueue, reorderQueue } = useQueue();
  const { playlists, createPlaylist, addSongToPlaylist } = usePlaylist();
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [selectedSong, setSelectedSong] = useState<QueueSong | null>(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [dragStartIndex, setDragStartIndex] = useState<number | null>(null);

  const handleSongPress = (index: number) => {
    onSongSelect(index);
  };

  const handleSongLongPress = (song: QueueSong) => {
    setSelectedSong(song);
    setShowPlaylistModal(true);
  };

  const handleCreatePlaylist = () => {
    if (!newPlaylistName.trim() || !selectedSong) return;

    const playlistId = createPlaylist(newPlaylistName.trim());
    const playlistSong: PlaylistSong = {
      id: selectedSong.id,
      title: selectedSong.title,
      subtitle: selectedSong.subtitle,
      audioUrl: selectedSong.audioUrl,
      coverUrl: selectedSong.coverUrl,
      owner: selectedSong.owner,
      addedAt: Date.now(),
    };
    addSongToPlaylist(playlistId, playlistSong);

    setNewPlaylistName('');
    setShowPlaylistModal(false);
    setSelectedSong(null);
    Alert.alert('Success', 'Song added to new playlist');
  };

  const handleAddToPlaylist = (playlistId: string) => {
    if (!selectedSong) return;

    const playlistSong: PlaylistSong = {
      id: selectedSong.id,
      title: selectedSong.title,
      subtitle: selectedSong.subtitle,
      audioUrl: selectedSong.audioUrl,
      coverUrl: selectedSong.coverUrl,
      owner: selectedSong.owner,
      addedAt: Date.now(),
    };
    addSongToPlaylist(playlistId, playlistSong);

    setShowPlaylistModal(false);
    setSelectedSong(null);
    Alert.alert('Success', 'Song added to playlist');
  };

  const renderSongItem = ({ item, index }: { item: QueueSong; index: number }) => {
    const isCurrent = index === currentIndex;

    return (
      <TouchableOpacity
        style={[styles.songItem, isCurrent && styles.currentSongItem]}
        onPress={() => handleSongPress(index)}
        onLongPress={() => handleSongLongPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.songLeft}>
          {item.coverUrl ? (
            <Image
              source={typeof item.coverUrl === 'string' ? { uri: item.coverUrl } : item.coverUrl}
              style={styles.songCover}
            />
          ) : (
            <View style={[styles.songCover, styles.placeholderCover]} />
          )}
          <View style={styles.songInfo}>
            <Text numberOfLines={1} style={[styles.songTitle, isCurrent && styles.currentSongText]}>
              {item.title}
            </Text>
            <Text numberOfLines={1} style={[styles.songSubtitle, isCurrent && styles.currentSongSubtext]}>
              {item.subtitle || item.owner?.name || 'Unknown'}
            </Text>
          </View>
        </View>
        {isCurrent && (
          <View style={styles.currentIndicator}>
            <Ionicons name="play-circle" size={20} color="#3b82f6" />
          </View>
        )}
        <TouchableOpacity
          style={styles.removeButton}
          onPress={() => {
            if (queue.length > 1) {
              removeFromQueue(index);
            } else {
              Alert.alert('Cannot remove', 'Queue must have at least one audioly');
            }
          }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="close-circle" size={24} color="#9ca3af" />
        </TouchableOpacity>
      </TouchableOpacity>
    );
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={false}
        onRequestClose={onClose}
      >
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Queue</Text>
            <Text style={styles.songCount}>{queue.length} {queue.length === 1 ? 'audioly' : 'audiolys'}</Text>
          </View>

          <FlatList
            data={queue}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={renderSongItem}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Queue is empty</Text>
              </View>
            }
          />

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      <Modal
        visible={showPlaylistModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowPlaylistModal(false)}
      >
        <View style={styles.playlistModalOverlay}>
          <View style={styles.playlistModalContent}>
            <Text style={styles.playlistModalTitle}>Add to Playlist</Text>

            <TextInput
              style={styles.playlistInput}
              placeholder="New playlist name..."
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              placeholderTextColor="#9ca3af"
            />
            <TouchableOpacity
              style={[styles.playlistButton, !newPlaylistName.trim() && styles.playlistButtonDisabled]}
              onPress={handleCreatePlaylist}
              disabled={!newPlaylistName.trim()}
            >
              <Text style={styles.playlistButtonText}>Create & Add</Text>
            </TouchableOpacity>

            <Text style={styles.existingPlaylistsTitle}>Existing Playlists</Text>
            <FlatList
              data={playlists}
              keyExtractor={(item) => item.id}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.existingPlaylistItem}
                  onPress={() => handleAddToPlaylist(item.id)}
                >
                  <Text style={styles.existingPlaylistName}>{item.name}</Text>
                  <Text style={styles.existingPlaylistCount}>{item.songs.length} audiolys</Text>
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={styles.noPlaylistsText}>No playlists yet</Text>
              }
            />

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowPlaylistModal(false);
                setSelectedSong(null);
                setNewPlaylistName('');
              }}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
  },
  songCount: {
    fontSize: 14,
    color: '#9ca3af',
    marginTop: 4,
  },
  listContent: {
    padding: 16,
  },
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#111827',
    borderRadius: 12,
  },
  currentSongItem: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  songLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  songCover: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  placeholderCover: {
    backgroundColor: '#374151',
  },
  songInfo: {
    flex: 1,
  },
  songTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  songSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
  },
  currentSongText: {
    color: '#3b82f6',
  },
  currentSongSubtext: {
    color: '#60a5fa',
  },
  currentIndicator: {
    marginRight: 12,
  },
  removeButton: {
    padding: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
  closeButton: {
    margin: 16,
    padding: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  playlistModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  playlistModalContent: {
    backgroundColor: '#111827',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    maxHeight: '80%',
  },
  playlistModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    marginBottom: 16,
  },
  playlistInput: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 12,
    color: '#ffffff',
    fontSize: 16,
    marginBottom: 12,
  },
  playlistButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginBottom: 24,
  },
  playlistButtonDisabled: {
    opacity: 0.5,
  },
  playlistButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  existingPlaylistsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 12,
  },
  existingPlaylistItem: {
    padding: 12,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    marginBottom: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  existingPlaylistName: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
  },
  existingPlaylistCount: {
    fontSize: 14,
    color: '#9ca3af',
  },
  noPlaylistsText: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    padding: 16,
  },
  cancelButton: {
    marginTop: 16,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});

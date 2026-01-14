import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/components/auth-context';
import { CassetteListItem } from '@/components/CassetteListItem';
import { useNowPlaying } from '@/components/now-playing-context';
import { useQueue } from '@/components/queue-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/api';
import { useThemeColor } from '@/hooks/use-theme-color';

// Reuse song card or row logic here. 
// For now, I'll create a simple song row locally or duplicate the simple list item.
// A simple song row is best.

type Song = {
  _id: string;
  title: string;
  artist?: string;
  duration?: number;
  playCount: number;
  coverUrl?: string; // Corrected from coverImage object
  audioUrl: string;
  isPublic: boolean;
};

type ProfileData = {
  id: string;
  name: string;
  username?: string;
  isPrivate: boolean;
  profileImage?: { url: string };
  friendsCount: number;
  uploadsCount: number;
  connectionStatus: 'none' | 'friend' | 'sent' | 'received' | 'self';
  canSeeUploads: boolean;
  uploads: Song[];
};

export default function UserProfileScreen() {
  const { userId } = useLocalSearchParams<{ userId: string }>();
  const router = useRouter();
  const { user: currentUser, accessToken } = useAuth();

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const iconColor = useThemeColor({}, 'icon');

  const authHeaders = useCallback(() =>
    accessToken
      ? {
        Authorization: `Bearer ${accessToken}`,
      }
      : undefined, [accessToken]);

  const loadProfile = useCallback(async () => {
    try {
      setError(null);
      const res = await fetch(`${API_BASE_URL}/users/${userId}/profile`, {
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders() ?? {}),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'Failed to load profile');
        return;
      }
      setProfile(json);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [userId, authHeaders]);

  useEffect(() => {
    if (userId) {
      void loadProfile();
    }
  }, [userId, loadProfile]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadProfile();
    setRefreshing(false);
  };

  const handleAction = async () => {
    if (!profile || !accessToken) return;
    setActionLoading(true);
    try {
      if (profile.connectionStatus === 'received') {
        // Accept request
        await fetch(`${API_BASE_URL}/users/request/${profile.id}/accept`, {
          method: 'POST',
          headers: { ...(authHeaders() ?? {}) },
        });
      } else if (profile.connectionStatus === 'none') {
        // Send request
        await fetch(`${API_BASE_URL}/users/request/${profile.id}`, {
          method: 'POST',
          headers: { ...(authHeaders() ?? {}) },
        });
      }
      // Reload to update status
      await loadProfile();
    } catch {
      // ignore
    } finally {
      setActionLoading(false);
    }
  };

  const renderHeader = () => {
    if (!profile) return null;

    let actionLabel = '';
    let actionDisabled = false;

    switch (profile.connectionStatus) {
      case 'self':
        actionLabel = 'Edit Profile'; // Or just hide
        break;
      case 'friend':
        actionLabel = 'Friends';
        actionDisabled = true;
        break;
      case 'sent':
        actionLabel = 'Requested';
        actionDisabled = true;
        break;
      case 'received':
        actionLabel = 'Accept Request';
        break;
      case 'none':
        actionLabel = profile.isPrivate ? 'Request' : 'Add Friend';
        break;
    }

    // Reuse styles from profile.tsx or friends.tsx as much as possible for consistency
    return (
      <View style={styles.header}>
        <View style={styles.avatarContainer}>
          {profile.profileImage?.url ? (
            <Image source={{ uri: profile.profileImage.url }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarPlaceholder]}>
              <ThemedText style={styles.avatarPlaceholderText}>{profile.name[0]?.toUpperCase()}</ThemedText>
            </View>
          )}
        </View>

        <ThemedText type="title" style={styles.name}>{profile.name}</ThemedText>
        <ThemedText style={styles.username}>
          {profile.username ? `@${profile.username}` : ''}
        </ThemedText>

        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold">{profile.friendsCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Friends</ThemedText>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <ThemedText type="defaultSemiBold">{profile.uploadsCount}</ThemedText>
            <ThemedText style={styles.statLabel}>Songs</ThemedText>
          </View>
        </View>

        {currentUser && profile.connectionStatus !== 'self' && (
          <TouchableOpacity
            style={[styles.actionButton, actionDisabled && styles.actionButtonDisabled]}
            onPress={handleAction}
            disabled={actionDisabled || actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <ThemedText style={styles.actionButtonText}>{actionLabel}</ThemedText>
            )}
          </TouchableOpacity>
        )}
        {!currentUser && (
          <ThemedText style={styles.loginHint}>Log in to add friend</ThemedText>
        )}
      </View>
    );
  };

  const { addToQueue } = useQueue();
  const { nowPlaying } = useNowPlaying();

  const playSong = (song: Song) => {
    // Add to queue and play
    addToQueue({
      id: song._id,
      title: song.title,
      subtitle: profile?.name || 'Unknown Artist',
      audioUrl: song.audioUrl,
      coverUrl: song.coverUrl,
      owner: { name: profile?.name || 'Unknown' }
    });

    // Navigate to player
    router.push({
      pathname: '/(tabs)/player',
      params: { songId: song._id }
    });

    // Optionally increment play count
    void fetch(`${API_BASE_URL}/songs/${song._id}/play`, { method: 'POST' }).catch(() => { });
  };

  const renderSong = ({ item }: { item: Song }) => {
    const isActive = nowPlaying?.id === item._id;
    const isPlaying = nowPlaying?.isPlaying && isActive;

    return (
      <CassetteListItem
        title={item.title}
        subtitle={`${profile?.name || 'Artist'} • ${item.playCount} plays`}
        isActive={isActive}
        isPlaying={isPlaying}
        onPress={() => playSong(item)}
      />
    );
  };

  if (loading) {
    return (
      <ThemedView style={styles.center}>
        <Stack.Screen options={{ title: 'Loading...', headerTransparent: true }} />
        <ActivityIndicator size="large" />
      </ThemedView>
    );
  }

  if (error || !profile) {
    return (
      <ThemedView style={styles.center}>
        <Stack.Screen options={{ title: 'Error' }} />
        <ThemedText>{error || 'User not found'}</ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <Stack.Screen
        options={{
          title: profile.username || profile.name,
          headerStyle: { backgroundColor },
          headerTintColor: textColor,
          headerShadowVisible: false,
        }}
      />

      <FlatList
        data={profile.uploads}
        keyExtractor={(item) => item._id}
        renderItem={renderSong}
        ListHeaderComponent={renderHeader()}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={textColor} />
        }
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="musical-note" size={48} color="#6b7280" />
            <ThemedText style={styles.emptyText}>
              {profile.canSeeUploads ? 'No songs uploaded yet.' : 'Account is private.'}
            </ThemedText>
          </View>
        }
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#ffffff1a', // subtle border
    marginBottom: 8,
  },
  avatarContainer: {
    marginBottom: 12,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarPlaceholder: {
    backgroundColor: '#374151',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPlaceholderText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  name: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  username: {
    color: '#9ca3af',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#4b5563',
  },
  actionButton: {
    backgroundColor: '#3b82f6',
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 99,
  },
  actionButtonDisabled: {
    backgroundColor: '#374151',
    opacity: 0.8,
  },
  actionButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  loginHint: {
    fontSize: 12,
    color: '#6b7280',
    fontStyle: 'italic',
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  songCover: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#374151',
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
    marginRight: 12,
  },
  songArtist: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
    opacity: 0.6,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 14,
  },
});

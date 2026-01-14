import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/api';

type UserListItem = {
  id: string;
  name: string;
  username?: string;
  profileImage?: {
    url?: string;
  };
  isPrivate: boolean;
  isFriend: boolean;
  sentRequest: boolean;
  incomingRequest: boolean;
  songsCount?: number;
};

type FriendsData = {
  friends: { _id: string; name: string; username?: string; profileImage?: { url?: string }; isPrivate: boolean }[];
  incomingRequests: {
    _id: string;
    name: string;
    username?: string;
    profileImage?: { url?: string };
    isPrivate: boolean;
  }[];
};

type Mode = 'users' | 'friends';

export default function FriendsScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>('users');
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [users, setUsers] = useState<UserListItem[]>([]);
  const [friends, setFriends] = useState<FriendsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // State for search
  const [searchQuery, setSearchQuery] = useState('');

  // Load token once at mount
  useEffect(() => {
    const loadToken = async () => {
      try {
        const token = await AsyncStorage.getItem('accessToken');
        if (token) {
          setAccessToken(token);
        }
      } catch {
        // ignore
      }
    };

    void loadToken();
  }, []);

  // Also refresh token whenever Friends tab gains focus
  useFocusEffect(
    useCallback(() => {
      const loadToken = async () => {
        try {
          const token = await AsyncStorage.getItem('accessToken');
          if (token) {
            setAccessToken(token);
          }
        } catch {
          // ignore
        }
      };

      void loadToken();
    }, [])
  );

  const authHeaders = () =>
    accessToken
      ? {
        Authorization: `Bearer ${accessToken}`,
      }
      : undefined;

  const loadUsers = useCallback(async (query: string = '') => {
    // Note: Removed accessToken check to allow public searching
    try {
      setLoading(true);
      setError(null);

      const url = query
        ? `${API_BASE_URL}/users?q=${encodeURIComponent(query)}`
        : `${API_BASE_URL}/users?limit=500`;

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders() ?? {}),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'Failed to load users');
        return;
      }
      setUsers(json);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  }, [accessToken]); // dependency on accessToken to refresh friend status if login changes

  const loadFriends = async () => {
    if (!accessToken) {
      setError('Log in on Profile to see friends.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/users/friends`, {
        headers: {
          'Content-Type': 'application/json',
          ...(authHeaders() ?? {}),
        },
      });
      const json = await res.json();
      if (!res.ok) {
        // If token is invalid / expired, guide user to log in again
        if (res.status === 401 || json.message === 'Invalid token') {
          setError('Log in on Profile before viewing your friends.');
        } else {
          setError(json.message || 'Failed to load friends');
        }
        return;
      }
      setFriends(json);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  // Debounced search effect
  useEffect(() => {
    if (mode === 'users') {
      const timer = setTimeout(() => {
        void loadUsers(searchQuery);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mode, searchQuery, loadUsers]);

  // Initial load for friends mode
  useEffect(() => {
    if (mode === 'friends') {
      void loadFriends();
    }
  }, [mode, accessToken]);

  const onRefresh = async () => {
    setRefreshing(true);
    if (mode === 'users') {
      await loadUsers(searchQuery);
    } else {
      await loadFriends();
    }
    setRefreshing(false);
  };

  const sendRequest = async (userId: string) => {
    if (!accessToken) return;
    try {
      await fetch(`${API_BASE_URL}/users/request/${userId}`, {
        method: 'POST',
        headers: {
          ...(authHeaders() ?? {}),
        },
      });
      void loadUsers(searchQuery);
    } catch {
      // ignore
    }
  };

  const acceptRequest = async (userId: string) => {
    if (!accessToken) return;
    try {
      await fetch(`${API_BASE_URL}/users/request/${userId}/accept`, {
        method: 'POST',
        headers: {
          ...(authHeaders() ?? {}),
        },
      });
      void loadFriends();
      void loadUsers(searchQuery);
    } catch {
      // ignore
    }
  };

  const renderUser = ({ item }: { item: UserListItem }) => {
    let actionLabel = '';
    let disabled = false;

    if (item.isFriend) {
      actionLabel = 'Friends';
      disabled = true;
    } else if (item.sentRequest) {
      actionLabel = 'Requested';
      disabled = true;
    } else if (item.incomingRequest) {
      actionLabel = 'Accept';
    } else {
      actionLabel = item.isPrivate ? 'Request' : 'Add friend';
    }

    // Only show action buttons if logged in
    const showActions = !!accessToken;

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item.id } })}
      >
        {item.profileImage?.url ? (
          <Image source={{ uri: item.profileImage.url }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
          </View>
        )}
        <View style={styles.rowMain}>
          <ThemedText type="defaultSemiBold">
            {item.username ? `@${item.username}` : item.name}
          </ThemedText>
          <View style={styles.metaRow}>
            {item.songsCount !== undefined && (
              <ThemedText style={styles.songCountLabel}>
                {item.songsCount} {item.songsCount === 1 ? 'song' : 'songs'}
              </ThemedText>
            )}
            {item.songsCount !== undefined && <ThemedText style={styles.dotSeparator}>•</ThemedText>}
            <ThemedText style={styles.privacy}>
              {item.isPrivate ? 'Private' : 'Public'}
            </ThemedText>
          </View>
        </View>
        {showActions && (
          <TouchableOpacity
            disabled={disabled}
            style={[styles.chip, disabled && styles.chipDisabled]}
            onPress={() => {
              if (item.incomingRequest && !item.isFriend) {
                void acceptRequest(item.id);
              } else if (!disabled) {
                void sendRequest(item.id);
              }
            }}
          >
            <Text style={styles.chipText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </TouchableOpacity>
    );
  };

  const renderFriends = () => {
    if (!friends) return null;

    return (
      <>
        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Friends
        </ThemedText>
        {friends.friends.map((item) => (
          <TouchableOpacity
            key={item._id}
            style={styles.row}
            onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item._id } })}
          >
            {item.profileImage?.url ? (
              <Image source={{ uri: item.profileImage.url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.rowMain}>
              <ThemedText type="defaultSemiBold">
                {item.username ? `@${item.username}` : item.name}
              </ThemedText>
            </View>
          </TouchableOpacity>
        ))}

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Incoming requests
        </ThemedText>
        {friends.incomingRequests.map((item) => (
          <TouchableOpacity
            key={item._id}
            style={styles.row}
            onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item._id } })}
          >
            {item.profileImage?.url ? (
              <Image source={{ uri: item.profileImage.url }} style={styles.avatarImage} />
            ) : (
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.rowMain}>
              <ThemedText type="defaultSemiBold">
                {item.username ? `@${item.username}` : item.name}
              </ThemedText>
            </View>
            <TouchableOpacity
              style={styles.chip}
              onPress={() => void acceptRequest(item._id)}
            >
              <Text style={styles.chipText}>Accept</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        ))}
      </>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={() => setMode('users')}
          style={styles.tabButton}
        >
          <View style={[styles.tabContent, mode === 'users' && styles.tabContentActive]}>
            {mode === 'users' && <View style={styles.circleIndicator} />}
            <ThemedText style={[styles.tabText, mode === 'users' && styles.tabActive]}>
              Users
            </ThemedText>
          </View>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setMode('friends')}
          style={styles.tabButton}
        >
          <View style={[styles.tabContent, mode === 'friends' && styles.tabContentActive]}>
            {mode === 'friends' && <View style={styles.circleIndicator} />}
            <ThemedText style={[styles.tabText, mode === 'friends' && styles.tabActive]}>
              Community & Requests
            </ThemedText>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Input for Users Mode */}
      {mode === 'users' && (
        <View style={styles.searchContainer}>
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText>{error}</ThemedText>
        </View>
      ) : mode === 'users' ? (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={renderUser}
          contentContainerStyle={styles.list}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
          }
        />
      ) : (
        <ScrollView
          style={styles.list}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
          }
        >
          {renderFriends()}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 24,
    marginTop: 20,
    marginBottom: 8,
  },
  tabButton: {
    position: 'relative',
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 25,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#6b7280',
  },
  tabContentActive: {
    backgroundColor: '#3b82f6',
    borderColor: '#3b82f6',
    borderWidth: 2,
  },
  circleIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#ffffff',
    marginRight: 8,
    borderWidth: 2,
    borderColor: '#93c5fd',
  },
  tabText: {
    opacity: 0.6,
  },
  tabActive: {
    opacity: 1,
    fontWeight: '700',
    color: '#ffffff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#374151', // More visible border
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1f2937', // Lighter background
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    borderWidth: 2, // Add border for visibility
    borderColor: '#3b82f6', // Blue border to stand out
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    borderWidth: 2, // Add border to images too
    borderColor: '#3b82f6', // Blue border
  },
  avatarText: {
    color: '#ffffff',
    fontWeight: '700',
  },
  rowMain: {
    flex: 1,
  },
  email: {
    fontSize: 12,
    opacity: 0,
  },
  privacy: {
    fontSize: 12,
    color: '#9ca3af',
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: '#60a5fa', // Brighter blue border
    backgroundColor: '#1e3a8a', // Dark blue background
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    color: '#ffffff', // Pure white for better contrast
    fontSize: 12,
    fontWeight: '600', // Bolder text
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 4,
  },
  listContent: {
    paddingBottom: 20,
  },
  searchContainer: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  searchInput: {
    backgroundColor: '#1f2937',
    color: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  songCountLabel: {
    fontSize: 12,
    color: '#9ca3af',
  },
  dotSeparator: {
    fontSize: 12,
    color: '#6b7280',
    marginHorizontal: 2,
  },
});


import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/api';

type UserListItem = {
  id: string;
  name: string;
  email: string;
  isPrivate: boolean;
  isFriend: boolean;
  sentRequest: boolean;
  incomingRequest: boolean;
};

type FriendsData = {
  friends: { _id: string; name: string; email: string; isPrivate: boolean }[];
  incomingRequests: { _id: string; name: string; email: string; isPrivate: boolean }[];
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

  const loadUsers = async () => {
    if (!accessToken) {
      setError('Log in on Profile to see users.');
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_BASE_URL}/users`, {
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
  };

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
        setError(json.message || 'Failed to load friends');
        return;
      }
      setFriends(json);
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'users') {
      void loadUsers();
    } else {
      void loadFriends();
    }
  }, [mode, accessToken]);

  const sendRequest = async (userId: string) => {
    if (!accessToken) return;
    try {
      await fetch(`${API_BASE_URL}/users/request/${userId}`, {
        method: 'POST',
        headers: {
          ...(authHeaders() ?? {}),
        },
      });
      void loadUsers();
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
      void loadUsers();
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

    return (
      <TouchableOpacity
        style={styles.row}
        onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item.id } })}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
        </View>
        <View style={styles.rowMain}>
          <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
          <ThemedText style={styles.email}>{item.email}</ThemedText>
          <ThemedText style={styles.privacy}>
            {item.isPrivate ? 'Private account' : 'Public account'}
          </ThemedText>
        </View>
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
        <FlatList
          data={friends.friends}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item._id } })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.rowMain}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <ThemedText style={styles.email}>{item.email}</ThemedText>
              </View>
            </TouchableOpacity>
          )}
        />

        <ThemedText type="subtitle" style={styles.sectionTitle}>
          Incoming requests
        </ThemedText>
        <FlatList
          data={friends.incomingRequests}
          keyExtractor={(item) => item._id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.row}
              onPress={() => router.push({ pathname: '/user/[userId]', params: { userId: item._id } })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.name[0]?.toUpperCase()}</Text>
              </View>
              <View style={styles.rowMain}>
                <ThemedText type="defaultSemiBold">{item.name}</ThemedText>
                <ThemedText style={styles.email}>{item.email}</ThemedText>
              </View>
              <TouchableOpacity
                style={styles.chip}
                onPress={() => void acceptRequest(item._id)}
              >
                <Text style={styles.chipText}>Accept</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      </>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => setMode('users')}>
          <ThemedText style={[styles.tabText, mode === 'users' && styles.tabActive]}>
            Users
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => setMode('friends')}>
          <ThemedText style={[styles.tabText, mode === 'friends' && styles.tabActive]}>
            Friends & Requests
          </ThemedText>
        </TouchableOpacity>
      </View>

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
        />
      ) : (
        <View style={styles.list}>{renderFriends()}</View>
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
    marginBottom: 8,
  },
  tabText: {
    opacity: 0.6,
  },
  tabActive: {
    opacity: 1,
    fontWeight: '700',
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
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#333',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#ffffff11',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
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
    opacity: 0.8,
  },
  privacy: {
    fontSize: 11,
    opacity: 0.7,
    marginTop: 2,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  chipDisabled: {
    opacity: 0.5,
  },
  chipText: {
    color: '#e5e7eb',
    fontSize: 12,
  },
  sectionTitle: {
    marginTop: 12,
    marginBottom: 4,
  },
});


import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/api';

type ProfileUpload = {
  _id: string;
  title: string;
  category?: string;
  coverUrl?: string;
  isPublic: boolean;
};

type PublicProfile = {
  id: string;
  name: string;
  email: string;
  isPrivate: boolean;
  profileImage?: { url?: string };
  friendsCount: number;
  uploadsCount: number;
  isSelf: boolean;
  isFriend: boolean;
  canSeeUploads: boolean;
  uploads: ProfileUpload[];
};

export default function UserProfileScreen() {
  const router = useRouter();
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const load = async () => {
        try {
          const token = await AsyncStorage.getItem('accessToken');
          if (!token) {
            setError('Please log in to view profiles.');
            setLoading(false);
            return;
          }
          setAccessToken(token);
          setLoading(true);
          setError(null);

          const res = await fetch(`${API_BASE_URL}/users/${userId}/profile`, {
            headers: {
              Authorization: `Bearer ${token}`,
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
      };

      void load();
    }, [userId])
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ThemedView style={styles.center}>
          <ActivityIndicator color="#ffffff" />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safe}>
        <ThemedView style={styles.center}>
          <ThemedText>{error || 'Profile not found.'}</ThemedText>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ThemedView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText>{'< Back'}</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title">{profile.name}</ThemedText>
          <View style={{ width: 60 }} />
        </View>

        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            {profile.profileImage?.url ? (
              <Image source={{ uri: profile.profileImage.url }} style={styles.avatarImage} />
            ) : null}
          </View>
          <View>
            <ThemedText style={styles.handle}>{profile.email}</ThemedText>
            <ThemedText style={styles.metaText}>
              {profile.friendsCount} friends • {profile.uploadsCount} uploads
            </ThemedText>
            {profile.isPrivate && !profile.isSelf && !profile.isFriend && (
              <ThemedText style={styles.metaText}>Private account</ThemedText>
            )}
          </View>
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Uploads</ThemedText>
          {!profile.canSeeUploads ? (
            <ThemedText style={{ opacity: 0.7 }}>
              You must be friends with this user to see their uploads.
            </ThemedText>
          ) : profile.uploads.length === 0 ? (
            <ThemedText style={{ opacity: 0.7 }}>No uploads yet.</ThemedText>
          ) : (
            profile.uploads.map((song) => (
              <View key={song._id} style={styles.songRow}>
                <View style={styles.songCover}>
                  {song.coverUrl ? (
                    <Image source={{ uri: song.coverUrl }} style={styles.songCoverImage} />
                  ) : null}
                </View>
                <View style={{ flex: 1 }}>
                  <ThemedText type="defaultSemiBold">{song.title}</ThemedText>
                  <ThemedText style={styles.songMeta}>
                    {song.category || 'Uncategorized'} • {song.isPublic ? '🌐 Public' : '🔒 Private'}
                  </ThemedText>
                </View>
              </View>
            ))
          )}
        </View>
      </ThemedView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#050816',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 24,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24,
    gap: 16,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#ffffff11',
    borderWidth: 2,
    borderColor: '#ffffff',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 40,
  },
  handle: {
    opacity: 0.8,
  },
  metaText: {
    fontSize: 12,
    opacity: 0.7,
  },
  section: {
    marginTop: 24,
    gap: 4,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  songCover: {
    width: 46,
    height: 46,
    borderRadius: 10,
    backgroundColor: '#111827',
    marginRight: 10,
    overflow: 'hidden',
  },
  songCoverImage: {
    width: '100%',
    height: '100%',
  },
  songMeta: {
    fontSize: 12,
    opacity: 0.7,
  },
});



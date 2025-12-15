import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/api';

type AuthMode = 'login' | 'register';

type User = {
  id: string;
  name: string;
  email: string;
  isPrivate?: boolean;
  profileImage?: {
    url?: string;
  };
  friends?: string[];
  friendRequests?: string[];
};

type MySong = {
  _id: string;
  title: string;
  category?: string;
  coverUrl?: string;
  isPublic: boolean;
};

export default function ProfileScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('register');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [songTitle, setSongTitle] = useState('');
  const [songCategory, setSongCategory] = useState('');
  const [songIsPublic, setSongIsPublic] = useState(true);
  const [coverAsset, setCoverAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [audioAsset, setAudioAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [uploadingSong, setUploadingSong] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mySongs, setMySongs] = useState<MySong[]>([]);

  const onSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoint = mode === 'register' ? '/auth/register' : '/auth/login';
      const body: any = { email, password };
      if (mode === 'register') body.name = name;

      const res = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const json = await res.json();

      if (!res.ok) {
        setError(json.message || 'Something went wrong');
        return;
      }

      setUser(json.user);
      const token = json.tokens?.accessToken ?? null;
      setAccessToken(token);
      if (token) {
        await AsyncStorage.setItem('accessToken', token);
      }
    } catch (e) {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  const onLogout = () => {
    setUser(null);
    setAccessToken(null);
    setPassword('');
    void AsyncStorage.removeItem('accessToken');
  };

  const pickCover = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setCoverAsset(result.assets[0]);
    }
  };

  const pickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAudioAsset(result.assets[0]);
    }
  };

  const uploadSong = async () => {
    if (!accessToken) return;
    if (!songTitle || !audioAsset) {
      setUploadError('Title and audio are required');
      return;
    }

    try {
      setUploadingSong(true);
      setUploadError(null);

      const form = new FormData();
      form.append('title', songTitle);
      if (songCategory) form.append('category', songCategory);
      form.append('isPublic', String(songIsPublic));

      form.append('audio', {
        uri: audioAsset.uri,
        name: audioAsset.name ?? 'audio.mp3',
        type: audioAsset.mimeType ?? 'audio/mpeg',
      } as any);

      if (coverAsset) {
        form.append('cover', {
          uri: coverAsset.uri,
          name: coverAsset.name ?? 'cover.jpg',
          type: coverAsset.mimeType ?? 'image/jpeg',
        } as any);
      }

      const res = await fetch(`${API_BASE_URL}/songs/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setUploadError(json.message || 'Failed to upload song');
        return;
      }

      // Reset form on success
      setSongTitle('');
      setSongCategory('');
      setSongIsPublic(true);
      setCoverAsset(null);
      setAudioAsset(null);

      // Reload my songs list
      await loadMySongs(accessToken);
    } catch (e) {
      setUploadError('Network error while uploading');
    } finally {
      setUploadingSong(false);
    }
  };

  const loadMySongs = async (token: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/songs/mine`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!res.ok) return;
      setMySongs(json);
    } catch {
      // ignore
    }
  };

  // Refresh profile and my songs when screen comes into focus (e.g. after returning from Settings)
  useFocusEffect(
    useCallback(() => {
      if (!accessToken) return;
      const loadProfile = async () => {
        try {
          const res = await fetch(`${API_BASE_URL}/users/me`, {
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          });
          const json = await res.json();
          if (!res.ok) return;
          setUser(json);
        } catch {
          // ignore
        }
      };

      void loadProfile();
      void loadMySongs(accessToken);
    }, [accessToken])
  );

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.avatar} />
        <ThemedText type="title" style={styles.name}>
          {mode === 'register' ? 'Create your profile' : 'Welcome back'}
        </ThemedText>

        <View style={styles.toggleRow}>
          <TouchableOpacity onPress={() => setMode('register')}>
            <ThemedText style={[styles.toggleText, mode === 'register' && styles.toggleActive]}>
              Sign up
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setMode('login')}>
            <ThemedText style={[styles.toggleText, mode === 'login' && styles.toggleActive]}>
              Log in
            </ThemedText>
          </TouchableOpacity>
        </View>

        {mode === 'register' && (
          <TextInput
            style={styles.input}
            placeholder="Name"
            placeholderTextColor="#6b7280"
            value={name}
            onChangeText={setName}
          />
        )}

        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor="#6b7280"
          autoCapitalize="none"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#6b7280"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        {error && (
          <ThemedText style={styles.errorText}>
            {error}
          </ThemedText>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={() => void onSubmit()} disabled={loading}>
          {loading ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <ThemedText style={styles.primaryButtonText}>
              {mode === 'register' ? 'Create profile' : 'Log in'}
            </ThemedText>
          )}
        </TouchableOpacity>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.avatarRow}>
        <View style={styles.avatar}>
          {user.profileImage?.url && (
            <Image source={{ uri: user.profileImage.url }} style={styles.avatarImage} />
          )}
        </View>
        <TouchableOpacity
          onPress={() => {
            if (!accessToken) return;
            router.push({ pathname: '/settings', params: { token: accessToken } });
          }}
        >
          <Ionicons name="settings-outline" size={22} color="#e5e7eb" />
        </TouchableOpacity>
      </View>
      <ThemedText type="title" style={styles.name}>
        {user.name}
      </ThemedText>
      <ThemedText style={styles.handle}>{user.email}</ThemedText>

      <View style={styles.section}>
        <ThemedText type="subtitle">Stats</ThemedText>
        <ThemedText>
          {(user.friends?.length ?? 0) || 0} friends • {(user.friendRequests?.length ?? 0) || 0} requests
        </ThemedText>
      </View>

      <View style={styles.section}>
        <ThemedText type="subtitle">Your songs</ThemedText>
        {mySongs.length === 0 ? (
          <ThemedText style={{ opacity: 0.7 }}>You haven&apos;t uploaded any songs yet.</ThemedText>
        ) : (
          mySongs.map((song) => (
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

      <View style={styles.section}>
        <ThemedText type="subtitle">Upload song</ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Song title"
          placeholderTextColor="#6b7280"
          value={songTitle}
          onChangeText={setSongTitle}
        />
        <TextInput
          style={styles.input}
          placeholder="Category (e.g. Chill, Workout)"
          placeholderTextColor="#6b7280"
          value={songCategory}
          onChangeText={setSongCategory}
        />

        <View style={styles.toggleRow}>
          <TouchableOpacity onPress={() => setSongIsPublic(true)}>
            <ThemedText style={[styles.toggleText, songIsPublic && styles.toggleActive]}>
              🌐 Public
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setSongIsPublic(false)}>
            <ThemedText style={[styles.toggleText, !songIsPublic && styles.toggleActive]}>
              🔒 Private (friends)
            </ThemedText>
          </TouchableOpacity>
        </View>

        <View style={styles.uploadRow}>
          <TouchableOpacity style={styles.chipButton} onPress={() => void pickCover()}>
            <ThemedText style={styles.chipButtonText}>
              {coverAsset ? 'Change cover' : 'Pick cover image'}
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chipButton} onPress={() => void pickAudio()}>
            <ThemedText style={styles.chipButtonText}>
              {audioAsset ? 'Change audio' : 'Pick audio file'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        {uploadError && (
          <ThemedText style={styles.errorText}>{uploadError}</ThemedText>
        )}

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={() => void uploadSong()}
          disabled={uploadingSong}
        >
          {uploadingSong ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <ThemedText style={styles.primaryButtonText}>Upload song</ThemedText>
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.secondaryButton} onPress={onLogout}>
        <ThemedText style={styles.secondaryButtonText}>Log out</ThemedText>
      </TouchableOpacity>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
    paddingTop: 40,
    paddingHorizontal: 16,
    paddingBottom: 32,
    gap: 12,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: '#ffffff11',
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 48,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsText: {
    fontSize: 18,
  },
  name: {
    marginTop: 8,
  },
  handle: {
    opacity: 0.7,
  },
  section: {
    width: '100%',
    marginTop: 24,
    gap: 4,
  },
  toggleRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  toggleText: {
    opacity: 0.6,
  },
  toggleActive: {
    fontWeight: '700',
    opacity: 1,
  },
  input: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#1f2937',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 12,
    color: '#e5e7eb',
    backgroundColor: '#020617',
  },
  primaryButton: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 12,
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  primaryButtonText: {
    color: '#020617',
    fontWeight: '700',
    fontSize: 16,
  },
  secondaryButton: {
    marginTop: 24,
    paddingHorizontal: 24,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
  },
  secondaryButtonText: {
    color: '#e5e7eb',
  },
  errorText: {
    marginTop: 8,
    color: '#f97373',
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  chipButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#4b5563',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  chipButtonText: {
    color: '#e5e7eb',
    fontSize: 13,
  },
  chipButtonActive: {
    backgroundColor: '#ffffff11',
    borderColor: '#e5e7eb',
  },
  privacyHint: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
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



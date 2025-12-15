import React, { useEffect, useState } from 'react';
import { ActivityIndicator, SafeAreaView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/api';

type User = {
  id: string;
  name: string;
  email: string;
  isPrivate?: boolean;
  profileImage?: {
    url?: string;
  };
};

export default function SettingsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ token?: string }>();
  const tokenFromParams = params.token as string | undefined;

  const [accessToken] = useState<string | undefined>(tokenFromParams);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatar, setAvatar] = useState<DocumentPicker.DocumentPickerAsset | null>(null);

  useEffect(() => {
    const loadMe = async () => {
      if (!accessToken) {
        setError('Missing session. Please log in again.');
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/users/me`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });
        const json = await res.json();
        if (!res.ok) {
          setError(json.message || 'Failed to load profile');
          return;
        }
        setUser(json);
        setName(json.name);
        setIsPrivate(json.isPrivate ?? false);
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    void loadMe();
  }, [accessToken]);

  const pickAvatar = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setAvatar(result.assets[0]);
    }
  };

  const save = async () => {
    if (!accessToken) return;
    try {
      setSaving(true);
      setError(null);

      const form = new FormData();
      if (name) form.append('name', name);
      form.append('isPrivate', String(isPrivate));
      if (avatar) {
        form.append('avatar', {
          uri: avatar.uri,
          name: avatar.name ?? 'avatar.jpg',
          type: avatar.mimeType ?? 'image/jpeg',
        } as any);
      }

      const res = await fetch(`${API_BASE_URL}/users/me/profile`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.message || 'Failed to save settings');
        return;
      }
      setUser(json);
      setName(json.name);
      setIsPrivate(json.isPrivate ?? false);
      setAvatar(null);
      router.back();
    } catch {
      setError('Network error while saving');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <ThemedView style={styles.center}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <ThemedView style={styles.center}>
          <ThemedText>{error || 'No profile loaded.'}</ThemedText>
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
          <ThemedText type="title">Settings</ThemedText>
          <View style={{ width: 60 }} />
        </View>

        <ThemedText type="subtitle" style={{ marginTop: 16 }}>
          Profile
        </ThemedText>
        <TextInput
          style={styles.input}
          placeholder="Display name"
          placeholderTextColor="#6b7280"
          value={name}
          onChangeText={setName}
        />

        <View style={styles.uploadRow}>
          <TouchableOpacity style={styles.chipButton} onPress={() => void pickAvatar()}>
            <ThemedText style={styles.chipButtonText}>
              {avatar ? 'Change avatar' : 'Pick avatar image'}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedText type="subtitle" style={{ marginTop: 24 }}>
          Account privacy
        </ThemedText>
        <ThemedText style={styles.privacyHint}>
          {isPrivate
            ? 'Private: only accepted friends can see your uploads.'
            : 'Public: your public uploads can appear in Explore.'}
        </ThemedText>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[styles.chipButton, !isPrivate && styles.chipButtonActive]}
            onPress={() => setIsPrivate(false)}
          >
            <ThemedText style={styles.chipButtonText}>🌐 Public</ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.chipButton, isPrivate && styles.chipButtonActive]}
            onPress={() => setIsPrivate(true)}
          >
            <ThemedText style={styles.chipButtonText}>🔒 Private</ThemedText>
          </TouchableOpacity>
        </View>

        {error && (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        )}

        <TouchableOpacity style={styles.primaryButton} onPress={() => void save()} disabled={saving}>
          {saving ? (
            <ActivityIndicator color="#020617" />
          ) : (
            <ThemedText style={styles.primaryButtonText}>Save changes</ThemedText>
          )}
        </TouchableOpacity>
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
    paddingTop: 24,
    paddingHorizontal: 16,
    gap: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  primaryButton: {
    width: '100%',
    borderRadius: 999,
    paddingVertical: 12,
    marginTop: 24,
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  primaryButtonText: {
    color: '#020617',
    fontWeight: '700',
    fontSize: 16,
  },
  errorText: {
    marginTop: 8,
    color: '#f97373',
  },
});



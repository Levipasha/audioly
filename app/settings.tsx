import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as DocumentPicker from 'expo-document-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/api';
import { useTheme } from '@/components/theme-context';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';

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

  const themeTextColor = useThemeColor({}, 'text');
  const themeMutedTextColor = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const themeBg = useThemeColor({}, 'background');
  const themeBorder = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const themeCardBg = useThemeColor({ light: '#ffffff', dark: '#0b1220' }, 'background');
  const themeChipBg = useThemeColor({ light: '#f3f4f6', dark: '#111827' }, 'background');
  const themePrimaryActionBg = useThemeColor({ light: '#111827', dark: '#ffffff' }, 'background');
  const themePrimaryActionText = useThemeColor({ light: '#ffffff', dark: '#020617' }, 'text');

  const [accessToken, setAccessToken] = useState<string | undefined>(tokenFromParams);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [avatar, setAvatar] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  
  const { colorMode, setColorMode } = useTheme();

  useEffect(() => {
    const resolveToken = async () => {
      if (tokenFromParams) {
        setAccessToken(tokenFromParams);
        return;
      }
      try {
        const saved = await AsyncStorage.getItem('accessToken');
        if (saved) setAccessToken(saved);
      } catch {
        // ignore
      }
    };
    void resolveToken();
  }, [tokenFromParams]);

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
        if (res.status === 401) {
          setError('Session expired. Please log in again.');
          setUser(null);
          try {
            await AsyncStorage.removeItem('accessToken');
          } catch {
            // ignore
          }
          return;
        }
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
      <SafeAreaView style={[styles.safe, { backgroundColor: themeBg }]}>
        <ThemedView style={styles.center}>
          <ActivityIndicator />
        </ThemedView>
      </SafeAreaView>
    );
  }

  if (!user) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: themeBg }]}>
        <ThemedView style={styles.center}>
          <ThemedText>{error || 'No profile loaded.'}</ThemedText>
          <TouchableOpacity
            style={[styles.primaryButton, { backgroundColor: themePrimaryActionBg, marginTop: 16 }]}
            onPress={() => router.back()}
          >
            <ThemedText style={[styles.primaryButtonText, { color: themePrimaryActionText }]}>
              Go back
            </ThemedText>
          </TouchableOpacity>
        </ThemedView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: themeBg }]}>
      <ThemedView style={styles.container}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => router.back()}>
            <ThemedText>{'< Back'}</ThemedText>
          </TouchableOpacity>
          <ThemedText type="title">Settings</ThemedText>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

        <ThemedText type="subtitle" style={{ marginTop: 16 }}>
          Profile
        </ThemedText>
        <TextInput
          style={[
            styles.input,
            {
              borderColor: themeBorder,
              backgroundColor: themeCardBg,
              color: themeTextColor,
            },
          ]}
          placeholder="Display name"
          placeholderTextColor={themeMutedTextColor}
          value={name}
          onChangeText={setName}
        />

        {/* Profile Picture Preview */}
        <View style={styles.avatarPreviewContainer}>
          <View
          style={[
            styles.avatarPreview,
            {
              backgroundColor: themeChipBg,
              borderColor: themeBorder,
            },
          ]}
        >
            {avatar ? (
              <Image source={{ uri: avatar.uri }} style={styles.avatarPreviewImage} />
            ) : user.profileImage?.url ? (
              <Image source={{ uri: user.profileImage.url }} style={styles.avatarPreviewImage} />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <Ionicons name="person" size={40} color={themeMutedTextColor} />
              </View>
            )}
          </View>
          <TouchableOpacity
            style={[styles.chipButton, { borderColor: themeBorder, backgroundColor: themeChipBg }]}
            onPress={() => void pickAvatar()}
          >
            <ThemedText style={[styles.chipButtonText, { color: themeTextColor }]}>
              {avatar ? 'Change avatar' : 'Pick avatar image'}
            </ThemedText>
          </TouchableOpacity>
          {avatar && (
            <TouchableOpacity
              style={styles.removeAvatarButton}
              onPress={() => setAvatar(null)}
            >
              <ThemedText style={styles.removeAvatarText}>Remove</ThemedText>
            </TouchableOpacity>
          )}
        </View>

        <ThemedText type="subtitle" style={{ marginTop: 24 }}>
          Appearance
        </ThemedText>
        <ThemedText style={styles.privacyHint}>
          Choose your preferred color mode
        </ThemedText>
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.chipButton,
              { borderColor: themeBorder, backgroundColor: themeChipBg },
              colorMode === 'light' && { backgroundColor: themePrimaryActionBg, borderColor: themePrimaryActionBg },
            ]}
            onPress={() => setColorMode('light')}
          >
            <Ionicons
              name="sunny-outline"
              size={16}
              color={colorMode === 'light' ? themePrimaryActionText : themeMutedTextColor}
            />
            <ThemedText
              style={[
                styles.chipButtonText,
                {
                  marginLeft: 6,
                  color: colorMode === 'light' ? themePrimaryActionText : themeTextColor,
                },
              ]}
            >
              Light
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chipButton,
              { borderColor: themeBorder, backgroundColor: themeChipBg },
              colorMode === 'dark' && { backgroundColor: themePrimaryActionBg, borderColor: themePrimaryActionBg },
            ]}
            onPress={() => setColorMode('dark')}
          >
            <Ionicons
              name="moon-outline"
              size={16}
              color={colorMode === 'dark' ? themePrimaryActionText : themeMutedTextColor}
            />
            <ThemedText
              style={[
                styles.chipButtonText,
                {
                  marginLeft: 6,
                  color: colorMode === 'dark' ? themePrimaryActionText : themeTextColor,
                },
              ]}
            >
              Dark
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chipButton,
              { borderColor: themeBorder, backgroundColor: themeChipBg },
              colorMode === 'system' && { backgroundColor: themePrimaryActionBg, borderColor: themePrimaryActionBg },
            ]}
            onPress={() => setColorMode('system')}
          >
            <Ionicons
              name="phone-portrait-outline"
              size={16}
              color={colorMode === 'system' ? themePrimaryActionText : themeMutedTextColor}
            />
            <ThemedText
              style={[
                styles.chipButtonText,
                {
                  marginLeft: 6,
                  color: colorMode === 'system' ? themePrimaryActionText : themeTextColor,
                },
              ]}
            >
              System
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
            style={[
              styles.chipButton,
              { borderColor: themeBorder, backgroundColor: themeChipBg },
              !isPrivate && { backgroundColor: themePrimaryActionBg, borderColor: themePrimaryActionBg },
            ]}
            onPress={() => setIsPrivate(false)}
          >
            <ThemedText
              style={[
                styles.chipButtonText,
                { color: !isPrivate ? themePrimaryActionText : themeTextColor },
              ]}
            >
              🌐 Public
            </ThemedText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.chipButton,
              { borderColor: themeBorder, backgroundColor: themeChipBg },
              isPrivate && { backgroundColor: themePrimaryActionBg, borderColor: themePrimaryActionBg },
            ]}
            onPress={() => setIsPrivate(true)}
          >
            <ThemedText
              style={[
                styles.chipButtonText,
                { color: isPrivate ? themePrimaryActionText : themeTextColor },
              ]}
            >
              🔒 Private
            </ThemedText>
          </TouchableOpacity>
        </View>

        {error && (
          <ThemedText style={styles.errorText}>{error}</ThemedText>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, { backgroundColor: themePrimaryActionBg }]}
          onPress={() => void save()}
          disabled={saving}
        >
          {saving ? (
            <ActivityIndicator color={themePrimaryActionText} />
          ) : (
            <ThemedText style={[styles.primaryButtonText, { color: themePrimaryActionText }]}>
              Save changes
            </ThemedText>
          )}
        </TouchableOpacity>
        </ScrollView>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 24,
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
  avatarPreviewContainer: {
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 12,
  },
  avatarPreview: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#1f2937',
    borderWidth: 2,
    borderColor: '#ffffff',
    marginBottom: 16,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarPreviewImage: {
    width: '100%',
    height: '100%',
  },
  avatarPlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeAvatarButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  removeAvatarText: {
    color: '#ef4444',
    fontSize: 14,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
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
  toggleRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    flexWrap: 'wrap',
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



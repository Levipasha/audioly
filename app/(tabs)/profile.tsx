import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import CryptoJS from 'crypto-js';
import * as DocumentPicker from 'expo-document-picker';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';

import { useAuth } from '@/components/auth-context';
import { AuthForm } from '@/components/auth-form';
import { usePlaylist } from '@/components/playlist-context';
import { useTheme } from '@/components/theme-context';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/api';
import { useThemeColor } from '@/hooks/use-theme-color';
import { getDownloadedSongs, type DownloadedSong } from '@/utils/downloads';

type User = {
  id: string;
  name: string;
  email: string;
  username?: string;
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
  audioUrl: string;
  isPublic: boolean;
};

export default function ProfileScreen() {
  const router = useRouter();
  const { user, accessToken, logout, updateUser } = useAuth();
  const { likedSongs } = usePlaylist();
  const { colorMode, setColorMode } = useTheme();

  const themeTextColor = useThemeColor({}, 'text');
  const themeMutedTextColor = useThemeColor({ light: '#6b7280', dark: '#9ca3af' }, 'text');
  const themeBorderColor = useThemeColor({ light: '#e5e7eb', dark: '#1f2937' }, 'background');
  const themeCardBg = useThemeColor({ light: '#ffffff', dark: '#0b1220' }, 'background');
  const themeChipBg = useThemeColor({ light: '#f3f4f6', dark: '#111827' }, 'background');
  const themePrimaryActionBg = useThemeColor({ light: '#111827', dark: '#ffffff' }, 'background');
  const themePrimaryActionText = useThemeColor({ light: '#ffffff', dark: '#020617' }, 'text');
  const themeIconColor = themeMutedTextColor;

  // Local state for song management
  const [songTitle, setSongTitle] = useState('');
  const [songCategory, setSongCategory] = useState('');
  const [songIsPublic, setSongIsPublic] = useState(true);
  const [coverAsset, setCoverAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [audioAssets, setAudioAssets] = useState<DocumentPicker.DocumentPickerAsset[]>([]);
  const [uploadingSong, setUploadingSong] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(
    null,
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [mySongs, setMySongs] = useState<MySong[]>([]);
  const [editingSong, setEditingSong] = useState<MySong | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editIsPublic, setEditIsPublic] = useState(true);
  const [editCoverAsset, setEditCoverAsset] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [deletingSongId, setDeletingSongId] = useState<string | null>(null);
  const [downloadedSongs, setDownloadedSongs] = useState<DownloadedSong[]>([]);
  const [loadingDownloads, setLoadingDownloads] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);

  const [showSettings, setShowSettings] = useState(false);
  const [settingsName, setSettingsName] = useState('');
  const [settingsIsPrivate, setSettingsIsPrivate] = useState(false);
  const [settingsAvatar, setSettingsAvatar] = useState<DocumentPicker.DocumentPickerAsset | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  const onLogout = async () => {
    await logout();
  };

  useEffect(() => {
    if (!user) return;
    setSettingsName(user.name ?? '');
    setSettingsIsPrivate(Boolean(user.isPrivate));
  }, [user]);

  const pickSettingsAvatar = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      multiple: false,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setSettingsAvatar(result.assets[0]);
    }
  };

  const saveSettings = async () => {
    if (!accessToken) return;
    try {
      setSavingSettings(true);
      setSettingsError(null);

      const form = new FormData();
      if (settingsName.trim()) form.append('name', settingsName.trim());
      form.append('isPrivate', String(settingsIsPrivate));
      if (settingsAvatar) {
        form.append('avatar', {
          uri: settingsAvatar.uri,
          name: settingsAvatar.name ?? 'avatar.jpg',
          type: settingsAvatar.mimeType ?? 'image/jpeg',
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
        setSettingsError(json.message || 'Failed to save settings');
        return;
      }

      setSettingsAvatar(null);
      await updateUser(json);
    } catch {
      setSettingsError('Network error while saving');
    } finally {
      setSavingSettings(false);
    }
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
      multiple: true,
      copyToCacheDirectory: true,
    });
    if (!result.canceled && result.assets?.length) {
      setAudioAssets(result.assets);
      setShowUploadForm(true);
    }
  };

  const pickEditCover = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['image/*'],
      multiple: false,
      copyToCacheDirectory: false,
    });
    if (!result.canceled && result.assets?.[0]) {
      setEditCoverAsset(result.assets[0]);
    }
  };

  const handleUpdateSong = async () => {
    if (!accessToken || !editingSong) return;
    if (!editTitle.trim()) {
      setUploadError('Title is required');
      return;
    }

    try {
      setUploadingSong(true);
      setUploadError(null);

      const form = new FormData();
      form.append('title', editTitle.trim());
      if (editCategory.trim()) form.append('category', editCategory.trim());
      form.append('isPublic', String(editIsPublic));

      if (editCoverAsset) {
        form.append('cover', {
          uri: editCoverAsset.uri,
          name: editCoverAsset.name ?? 'cover.jpg',
          type: editCoverAsset.mimeType ?? 'image/jpeg',
        } as any);
      }

      const res = await fetch(`${API_BASE_URL}/songs/${editingSong._id}`, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
        body: form,
      });

      const json = await res.json();

      if (!res.ok) {
        setUploadError(json.message || 'Failed to update song');
        return;
      }

      // Reload songs and close modal
      await loadMySongs(accessToken);
      setEditingSong(null);
      setEditTitle('');
      setEditCategory('');
      setEditCoverAsset(null);
    } catch (e) {
      setUploadError('Network error while updating');
    } finally {
      setUploadingSong(false);
    }
  };

  const handleDeleteSong = async (songId: string) => {
    if (!accessToken) return;

    try {
      setDeletingSongId(songId);
      const res = await fetch(`${API_BASE_URL}/songs/${songId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!res.ok) {
        const json = await res.json();
        setUploadError(json.message || 'Failed to delete audioly');
        return;
      }

      // Reload songs
      await loadMySongs(accessToken);
    } catch (e) {
      setUploadError('Network error while deleting');
    } finally {
      setDeletingSongId(null);
    }
  };

  // Generate unique fingerprint for audio file to detect duplicates
  const generateAudioFingerprint = async (audioAsset: DocumentPicker.DocumentPickerAsset, metadata: any): Promise<string> => {
    try {
      // Combine file metadata and extracted audio metadata for fingerprinting
      const fingerprintData = {
        size: audioAsset.size,
        // Use audio metadata to detect same song even with different filenames
        title: metadata?.title || '',
        artist: metadata?.artist || '',
        // Use normalized name as fallback
        normalizedName: (audioAsset.name || '')
          .toLowerCase()
          .replace(/\.[^/.]+$/, '')
          .replace(/[^a-z0-9]/g, '')
          .substring(0, 50),
      };

      // Generate SHA-256 hash
      const fingerprint = CryptoJS.SHA256(JSON.stringify(fingerprintData)).toString();
      console.log(`[Upload] Generated fingerprint: ${fingerprint.substring(0, 16)}...`);
      return fingerprint;
    } catch (error) {
      console.log(`[Upload] Error generating fingerprint:`, error);
      // Fallback to basic hash if fingerprinting fails
      return CryptoJS.MD5(`${audioAsset.name}-${audioAsset.size}`).toString();
    }
  };

  const uploadSong = async () => {
    if (!accessToken) return;
    if (!audioAssets.length) {
      setUploadError('Please pick at least one audio file');
      return;
    }

    try {
      setUploadingSong(true);
      setUploadError(null);
      setUploadProgress({ current: 0, total: audioAssets.length });

      for (let i = 0; i < audioAssets.length; i++) {
        const audioAsset = audioAssets[i];
        setUploadProgress({ current: i + 1, total: audioAssets.length });

        // File validation
        console.log(`[Upload] Processing file ${i + 1}/${audioAssets.length}:`, {
          name: audioAsset.name,
          uri: audioAsset.uri,
          size: audioAsset.size,
          mimeType: audioAsset.mimeType,
        });


        // Extract metadata from audio file before uploading
        let extractedTitle = '';
        let extractedArtist = '';
        let extractedCover: any = null;

        try {
          console.log(`[Upload] Extracting metadata from ${audioAsset.name}`);
          const { getAudioMetadata } = require('@missingcore/audio-metadata');
          const metadata = await getAudioMetadata(audioAsset.uri, ['title', 'artist', 'artwork', 'album']);

          if (metadata.title) {
            extractedTitle = metadata.title;
            console.log(`[Upload] Extracted title: ${extractedTitle}`);
          }
          if (metadata.artist) {
            extractedArtist = metadata.artist;
            console.log(`[Upload] Extracted artist: ${extractedArtist}`);
          }
          if (metadata.artwork) {
            extractedCover = metadata.artwork;
            console.log(`[Upload] Extracted artwork from metadata`);
          }
        } catch (metadataError) {
          console.log(`[Upload] Could not extract metadata:`, metadataError);
        }

        // Generate audio fingerprint for duplicate detection
        const audioFingerprint = await generateAudioFingerprint(audioAsset, {
          title: extractedTitle,
          artist: extractedArtist
        });

        // Determine final values for upload
        const fallbackTitle = (audioAsset.name ?? `Track ${i + 1}`)
          .replace(/\.[^/.]+$/, '')
          .trim();
        const titleToUse =
          audioAssets.length === 1 && songTitle.trim()
            ? songTitle.trim()
            : extractedTitle || fallbackTitle;

        const artistToUse = extractedArtist || 'Unknown Artist';

        const form = new FormData();
        form.append('title', titleToUse);
        form.append('artist', artistToUse); // Add artist to form data
        form.append('fingerprint', audioFingerprint); // Add fingerprint for duplicate detection
        if (songCategory) form.append('category', songCategory);
        form.append('isPublic', String(songIsPublic));

        form.append('audio', {
          uri: audioAsset.uri,
          name: audioAsset.name ?? 'audio.mp3',
          type: audioAsset.mimeType ?? 'audio/mpeg',
        } as any);

        // Prioritize user-selected cover, then extracted cover
        if (coverAsset) {
          form.append('cover', {
            uri: coverAsset.uri,
            name: coverAsset.name ?? 'cover.jpg',
            type: coverAsset.mimeType ?? 'image/jpeg',
          } as any);
        } else if (extractedCover) {
          // Convert base64 artwork to blob if needed
          try {
            console.log(`[Upload] Using extracted artwork as cover`);
            form.append('cover', {
              uri: extractedCover,
              name: 'extracted_cover.jpg',
              type: 'image/jpeg',
            } as any);
          } catch (coverError) {
            console.log(`[Upload] Could not use extracted cover:`, coverError);
          }
        }

        console.log(`[Upload] Uploading to ${API_BASE_URL}/songs/upload`);
        console.log(`[Upload] Title: ${titleToUse}, Artist: ${artistToUse}, Fingerprint: ${audioFingerprint.substring(0, 16)}..., Category: ${songCategory || 'none'}, Public: ${songIsPublic}`);

        // Create an AbortController for timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.error('[Upload] Request timed out after 60 seconds');
        }, 60000); // 60 second timeout

        try {
          const res = await fetch(`${API_BASE_URL}/songs/upload`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
            body: form,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          console.log(`[Upload] Response status: ${res.status} ${res.statusText}`);

          // Handle 413 Payload Too Large error
          if (res.status === 413) {
            const fileSizeMB = audioAsset.size ? (audioAsset.size / (1024 * 1024)).toFixed(2) : 'unknown';
            console.error('[Upload] Server rejected file - too large:', fileSizeMB + 'MB');
            setUploadError(`File too large (${fileSizeMB}MB). The server rejected your upload. Please compress the audio file or select a smaller file.`);
            return;
          }

          // Try to parse JSON, but handle HTML error pages
          let json;
          try {
            json = await res.json();
          } catch (parseError) {
            console.error('[Upload] Failed to parse response as JSON:', parseError);
            if (!res.ok) {
              setUploadError(`Upload failed (${res.status}): ${res.statusText}`);
              return;
            }
            throw parseError;
          }

          if (!res.ok) {
            const errorMsg = json.message || `Failed to upload ${audioAsset.name || 'audioly'}`;
            console.error('[Upload] Server error:', {
              status: res.status,
              statusText: res.statusText,
              error: json,
            });
            setUploadError(`Upload failed (${res.status}): ${errorMsg}`);
            return;
          }

          console.log(`[Upload] Successfully uploaded: ${titleToUse}`);
        } catch (fetchError: any) {
          clearTimeout(timeoutId);

          // Handle different error types
          if (fetchError.name === 'AbortError') {
            console.error('[Upload] Request timeout');
            setUploadError('Upload timeout - file may be too large or connection is slow');
          } else if (fetchError.message?.includes('Network request failed')) {
            console.error('[Upload] Network error:', fetchError);
            setUploadError('Network error - please check your internet connection and try again');
          } else {
            console.error('[Upload] Fetch error:', fetchError);
            setUploadError(`Upload error: ${fetchError.message || 'Unknown error'}`);
          }
          return;
        }
      }

      // Reset form on success
      console.log('[Upload] All files uploaded successfully');
      setSongTitle('');
      setSongCategory('');
      setSongIsPublic(true);
      setCoverAsset(null);
      setAudioAssets([]);
      setUploadError(null);
      setShowUploadForm(false); // Hide form after successful upload

      // Reload my songs list
      await loadMySongs(accessToken);
    } catch (e: any) {
      console.error('[Upload] General error:', e);
      setUploadError(`Network error while uploading: ${e.message || 'Unknown error'}`);
    } finally {
      setUploadingSong(false);
      setUploadProgress(null);
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

  const loadDownloadedSongs = async () => {
    try {
      setLoadingDownloads(true);
      const songs = await getDownloadedSongs();
      setDownloadedSongs(songs);
    } catch {
      // ignore
    } finally {
      setLoadingDownloads(false);
    }
  };


  // Refresh profile and my songs when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      if (!accessToken) {
        // Still load downloaded songs even if not logged in
        void loadDownloadedSongs();
        return;
      }

      void loadMySongs(accessToken);
      void loadDownloadedSongs();
    }, [accessToken])
  );

  if (!user) {
    return <AuthForm />;
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.avatarRow}>
          <View style={styles.avatar}>
            {user.profileImage?.url && (
              <Image
                source={typeof user.profileImage.url === 'string' ? { uri: user.profileImage.url } : user.profileImage.url}
                style={styles.avatarImage}
              />
            )}
          </View>
        </View>
        <ThemedText type="title" style={styles.name}>
          {user.name}
        </ThemedText>
        <ThemedText style={styles.handle}>
          {user.username ? `@${user.username}` : user.email}
        </ThemedText>

        <View style={styles.section}>
          <ThemedText type="subtitle">Stats</ThemedText>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={16} color="#9ca3af" />
              <ThemedText style={{ marginLeft: 6 }}>
                {user.friends?.length ?? 0} friends
              </ThemedText>
            </View>
            <Ionicons name="ellipse" size={4} color="#9ca3af" style={styles.bullet} />
            <View style={styles.statItem}>
              <Ionicons name="mail-outline" size={16} color="#9ca3af" />
              <ThemedText style={{ marginLeft: 6 }}>
                {user.friendRequests?.length ?? 0} requests
              </ThemedText>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => router.push('/liked-songs')}
          >
            <ThemedText type="subtitle">Liked Audiolys</ThemedText>
            <View style={styles.sectionHeaderRight}>
              <ThemedText style={styles.songCount}>{likedSongs.length}</ThemedText>
              <Ionicons name="chevron-forward" size={20} color="#9ca3af" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <TouchableOpacity
            style={styles.sectionHeader}
            onPress={() => setShowSettings((prev) => !prev)}
          >
            <ThemedText type="subtitle">Settings</ThemedText>
            <View style={styles.sectionHeaderRight}>
              <Ionicons
                name={showSettings ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={themeIconColor}
              />
            </View>
          </TouchableOpacity>

          {showSettings && (
            <View
              style={[
                styles.settingsCard,
                {
                  backgroundColor: themeCardBg,
                  borderColor: themeBorderColor,
                },
              ]}
            >
              <View style={styles.settingsAvatarRow}>
                <View
                  style={[
                    styles.settingsAvatar,
                    { backgroundColor: themeChipBg, borderColor: themeBorderColor },
                  ]}
                >
                  {settingsAvatar ? (
                    <Image source={{ uri: settingsAvatar.uri }} style={styles.settingsAvatarImage} />
                  ) : user.profileImage?.url ? (
                    <Image
                      source={typeof user.profileImage.url === 'string' ? { uri: user.profileImage.url } : user.profileImage.url}
                      style={styles.settingsAvatarImage}
                    />
                  ) : (
                    <Ionicons name="person" size={36} color={themeMutedTextColor} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <TextInput
                    style={[
                      styles.settingsInput,
                      {
                        backgroundColor: themeChipBg,
                        borderColor: themeBorderColor,
                        color: themeTextColor,
                      },
                    ]}
                    placeholder="Display name"
                    placeholderTextColor={themeMutedTextColor}
                    value={settingsName}
                    onChangeText={setSettingsName}
                  />
                  <TouchableOpacity
                    style={[
                      styles.settingsChip,
                      { backgroundColor: themeChipBg, borderColor: themeBorderColor },
                    ]}
                    onPress={() => void pickSettingsAvatar()}
                  >
                    <Ionicons name="image-outline" size={16} color={themeIconColor} />
                    <ThemedText style={{ marginLeft: 6 }}>
                      {settingsAvatar ? 'Change avatar' : 'Pick avatar'}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              </View>

              <ThemedText type="subtitle" style={{ marginTop: 12 }}>
                Appearance
              </ThemedText>
              <View style={styles.settingsChipsRow}>
                <TouchableOpacity
                  style={[
                    styles.settingsChip,
                    {
                      backgroundColor: themeChipBg,
                      borderColor: themeBorderColor,
                    },
                    colorMode === 'light' && {
                      backgroundColor: themePrimaryActionBg,
                      borderColor: themePrimaryActionBg,
                    },
                  ]}
                  onPress={() => void setColorMode('light')}
                >
                  <Ionicons
                    name="sunny-outline"
                    size={16}
                    color={colorMode === 'light' ? themePrimaryActionText : themeIconColor}
                  />
                  <ThemedText
                    style={{
                      marginLeft: 6,
                      color: colorMode === 'light' ? themePrimaryActionText : themeTextColor,
                    }}
                  >
                    Light
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingsChip,
                    {
                      backgroundColor: themeChipBg,
                      borderColor: themeBorderColor,
                    },
                    colorMode === 'dark' && {
                      backgroundColor: themePrimaryActionBg,
                      borderColor: themePrimaryActionBg,
                    },
                  ]}
                  onPress={() => void setColorMode('dark')}
                >
                  <Ionicons
                    name="moon-outline"
                    size={16}
                    color={colorMode === 'dark' ? themePrimaryActionText : themeIconColor}
                  />
                  <ThemedText
                    style={{
                      marginLeft: 6,
                      color: colorMode === 'dark' ? themePrimaryActionText : themeTextColor,
                    }}
                  >
                    Dark
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingsChip,
                    {
                      backgroundColor: themeChipBg,
                      borderColor: themeBorderColor,
                    },
                    colorMode === 'system' && {
                      backgroundColor: themePrimaryActionBg,
                      borderColor: themePrimaryActionBg,
                    },
                  ]}
                  onPress={() => void setColorMode('system')}
                >
                  <Ionicons
                    name="phone-portrait-outline"
                    size={16}
                    color={colorMode === 'system' ? themePrimaryActionText : themeIconColor}
                  />
                  <ThemedText
                    style={{
                      marginLeft: 6,
                      color: colorMode === 'system' ? themePrimaryActionText : themeTextColor,
                    }}
                  >
                    System
                  </ThemedText>
                </TouchableOpacity>
              </View>

              <ThemedText type="subtitle" style={{ marginTop: 12 }}>
                Account privacy
              </ThemedText>
              <View style={styles.settingsChipsRow}>
                <TouchableOpacity
                  style={[
                    styles.settingsChip,
                    {
                      backgroundColor: themeChipBg,
                      borderColor: themeBorderColor,
                    },
                    !settingsIsPrivate && {
                      backgroundColor: themePrimaryActionBg,
                      borderColor: themePrimaryActionBg,
                    },
                  ]}
                  onPress={() => setSettingsIsPrivate(false)}
                >
                  <Ionicons
                    name="globe-outline"
                    size={16}
                    color={!settingsIsPrivate ? themePrimaryActionText : themeIconColor}
                  />
                  <ThemedText
                    style={{
                      marginLeft: 6,
                      color: !settingsIsPrivate ? themePrimaryActionText : themeTextColor,
                    }}
                  >
                    Public
                  </ThemedText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.settingsChip,
                    {
                      backgroundColor: themeChipBg,
                      borderColor: themeBorderColor,
                    },
                    settingsIsPrivate && {
                      backgroundColor: themePrimaryActionBg,
                      borderColor: themePrimaryActionBg,
                    },
                  ]}
                  onPress={() => setSettingsIsPrivate(true)}
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={settingsIsPrivate ? themePrimaryActionText : themeIconColor}
                  />
                  <ThemedText
                    style={{
                      marginLeft: 6,
                      color: settingsIsPrivate ? themePrimaryActionText : themeTextColor,
                    }}
                  >
                    Private
                  </ThemedText>
                </TouchableOpacity>
              </View>

              {settingsError && <ThemedText style={styles.errorText}>{settingsError}</ThemedText>}

              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: themePrimaryActionBg }]}
                onPress={() => void saveSettings()}
                disabled={savingSettings}
              >
                {savingSettings ? (
                  <ActivityIndicator color={themePrimaryActionText} />
                ) : (
                  <ThemedText style={[styles.primaryButtonText, { color: themePrimaryActionText }]}>
                    Save settings
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Downloaded Audiolys</ThemedText>
          {loadingDownloads ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#9ca3af" />
            </View>
          ) : downloadedSongs.length === 0 ? (
            <ThemedText style={{ opacity: 0.7 }}>No downloaded songs yet.</ThemedText>
          ) : (
            downloadedSongs.map((song) => (
              <View key={song.id} style={styles.songRow}>
                <TouchableOpacity
                  style={styles.songCoverTouchable}
                  onPress={() => {
                    // Play the downloaded song from local storage
                    router.push({
                      pathname: '/(tabs)/player',
                      params: { songId: song.id },
                    });
                  }}
                >
                  <View style={styles.songCover}>
                    {song.coverUrl ? (
                      <Image
                        source={typeof song.coverUrl === 'string' ? { uri: song.coverUrl } : song.coverUrl}
                        style={styles.songCoverImage}
                      />
                    ) : (
                      <Ionicons name="musical-notes" size={24} color="#6b7280" />
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    router.push({
                      pathname: '/(tabs)/player',
                      params: { songId: song.id },
                    });
                  }}
                >
                  <ThemedText type="defaultSemiBold">{song.title}</ThemedText>
                  <View style={styles.songMetaRow}>
                    <ThemedText style={styles.songMeta}>
                      {song.category || 'Uncategorized'}
                    </ThemedText>
                    <Ionicons name="ellipse" size={4} color="#9ca3af" style={styles.bullet} />
                    <ThemedText style={styles.songMeta}>
                      {song.subtitle || 'Unknown'}
                    </ThemedText>
                  </View>
                  <View style={styles.downloadedBadge}>
                    <Ionicons name="download" size={12} color="#3b82f6" />
                    <ThemedText style={[styles.songMeta, { fontSize: 11, marginLeft: 4, color: '#3b82f6' }]}>
                      Downloaded
                    </ThemedText>
                  </View>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <View style={styles.section}>
          <ThemedText type="subtitle">Your songs</ThemedText>
          {mySongs.length === 0 ? (
            <ThemedText style={{ opacity: 0.7 }}>You haven&apos;t uploaded any songs yet.</ThemedText>
          ) : (
            mySongs.map((song) => (
              <View key={song._id} style={styles.songRow}>
                <TouchableOpacity
                  style={styles.songCoverTouchable}
                  onPress={() => {
                    // Play the song
                    router.push({
                      pathname: '/(tabs)/player',
                      params: { songId: song._id },
                    });
                  }}
                >
                  <View style={styles.songCover}>
                    {song.coverUrl ? (
                      <Image
                        source={typeof song.coverUrl === 'string' ? { uri: song.coverUrl } : song.coverUrl}
                        style={styles.songCoverImage}
                      />
                    ) : (
                      <Ionicons name="musical-notes" size={24} color="#6b7280" />
                    )}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={{ flex: 1 }}
                  onPress={() => {
                    setEditingSong(song);
                    setEditTitle(song.title);
                    setEditCategory(song.category || '');
                    setEditIsPublic(song.isPublic);
                    setEditCoverAsset(null);
                  }}
                >
                  <ThemedText type="defaultSemiBold">{song.title}</ThemedText>
                  <View style={styles.songMetaRow}>
                    <ThemedText style={styles.songMeta}>
                      {song.category || 'Uncategorized'}
                    </ThemedText>
                    <Ionicons name="ellipse" size={4} color="#9ca3af" style={styles.bullet} />
                    <View style={styles.privacyBadge}>
                      <Ionicons
                        name={song.isPublic ? 'globe-outline' : 'lock-closed-outline'}
                        size={12}
                        color={song.isPublic ? '#3b82f6' : '#9ca3af'}
                      />
                      <ThemedText style={[styles.songMeta, { marginLeft: 4, color: song.isPublic ? '#3b82f6' : '#9ca3af' }]}>
                        {song.isPublic ? 'Public' : 'Private'}
                      </ThemedText>
                    </View>
                  </View>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteSong(song._id)}
                  disabled={deletingSongId === song._id}
                >
                  {deletingSongId === song._id ? (
                    <ActivityIndicator size="small" color="#ef4444" />
                  ) : (
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  )}
                </TouchableOpacity>
              </View>
            ))
          )}

          {/* Edit Song Modal */}
          {editingSong && (
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <ThemedText type="title">Edit Audioly</ThemedText>
                  <TouchableOpacity onPress={() => setEditingSong(null)}>
                    <Ionicons name="close" size={24} color="#ffffff" />
                  </TouchableOpacity>
                </View>

                <TextInput
                  style={styles.input}
                  placeholder="Song title"
                  placeholderTextColor="#6b7280"
                  value={editTitle}
                  onChangeText={setEditTitle}
                />

                <TextInput
                  style={styles.input}
                  placeholder="Category"
                  placeholderTextColor="#6b7280"
                  value={editCategory}
                  onChangeText={setEditCategory}
                />

                <Pressable
                  onPress={() => setEditIsPublic((prev) => !prev)}
                  style={[
                    styles.privacyToggle,
                    editIsPublic ? styles.privacyPublic : styles.privacyPrivate,
                  ]}
                >
                  <View style={styles.privacyOption}>
                    <Ionicons
                      name="lock-closed-outline"
                      size={16}
                      color={!editIsPublic ? '#ffffff' : '#9ca3af'}
                      style={{ marginRight: 4 }}
                    />
                    <ThemedText
                      style={[
                        styles.privacyText,
                        !editIsPublic && styles.privacyTextActive,
                      ]}
                    >
                      Private
                    </ThemedText>
                  </View>
                  <View style={styles.privacyOption}>
                    <Ionicons
                      name="globe-outline"
                      size={16}
                      color={editIsPublic ? '#ffffff' : '#9ca3af'}
                      style={{ marginRight: 4 }}
                    />
                    <ThemedText
                      style={[
                        styles.privacyText,
                        editIsPublic && styles.privacyTextActive,
                      ]}
                    >
                      Public
                    </ThemedText>
                  </View>
                  <View
                    style={[
                      styles.privacyThumb,
                      editIsPublic ? styles.privacyThumbRight : styles.privacyThumbLeft,
                    ]}
                  />
                </Pressable>

                <TouchableOpacity
                  style={styles.chipButton}
                  onPress={() => void pickEditCover()}
                >
                  <ThemedText style={styles.chipButtonText}>
                    {editCoverAsset ? 'Change cover image' : 'Change cover image'}
                  </ThemedText>
                </TouchableOpacity>

                <View style={styles.modalButtons}>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonCancel]}
                    onPress={() => setEditingSong(null)}
                  >
                    <ThemedText style={styles.modalButtonText}>Cancel</ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.modalButton, styles.modalButtonSave]}
                    onPress={() => void handleUpdateSong()}
                  >
                    <ThemedText style={[styles.modalButtonText, styles.modalButtonTextSave]}>Save</ThemedText>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Center Upload Button - Shows when form is hidden */}
        {!showUploadForm && user && (
          <View style={styles.centerUploadButtonContainer}>
            <TouchableOpacity
              style={[
                styles.centerUploadButton,
                {
                  backgroundColor: themePrimaryActionBg,
                },
              ]}
              onPress={() => setShowUploadForm(true)}
            >
              <Ionicons name="add" size={32} color={themePrimaryActionText} />
              <ThemedText style={[styles.centerUploadButtonText, { color: themePrimaryActionText }]}>
                Upload audioly
              </ThemedText>
            </TouchableOpacity>
          </View>
        )}

        {/* Upload Form - Shows when button is clicked */}
        {showUploadForm && user && (
          <View style={styles.section}>
            <View style={styles.uploadFormHeader}>
              <ThemedText type="subtitle">Upload audioly</ThemedText>
              <TouchableOpacity
                onPress={() => {
                  setShowUploadForm(false);
                  setSongTitle('');
                  setSongCategory('');
                  setSongIsPublic(true);
                  setCoverAsset(null);
                  setAudioAssets([]);
                  setUploadProgress(null);
                  setUploadError(null);
                }}
                style={styles.closeButton}
              >
                <Ionicons name="close" size={24} color={themeIconColor} />
              </TouchableOpacity>
            </View>

            <View
              style={[
                styles.uploadCard,
                {
                  backgroundColor: themeCardBg,
                  borderColor: themeBorderColor,
                },
              ]}
            >
              <Pressable
                onPress={() => setSongIsPublic((prev) => !prev)}
                style={[
                  styles.privacyToggle,
                  songIsPublic ? styles.privacyPublic : styles.privacyPrivate,
                  {
                    backgroundColor: themeChipBg,
                    borderColor: themeBorderColor,
                  },
                ]}
              >
                <View style={styles.privacyOption}>
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={!songIsPublic ? themePrimaryActionText : themeIconColor}
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText
                    style={[
                      styles.privacyText,
                      !songIsPublic && styles.privacyTextActive,
                      { color: !songIsPublic ? themePrimaryActionText : themeTextColor },
                    ]}
                  >
                    Private
                  </ThemedText>
                </View>
                <View style={styles.privacyOption}>
                  <Ionicons
                    name="globe-outline"
                    size={16}
                    color={songIsPublic ? themePrimaryActionText : themeIconColor}
                    style={{ marginRight: 6 }}
                  />
                  <ThemedText
                    style={[
                      styles.privacyText,
                      songIsPublic && styles.privacyTextActive,
                      { color: songIsPublic ? themePrimaryActionText : themeTextColor },
                    ]}
                  >
                    Public
                  </ThemedText>
                </View>
                <View
                  style={[
                    styles.privacyThumb,
                    songIsPublic ? styles.privacyThumbRight : styles.privacyThumbLeft,
                    { backgroundColor: themePrimaryActionBg },
                  ]}
                />
              </Pressable>

              <View style={styles.uploadRow}>
                <TouchableOpacity
                  style={[
                    styles.chipButton,
                    {
                      backgroundColor: themeChipBg,
                      borderColor: themeBorderColor,
                    },
                  ]}
                  onPress={() => void pickAudio()}
                >
                  <ThemedText style={[styles.chipButtonText, { color: themeTextColor }]}>
                    {audioAssets.length ? 'Change audio' : 'Pick audio(s)'}
                  </ThemedText>
                </TouchableOpacity>
              </View>

            </View>

            {/* Info + live preview of selected cover (supports GIF) */}
            {coverAsset && (
              <View style={styles.coverPreview}>
                <ThemedText style={styles.coverPreviewLabel}>
                  Cover selected: {coverAsset.name || 'Unnamed image'}
                </ThemedText>
                <Image
                  source={{ uri: coverAsset.uri }}
                  style={styles.coverPreviewImage}
                  resizeMode="cover"
                />
              </View>
            )}

            {/* Change cover button (only shows when a cover is already selected) */}
            {coverAsset && (
              <TouchableOpacity
                style={[
                  styles.chipButton,
                  {
                    backgroundColor: themeChipBg,
                    borderColor: themeBorderColor,
                  },
                ]}
                onPress={() => void pickCover()}
              >
                <ThemedText style={[styles.chipButtonText, { color: themeTextColor }]}>
                  Change cover
                </ThemedText>
              </TouchableOpacity>
            )}

            {/* Info about selected audio file */}
            {!!audioAssets.length && (
              <View style={styles.audioInfoRow}>
                <ThemedText style={styles.audioInfoLabel}>
                  Audioly selected: {audioAssets.length}
                </ThemedText>
                <ThemedText style={styles.audioInfoName} numberOfLines={1}>
                  {audioAssets.map((a) => a.name || a.uri).join(', ')}
                </ThemedText>
              </View>
            )}

            {uploadProgress && (
              <ThemedText style={[styles.legalText, { color: themeMutedTextColor }]}>
                Uploading {uploadProgress.current}/{uploadProgress.total}
              </ThemedText>
            )}

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
                <ThemedText style={styles.primaryButtonText}>
                  {audioAssets.length > 1 ? 'Upload audios' : 'Upload audioly'}
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.secondaryButton,
            {
              borderColor: themeBorderColor,
              backgroundColor: themeChipBg,
            },
          ]}
          onPress={onLogout}
        >
          <ThemedText style={[styles.secondaryButtonText, { color: themeTextColor }]}>Log out</ThemedText>
        </TouchableOpacity>

        <View style={styles.legalSection}>
          <ThemedText style={[styles.legalText, { color: themeMutedTextColor }]}>
            Audioly does not host music.
          </ThemedText>
          <ThemedText style={[styles.legalText, { color: themeMutedTextColor }]}>
            Audio is streamed from publicly available sources.
          </ThemedText>
        </View>
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
  uploadCard: {
    width: '100%',
    backgroundColor: '#0b1220',
    borderWidth: 1,
    borderColor: '#1f2937',
    borderRadius: 16,
    padding: 14,
  },
  settingsCard: {
    width: '100%',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    marginTop: 8,
  },
  settingsAvatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingsAvatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsAvatarImage: {
    width: '100%',
    height: '100%',
  },
  settingsInput: {
    width: '100%',
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 10,
  },
  settingsChipsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
    flexWrap: 'wrap',
  },
  settingsChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  centerUploadButtonContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 24,
  },
  centerUploadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 999,
    paddingVertical: 16,
    paddingHorizontal: 32,
    gap: 12,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 8,
  },
  centerUploadButtonText: {
    color: '#020617',
    fontSize: 18,
    fontWeight: '600',
  },
  uploadFormHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  closeButton: {
    padding: 4,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  songCount: {
    color: '#9ca3af',
    fontSize: 14,
  },
  toggleRow: {
    marginTop: 12,
  },
  toggleText: {
    opacity: 0.8,
  },
  // Auth Screen Styles (Clean & Minimal)
  authContainer: {
    flex: 1,
    backgroundColor: '#020617',
  },
  authScrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 32,
  },
  illustrationContainer: {
    alignItems: 'center',
    marginBottom: 32,
    height: 200,
    justifyContent: 'center',
  },
  illustrationImage: {
    width: 180,
    height: 180,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 24,
  },
  authToggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
    gap: 24,
  },
  authToggleButton: {
    paddingVertical: 8,
  },
  authToggleText: {
    fontSize: 16,
    color: '#6b7280',
    fontWeight: '500',
  },
  authToggleActive: {
    color: '#ffffff',
    fontWeight: '700',
  },
  authInput: {
    width: '100%',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    fontSize: 16,
    color: '#111827',
  },
  passwordInputContainer: {
    position: 'relative',
    width: '100%',
    marginBottom: 16,
  },
  authInputWithIcon: {
    width: '100%',
    backgroundColor: '#1f2937',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#374151',
    paddingHorizontal: 16,
    paddingRight: 48,
    paddingVertical: 14,
    fontSize: 16,
    color: '#ffffff',
  },
  passwordToggle: {
    position: 'absolute',
    right: 16,
    top: 14,
    padding: 4,
  },
  forgotPasswordButton: {
    alignSelf: 'flex-end',
    marginTop: -8,
    marginBottom: 16,
    paddingVertical: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    color: '#9ca3af',
    fontWeight: '500',
  },
  authErrorText: {
    color: '#ef4444',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 16,
  },
  authSubmitButton: {
    width: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    alignSelf: 'flex-end',
    maxWidth: 150,
  },
  authSubmitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  privacyToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 8,
    marginTop: 12,
    borderWidth: 1,
    position: 'relative',
    overflow: 'hidden',
  },
  privacyPublic: {
    // base track color; text handles active state
  },
  privacyPrivate: {
    // base track color; text handles active state
  },
  privacyOption: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  privacyText: {
    opacity: 0.6,
  },
  privacyTextActive: {
    opacity: 1,
    fontWeight: '700',
  },
  privacyThumb: {
    position: 'absolute',
    width: '50%',
    top: 3,
    bottom: 3,
    borderRadius: 999,
    backgroundColor: '#0ea5e9',
    zIndex: -1,
  },
  privacyThumbLeft: {
    left: 3,
  },
  privacyThumbRight: {
    right: 3,
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
  coverPreview: {
    width: '100%',
    marginTop: 12,
    alignItems: 'center',
    gap: 6,
  },
  coverPreviewLabel: {
    opacity: 0.6,
  },
  coverPreviewImage: {
    width: 140,
    height: 140,
    borderRadius: 16,
    backgroundColor: '#111827',
  },
  audioInfoRow: {
    width: '100%',
    marginTop: 8,
  },
  audioInfoLabel: {
    opacity: 0.6,
    marginBottom: 2,
  },
  audioInfoName: {
    fontSize: 13,
  },
  chipButton: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: '#334155',
    backgroundColor: '#111827',
    paddingHorizontal: 14,
    paddingVertical: 10,
    flex: 1,
    alignItems: 'center',
  },
  chipButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
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
    gap: 12,
    paddingVertical: 8,
  },
  songCoverTouchable: {
    // Makes the cover clickable
  },
  songCover: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
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
  songMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  bullet: {
    marginHorizontal: 4,
  },
  downloadedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContent: {
    width: '90%',
    maxWidth: 400,
    backgroundColor: '#020617',
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    borderColor: '#1f2937',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonCancel: {
    backgroundColor: '#1f2937',
  },
  modalButtonSave: {
    backgroundColor: '#ffffff',
  },
  modalButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalButtonTextSave: {
    color: '#020617',
  },
  legalSection: {
    padding: 16,
    alignItems: 'center',
    marginBottom: 20,
    marginTop: 20,
    opacity: 0.6,
  },
  legalText: {
    fontSize: 12,
    textAlign: 'center',
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    marginTop: 8,
  },
  logoutButtonText: {
    fontSize: 16,
    color: '#ef4444',
    fontWeight: '600',
  },
});



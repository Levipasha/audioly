import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { Image, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import TrackPlayer, { useProgress } from 'react-native-track-player';
import { useNowPlaying } from './now-playing-context';

export function NowPlayingBar() {
  const { nowPlaying, setNowPlaying, togglePlayPause, playNext, playPrev } = useNowPlaying();
  const router = useRouter();
  const { position, duration } = useProgress();
  const insets = useSafeAreaInsets();

  // Calculate bottom position based on tab bar height + safe area
  // Standard tab bar base height is ~49px on iOS, ~56px on Android
  // Add insets.bottom for devices with home indicators
  const baseTabBarHeight = Platform.OS === 'ios' ? 49 : 56;
  const totalTabBarHeight = baseTabBarHeight + (insets.bottom > 0 ? insets.bottom : 5);
  const bottomPosition = totalTabBarHeight + 8; // 8px gap from tab bar

  // Sync progress back to context for other consumers (optional, but good for consistency)
  // or just let this component drive its own UI
  useEffect(() => {
    // ...
  }, [position, duration, nowPlaying]);

  if (!nowPlaying) return null;

  const progress = duration > 0 ? position / duration : 0;
  const isPlaying = nowPlaying.isPlaying ?? false;

  const handlePlayPause = async (e: any) => {
    e.stopPropagation();
    await togglePlayPause();
  };

  const handleClose = async (e: any) => {
    e.stopPropagation();
    try {
      await TrackPlayer.reset();
      setNowPlaying(null);
    } catch (error) {
      console.error('Error closing player:', error);
      setNowPlaying(null);
    }
  };

  return (
    <Pressable
      style={[styles.container, { bottom: bottomPosition }]}
      onPress={() => {
        const target = nowPlaying.route ?? '/(tabs)/player';
        const params = nowPlaying.params;
        if (params) {
          router.push({ pathname: target as any, params });
        } else {
          router.push(target as any);
        }
      }}
    >
      {nowPlaying.coverUrl ? (
        <Image
          source={typeof nowPlaying.coverUrl === 'string' ? { uri: nowPlaying.coverUrl } : nowPlaying.coverUrl}
          style={styles.cover}
        />
      ) : (
        <View style={[styles.cover, styles.coverPlaceholder]} />
      )}
      <View style={styles.textContainer}>
        <Text numberOfLines={1} style={styles.title}>
          {nowPlaying.title}
        </Text>
        {nowPlaying.subtitle ? (
          <Text numberOfLines={1} style={styles.subtitle}>
            {nowPlaying.subtitle}
          </Text>
        ) : null}
      </View>


      <View style={styles.controlsContainer}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={async (e) => { e.stopPropagation(); await playPrev(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="play-skip-back" size={20} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playPauseButton}
          onPress={handlePlayPause}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name={isPlaying ? 'pause' : 'play'} size={22} color="#ffffff" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={async (e) => { e.stopPropagation(); await playNext(); }}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Ionicons name="play-skip-forward" size={20} color="#ffffff" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleClose}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="close" size={18} color="#9ca3af" />
      </TouchableOpacity>

      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 8,
    right: 8,
    // bottom is now set dynamically based on device tab bar height
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#0a0a0aee',
    borderWidth: 1.5,
    borderColor: '#374151',
    shadowColor: '#000',
    shadowOpacity: 0.5,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: -2 },
    elevation: 8,
  },
  cover: {
    width: 40,
    height: 40,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  coverPlaceholder: {
    backgroundColor: '#1f2937',
  },
  textContainer: {
    flex: 1,
    marginRight: 6,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2, // Tighter gap
    marginRight: 4,
  },
  controlButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playPauseButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#3b82f6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3b82f6',
    shadowOpacity: 0.4,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  closeButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#1f2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
    fontWeight: '500',
  },
  progressTrack: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 2,
    height: 3, // Slightly thicker
    borderRadius: 999,
    backgroundColor: '#1f2937',
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#60a5fa', // Brighter blue for progress
  },
});


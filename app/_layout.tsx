import { DarkTheme, ThemeProvider as NavigationThemeProvider } from '@react-navigation/native';
import { Audio, InterruptionModeAndroid, InterruptionModeIOS } from 'expo-av';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import React, { useEffect } from 'react';
import 'react-native-reanimated';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AudioNotificationHandler } from '@/components/AudioNotificationHandler';
import { AuthProvider } from '@/components/auth-context';
import { NetworkProvider } from '@/components/network-context';
import { NowPlayingProvider } from '@/components/now-playing-context';
import { PlaylistProvider } from '@/components/playlist-context';
import { QueueProvider } from '@/components/queue-context';
import { ThemeProvider } from '@/components/theme-context';
import { useNotificationDeepLink } from '@/hooks/useNotificationDeepLink';

export const unstable_settings = {
  anchor: '(tabs)',
};

function AppContent() {
  // Force dark mode always - no color scheme detection needed

  // Configure global audio mode so playback can continue in background
  useEffect(() => {
    void Audio.setAudioModeAsync({
      staysActiveInBackground: true,
      playsInSilentModeIOS: true,
      interruptionModeIOS: InterruptionModeIOS.DuckOthers,
      interruptionModeAndroid: InterruptionModeAndroid.DuckOthers,
      shouldDuckAndroid: true,
      playThroughEarpieceAndroid: false,
    }).catch(() => {
      // ignore configuration errors
    });
  }, []);

  // Handle notification deep links
  useNotificationDeepLink();

  return (
    <NavigationThemeProvider value={DarkTheme}>
      <AuthProvider>
        <NetworkProvider>
          <NowPlayingProvider>
            <QueueProvider>
              <PlaylistProvider>
                <AudioNotificationHandler />
                <Stack>
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />


                  <Stack.Screen name="liked-songs" options={{ headerShown: false }} />
                  <Stack.Screen name="settings" options={{ headerShown: false }} />
                  <Stack.Screen name="user/[userId]" options={{ headerShown: false }} />
                  <Stack.Screen name="offline-songs" options={{ headerShown: false }} />
                  <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
                </Stack>
                <StatusBar style="light" />
              </PlaylistProvider>
            </QueueProvider>
          </NowPlayingProvider>
        </NetworkProvider>
      </AuthProvider>
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

import { Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { NowPlayingBar } from '@/components/NowPlayingBar';

export default function TabLayout() {
  const pathname = usePathname();
  const isPlayerTab = pathname === '/(tabs)/player' || pathname === '/player';
  const insets = useSafeAreaInsets();

  return (
    <>
      <Tabs
        screenOptions={{
          headerShown: false,
          tabBarButton: HapticTab,
          tabBarActiveTintColor: '#ffffff',
          tabBarInactiveTintColor: '#9ca3af',
          tabBarStyle: {
            backgroundColor: '#000000',
            borderTopColor: '#111827',
            paddingBottom: insets.bottom > 0 ? insets.bottom : 5, // Safe area for devices with home indicator
            height: (insets.bottom > 0 ? 49 : 56) + insets.bottom, // Adaptive height
          },
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="friends"
          options={{
            title: 'Community',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="people-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="player"
          options={{
            title: 'Player',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="play-circle-outline" size={size} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="explore"
          options={{
            title: 'Explore',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="musical-notes-outline" size={size} color={color} />
            ),
          }}
        />
        {/* Hidden helper screen for listing all categories (no tab icon) */}
        <Tabs.Screen
          name="explore-categories"
          options={{
            href: null,
          }}
        />
        {/* Hidden screen for friends audio feed (no tab icon) */}
        <Tabs.Screen
          name="friends-audio"
          options={{
            href: null,
          }}
        />
        <Tabs.Screen
          name="profile"
          options={{
            title: 'Profile',
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="person-circle-outline" size={size} color={color} />
            ),
          }}
        />
      </Tabs>
      {!isPlayerTab && <NowPlayingBar />}
    </>
  );
}

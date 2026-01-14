import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { API_BASE_URL } from '@/constants/api';

type ExploreSong = {
  _id: string;
  title: string;
  category?: string;
};

export default function ExploreCategoriesScreen() {
  const router = useRouter();
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`${API_BASE_URL}/songs/explore`);
        const json: ExploreSong[] = await res.json();
        if (!res.ok || !Array.isArray(json)) {
          setError((json as any)?.message || 'Failed to load categories');
          return;
        }
        const unique = Array.from(
          new Set(
            json
              .map((s) => s.category?.trim())
              .filter((c): c is string => !!c)
          )
        );
        setCategories(unique);
      } catch {
        setError('Network error');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  return (
    <ThemedView style={styles.container}>
      <View style={styles.headerRow}>
        <TouchableOpacity onPress={() => router.back()}>
          <ThemedText>{'< Back'}</ThemedText>
        </TouchableOpacity>
        <ThemedText type="title">All categories</ThemedText>
        <View style={{ width: 60 }} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color="#ffffff" />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <ThemedText>{error}</ThemedText>
        </View>
      ) : categories.length === 0 ? (
        <View style={styles.center}>
          <ThemedText>No categories yet.</ThemedText>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.list}>
          {/* All option to clear filter */}
          <TouchableOpacity
            style={[styles.categoryRow, styles.allCategoryRow]}
            onPress={() =>
              router.push({
                pathname: '/(tabs)/explore',
              })
            }
          >
            <Ionicons name="apps-outline" size={18} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.categoryText}>All</Text>
          </TouchableOpacity>
          
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={styles.categoryRow}
              onPress={() =>
                router.push({
                  pathname: '/(tabs)/explore',
                  params: { category: cat },
                })
              }
            >
              <Text style={styles.categoryHash}>#</Text>
              <Text style={styles.categoryText}>{cat}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#050816',
    paddingTop: 40,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: '#020617',
    marginBottom: 8,
  },
  allCategoryRow: {
    backgroundColor: '#1f2937',
    borderWidth: 1,
    borderColor: '#374151',
  },
  categoryHash: {
    color: '#9ca3af',
    fontSize: 16,
    marginRight: 6,
  },
  categoryText: {
    color: '#f9fafb',
    fontSize: 15,
    fontWeight: '600',
  },
});


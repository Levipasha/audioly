import React from 'react';
import { SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#050816' },
  header: {
    fontSize: 22,
    fontWeight: '700',
    color: '#ffffff',
    paddingHorizontal: 20,
    paddingTop: 4,
    paddingBottom: 10,
  },
  buttonsContainer: {
    flex: 1,
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 20,
  },
  bigButton: {
    borderRadius: 16,
    paddingVertical: 24,
    paddingHorizontal: 20,
    backgroundColor: '#111827',
  },
  bigButtonTitle: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  bigButtonSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
  },
});

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <Text style={styles.header}>Audiloly</Text>

      <View style={styles.buttonsContainer}>
        <TouchableOpacity
          style={styles.bigButton}
          onPress={() => router.push('/local-player')}
        >
          <Text style={styles.bigButtonTitle}>Local audio</Text>
          <Text style={styles.bigButtonSubtitle}>
            See your local playlist and open a clean full-screen player.
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.bigButton}
          onPress={() => router.push('/(tabs)/friends')}
        >
          <Text style={styles.bigButtonTitle}>Friends audio</Text>
          <Text style={styles.bigButtonSubtitle}>
            Explore what your friends are listening to.
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}


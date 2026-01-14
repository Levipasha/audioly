import AsyncStorage from '@react-native-async-storage/async-storage';
import { File } from 'expo-file-system';

export type DownloadedSong = {
  id: string;
  title: string;
  subtitle?: string;
  coverUrl?: string;
  owner?: {
    name: string;
  };
  category?: string;
  localPath: string;
  downloadedAt: number;
};

export async function getDownloadedSongs(): Promise<DownloadedSong[]> {
  try {
    const stored = await AsyncStorage.getItem('downloadedSongs');
    if (!stored) return [];

    const ids = JSON.parse(stored) as string[];
    const songs: DownloadedSong[] = [];

    for (const id of ids) {
      const metadataKey = `downloadedSong_${id}`;
      const metadata = await AsyncStorage.getItem(metadataKey);
      if (metadata) {
        const song = JSON.parse(metadata) as DownloadedSong;
        // Verify file still exists
        try {
          const file = new File(song.localPath);
          const exists = await file.exists;
          if (exists) {
            songs.push(song);
          }
        } catch {
          // Clean up if file doesn't exist or can't be accessed
          await AsyncStorage.removeItem(metadataKey);
          const updatedIds = ids.filter((songId) => songId !== id);
          await AsyncStorage.setItem('downloadedSongs', JSON.stringify(updatedIds));
        }
      }
    }

    return songs.sort((a, b) => b.downloadedAt - a.downloadedAt);
  } catch {
    return [];
  }
}

export async function isSongDownloaded(songId: string): Promise<boolean> {
  try {
    const stored = await AsyncStorage.getItem('downloadedSongs');
    if (!stored) return false;
    const ids = JSON.parse(stored) as string[];
    return ids.includes(songId);
  } catch {
    return false;
  }
}

export async function getDownloadedSongPath(songId: string): Promise<string | null> {
  try {
    const metadataKey = `downloadedSong_${songId}`;
    const metadata = await AsyncStorage.getItem(metadataKey);
    if (!metadata) return null;

    const song = JSON.parse(metadata) as DownloadedSong;
    try {
      const file = new File(song.localPath);
      const exists = await file.exists;
      return exists ? song.localPath : null;
    } catch {
      return null;
    }
  } catch {
    return null;
  }
}

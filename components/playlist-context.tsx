import React, { createContext, useContext, useState, useEffect, type ReactNode, type Dispatch, type SetStateAction } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type PlaylistSong = {
  id: string;
  title: string;
  subtitle?: string;
  audioUrl: string;
  coverUrl?: string;
  owner?: {
    name: string;
  };
  addedAt: number;
};

export type Playlist = {
  id: string;
  name: string;
  songs: PlaylistSong[];
  createdAt: number;
  updatedAt: number;
};

type PlaylistContextType = {
  playlists: Playlist[];
  likedSongs: PlaylistSong[];
  recentlyPlayed: PlaylistSong[];
  createPlaylist: (name: string) => string;
  deletePlaylist: (id: string) => void;
  updatePlaylistName: (id: string, name: string) => void;
  addSongToPlaylist: (playlistId: string, song: PlaylistSong) => void;
  removeSongFromPlaylist: (playlistId: string, songId: string) => void;
  toggleLike: (song: PlaylistSong) => boolean;
  isLiked: (songId: string) => boolean;
  addToRecentlyPlayed: (song: PlaylistSong) => void;
};

const PlaylistContext = createContext<PlaylistContextType | undefined>(undefined);

const PLAYLISTS_STORAGE_KEY = 'audioly_playlists';
const LIKED_SONGS_STORAGE_KEY = 'audioly_liked_songs';
const RECENTLY_PLAYED_STORAGE_KEY = 'audioly_recently_played';

export function PlaylistProvider({ children }: { children: ReactNode }) {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [likedSongs, setLikedSongs] = useState<PlaylistSong[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<PlaylistSong[]>([]);

  // Load data from storage on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [playlistsData, likedData, recentData] = await Promise.all([
          AsyncStorage.getItem(PLAYLISTS_STORAGE_KEY),
          AsyncStorage.getItem(LIKED_SONGS_STORAGE_KEY),
          AsyncStorage.getItem(RECENTLY_PLAYED_STORAGE_KEY),
        ]);
        
        if (playlistsData) {
          setPlaylists(JSON.parse(playlistsData));
        }
        
        if (likedData) {
          setLikedSongs(JSON.parse(likedData));
        }
        
        if (recentData) {
          setRecentlyPlayed(JSON.parse(recentData));
        }
      } catch {
        // ignore
      }
    };
    void load();
  }, []);

  // Save playlists to storage
  useEffect(() => {
    void AsyncStorage.setItem(PLAYLISTS_STORAGE_KEY, JSON.stringify(playlists));
  }, [playlists]);

  // Save liked songs to storage
  useEffect(() => {
    void AsyncStorage.setItem(LIKED_SONGS_STORAGE_KEY, JSON.stringify(likedSongs));
  }, [likedSongs]);

  // Save recently played to storage
  useEffect(() => {
    void AsyncStorage.setItem(RECENTLY_PLAYED_STORAGE_KEY, JSON.stringify(recentlyPlayed));
  }, [recentlyPlayed]);

  const createPlaylist = (name: string): string => {
    const id = `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const now = Date.now();
    const newPlaylist: Playlist = {
      id,
      name,
      songs: [],
      createdAt: now,
      updatedAt: now,
    };
    setPlaylists((prev) => [...prev, newPlaylist]);
    return id;
  };

  const deletePlaylist = (id: string) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id));
  };

  const updatePlaylistName = (id: string, name: string) => {
    setPlaylists((prev) =>
      prev.map((p) => (p.id === id ? { ...p, name, updatedAt: Date.now() } : p))
    );
  };

  const addSongToPlaylist = (playlistId: string, song: PlaylistSong) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          // Check if song already exists
          if (p.songs.some((s) => s.id === song.id)) {
            return p;
          }
          return {
            ...p,
            songs: [...p.songs, { ...song, addedAt: Date.now() }],
            updatedAt: Date.now(),
          };
        }
        return p;
      })
    );
  };

  const removeSongFromPlaylist = (playlistId: string, songId: string) => {
    setPlaylists((prev) =>
      prev.map((p) => {
        if (p.id === playlistId) {
          return {
            ...p,
            songs: p.songs.filter((s) => s.id !== songId),
            updatedAt: Date.now(),
          };
        }
        return p;
      })
    );
  };

  const toggleLike = (song: PlaylistSong): boolean => {
    let isNowLiked = false;
    setLikedSongs((prev) => {
      const exists = prev.some((s) => s.id === song.id);
      if (exists) {
        isNowLiked = false;
        return prev.filter((s) => s.id !== song.id);
      } else {
        isNowLiked = true;
        return [{ ...song, addedAt: Date.now() }, ...prev];
      }
    });
    return isNowLiked;
  };

  const isLiked = (songId: string): boolean => {
    return likedSongs.some((s) => s.id === songId);
  };

  const addToRecentlyPlayed = (song: PlaylistSong) => {
    setRecentlyPlayed((prev) => {
      // Remove if already exists
      const filtered = prev.filter((s) => s.id !== song.id);
      // Add to beginning with current timestamp
      return [{ ...song, addedAt: Date.now() }, ...filtered].slice(0, 100); // Keep last 100
    });
  };

  return (
    <PlaylistContext.Provider
      value={{
        playlists,
        likedSongs,
        recentlyPlayed,
        createPlaylist,
        deletePlaylist,
        updatePlaylistName,
        addSongToPlaylist,
        removeSongFromPlaylist,
        toggleLike,
        isLiked,
        addToRecentlyPlayed,
      }}
    >
      {children}
    </PlaylistContext.Provider>
  );
}

export function usePlaylist() {
  const ctx = useContext(PlaylistContext);
  if (!ctx) {
    throw new Error('usePlaylist must be used within a PlaylistProvider');
  }
  return ctx;
}

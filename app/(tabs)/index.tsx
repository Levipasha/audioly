import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FlatList, Image, RefreshControl, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';


import { useNetwork } from '@/components/network-context';
import { useNowPlaying } from '@/components/now-playing-context';
import { usePlaylist } from '@/components/playlist-context';
import { useQueue } from '@/components/queue-context';
import { API_BASE_URL } from '@/constants/api';
import { metadataFetcher } from '@/services/background-metadata';
import { getDownloadedSongs } from '@/utils/downloads';
import { getAudioMetadata } from '@missingcore/audio-metadata';
import * as MediaLibrary from 'expo-media-library';
import { CassetteGridItem } from '../../components/CassetteGridItem';
import { CassetteListItem } from '../../components/CassetteListItem';
import { CassetteModal } from '../../components/CassetteModal';

type HomeFriend = {
  _id: string;
  name: string;
  username?: string;
  profileImage?: {
    url?: string;
  };
};

type ExploreSong = {
  _id: string;
  title: string;
  category?: string;
  coverUrl?: string;
  playCount?: number;
  owner?: {
    name: string;
  };
};

type AudioMetadataResult = {
  title?: string;
  artist?: string;
  album?: string;
  artwork?: string;
};

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
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
    marginBottom: 8,
  },
  tabButton: {
    marginRight: 24,
    paddingBottom: 4,
    position: 'relative',
  },
  activeTabButton: {
    borderBottomWidth: 2,
    borderBottomColor: '#3b82f6',
  },
  tabText: {
    color: '#9ca3af',
    fontSize: 15,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#ffffff',
  },
  buttonsContainer: {
    paddingHorizontal: 20,
    paddingTop: 16,
    gap: 16,
  },
  bigButton: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#111827',
    position: 'relative',
  },
  bigButtonBackgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 16,
  },
  bigButtonOverlay: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    position: 'relative',
    zIndex: 1,
  },
  bigButtonHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  bigButtonTitle: {
    color: '#f9fafb',
    fontSize: 20,
    fontWeight: '700',
  },
  bigButtonSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
  },
  recentSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  recentHeader: {
    color: '#e5e7eb',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  recentItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  recentCover: {
    width: 40,
    height: 40,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#111827',
  },
  recentTexts: {
    flex: 1,
  },
  recentTitle: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
  },
  recentSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  emptyRecent: {
    color: '#6b7280',
    fontSize: 13,
    marginTop: 4,
  },
  friendsSection: {
    marginTop: 16,
    paddingHorizontal: 20,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  seeAllButton: {
    paddingVertical: 4,
  },
  seeAllText: {
    color: '#3b82f6',
    fontSize: 14,
    fontWeight: '600',
  },
  likedSongsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  likedSongItem: {
    width: 100,
  },
  likedSongCover: {
    width: 100,
    height: 100,
    borderRadius: 12,
    marginBottom: 8,
  },
  likedSongTitle: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '500',
  },
  friendsRow: {
    flexDirection: 'row',
    marginTop: 8,
  },
  friendChip: {
    width: 80,
    marginRight: 12,
  },
  friendAvatar: {
    width: 72,
    height: 72,
    borderRadius: 8,
    backgroundColor: '#111827',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  friendName: {
    color: '#e5e7eb',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 80,
    textAlign: 'center',
  },
  friendEmail: {
    color: '#9ca3af',
    fontSize: 11,
    textAlign: 'center',
  },
  trendingSection: {
    marginTop: 24,
    paddingHorizontal: 20,
  },
  trendingRow: {
    marginTop: 8,
  },
  trendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    backgroundColor: '#020617',
    marginBottom: 8,
  },
  trendingCover: {
    width: 44,
    height: 44,
    borderRadius: 10,
    marginRight: 10,
    backgroundColor: '#111827',
  },
  trendingTexts: {
    flex: 1,
  },
  trendingTitle: {
    color: '#f9fafb',
    fontSize: 14,
    fontWeight: '600',
  },
  trendingSubtitle: {
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 2,
  },
  offlineBanner: {
    marginHorizontal: 20,
    marginTop: 8,
    marginBottom: 16,
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  offlineBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  offlineBannerText: {
    flex: 1,
  },
  offlineBannerTitle: {
    color: '#fbbf24',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  offlineBannerSubtitle: {
    color: '#9ca3af',
    fontSize: 13,
  },
  offlineButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  offlineButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  foldersContainer: {
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  folderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#1f2937',
  },
  folderIcon: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#1e293b',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  folderInfo: {
    flex: 1,
  },
  folderName: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  folderCount: {
    color: '#9ca3af',
    fontSize: 13,
    marginTop: 2,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    gap: 12,
    marginTop: 16,
    marginBottom: 8,
  },
  statTile: {
    flex: 1,
    backgroundColor: '#111827',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#1f2937',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  statNumber: {
    color: '#3b82f6',
    fontSize: 28,
    fontWeight: '800',
  },
  statLabel: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '600',
    marginTop: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
});

type TabType = 'home' | 'songs' | 'albums' | 'folders' | 'favorite';



export default function HomeScreen() {
  const router = useRouter();
  const { nowPlaying, recent, setNowPlaying, setQueue: setGlobalQueue, setQueueWithPlayer, setSourceName, playNext, playTrack, viewMode, setViewMode } = useNowPlaying();
  const { setQueue: setExploreQueue, setCurrentIndex } = useQueue();
  const isPlaying = nowPlaying?.isPlaying ?? false;
  const { likedSongs, toggleLike, isLiked } = usePlaylist();
  const { isConnected, isInternetReachable } = useNetwork();

  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedSongForModal, setSelectedSongForModal] = useState<any | null>(null);
  const [friends, setFriends] = useState<HomeFriend[]>([]);
  const [allSongs, setAllSongs] = useState<ExploreSong[]>([]);
  const [downloadedCount, setDownloadedCount] = useState(0);
  const [downloadedSongs, setDownloadedSongsList] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanStatus, setScanStatus] = useState('');
  const [localFolders, setLocalFolders] = useState<Record<string, number>>({});
  const [localSongCount, setLocalSongCount] = useState(0);
  const [selectedFolder, setSelectedFolder] = useState<string | null>(null);
  const [selectedArtist, setSelectedArtist] = useState<string | null>(null);
  const [metadataFetchStatus, setMetadataFetchStatus] = useState<{ isRunning: boolean; remaining: number }>({ isRunning: false, remaining: 0 });
  const [searchQuery, setSearchQuery] = useState('');

  // Track which songs have had their metadata fetched (persist across refreshes)
  const metadataFetchStarted = useRef(false);
  const lastSongCount = useRef(0);

  const isOffline = !isConnected || !isInternetReachable;

  const loadRemoteSongs = async () => {
    if (isOffline) return;
    try {
      const res = await fetch(`${API_BASE_URL}/songs/explore`);
      const json = await res.json();
      if (!res.ok) return;

      const mapped = json.map((song: any) => ({
        id: song._id,
        title: song.title,
        subtitle: (song as any).owner?.name || 'Artist',
        audioUrl: song.audioUrl,
        coverUrl: song.coverUrl,
        category: 'Community',
        route: '/(tabs)/player',
        owner: (song as any).owner
      }));
      setAllSongs(mapped);
    } catch (e) {
      console.log('[Home] Failed to fetch remote songs:', e);
    }
  };

  // Memoize expensive computations
  const sortedFolderNames = useMemo(() => Object.keys(localFolders).sort(), [localFolders]);

  // Combine local and remote songs
  const combinedAllTracks = useMemo(() => {
    const seen = new Set();
    const combined = [...downloadedSongs, ...allSongs];
    return combined.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });
  }, [downloadedSongs, allSongs]);

  // Filter songs based on search query
  const filteredSongs = useMemo(() => {
    if (!searchQuery.trim()) return combinedAllTracks;
    const query = searchQuery.toLowerCase();
    return combinedAllTracks.filter(song =>
      song.title?.toLowerCase().includes(query) ||
      song.subtitle?.toLowerCase().includes(query) ||
      song.artist?.toLowerCase().includes(query)
    );
  }, [combinedAllTracks, searchQuery]);

  // Group songs by artist to create albums
  const albums = useMemo(() => {
    const albumsMap: Record<string, { artist: string; songs: any[]; coverUrl?: string }> = {};

    combinedAllTracks.forEach(song => {
      const artist = song.subtitle || song.artist || 'Unknown Artist';

      if (!albumsMap[artist]) {
        albumsMap[artist] = {
          artist,
          songs: [],
          coverUrl: song.coverUrl,
        };
      }

      albumsMap[artist].songs.push(song);
      // Use the first song's cover if not set
      if (!albumsMap[artist].coverUrl && song.coverUrl) {
        albumsMap[artist].coverUrl = song.coverUrl;
      }
    });

    // Convert to array and sort by song count (most songs first)
    return Object.values(albumsMap).sort((a, b) => b.songs.length - a.songs.length);
  }, [combinedAllTracks]);

  const recentDownloadedSongs = useMemo(() => combinedAllTracks.slice(0, 10), [combinedAllTracks]);

  // Start background metadata fetch ONLY for NEW songs (not on every refresh!)
  useEffect(() => {
    const currentCount = downloadedSongs.length;

    // Only fetch if we have songs, we're online, and there are genuinely NEW songs
    if (currentCount > 0 && isConnected && isInternetReachable) {
      // Check if this is the first load OR if new songs were added
      const isFirstLoad = !metadataFetchStarted.current;
      const hasNewSongs = currentCount > lastSongCount.current;

      if (isFirstLoad || hasNewSongs) {
        console.log(`[Metadata] Starting background metadata fetch (First load: ${isFirstLoad}, New songs: ${hasNewSongs})`);
        metadataFetchStarted.current = true;
        lastSongCount.current = currentCount;

        // Fetch metadata in background with throttled UI updates
        let pendingUpdate = false;
        void metadataFetcher.fetchMetadataForSongs(downloadedSongs, () => {
          if (pendingUpdate) return;
          pendingUpdate = true;

          // Only refresh UI every 5 seconds to prevent lag during batch fetch
          setTimeout(async () => {
            if (!metadataFetcher.getStatus().isRunning && !pendingUpdate) return;
            const refreshedSongs = await metadataFetcher.applyCache(downloadedSongs);
            setDownloadedSongsList(refreshedSongs);
            pendingUpdate = false;
          }, 5000);
        });

        // Update status periodically
        const interval = setInterval(() => {
          setMetadataFetchStatus(metadataFetcher.getStatus());
        }, 1000);

        return () => clearInterval(interval);
      } else {
        console.log(`[Metadata] Skipping metadata fetch - all ${currentCount} songs already processed`);
      }
    }
  }, [downloadedSongs.length, isConnected, isInternetReachable]);

  // Main initialization and scanning manager
  const performScan = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
        setIsScanning(true);
        setScanStatus('Refreshing...');
      }

      // Check permissions
      const downloaded = await getDownloadedSongs();
      const { status } = await MediaLibrary.requestPermissionsAsync();

      let nativeSongs: any[] = [];
      if (status === 'granted') {
        if (!isRefresh) setScanStatus('Scanning...');

        // 1. Get total count first for accurate stats
        const countAssets = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: 1,
        });

        if (countAssets.totalCount) {
          setLocalSongCount(countAssets.totalCount);
        }

        // 2. Fetch assets for metadata/categorization
        // We limit this to ensure performance, but totalCount is accurate
        const assets = await MediaLibrary.getAssetsAsync({
          mediaType: MediaLibrary.MediaType.audio,
          first: 2000,
        });

        // 3. Extract metadata in batches to avoid rate limiting
        const { identifySong } = await import('@/services/artwork');
        const BATCH_SIZE = 5;
        const processedSongs: any[] = [];

        for (let i = 0; i < assets.assets.length; i += BATCH_SIZE) {
          const batch = assets.assets.slice(i, i + BATCH_SIZE);
          const results = await Promise.all(batch.map(async (asset) => {
            let title = asset.filename.replace(/\.[^/.]+$/, "");
            let artist = 'Unknown Artist';
            let artwork = undefined;

            try {
              // @ts-expect-error
              const metadata = await getAudioMetadata(asset.uri, ['title', 'artist', 'artwork']) as AudioMetadataResult;
              if (metadata.title) title = metadata.title;
              if (metadata.artist && metadata.artist !== 'Unknown Artist') artist = metadata.artist;
              if (metadata.artwork) artwork = metadata.artwork;
            } catch { }

            // Web Identification DISABLED to avoid rate limiting and speed up scanning
            // Local ID3 tags provide sufficient metadata

            return {
              id: asset.id,
              title: title,
              subtitle: artist,
              category: 'Local Storage',
              uri: asset.uri,
              localPath: asset.uri,
              coverUrl: artwork,
              folder: decodeURIComponent(asset.uri.split('/').slice(0, -1).pop() || 'Unknown'),
              route: '/(tabs)/player',
            };
          }));
          processedSongs.push(...results);

          // Optional: yield to UI thread if batch is large
          if (i % 50 === 0 && i > 0) {
            await new Promise(r => setTimeout(r, 0));
          }
        }
        nativeSongs = processedSongs;

        setScanStatus('');

        // 4. Update cache silently in background
        if (nativeSongs.length > 0) {
          const { updateCache, getCachedTracks } = await import('@/services/local-music-cache');
          console.log('Home: Triggering background cache update');

          // Wait for cache update to ensure we have all files/folders
          await updateCache(undefined, false);

          // Now reload from cache to get ALL folders/tracks (not just the scanned ones)
          const allCached = await getCachedTracks();
          if (allCached) {
            console.log(`Home: Post-scan reload, got ${allCached.length} tracks`);
            setLocalSongCount(allCached.length);

            // Update nativeSongs with ALL tracks from cache
            nativeSongs = allCached.map((track: any) => ({
              id: track.id,
              title: track.title,
              subtitle: track.artist || 'Unknown Artist',
              category: 'Local Storage',
              uri: track.audio?.uri || track.audio,
              localPath: track.audio?.uri || track.audio,
              folder: track.folder || 'Unknown',
              route: '/(tabs)/player',
              coverUrl: track.cover?.uri
            }));

            const foldersMap: Record<string, number> = {};
            allCached.forEach((track: any) => {
              const folder = track.folder || 'Unknown';
              foldersMap[folder] = (foldersMap[folder] || 0) + 1;
            });
            setLocalFolders(foldersMap);
          }
        }
      } else {
        setScanStatus('Permission denied');
      }

      // 5. Update UI State
      const combined = [...downloaded, ...nativeSongs];
      const seen = new Set();
      const uniqueCombined = combined.filter(s => {
        if (seen.has(s.id)) return false;
        seen.add(s.id);
        return true;
      });

      // CRITICAL: Apply cached metadata before setting state!
      // This ensures metadata persists across refreshes
      const songsWithMetadata = await metadataFetcher.applyCache(uniqueCombined);

      setDownloadedCount(songsWithMetadata.length);
      setDownloadedSongsList(songsWithMetadata);

    } catch (error: any) {
      console.error('Scan error:', error);
      setScanStatus('Error scanning library');
    } finally {
      if (isRefresh) {
        setRefreshing(false);
        setIsScanning(false);
      }
    }
  };

  // Initial Load - Check cache first, then scan if needed
  useEffect(() => {
    const init = async () => {
      try {
        setScanStatus('Loading...');

        // Try getting cache first (MMKV is fast!)
        const { getCachedLibrary } = await import('@/services/local-music-cache');
        const library = await getCachedLibrary();

        // Check if library exists and has tracks
        if (library && library.tracks.length > 0) {
          const { tracks, folders } = library;
          console.log(`Home: Instant load from ${tracks.length} cached tracks (MMKV)`);
          setLocalSongCount(tracks.length);

          // Use pre-computed folders instantly
          setLocalFolders(folders);

          setScanStatus('');

          // Populate Songs Tab from Cache + Offline DB
          try {
            console.log(`[Home] Mapping ${tracks.length} cached tracks to songs list`);
            const cachedNativeSongs = tracks.map((track: any) => ({
              id: track.id,
              title: track.title,
              subtitle: track.artist || 'Unknown Artist',
              category: 'Local Storage',
              uri: track.audio?.uri || track.audio, // Support both {uri} and direct string
              localPath: track.audio?.uri || track.audio,
              folder: track.folder || 'Unknown',
              route: '/(tabs)/player',
              coverUrl: track.cover?.uri
            }));

            let downloaded: any[] = [];
            try {
              // We need to import this or assume it's available. 
              // It was available in performScan, so likely imported.
              // If not, we might need to verify import.
              downloaded = await getDownloadedSongs();
              console.log(`[Home] Found ${downloaded.length} downloaded songs`);
            } catch (e) { console.error('Error fetching downloads in init:', e); }

            const combined = [...downloaded, ...cachedNativeSongs];

            // De-duplicate
            const seen = new Set();
            const uniqueCombined = combined.filter(s => {
              if (seen.has(s.id)) return false;
              seen.add(s.id);
              return true;
            });

            // Apply cached metadata immediately for instant display!
            const songsWithCachedMetadata = await metadataFetcher.applyCache(uniqueCombined);

            console.log(`[Home] Total unique songs: ${songsWithCachedMetadata.length}`);
            setDownloadedCount(songsWithCachedMetadata.length);
            setDownloadedSongsList(songsWithCachedMetadata);

            // Also fetch remote songs in background
            void loadRemoteSongs();

          } catch (e) {
            console.error('Error hydrating songs from cache:', e);
          }
          // Optional: perform a silent update if wanted, but user requested NO SYNC on open.
          // So we do NOTHING else.
          return;
        }

        // No cache? Scan.
        console.log('Home: No cache, scanning...');
        await performScan(false);
        void loadRemoteSongs();

      } catch (e) {
        console.error('Init error:', e);
        // Fallback to scan
        await performScan(false);
      }
    };

    void init();
  }, []); // Run ONCE on mount

  // Refresh Handler
  const onRefresh = () => {
    void performScan(true);
    void loadRemoteSongs();
  };

  const renderHomeTab = () => (
    <>
      <View style={styles.statsContainer}>
        <View style={styles.statTile}>
          <Text style={styles.statNumber}>
            {combinedAllTracks.length}
          </Text>
          <Text style={styles.statLabel}>Songs</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statNumber}>{albums.length}</Text>
          <Text style={styles.statLabel}>Albums</Text>
        </View>
      </View>

      <View style={styles.friendsSection}>
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.recentHeader}>Top Albums</Text>
          <TouchableOpacity onPress={() => setActiveTab('albums')} style={styles.seeAllButton}>
            <Text style={styles.seeAllText}>See All</Text>
          </TouchableOpacity>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.friendsRow}>
          {albums.slice(0, 8).map((album, idx) => (
            <TouchableOpacity
              key={album.artist}
              style={styles.friendChip}
              onPress={() => {
                setActiveTab('albums');
                setSelectedArtist(album.artist);
              }}
            >
              <View style={[styles.friendAvatar, { overflow: 'hidden' }]}>
                {album.coverUrl ? (
                  <Image source={{ uri: album.coverUrl }} style={{ width: '100%', height: '100%' }} />
                ) : (
                  <Ionicons name="disc" size={32} color="#3b82f6" />
                )}
              </View>
              <Text style={styles.friendName} numberOfLines={1}>
                {album.artist}
              </Text>
              <Text style={styles.friendEmail} numberOfLines={1}>
                {album.songs.length} songs
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <View style={styles.recentSection}>
        <Text style={styles.recentHeader}>History</Text>
        {recent.length === 0 ? (
          <Text style={styles.emptyRecent}>Your playback history will appear here.</Text>
        ) : (
          <View>
            {recent.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.recentItem}
                onPress={async () => {
                  try {
                    // Set queue to recent history if needed, or just play this track
                    setGlobalQueue(recent);
                    await playTrack(item);
                    router.push({
                      pathname: '/(tabs)/player',
                      params: { songId: item.id },
                    });
                  } catch (err) {
                    console.error('Error playing from history:', err);
                    router.push({
                      pathname: '/(tabs)/player',
                      params: { songId: item.id },
                    });
                  }
                }}
              >
                {item.coverUrl ? (
                  <Image source={{ uri: item.coverUrl }} style={styles.recentCover} />
                ) : (
                  <View style={styles.recentCover} />
                )}
                <View style={styles.recentTexts}>
                  <Text numberOfLines={1} style={styles.recentTitle}>
                    {item.title}
                  </Text>
                  {item.subtitle ? (
                    <Text numberOfLines={1} style={styles.recentSubtitle}>
                      {item.subtitle}
                    </Text>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </>
  );

  const renderSongsTab = () => {
    console.log(`[Songs Tab] Rendering with ${combinedAllTracks.length} tracks (Local + Community)`);

    const renderSongItem = ({ item: song }: { item: any }) => {
      const isActive = nowPlaying?.id === song.id;

      if (viewMode === 'grid') {
        return (
          <CassetteGridItem
            title={song.title}
            subtitle={song.subtitle || 'Local'}
            coverUrl={song.coverUrl}
            isActive={isActive}
            isPlaying={isPlaying && isActive}
            isLiked={isLiked(song.id)}
            onPress={() => setSelectedSongForModal(song)}
            onFavorite={() => toggleLike({
              id: song.id,
              title: song.title,
              subtitle: song.subtitle || 'Local',
              audioUrl: song.audioUrl || song.uri || song.localPath,
              coverUrl: song.coverUrl,
              addedAt: Date.now()
            })}
          />
        );
      }

      return (
        <CassetteListItem
          title={song.title}
          subtitle={song.subtitle || 'Local'}
          isActive={isActive}
          isPlaying={isPlaying && isActive}
          isLiked={isLiked(song.id)}
          onPress={() => setSelectedSongForModal(song)}
          onFavorite={() => toggleLike({
            id: song.id,
            title: song.title,
            subtitle: song.subtitle || 'Local',
            audioUrl: song.audioUrl || song.uri || song.localPath,
            coverUrl: song.coverUrl,
            addedAt: Date.now()
          })}
        />
      );
    };

    return (
      <View style={{ flex: 1 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16 }}>
          <Text style={styles.recentHeader}>All Cassettes</Text>
          <TouchableOpacity
            onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
            style={{ padding: 5 }}
          >
            <Ionicons name={viewMode === 'list' ? "grid-outline" : "list-outline"} size={22} color="#3b82f6" />
          </TouchableOpacity>
        </View>
        {filteredSongs.length === 0 ? (
          <View style={styles.trendingSection}>
            <Text style={styles.emptyRecent}>{searchQuery ? 'No songs match your search.' : 'No local songs found in storage.'}</Text>
          </View>
        ) : (
          <FlatList
            key={viewMode} // Force re-render when switching columns
            numColumns={viewMode === 'grid' ? 2 : 1}
            data={filteredSongs}
            renderItem={renderSongItem}
            keyExtractor={(item, index) => item.id || `song-${index}`}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}
            columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-between' } : undefined}
            initialNumToRender={20}
            maxToRenderPerBatch={20}
            windowSize={7}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
            }
          />
        )}
      </View>
    );
  };

  const renderFoldersTab = () => {
    if (selectedFolder) {
      const folderSongs = filteredSongs.filter(s => s.folder === selectedFolder);
      return (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setSelectedFolder(null)} style={{ marginRight: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#3b82f6" />
              </TouchableOpacity>
              <Text style={styles.recentHeader}>Folder: {selectedFolder}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              style={{ padding: 5 }}
            >
              <Ionicons name={viewMode === 'list' ? "grid-outline" : "list-outline"} size={22} color="#3b82f6" />
            </TouchableOpacity>
          </View>
          <FlatList
            key={viewMode}
            numColumns={viewMode === 'grid' ? 2 : 1}
            data={folderSongs}
            renderItem={({ item: song }) => {
              const isActive = nowPlaying?.id === song.id;
              if (viewMode === 'grid') {
                return (
                  <CassetteGridItem
                    title={song.title}
                    subtitle={song.subtitle || 'Local'}
                    coverUrl={song.coverUrl}
                    isActive={isActive}
                    isPlaying={isPlaying && isActive}
                    isLiked={isLiked(song.id)}
                    onPress={() => setSelectedSongForModal(song)}
                    onFavorite={() => toggleLike({
                      id: song.id,
                      title: song.title,
                      subtitle: song.subtitle || 'Local',
                      audioUrl: song.audioUrl || song.uri || song.localPath,
                      coverUrl: song.coverUrl,
                      addedAt: Date.now()
                    })}
                  />
                );
              }
              return (
                <CassetteListItem
                  title={song.title}
                  subtitle={song.subtitle || 'Local'}
                  isActive={isActive}
                  isPlaying={isPlaying && isActive}
                  isLiked={isLiked(song.id)}
                  onPress={() => setSelectedSongForModal(song)}
                  onFavorite={() => toggleLike({
                    id: song.id,
                    title: song.title,
                    subtitle: song.subtitle || 'Local',
                    audioUrl: song.audioUrl || song.uri || song.localPath,
                    coverUrl: song.coverUrl,
                    addedAt: Date.now()
                  })}
                />
              );
            }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-between' } : undefined}
          />
        </View>
      );
    }

    const renderFolderItem = ({ item: name }: { item: string }) => (
      <TouchableOpacity
        key={name}
        style={styles.folderItem}
        onPress={() => setSelectedFolder(name)}
      >
        <View style={styles.folderIcon}>
          <Ionicons name="folder" size={24} color="#3b82f6" />
        </View>
        <View style={styles.folderInfo}>
          <Text style={styles.folderName}>{name}</Text>
          <Text style={styles.folderCount}>{localFolders[name]} songs</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#4b5563" />
      </TouchableOpacity>
    );

    return (
      <View style={{ flex: 1 }}>
        <Text style={[styles.recentHeader, { paddingHorizontal: 20, paddingTop: 16 }]}>Local Folders</Text>
        {sortedFolderNames.length === 0 ? (
          <View style={[styles.foldersContainer, { flex: 1, justifyContent: 'center' }]}>
            <View style={styles.emptyRecent}>
              <Ionicons name="folder-open-outline" size={48} color="#4b5563" style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={{ textAlign: 'center', color: '#6b7280' }}>No local folders found.</Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={sortedFolderNames}
            renderItem={renderFolderItem}
            keyExtractor={(item) => item}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
            }
          />
        )}
      </View>
    );
  };
  const renderAlbumsTab = () => {
    if (selectedArtist) {
      const artistSongs = filteredSongs.filter(s => (s.subtitle || s.artist || 'Unknown Artist') === selectedArtist);
      return (
        <View style={{ flex: 1 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingTop: 16, marginBottom: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setSelectedArtist(null)} style={{ marginRight: 10 }}>
                <Ionicons name="arrow-back" size={24} color="#3b82f6" />
              </TouchableOpacity>
              <Text style={styles.recentHeader}>Artist: {selectedArtist}</Text>
            </View>
            <TouchableOpacity
              onPress={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              style={{ padding: 5 }}
            >
              <Ionicons name={viewMode === 'list' ? "grid-outline" : "list-outline"} size={22} color="#3b82f6" />
            </TouchableOpacity>
          </View>
          <FlatList
            key={viewMode}
            numColumns={viewMode === 'grid' ? 2 : 1}
            data={artistSongs}
            renderItem={({ item: song }) => {
              const isActive = nowPlaying?.id === song.id;
              if (viewMode === 'grid') {
                return (
                  <CassetteGridItem
                    title={song.title}
                    subtitle={selectedArtist || 'Artist'}
                    coverUrl={song.coverUrl}
                    isActive={isActive}
                    isPlaying={isPlaying && isActive}
                    isLiked={isLiked(song.id)}
                    onPress={() => setSelectedSongForModal(song)}
                    onFavorite={() => toggleLike({
                      id: song.id,
                      title: song.title,
                      subtitle: selectedArtist || 'Artist',
                      audioUrl: song.audioUrl || song.uri || song.localPath,
                      coverUrl: song.coverUrl,
                      addedAt: Date.now()
                    })}
                  />
                );
              }
              return (
                <CassetteListItem
                  title={song.title}
                  subtitle={selectedArtist || 'Artist'}
                  isActive={isActive}
                  isPlaying={isPlaying && isActive}
                  isLiked={isLiked(song.id)}
                  onPress={() => setSelectedSongForModal(song)}
                  onFavorite={() => toggleLike({
                    id: song.id,
                    title: song.title,
                    subtitle: selectedArtist || 'Artist',
                    audioUrl: song.audioUrl || song.uri || song.localPath,
                    coverUrl: song.coverUrl,
                    addedAt: Date.now()
                  })}
                />
              );
            }}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ paddingHorizontal: 20 }}
            columnWrapperStyle={viewMode === 'grid' ? { justifyContent: 'space-between' } : undefined}
          />
        </View>
      );
    }

    const renderAlbumItem = ({ item }: { item: any }) => (
      <TouchableOpacity
        key={item.artist}
        style={styles.folderItem}
        onPress={() => setSelectedArtist(item.artist)}
      >
        <View style={[styles.folderIcon, { overflow: 'hidden' }]}>
          {item.coverUrl ? (
            <Image source={{ uri: item.coverUrl }} style={{ width: '100%', height: '100%' }} />
          ) : (
            <Ionicons name="person" size={24} color="#3b82f6" />
          )}
        </View>
        <View style={styles.folderInfo}>
          <Text style={styles.folderName} numberOfLines={1}>{item.artist}</Text>
          <Text style={styles.folderCount}>{item.songs.length} song{item.songs.length !== 1 ? 's' : ''}</Text>
        </View>
        <Ionicons name="chevron-forward" size={18} color="#4b5563" />
      </TouchableOpacity>
    );

    return (
      <View style={{ flex: 1 }}>
        <Text style={[styles.recentHeader, { paddingHorizontal: 20, paddingTop: 16 }]}>Artists & Albums</Text>
        {albums.length === 0 ? (
          <View style={[styles.foldersContainer, { flex: 1, justifyContent: 'center' }]}>
            <View style={styles.emptyRecent}>
              <Ionicons name="disc-outline" size={48} color="#4b5563" style={{ alignSelf: 'center', marginBottom: 12 }} />
              <Text style={{ textAlign: 'center', color: '#6b7280' }}>No albums found.</Text>
            </View>
          </View>
        ) : (
          <FlatList
            data={albums}
            renderItem={renderAlbumItem}
            keyExtractor={(item) => item.artist}
            contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 8 }}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
            }
          />
        )}
      </View>
    );
  };

  const renderFavoriteTab = () => (
    <View style={styles.friendsSection}>
      <View style={styles.sectionHeaderRow}>
        <Text style={styles.recentHeader}>Liked Audiolys</Text>
        {likedSongs.length > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/liked-songs')}
            style={styles.seeAllButton}
          >
            <Text style={styles.seeAllText}>Manage</Text>
          </TouchableOpacity>
        )}
      </View>
      {likedSongs.length === 0 ? (
        <View style={styles.emptyRecent}>
          <Ionicons name="heart-dislike-outline" size={48} color="#4b5563" style={{ alignSelf: 'center', marginBottom: 12 }} />
          <Text style={{ textAlign: 'center', color: '#6b7280' }}>You haven't liked any audiolys yet.</Text>
        </View>
      ) : (
        <View style={{ marginTop: 8 }}>
          {likedSongs.map((song) => (
            <CassetteListItem
              key={song.id}
              title={song.title}
              subtitle={song.subtitle || 'Liked song'}
              isActive={nowPlaying?.id === song.id}
              isPlaying={isPlaying && nowPlaying?.id === song.id}
              isLiked={isLiked(song.id)}
              onPress={() => setSelectedSongForModal({ ...song, subtitle: song.subtitle || 'Liked song' })}
              onFavorite={() => toggleLike({
                ...song,
                subtitle: song.subtitle || 'Liked song',
              })}
            />
          ))}
        </View>
      )}
    </View>
  );

  const TopNav = () => (
    <View style={styles.tabBar}>
      {(['home', 'songs', 'albums', 'folders', 'favorite'] as TabType[]).map((tab) => (
        <TouchableOpacity
          key={tab}
          onPress={() => {
            setActiveTab(tab);
            if (tab !== 'songs') setSelectedFolder(null);
            if (tab !== 'albums') setSelectedArtist(null);
          }}
          style={[styles.tabButton, activeTab === tab && styles.activeTabButton]}
        >
          <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Search Bar Header */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 4, paddingBottom: 10, gap: 12 }}>
        <View style={{
          flex: 1,
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: '#1f2937',
          borderRadius: 12,
          paddingHorizontal: 12,
          borderWidth: 1,
          borderColor: '#374151'
        }}>
          <Ionicons name="search" size={20} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            style={{
              flex: 1,
              color: '#ffffff',
              fontSize: 16,
              paddingVertical: 10,
            }}
            placeholder="Search songs..."
            placeholderTextColor="#6b7280"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={20} color="#6b7280" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Metadata Progress Bar - Shows only while fetching */}
      {metadataFetchStatus.isRunning && (
        <View style={{ paddingHorizontal: 20, paddingBottom: 8 }}>
          <View style={{
            height: 4,
            backgroundColor: '#1f2937',
            borderRadius: 2,
            overflow: 'hidden'
          }}>
            <View style={{
              height: '100%',
              backgroundColor: '#10b981',
              width: `${metadataFetchStatus.remaining > 0 ? (100 - (metadataFetchStatus.remaining / downloadedSongs.length * 100)) : 100}%`,
              borderRadius: 2
            }} />
          </View>
          <Text style={{ color: '#10b981', fontSize: 11, fontWeight: '600', marginTop: 4 }}>
            Fetching metadata... {Math.round(metadataFetchStatus.remaining > 0 ? (100 - (metadataFetchStatus.remaining / downloadedSongs.length * 100)) : 100)}%
          </Text>
        </View>
      )}

      <TopNav />

      {/* Songs and Folders tabs have their own FlatList, so render them directly without ScrollView */}
      {activeTab === 'songs' ? (
        renderSongsTab()
      ) : activeTab === 'folders' ? (
        renderFoldersTab()
      ) : activeTab === 'albums' ? (
        renderAlbumsTab()
      ) : (
        <ScrollView
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ffffff" />
          }
        >
          {isOffline && downloadedCount > 0 && (
            <View style={styles.offlineBanner}>
              <View style={styles.offlineBannerContent}>
                <Ionicons name="wifi-outline" size={20} color="#fbbf24" />
                <View style={styles.offlineBannerText}>
                  <Text style={styles.offlineBannerTitle}>You&apos;re offline</Text>
                  <Text style={styles.offlineBannerSubtitle}>
                    {downloadedCount} downloaded song{downloadedCount !== 1 ? 's' : ''} available
                  </Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.offlineButton}
                onPress={() => router.push('/offline-songs')}
              >
                <Text style={styles.offlineButtonText}>Play Offline</Text>
              </TouchableOpacity>
            </View>
          )}

          {activeTab === 'home' && renderHomeTab()}
          {activeTab === 'favorite' && renderFavoriteTab()}
        </ScrollView>
      )}
      <CassetteModal
        isVisible={!!selectedSongForModal}
        song={selectedSongForModal}
        onClose={() => setSelectedSongForModal(null)}
        onPlay={async () => {
          if (!selectedSongForModal) return;
          const song = selectedSongForModal;

          if (song.audioUrl) {
            // Online/Downloaded Liked song
            const track = {
              id: song.id,
              title: song.title,
              subtitle: song.subtitle,
              audio: { uri: song.audioUrl },
              coverUrl: song.coverUrl,
              route: '/(tabs)/player'
            };

            // Set queue for online/liked songs
            let sourceList = [];
            if (activeTab === 'home') {
              sourceList = recent; // Use history as queue in home tab
            } else if (activeTab === 'favorite') {
              sourceList = likedSongs;
            } else if (activeTab === 'songs') {
              sourceList = combinedAllTracks;
            } else if (activeTab === 'albums' && selectedArtist) {
              sourceList = filteredSongs.filter(s => (s.subtitle || s.artist || 'Unknown Artist') === selectedArtist);
            } else {
              sourceList = allSongs;
            }

            // Set source name for context awareness
            let sourceName = 'Explore';
            if (activeTab === 'home') sourceName = `History (${sourceList.length})`;
            else if (activeTab === 'favorite') sourceName = `Liked Songs (${sourceList.length})`;
            else if (activeTab === 'songs') sourceName = `All Songs (${sourceList.length})`;
            else if (activeTab === 'albums' && selectedArtist) sourceName = `Album: ${selectedArtist} (${sourceList.length})`;

            setSourceName(sourceName);

            const songQueue = sourceList.map((s: any) => ({
              id: s.id || s._id,
              title: s.title,
              subtitle: s.subtitle || s.owner?.name || 'Artist',
              audio: { uri: s.audioUrl || s.uri },
              coverUrl: s.coverUrl || s.artwork,
              route: '/(tabs)/player'
            }));
            setGlobalQueue(songQueue);

            // Set specific queue for explore-player compatibility
            const exploreQueue = sourceList.map((s: any) => ({
              id: s.id || s._id,
              title: s.title,
              subtitle: s.subtitle || s.owner?.name || 'Artist',
              audioUrl: s.audioUrl || s.uri,
              coverUrl: s.coverUrl || s.artwork,
              owner: s.owner
            }));
            setExploreQueue(exploreQueue);
            const idx = sourceList.findIndex((s: any) => (s.id || s._id) === song.id);
            setCurrentIndex(idx >= 0 ? idx : 0);

            await playTrack(track);
            router.push({
              pathname: '/(tabs)/player',
              params: { songId: song.id },
            });
          } else {
            // Local storage song
            const track = {
              id: song.id,
              title: song.title,
              subtitle: song.artist || song.subtitle || 'Unknown Artist',
              audio: song.audio || { uri: song.uri || song.localPath },
              coverUrl: song.cover?.uri || song.coverUrl || song.artwork,
              route: '/(tabs)/player'
            };

            // Context-aware queue logic
            let sourceList = activeTab === 'songs' ? combinedAllTracks : downloadedSongs;
            if (activeTab === 'folders' && selectedFolder) {
              sourceList = downloadedSongs.filter(s => s.folder === selectedFolder);
            }

            // Set source name for local songs
            let sourceName = `All Songs (${sourceList.length})`;
            if (activeTab === 'folders' && selectedFolder) sourceName = `Folder: ${selectedFolder} (${sourceList.length})`;
            else if (activeTab === 'songs') sourceName = `Local Library (${sourceList.length})`;

            setSourceName(sourceName);

            const songQueue = sourceList.map((s: any) => ({
              id: s.id,
              title: s.title || 'Unknown Title',
              subtitle: s.subtitle || s.artist || 'Unknown Artist',
              audio: { uri: s.uri || s.localPath || s.audioUrl },
              coverUrl: s.coverUrl,
              route: '/(tabs)/player'
            }));

            await setQueueWithPlayer(songQueue);

            // Find our track in the new queue for correct context
            const activeTrack = songQueue.find(t => t.id === song.id) || track;
            await playTrack(activeTrack);
            router.push('/(tabs)/player');
          }
          setSelectedSongForModal(null);
        }}
      />
    </SafeAreaView>
  );
}


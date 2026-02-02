import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

type NowPlaying = {
  id?: string;
  title: string;
  subtitle?: string;
  coverUrl?: any;
  audio?: any;
  // 0–1 progress of the current track
  progress?: number;
  // route to reopen the full player for this track
  route?: string;
  // optional params for that route (e.g. songId)
  params?: Record<string, any>;
  // whether the track is currently playing
  isPlaying?: boolean;
};

type NowPlayingContextType = {
  nowPlaying: NowPlaying | null;
  setNowPlaying: React.Dispatch<React.SetStateAction<NowPlaying | null>>;
  recent: NowPlaying[];
  addRecent: (track: NowPlaying) => void;
  queue: NowPlaying[];
  setQueue: (tracks: NowPlaying[]) => void;
  setQueueWithPlayer: (tracks: NowPlaying[]) => Promise<void>;
  sourceName: string;
  setSourceName: (name: string) => void;
  sourceHistory: string[];
  playNext: () => Promise<void>;
  playPrev: () => Promise<void>;
  playTrack: (track: NowPlaying) => Promise<void>;
  togglePlayPause: () => Promise<void>;
  clearAll: () => Promise<void>;
  viewMode: 'list' | 'grid';
  setViewMode: (mode: 'list' | 'grid') => void;
};

const NowPlayingContext = createContext<NowPlayingContextType | undefined>(undefined);

let lastToggleTime = 0;
const TOGGLE_DEBOUNCE = 800; // ms to ignore status updates after manual toggle

import { getTrackPlayerModule, isTrackPlayerAvailable } from './lazy-track-player';
import { reset as resetPlayer, setupPlayer, togglePlayback } from './track-player-service';
import { cleanSearchQuery, identifySong } from '../services/artwork';
import { metadataFetcher } from '../services/background-metadata';
import { loadNowPlaying, loadQueue, loadRecent, loadSourceInfo, saveNowPlaying, saveQueue, saveRecent, saveSourceInfo } from './playback-persistence';

export const parseArtistTitle = (title: string, artist?: string) => {
  const cleanTitle = title || 'Unknown Title';
  const cleanArtist = artist || 'Unknown Artist';

  const dashRegex = /\s*[-–—]\s*/;

  if (dashRegex.test(cleanTitle)) {
    const parts = cleanTitle.split(dashRegex);
    if (parts.length >= 2) {
      const potentialArtist = parts[0].trim();
      const potentialTitle = parts.slice(1).join(' - ').trim();

      if (!artist || artist === 'Unknown Artist' || artist.toLowerCase() === potentialArtist.toLowerCase()) {
        return { title: potentialTitle, artist: potentialArtist };
      }
    }
  }

  return { title: cleanTitle, artist: cleanArtist };
};

export function NowPlayingProvider({ children }: { children: ReactNode }) {
  const [nowPlaying, setNowPlaying] = useState<NowPlaying | null>(null);
  const [recent, setRecent] = useState<NowPlaying[]>([]);
  const [queue, setQueueState] = useState<NowPlaying[]>([]);
  const [sourceName, setSourceNameState] = useState<string>('All Songs');
  const [sourceHistory, setSourceHistory] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');

  const setQueue = (tracksOrFn: NowPlaying[] | ((prev: NowPlaying[]) => NowPlaying[])) => {
    setQueueState((prev) => {
      const tracks = typeof tracksOrFn === 'function' ? tracksOrFn(prev) : tracksOrFn;
      // Deduplicate tracks by ID or Audio URI before setting state
      const seen = new Set();
      const unique = tracks.filter(t => {
        const key = t.id || t.audio;
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      return unique;
    });
  };

  const setSourceName = (name: string) => {
    setSourceNameState(name);

    // 1. Strip song count: "Folder (10)" -> "Folder"
    const nameWithoutCount = name.replace(/\s?\(\d+\)$/, '').trim();

    setSourceHistory(prev => {
      // 2. Fuzzy normalization: ignore parentheses/years and lowercase
      const normalize = (str: string) => str.replace(/\s\([^)]+\)/g, '').toLowerCase().trim();
      const targetNormalized = normalize(nameWithoutCount);

      // Filter out ANY existing items that match this normalized name
      // Effectively merges "2 States" and "2 States (2014)"
      const otherItems = prev.filter(s => normalize(s) !== targetNormalized);
      const nextHistory = [nameWithoutCount, ...otherItems].slice(0, 10);

      void saveSourceInfo(name, nextHistory);
      return nextHistory;
    });
  };

  // Save now playing when it changes
  useEffect(() => {
    if (nowPlaying) {
      void saveNowPlaying(nowPlaying);
    }
  }, [nowPlaying]);

  // Save queue when it changes
  useEffect(() => {
    if (queue.length > 0) {
      void saveQueue(queue);
    }
  }, [queue]);

  const addRecent = (track: NowPlaying) => {
    console.log(`[History] Updating history with: ${track.title}`);
    setRecent((prev) => {
      const trackId = track.id || `${track.title}|${track.subtitle ?? ''}`;
      const existing = prev.find((t) => {
        const tId = t.id || `${t.title}|${t.subtitle ?? ''}`;
        return tId === trackId;
      });

      const next = existing
        ? [track, ...prev.filter((t) => t !== existing)]
        : [track, ...prev];
      const sliced = next.slice(0, 20); // Keep last 20
      void saveRecent(sliced);
      return sliced;
    });
  };

  const queueRef = React.useRef<NowPlaying[]>([]);
  useEffect(() => {
    queueRef.current = queue;
  }, [queue]);

  const nowPlayingRef = React.useRef<NowPlaying | null>(null);
  useEffect(() => {
    nowPlayingRef.current = nowPlaying;
  }, [nowPlaying]);

  // Initialize Track Player (skip listeners when TrackPlayer failed to load, e.g. New Arch)
  useEffect(() => {
    async function init() {
      const isSetup = await setupPlayer();
      if (isSetup) {
        // Restore state
        const savedTrack = await loadNowPlaying();
        const savedQueue = await loadQueue();

        if (savedQueue.length > 0) {
          setQueue(savedQueue);
        }

        const savedRecent = await loadRecent();
        if (savedRecent.length > 0) {
          setRecent(savedRecent);
        }

        if (savedTrack) {
          setNowPlaying({ ...savedTrack, isPlaying: false });
        }

        const savedSourceInfo = await loadSourceInfo();
        if (savedSourceInfo) {
          setSourceNameState(savedSourceInfo.sourceName);
          setSourceHistory(savedSourceInfo.history);
        }
      }
    }
    init();

    if (!isTrackPlayerAvailable()) return;

    const mod = getTrackPlayerModule();
    const TrackPlayer = mod?.default;
    const Event = mod?.Event;
    const State = mod?.State;
    if (!TrackPlayer || !Event || !State) return;

    // Listen for state changes
    const subState = TrackPlayer.addEventListener(Event.PlaybackState, async (event: any) => {
      // Modern TrackPlayer (v4+) returns an object { state: State }
      const state = (event.state && typeof event.state === 'object') ? event.state.state : event.state;

      if (state === State.Playing) {
        setNowPlaying(prev => prev ? { ...prev, isPlaying: true } : null);
      } else if (state === State.Paused || state === State.Ready) {
        setNowPlaying(prev => prev ? { ...prev, isPlaying: false } : null);
      }
    });

    // CRITICAL: Listen for track changes to update history automatically
    const subTrack = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event: any) => {
      const track = event.track || await TrackPlayer.getActiveTrack();

      if (track) {
        console.log(`[NowPlayingContext] Track Event: ${track.title} (${track.id})`);

        setNowPlaying(prev => {
          const latestNowPlaying = nowPlayingRef.current;
          const trackIdStr = track.id?.toString();
          const isSameTrack = latestNowPlaying?.id?.toString() === trackIdStr;

          const currentQueue = queueRef.current;
          const queueItem = currentQueue.find(q => q.id?.toString() === trackIdStr) ||
            currentQueue.find(q => q.title === track.title);

          if (queueItem) {
            console.log(`[NowPlayingContext] Recovered metadata from queue for: ${queueItem.title}`);
          }

          const rawTitle = track.title || queueItem?.title || (isSameTrack ? latestNowPlaying?.title : 'Unknown Title') || 'Unknown Title';
          const rawArtist = (track.artist && track.artist !== 'Unknown Artist')
            ? track.artist
            : (queueItem?.subtitle || (isSameTrack ? latestNowPlaying?.subtitle : 'Unknown Artist') || 'Unknown Artist');

          const parsed = parseArtistTitle(rawTitle, rawArtist);

          const nextCover = track.artwork || queueItem?.coverUrl || (isSameTrack ? latestNowPlaying?.coverUrl : undefined) || prev?.coverUrl;
          const nextAudio = track.url || queueItem?.audio || (isSameTrack ? latestNowPlaying?.audio : undefined) || prev?.audio;

          if (!nextCover && rawTitle && rawTitle !== 'Unknown Title') {
            const query = (rawArtist && rawArtist !== 'Unknown Artist') ? `${rawTitle} ${rawArtist}` : rawTitle;
            console.log(`[NowPlayingContext] Missing artwork for "${rawTitle}", fetching with query: ${query}`);

            void (async () => {
              const metadata = await identifySong(query);
              if (metadata && metadata.coverUrl) {
                console.log(`[NowPlayingContext] Fetched artwork for "${rawTitle}": ${metadata.coverUrl}`);

                import('../services/background-metadata').then(({ metadataFetcher }) => {
                  metadataFetcher.updateCacheEntry(rawTitle, metadata.artist, metadata.coverUrl);
                });

                setNowPlaying(current => {
                  if (current) {
                    const currentClean = cleanSearchQuery(current.title).toLowerCase();
                    const rawClean = cleanSearchQuery(rawTitle).toLowerCase();

                    if (current.id === trackIdStr || currentClean === rawClean) {
                      return { ...current, coverUrl: metadata.coverUrl, subtitle: metadata.artist };
                    }
                  }
                  return current;
                });
              }
            })();
          }

          return {
            id: trackIdStr || (isSameTrack ? latestNowPlaying?.id : track.title),
            title: parsed.title,
            subtitle: parsed.artist,
            coverUrl: nextCover,
            audio: nextAudio,
            isPlaying: true,
            route: '/(tabs)/player',
            params: { songId: track.id }
          };
        });

        setRecent(prev => {
          const trackId = track.id?.toString() || track.title;
          const currentQueue = queueRef.current;
          const queueItem = currentQueue.find(q => q.id?.toString() === trackId);
          const finalMetadata = parseArtistTitle(track.title || queueItem?.title || 'Unknown Title', track.artist || queueItem?.subtitle || 'Unknown Artist');

          const newRecent: NowPlaying = {
            id: trackId,
            title: finalMetadata.title,
            subtitle: finalMetadata.artist,
            coverUrl: track.artwork || queueItem?.coverUrl,
            audio: track.url || queueItem?.audio,
            isPlaying: true,
            route: '/(tabs)/player',
          };

          const existingIdx = prev.findIndex(t => t.id === trackId || (t.title === newRecent.title && t.subtitle === newRecent.subtitle));
          let next = [...prev];
          if (existingIdx !== -1) {
            next.splice(existingIdx, 1);
          }
          next = [newRecent, ...next].slice(0, 20);
          void saveRecent(next);
          return next;
        });
      }
    });

    return () => {
      subState.remove();
      subTrack.remove();
    };
  }, []);

  const playTrack = async (track: NowPlaying) => {
    if (!track.audio && !track.route) return;
    const TrackPlayer = getTrackPlayerModule()?.default;
    if (!TrackPlayer) return;

    try {
      const metadata = parseArtistTitle(track.title, track.subtitle);
      const cleanTrack = { ...track, title: metadata.title, subtitle: metadata.artist };

      const trackUrl = typeof track.audio === 'object' && track.audio?.uri ? track.audio.uri : track.audio;

      let finalCover = track.coverUrl;
      const metadataToParse = parseArtistTitle(cleanTrack.title, cleanTrack.subtitle);

      if (!finalCover && metadataToParse.title && metadataToParse.title !== 'Unknown Title') {
        const query = (metadataToParse.artist && metadataToParse.artist !== 'Unknown Artist')
          ? `${metadataToParse.title} ${metadataToParse.artist}`
          : metadataToParse.title;

        void identifySong(query).then(metadata => {
          if (metadata) {
            setNowPlaying(current => {
              if (current) {
                const currentClean = cleanSearchQuery(current.title).toLowerCase();
                const targetClean = cleanSearchQuery(cleanTrack.title).toLowerCase();

                if (currentClean === targetClean) {
                  return {
                    ...current,
                    coverUrl: metadata.coverUrl,
                    title: metadata.title,
                    subtitle: metadata.artist
                  };
                }
              }
              return current;
            });

            import('../services/background-metadata').then(({ metadataFetcher }) => {
              metadataFetcher.updateCacheEntry(metadataToParse.title, metadata.artist, metadata.coverUrl);
            });
          }
        });
      }

      // Sync the entire queue to TrackPlayer so next/prev works in notification
      const currentQueue = queueRef.current;
      const playerTracks = currentQueue.map(t => {
        const tUrl = typeof t.audio === 'object' && t.audio?.uri ? t.audio.uri : t.audio;
        return {
          id: t.id || t.title,
          url: tUrl,
          title: t.title,
          artist: t.subtitle,
          artwork: t.coverUrl,
        };
      });

      // Find index of the clicked track
      const trackId = track.id || track.title;
      const index = playerTracks.findIndex(t => t.id === trackId);

      await TrackPlayer.reset();

      if (playerTracks.length > 0) {
        await TrackPlayer.add(playerTracks);
        if (index !== -1) {
          await TrackPlayer.skip(index);
        } else {
          // Fallback if track not in queue
          await TrackPlayer.add({
            id: track.id || track.title,
            url: trackUrl,
            title: cleanTrack.title,
            artist: cleanTrack.subtitle,
            artwork: finalCover,
          });
          await TrackPlayer.skip(playerTracks.length);
        }
      } else {
        await TrackPlayer.add({
          id: track.id || track.title,
          url: trackUrl,
          title: cleanTrack.title,
          artist: cleanTrack.subtitle,
          artwork: finalCover,
        });
      }

      await TrackPlayer.play();
      setNowPlaying({ ...cleanTrack, coverUrl: finalCover, isPlaying: true });
    } catch (err) {
      console.error('Context Play Error', err);
    }
  };

  const playNext = async () => {
    const TrackPlayer = getTrackPlayerModule()?.default;
    if (!TrackPlayer) return;
    try {
      await TrackPlayer.skipToNext();
      await TrackPlayer.play();
    } catch (err) {
      // Fallback if skip failed (e.g. at end of queue)
      if (queue.length === 0 || !nowPlaying) return;
      const currentIndex = queue.findIndex(t => t.id === nowPlaying.id || (t.title === nowPlaying.title && t.subtitle === nowPlaying.subtitle));
      if (currentIndex !== -1 && currentIndex < queue.length - 1) {
        await playTrack(queue[currentIndex + 1]);
      }
    }
  };

  const playPrev = async () => {
    const TrackPlayer = getTrackPlayerModule()?.default;
    if (!TrackPlayer) return;
    try {
      await TrackPlayer.skipToPrevious();
      await TrackPlayer.play();
    } catch (err) {
      // Fallback if skip failed
      if (queue.length === 0 || !nowPlaying) return;
      const currentIndex = queue.findIndex(t => t.id === nowPlaying.id || (t.title === nowPlaying.title && t.subtitle === nowPlaying.subtitle));
      if (currentIndex > 0) {
        await playTrack(queue[currentIndex - 1]);
      }
    }
  };

  const togglePlayPause = async () => {
    try {
      await togglePlayback();
    } catch (err) {
      console.error('[NowPlayingContext] togglePlayPause error', err);
    }
  };

  const setQueueWithPlayer = async (tracks: NowPlaying[]) => {
    const TrackPlayer = getTrackPlayerModule()?.default;
    // Deduplicate
    const seen = new Set();
    const unique = tracks.filter(t => {
      const key = t.id || t.audio;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    setQueue(unique);
    if (!TrackPlayer) return;
    try {
      const playerTracks = unique.map(t => {
        const trackUrl = typeof t.audio === 'object' && t.audio?.uri ? t.audio.uri : t.audio;
        return {
          id: t.id || t.title,
          url: trackUrl,
          title: t.title,
          artist: t.subtitle,
          artwork: t.coverUrl,
        };
      });
      await TrackPlayer.reset();
      await TrackPlayer.add(playerTracks);
      console.log(`[NowPlayingContext] Sync'd ${playerTracks.length} tracks to Player`);

      const songsToFetch = unique
        .filter(t => !t.coverUrl && t.title && t.title !== 'Unknown Title')
        .map(t => ({
          id: t.id || t.title,
          title: t.title,
          subtitle: t.subtitle,
        }));

      if (songsToFetch.length > 0) {
        console.log(`[NowPlayingContext] Starting metadata fetch for ${songsToFetch.length} queued songs`);
        metadataFetcher.fetchMetadataForSongs(songsToFetch, (songId, metadata) => {
          setQueue(currentQueue => {
            const updated = currentQueue.map(item => {
              if (item.id === songId || item.title === songId) {
                return { ...item, coverUrl: metadata.coverUrl, subtitle: metadata.artist };
              }
              return item;
            });
            return updated;
          });

          TrackPlayer.getQueue().then(playerQueue => {
            const index = playerQueue.findIndex(t => t.id === songId || t.title === songId);
            if (index !== -1) {
              void TrackPlayer.updateMetadataForTrack(index, {
                title: playerQueue[index].title,
                artist: metadata.artist,
                artwork: metadata.coverUrl,
              });
            }
          });

          setNowPlaying(current => {
            if (current && (current.id === songId || current.title === songId)) {
              return { ...current, coverUrl: metadata.coverUrl, subtitle: metadata.artist };
            }
            return current;
          });
        });
      }
    } catch (err) {
      console.error('[NowPlayingContext] setQueueWithPlayer error', err);
    }
  };

  const clearAll = async () => {
    try {
      await resetPlayer();
      setNowPlaying(null);
      setQueue([]);
      setSourceHistory([]);
      setSourceNameState('All Songs');
      const { clearPlaybackState } = await import('./playback-persistence');
      await clearPlaybackState();
    } catch (err) {
      console.error('[NowPlayingContext] clearAll error', err);
    }
  };

  return (
    <NowPlayingContext.Provider value={{
      nowPlaying,
      setNowPlaying,
      recent,
      addRecent,
      queue,
      setQueue,
      setQueueWithPlayer,
      sourceName,
      setSourceName,
      sourceHistory,
      playNext,
      playPrev,
      playTrack,
      togglePlayPause,
      clearAll,
      viewMode,
      setViewMode
    }}>
      {children}
    </NowPlayingContext.Provider>
  );
}

export function useNowPlaying() {
  const ctx = useContext(NowPlayingContext);
  if (!ctx) {
    throw new Error('useNowPlaying must be used within a NowPlayingProvider');
  }
  return ctx;
}

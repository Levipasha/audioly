import AsyncStorage from '@react-native-async-storage/async-storage';
import { cleanSearchQuery, identifySong } from './artwork';
import { updateTrackMetadata } from './local-music-cache';

type Song = {
    id: string;
    title: string;
    subtitle?: string;
    coverUrl?: string;
};

type MetadataUpdateCallback = (songId: string, metadata: { artist: string; coverUrl: string }) => void;

// MMKV for fast persistent storage
let mmkv: any = null;
try {
    const { MMKV } = require('react-native-mmkv');
    mmkv = new MMKV({ id: 'metadata-cache' });
} catch (e) {
    console.warn('MMKV not available for metadata cache, using AsyncStorage');
}

const METADATA_CACHE_KEY = 'song_metadata_cache';

class BackgroundMetadataFetcher {
    private isRunning = false;
    private onUpdate: MetadataUpdateCallback | null = null;
    private totalSongs = 0;
    private processedSongs = 0;
    private cache: Record<string, { artist: string; coverUrl: string; timestamp: number }> = {};

    async init() {
        // Load existing cache
        try {
            const cached = mmkv
                ? mmkv.getString(METADATA_CACHE_KEY)
                : await AsyncStorage.getItem(METADATA_CACHE_KEY);

            if (cached) {
                this.cache = JSON.parse(cached);
                console.log(`[Metadata] Loaded ${Object.keys(this.cache).length} cached metadata entries`);
            }
        } catch (e) {
            console.warn('[Metadata] Failed to load cache:', e);
        }
    }

    /**
     * Get cached metadata for a song (by title)
     */
    getCached(title: string): { artist: string; coverUrl: string } | null {
        const key = this.normalizeTitle(title);
        return this.cache[key] || null;
    }

    /**
     * Load metadata from cache for songs
     */
    async applyCache(songs: Song[]): Promise<Song[]> {
        await this.init();

        let appliedCount = 0;
        const result = songs.map(song => {
            const cached = this.getCached(song.title);
            if (cached) {
                appliedCount++;
                return {
                    ...song,
                    subtitle: cached.artist,
                    coverUrl: cached.coverUrl,
                };
            }
            return song;
        });

        console.log(`[Metadata] Applied cache to ${appliedCount}/${songs.length} songs`);
        return result;
    }

    /**
     * Fetch metadata for songs in PARALLEL BATCHES (10x faster!)
     */
    async fetchMetadataForSongs(songs: Song[], onUpdate: MetadataUpdateCallback) {
        await this.init();

        // Filter songs that need metadata (not cached)
        // We ONLY check the cache, not current metadata, to avoid re-fetching
        const songsNeedingMetadata = songs.filter((song) => {
            const cached = this.getCached(song.title);
            return !cached; // Needs metadata if not in cache
        });

        if (songsNeedingMetadata.length === 0) {
            console.log('[Metadata] All songs have cached metadata!');
            return;
        }

        console.log(`[Metadata] Need to fetch: ${songsNeedingMetadata.length}/${songs.length} songs (${songs.length - songsNeedingMetadata.length} already cached)`);

        this.totalSongs = songsNeedingMetadata.length;
        this.processedSongs = 0;
        this.isRunning = true;
        this.onUpdate = onUpdate;

        // Process in PARALLEL batches of 50 (even faster!)
        const BATCH_SIZE = 50;
        for (let i = 0; i < songsNeedingMetadata.length; i += BATCH_SIZE) {
            if (!this.isRunning) break;

            const batch = songsNeedingMetadata.slice(i, i + BATCH_SIZE);

            // Fetch batch in parallel!
            await Promise.all(batch.map(song => this.fetchAndCache(song)));

            this.processedSongs += batch.length;

            // Small delay between batches to be nice to the API
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        this.isRunning = false;
        console.log(`[Metadata] Finished! Fetched ${this.processedSongs} songs`);
    }

    /**
     * Fetch metadata for a single song and cache it
     */
    private async fetchAndCache(song: Song) {
        try {
            // Include subtitle if available for better resolution
            const query = (song.subtitle && song.subtitle !== 'Unknown Artist')
                ? `${song.title} ${song.subtitle}`
                : song.title;

            const metadata = await identifySong(query);

            if (metadata) {
                // Save to cache
                const key = this.normalizeTitle(song.title);
                this.cache[key] = {
                    artist: metadata.artist,
                    coverUrl: metadata.coverUrl,
                    timestamp: Date.now(),
                };

                // Persist cache to storage
                await this.saveCache();

                // CRITICAL: Also update the main MMKV cache so it persists across app restarts!
                await updateTrackMetadata(song.id, metadata.artist, metadata.coverUrl);

                // Update UI
                if (this.onUpdate) {
                    this.onUpdate(song.id, {
                        artist: metadata.artist,
                        coverUrl: metadata.coverUrl,
                    });
                }

                console.log(`[Metadata] ✓ ${metadata.artist} - ${metadata.title}`);
            }
        } catch (error) {
            // Silently fail for individual songs
        }
    }

    /**
     * Save cache to persistent storage
     */
    private async saveCache() {
        try {
            const data = JSON.stringify(this.cache);
            if (mmkv) {
                mmkv.set(METADATA_CACHE_KEY, data);
            } else {
                await AsyncStorage.setItem(METADATA_CACHE_KEY, data);
            }
        } catch (e) {
            console.warn('[Metadata] Failed to save cache:', e);
        }
    }

    /**
     * Manually update a cache entry (used by NowPlayingContext after a fetch)
     */
    async updateCacheEntry(title: string, artist: string, coverUrl: string) {
        if (!title) return;
        const key = this.normalizeTitle(title);
        this.cache[key] = {
            artist,
            coverUrl,
            timestamp: Date.now(),
        };
        await this.saveCache();
    }

    /**
     * Normalize title for cache key (Remove extensions, bitrate, and trash)
     */
    private normalizeTitle(title: string): string {
        return cleanSearchQuery(title).toLowerCase().trim();
    }

    /**
     * Stop fetching
     */
    stop() {
        this.isRunning = false;
    }

    /**
     * Get current status
     */
    getStatus() {
        return {
            isRunning: this.isRunning,
            remaining: this.totalSongs - this.processedSongs,
        };
    }
}

// Export singleton
export const metadataFetcher = new BackgroundMetadataFetcher();

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as MediaLibrary from 'expo-media-library';

// Safe MMKV Initialization (Dynamic Require)
let mmkv: any = null;
try {
    const { MMKV } = require('react-native-mmkv');
    mmkv = new MMKV();
    console.log('MMKV initialized successfully');
} catch (e) {
    console.warn('MMKV Failed to initialize (Native module not found). Falling back to AsyncStorage.');
    console.warn('To enable fast caching, please rebuild your dev client: npx expo run:android');
}

const CACHE_KEY = 'localMusicCache';
const CACHE_VERSION = 6;

// Storage Adapter (Async Interface to support fallback)
const Storage = {
    getItem: async (key: string): Promise<string | null> => {
        if (mmkv) {
            return mmkv.getString(key) || null;
        }
        return AsyncStorage.getItem(key);
    },
    setItem: async (key: string, value: string): Promise<void> => {
        if (mmkv) {
            mmkv.set(key, value);
            return;
        }
        return AsyncStorage.setItem(key, value);
    },
    removeItem: async (key: string): Promise<void> => {
        if (mmkv) {
            mmkv.delete(key);
            return;
        }
        return AsyncStorage.removeItem(key);
    }
};

export type CachedTrack = {
    id: string;
    title: string;
    artist?: string;
    audio: { uri: string };
    cover?: { uri: string };
    folder?: string;
    route?: string;
};

type CacheData = {
    version: number;
    timestamp: number;
    totalCount: number;
    tracks: CachedTrack[];
    folders: Record<string, number>;
};

// Helper: Extract folder name
const extractFolderName = (uri: string, filename: string): string => {
    let folder = 'Unknown';
    try {
        const decodedUri = decodeURIComponent(uri);
        const parts = decodedUri.split('/');
        parts.pop();
        while (parts.length > 0) {
            const candidate = parts.pop();
            // Filter out common root/useless folders
            if (candidate &&
                !['0', 'emulated', 'storage', 'media', 'audio', 'external', 'primary', 'sdcard'].includes(candidate.toLowerCase()) &&
                candidate.length > 0) {
                folder = candidate;
                break;
            }
        }
    } catch (e) { }

    if (folder === 'Unknown') {
        const pathParts = filename.split('/');
        if (pathParts.length > 1) {
            folder = pathParts[pathParts.length - 2];
        } else {
            folder = 'Local Music';
        }
    }
    return folder;
};

export const isCacheStale = async (): Promise<boolean> => {
    const json = await Storage.getItem(CACHE_KEY);
    if (!json) return true;

    try {
        const data = JSON.parse(json) as CacheData;
        if (data.version !== CACHE_VERSION) return true;

        const { totalCount } = await MediaLibrary.getAssetsAsync({
            mediaType: [MediaLibrary.MediaType.audio],
            first: 0,
        });

        if (totalCount !== data.totalCount) return true;
        return false;
    } catch {
        return true;
    }
};

export const getCachedTracks = async (): Promise<CachedTrack[] | null> => {
    const json = await Storage.getItem(CACHE_KEY);
    if (!json) return null;
    try {
        const data = JSON.parse(json) as CacheData;
        if (data.version !== CACHE_VERSION) return null;
        return data.tracks;
    } catch {
        return null;
    }
};

export const getCachedLibrary = async (): Promise<{ tracks: CachedTrack[], folders: Record<string, number> } | null> => {
    const json = await Storage.getItem(CACHE_KEY);
    if (!json) return null;
    try {
        const data = JSON.parse(json) as CacheData;
        if (data.version !== CACHE_VERSION) return null;
        return { tracks: data.tracks, folders: data.folders };
    } catch {
        return null;
    }
};

export const updateCache = async (onProgress?: (current: number, total: number) => void, quickScanOnly: boolean = false): Promise<CachedTrack[]> => {
    console.log('Starting optimized library scan with metadata extraction...');
    const { getAudioMetadata } = require('@missingcore/audio-metadata');

    let hasNextPage = true;
    let endCursor = undefined;
    let allAssets: any[] = [];
    let totalAssets = 0;

    while (hasNextPage) {
        const result = await MediaLibrary.getAssetsAsync({
            mediaType: [MediaLibrary.MediaType.audio],
            first: 1000,
            after: endCursor,
        });

        allAssets = [...allAssets, ...result.assets];
        hasNextPage = result.hasNextPage;
        endCursor = result.endCursor;
        totalAssets = result.totalCount;
    }

    const tracks: CachedTrack[] = [];
    const folders: Record<string, number> = {};

    // Process in smaller batches for metadata extraction to avoid UI hang
    const BATCH_SIZE = 5; // Smaller batch size because we might do web requests
    const { identifySong } = require('./artwork');

    for (let i = 0; i < allAssets.length; i += BATCH_SIZE) {
        const batch = allAssets.slice(i, i + BATCH_SIZE);

        await Promise.all(batch.map(async (asset) => {
            if (asset.duration < 10) return;

            let localUri = asset.uri;
            let folder = extractFolderName(localUri, asset.filename);
            if (folder === 'Unknown') folder = 'Local Music';

            let title = asset.filename.replace(/\.[^/.]+$/, "");
            let artist = 'Unknown Artist';
            let coverUri = undefined;

            // 1. Try local extraction
            try {
                const metadata = await getAudioMetadata(asset.uri, ['title', 'artist', 'artwork']);
                if (metadata.title) title = metadata.title;
                if (metadata.artist && metadata.artist !== 'Unknown Artist') artist = metadata.artist;
                if (metadata.artwork) coverUri = metadata.artwork;
            } catch (e) {
                // Silently fallback to filename
            }

            // 1.5 Parse artist/title from filename if still unknown
            if (artist === 'Unknown Artist' && title.includes(' - ')) {
                const parts = title.split(' - ');
                artist = parts[0].trim();
                title = parts.slice(1).join(' - ').trim();
            } else if (artist === 'Unknown Artist' && asset.filename.includes(' - ')) {
                // Try parsing from original filename if title was cleaned from tags but artist matches filename
                const parts = asset.filename.replace(/\.[^/.]+$/, "").split(' - ');
                artist = parts[0].trim();
                title = parts.slice(1).join(' - ').trim();
            }

            // 2. Web metadata lookup DISABLED to prevent rate limiting and speed up scanning
            // Users can still see proper metadata from ID3 tags extracted above

            folders[folder] = (folders[folder] || 0) + 1;

            tracks.push({
                id: asset.id ? `media-${asset.id}` : `media-${Math.random().toString(36).substr(2, 9)}`,
                title: title,
                artist: artist,
                audio: { uri: asset.uri },
                cover: coverUri ? { uri: coverUri } : undefined,
                folder: folder,
                route: '/(tabs)/player',
            });
        }));

        if (onProgress) {
            onProgress(Math.min(i + BATCH_SIZE, allAssets.length), allAssets.length);
        }
    }

    const data: CacheData = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        totalCount: allAssets.length,
        tracks,
        folders,
    };

    await Storage.setItem(CACHE_KEY, JSON.stringify(data));
    console.log(`Cache Saved: ${tracks.length} tracks with metadata`);

    return tracks;
};


/**
 * Update metadata for a specific track in cache
 */
export const updateTrackMetadata = async (trackId: string, artist: string, coverUrl: string) => {
    try {
        const json = await Storage.getItem(CACHE_KEY);
        if (!json) return;

        const data = JSON.parse(json) as CacheData;

        // Find and update the track
        const trackIndex = data.tracks.findIndex(t => t.id === trackId);
        if (trackIndex !== -1) {
            data.tracks[trackIndex].artist = artist;
            if (coverUrl) {
                data.tracks[trackIndex].cover = { uri: coverUrl };
            }

            // Save updated cache
            await Storage.setItem(CACHE_KEY, JSON.stringify(data));
            console.log(`[Cache] Updated metadata for track: ${trackId}`);
        }
    } catch (e) {
        console.warn('[Cache] Failed to update track metadata:', e);
    }
};

export const clearCache = async () => {
    await Storage.removeItem(CACHE_KEY);
};


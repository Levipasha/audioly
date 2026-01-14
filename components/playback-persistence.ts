import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
    NOW_PLAYING: '@audioly/now_playing',
    QUEUE: '@audioly/queue',
    RECENT: '@audioly/recent',
    PLAYBACK_POSITION: '@audioly/playback_position',
    SOURCE_INFO: '@audioly/source_info',
};

export type StoredTrack = {
    id?: string;
    title: string;
    subtitle?: string;
    audio?: any;
    coverUrl?: any;
    route?: string;
    params?: Record<string, any>;
};

// Save current playing track
export async function saveNowPlaying(track: StoredTrack | null) {
    try {
        if (track) {
            await AsyncStorage.setItem(STORAGE_KEYS.NOW_PLAYING, JSON.stringify(track));
        } else {
            await AsyncStorage.removeItem(STORAGE_KEYS.NOW_PLAYING);
        }
    } catch (error) {
        console.warn('Error saving now playing:', error);
    }
}

// Get saved playing track
export async function loadNowPlaying(): Promise<StoredTrack | null> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.NOW_PLAYING);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Error loading now playing:', error);
        return null;
    }
}

// Save queue
export async function saveQueue(queue: StoredTrack[]) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.QUEUE, JSON.stringify(queue));
    } catch (error) {
        console.warn('Error saving queue:', error);
    }
}

// Get saved queue
export async function loadQueue(): Promise<StoredTrack[]> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.QUEUE);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.warn('Error loading queue:', error);
        return [];
    }
}

// Save recent history
export async function saveRecent(recent: StoredTrack[]) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.RECENT, JSON.stringify(recent));
    } catch (error) {
        console.warn('Error saving recent:', error);
    }
}

// Get saved recent history
export async function loadRecent(): Promise<StoredTrack[]> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.RECENT);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.warn('Error loading recent:', error);
        return [];
    }
}

// Save playback position
export async function savePlaybackPosition(position: number) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.PLAYBACK_POSITION, position.toString());
    } catch (error) {
        console.warn('Error saving playback position:', error);
    }
}

// Get saved playback position
export async function loadPlaybackPosition(): Promise<number> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.PLAYBACK_POSITION);
        return data ? parseInt(data, 10) : 0;
    } catch (error) {
        console.warn('Error loading playback position:', error);
        return 0;
    }
}

// Save source info
export async function saveSourceInfo(sourceName: string, history: string[]) {
    try {
        await AsyncStorage.setItem(STORAGE_KEYS.SOURCE_INFO, JSON.stringify({ sourceName, history }));
    } catch (error) {
        console.warn('Error saving source info:', error);
    }
}

// Get saved source info
export async function loadSourceInfo(): Promise<{ sourceName: string; history: string[] } | null> {
    try {
        const data = await AsyncStorage.getItem(STORAGE_KEYS.SOURCE_INFO);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.warn('Error loading source info:', error);
        return null;
    }
}

// Clear all saved data
export async function clearPlaybackState() {
    try {
        await AsyncStorage.multiRemove([
            STORAGE_KEYS.NOW_PLAYING,
            STORAGE_KEYS.QUEUE,
            STORAGE_KEYS.PLAYBACK_POSITION,
            STORAGE_KEYS.SOURCE_INFO,
        ]);
    } catch (error) {
        console.warn('Error clearing playback state:', error);
    }
}

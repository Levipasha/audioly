import * as MediaLibrary from 'expo-media-library';
import { MetadataProvider, Track } from './types';

export class LocalProvider implements MetadataProvider {
    private _hasPermission = false;

    private async ensurePermission(): Promise<boolean> {
        if (this._hasPermission) return true;

        const permission = await MediaLibrary.requestPermissionsAsync();
        this._hasPermission = permission.status === 'granted';
        return this._hasPermission;
    }

    async search(query: string): Promise<Track[]> {
        const hasPermission = await this.ensurePermission();
        if (!hasPermission) return [];

        const { getAudioMetadata } = require('@missingcore/audio-metadata');

        const assets = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.audio,
            first: 100,
            sortBy: [MediaLibrary.SortBy.default],
        });

        const lowerQuery = query.toLowerCase();

        const filtered = assets.assets.filter((asset) => asset.filename.toLowerCase().includes(lowerQuery));

        return Promise.all(filtered.map(async (asset) => {
            let title = asset.filename.replace(/\.[^/.]+$/, "");
            let artist = 'Local Device';
            let artwork = undefined;

            try {
                const metadata = await getAudioMetadata(asset.uri, ['title', 'artist', 'artwork']);
                if (metadata.title) title = metadata.title;
                if (metadata.artist) artist = metadata.artist;
                if (metadata.artwork) artwork = metadata.artwork;
            } catch { }

            return {
                id: asset.id,
                title: title,
                artist: artist,
                duration: asset.duration * 1000,
                uri: asset.uri,
                coverUrl: artwork,
            };
        }));
    }

    async getAllTracks(): Promise<Track[]> {
        const hasPermission = await this.ensurePermission();
        if (!hasPermission) return [];

        const { getAudioMetadata } = require('@missingcore/audio-metadata');

        const assets = await MediaLibrary.getAssetsAsync({
            mediaType: MediaLibrary.MediaType.audio,
            first: 2000,
        });

        return Promise.all(assets.assets.map(async (asset) => {
            let title = asset.filename.replace(/\.[^/.]+$/, "");
            let artist = 'Local Device';
            let artwork = undefined;

            try {
                const metadata = await getAudioMetadata(asset.uri, ['title', 'artist', 'artwork']);
                if (metadata.title) title = metadata.title;
                if (metadata.artist) artist = metadata.artist;
                if (metadata.artwork) artwork = metadata.artwork;
            } catch { }

            return {
                id: asset.id,
                title: title,
                artist: artist,
                duration: asset.duration * 1000,
                uri: asset.uri,
                coverUrl: artwork,
            };
        }));
    }
}

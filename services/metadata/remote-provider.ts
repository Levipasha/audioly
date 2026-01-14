import { MetadataProvider, Track } from './types';
import { fetchArtwork } from '../artwork';
import { API_BASE_URL } from '@/constants/api';

export class RemoteProvider implements MetadataProvider {
    async search(query: string): Promise<Track[]> {
        try {
            const res = await fetch(`${API_BASE_URL}/search?q=${encodeURIComponent(query)}`);

            // Check if response is JSON before parsing
            const contentType = res.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await res.text();
                console.error('Remote search received non-JSON response:', text.substring(0, 200));
                throw new Error('Server returned non-JSON response. Is the backend running?');
            }

            const json = await res.json();

            if (!res.ok) {
                throw new Error(json.error || 'Search failed');
            }

            const results = json.map((video: any) => ({
                id: video.id,
                title: video.title,
                artist: video.artist,
                artwork: video.artwork, // Default YT thumbnail
                duration: video.duration,
                uri: `yt:${video.id}`,
                source: 'youtube'
            }));

            // Enrich with iTunes artwork concurrently
            const enrichedWithArtwork = await Promise.all(
                results.map(async (track: any) => {
                    try {
                        const query = track.artist ? `${track.title} ${track.artist}` : track.title;
                        const realCover = await fetchArtwork(query);
                        if (realCover) {
                            return {
                                ...track,
                                artwork: { url: realCover }
                            };
                        }
                    } catch {
                        // ignore failures
                    }
                    return track;
                })
            );

            return enrichedWithArtwork;
        } catch (e) {
            console.error('Remote search error:', e);
            return [];
        }
    }

    async getRecommendations(): Promise<Track[]> {
        // Return top global songs (placeholder)
        return this.search('Top music 2025');
    }
}

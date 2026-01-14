import type { MetadataProvider, Track } from './types';
import { API_BASE_URL } from '@/constants/api';

export class MockProvider implements MetadataProvider {
    async search(query: string): Promise<Track[]> {
        // Simulate network delay
        await new Promise((resolve) => setTimeout(resolve, 500));

        const mockTracks: Track[] = [
            {
                id: 'mock-1',
                title: 'Believer',
                artist: 'Imagine Dragons',
                uri: `${API_BASE_URL}/songs/play/mock-1`,
                artwork: 'https://upload.wikimedia.org/wikipedia/en/5/5c/Imagine_Dragons_-_Believer.png',
            },
            {
                id: 'mock-2',
                title: 'Shape of You',
                artist: 'Ed Sheeran',
                uri: `${API_BASE_URL}/songs/play/mock-2`,
                artwork: 'https://upload.wikimedia.org/wikipedia/en/b/b4/Shape_Of_You_%28Ed_Sheeran_song_-_cover_art%29.png',
            },
            {
                id: 'mock-3',
                title: `Result for "${query}"`,
                artist: 'Mock Artist',
                uri: 'mock-uri',
            }
        ];

        return mockTracks;
    }

    async getRecommendations(): Promise<Track[]> {
        return this.search('recommended');
    }
}

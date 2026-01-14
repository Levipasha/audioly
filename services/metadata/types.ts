
export interface Track {
    id: string;
    title: string;
    artist: string;
    album?: string;
    artwork?: string;
    duration?: number;
    uri: string;
}

export interface MetadataProvider {
    /**
     * Search for tracks based on a query string.
     */
    search(query: string): Promise<Track[]>;

    /**
     * Get personalized recommendations or default tracks.
     */
    getRecommendations?(): Promise<Track[]>;
}

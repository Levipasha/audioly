/**
 * Cleans a query or filename for better search results
 */
export function cleanSearchQuery(query: string): string {
    return query
        .replace(/\s*\(.*(official|video|audio|lyrics|mv|music video|full|hd|4k|hq|320|kbps|live).*/gi, '')
        .replace(/\[.*\]/g, '') // Remove [Official Video] etc
        .replace(/\d+\s*kbps/gi, '') // Remove 320 kbps etc
        .replace(/(_|-)/g, ' ') // Replace underscores/hyphens with spaces
        .replace(/\.[^/.]+$/, "") // Remove file extension
        .replace(/\.{2,}/g, '') // Remove ellipses (...)
        .replace(/\s(feat|ft|v|vs)\.?\s.*/gi, '') // Remove everything after featuring/ft
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * An even more aggressive cleaning for when the standard search fails
 */
export function superClean(query: string): string {
    return query
        .replace(/\s*\(.*?\)\s*/g, ' ') // Remove ALL parentheses content
        .replace(/\s*\[.*?\]\s*/g, ' ') // Remove ALL bracket content
        .replace(/[^a-zA-Z0-9\s]/g, ' ') // Remove special characters
        .replace(/\s+/g, ' ')
        .trim();
}

/**
 * Fetches high-resolution artwork from iTunes Search API
 */
export async function fetchArtwork(query: string): Promise<string | null> {
    try {
        const cleanQuery = cleanSearchQuery(query);
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(cleanQuery)}&media=music&entity=song&limit=1`);

        if (!res.ok) {
            // Silently handle rate limiting and errors
            return null;
        }

        // Check content-type to avoid parsing errors - iTunes API sometimes returns text/javascript
        const contentType = res.headers.get('content-type');
        if (!contentType || (!contentType.includes('application/json') && !contentType.includes('text/javascript'))) {
            return null;
        }

        const json = await res.json();
        if (json.resultCount > 0 && json.results[0].artworkUrl100) {
            return json.results[0].artworkUrl100.replace('100x100bb', '600x600bb');
        }
        return null;
    } catch (e) {
        // Silently handle errors to avoid console spam
        return null;
    }
}

export interface WebMetadata {
    title: string;
    artist: string;
    coverUrl: string;
}

/**
 * Searches the web for full song metadata based on a filename or query
 */
export async function identifySong(query: string): Promise<WebMetadata | null> {
    try {
        const cleanQuery = cleanSearchQuery(query);

        // Strategy 1: Search with full cleaned query
        let metadata = await performSearch(cleanQuery);

        // Strategy 2: Try super-cleaned version if it looks significantly different
        if (!metadata) {
            const sc = superClean(cleanQuery);
            if (sc && sc !== cleanQuery) {
                metadata = await performSearch(sc);
            }
        }

        // Strategy 3: Just the first few words if it's still failing
        if (!metadata && cleanQuery.includes(' ')) {
            const words = cleanQuery.split(' ');
            if (words.length > 2) {
                metadata = await performSearch(words[0] + ' ' + words[1]);
            }
        }

        return metadata;
    } catch (e) {
        return null;
    }
}

async function performSearch(term: string): Promise<WebMetadata | null> {
    try {
        const res = await fetch(`https://itunes.apple.com/search?term=${encodeURIComponent(term)}&media=music&entity=song&limit=1`);
        if (!res.ok) return null;

        const contentType = res.headers.get('content-type');
        if (!contentType || (!contentType.includes('application/json') && !contentType.includes('text/javascript'))) {
            return null;
        }

        const json = await res.json();
        if (json.resultCount > 0) {
            const result = json.results[0];
            // Prefer higher res but fall back to whatever is available
            const originalUrl = result.artworkUrl100 || result.artworkUrl60 || result.artworkUrl30;
            if (!originalUrl) return null;

            return {
                title: result.trackName,
                artist: result.artistName,
                coverUrl: originalUrl.replace(/100x100bb|60x60bb|30x30bb/, '600x600bb'),
            };
        }
        return null;
    } catch {
        return null;
    }
}

import { API_BASE_URL } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ListenTogetherRequest {
    _id: string;
    from: {
        _id: string;
        name: string;
        username: string;
        profileImage: { url: string };
    };
    to: string;
    status: 'pending' | 'accepted' | 'declined' | 'expired';
    sessionId?: string;
    createdAt: string;
    expiresAt: string;
}

export interface ListenSession {
    _id: string;
    host: {
        _id: string;
        name: string;
        username: string;
        profileImage: { url: string };
    };
    participants: Array<{
        _id: string;
        name: string;
        username: string;
        profileImage: { url: string };
    }>;
    currentTrack?: {
        id: string;
        title: string;
        artist: string;
        uri: string;
        artwork?: string;
        duration?: number;
    };
    queue: Array<{
        id: string;
        title: string;
        artist: string;
        uri: string;
        artwork?: string;
        duration?: number;
    }>;
    playbackState: {
        position: number;
        isPlaying: boolean;
        updatedAt: string;
    };
    isActive: boolean;
    createdAt: string;
}

export interface Friend {
    _id: string;
    name: string;
    username: string;
    profileImage: { url: string };
    isPrivate: boolean;
}

class ListenTogetherService {
    private async getAuthHeaders() {
        // Check both possible token keys
        let token = await AsyncStorage.getItem('accessToken');
        if (!token) {
            token = await AsyncStorage.getItem('userToken');
        }

        return {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        };
    }

    private async isAuthenticated(): Promise<boolean> {
        const token = await AsyncStorage.getItem('accessToken') ||
            await AsyncStorage.getItem('userToken');
        return !!token;
    }

    async getFriends(): Promise<Friend[]> {
        try {
            const headers = await this.getAuthHeaders();
            console.log('Fetching friends from:', `${API_BASE_URL}/listen-together/friends`);
            console.log('Headers:', headers);

            const response = await fetch(`${API_BASE_URL}/listen-together/friends`, {
                headers,
            });

            console.log('Response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Error response:', errorText);
                throw new Error(`Failed to fetch friends: ${response.status} - ${errorText}`);
            }

            return response.json();
        } catch (error) {
            console.error('getFriends error:', error);
            throw error;
        }
    }

    async sendInvite(userId: string): Promise<{ requestId: string }> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/listen-together/invite/${userId}`, {
            method: 'POST',
            headers,
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to send invitation');
        }

        return response.json();
    }

    async getRequests(): Promise<ListenTogetherRequest[]> {
        try {
            const headers = await this.getAuthHeaders();
            console.log('Fetching requests from:', `${API_BASE_URL}/listen-together/requests`);

            const response = await fetch(`${API_BASE_URL}/listen-together/requests`, {
                headers,
            });

            console.log('Requests response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Requests error response:', errorText);
                throw new Error(`Failed to fetch requests: ${response.status} - ${errorText}`);
            }

            return response.json();
        } catch (error) {
            console.error('getRequests error:', error);
            throw error;
        }
    }

    async acceptRequest(requestId: string): Promise<{ sessionId: string; session: ListenSession }> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/listen-together/requests/${requestId}/accept`,
            {
                method: 'POST',
                headers,
            }
        );

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Failed to accept request');
        }

        return response.json();
    }

    async declineRequest(requestId: string): Promise<void> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(
            `${API_BASE_URL}/listen-together/requests/${requestId}/decline`,
            {
                method: 'POST',
                headers,
            }
        );

        if (!response.ok) {
            throw new Error('Failed to decline request');
        }
    }

    async getActiveSession(): Promise<{ session: ListenSession | null }> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/listen-sessions/active`, {
            headers,
        });

        if (!response.ok) {
            throw new Error('Failed to fetch active session');
        }

        return response.json();
    }

    async getSession(sessionId: string): Promise<ListenSession> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/listen-sessions/${sessionId}`, {
            headers,
        });

        if (!response.ok) {
            throw new Error('Failed to fetch session');
        }

        return response.json();
    }

    async syncPlayback(
        sessionId: string,
        data: {
            currentTrack?: any;
            position?: number;
            isPlaying?: boolean;
            queue?: any[];
        }
    ): Promise<void> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/listen-sessions/${sessionId}/sync`, {
            method: 'POST',
            headers,
            body: JSON.stringify(data),
        });

        if (!response.ok) {
            throw new Error('Failed to sync playback');
        }
    }

    async getPlaybackState(sessionId: string): Promise<{
        currentTrack: any;
        playbackState: any;
        queue: any[];
        host: string;
    }> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/listen-sessions/${sessionId}/state`, {
            headers,
        });

        if (!response.ok) {
            throw new Error('Failed to fetch playback state');
        }

        return response.json();
    }

    async leaveSession(sessionId: string): Promise<void> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/listen-sessions/${sessionId}/leave`, {
            method: 'POST',
            headers,
        });

        if (!response.ok) {
            throw new Error('Failed to leave session');
        }
    }

    async endSession(sessionId: string): Promise<void> {
        const headers = await this.getAuthHeaders();
        const response = await fetch(`${API_BASE_URL}/listen-sessions/${sessionId}/end`, {
            method: 'POST',
            headers,
        });

        if (!response.ok) {
            throw new Error('Failed to end session');
        }
    }
}

export const listenTogetherService = new ListenTogetherService();

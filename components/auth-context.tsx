import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL } from '@/constants/api';

type User = {
    id: string;
    name: string;
    email: string;
    username?: string;
    isPrivate?: boolean;
    profileImage?: {
        url?: string;
    };
    friends?: string[];
    friendRequests?: string[];
};

type AuthContextType = {
    user: User | null;
    accessToken: string | null;
    isLoading: boolean;
    login: (token: string, userData: User) => Promise<void>;
    logout: () => Promise<void>;
    updateUser: (userData: User) => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
    user: null,
    accessToken: null,
    isLoading: true,
    login: async () => { },
    logout: async () => { },
    updateUser: async () => { },
});

export function useAuth() {
    return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [accessToken, setAccessToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Restore login state from AsyncStorage on app startup
    useEffect(() => {
        const restoreLoginState = async () => {
            try {
                const savedToken = await AsyncStorage.getItem('accessToken');
                const savedUserData = await AsyncStorage.getItem('userData');

                if (savedToken && savedUserData) {
                    // Optimistically restore
                    setAccessToken(savedToken);
                    setUser(JSON.parse(savedUserData));

                    // Verify token in background
                    try {
                        const res = await fetch(`${API_BASE_URL}/users/me`, {
                            headers: {
                                Authorization: `Bearer ${savedToken}`,
                            },
                        });

                        if (res.ok) {
                            const json = await res.json();
                            setUser(json);
                            await AsyncStorage.setItem('userData', JSON.stringify(json));
                        } else {
                            // Token invalid
                            await logout();
                        }
                    } catch (e) {
                        // Network error, keep optimistic state or do nothing
                    }
                }
            } catch (e) {
                // Ignore errors
            } finally {
                setIsLoading(false);
            }
        };

        void restoreLoginState();
    }, []);

    const login = async (token: string, userData: User) => {
        setAccessToken(token);
        setUser(userData);
        await AsyncStorage.setItem('accessToken', token);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
    };

    const logout = async () => {
        setAccessToken(null);
        setUser(null);
        await AsyncStorage.removeItem('accessToken');
        await AsyncStorage.removeItem('userData');
    };

    const updateUser = async (userData: User) => {
        setUser(userData);
        await AsyncStorage.setItem('userData', JSON.stringify(userData));
    };

    return (
        <AuthContext.Provider value={{ user, accessToken, isLoading, login, logout, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
}

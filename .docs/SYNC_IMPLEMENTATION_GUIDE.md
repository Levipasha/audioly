# Playback Synchronization Implementation Guide

## Overview
This guide explains how to implement real-time playback synchronization between users in a Listen Together session.

## Architecture Choice

### Option 1: Polling (Simpler - Recommended for MVP)
**Pros:**
- No additional server infrastructure needed
- Simple to implement
- Works with existing REST API

**Cons:**
- 1-2 second delay
- More API requests
- Battery usage

### Option 2: WebSockets (Better UX)
**Pros:**
- Real-time synchronization
- Efficient
- Better user experience

**Cons:**
- Requires Socket.IO setup
- More complex implementation

## Polling Implementation (Simpler)

### Step 1: Create Sync Hook

Create `hooks/useListenTogetherSync.ts`:

```typescript
import { useEffect, useRef, useState } from 'react';
import { useNowPlaying } from '@/components/now-playing-context';
import { listenTogetherService } from '@/services/listen-together';
import TrackPlayer from 'react-native-track-player';

export function useListenTogetherSync() {
  const { nowPlaying } = useNowPlaying();
  const [activeSession, setActiveSession] = useState<any>(null);
  const [isHost, setIsHost] = useState(false);
  const syncIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastSyncRef = useRef<number>(0);

  // Load active session on mount
  useEffect(() => {
    loadActiveSession();
  }, []);

  const loadActiveSession = async () => {
    try {
      const { session } = await listenTogetherService.getActiveSession();
      setActiveSession(session);
      
      if (session) {
        // Determine if user is host
        const userId = await AsyncStorage.getItem('userId');
        setIsHost(session.host._id === userId);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  // Sync as participant (poll for updates)
  useEffect(() => {
    if (!activeSession || isHost) {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
      return;
    }

    // Poll every 2 seconds for participant
    syncIntervalRef.current = setInterval(async () => {
      try {
        const state = await listenTogetherService.getPlaybackState(activeSession._id);
        
        // Update local player to match host
        const currentPosition = await TrackPlayer.getPosition();
        const positionDiff = Math.abs(currentPosition - state.playbackState.position);
        
        // If track changed
        if (state.currentTrack?.id !== nowPlaying?.id) {
          // Load and play new track
          await TrackPlayer.reset();
          await TrackPlayer.add({
            id: state.currentTrack.id,
            url: state.currentTrack.uri,
            title: state.currentTrack.title,
            artist: state.currentTrack.artist,
            artwork: state.currentTrack.artwork,
          });
          await TrackPlayer.play();
        }
        
        // Sync position if difference > 3 seconds
        if (positionDiff > 3) {
          await TrackPlayer.seekTo(state.playbackState.position);
        }
        
        // Sync play/pause state
        const isPlaying = await TrackPlayer.getState();
        if (state.playbackState.isPlaying && isPlaying !== 'playing') {
          await TrackPlayer.play();
        } else if (!state.playbackState.isPlaying && isPlaying === 'playing') {
          await TrackPlayer.pause();
        }
      } catch (error) {
        console.error('Sync error:', error);
      }
    }, 2000);

    return () => {
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [activeSession, isHost, nowPlaying]);

  // Broadcast as host
  const broadcastState = async (updates: any) => {
    if (!activeSession || !isHost) return;
    
    try {
      await listenTogetherService.syncPlayback(activeSession._id, updates);
    } catch (error) {
      console.error('Broadcast error:', error);
    }
  };

  return {
    activeSession,
    isHost,
    broadcastState,
    leaveSession: async () => {
      if (activeSession) {
        await listenTogetherService.leaveSession(activeSession._id);
        setActiveSession(null);
      }
    },
  };
}
```

### Step 2: Update Now Playing Context

In `components/now-playing-context.tsx`, add:

```typescript
import { useListenTogetherSync } from '@/hooks/useListenTogetherSync';

// Inside NowPlayingProvider
const { activeSession, isHost, broadcastState } = useListenTogetherSync();

// Modify playTrack function
const playTrack = async (track: any) => {
  // ... existing code ...
  
  // If host, broadcast the track change
  if (isHost) {
    await broadcastState({
      currentTrack: {
        id: track.id,
        title: track.title,
        artist: track.subtitle,
        uri: track.audio,
        artwork: track.coverUrl,
      },
      position: 0,
      isPlaying: true,
    });
  }
};

// Add listener for position changes
TrackPlayer.addEventListener('playback-track-changed', async (event) => {
  if (isHost && activeSession) {
    const position = await TrackPlayer.getPosition();
    await broadcastState({ position });
  }
});

TrackPlayer.addEventListener('playback-state', async (event) => {
  if (isHost && activeSession) {
    const position = await TrackPlayer.getPosition();
    await broadcastState({
      position,
      isPlaying: event.state === 'playing',
    });
  }
});
```

### Step 3: Add Session Indicator to Player

Create `components/SessionIndicator.tsx`:

```typescript
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SessionIndicatorProps {
  session: any;
  isHost: boolean;
  onLeave: () => void;
}

export function SessionIndicator({ session, isHost, onLeave }: SessionIndicatorProps) {
  const participantCount = session.participants.length;
  
  return (
    <View style={styles.container}>
      <View style={styles.info}>
        <Ionicons name="people" size={16} color="#10b981" />
        <Text style={styles.text}>
          {isHost ? 'Hosting' : 'Listening with'} {participantCount} {participantCount === 1 ? 'person' : 'people'}
        </Text>
      </View>
      <TouchableOpacity onPress={onLeave} style={styles.leaveButton}>
        <Text style={styles.leaveText}>Leave</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1f2937',
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  info: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: {
    color: '#10b981',
    fontSize: 14,
    fontWeight: '600',
  },
  leaveButton: {
    backgroundColor: '#ef4444',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 6,
  },
  leaveText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
});
```

### Step 4: Add to Player Screen

In your player screen:

```typescript
import { useListenTogetherSync } from '@/hooks/useListenTogetherSync';
import { SessionIndicator } from '@/components/SessionIndicator';

// Inside component
const { activeSession, isHost, leaveSession } = useListenTogetherSync();

// In render
return (
  <View>
    {activeSession && (
      <SessionIndicator
        session={activeSession}
        isHost={isHost}
        onLeave={leaveSession}
      />
    )}
    {/* Rest of player UI */}
  </View>
);
```

## WebSocket Implementation (Advanced)

### Backend Setup

1. Install Socket.IO:
```bash
npm install socket.io
```

2. Update `server.ts`:
```typescript
import { Server } from 'socket.io';
import http from 'http';

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
  },
});

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  // Join session room
  socket.on('join-session', (sessionId) => {
    socket.join(`session:${sessionId}`);
  });
  
  // Broadcast playback state
  socket.on('sync-playback', ({ sessionId, state }) => {
    socket.to(`session:${sessionId}`).emit('playback-update', state);
  });
  
  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

server.listen(env.port, () => {
  console.log(`Server running on port ${env.port}`);
});
```

### Frontend Setup

1. Install Socket.IO client:
```bash
npm install socket.io-client
```

2. Create WebSocket service:
```typescript
import io from 'socket.io-client';
import { API_BASE_URL } from '@/constants/api';

class WebSocketService {
  private socket: any = null;
  
  connect(sessionId: string) {
    this.socket = io(API_BASE_URL);
    this.socket.emit('join-session', sessionId);
  }
  
  onPlaybackUpdate(callback: (state: any) => void) {
    this.socket?.on('playback-update', callback);
  }
  
  broadcastState(sessionId: string, state: any) {
    this.socket?.emit('sync-playback', { sessionId, state });
  }
  
  disconnect() {
    this.socket?.disconnect();
  }
}

export const wsService = new WebSocketService();
```

3. Use in hook:
```typescript
useEffect(() => {
  if (activeSession) {
    wsService.connect(activeSession._id);
    
    if (!isHost) {
      wsService.onPlaybackUpdate(async (state) => {
        // Sync local player with received state
        // Same logic as polling version
      });
    }
  }
  
  return () => wsService.disconnect();
}, [activeSession]);
```

## Testing

### Test Scenarios

1. **Basic Sync:**
   - Host plays a song
   - Participant's player should start playing the same song

2. **Seek Sync:**
   - Host seeks to different position
   - Participant should sync to same position

3. **Play/Pause Sync:**
   - Host pauses
   - Participant should pause

4. **Track Change:**
   - Host skips to next song
   - Participant should play same song

5. **Session Leave:**
   - Participant leaves
   - Session continues for host
   - Host leaves
   - Session ends for all

## Troubleshooting

### Common Issues

1. **Position keeps jumping:**
   - Increase tolerance threshold (3-5 seconds)
   - Reduce sync frequency

2. **Track not changing:**
   - Check track ID comparison
   - Verify audio URL is accessible

3. **High battery usage:**
   - Increase polling interval
   - Consider WebSocket implementation

4. **Sync delay:**
   - Normal for polling (2-3 seconds)
   - Use WebSockets for instant sync

## Performance Tips

1. Only sync when difference is significant (>2-3 seconds)
2. Throttle broadcast updates (max once per second)
3. Use WebSockets for production
4. Cache session data to reduce API calls
5. Handle network errors gracefully

## Security Considerations

1. Verify user is part of session before syncing
2. Only host can broadcast state
3. Validate all incoming data
4. Rate limit sync requests
5. Auto-expire inactive sessions

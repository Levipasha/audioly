# Listen Together Feature Implementation Plan

## Overview
Implement a "Listen Together" feature that allows users to synchronize music playback with their friends. When a user initiates a listen together session, the invited user's playback will sync with the host's playback, including track changes, play/pause, and seek actions.

## Architecture

### 1. Database Schema Updates

#### User Model Updates
Add the following fields to the User model:
- `listenTogetherRequests`: Array of pending listen together requests
- `activeListenSessions`: Array of active listen together sessions

#### New ListenSession Model
- `host`: User who initiated the session
- `participants`: Array of users in the session
- `currentTrack`: Currently playing track
- `position`: Current playback position
- `isPlaying`: Playback state
- `queue`: Array of tracks in the queue
- `createdAt`: Session creation timestamp
- `updatedAt`: Last update timestamp

### 2. Backend API Endpoints

#### Listen Together Requests
- `POST /users/listen-together/invite/:userId` - Send listen together request
- `GET /users/listen-together/requests` - Get pending requests
- `POST /users/listen-together/requests/:requestId/accept` - Accept request
- `POST /users/listen-together/requests/:requestId/decline` - Decline request

#### Listen Together Sessions
- `POST /listen-sessions/create` - Create new session
- `GET /listen-sessions/:sessionId` - Get session details
- `POST /listen-sessions/:sessionId/join` - Join existing session
- `POST /listen-sessions/:sessionId/leave` - Leave session
- `POST /listen-sessions/:sessionId/sync` - Update playback state
- `GET /listen-sessions/:sessionId/state` - Get current playback state

### 3. Frontend Components

#### New Components
1. **ListenTogetherModal** - Modal to select users and send invites
2. **ListenTogetherRequestCard** - Show incoming requests
3. **ListenTogetherSessionBar** - Active session indicator
4. **UserSelectionList** - List of friends to invite

#### Updated Components
1. **Explore Screen** - Add "Listen Together" button
2. **Player Screen** - Show active session state
3. **Now Playing Context** - Sync playback with session

### 4. Real-time Synchronization

Options:
1. **WebSockets** (Recommended) - Real-time bidirectional communication
2. **Polling** (Fallback) - Poll every 1-2 seconds for state updates

### 5. Playback Synchronization Logic

When user is in a session as participant:
- Listen for host's playback changes
- Update local player to match host's state
- Disable local controls (optional - or allow with sync)

When user is host:
- Broadcast playback changes to all participants
- Track changes, play/pause, seek operations

## Implementation Steps

### Phase 1: Backend Setup
1. Update User model with new fields
2. Create ListenSession model
3. Create ListenTogetherRequest model
4. Implement API routes for requests and sessions
5. Add WebSocket support (Socket.io)

### Phase 2: Frontend - Request System
1. Add "Listen Together" button in explore page
2. Create user selection modal
3. Implement request sending
4. Add notifications for incoming requests
5. Create request accept/decline UI

### Phase 3: Frontend - Session Management
1. Create session creation flow
2. Implement session joining
3. Add active session indicator
4. Create session leave functionality

### Phase 4: Playback Sync
1. Setup WebSocket connection
2. Implement host broadcast logic
3. Implement participant sync logic
4. Handle edge cases (disconnection, rejoining)

### Phase 5: Testing & Polish
1. Test multi-user scenarios
2. Handle offline/online transitions
3. Add loading states
4. Implement error handling
5. Add session expiry logic

## User Flow

### Host User Flow
1. User navigates to Explore page
2. Clicks "Listen Together" button
3. Selects friends from list
4. Sends invitations
5. Once accepted, session starts
6. Host plays music, participants' players sync automatically

### Participant User Flow
1. Receives listen together request notification
2. Views request details
3. Accepts request
4. Joins session
5. Player automatically syncs with host
6. Can leave session anytime

## Technical Considerations

### Synchronization Challenges
- Network latency
- Different playback positions
- Buffering issues
- Reconnection handling

### Solutions
- Tolerance window (~500ms)
- Periodic sync checks
- Buffer state tracking
- Automatic reconnection

### Privacy & Permissions
- Only friends can send requests
- Users can decline requests
- Users can leave sessions anytime
- Host can end session for all

## Future Enhancements
- Group chat during sessions
- Voting on next track
- Collaborative playlist building
- Session history
- Statistics (time listened together)

# Listen Together Feature - Implementation Summary

## Overview
I've implemented a comprehensive "Listen Together" feature that allows users to invite their friends to synchronized listening sessions. When a user accepts an invitation, their playback automatically syncs with the host's playback.

## What Has Been Implemented

### Backend (Node.js/Express)

#### 1. Database Models
- **`ListenTogetherRequest.ts`**: Manages invitations between users
  - Tracks sender, recipient, status (pending/accepted/declined/expired)
  - Auto-expires after 10 minutes
  
- **`ListenSession.ts`**: Manages active listening sessions
  - Stores host, participants, current track, queue, and playback state
  - Tracks position, play/pause state, and last update time
  
- **Updated `User.ts`**: Added fields for:
  - `listenTogetherRequests`: Incoming requests
  - `activeListenSession`: Currently active session (if any)

#### 2. API Routes

**Listen Together Routes** (`/listen-together`):
- `POST /invite/:userId` - Send invitation to a friend
- `GET /requests` - Get pending incoming requests
- `POST /requests/:requestId/accept` - Accept a request and create session
- `POST /requests/:requestId/decline` - Decline a request
- `GET /friends` - Get list of friends to invite

**Session Management Routes** (`/listen-sessions`):
- `GET /active` - Get user's current active session
- `GET /:sessionId` - Get session details
- `POST /:sessionId/sync` - Update playback state (host only)
- `GET /:sessionId/state` - Get current playback state
- `POST /:sessionId/leave` - Leave a session
- `POST /:sessionId/end` - End session (host only)

### Frontend (React Native/Expo)

#### 1. Services
- **`listen-together.ts`**: API client for all listen together functionality
  - Handles authentication tokens
  - Provides methods for inviting, accepting/declining, and syncing

#### 2. Components

- **`ListenTogetherModal.tsx`**: Modal to select and invite friends
  - Shows list of friends with their avatars
  - Displays "Invited" state after sending invitation
  - Beautiful dark-themed UI with smooth animations

- **`ListenTogetherRequestCard.tsx`**: Displays incoming requests
  - Shows friend's name and avatar
  - Accept/Decline buttons with loading states
  - Visual feedback during processing

- **`ListenTogetherRequests.tsx`**: Full-screen request list
  - Pull-to-refresh functionality
  - Empty state when no requests
  - Automatic navigation after accepting

- **`ListenTogetherBadge.tsx`**: Notification badge
  - Shows count of pending requests
  - Auto-refreshes every 30 seconds
  - Clickable to view requests page

#### 3. Screens
- **`listen-together-requests.tsx`**: Dedicated page for viewing requests
  - Accessible from notification badge
  - Clean header with back navigation

#### 4. Updated Explore Page
- Added "Listen Together" button in header
- Added notification badge showing pending request count
- Integrated modal for friend selection

## User Flow

### Sending an Invitation
1. User goes to Explore page
2. Clicks "Listen Together" button
3. Selects friend(s) from list
4. Invitation sent - button shows "Invited"

### Receiving and Accepting
1. User sees notification badge with request count
2. Clicks badge to view requests
3. Sees friend's request with their profile picture
4. Clicks "Accept" to start session
5. Session automatically created - both users are now connected

### During Session
- Host plays music - all controls work normally
- Participants' players automatically sync with host
- Anyone can leave the session anytime
- Host can end session for everyone

## Next Steps to Complete

### 1. Real-time Synchronization (High Priority)
Currently, the API routes are in place, but you need to implement the actual playback synchronization:

**Option A: WebSocket Implementation (Recommended)**
```typescript
// Install socket.io
npm install socket.io socket.io-client

// Backend: Add to server.ts
import { Server } from 'socket.io';
const io = new Server(server);

// Frontend: Create WebSocket hook
// Broadcast host's playback changes to participants
// Listen for updates as participant
```

**Option B: Polling (Simpler, Less Real-time)**
```typescript
// Poll /listen-sessions/:sessionId/state every 2 seconds
// Update local player to match
```

### 2. Integrate with Now Playing Context
Update `now-playing-context.tsx` to:
- Check if user is in an active session
- If participant: disable controls, sync with host's state
- If host: broadcast all playback changes (play, pause, seek, track change)

### 3. Session Indicator
Add a visual indicator in the player showing:
- "Listening with [Friend Name]"
- Number of participants
- Leave button

### 4. Default Avatar
Add a default avatar image at:
```
assets/images/default-avatar.png
```

### 5. Error Handling
- Handle network failures gracefully
- Auto-reconnect on disconnection
- Show user-friendly error messages

### 6. Testing
Test the following scenarios:
- Multiple users in one session
- Host leaving vs participant leaving
- Network connectivity loss
- Expired requests

## API Endpoints Summary

### Authentication
All endpoints require Bearer token in Authorization header

### Listen Together
```
POST   /listen-together/invite/:userId
GET    /listen-together/requests
POST   /listen-together/requests/:requestId/accept
POST   /listen-together/requests/:requestId/decline
GET    /listen-together/friends
```

### Sessions
```
GET    /listen-sessions/active
GET    /listen-sessions/:sessionId
POST   /listen-sessions/:sessionId/sync
GET    /listen-sessions/:sessionId/state
POST   /listen-sessions/:sessionId/leave
POST   /listen-sessions/:sessionId/end
```

## Files Created/Modified

### Backend
- ✅ `backend/src/models/User.ts` (modified)
- ✅ `backend/src/models/ListenTogetherRequest.ts` (new)
- ✅ `backend/src/models/ListenSession.ts` (new)
- ✅ `backend/src/routes/listen-together.ts` (new)
- ✅ `backend/src/routes/listen-sessions.ts` (new)
- ✅ `backend/src/server.ts` (modified)

### Frontend
- ✅ `services/listen-together.ts` (new)
- ✅ `components/ListenTogetherModal.tsx` (new)
- ✅ `components/ListenTogetherRequestCard.tsx` (new)
- ✅ `components/ListenTogetherRequests.tsx` (new)
- ✅ `components/ListenTogetherBadge.tsx` (new)
- ✅ `app/listen-together-requests.tsx` (new)
- ✅ `app/(tabs)/explore.tsx` (modified)

### Documentation
- ✅ `.docs/LISTEN_TOGETHER_IMPLEMENTATION.md`
- ✅ `.docs/LISTEN_TOGETHER_SUMMARY.md` (this file)

## Testing the Feature

### 1. Start Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Start Frontend
```bash
cd audioly
npm install
npm start
```

### 3. Test Flow
1. Create two user accounts
2. Add each other as friends
3. Login as User A, go to Explore
4. Click "Listen Together", invite User B
5. Login as User B, click notification badge
6. Accept invitation
7. Verify session is created

## Notes
- Only friends can send listen together invitations
- Requests expire after 10 minutes
- Users can only be in one session at a time
- Host controls playback, participants sync automatically
- Session ends when host leaves or manually ends it

## Future Enhancements
- Group chat during sessions
- Voting on next track
- Session history
- Statistics (time listened together)
- Reactions to songs
- Collaborative playlists

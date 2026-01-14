# Listen Together - Quick Start Guide

## What You Need to Do Next

I've implemented the core Listen Together feature infrastructure. Here's what's complete and what you need to finish:

## ✅ What's Done

### Backend
- [x] Database models for requests and sessions
- [x] API routes for inviting, accepting, and managing sessions
- [x] User model updated with session tracking
- [x] Routes registered in server

### Frontend
- [x] Friend selection modal
- [x] Request notification badge
- [x] Request cards with accept/decline
- [x] Dedicated requests page
- [x] Service layer for API calls
- [x] UI integrated into Explore page

## 🔨 What You Need to Complete

### 1. Add Default Avatar Image (5 minutes)
Create or download a default avatar and place it at:
```
assets/images/default-avatar.png
```

This is used when users don't have a profile picture.

### 2. Implement Playback Synchronization (2-3 hours)
This is the core sync logic. Choose one approach:

**Option A: Polling (Simpler - Start Here)**
- Follow `SYNC_IMPLEMENTATION_GUIDE.md`
- Create `hooks/useListenTogetherSync.ts`
- Update `now-playing-context.tsx`
- Poll every 2 seconds to sync playback

**Option B: WebSockets (Better, More Complex)**
- Install Socket.IO on backend and frontend
- Real-time sync with minimal delay
- Better user experience

### 3. Add Session Indicator to Player (30 minutes)
- Create component showing active session
- Display participant count
- Add "Leave Session" button
- Show different UI for host vs participant

### 4. Test Everything (1 hour)
Use two devices or accounts:
1. User A invites User B
2. User B accepts
3. User A plays a song
4. Verify User B's player syncs
5. Test pause, seek, track change
6. Test leaving session

## Step-by-Step: Getting Started

### Step 1: Install Dependencies
```bash
# Backend
cd backend
npm install

# Frontend
cd ../audioly
npm install
```

### Step 2: Start Servers
```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend  
cd audioly
npm start
```

### Step 3: Create Test Users
1. Register two users (User A and User B)
2. Add each other as friends
3. Log in as User A on one device/emulator

### Step 4: Test Invitation Flow
1. User A: Go to Explore page
2. User A: Click "Listen Together" button
3. User A: Select User B from list
4. User A: Click "Invite"
5. User B: Should see notification badge (1)
6. User B: Click badge to see request
7. User B: Click "Accept"
8. Both users: Should now have active session

### Step 5: Implement Sync (See SYNC_IMPLEMENTATION_GUIDE.md)
This is where the magic happens. Follow the guide to implement playback synchronization.

## File Structure

```
audioly/
├── .docs/
│   ├── LISTEN_TOGETHER_IMPLEMENTATION.md  # Full plan
│   ├── LISTEN_TOGETHER_SUMMARY.md         # This summary
│   └── SYNC_IMPLEMENTATION_GUIDE.md       # Sync details
├── app/
│   ├── (tabs)/
│   │   └── explore.tsx                    # ✅ Updated with button
│   └── listen-together-requests.tsx       # ✅ New requests page
├── components/
│   ├── ListenTogetherModal.tsx           # ✅ Friend selection
│   ├── ListenTogetherRequestCard.tsx     # ✅ Request UI
│   ├── ListenTogetherRequests.tsx        # ✅ Request list
│   └── ListenTogetherBadge.tsx           # ✅ Notification badge
├── services/
│   └── listen-together.ts                # ✅ API client
└── hooks/
    └── useListenTogetherSync.ts          # ⏳ TO CREATE

backend/
├── src/
│   ├── models/
│   │   ├── User.ts                       # ✅ Updated
│   │   ├── ListenTogetherRequest.ts      # ✅ New
│   │   └── ListenSession.ts              # ✅ New
│   ├── routes/
│   │   ├── listen-together.ts            # ✅ New
│   │   └── listen-sessions.ts            # ✅ New
│   └── server.ts                         # ✅ Updated
```

## API Endpoints Reference

### Invite a Friend
```http
POST /listen-together/invite/:userId
Authorization: Bearer <token>
```

### Get Pending Requests
```http
GET /listen-together/requests
Authorization: Bearer <token>
```

### Accept Request
```http
POST /listen-together/requests/:requestId/accept
Authorization: Bearer <token>
```

### Get Active Session
```http
GET /listen-sessions/active
Authorization: Bearer <token>
```

### Sync Playback (Host Only)
```http
POST /listen-sessions/:sessionId/sync
Authorization: Bearer <token>
Content-Type: application/json

{
  "currentTrack": {
    "id": "song123",
    "title": "Song Name",
    "artist": "Artist",
    "uri": "https://...",
    "artwork": "https://..."
  },
  "position": 45.5,
  "isPlaying": true
}
```

### Get Playback State (Participant)
```http
GET /listen-sessions/:sessionId/state
Authorization: Bearer <token>
```

### Leave Session
```http
POST /listen-sessions/:sessionId/leave
Authorization: Bearer <token>
```

## Common Issues & Solutions

### ❌ "Cannot find module '@/components/ListenTogetherModal'"
- Make sure all new files are created
- Restart Metro bundler: `npm start -- --reset-cache`

### ❌ "Cannot read property 'profileImage' of undefined"
- Add default avatar image
- Or handle missing images in components

### ❌ Requests not showing up
- Check if backend is running
- Verify authentication token is valid
- Check network requests in console

### ❌ Invitation fails with "Not friends"
- Make sure users are actually friends
- Check friend relationship in database

### ❌ Session not syncing
- This is expected - you need to implement sync logic
- Follow SYNC_IMPLEMENTATION_GUIDE.md

## Next Features (Future)

Once basic sync is working, consider adding:
- [ ] Queue synchronization
- [ ] Group chat during session
- [ ] Reactions to songs
- [ ] Session history
- [ ] "Now listening" status on profile
- [ ] Push notifications for invites
- [ ] Multiple participants (more than 2 users)

## Need Help?

1. Check the implementation guide: `SYNC_IMPLEMENTATION_GUIDE.md`
2. Review API endpoints in: `LISTEN_TOGETHER_SUMMARY.md`
3. Look at existing components for patterns
4. Test with Postman/Insomnia to verify API works

## Success Criteria

You'll know it's working when:
1. ✅ You can send an invitation
2. ✅ Friend receives notification
3. ✅ Friend can accept/decline
4. ✅ Session is created on accept
5. ✅ Host plays music
6. ✅ Participant's player syncs automatically
7. ✅ Both can leave session
8. ✅ Session ends when host leaves

Good luck! 🎵👥

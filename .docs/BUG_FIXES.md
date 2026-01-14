# Bug Fixes - Login Persistence, Metadata & Upload Issues

## 🐛 Issues Identified

### 1. **Login Not Persisting** - User gets logged out
### 2. **Metadata Uploading Repeatedly** - Same metadata fetched multiple times  
### 3. **Upload Missing Metadata** - Songs uploaded without title/artist/artwork

---

## 🔍 Issue 1: Login Not Persisting

### Problem
User gets logged out when app restarts or after some time.

### Root Cause
The `auth-context.tsx` has token verification that logs out user if token is invalid. This might be happening due to:
1. Token expiring too quickly
2. Network error during verification
3. Backend rejecting valid tokens

### Current Code (auth-context.tsx lines 58-75)
```typescript
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
    // Token invalid - LOGS OUT USER ❌
    await logout();
  }
} catch (e) {
  // Network error, keep optimistic state or do nothing
}
```

### ✅ Fix
Don't log out on verification failure - keep optimistic state:

```typescript
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
    // Token might be expired or network issue
    // Keep user logged in with cached data
    // Only log out on explicit 401 Unauthorized
    if (res.status === 401) {
      console.log('Token expired, logging out');
      await logout();
    } else {
      console.log('Token verification failed, keeping cached session');
      // Keep optimistic state
    }
  }
} catch (e) {
  // Network error - keep user logged in with cached data
  console.log('Network error during token verification, keeping cached session');
}
```

---

## 🔍 Issue 2: Metadata Uploading Repeatedly

### Problem
Same metadata is fetched multiple times for the same song, wasting API calls and slowing down the app.

### Root Cause
The metadata extraction happens every time the upload function runs, even for songs that already have metadata cached.

### Current Code (profile.tsx lines 319-343)
```typescript
// Extract metadata from audio file before uploading
let extractedTitle = '';
let extractedArtist = '';
let extractedCover: any = null;

try {
  console.log(`[Upload] Extracting metadata from ${audioAsset.name}`);
  const { getAudioMetadata } = require('@missingcore/audio-metadata');
  const metadata = await getAudioMetadata(audioAsset.uri, ['title', 'artist', 'artwork', 'album']);

  if (metadata.title) {
    extractedTitle = metadata.title;
    console.log(`[Upload] Extracted title: ${extractedTitle}`);
  }
  // ... more extraction
} catch (metadataError) {
  console.log(`[Upload] Could not extract metadata:`, metadataError);
}
```

### ✅ Fix
Cache metadata using fingerprint to avoid re-extraction:

```typescript
// Check cache first
const cacheKey = `metadata_${audioFingerprint}`;
let extractedTitle = '';
let extractedArtist = '';
let extractedCover: any = null;

try {
  // Try to get from cache
  const cachedMetadata = await AsyncStorage.getItem(cacheKey);
  
  if (cachedMetadata) {
    console.log(`[Upload] Using cached metadata for ${audioAsset.name}`);
    const cached = JSON.parse(cachedMetadata);
    extractedTitle = cached.title || '';
    extractedArtist = cached.artist || '';
    extractedCover = cached.artwork || null;
  } else {
    // Extract metadata from audio file
    console.log(`[Upload] Extracting metadata from ${audioAsset.name}`);
    const { getAudioMetadata } = require('@missingcore/audio-metadata');
    const metadata = await getAudioMetadata(audioAsset.uri, ['title', 'artist', 'artwork', 'album']);

    if (metadata.title) extractedTitle = metadata.title;
    if (metadata.artist) extractedArtist = metadata.artist;
    if (metadata.artwork) extractedCover = metadata.artwork;

    // Cache for future use
    await AsyncStorage.setItem(cacheKey, JSON.stringify({
      title: extractedTitle,
      artist: extractedArtist,
      artwork: extractedCover,
    }));
    
    console.log(`[Upload] Cached metadata for ${audioAsset.name}`);
  }
} catch (metadataError) {
  console.log(`[Upload] Could not extract metadata:`, metadataError);
}
```

---

## 🔍 Issue 3: Upload Missing Metadata

### Problem
Songs are uploaded without title, artist, or artwork even though metadata exists in the file.

### Root Cause Analysis

Looking at the upload code (lines 362-394), I see:
- ✅ Title is added: `form.append('title', titleToUse);`
- ✅ Artist is added: `form.append('artist', artistToUse);`
- ✅ Cover is added (if exists)

**The issue might be on the BACKEND** - let's check if backend is saving the metadata.

### Backend Check Needed

Check `backend/src/routes/songs.ts` upload endpoint:

```typescript
// Make sure backend saves ALL metadata
router.post('/upload', authMiddleware, upload.fields([
  { name: 'audio', maxCount: 1 },
  { name: 'cover', maxCount: 1 }
]), async (req: AuthRequest, res) => {
  try {
    const { title, artist, category, isPublic, fingerprint } = req.body;
    
    // ⚠️ CHECK: Is artist being saved?
    const song = new Song({
      title: title || 'Untitled',
      artist: artist || 'Unknown Artist', // ← Make sure this is here
      category,
      isPublic: isPublic === 'true',
      audioUrl: audioResult.secure_url,
      coverUrl: coverResult?.secure_url,
      uploadedBy: req.userId,
      fingerprint,
    });
    
    await song.save();
    // ...
  }
});
```

### ✅ Frontend Fix (Ensure Data is Sent)

Add logging to verify data is being sent:

```typescript
// Before upload (profile.tsx line 396)
console.log(`[Upload] Uploading to ${API_BASE_URL}/songs/upload`);
console.log(`[Upload] Form data:`, {
  title: titleToUse,
  artist: artistToUse,
  category: songCategory || 'none',
  isPublic: songIsPublic,
  fingerprint: audioFingerprint.substring(0, 16) + '...',
  hasCover: !!(coverAsset || extractedCover),
  hasAudio: !!audioAsset,
});

// Log FormData contents
for (let pair of form.entries()) {
  console.log(`[Upload] ${pair[0]}: ${typeof pair[1] === 'object' ? 'FILE' : pair[1]}`);
}
```

### ✅ Backend Fix (Ensure Data is Saved)

Update `backend/src/models/Song.ts`:

```typescript
export interface ISong extends Document {
  title: string;
  artist: string; // ← Make sure this field exists
  category?: string;
  coverUrl?: string;
  audioUrl: string;
  isPublic: boolean;
  uploadedBy: Types.ObjectId;
  fingerprint?: string;
  createdAt: Date;
}

const songSchema = new Schema<ISong>({
  title: { type: String, required: true },
  artist: { type: String, default: 'Unknown Artist' }, // ← Add this
  category: String,
  coverUrl: String,
  audioUrl: { type: String, required: true },
  isPublic: { type: Boolean, default: true },
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  fingerprint: String,
}, { timestamps: true });
```

---

## 📋 Implementation Checklist

### Issue 1: Login Persistence
- [ ] Update `auth-context.tsx` line 69-72
- [ ] Only logout on explicit 401
- [ ] Keep optimistic state on network errors
- [ ] Test: Close app, reopen - should stay logged in

### Issue 2: Metadata Caching
- [ ] Add metadata cache check before extraction
- [ ] Use fingerprint as cache key
- [ ] Store extracted metadata in AsyncStorage
- [ ] Test: Upload same song twice - should use cache

### Issue 3: Upload Metadata
- [ ] Verify frontend sends artist/title/cover
- [ ] Add logging to confirm FormData contents
- [ ] Check backend Song model has artist field
- [ ] Check backend saves all metadata
- [ ] Test: Upload song, check if metadata appears

---

## 🧪 Testing Steps

### Test 1: Login Persistence
```
1. Login to app
2. Close app completely
3. Reopen app
4. ✅ Should still be logged in
5. Turn off WiFi
6. Reopen app
7. ✅ Should still be logged in (cached)
```

### Test 2: Metadata Caching
```
1. Upload a song (first time)
2. Check logs - should see "Extracting metadata"
3. Upload same song again
4. Check logs - should see "Using cached metadata"
5. ✅ No re-extraction
```

### Test 3: Upload Metadata
```
1. Select a song with metadata (title/artist/artwork)
2. Upload it
3. Check uploaded song in profile
4. ✅ Should show correct title
5. ✅ Should show correct artist
6. ✅ Should show artwork
```

---

## 🔧 Quick Fixes to Apply

### 1. Fix Login Persistence (auth-context.tsx)
```typescript
// Line 69-72, replace with:
} else {
  // Only log out on explicit 401 Unauthorized
  if (res.status === 401) {
    console.log('Token expired, logging out');
    await logout();
  }
  // Keep cached session for other errors
}
```

### 2. Add Metadata Caching (profile.tsx)
```typescript
// Before line 319, add:
const cacheKey = `metadata_${audioFingerprint}`;
const cachedMetadata = await AsyncStorage.getItem(cacheKey);

if (cachedMetadata) {
  const cached = JSON.parse(cachedMetadata);
  extractedTitle = cached.title || '';
  extractedArtist = cached.artist || '';
  extractedCover = cached.artwork || null;
  console.log(`[Upload] Using cached metadata`);
} else {
  // ... existing extraction code ...
  
  // After extraction, add:
  await AsyncStorage.setItem(cacheKey, JSON.stringify({
    title: extractedTitle,
    artist: extractedArtist,
    artwork: extractedCover,
  }));
}
```

### 3. Verify Backend Model (Song.ts)
```typescript
// Make sure artist field exists:
artist: { type: String, default: 'Unknown Artist' },
```

---

## 📊 Expected Results

| Issue | Before | After |
|-------|--------|-------|
| Login | Logs out randomly | Stays logged in |
| Metadata | Extracts every time | Uses cache |
| Upload | Missing metadata | Full metadata |

---

## 🚀 Priority

1. **High**: Login persistence (affects all users)
2. **Medium**: Metadata caching (performance improvement)
3. **High**: Upload metadata (data quality)

Apply these fixes in order for best results!

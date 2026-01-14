# Audio Upload Metadata & Duplicate Detection Implementation

## Overview
This implementation adds automatic metadata extraction and duplicate detection for uploaded songs, similar to how local songs are handled.

## Frontend Changes (Completed)

### 1. **Automatic Metadata Extraction**
When users upload audio files, the app now:
- Extracts **title**, **artist**, and **album artwork** from the audio file metadata
- Uses extracted metadata as defaults if user doesn't provide manual input
- Prioritizes user input over extracted data

### 2. **Audio Fingerprinting**
Each uploaded song gets a unique fingerprint based on:
-  File size
- Extracted title and artist
- Normalized filename (as fallback)

This fingerprint is generated using SHA-256 hashing and is sent to the backend with each upload.

### 3. **Data Sent to Backend**
The upload now sends:
```javascript
{
  title: string,           // Title (manually entered OR extracted OR filename)
  artist: string,          // Artist (extracted OR "Unknown Artist")
  category: string,        // Optional category
  isPublic: boolean,       // Privacy setting
  fingerprint: string,     // Unique SHA-256 hash for duplicate detection
  audio: File,             // The audio file
  cover: File              // Cover image (user-selected OR extracted OR none)
}
```

## Backend Implementation Required

### 1. **Database Schema Updates**

#### Song Model/Schema
Add these fields to your Song model:
```javascript
{
  title: String,
  artist: String,              // NEW - store artist name
  category: String,
  coverUrl: String,
  audioUrl: String,
  isPublic: Boolean,
  fingerprint: String,         // NEW - unique identifier for duplicate detection
  uploadedBy: [ObjectId],      // MODIFIED - array of user IDs who "own" this song
  originalUploader: ObjectId,  // NEW - first user who uploaded this song
  uploadCount: Number,         // NEW - how many users have this song
  createdAt: Date,
  updatedAt: Date
}
```

#### User-Song Relationship (Optional - for better querying)
Alternatively, create a separate collection:
```javascript
UserSongs {
  userId: ObjectId,
  songId: ObjectId,
  uploadedAt: Date,
  isPublic: Boolean,           // User's privacy setting for this song
  category: String,            // User's category for this song
}
```

### 2. **Upload Endpoint Logic (`/songs/upload`)

Update the endpoint to:

```javascript
POST /songs/upload

1. Extract data from request:
   - title, artist, category, isPublic, fingerprint
   - audio file, cover file

2. Check for duplicate using fingerprint:
   const existingSong = await Song.findOne({ fingerprint });

3a. If song EXISTS:
    - Check if current user already has it:
      if (existingSong.uploadedBy.includes(currentUserId)) {
        return { message: "You already have this song", song: existingSong };
      }
    
    - Add current user to song's uploadedBy array:
      existingSong.uploadedBy.push(currentUserId);
      existingSong.uploadCount++;
      await existingSong.save();
    
    - DO NOT upload audio file again (reuse existing audioUrl)
    - Optionally: allow user to upload their own cover even for duplicate song
    
    - Return: { 
        message: "Song already exists, added to your library", 
        song: existingSong,
        isDuplicate: true
      }

3b. If song is NEW:
    - Upload audio file to storage
    - Upload cover file (if provided)
    - Create new song document:
      const newSong = await Song.create({
        title,
        artist,
        category,
        isPublic,
        fingerprint,
        audioUrl,
        coverUrl,
        uploadedBy: [currentUserId],
        originalUploader: currentUserId,
        uploadCount: 1
      });
    
    - Return: { 
        message: "Song uploaded successfully", 
        song: newSong,
        isDuplicate: false
      }
```

### 3. **Get User's Songs Endpoint (`/songs/mine`)

Update to return songs where user is in `uploadedBy` array:

```javascript
GET /songs/mine

const userSongs = await Song.find({ 
  uploadedBy: currentUserId 
}).sort({ updatedAt: -1 });

return userSongs;
```

### 4. **Benefits**

✅ **Storage Savings**: Same song uploaded by 100 users = 1 audio file stored
✅ **Bandwidth Savings**: No need to upload file if it already exists
✅ **Better UX**: Users still see "their"  songs in their profile
✅ **Data Integrity**: All users share the same high-quality metadata
✅ **Fast Uploads**: Duplicate detection happens instantly

### 5. **Edge Cases to Handle**

1. **Different Covers**: Users might want different cover art for the same song
   - Solution: Store user-specific covers in UserSongs relationship table

2. **Different Categories**: Users might categorize the same song differently
   - Solution: Store category in UserSongs relationship, not in Song model

3. **Privacy Conflicts**: One user makes song public, another private
   - Solution: Store isPublic in UserSongs relationship (per-user setting)

4. **False Positives**: Different songs with same title/artist
   - Solution: Fingerprint includes file size, which should differ

## Testing the Implementation

1. **Upload same song twice as same user**
   - Should return "You already have this song"

2. **Upload same song as different users**
   - Should add song to both profiles
   - Should only store audio file once
   - Both users should see it in "My Songs"

3. **Upload different song with similar metadata**
   - File size difference should create different fingerprint
   - Should upload as new song

## Example API Responses

### New Song Upload
```json
{
  "success": true,
  "message": "Song uploaded successfully",
  "isDuplicate": false,
  "song": {
    "_id": "123456",
    "title": "Example Song",
    "artist": "Example Artist",
    "fingerprint": "abc123...",
    "audioUrl": "https://storage.../song.mp3",
    "uploadedBy": ["user1"],
    "uploadCount": 1
  }
}
```

### Duplicate Song Upload
```json
{
  "success": true,
  "message": "Song already exists in database, added to your library",
  "isDuplicate": true,
  "song": {
    "_id": "123456",
    "title": "Example Song",
    "artist": "Example Artist",
    "fingerprint": "abc123...",
    "audioUrl": "https://storage.../song.mp3",
    "uploadedBy": ["user1", "user2"],
    "uploadCount": 2
  }
}
```

## Next Steps

1. **Update backend database schema**
2. **Modify `/songs/upload` endpoint logic**
3. **Update `/songs/mine` endpoint**
4. **Test with the frontend**
5. **Monitor storage savings**

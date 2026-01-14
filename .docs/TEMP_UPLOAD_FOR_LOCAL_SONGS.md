# Listen Together - Temporary Cloud Storage for Local Songs

## 🎯 Concept

When you play a **local song** during a Listen Together session:
1. ✅ **Auto-upload** to cloud (temporary storage)
2. ✅ **Both users stream** from cloud URL
3. ✅ **Auto-delete** when session ends or song finishes

## 🏗️ Architecture

### Flow Diagram
```
Host plays local song
    ↓
Check if song already uploaded
    ↓
NO → Upload to cloud (temp storage)
    ↓
Get cloud URL
    ↓
Send cloud URL to participant
    ↓
Both stream from cloud
    ↓
Session ends OR song changes
    ↓
Auto-delete from cloud ✅
```

## 📦 Implementation

### 1. Backend - Temporary Upload Endpoint

Create: `backend/src/routes/temp-upload.ts`

```typescript
import { Router } from 'express';
import multer from 'multer';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import cloudinary from '../config/cloudinary';

const router = Router();
const upload = multer({ storage: multer.memoryStorage() });

// Store temporary upload metadata
const tempUploads = new Map<string, {
  publicId: string;
  url: string;
  uploadedAt: Date;
  sessionId: string;
}>();

// Upload local song temporarily
router.post('/upload-temp', authMiddleware, upload.single('audio'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file provided' });
    }

    const { sessionId, songTitle } = req.body;
    const file = req.file;

    // Upload to Cloudinary with temp folder
    const uploadResult = await new Promise<{ url: string; public_id: string }>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'audioly/temp-sessions',
          resource_type: 'video', // Audio files
          public_id: `session_${sessionId}_${Date.now()}`,
          tags: ['temp', 'session', sessionId],
        },
        (error, result) => {
          if (error || !result) return reject(error);
          resolve({ url: result.secure_url, public_id: result.public_id });
        }
      );
      stream.end(file.buffer);
    });

    // Store metadata for cleanup
    tempUploads.set(uploadResult.public_id, {
      publicId: uploadResult.public_id,
      url: uploadResult.url,
      uploadedAt: new Date(),
      sessionId,
    });

    // Schedule auto-delete after 2 hours (safety net)
    setTimeout(() => {
      void cleanupTempUpload(uploadResult.public_id);
    }, 2 * 60 * 60 * 1000);

    return res.json({
      url: uploadResult.url,
      publicId: uploadResult.public_id,
    });
  } catch (error) {
    console.error('Error uploading temp file:', error);
    return res.status(500).json({ message: 'Failed to upload file' });
  }
});

// Delete temporary upload
router.delete('/temp/:publicId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { publicId } = req.params;
    await cleanupTempUpload(publicId);
    return res.json({ message: 'File deleted' });
  } catch (error) {
    console.error('Error deleting temp file:', error);
    return res.status(500).json({ message: 'Failed to delete file' });
  }
});

// Cleanup all temp uploads for a session
router.delete('/session/:sessionId', authMiddleware, async (req: AuthRequest, res) => {
  try {
    const { sessionId } = req.params;
    
    // Find all uploads for this session
    const uploadsToDelete: string[] = [];
    tempUploads.forEach((metadata, publicId) => {
      if (metadata.sessionId === sessionId) {
        uploadsToDelete.push(publicId);
      }
    });

    // Delete all
    await Promise.all(uploadsToDelete.map(id => cleanupTempUpload(id)));

    return res.json({ 
      message: 'Session files deleted',
      count: uploadsToDelete.length 
    });
  } catch (error) {
    console.error('Error cleaning up session:', error);
    return res.status(500).json({ message: 'Failed to cleanup session' });
  }
});

// Helper function to delete from cloud
async function cleanupTempUpload(publicId: string) {
  try {
    // Delete from Cloudinary
    await cloudinary.uploader.destroy(publicId, { resource_type: 'video' });
    
    // Remove from memory
    tempUploads.delete(publicId);
    
    console.log(`Cleaned up temp upload: ${publicId}`);
  } catch (error) {
    console.error(`Failed to cleanup ${publicId}:`, error);
  }
}

// Cleanup old uploads (run periodically)
setInterval(() => {
  const now = new Date();
  const maxAge = 2 * 60 * 60 * 1000; // 2 hours

  tempUploads.forEach((metadata, publicId) => {
    const age = now.getTime() - metadata.uploadedAt.getTime();
    if (age > maxAge) {
      void cleanupTempUpload(publicId);
    }
  });
}, 30 * 60 * 1000); // Check every 30 minutes

export default router;
```

### 2. Frontend - Auto Upload Service

Create: `services/temp-upload.ts`

```typescript
import { API_BASE_URL } from '@/constants/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

class TempUploadService {
  private uploadedFiles = new Map<string, string>(); // songId -> publicId

  async uploadLocalSong(
    songUri: string,
    sessionId: string,
    songTitle: string
  ): Promise<string> {
    try {
      const token = await AsyncStorage.getItem('accessToken') || 
                   await AsyncStorage.getItem('userToken');

      if (!token) {
        throw new Error('Not authenticated');
      }

      // Create form data
      const formData = new FormData();
      formData.append('audio', {
        uri: songUri,
        type: 'audio/mpeg',
        name: `${songTitle}.mp3`,
      } as any);
      formData.append('sessionId', sessionId);
      formData.append('songTitle', songTitle);

      // Upload
      const response = await fetch(`${API_BASE_URL}/temp-upload/upload-temp`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Upload failed');
      }

      const { url, publicId } = await response.json();

      // Store for cleanup
      this.uploadedFiles.set(songUri, publicId);

      return url;
    } catch (error) {
      console.error('Error uploading local song:', error);
      throw error;
    }
  }

  async deleteUpload(songUri: string): Promise<void> {
    try {
      const publicId = this.uploadedFiles.get(songUri);
      if (!publicId) return;

      const token = await AsyncStorage.getItem('accessToken') || 
                   await AsyncStorage.getItem('userToken');

      await fetch(`${API_BASE_URL}/temp-upload/temp/${publicId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      this.uploadedFiles.delete(songUri);
    } catch (error) {
      console.error('Error deleting temp upload:', error);
    }
  }

  async cleanupSession(sessionId: string): Promise<void> {
    try {
      const token = await AsyncStorage.getItem('accessToken') || 
                   await AsyncStorage.getItem('userToken');

      await fetch(`${API_BASE_URL}/temp-upload/session/${sessionId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Clear local tracking
      this.uploadedFiles.clear();
    } catch (error) {
      console.error('Error cleaning up session:', error);
    }
  }
}

export const tempUploadService = new TempUploadService();
```

### 3. Integration with Listen Together

Update `hooks/useListenTogetherSync.ts`:

```typescript
import { tempUploadService } from '@/services/temp-upload';

// When host plays a local song
const playLocalSong = async (track: any, sessionId: string) => {
  const isLocal = track.uri.startsWith('file://') || 
                  track.uri.startsWith('content://');

  if (isLocal) {
    // Upload to temp storage
    const cloudUrl = await tempUploadService.uploadLocalSong(
      track.uri,
      sessionId,
      track.title
    );

    // Broadcast cloud URL instead of local path
    await listenTogetherService.syncPlayback(sessionId, {
      currentTrack: {
        id: track.id,
        title: track.title,
        artist: track.artist,
        uri: cloudUrl, // ← Cloud URL, not local path
        artwork: track.artwork,
        duration: track.duration,
        isLocal: false, // Treat as online for participant
        tempUpload: true, // Flag for cleanup
        originalUri: track.uri, // Keep original for cleanup
      },
      position: 0,
      isPlaying: true,
    });
  }
};

// When track changes or session ends
const handleTrackChange = async (oldTrack: any) => {
  if (oldTrack?.tempUpload) {
    // Delete previous temp upload
    await tempUploadService.deleteUpload(oldTrack.originalUri);
  }
};

// When session ends
const handleSessionEnd = async (sessionId: string) => {
  // Cleanup all temp uploads for this session
  await tempUploadService.cleanupSession(sessionId);
};
```

## 🎯 User Flow

### Host Playing Local Song:

```
1. Host selects local song "Tum Hi Ho.mp3"
   ↓
2. App detects it's local (file://)
   ↓
3. Auto-uploads to cloud (temp folder)
   ⏱️ Upload takes 5-10 seconds
   ↓
4. Gets cloud URL: https://cloudinary.com/temp/song123.mp3
   ↓
5. Sends cloud URL to participant
   ↓
6. Both stream from cloud URL ✅
   ↓
7. Song ends or user skips
   ↓
8. Auto-deletes from cloud ✅
```

### Participant Receiving:

```
1. Receives sync update
   ↓
2. Sees cloud URL (not local path)
   ↓
3. Streams from cloud ✅
   ↓
4. No need to have the file locally!
```

## ⚡ Optimizations

### 1. Upload Progress
```typescript
const uploadWithProgress = async (uri: string, onProgress: (percent: number) => void) => {
  // Show upload progress to user
  // "Uploading song... 45%"
};
```

### 2. Cache Check
```typescript
// Check if already uploaded
const cachedUrl = await checkIfAlreadyUploaded(songHash);
if (cachedUrl) {
  return cachedUrl; // Reuse existing upload
}
```

### 3. Batch Cleanup
```typescript
// When session ends, delete all at once
await cleanupSession(sessionId);
```

## 🔒 Security & Storage

### Cloudinary Configuration:
```typescript
// Temp folder with auto-delete
folder: 'audioly/temp-sessions'
tags: ['temp', 'session', sessionId]

// Auto-delete after 2 hours (safety net)
setTimeout(() => cleanup(), 2 * 60 * 60 * 1000);
```

### Storage Costs:
- ✅ **Temporary only** - deleted after use
- ✅ **No permanent storage** - saves space
- ✅ **Auto-cleanup** - prevents orphaned files

## 📊 Lifecycle

| Event | Action |
|-------|--------|
| Host plays local song | Upload to temp cloud |
| Song playing | Both stream from cloud |
| Song ends | Delete from cloud |
| Skip to next song | Delete previous, upload new |
| Session ends | Delete all session files |
| 2 hours pass | Auto-delete (safety) |

## 🎨 UI Indicators

```typescript
// Show upload status
{isUploading && (
  <View>
    <ActivityIndicator />
    <Text>Uploading song for session... {uploadProgress}%</Text>
  </View>
)}

// Show when streaming temp file
{isTempStream && (
  <Text>🔄 Streaming from session</Text>
)}
```

## ✅ Benefits

1. ✅ **Works for both users** - No need for matching libraries
2. ✅ **No permanent storage** - Auto-cleanup saves space
3. ✅ **Simple for users** - Automatic, no manual steps
4. ✅ **Cost-effective** - Only stores during active session
5. ✅ **Privacy-friendly** - Deleted after use

## 🚀 Next Steps

1. Add temp upload routes to backend
2. Create temp upload service
3. Integrate with sync logic
4. Add upload progress UI
5. Test cleanup on session end

This way, local songs work seamlessly in Listen Together sessions! 🎵

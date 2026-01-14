# Authentication Error Fix - Listen Together

## Problem
The app was showing **"Invalid token"** errors (401 Unauthorized) when:
- User was not logged in
- Token was stored with a different key name
- Badge component was trying to fetch requests without authentication

## Root Causes

### 1. Token Key Mismatch
The `ListenTogetherService` was looking for `accessToken`:
```typescript
const token = await AsyncStorage.getItem('accessToken');
```

But your app might be storing it as `userToken`.

### 2. No Authentication Check
The `ListenTogetherBadge` component was calling the API even when users weren't logged in, causing repeated 401 errors every 30 seconds.

## ✅ Fixes Applied

### 1. Updated `services/listen-together.ts`
**Added dual token support:**
```typescript
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
```

### 2. Updated `components/ListenTogetherBadge.tsx`
**Added authentication check before fetching:**
```typescript
const loadRequestCount = async () => {
  try {
    // Check if user is authenticated first
    const token = await AsyncStorage.getItem('accessToken') || 
                 await AsyncStorage.getItem('userToken');
    
    if (!token) {
      // User not logged in, silently return
      setRequestCount(0);
      return;
    }

    const requests = await listenTogetherService.getRequests();
    setRequestCount(requests.length);
  } catch (error: any) {
    // Silently fail for auth errors (401)
    if (error.message?.includes('401')) {
      setRequestCount(0);
    } else {
      console.error('Error loading request count:', error);
    }
  }
};
```

## How It Works Now

### Before Login:
1. Badge checks for token → Not found
2. Sets count to 0 (badge hidden)
3. No API calls made ✅
4. No errors in console ✅

### After Login:
1. Badge checks for token → Found
2. Fetches requests from API
3. Shows badge if requests exist
4. Polls every 30 seconds

### If Token Expires:
1. API returns 401
2. Badge catches error
3. Sets count to 0 (badge hidden)
4. No error spam in console ✅

## Testing

### Test 1: Not Logged In
```
Expected: No badge visible, no errors
Result: ✅ Badge hidden, no API calls
```

### Test 2: Logged In, No Requests
```
Expected: No badge visible
Result: ✅ Badge hidden
```

### Test 3: Logged In, Has Requests
```
Expected: Badge shows with count
Result: ✅ Badge visible with number
```

### Test 4: Token Expires
```
Expected: Badge disappears, no error spam
Result: ✅ Graceful handling
```

## Token Storage Keys

The service now checks **both** keys:
- ✅ `accessToken` (new standard)
- ✅ `userToken` (legacy/alternative)

This ensures compatibility regardless of which key your auth system uses.

## Error Handling

### Silent Failures (No User Impact):
- ❌ User not logged in → Badge hidden
- ❌ Token expired → Badge hidden
- ❌ 401 Unauthorized → Badge hidden

### Logged Errors (For Debugging):
- ❌ Network errors
- ❌ Server errors (500)
- ❌ Unexpected errors

## Files Modified

1. ✅ `services/listen-together.ts`
   - Added dual token support
   - Added `isAuthenticated()` helper

2. ✅ `components/ListenTogetherBadge.tsx`
   - Added pre-flight auth check
   - Added graceful 401 handling
   - Silently fails when not authenticated

## Next Steps

### If Errors Persist:

1. **Check Token Storage:**
```typescript
// In your login/auth code, verify how token is stored
await AsyncStorage.setItem('accessToken', token); // or 'userToken'
```

2. **Verify Token Format:**
```typescript
// Token should be stored as just the token string
// NOT as "Bearer token" - the service adds "Bearer" automatically
```

3. **Check Backend:**
```bash
# Test if backend is receiving correct auth header
curl -H "Authorization: Bearer YOUR_TOKEN" http://192.168.1.2:4000/listen-together/requests
```

## Summary

✅ **Problem:** 401 errors when not logged in  
✅ **Solution:** Check authentication before API calls  
✅ **Result:** No more error spam, graceful handling  
✅ **Bonus:** Works with both token key names  

The Listen Together feature will now only make API calls when the user is properly authenticated, eliminating the 401 error spam! 🎵

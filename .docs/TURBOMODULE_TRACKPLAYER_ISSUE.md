# TurboModule TrackPlayer Compatibility Issue

## Problem (Fixed)

`react-native-track-player` version 4.1.2 had an incompatibility with React Native's New Architecture (TurboModules). When `newArchEnabled: true`, the app crashed at runtime with:

```
TurboModuleInteropUtils$ParsingException: Unable to parse @ReactMethod annotations from native module: TrackPlayerModule. Details: TurboModule system assumes returnType == void iff the method is synchronous.
```

**Cause:** `@ReactMethod` functions used `= scope.launch { ... }`, so their return type was `Job` instead of `void`. TurboModule interop requires synchronous methods to return `void`.

## Fix Applied

- **Patch:** `patches/react-native-track-player+4.1.2.patch`  
  All `@ReactMethod` functions that used `= scope.launch { ... }` were changed to a block body that returns `void`: `{ scope.launch { ... } }`. The patch is applied automatically on `npm install`.

## Why We Can't Disable New Architecture

The following packages **require** new architecture to be enabled:
- `react-native-reanimated` v4.x (used in the app)
- `react-native-worklets` (peer dependency of `react-native-mmkv`)

## Current Status

- ✅ New architecture is enabled (`newArchEnabled: true`)
- ✅ `react-native-track-player` TurboModule error fixed via patch
- 📝 Upstream issue: https://github.com/doublesymmetry/react-native-track-player/issues/2413

## Solutions

### Option 1: Wait for Library Update (Recommended)
Monitor the `react-native-track-player` repository for a version that supports TurboModules. The maintainers are aware of this issue.

### Option 2: Patch Native Module (Advanced)
Modify the native Kotlin code in `react-native-track-player` to make methods compatible with TurboModule interop. This requires:
1. Understanding TurboModule method signatures
2. Modifying Kotlin coroutine return types
3. Creating a patch file

### Option 3: Use Alternative Audio Library
Consider using `expo-av` or another audio library that supports new architecture, though this would require significant code changes.

## Temporary Workaround

If you need the app to run immediately, you can:
1. Temporarily disable new architecture
2. Downgrade `react-native-reanimated` to v3.x (not recommended, loses features)
3. Remove `react-native-mmkv` (not recommended, loses performance benefits)

## References

- GitHub Issue: https://github.com/doublesymmetry/react-native-track-player/issues/2413
- GitHub Issue: https://github.com/doublesymmetry/react-native-track-player/issues/2460
- TurboModule Docs: https://reactnative.dev/docs/turbo-native-modules-android

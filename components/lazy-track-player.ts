/**
 * Lazy-load react-native-track-player so TurboModule errors (e.g. "unsupported parameter class: MusicModule")
 * don't crash the app at startup. When New Architecture is enabled, we never require() the package so the
 * native TurboModule getter is never triggered; getTrackPlayerModule() returns null and playback uses fallback.
 */

type TrackPlayerModule = typeof import('react-native-track-player');

let _mod: TrackPlayerModule | null | undefined = undefined;
let _decided = false; // true once we've decided to skip load (New Arch) or attempted require

function isNewArchEnabled(): boolean {
  try {
    const Constants = require('expo-constants').default;
    if (Constants.expoConfig?.newArchEnabled === true) return true;
  } catch {
    // ignore
  }
  try {
    const RN = require('react-native');
    const constants = (RN as any).NativeModules?.PlatformConstants;
    return constants?.newArchEnabled === true;
  } catch {
    return false;
  }
}

export function getTrackPlayerModule(): TrackPlayerModule | null {
  if (_mod !== undefined) return _mod;
  if (_decided) return _mod;

  // Never require react-native-track-player when New Architecture is on — the native module
  // triggers TurboModule parsing and throws (MusicModule unsupported). That exception can
  // be reported asynchronously, so try/catch around require() doesn't prevent the crash.
  if (isNewArchEnabled()) {
    _decided = true;
    _mod = null;
    if (typeof global !== 'undefined') (global as any).__TRACK_PLAYER_FAILED__ = true;
    console.warn('[Audioly] TrackPlayer disabled (New Architecture enabled; native module incompatible)');
    return null;
  }

  try {
    _mod = require('react-native-track-player');
    _decided = true;
  } catch (e) {
    if (typeof global !== 'undefined') (global as any).__TRACK_PLAYER_FAILED__ = true;
    console.warn('[Audioly] TrackPlayer failed to load:', (e as Error)?.message ?? e);
    _mod = null;
    _decided = true;
  }
  return _mod;
}

export function getTrackPlayer(): TrackPlayerModule | null {
  return getTrackPlayerModule();
}

export function isTrackPlayerAvailable(): boolean {
  return getTrackPlayerModule() !== null;
}

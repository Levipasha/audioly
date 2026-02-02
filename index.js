import 'expo-router/entry';

// Defer TrackPlayer registration so TurboModule errors don't crash app startup.
// When new arch is enabled, TrackPlayerModule can fail with "unsupported parameter class: MusicModule".
// We register only after the app bundle has loaded; if the module fails, the app still runs.
const { getTrackPlayerModule } = require('./components/lazy-track-player');
setImmediate(() => {
  const mod = getTrackPlayerModule();
  const TrackPlayer = mod?.default;
  if (TrackPlayer) {
    try {
      TrackPlayer.registerPlaybackService(() => require('./service'));
    } catch (e) {
      console.warn('[Audioly] TrackPlayer service registration failed:', e?.message || e);
    }
  }
});

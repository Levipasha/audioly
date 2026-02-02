import { AppState } from 'react-native';
import { useEffect, useState } from 'react';
import { getTrackPlayerModule } from './lazy-track-player';

const mod = () => getTrackPlayerModule();
const getTP = () => mod()?.default ?? null;

// Re-export for consumers (may be empty if TrackPlayer failed to load)
export const Event = mod()?.Event ?? {};
export const State = mod()?.State ?? {};

export async function setupPlayer() {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return false;

  let isSetup = false;
  if (AppState.currentState !== 'active') {
    console.log('[TrackPlayer] App not in foreground, deferring setup');
    return false;
  }

  try {
    await TrackPlayer.getActiveTrack();
    isSetup = true;
    console.log('[TrackPlayer] Already setup');
  } catch (error) {
    try {
      console.log('[TrackPlayer] Setting up player...');
      await TrackPlayer.setupPlayer();
      isSetup = true;
      console.log('[TrackPlayer] Setup complete');
    } catch (setupError: any) {
      console.error('[TrackPlayer] Setup failed:', setupError?.message || setupError);
      if (setupError?.message?.includes('foreground')) return false;
      throw setupError;
    }
  }

  const m = mod();
  if (!m?.AppKilledPlaybackBehavior || !m?.Capability) return isSetup;
  const { AppKilledPlaybackBehavior, Capability } = m;
  await TrackPlayer.updateOptions({
    android: {
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.StopPlaybackAndRemoveNotification,
    },
    capabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    compactCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
    ],
    notificationCapabilities: [
      Capability.Play,
      Capability.Pause,
      Capability.SkipToNext,
      Capability.SkipToPrevious,
      Capability.SeekTo,
    ],
    progressUpdateEventInterval: 0.2,
  });

  return isSetup;
}

export async function addTrack(track: any) {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return;
  await TrackPlayer.add(track);
}

export async function playTrack(track: any) {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return;
  await TrackPlayer.reset();
  await TrackPlayer.add(track);
  await TrackPlayer.play();
}

export async function togglePlayback() {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return;
  const playbackState = await TrackPlayer.getPlaybackState();
  const state = (playbackState && typeof playbackState === 'object') ? playbackState.state : playbackState;
  const StateEnum = mod()?.State;
  if (!StateEnum) return;
  if (state === StateEnum.Playing) {
    await TrackPlayer.pause();
  } else {
    await TrackPlayer.play();
  }
}

export async function skipToNext() {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return;
  await TrackPlayer.skipToNext();
}

export async function skipToPrevious() {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return;
  await TrackPlayer.skipToPrevious();
}

export async function seekTo(position: number) {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return;
  await TrackPlayer.seekTo(position);
}

export async function getPosition() {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return 0;
  const { position } = await TrackPlayer.getProgress();
  return position;
}

export async function getDuration() {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return 0;
  const { duration } = await TrackPlayer.getProgress();
  return duration;
}

export async function reset() {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return;
  await TrackPlayer.reset();
}

export async function setQueue(tracks: any[]) {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return;
  await TrackPlayer.reset();
  await TrackPlayer.add(tracks);
}

export async function getCurrentTrack() {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return null;
  return await TrackPlayer.getActiveTrack();
}

export async function getQueue() {
  const TrackPlayer = getTP();
  if (!TrackPlayer) return [];
  return await TrackPlayer.getQueue();
}

export function getTrackPlayerForListeners() {
  return getTP();
}

/** Safe progress hook when TrackPlayer may be unavailable (e.g. New Arch TurboModule failure). */
export function useProgressSafe(intervalMs: number = 1000): { position: number; duration: number } {
  const [progress, setProgress] = useState({ position: 0, duration: 1 });
  const m = getTrackPlayerModule();
  useEffect(() => {
    if (!m?.default) return;
    const TrackPlayer = m.default;
    let cancelled = false;
    const update = async () => {
      if (cancelled) return;
      try {
        const { position, duration } = await TrackPlayer.getProgress();
        setProgress({ position, duration });
      } catch {
        // ignore
      }
    };
    update();
    const id = setInterval(update, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [m, intervalMs]);
  return progress;
}

function useNoopTrackPlayerEvents(_events: string[], _handler: (event: any) => void) {
  useEffect(() => {}, []);
}

/** Safe event subscription when TrackPlayer may be unavailable. No-op if module missing. */
export function useTrackPlayerEventsSafe(
  events: string[],
  handler: (event: { type: string; [key: string]: any }) => void
): void {
  const m = getTrackPlayerModule();
  const useTrackPlayerEvents = m?.useTrackPlayerEvents ?? useNoopTrackPlayerEvents;
  useTrackPlayerEvents(events, handler);
}

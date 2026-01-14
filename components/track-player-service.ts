import { AppState } from 'react-native';
import TrackPlayer, {
    AppKilledPlaybackBehavior,
    Capability,
    Event,
    State,
    Track
} from 'react-native-track-player';

export async function setupPlayer() {
    let isSetup = false;

    // Check if app is in foreground (Android requirement)
    if (AppState.currentState !== 'active') {
        console.log('[TrackPlayer] App not in foreground, deferring setup');
        return false;
    }

    try {
        // Check if already setup
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
            if (setupError?.message?.includes('foreground')) {
                return false;
            }
            throw setupError;
        }
    }

    // Always update options to ensure latest configuration (like update frequency)
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
        progressUpdateEventInterval: 0.2, // Emit every 200ms for smooth UI
    });

    return isSetup;
}

export async function addTrack(track: Track) {
    await TrackPlayer.add(track);
}

export async function playTrack(track: Track) {
    await TrackPlayer.reset();
    await TrackPlayer.add(track);
    await TrackPlayer.play();
}

export async function togglePlayback() {
    const playbackState = await TrackPlayer.getPlaybackState();
    const state = (playbackState && typeof playbackState === 'object') ? playbackState.state : playbackState;

    if (state === State.Playing) {
        await TrackPlayer.pause();
    } else {
        await TrackPlayer.play();
    }
}

export async function skipToNext() {
    await TrackPlayer.skipToNext();
}

export async function skipToPrevious() {
    await TrackPlayer.skipToPrevious();
}

export async function seekTo(position: number) {
    await TrackPlayer.seekTo(position);
}

export async function getPosition() {
    const { position } = await TrackPlayer.getProgress();
    return position;
}

export async function getDuration() {
    const { duration } = await TrackPlayer.getProgress();
    return duration;
}

export async function setQueue(tracks: Track[]) {
    await TrackPlayer.reset();
    await TrackPlayer.add(tracks);
}

export async function getCurrentTrack() {
    return await TrackPlayer.getActiveTrack();
}

export async function getQueue() {
    return await TrackPlayer.getQueue();
}

export { Event, State };
export default TrackPlayer;

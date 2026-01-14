import TrackPlayer, { Event } from 'react-native-track-player';

module.exports = async function () {
    console.log('[Service] Registering playback service handlers');

    // Handle playback control events from notification
    TrackPlayer.addEventListener(Event.RemotePlay, async () => {
        console.log('[Service] Remote play');
        await TrackPlayer.play();
    });

    TrackPlayer.addEventListener(Event.RemotePause, async () => {
        console.log('[Service] Remote pause');
        await TrackPlayer.pause();
    });

    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
        console.log('[Service] Remote next');
        await TrackPlayer.skipToNext();
    });

    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
        console.log('[Service] Remote previous');
        await TrackPlayer.skipToPrevious();
    });

    TrackPlayer.addEventListener(Event.RemoteSeek, async ({ position }) => {
        console.log('[Service] Remote seek to:', position);
        await TrackPlayer.seekTo(position);
    });

    // Handle notification tap - this brings the app to foreground
    TrackPlayer.addEventListener(Event.RemoteDuck, ({ paused, permanent }) => {
        console.log('[Service] Remote duck - paused:', paused, 'permanent:', permanent);
        if (permanent) {
            TrackPlayer.pause();
        }
    });

    console.log('[Service] All handlers registered');
};

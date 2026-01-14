const { withAndroidManifest, withAppBuildGradle, withProjectBuildGradle } = require('@expo/config-plugins');

const withTrackPlayerService = config => {
    return withAndroidManifest(config, config => {
        const { manifest } = config.modResults;

        if (!manifest.$['xmlns:tools']) {
            manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';
        }

        if (!manifest.application) {
            manifest.application = [{ $: {} }];
        }

        const application = manifest.application[0];

        if (!application.service) {
            application.service = [];
        }

        const serviceExists = application.service.some(
            s => s.$['android:name'] === 'com.doublesymmetry.trackplayer.service.MusicService'
        );

        // Remove existing if we want to force update (or just update it)
        if (serviceExists) {
            // Find and update
            const service = application.service.find(
                s => s.$['android:name'] === 'com.doublesymmetry.trackplayer.service.MusicService'
            );
            service.$['android:exported'] = 'false';
            service.$['tools:replace'] = 'android:exported';
        } else {
            application.service.push({
                $: {
                    'android:name': 'com.doublesymmetry.trackplayer.service.MusicService',
                    'android:enabled': 'true',
                    'android:exported': 'false',
                    'android:foregroundServiceType': 'mediaPlayback',
                    'tools:replace': 'android:exported'
                }
            });
        }

        return config;
    });
};

const withTrackPlayerGradle = config => {
    return withAppBuildGradle(config, config => {
        if (!config.modResults.contents.includes('androidx.media:media')) {
            config.modResults.contents = config.modResults.contents.replace(
                /dependencies\s?{/,
                `dependencies {
    implementation "androidx.media:media:1.6.0"
    implementation "com.google.android.exoplayer:exoplayer:2.18.1"`
            );
        }
        return config;
    });
};

const withKotlinVersion = config => {
    return withProjectBuildGradle(config, config => {
        if (!config.modResults.contents.includes('kotlinVersion = "1.9.0"')) {
            if (config.modResults.contents.includes('ext {')) {
                config.modResults.contents = config.modResults.contents.replace(
                    /ext\s?{/,
                    `ext {
        kotlinVersion = "1.9.0"`
                );
            } else {
                config.modResults.contents = config.modResults.contents.replace(
                    /buildscript\s?{/,
                    `buildscript {
    ext {
        kotlinVersion = "2.0.0"
    }`
                );
            }
        }
        return config;
    });
};

const withTrackPlayer = config => {
    config = withTrackPlayerService(config);
    config = withTrackPlayerGradle(config);
    config = withKotlinVersion(config);
    return config;
};

module.exports = withTrackPlayer;

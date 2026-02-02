# Patches

Applied automatically by `patch-package` on `npm install`.

- **@missingcore+audio-metadata+1.3.0.patch** – Adds `react-native` to the package’s `exports` so Metro resolves it correctly on Android.
- **react-native-track-player+4.1.2.patch** – Fixes TurboModule (New Architecture) compatibility: makes all `@ReactMethod` functions return `void` instead of `Job` so the TurboModule interop parser no longer fails.

After cloning, run `npm install` so these patches are applied.

# Android build and release

This project uses Capacitor 8 to wrap the existing Vite application in a native Android shell. The Android project is generated on demand and is intentionally not committed. This keeps native infrastructure reproducible while the game remains web-first.

## Requirements

- Node.js 22 or newer
- Android Studio 2025.2.1 or newer
- Android SDK Platform 36
- JDK 21 for command-line/CI builds
- A connected Android device with USB debugging enabled, or an Android emulator

Capacitor 8 targets Android API 36 and uses API 24 as its minimum supported SDK in this project.

## First setup

Install JavaScript dependencies:

```bash
npm install
```

Generate/sync the Android project:

```bash
npm run android:sync
```

The command performs an Android-specific Vite build with relative asset paths, creates `android/` if needed, runs Capacitor sync, and applies the repository's deterministic Android configuration.

The normal web build remains unchanged:

```bash
npm run build
```

## Android commands

```bash
npm run android:init
npm run android:sync
npm run android:open
npm run android:run
npm run android:build:debug
npm run android:build:release
npm run android:bundle:release
npm run android:reset
```

`android:reset` removes the generated native project and immediately recreates it from the current Capacitor version.

## Output files

Debug APK:

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

Signed release APK:

```text
android/app/build/outputs/apk/release/app-release.apk
```

Unsigned release APK (when signing variables are not set):

```text
android/app/build/outputs/apk/release/app-release-unsigned.apk
```

Release Android App Bundle:

```text
android/app/build/outputs/bundle/release/app-release.aab
```

## Run on a device

Enable Developer Options and USB debugging on the Android phone, connect it by USB, and confirm it appears in:

```bash
adb devices
```

Then run:

```bash
npm run android:run
```

For emulator-based testing, start an emulator in Android Studio before running the same command.

## Release signing

Never commit a keystore or signing password.

Local release builds use these environment variables:

```text
ANDROID_KEYSTORE_PATH
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Example keystore creation:

```bash
keytool -genkeypair -v \
  -keystore doodlegame-release.jks \
  -alias doodlegame \
  -keyalg RSA \
  -keysize 4096 \
  -validity 10000
```

After exporting the four environment variables, build:

```bash
npm run android:build:release
npm run android:bundle:release
```

Without `ANDROID_KEYSTORE_PATH`, Gradle can still create an unsigned release build for diagnostics, but it is not suitable for Play Console upload.

## GitHub Actions secrets

The release workflow expects:

```text
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
```

Encode the keystore as one-line base64 before storing it in GitHub Actions Secrets.

Linux:

```bash
base64 -w 0 doodlegame-release.jks
```

macOS:

```bash
base64 < doodlegame-release.jks | tr -d '\n'
```

## Versioning

`package.json` is the source of truth for `versionName`.

`versionCode` is derived as:

```text
major * 1,000,000 + minor * 1,000 + patch
```

For example, `0.1.0` becomes version code `1000`.

Set `ANDROID_VERSION_CODE` to a positive integer only when an explicit override is required. Google Play requires every uploaded build to use a version code greater than all previous uploads.

For tag releases, use a tag matching the package version exactly, for example:

```text
package.json: 0.2.1
tag:          v0.2.1
```

The release workflow rejects a mismatched tag.

## CI behavior

`.github/workflows/android.yml` runs the existing regression tests, builds/uploads a Debug APK, and also validates unsigned Release APK/AAB packaging (including R8/resource shrinking) on pull requests, pushes to `main`, and manual runs.

`.github/workflows/android-release.yml` builds signed APK/AAB artifacts for version tags and manual runs. Tag builds also create/update the matching GitHub Release and attach both Android artifacts.

## Native configuration

`scripts/android/configure.mjs` reapplies the native settings after Capacitor sync:

- min SDK 24
- compile/target SDK 36
- package version -> Android version name/code
- release R8 minification and resource shrinking
- optional release signing from environment variables
- landscape activity orientation

Do not edit generated files under `android/` and expect those changes to persist. Put reproducible native changes in the configuration script instead.

## Branding

The generated Capacitor project currently uses its generated/default Android launcher and splash resources. Before a public store release, provide final high-resolution icon/splash source artwork and generate the Android resource set. That work does not require changing gameplay code.

## Phase 2: game-coupled mobile work

The following Android/mobile items are intentionally deferred because they touch or depend on game/UI behavior rather than build infrastructure:

- safe-area CSS around notches and system bars
- immersive fullscreen behavior coordinated with touch controls
- Android back-button -> pause/menu behavior
- app pause/resume integration with the game loop
- touch/Missile UI changes
- device-level gameplay acceptance testing and any fixes it reveals

This separation keeps Phase 1 limited to packaging, build, signing, CI, and native scaffolding.

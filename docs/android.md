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

The command performs an Android-specific Vite build with relative asset paths and source maps disabled, creates `android/` if needed, runs Capacitor sync, and applies the repository's deterministic Android configuration. The normal GitHub Pages build keeps source maps enabled.

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
npm run android:verify:play
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

## Google Play technical verification

After a Release APK/AAB has been built, run:

```bash
npm run android:verify:play
```

The verifier is a blocking release gate. It checks:

- target/compile SDK are at least API 36
- applicationId is `com.abolfazl.doodlegame`
- Android versionName/versionCode match `package.json` (or `ANDROID_VERSION_CODE` when explicitly overridden)
- the Play publishing artifact is an AAB
- Android Gradle Plugin is at least 8.5.1
- every packaged native `.so` is inventoried from both AAB and APK
- every 32-bit ARM/x86 native library has the same 64-bit counterpart
- Release APK passes `zipalign -c -P 16 -v 4`
- every packaged 64-bit ELF library has LOAD alignment of at least 16 KB

If no native shared libraries are present, the report explicitly records the package as architecture-neutral. This is still checked on every CI run so a future SDK cannot silently introduce incompatible native code.

Reports are written to:

```text
artifacts/play-compliance/play-compliance.md
artifacts/play-compliance/play-compliance.json
```

The Android workflow uploads them as the `doodlegame-play-compliance` artifact. The signed release workflow runs the same verifier against the signed release APK before publishing artifacts.

The verifier itself has regression tests, including a deliberately incompatible 32-bit-only native fixture which must be rejected.

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
- explicit WebView hardware acceleration
- cleartext traffic disabled
- Capacitor's INTERNET permission retained because native WebView startup/lifecycle validation depends on the packaged app's WebView networking stack

Do not edit generated files under `android/` and expect those changes to persist. Put reproducible native changes in the configuration script instead.

## Branding

Android branding is reproducible and applied during every `android:sync`.

Source files:

```text
assets/android/branding.json
assets/android/doodlegame-mark.svg
```

`branding.json` is the generator source of truth. It defines the monochrome doodle mark, foreground/background colors, and vector paths. The SVG is a human-readable preview/reference of the same mark.

`scripts/android/configure.mjs` generates:

- a density-independent legacy launcher vector for API 24/25
- adaptive launcher and round icons for API 26+
- a black splash drawable with the DoodleGame mark
- launch-theme wiring so the WebView does not begin with the default white Capacitor splash

Because the launcher assets are vectors, separate PNG copies for mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi are not required. Android rasterizes the resource for each device density.

To replace the temporary/minimal DoodleGame mark later, update both branding source files and run `npm run android:sync`.

## Mobile runtime behavior

The Android wrapper uses Capacitor 8 SystemBars in immersive mode. Safe-area values are exposed to CSS through the SystemBars inset variables with `env(safe-area-inset-*)` as a browser fallback.

Runtime behavior:

- Android system bars are hidden on launch and hidden again when the app becomes active.
- Leaving the app while a fight is running pauses the game loop.
- Returning to the app keeps the game paused until the player presses Resume.
- Android Back pauses an active fight.
- Android Back from Pause or Game Over returns to the game menu.
- Android Back from the menu exits the app.
- Touch input is cleared whenever Pause/Resume/menu navigation occurs so movement or attack cannot remain stuck after an interruption.
- The mobile missile panel only contains compact Angle/Power sliders; the separate FIRE MISSILE button is hidden because the on-screen ATTACK control already fires the missile.
- HUD, joystick, action buttons, bow panel, and missile panel respect notch/gesture safe areas.

## Automated emulator smoke test

The Android CI also reports/enforces a 25 MB upper bound for each APK/AAB artifact, then installs the generated Debug APK on an API 35 Pixel 6 emulator and validates:

- APK installation
- cold start of `MainActivity`
- application process remains alive after startup
- activity reaches resumed state
- background -> foreground restoration
- Android Back exits from the menu
- no package-specific fatal Android exception is present in logcat

CI uploads launch/final screenshots and logcat as the `doodlegame-emulator-smoke` artifact.

This smoke test is intentionally not treated as a replacement for real-device gameplay testing.

## Remaining device acceptance work

Automated CI now validates web build, Debug APK, unsigned Release APK/AAB, cold start and basic Android lifecycle on an emulator. Physical-device checks still need to cover audio/WebGL quality, multitouch feel across multiple aspect ratios, notch/cutout devices, and real task-switch/back-button behavior during an active fight. Any device-specific defect discovered there should be handled as a separate fix.

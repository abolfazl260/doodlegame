# Google Play reviewer access

## App Access declaration

**All functionality is available without special access.**

DoodleGame does not require an account, login, invitation, subscription, organization membership, test credential, location, or external service to reach its core gameplay.

For the Google Play **App access** declaration, keep the app marked as available without special access unless a future release introduces authentication or another access gate.

## Reviewer flow

1. Install and launch the app.
2. The main menu appears without a network request.
3. Choose a game mode/arena if desired.
4. Press **START** or the Enter key to begin a match.
5. Gameplay, pause/resume, restart, weapon selection and local progression are available offline.
6. Android Back pauses an active match, returns from Pause/Game Over to the menu, and exits from the menu.

No paywall or reviewer-only/hidden path exists in the current release.

## Offline behavior

The game is packaged with all runtime HTML, JavaScript, CSS and game assets inside the Android App Bundle. Core gameplay has no fetch/XHR/WebSocket/EventSource/beacon dependency and does not load fonts, scripts, images or other runtime assets from a CDN.

The Android manifest retains the INTERNET permission because Capacitor/WebView requires its local web stack, but the game does not require external network connectivity for startup or gameplay.

The public Privacy Policy web link is optional; a complete Privacy Policy copy is available inside the app offline.

## Failure and recovery behavior

- If WebGL initialization fails, the app switches to the Canvas renderer.
- If synchronous startup fails or startup exceeds the watchdog window, the Loading screen becomes an explicit restart/error message rather than remaining indefinitely.
- Android backgrounding pauses an active match.
- Process restart recreates the menu from packaged assets; no server/session recovery is required.

## CI evidence

The Android emulator smoke test runs with Wi-Fi/mobile data disabled and validates:

- offline cold start
- menu availability
- starting a match via Enter
- background/foreground while a match is active
- Back transition from paused gameplay to the menu
- alternate phone resolution via `wm size`
- force-stop + clean process recreation
- no package-specific fatal Android exception in logcat

CI screenshots and logcat are uploaded with the emulator smoke artifact.

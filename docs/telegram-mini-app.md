# Telegram Mini App deployment

This repository already hosts the browser game at:

**https://abolfazl260.github.io/doodlegame/**

Use that exact URL in Telegram's **Main Mini App** and optionally the bot
**Menu Button**. The trailing slash preserves the GitHub Pages/Vite base path.
There is **no separate Telegram hosting, token, API endpoint, or APK**.

## What the integration provides

- **Only Telegram launches** (both `tgWebAppPlatform` and
  `tgWebAppVersion` in the URL query or fragment) fetch the official
  `https://telegram.org/js/telegram-web-app.js?64` script.
- `Telegram.WebApp.ready()` and `expand()`; a fullscreen request is made
  on the game's user-initiated **Start** action where supported.
- Black in-app header, background and bottom bar, and disabled swipe-to-dismiss
  on supported Telegram clients.
- Live Telegram viewport and content/screen safe-area insets keep health bars,
  pause control, joysticks and menus inside visible space. The existing
  landscape-orientation notice is retained for phones held vertically.
- Telegram's header **Back** button pauses active play, then returns from
  pause/game-over to the main menu; while on the menu the button is hidden.
- Existing offline-save behavior, local PvP and all built-in/downloaded arenas
  continue without any Telegram account data or new network requirements
  outside the Telegram SDK. Normal browser and Android users are unaffected.

## Owner-only BotFather steps (one time)

The account owner must do these directly inside Telegram; a GitHub commit
cannot create a bot or select its username.

1. Open **[@BotFather](https://t.me/BotFather)**, send `/newbot` and
   choose the bot name and an available username ending in `bot`.
2. Use `/mybots`, select that bot, open **Bot Settings / Configure Mini App**
   (wording varies between Telegram clients), and configure the **Main Mini
   App** with **https://abolfazl260.github.io/doodlegame/** as the HTTPS URL.
   Add a title (for example `جنگ آدمک‌ها`), a description, and optional
   artwork/screenshots.
3. Optionally configure **Bot Settings → Menu Button** (or
   `/setmenubutton`) with button text `شروع بازی` and the **same HTTPS URL**.
4. Open your bot's profile in Telegram, tap **Launch App / Play**, rotate the
   phone to landscape, and verify menu → start → pause → resume → exit.
   After Main Mini App setup the deep link is
   `https://t.me/YOUR_BOT_USERNAME?startapp`, replacing only the bot username.
5. Test on **Telegram Android and iOS** with actual devices. Telegram header
   behavior, rotation and fullscreen capabilities vary by client/version.
   Verify joystick + attack in one-player and local two-player modes.
6. The public GitHub Pages deployment uses
   `.github/workflows/deploy-pages.yml` and updates on `main` merges.
   Wait for the Pages workflow to finish after a deployment.

**Never paste a bot token into GitHub, issues, this static website, source
code, build configuration or public chat.** The Mini App itself needs no bot
token. If you later add verified Telegram identities, scores, invites that
claim account ownership, payments or online matchmaking, use a separate server
to validate `Telegram.WebApp.initData` against a secret stored on that
server. **Never trust `initDataUnsafe` in the browser.**

## Testing

- `npm test`: unit coverage for SDK opt-in detection, safe areas, resize and
  Telegram Back-button lifecycle, including absence of any SDK request when
  opened in a normal browser.
- `npm run test:browser`: browser smoke tests with a controlled mocked SDK
  and the existing game startup.
- `npm run build` and `npm run build:android`: published assets remain the
  same Vite static build, and the APK does not fetch Telegram dependencies.

## Current limitations

- The bot must be created and its Main Mini App configured by its owner in
  **@BotFather**.
- The game is currently static and **does not log in users through Telegram**,
  send messages or scores to any server, or read Telegram private chats.
- **Local PvP remains two-player on the same device.** Two phones playing
  against each other requires separately implementing a secure realtime
  multiplayer backend.
- No physical screen-rotation guarantee: Telegram may not support orientation
  lock, so the landscape prompt remains in portrait mode.

Official reference: https://core.telegram.org/bots/webapps

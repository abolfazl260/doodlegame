# Telegram Mini App deployment

This repository already hosts the browser game at:

**https://abolfazl260.github.io/doodlegame/**

Use that exact URL in Telegram's **Main Mini App** and optionally the bot
**Menu Button**. The trailing slash preserves the GitHub Pages/Vite base path.
The core game remains on GitHub Pages without an APK for Telegram. The optional
verified leaderboard uses its own Cloudflare Worker + D1 database and secret.

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
- Normal browser and Android users keep offline behavior and are not asked for
  Telegram identity. In Telegram, a separately configured Worker can verify
  signed initData, identify the player and rank recorded single-player wins.

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

**Never paste a bot token into GitHub, issues, the static website, source code,
build configuration or public chat.** The backend uses the token only as a
Cloudflare Worker secret. The frontend sends only raw `Telegram.WebApp.initData`
to the Worker; the Worker verifies its HMAC and expiry. Never use
`initDataUnsafe` for identity.

## Owner setup: verified Telegram accounts and online wins

The public website is static and has no place to safely store the bot token.
Deploy the backend in [Cloudflare Workers](https://dash.cloudflare.com/) using
the code in the repo's `leaderboard-worker/` directory. This is a one-time
owner task; it requires a Cloudflare account and the **same bot token** as the
Telegram Main Mini App.

1. Install Node 22+ locally, clone this GitHub repository, then run:
   ```sh
   cd leaderboard-worker
   npm install
   npx wrangler login
   npx wrangler d1 create doodlegame-telegram-leaderboard
   ```
2. Copy the database ID printed by the CLI into
   `leaderboard-worker/wrangler.toml` in place of
   `REPLACE_WITH_YOUR_D1_DATABASE_ID` (the database ID is not a secret).
   Then run:
   ```sh
   npx wrangler d1 migrations apply doodlegame-telegram-leaderboard --remote
   npx wrangler deploy
   npx wrangler secret put TELEGRAM_BOT_TOKEN
   ```
   Enter the token **only at the secret prompt**, not in a command or repository.
   The Worker will have a URL like
   `https://doodlegame-telegram-leaderboard.<your-subdomain>.workers.dev`.
   Verify `/health` answers with `{"ok":true}`.
3. Set `public/leaderboard-config.json` in the GitHub repository to:
   ```json
   {"apiBaseUrl":"https://doodlegame-telegram-leaderboard.YOUR-SUBDOMAIN.workers.dev"}
   ```
   Use the **actual** Worker URL and commit the file to `main` so GitHub
   Pages redeploys. This is a public API URL, not a secret.
4. Open the bot's **Main Mini App**, not the raw website in an ordinary browser.
   Tap **More/Extra → 🏆 رتبه‌بندی تلگرام** in the game menu. Your verified
   name and recorded wins should be visible. Win a single-player match and
   refresh the ranking. Test on Android and iOS, plus score deletion.
5. To delete your online leaderboard account and result history, use
   **حذف رکورد من** inside the ranking panel. The API requires signed Telegram
   identity to delete records. The user's raw `initData` is not persisted.

**Counting policy:** One completed single-player match may count as one win;
a loss or draw does not add wins. Local two-player and Run mode do not count.
The Worker validates signed Telegram identity, limits stale initData, creates
single-use match IDs and checks a minimum duration and restart cooldown.
These measures are useful abuse guardrails but **client-reported outcomes are
not cryptographically anti-cheat**. Real competitive fairness requires
server-authoritative combat state or verifiable replay.

**Failure behavior:** without the Worker URL or if the Worker is unavailable,
normal gameplay continues. Users see a clear offline/unavailable status
in the leaderboard. Reopen the Mini App if Telegram `initData` has expired.
Data collection is disclosed in `public/privacy.html`.

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
- Verified login and rankings become live **only after the owner deploys the Worker,
  sets its bot-token secret, migrates D1, and configures the public Worker URL**.
  Until then the panel clearly indicates that rankings are unavailable.
- Telegram match results are client-reported with a one-time server match ID,
  timing checks, and authenticated account. This prevents simple replay and
  identity forgery, **not determined score fraud**. Never use these rankings
  as a basis for prizes, financial value or competitive payouts.
- Telegram messages and private chats are never accessed.
- **Local PvP remains two-player on the same device.** Two phones playing
  against each other requires separately implementing a secure realtime
  multiplayer backend.
- No physical screen-rotation guarantee: Telegram may not support orientation
  lock, so the landscape prompt remains in portrait mode.

Official reference: https://core.telegram.org/bots/webapps

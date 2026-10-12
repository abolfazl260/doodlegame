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

## Troubleshooting: the Telegram game looks unchanged or D1 stays empty

1. Verify that the bot's **Main Mini App** is linked to
   `https://abolfazl260.github.io/doodlegame/` in **@BotFather**.
   A plain link sent in chat or an ordinary URL menu button may open the
   Telegram **in-app browser**, not a Telegram Mini App; this does not supply
   signed login data. Use the bot's **Launch App** action or proper Web App
   menu button.
2. In the Telegram launch, the game menu has an immediately visible connection
   banner **below the title**, with a **connected** or **error** state.
   Tap it to read the specific error. The ranking control is no longer buried
   inside collapsed settings. The banner is absent from an ordinary web/Android
   launch.
3. If the banner says **login rejected (HTTP 401)**, check that the secret
   `TELEGRAM_BOT_TOKEN` in **Cloudflare Worker → Settings → Variables and
   Secrets** belongs to the **same Telegram bot** as the Main Mini App. Do not
   share or log the token. Close the Mini App fully and relaunch it.
4. If it says **server error (HTTP 5xx)**, in **Cloudflare → Storage &
   Databases → D1 → doodlegame-telegram-leaderboard → Console**, run:
   ```sql
   SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;
   SELECT COUNT(*) AS players FROM players;
   SELECT COUNT(*) AS matches FROM matches;
   ```
   Both `players` and `matches` must exist. If missing, apply the
   `leaderboard-worker/migrations/0001_init.sql` schema from this repo;
   also verify the Worker **Bindings** include the D1 variable named exactly
   `DB`, pointing to this database. Check **Worker → Observability → Logs**
   for details. Use no raw Telegram `initData` in support screenshots.
5. `/health` returning `{"ok":true}` proves only that the Worker code
   is running; it **does not** read D1 or validate a real Telegram account.
   `/api/me` returning `401` without an Authorization header is expected.
   Neither response proves an account was registered.
6. Once the menu banner shows **connected**, opening the Mini App should
   insert or update a record in `players` even if no match was played.
   An eligible finished **single-player** fight inserts an entry in `matches`.
   Local PvP and Run mode do not count toward the online leaderboard.
7. To get refreshed scenery, open **Choose Arena → Check New Arenas**, then
   **Update** each previously installed downloadable arena (version 3).
   These extra backgrounds will **not** update automatically on existing
   offline installs. The 16 bundled maps are unchanged.

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

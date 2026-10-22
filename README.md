# DoodleGame

A minimalist black-and-white browser duel game built with TypeScript and Three.js.

## Play

**[Play DoodleGame](https://abolfazl260.github.io/doodlegame/)**

## Game Structure

```text
doodlegame/
├── src/
│   ├── core/
│   │   ├── Game.ts
│   │   ├── GameLoop.ts
│   │   └── GameState.ts
│   │
│   ├── gameplay/
│   │   ├── GameSession.ts
│   │   ├── entities/
│   │   └── systems/
│   │
│   ├── rendering/
│   │   ├── Renderer.ts
│   │   ├── ThreeRenderer.ts
│   │   └── CanvasRenderer.ts
│   │
│   ├── input/
│   │   └── Input.ts
│   │
│   ├── platform/
│   │   └── web/
│   │       ├── WebInput.ts
│   │       ├── WebFrameScheduler.ts
│   │       └── WebStorage.ts
│   │
│   ├── ui/
│   │   └── GameUI.ts
│   │
│   ├── styles.css
│   └── main.ts
│
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Architecture

- **Core** — game lifecycle, loop, state transitions, and orchestration.
- **Gameplay** — duel simulation, fighters, weapons, physics, arenas, projectiles, health, and AI behavior.
- **Rendering** — Three.js as the primary renderer with a Canvas fallback for environments where WebGL is unavailable.
- **Input** — platform-independent input contracts plus browser keyboard/pointer handling.
- **Platform/Web** — browser-specific scheduling, storage, and input implementations.
- **UI** — menu, arena selection, weapon selection, controls help, health HUD, pause/restart controls, and game-over state.
- **Main** — application composition and browser bootstrap.

The gameplay layer is kept separate from browser APIs where practical so the game rules do not depend directly on the DOM.

## Gameplay

### Arenas

The game includes 20 selectable built-in arenas, including four illustrated mountain/river stages inspired by the supplied landscape references (Alpine Lake, Twilight Valley, Autumn Valley and Ember River):

- **Classic** — standard platforms with ice and slippery surfaces.
- **Towers** — elevated vertical combat with one-way platforms.
- **Pit** — split ground with lethal fall pressure.
- **Steps** — staggered platforms with mixed traction.
- **Zigzag** — moving-platform traversal and one-way movement.
- **Sky** — lighter gravity and high-platform combat.
- **Moving** — continuous moving-platform combat.
- **Fortress** — a destructible fortress arena; all standard weapons are available.
- **Bridge** — destructible bridge cover over a fall zone.
- **Crater** — recessed terrain with destructible cover.
- **Vertical** — wall-jump and multi-level combat.
- **Ruins** — broken moving terrain with mixed surfaces.
- **Conveyor** — alternating floor belts physically carry grounded fighters in opposite directions.
- **Collapse** — cracked bridge sections arm under a fighter and collapse after a short warning window.
- **Storm** — oscillating wind gusts push fighters, movable cover, and projectiles.
- **Reactor** — a local gravity well pulls fighters, movable cover, and projectiles toward the arena core.
- **Alpine Lake** — snowy blue peaks, evergreen woodland and a pale-blue glacier river, with icy side platforms.
- **Twilight Valley** — layered blue mountain ridges, a gold-pink sunset and a turquoise lake.
- **Autumn Valley** — an autumn forest below angular peaks, warm valley light and multi-level duel platforms.
- **Ember River** — crimson-orange sunset mountains, dark fir silhouettes and a winding teal river.

The four scenic landscapes are self-contained SVG recreations of the reference images, not remote image URLs. Background art is shared by arena previews, Canvas2D and WebGL. The stages work in the web game, same-device two-player mode, and the Android local Wi-Fi LAN duel. Public internet matchmaking is not available.

### Weapons

Eight weapons are currently available:

- Blade
- Hammer
- Blaster
- UZI
- Boomerang
- Bow
- Bomb
- Missile

Weapons have different damage, range, cooldown, knockback, and projectile behavior.

The visual weapon system is intentionally detailed while retaining the monochrome doodle/stick-figure style. The bow includes a shaped body, limbs, riser/grip details, string geometry, arrow shaft, nock, and fletching details.

### Controls

Starting a standard match requires Mode → Arena → Character & Weapon confirmation. The Start button is disabled until all required choices are confirmed. In **Random Weapons** mode confirm the randomly assigned weapon, and in **Missile Duel** confirm Missile. Rematches retain the locked choices, while returning to the menu starts a new selection process.


| Action | Keyboard |
|---|---|
| Move | A / D or Left / Right |
| Jump | W / Space / Up |
| Attack | Z / X |
| Grab & Throw | C (local PvP P2: Numpad1) |
| Weapon selection | Required in pre-match setup; locked during gameplay |

The game always uses a **landscape gameplay coordinate system**. On portrait screens, the full canvas, HUD, menus and touch controls rotate 90 degrees in software and fill the viewport; no turn-device dialog or orientation lock is required. Resizing and device rotation recalculate the logical landscape viewport without pausing the match. On Android the activity orientation is unrestricted, so orientation-locked phones can still play in portrait without switching the physical display.

On mobile, drag the movement joystick **upward to jump**, including diagonally while walking. Move the stick toward the center and push up again for a double jump or wall jump; holding it upward does not repeat jumps. There is **no separate JUMP button**. Swipe quickly upward from ATTACK to grab a nearby opponent without firing the equipped weapon. A normal tap or hold still attacks. Choose a character and starting weapon in the mandatory third setup step before any match; all in-game weapon switching buttons are removed. For local two-player matches, both players must confirm independent character and weapon choices. Drag the ⊕ direction pad to aim, then use ATTACK to fire. Keyboard aim: P1 R/F and P2 PageUp/PageDown. Choose player count separately from game mode; all seven match modes support local two-player play. The opening space preview lasts three seconds. The main menu starts in Persian unless a saved language preference is present. Both fighters start each round at 100 HP.

## Rendering

Four built-in arenas (Fortress, Bridge, Crater, and Sky) now use small, self-contained SVG backgrounds in `src/assets/backgrounds/`, shared by both in-game renderers and arena-picker previews. These visual-only assets do not change gameplay physics, collision platforms, or arena definitions; they require no network access.


The primary renderer uses **Three.js** for:

- animated stick/doodle fighters
- distinct player and opponent visuals
- detailed weapons
- arena platforms
- projectiles
- movement, jump, landing, and attack poses

If WebGL initialization fails, the application falls back to the Canvas renderer.

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Deployment

The frontend is a static Vite application and can be deployed to GitHub Pages.

Current live deployment:

**https://abolfazl260.github.io/doodlegame/**

The browser game remains frontend-only. Android LAN duels use the native phone-to-phone transport described below; public online presence, accounts and internet matchmaking are not implemented.

## Motion and physics

Both renderers use the same articulated pose and detailed vector tool geometry.
Fighters breathe at rest, bend knees and elbows while running, change poses on
ascent/descent, compress on landing, lean during dashes and recoil on impacts.
Tools stay attached to the hand; blade/hammer variants, gun recoil and muzzle
flashes, bow string tension and missile elevation have distinct visuals.

Simulation uses substeps no longer than 1/120 second. Normal landings settle;
ice and slippery surfaces reduce traction and braking, air steering is weaker,
and moving platforms carry their riders. Tank/boss mass reduces hit impulses.
Solid platform sides and undersides block movement; one-way platforms allow
upward passage. Active blade/hammer swings can deflect incoming bullets/arrows;
projectiles continue aging and can never remain indefinitely in a collision.

Run `npm test` for motion/physics regressions, then `npm run build`.


## Android builds run only when requested

Ordinary pull requests and pushes to `main` run the browser/TypeScript CI suite, **not** Android Gradle builds or emulator tests. When an Android test APK is needed, go to **GitHub Actions → Android → Run workflow**. That manual workflow runs game regression tests, builds the debug APK and unsigned release APK/AAB, verifies Android requirements, and runs an emulator smoke test. Official signed releases are still built by **Android Release** when manually requested or when a version release tag is pushed.

## Android on-demand game data updates

The Android main menu displays one **Update / بروزرسانی** button. It fetches the
current `public/game-data.json` from GitHub's `main` branch over HTTPS, validates
the strict schema and safe balance ranges, saves the result to local app storage,
and applies it to new rounds. Once downloaded, the saved balance continues to
work offline. A malformed, failed, oversized or older remote update leaves the
installed/cached balance unchanged.

To publish new data, edit `public/game-data.json`, increase `dataVersion`, and
merge to `main`. Supported data updates: each weapon's `damage` and `cooldown`,
and each arena's `speedMultiplier` and `jumpMultiplier`. No JavaScript, HTML,
plugin, APK, or binary code is downloaded or executed. Updates must be explicitly
requested by the player; there is no background polling or analytics.

**Android APK/app-code updates are separate:** this data-only updater cannot
install new application code. Publishing a signed Android release/Google Play
update is required for changes to the bundled app itself. The repository currently
has no GitHub Releases containing signed installable APKs.


## Telegram Mini App

The **existing HTTPS game** can be used as a Telegram Mini App without a
separate build or hosting service:

**https://abolfazl260.github.io/doodlegame/**

The official Telegram WebApp bridge initializes **only when Telegram launch
parameters are present**; the regular website and offline Android APK do not
request the Telegram SDK. See [the deployment and BotFather checklist](docs/telegram-mini-app.md).

Mini App integration currently provides safe-area/viewport handling, dark
Telegram chrome, request-to-expand/fullscreen, disabled vertical swipe-dismiss,
and an in-header Back button that pauses the match and then returns to the menu.
It does not automatically create a bot, perform Telegram login, store Telegram
user data, or add online multiplayer. Existing local multiplayer remains local.

## Google Play Android release versioning

The user-visible Android version is read from `package.json` (currently `0.1.1`).
For signed GitHub Android releases (`.github/workflows/android-release.yml`),
the build automatically sets a distinct Google Play `versionCode` using:

```text
1000000 + (GITHUB_RUN_NUMBER * 100) + GITHUB_RUN_ATTEMPT
```

Each new **Android Release** workflow run advances the code, and reruns get
a distinct attempt code (attempts 1–99). The exact same code is used for
Android configuration and the Play compliance verification. The generated
code must also exceed **every versionCode previously uploaded to Google Play**.
We cannot determine that Play Console value from GitHub alone.

If Play Console already contains a larger versionCode, start the GitHub
**Android Release** workflow manually via **Run workflow** and supply a larger
`version_code` input. Keep supplying an appropriate override for future
releases until the automatic sequence surpasses the largest code on Play.
Do not re-upload an earlier AAB: a new release build is required.

Local release builds (`npm run android:bundle:release`) are **not** part of
this GitHub sequence. They derive their code from `package.json` unless
you explicitly set `ANDROID_VERSION_CODE`. For a local upload, obtain the
largest versionCode from Play Console and choose a higher one:

```sh
ANDROID_VERSION_CODE=1002000 npm run android:bundle:release
```

The example value must be replaced with a code greater than the largest one
previously uploaded. Signed bundles are produced by the configured release
workflow when the Android signing secrets are present.

## Android local Wi-Fi multiplayer

The Android APK has a separate native LAN 1v1 implementation: host a room, join by local IP/port/session token, and ready on both phones. The host owns combat state; each phone has one control set. Duel and bundled arenas are supported initially. No backend, internet matchmaking or account is used; Online remains disabled. Native build and physical two-phone acceptance are pending; see [validation status](docs/lan-validation.md).

[How to play and troubleshoot LAN](docs/lan-multiplayer.md) · [Architecture](docs/adr/001-android-lan.md)

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

The game currently includes 16 selectable arenas:

- **Classic** — standard platforms with ice and slippery surfaces.
- **Towers** — elevated vertical combat with one-way platforms.
- **Pit** — split ground with lethal fall pressure.
- **Steps** — staggered platforms with mixed traction.
- **Zigzag** — moving-platform traversal and one-way movement.
- **Sky** — lighter gravity and high-platform combat.
- **Moving** — continuous moving-platform combat.
- **Fortress** — the dedicated missile arena.
- **Bridge** — destructible bridge cover over a fall zone.
- **Crater** — recessed terrain with destructible cover.
- **Vertical** — wall-jump and multi-level combat.
- **Ruins** — broken moving terrain with mixed surfaces.
- **Conveyor** — alternating floor belts physically carry grounded fighters in opposite directions.
- **Collapse** — cracked bridge sections arm under a fighter and collapse after a short warning window.
- **Storm** — oscillating wind gusts push fighters, movable cover, and projectiles.
- **Reactor** — a local gravity well pulls fighters, movable cover, and projectiles toward the arena core.

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

| Action | Keyboard |
|---|---|
| Move | A / D or Left / Right |
| Jump | W / Space / Up |
| Attack | Z / X |
| Previous weapon | Q / O |
| Next weapon | E / P |

On mobile, drag the movement joystick **upward to jump**, including diagonally while walking. Move the stick toward the center and push up again for a double jump or wall jump; holding it upward does not repeat jumps. There is **no separate JUMP button**. The ATTACK button and weapon arrows remain separate. The main menu starts in Persian unless a saved language preference is present. Both fighters start each round at 100 HP.

## Rendering

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

The current game is frontend-only. Persistent online presence, authentication, matchmaking, and real-time multiplayer would require a separate backend or hosted realtime service.

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

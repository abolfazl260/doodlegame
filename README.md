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

The game currently includes three selectable arenas:

- **Classic** — standard platforms and open movement.
- **Towers** — multiple elevated platforms and vertical combat.
- **Pit** — a more compact arena with central elevation.

### Weapons

Six weapons are currently available:

- Blade
- Hammer
- Blaster
- Boomerang
- Bow
- Bomb

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

Pointer input can also trigger jump and attack.

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

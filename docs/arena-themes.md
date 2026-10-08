# Arena visual themes

Every arena has one entry in `src/themes/ArenaThemes.ts` (currently 16).
These definitions control **presentation only**. Platform geometry, controls,
collisions, weapon logic and enemy AI stay in `GameSession`.

## Rendering pipeline

- `GameUI.render` uses the current HUD arena ID to set theme CSS variables on
  the existing `.game-ui` root. The variables are refreshed only when the
  arena changes. All button hit areas and positions remain unchanged.
- `CanvasRenderer` paints a palette-specific background and platform body/edge.
- `ThreeRenderer` builds a small (640x360) background texture when the arena
  changes, shares the same backdrop painter, and updates lightweight platform
  materials and edge strips.
- `platformColors` retains ice, slippery, one-way and conveyor visual cues
  across every palette. Never style physics types solely by the arena accent.

## Art direction

Three reusable HUD skin families are provided: `doodle`, `neon`, and
`fantasy`. The fortress is the doodle reference arena, and moving is the neon
reference arena. Every other arena has a separate palette and backdrop motif,
ready to be extended with authored textures or sprites later.

## Adding an arena

1. Add its ID to the arena definitions in `GameSession.ts`.
2. Add a complete entry to `ARENA_THEMES` in `ArenaThemes.ts`. The type
   `Record<ArenaId,ArenaTheme>` keeps the mapping exhaustive at compile time.
3. Choose a skin and backdrop motif; avoid embedding visuals in game physics.
4. Check both WebGL and forced Canvas rendering at phone landscape sizes.
5. Add it to the theme regression test's arena list.

The renderer avoids loading images for every arena at startup. A new WebGL
background texture is created only on arena change and the old one is disposed.
Backdrop artwork is currently procedurally painted, so there are no new image
files, downloads or external dependencies. Higher-fidelity art can replace
individual background painters while preserving the theme contract.

## Validation

`npm test` checks theme coverage and renderer behavior; `npm run build`
performs strict TypeScript validation and bundles the game. Mobile joystick,
missile aim and desktop gameplay regressions must still pass. Compare fortress
and moving visually in actual gameplay before merging.

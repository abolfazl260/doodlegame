# Local two-player PvP — design and controls

## Connection model and rationale

The first implementation of **Two Players (Local)** runs two human fighters on one shared device. It works offline and uses the existing deterministic local simulation, rendering, arenas, pause lifecycle, and result screens. It does not open a network socket, depend on a service, or require a user account.

Local play was selected rather than LAN or internet matchmaking because it avoids server, authentication, lobby, synchronization, latency-compensation, and disconnect dependencies while making the basic game fully playable by two people. Network multiplayer would be a **separate future feature** with explicit online/connection tests.

## Selecting a match

1. From the main menu choose **Two Players (Local)** / **دو نفره (محلی)** in the player-count cards, then choose the **Local PvP** game-mode card.
2. Tap **Next: Choose Arena**, select one of the 16 arena cards, and tap **Start**. Both fighters spawn with 100 HP; Player 2 has no AI.
3. Each player controls their own movement, jump, attack, and weapon selection.
4. When a fighter reaches zero HP, the other wins. If both reach zero during the same simulation update, the result is a draw. Restart begins a fresh local two-player match in the selected arena; Main Menu exits the match.

The mode does not spend or earn normal single-player upgrade points. Previously purchased single-player upgrades have no combat effect during PvP, so both fighters use the same base weapon stats.

## Desktop keyboard

| Action | Player 1 | Player 2 |
| --- | --- | --- |
| Move | A / D | Left / Right arrows (or Numpad 4 / 6) |
| Jump | W / Space | Up arrow (or Numpad 8) |
| Attack / hold automatic fire / charge Bow | Z / X | Enter (or Numpad 0) |
| Previous / next weapon | Q / E | [ / ] |
| Pause / resume | Escape | Escape |

Bow fires on release, UZI fires repeatedly while held, and all other weapons retain their ordinary attack behavior.

## Mobile / Android WebView

In landscape, Player 1 has the left joystick, a dedicated ATTACK button immediately to its right, and a weapon selector above the joystick. Player 2 has the right joystick, a separate ATTACK button immediately to its left, and a separate weapon selector above the right joystick. Each touch gesture owns its own pointer ID and pointer capture; the other player's movement and attacks must not be interrupted by unrelated touches. Joystick upward movement jumps; returning toward neutral rearms the double-jump threshold.

The Pause button remains visible and uses the existing Pause / Resume / Main Menu lifecycle. The orientation guard continues to require landscape.

## Verification

- `npm test`: both players move and jump independently, only the intended player attacks, independent UZI hold and Bow charge/release, winner and draw, no progression rewards, arena reset, and return to the regular AI mode.
- `npm run test:browser`: menu selection and HUD, keyboard coexistence, four real Chromium multi-touch contacts, mobile weapon selection, pause/resume, and match results.
- `npm run build`: TypeScript and production bundle.
- A physical-device Android touch ergonomics check is recommended before a store release.

## Out of scope

Online matchmaking, LAN sessions, remote connectivity, disconnect/rejoin behavior, persistent PvP rankings, and accounts are **not included** in this local same-device implementation.

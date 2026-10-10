# Match menu UX: extensible step-based flow

The main menu is **not a form**. It guides players through visual choices; there are no native dropdowns.

## Current flow

### Step 1 — Who plays? Which game mode?

- Choose **Solo Player** or **Two Players (Local)** with one of the two large player-count cards.
- Immediately below, choose a game mode from touch-friendly cards. Solo reveals seven existing modes; local 2P reveals its one supported mode (the opponent is a second human, never AI).
- Changing player count updates the mode state while preserving the last solo selection when switching back from 2P. The selected card is visually distinct and exposes `aria-pressed`.
- Choose **Next: Choose Arena** to advance. Starting a match is not possible from this screen.
- Existing four-fight Run and its upgrade opportunities are accessible in a **collapsed Run & Upgrades drawer**. The drawer auto-expands for an ongoing Run on return from battle. The main wizard no longer buries Next behind Run content.

### Step 2 — Where do we fight?

- Choose from **16 arena tiles**; each tile uses the arena's existing accent/secondary colors, a visible name and selected-state indicator.
- Optionally expand **Starting Weapon** to choose a weapon using cards. Illegal mode/weapon combinations are hidden and disabled; the current weapon restrictions remain in the game logic.
- View the live summary of mode, arena and weapon.
- Use **Back** to change the player count or mode without clearing compatible settings; use **Start** to launch the chosen match.

### Other menu controls

- **Settings & Help** remains a secondary expandable section on step 1 and while paused, with Help, Privacy, Sound, Camera Shake, and Android Update. It is hidden during arena selection.
- Available weapon upgrades appear as selectable cards with an explicit **Upgrade** button (Run reward choices remain restricted by the progression system).
- Pause/Resume and Game Over retain their existing actions. In-game interactions and performance-sensitive HUD rendering are separate from the wizard.
- The menu is safe-area-aware and internally scrollable on short landscape displays; the primary step-navigation/action buttons remain sticky and large enough for touch.

## Future steps

The flow is deliberately indexed by `MENU_STEPS` in `src/ui/GameUI.ts` instead of being hard-coded as a dropdown-heavy single page. To add a step, extend the step type and ordered array, create its page and localized copy, and expand `syncWizard` and its tests. The progression labels derive the step number and total count from this array. Examples include character selection, equipment customization, or pre-match modifiers.

Do not add an enabled online matchmaking option without an actual connection implementation. Current 2P is **same-device only**.

## Verification

- `npm test`: matching card state, accessible groups, player-count filtering, back/next, no native select elements, weapon mode constraints, Run lifecycle, and zero DOM writes in stable gameplay HUD.
- `npm run test:browser`: actual mobile-sized taps, localized cards and live preview, internal scrolling and sticky actions, help overlay and keyboard dismissal, local 2P setup, and all existing Run flows.
- `npm run build`: TypeScript and web production build.

## Visual regression: Persian desktop reference

- Step 1 has a properly labeled golden **Next: Choose Arena** action. The previous blank button was caused by the locale-update loop overwriting the extra wizard actions with undefined.
- Mode/arena heading width is constrained to its parent grid; the generic 44rem section title must never push the left card column outside the menu.
- The Run, upgrades and settings are secondary, collapsed sections and do not appear on the dedicated arena screen.
- Responsive browser assertions check RTL horizontal bounds at 1488×1055, the next/back/start labels in both languages, and step isolation on compact landscape screens.

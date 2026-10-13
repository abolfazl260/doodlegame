# Main menu review and decision (#127)

## Journey audit

| Journey | Before | Selected model |
| --- | --- | --- |
| First solo fight | Configure players/mode, Next, arena, Start | One obvious Quick Play action |
| Returning casual player | Repeat wizard even for default duel | Same stable one-tap default |
| Custom mode/arena/weapon/character/name | Two-step wizard with dense initial options | Explicit Customize route retains complete wizard |
| Local two humans | Player-count option among setup choices | Dedicated same-device entry into player setup |
| Arena browsing | Initial mode page → arena shortcut | Arenas route opens arena step directly |
| Run/upgrades | Collapsed drawer below setup | Progression route plus visible Continue on landing |
| Settings/help | Collapsed drawer below setup | Dedicated secondary landing route |
| Pause → Main Menu | Wizard reset | Landing, restoring custom setup after Quick Play |
| Game Over → Replay | Existing restart lifecycle | Same match replay; Main Menu returns to landing |

The previous setup asks for decisions before a casual player needs them. Progression/help are below scroll depth, and arena selection repeats headings. The disabled online placeholder adds noise to first entry. All are meaningful in explicit custom setup; they should not compete with the first-fight CTA. The existing three-second intro has Skip and does not need another delay or animation.

## Alternatives, before implementation

A. **Landing plus full setup**: large Quick Play and a compact secondary route grid; desktop uses the same hierarchy with more whitespace. Compact landscape keeps Quick Play at the top and routes in a scrollable area. A dedicated Back to home action restores predictable navigation. See [wireframe A](alternative-a.svg).

B. **Quick Play above an always-expanded wizard**: familiar customization immediately visible, fewer view transitions for experienced players. On compact landscape the first step still dominates scroll depth and competing CTAs; desktop looks denser. See [wireframe B](alternative-b.svg).

Choose A. It reduces first-fight interaction count to one, preserves mature setup/progression flows, gives local play a truthful separate entry, and avoids rebuilding #125's gallery. The final mockup is [the selected landing](selected.svg). Gold is the single primary action; outlined navy cards are secondary. No public online-play control is added.

## Behavior contract

Quick Play always launches **solo Duel / built-in Classic / Blade**, with the chosen character/name. Its caption states those defaults. It never resumes a local match or Run. A temporary setup snapshot restores custom arena/mode/player-count/starting weapon when returning to Main Menu; Replay repeats Quick Play normally. Saved names, character, language, preferences, career and Run are preserved.

Customize opens step 1. Local 2 Players selects two humans and opens step 1 for names/characters/mode; it does not instantly start. Arenas opens step 2 with current setup preserved. Progression shows Run/upgrades; Settings shows help/privacy/preferences/language/update. Back to home returns to the landing without resetting selections. A pending Run exposes Continue; pending intermission rewards remain visible in Progression before continuing. New Run is an explicit existing action, not an implicit Quick Play side effect.

Landing remains scrollable within safe areas. Quick Play is immediately visible at 568×280; route targets are at least 44px. Wizard Next/Back/Start remain sticky. RTL changes reading direction while physical fighter sides stay fixed. Name inputs bypass gameplay shortcuts. Downloads remain in their existing gallery with existing loading/error states.

## Success checks

First fight from one click; no second setup page needed. Every existing mode, all 16 arenas and downloaded arenas, names/characters and legal weapons remain reachable. Back, Pause/Main Menu, Replay, Run and settings work without duplicate rewards. Browser QA covers both locales/four compact sizes, touch hit testing, snapshot restoration, text entry, and pending Run persistence.

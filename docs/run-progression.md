# Offline four-fight Run

DoodleGame has an optional offline Run separate from the normal Duel game modes.

## Encounters
1. Classic — Runner, 100 HP
2. Towers — Tank, 115 HP
3. Moving — Shooter, 130 HP
4. Ruins — Boss, 175 HP

The Run uses Duel rules, including the existing player weapons and upgrade effects. A player can choose normal Duel and the other modes without starting a Run.

## Rewards and upgrades
- A victory awards one existing upgrade point, exactly once for the completed encounter.
- The first three victories present three available weapon upgrades. The player must buy one before proceeding; purchased effects last only within this Run.
- Normal Duel upgrade points and purchased upgrades are separate from the Run's snapshot and are restored on leaving the Run.
- The final Boss victory ends the Run. Any unspent Run points disappear when a new Run begins.
- A loss never awards points. Retry starts the same encounter with already-purchased Run upgrades.
- Selecting New Run resets encounter position and Run upgrades, but does not erase career statistics or badges.

## Local save and recovery
- All data remains on-device in `doodlegame.progression`, schema version 1, using the existing Storage interface / WebStorage.
- A completed encounter or upgrade choice saves the checkpoint. During an encounter, the saved status is `fighting`; after app restart that becomes `ready`, so the same encounter starts again rather than granting progress without a victory.
- Android Back from an active Run similarly returns its current encounter to `ready` without a reward. Returning to the normal menu with a pending victory retains that upgrade decision for later.
- Corrupt, unsupported or malformed saved data is ignored safely. Schema version 0 career counters migrate to version 1 without creating an unfinished Run.
- Clearing application/browser site data deletes this device-only progress. No account or network connection is required.

## Permanent cosmetic milestones
Badges appear in the Run menu and do not modify fighting strength:
- **Rookie:** 1 Run victory.
- **Veteran:** 3 Run victories.
- **Champion:** 1 completed four-fight Run.

These milestones have no paywall. All messages are available in English and Persian.

## Validation
`npm test` includes data migration, storage failure, duplicate reward, intermission purchases, defeat/retry, boss sequence, and normal-mode isolation. `npm run test:browser` exercises the four-stage Run, touch menu, local reload, language switching, and Back-to-menu recovery with the real Game and UI.

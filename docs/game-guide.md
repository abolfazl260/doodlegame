# In-game guide (#126)

Help is a localized six-section reference: Basic controls, Advanced moves, Weapons & upgrades, Game modes, Progression & arenas, and Local 2 players. Basic controls open first; native expandable sections disclose detailed reference material. Each weapon/mode has its own description and all eight weapon upgrades reuse the existing names/descriptions. Key bindings are isolated LTR inside Persian text.

The typed English/Persian records live in `src/i18n/GameGuide.ts`. `I18n.ts` selects the locale; GameUI renders semantic headings, articles and details once per locale change. No monolithic HTML string or separately appended Grab paragraph remains. Close/Escape restore focus; Tab stays inside the open dialog. The dialog itself scrolls, avoiding nested vertical scroll regions; the existing replay-touch-tutorial action remains available.

Descriptions were checked against WebInput, GameSession and Progression. Missile follows #123's fixed Attack arc. Random Weapons assigns at round start and does not cycle during combat. Grounded kicks, airborne slam and Hammer's Ground Slam upgrade are described separately. Hill scores only uncontested center time and permits HP victory. Solo aliases are distinguished from actual P2 bindings. Normal Duel upgrades are session state; saved career progress and run checkpoints are distinct.

When mechanics/bindings change, update both typed locale records and their regression assertions. Tests require all section, weapon and mode IDs and verify key guidance. Browser coverage expands/collapses every section, checks 8 weapons and modes, Close/Escape/focus, four landscape sizes, RTL and increased text size. The guide remains fully offline.

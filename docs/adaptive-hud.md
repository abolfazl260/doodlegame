# Essential combat HUD (#124)

| Information | When shown | Placement |
| --- | --- | --- |
| Both names and HP | Throughout combat | Physical left/right bars |
| Pause | Throughout combat | Center of safe viewport |
| Objective score and target | King of the Hill | Compact second row |
| Result | End of match | Result screen |
| Bow charge | Active charge | Existing weapon interaction |
| Weapon identity | Selection | Interactive weapon button/picker |
| Mode/weapon/angle/power details | Never | Removed by #123 |

Normal Duel has a single health row, without a mode label or reserved empty status row. Objective content creates a second row only when needed. Long names truncate visually but retain the full text and title; HP never shrinks away. 13–14px text, high-contrast number chips and physical fighter sides remain stable in both languages. Pause follows the asymmetric safe viewport so cutouts cannot push a health bar under it. Existing cached HUD updates still perform zero DOM writes during unchanged frames.

The touch-enabled browser fixture captures layout, not live arena rendering. Both locales are checked at 568×280, 568×320, 640×320 and 844×390, with asymmetric safe-area checks and control hit testing. Compare [Duel before](screenshots/hud/before-en-duel.png) / [after](screenshots/hud/after-en-duel.png), and [Hill before](screenshots/hud/before-fa-king-of-hill.png) / [after](screenshots/hud/after-fa-king-of-hill.png). The footprint shrinks in ordinary combat without sacrificing objective information.

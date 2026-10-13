# Landscape typography audit (#122)

Essential menu copy now uses a 0.8125rem (13px at default root) floor; labels use 0.875rem (14px), actions use 1rem where space allows. Help/privacy use 14px with 1.6 line height. These are readability design targets, not a WCAG pixel-size requirement.

Previously, short-height overrides reduced progress to 9.3px, character descriptions to 9px and character hints to 9.3px. The final cascade restores the same scale at all compact breakpoints. Descriptions wrap instead of truncating. Character cards use one column below 600px, compact portraits, less padding and shorter bilingual guidance. Internal scrolling and sticky actions preserve access to every choice. Buttons and drawer summaries retain 44px minimum height. Left/right fighter controls remain physical, independent of locale.

Audit covers player/mode setup, arena/weapon setup, download gallery, Run/upgrades, settings/help/privacy, pause/results and combat coaching. Deliberate smaller exceptions: decorative arena numbering, progress glyphs, weapon palette indices and nonessential visual badges. Names, mode labels, instructions and primary actions are not exceptions. Selected cards retain checkmarks and borders; focus and reduced-motion styles remain intact.

## Captured before/after

The screenshots show the initial scroll position. Lower content remains available by internal scrolling; sticky actions stay visible. Automated browser checks cover computed font floors, overflow, CTA hit testing, long names, and help at a 20px root in both locales.

| Viewport | English | Persian |
| --- | --- | --- |
| 568x280 | [Before](screenshots/readability/before-568x280-en.png) · [After](screenshots/readability/after-568x280-en.png) | [Before](screenshots/readability/before-568x280-fa.png) · [After](screenshots/readability/after-568x280-fa.png) |
| 568x320 | [Before](screenshots/readability/before-568x320-en.png) · [After](screenshots/readability/after-568x320-en.png) | [Before](screenshots/readability/before-568x320-fa.png) · [After](screenshots/readability/after-568x320-fa.png) |
| 640x320 | [Before](screenshots/readability/before-640x320-en.png) · [After](screenshots/readability/after-640x320-en.png) | [Before](screenshots/readability/before-640x320-fa.png) · [After](screenshots/readability/after-640x320-fa.png) |
| 844x390 | [Before](screenshots/readability/before-844x390-en.png) · [After](screenshots/readability/after-844x390-en.png) | [Before](screenshots/readability/before-844x390-fa.png) · [After](screenshots/readability/after-844x390-fa.png) |

Real Android display-cutout and system-font validation remains a release-device check; the browser suite uses touch-enabled Chromium viewports.

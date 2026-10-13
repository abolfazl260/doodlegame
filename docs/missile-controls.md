# Missile controls (#123)

This decision supersedes the Missile drag-to-aim requirement in #50.

Missile uses the standard Attack action. Touch taps commit on release so canceled gestures never launch; holding does not repeatedly fire. The upward Attack swipe still takes grab priority. Keyboard/mouse and both local players use the same combat attack rules and cooldowns.

Human missiles use the internal 45-degree, power-13 arc, mirrored by physical facing. Shared aim pads and keyboard rotation cannot change this trajectory or turn a Missile-equipped human. AI missile behavior and projectile/explosion/upgrade physics are unchanged. The render state retains the fixed angle for launcher art; there are no adjustable public setters or UI values.

The extra top HUD details row is removed, including its DOM node, text generation, CSS and reserved grid row. Weapon identity stays on the interactive selector. HP, relevant score/status and Pause remain available.

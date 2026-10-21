# Grapple Gun

Grapple Gun is a mobile- and keyboard-compatible utility weapon using the original illustrated SVG gun, flying hook and open-hook assets in `src/assets/weapons/`.

- Choose **Grapple Gun / تفنگ قلاب‌دار** before starting a match (the loadout is locked during a match).
- Use the existing direction pad or keyboard aim and tap **ATTACK** to shoot the hook.
- The hook can latch onto platforms, destructible cover, or an opposing fighter. Reeling starts automatically while movement retains sideways steering for swinging.
- Tap **ATTACK** again to release. The tether also expires automatically after six seconds; missing or leaving the arena cancels it.
- Against fighters, the hook deals 6 initial damage and pulls them towards you. Tanks and bosses resist more.
- The **Long Cable** upgrade extends hook reach from 10 to 13 world units and increases reel speed. No ammo is consumed.

Both `CanvasRenderer` and `ThreeRenderer` display the exact SVG concept art (not independent approximations). Since the hook is a tether rather than an ordinary projectile, it is intentionally simulated separately from bomb/boomerang projectile physics.

Test in Classic, Towers, Fortress, Moving, and local 2-player arenas, including desktop and mobile controls.

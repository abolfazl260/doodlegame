import {test,expect} from "@playwright/test";

test.use({viewport:{width:740,height:360},hasTouch:true,isMobile:true});
test.beforeEach(async({page})=>{
 await page.goto("tests/browser/run-progression.html");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
});

test("five small Mummy outfits integrate with P1/P2 character selection and live rendering",async({page})=>{
 await page.locator('.game-ui__quick-mode[data-quick-mode="local-pvp"]').tap();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="next"]').tap();
 const picker=page.locator(".game-ui__mummy-picker");
 await expect(picker).toBeHidden();
 await page.locator('.game-ui__character-card[data-character="mummy"]').tap();
 await expect(picker).toBeVisible();
 await expect(page.locator(".game-ui__mummy-option")).toHaveCount(5);
 await page.locator('.game-ui__mummy-option[data-mummy-style="royal"]').tap();
 await expect(page.locator('.game-ui__mummy-option[data-mummy-style="royal"]')).toHaveAttribute("aria-pressed","true");
 await page.locator('[data-starting-weapon="blade"]').tap();
 await page.locator(".game-ui__loadout-player-tab").nth(1).tap();
 await expect(picker).toBeHidden();
 await page.locator('.game-ui__character-card[data-character="mummy"]').tap();
 await expect(picker).toBeVisible();
 await expect(page.locator('.game-ui__mummy-option[data-mummy-style="classic"]')).toHaveAttribute("aria-pressed","true");
 await page.locator('.game-ui__mummy-option[data-mummy-style="cursed"]').tap();
 await page.locator('[data-starting-weapon="hammer"]').tap();
 await page.locator(".game-ui__loadout-player-tab").nth(0).tap();
 await expect(page.locator('.game-ui__mummy-option[data-mummy-style="royal"]')).toHaveAttribute("aria-pressed","true");
 await page.locator('button[data-action="start"]').tap();
 expect(await page.evaluate(()=>window.__runFixture.state())).toBe("PLAYING");
 const fighters=await page.evaluate(()=>window.__runFixture.pvpSnapshot());
 expect(fighters.player.characterId).toBe("mummy");
 expect(fighters.opponent.characterId).toBe("mummy");
 expect(fighters.player.mummyStyle).toBe("royal");
 expect(fighters.opponent.mummyStyle).toBe("cursed");
 expect(fighters.player.weapon).toBe("blade");
 expect(fighters.opponent.weapon).toBe("hammer");
});

test("Mummy options are cosmetic and hidden when choosing another fighter",async({page})=>{
 await page.locator('.game-ui__quick-mode[data-quick-mode="local-pvp"]').tap();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('.game-ui__character-card[data-character="mummy"]').tap();
 await expect(page.locator(".game-ui__mummy-picker")).toBeVisible();
 await page.locator('.game-ui__character-card[data-character="ninja"]').tap();
 await expect(page.locator(".game-ui__mummy-picker")).toBeHidden();
 await expect(page.locator(".game-ui__character-card")).toHaveCount(8);
});

import {test,expect} from "@playwright/test";

test.use({viewport:{width:740,height:360},hasTouch:true,isMobile:true});
test.beforeEach(async({page})=>{
 await page.goto("tests/browser/run-progression.html");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
});

test("six Mummy outfits integrate with P1/P2 character selection and live rendering",async({page})=>{
 await page.locator('.game-ui__quick-mode[data-quick-mode="local-pvp"]').tap();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="next"]').tap();
 const picker=page.locator(".game-ui__mummy-picker");
 await expect(picker).toBeHidden();
 await page.locator('.game-ui__character-card[data-character="mummy"]').tap();
 await expect(picker).toBeVisible();
 await expect(page.locator(".game-ui__mummy-option")).toHaveCount(6);
 await page.locator('.game-ui__mummy-option[data-mummy-style="royal"]').tap();
 await expect(page.locator('.game-ui__mummy-option[data-mummy-style="royal"]')).toHaveAttribute("aria-pressed","true");
 await page.locator('[data-starting-weapon="blade"]').tap();
 await page.locator(".game-ui__loadout-player-tab").nth(1).tap();
 await expect(picker).toBeHidden();
 await page.locator('.game-ui__character-card[data-character="mummy"]').tap();
 await expect(picker).toBeVisible();
 await expect(page.locator('.game-ui__mummy-option[data-mummy-style="classic"]')).toHaveAttribute("aria-pressed","true");
 await page.locator('.game-ui__mummy-option[data-mummy-style="sentinel"]').tap();
 await expect(page.locator('.game-ui__mummy-option[data-mummy-style="sentinel"]')).toHaveAttribute("aria-pressed","true");
 await page.locator('[data-starting-weapon="hammer"]').tap();
 await page.locator(".game-ui__loadout-player-tab").nth(0).tap();
 await expect(page.locator('.game-ui__mummy-option[data-mummy-style="royal"]')).toHaveAttribute("aria-pressed","true");
 await page.locator('button[data-action="start"]').tap();
 expect(await page.evaluate(()=>window.__runFixture.state())).toBe("PLAYING");
 const fighters=await page.evaluate(()=>window.__runFixture.pvpSnapshot());
 expect(fighters.player.characterId).toBe("mummy");
 expect(fighters.opponent.characterId).toBe("mummy");
 expect(fighters.player.mummyStyle).toBe("royal");
 expect(fighters.opponent.mummyStyle).toBe("sentinel");
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

test("each Mummy outfit has a weapon-free, unique mini portrait and translated label",async({page})=>{
 await page.locator('.game-ui__quick-mode[data-quick-mode="local-pvp"]').tap();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('.game-ui__character-card[data-character="mummy"]').tap();
 const styles=["classic","royal","cursed","scarab","desert","sentinel"];
 const portraits=[];
 for(const style of styles){
  const button=page.locator('.game-ui__mummy-option[data-mummy-style="'+style+'"]');
  await expect(button).toBeVisible();
  await expect(button.locator("svg")).toHaveCount(1);
  portraits.push(await button.locator("svg").evaluate(el=>el.outerHTML));
  await button.tap();
  await expect(button).toHaveAttribute("aria-pressed","true");
 }
 expect(new Set(portraits).size).toBe(6);
 await page.locator(".game-ui__language button").tap();
 await expect(page.locator('.game-ui__mummy-option[data-mummy-style="sentinel"]')).toContainText(/SENTINEL|نگهبان معبد/);
});

import {test,expect} from "@playwright/test";
test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/run-progression.html?landing=1");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
});
async function loadout(page,route){
 await page.locator('[data-route="'+route+'"]').click();
 await page.locator('[data-action="next"]').click();
 await page.locator('[data-action="next"]').click();
 await expect(page.locator(".game-ui__menu-loadout-panel")).toBeVisible();
}

test("solo: selecting only a weapon confirms the displayed character and enables START",async({page})=>{
 await loadout(page,"custom");
 const start=page.locator('[data-action="start"]');
 await expect(start).toBeVisible();
 await expect(start).toBeDisabled();
 await page.locator('[data-starting-weapon="blade"]').click();
 await expect(start).toBeEnabled();
 const view=await page.evaluate(()=>window.__runFixture.view());
 expect(view.characterChosen).toBe(true);
 expect(view.weaponChosen).toBe(true);
 await start.click();
 await expect(page.locator(".game-ui.playing")).toBeVisible();
});

test("solo: selecting a different weapon enables START and applies the loadout",async({page})=>{
 await loadout(page,"custom");
 await page.locator('[data-starting-weapon="bow"]').click();
 await expect(page.locator('[data-action="start"]')).toBeEnabled();
 await page.locator('[data-action="start"]').click();
 expect((await page.evaluate(()=>window.__runFixture.view())).weapon).toBe("bow");
 await expect(page.locator(".game-ui.playing")).toBeVisible();
});

test("two players: START activates after both choose a weapon",async({page})=>{
 await loadout(page,"local");
 const start=page.locator('[data-action="start"]');
 await page.locator('[data-starting-weapon="bow"]').click();
 await expect(start).toBeDisabled();
 await page.locator(".game-ui__loadout-player-tab").nth(1).click();
 await page.locator('[data-starting-weapon="hammer"]').click();
 await expect(start).toBeEnabled();
 const view=await page.evaluate(()=>window.__runFixture.view());
 expect([view.characterChosen,view.weaponChosen,view.secondCharacterChosen,view.secondWeaponChosen]).toEqual([true,true,true,true]);
 await start.click();
 await expect(page.locator(".game-ui.playing")).toBeVisible();
});

test("random weapons: CHOOSE RANDOM WEAPON enables START",async({page})=>{
 await page.locator('[data-route="custom"]').click();
 await page.locator('[data-mode="random-weapons"]').click();
 await page.locator('[data-action="next"]').click();
 await page.locator('[data-action="next"]').click();
 const start=page.locator('[data-action="start"]');
 await expect(start).toBeDisabled();
 await page.locator(".game-ui__random-loadout").click();
 await expect(start).toBeEnabled();
 await start.click();
 await expect(page.locator(".game-ui.playing")).toBeVisible();
});

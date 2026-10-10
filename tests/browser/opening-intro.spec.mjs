import {test,expect} from "@playwright/test";

test.use({viewport:{width:740,height:360},hasTouch:true,isMobile:true});

const getState=page=>page.evaluate(()=>{
 const f=window.__introFixture;
 return{ambient:f.ambient,active:f.active,signature:f.signature(),red:f.redPixels(),clicks:f.clicks};
});

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/opening-intro.html");
 await page.waitForFunction(()=>Boolean(window.__introFixture));
});

test("skipping the opening leaves a moving space backdrop, two fighters and tappable menu",async({page})=>{
 await page.locator(".opening-intro__skip").tap();
 await expect(page.locator(".opening-intro--ambient")).toHaveCount(1);
 await expect(page.locator(".opening-intro__skip")).toBeHidden();
 await expect(page.locator(".game-ui.menu")).toBeVisible();
 await page.waitForTimeout(2300);
 const first=await getState(page);
 expect(first.ambient).toBe(true);
 expect(first.red).toBeGreaterThan(0);
 await page.waitForTimeout(600);
 const second=await getState(page);
 expect(second.signature).not.toBe(first.signature);
 await page.locator('button[data-action="start"]').tap();
 expect((await getState(page)).clicks).toBe(1);
});

test("gameplay stops the old RAF/canvas and returning to menu restores settled space immediately",async({page})=>{
 await page.locator(".opening-intro__skip").tap();
 await page.evaluate(()=>window.__introFixture.toGameplay());
 await expect(page.locator(".opening-intro")).toHaveCount(0);
 await page.evaluate(()=>window.__introFixture.restore());
 await expect(page.locator(".opening-intro--ambient")).toHaveCount(1);
 const restored=await getState(page);
 expect(restored.active).toBe(true);
 expect(restored.ambient).toBe(true);
 expect(restored.red).toBeGreaterThan(0);
 await expect(page.locator("#ui-root")).not.toHaveClass(/game-ui-intro-revealed/);
 await page.waitForTimeout(300);
 expect((await getState(page)).signature).not.toBe(restored.signature);
});

test("reduced motion keeps a readable static dual-fighter backdrop with no blinking",async({page})=>{
 await page.emulateMedia({reducedMotion:"reduce"});
 await page.reload();
 await page.waitForFunction(()=>Boolean(window.__introFixture));
 await page.locator(".opening-intro__skip").tap();
 const before=await getState(page);
 expect(before.ambient).toBe(true);
 expect(before.red).toBeGreaterThan(0);
 await page.waitForTimeout(300);
 const after=await getState(page);
 expect(after.signature).toBe(before.signature);
 await expect(page.locator(".game-ui.menu")).toBeVisible();
});

test("narrow landscape maintains red-band enemy visibility without blocking menu touches",async({page})=>{
 await page.setViewportSize({width:600,height:320});
 await page.locator(".opening-intro__skip").tap();
 await page.waitForTimeout(2400);
 expect((await getState(page)).red).toBeGreaterThan(0);
 const menu=page.locator('button[data-action="start"]');
 await expect(menu).toBeVisible();
 await menu.tap();
 expect((await getState(page)).clicks).toBe(1);
});

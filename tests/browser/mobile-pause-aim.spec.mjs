import {test,expect} from "@playwright/test";
import {holdPause} from "./hold-pause.mjs";

test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/weapon-picker.html");
 await page.waitForFunction(()=>Boolean(window.__weaponFixture));
 await expect(page.locator(".game-ui.playing")).toBeVisible();
});

test("pause is a subtle centered hold target and opens the resume menu after two seconds",async({page})=>{
 const pause=page.locator(".game-ui__mobile-pause");
 await expect(pause).toBeVisible();
 await expect(pause).toHaveAttribute("aria-label",/توقف|Pause/i);
 const bounds=await pause.boundingBox();
 expect(bounds).toBeTruthy();
 expect(bounds.width).toBeLessThanOrEqual(42);
 expect(bounds.height).toBeLessThanOrEqual(42);
 expect(Math.abs(bounds.x+bounds.width/2-page.viewportSize().width/2)).toBeLessThan(2);
 const opacity=await pause.evaluate(el=>Number(getComputedStyle(el).opacity));
 expect(opacity).toBeLessThan(.6);
 await pause.tap();
 expect(await page.evaluate(()=>window.__weaponFixture.state())).toBe("PLAYING");
 await holdPause(page);
 expect(await page.evaluate(()=>window.__weaponFixture.state())).toBe("PAUSED");
 await expect(pause).toBeHidden();
 const resume=page.locator("button[data-action='resume']");
 await expect(resume).toBeVisible();
 await resume.tap();
 expect(await page.evaluate(()=>window.__weaponFixture.state())).toBe("PLAYING");
 await expect(pause).toBeVisible();
});

test("pause remains hittable with a two-second hold on a small landscape screen",async({page})=>{
 await page.setViewportSize({width:568,height:320});
 const pause=page.locator(".game-ui__mobile-pause");
 await expect(pause).toBeVisible();
 const bounds=await pause.boundingBox();
 expect(bounds.x).toBeGreaterThanOrEqual(0);
 expect(bounds.y).toBeGreaterThanOrEqual(0);
 expect(bounds.x+bounds.width).toBeLessThanOrEqual(568);
 expect(bounds.y+bounds.height).toBeLessThanOrEqual(320);
 const center={x:bounds.x+bounds.width/2,y:bounds.y+bounds.height/2};
 expect(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest(".game-ui__mobile-pause")!==null,center)).toBe(true);
 await holdPause(page);
 expect(await page.evaluate(()=>window.__weaponFixture.state())).toBe("PAUSED");
});

test("missile attack fires once through standard input and has no aim UI",async({page})=>{
 await page.evaluate(()=>window.__weaponFixture.setMode("missile-duel"));
 await expect(page.locator(".game-ui__missile-aim-guide,.game-ui__details")).toHaveCount(0);
 await expect(page.locator('.game-ui__aim-pad[data-player="1"]')).toBeHidden();
 await page.locator(".game-ui__mobile-button--attack").tap();
 await page.evaluate(()=>window.__weaponFixture.tick());expect(await page.evaluate(()=>window.__weaponFixture.projectiles())).toBe(1);
 await page.evaluate(()=>window.__weaponFixture.tick(10));expect(await page.evaluate(()=>window.__weaponFixture.projectiles())).toBe(1);
});

test("touch Pause exposes localized Main Menu and returns to the menu without hardware Back",async({page})=>{
 const pause=page.locator(".game-ui__mobile-pause");
 await holdPause(page);
 const back=page.locator('button[data-action="menu"]');
 await expect(back).toBeVisible();
 await expect(back).toHaveText("منوی اصلی");
 await back.tap();
 expect(await page.evaluate(()=>window.__weaponFixture.state())).toBe("MENU");
 await expect(pause).toBeHidden();
 await expect(back).toBeHidden();
 await page.locator(".game-ui__language button").click();
 await expect(back).toHaveText("MAIN MENU");
});

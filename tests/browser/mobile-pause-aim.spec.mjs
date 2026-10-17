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

test("paused arena dims and blurs behind a readable mobile-first dialog",async({page})=>{
 const scrim=page.locator("#ui-root > .game-ui__pause-scrim");
 await expect(scrim).toBeHidden();
 await holdPause(page);
 const dialog=page.locator(".game-ui.paused");
 await expect(dialog).toBeVisible();
 await expect(dialog).toHaveAttribute("role","dialog");
 await expect(dialog).toHaveAttribute("aria-modal","true");
 await expect(scrim).toBeVisible();
 await expect(page.locator(".game-ui__pause-title")).toHaveText("بازی متوقف شد");
 await expect(page.locator(".game-ui__pause-subtitle")).toBeVisible();
 await expect(page.locator(".game-ui__menu-header")).toBeHidden();
 await expect(page.locator(".game-ui__menu-extras")).toBeHidden();
 await expect(page.locator(".game-ui__menu-setup")).toBeHidden();
 const styles=await scrim.evaluate(node=>{
  const style=getComputedStyle(node);
  return {blur:style.backdropFilter,background:style.backgroundImage,hit:style.pointerEvents};
 });
 expect(styles.blur).toContain("blur(3px)");
 expect(styles.background).toContain("gradient");
 expect(styles.hit).toBe("auto");
 const resume=page.locator('button[data-action="resume"]');
 const restart=page.locator('button[data-action="restart"]');
 const mainMenu=page.locator('button[data-action="menu"]');
 const [r,again,home,panel]=await Promise.all([resume.boundingBox(),restart.boundingBox(),mainMenu.boundingBox(),dialog.boundingBox()]);
 expect(r&&again&&home&&panel).toBeTruthy();
 expect(r.width).toBeGreaterThan(again.width*1.8);
 expect(r.y+r.height).toBeLessThanOrEqual(again.y+3);
 expect(Math.abs(again.y-home.y)).toBeLessThan(3);
 expect(panel.x).toBeGreaterThanOrEqual(0);
 expect(panel.x+panel.width).toBeLessThanOrEqual(844);
 await page.locator(".game-ui__pause-settings").tap();
 await expect(page.locator(".game-ui__help")).toBeVisible();
 await page.locator(".game-ui__dialog-close").first().tap();
 await expect(page.locator(".game-ui__help")).toBeHidden();
 await page.locator(".game-ui__pause-language").tap();
 await expect(page.locator(".game-ui__pause-title")).toHaveText("GAME PAUSED");
 await expect(resume).toHaveText("Resume");
 await resume.tap();
 await expect(scrim).toBeHidden();
 await expect(page.locator(".game-ui__pause-header")).toBeHidden();
 expect(await page.evaluate(()=>window.__weaponFixture.state())).toBe("PLAYING");
});

test("pause overlay remains within a 568 by 320 landscape phone with touch-sized actions",async({page})=>{
 await page.setViewportSize({width:568,height:320});
 await holdPause(page);
 const dialog=page.locator(".game-ui.paused");
 const bounds=await dialog.boundingBox();
 expect(bounds).toBeTruthy();
 expect(bounds.x).toBeGreaterThanOrEqual(0);
 expect(bounds.y).toBeGreaterThanOrEqual(0);
 expect(bounds.x+bounds.width).toBeLessThanOrEqual(568);
 expect(bounds.y+bounds.height).toBeLessThanOrEqual(320);
 for(const action of ["resume","restart","menu"]){
  const button=page.locator('button[data-action="'+action+'"]');
  await expect(button).toBeVisible();
  const rect=await button.boundingBox();
  expect(rect.width).toBeGreaterThan(84);
  expect(rect.height).toBeGreaterThanOrEqual(40);
 }
 await page.locator('button[data-action="menu"]').tap();
 expect(await page.evaluate(()=>window.__weaponFixture.state())).toBe("MENU");
 await expect(page.locator("#ui-root > .game-ui__pause-scrim")).toBeHidden();
 await expect(page.locator(".game-ui__pause-header")).toBeHidden();
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

test("missile shares the touch aim pad; launcher fires in selected direction only once",async({page})=>{
 await page.evaluate(()=>window.__weaponFixture.setMode("missile-duel"));
 await expect(page.locator(".game-ui__missile-aim-guide,.game-ui__details")).toHaveCount(0);
 const pad=page.locator('.game-ui__aim-pad[data-player="1"]');
 await expect(pad).toBeVisible();
 await expect(page.locator('.game-ui__aim-pad[data-player="2"]')).toBeHidden();
 const rect=await pad.boundingBox();
 expect(rect).toBeTruthy();
 // Touch the down/right side of the same aiming pad used by all ranged weapons.
 await page.touchscreen.tap(rect.x+rect.width*.84,rect.y+rect.height*.8);
 const angle=await page.evaluate(()=>window.__weaponFixture.missileAim());
 expect(angle).toBeLessThan(0);
 expect(angle).toBeGreaterThan(-Math.PI/2);
 expect(await page.evaluate(()=>window.__weaponFixture.projectiles())).toBe(0,"aiming must not fire");
 await page.locator(".game-ui__mobile-button--attack").tap();
 await page.evaluate(()=>window.__weaponFixture.tick());
 expect(await page.evaluate(()=>window.__weaponFixture.projectiles())).toBe(1);
 const shot=await page.evaluate(()=>window.__weaponFixture.missileShot());
 expect(shot).toBeTruthy();
 expect(shot.vx).toBeGreaterThan(0);
 expect(shot.vy).toBeLessThan(0);
 await page.evaluate(()=>window.__weaponFixture.tick(10));
 expect(await page.evaluate(()=>window.__weaponFixture.projectiles())).toBeLessThanOrEqual(1);
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

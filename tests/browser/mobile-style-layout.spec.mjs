import {test,expect} from "@playwright/test";
import {holdPause} from "./hold-pause.mjs";

test.use({viewport:{width:568,height:320},hasTouch:true,isMobile:true});

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/weapon-picker.html");
 await page.waitForFunction(()=>Boolean(window.__weaponFixture));
 await expect(page.locator(".game-ui.playing")).toBeVisible();
});

test("health bars flank the status without an extra weapon details row",async({page})=>{
 for(const mode of ["duel","king-of-hill","missile-duel"]){
  await page.evaluate(mode=>window.__weaponFixture.setMode(mode),mode);
  const rects=await page.evaluate(()=>{
   const rect=selector=>{
    const r=document.querySelector(selector).getBoundingClientRect();
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
   };
   return {
    left:rect(".health-bar--player"),right:rect(".health-bar--opponent"),
    status:rect(".game-ui__status"),
    top:rect(".game-ui__top-hud")
   };
  });
  expect(rects.left.right).toBeLessThanOrEqual(rects.status.left+1);
  expect(rects.status.right).toBeLessThanOrEqual(rects.right.left+1);
  expect(rects.left.height).toBeGreaterThanOrEqual(30);
  expect(rects.right.height).toBeGreaterThanOrEqual(30);
 }
 // A language switch must not reverse the physical player/opponent slots.
 await page.evaluate(()=>document.querySelector(".game-ui__language button").click());
 const positions=await page.evaluate(()=>({
  direction:document.documentElement.dir,
  player:document.querySelector(".health-bar--player").getBoundingClientRect().left,
  opponent:document.querySelector(".health-bar--opponent").getBoundingClientRect().left
 }));
 expect(positions.direction).toBe("ltr");
 expect(positions.player).toBeLessThan(positions.opponent);
 const health=page.locator(".health-label__current").first();
 await expect(health).toHaveCSS("color","rgb(255, 255, 255)");
 await expect(health).toHaveCSS("background-color","rgb(7, 11, 23)");
 const r=await health.boundingBox(),bar=await page.locator(".health-bar--player").boundingBox();
 expect(r.y).toBeGreaterThanOrEqual(bar.y);
 expect(r.y+r.height).toBeLessThanOrEqual(bar.y+bar.height+1);
});

test("short-screen Missile attack has no aim guide and Pause stays separate",async({page})=>{
 await page.setViewportSize({width:568,height:260});await page.evaluate(()=>window.__weaponFixture.setMode("missile-duel"));
 await expect(page.locator(".game-ui__missile-aim-guide")).toHaveCount(0);
 const pause=await page.locator(".game-ui__mobile-pause").boundingBox(),attack=await page.locator(".game-ui__mobile-button--attack").boundingBox();
 expect(pause.x+pause.width).toBeLessThan(attack.x);await expect(page.locator(".game-ui__mobile-button--attack")).toBeVisible();
});

test("short landscape menu scrolls internally and keeps Resume tappable",async({page})=>{
 await page.setViewportSize({width:568,height:280});
 await holdPause(page);
 const menu=page.locator(".game-ui__menu"),resume=page.locator('button[data-action="resume"]');
 await expect(resume).toBeVisible();
 await page.locator(".game-ui__menu-extras summary").tap();
 const measurements=await page.evaluate(()=>{
  const menu=document.querySelector(".game-ui__menu");
  const links=document.querySelector(".game-ui__menu-links");
  links.style.minHeight="640px";
  const before=menu.scrollTop;
  menu.scrollTop=220;
  return {
   before,after:menu.scrollTop,scrollHeight:menu.scrollHeight,clientHeight:menu.clientHeight,
   touchAction:getComputedStyle(menu).touchAction,
   bodyTouchAction:getComputedStyle(document.body).touchAction
  };
 });
 expect(measurements.scrollHeight).toBeGreaterThan(measurements.clientHeight);
 expect(measurements.after).toBeGreaterThan(measurements.before);
 expect(measurements.touchAction).toBe("pan-y");
 expect(measurements.bodyTouchAction).toBe("pan-y");
 await expect(resume).toBeInViewport();
 await resume.tap();
 expect(await page.evaluate(()=>window.__weaponFixture.state())).toBe("PLAYING");
});

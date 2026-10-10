import {test,expect} from "@playwright/test";

test.use({viewport:{width:568,height:320},hasTouch:true,isMobile:true});

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/weapon-picker.html");
 await page.waitForFunction(()=>Boolean(window.__weaponFixture));
 await expect(page.locator(".game-ui.playing")).toBeVisible();
});

test("health bars flank the status, and long weapon details occupy their own row",async({page})=>{
 for(const mode of ["duel","king-of-hill","missile-duel"]){
  await page.evaluate(mode=>window.__weaponFixture.setMode(mode),mode);
  const rects=await page.evaluate(()=>{
   const rect=selector=>{
    const r=document.querySelector(selector).getBoundingClientRect();
    return {left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};
   };
   return {
    left:rect(".health-bar--player"),right:rect(".health-bar--opponent"),
    status:rect(".game-ui__status"),details:rect(".game-ui__details"),
    top:rect(".game-ui__top-hud"),
    computed:[...document.querySelectorAll(".game-ui__top-hud > *")].map(el=>({tag:el.tagName,cls:el.className,display:getComputedStyle(el).display,position:getComputedStyle(el).position,gridColumn:getComputedStyle(el).gridColumn,gridRow:getComputedStyle(el).gridRow,width:getComputedStyle(el).width}))
   };
  });
  expect(rects.left.right,JSON.stringify(rects)).toBeLessThanOrEqual(rects.status.left+1);
  expect(rects.status.right).toBeLessThanOrEqual(rects.right.left+1);
  expect(rects.details.top).toBeGreaterThanOrEqual(Math.max(rects.left.bottom,rects.right.bottom)-1);
  expect(rects.details.right).toBeLessThanOrEqual(568);
  expect(rects.left.height).toBeGreaterThanOrEqual(30);
  expect(rects.right.height).toBeGreaterThanOrEqual(30);
 }
 const health=page.locator(".health-label__current").first();
 await expect(health).toHaveCSS("color","rgb(255, 255, 255)");
 await expect(health).toHaveCSS("background-color","rgb(7, 11, 23)");
 const r=await health.boundingBox(),bar=await page.locator(".health-bar--player").boundingBox();
 expect(r.y).toBeGreaterThanOrEqual(bar.y);
 expect(r.y+r.height).toBeLessThanOrEqual(bar.y+bar.height+1);
});

test("short-screen Pause layout cannot cover the visible missile aim guide",async({page})=>{
 await page.setViewportSize({width:568,height:260});
 await page.evaluate(()=>window.__weaponFixture.setMode("missile-duel"));
 const attack=page.locator(".game-ui__mobile-button--attack");
 const a=await attack.boundingBox();
 await page.mouse.move(a.x+a.width/2,a.y+a.height/2);
 await page.mouse.down();
 try{
  const guide=page.locator(".game-ui__missile-aim-guide");
  await expect(guide).toBeVisible();
  const p=await page.locator(".game-ui__mobile-pause").boundingBox(),g=await guide.boundingBox();
  expect(p).toBeTruthy();expect(g).toBeTruthy();
  expect(p.x+p.width).toBeLessThanOrEqual(g.x+1);
 }finally{await page.mouse.up();}
});

test("short landscape menu scrolls internally and keeps Resume tappable",async({page})=>{
 await page.setViewportSize({width:568,height:280});
 await page.locator(".game-ui__mobile-pause").tap();
 const menu=page.locator(".game-ui__menu"),resume=page.locator('button[data-action="resume"]');
 await expect(resume).toBeVisible();
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

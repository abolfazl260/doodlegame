import {test,expect} from "@playwright/test";

test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/weapon-picker.html");
 await page.waitForFunction(()=>Boolean(window.__weaponFixture));
 await expect(page.locator(".game-ui.playing")).toBeVisible();
});

test("mobile pause is a 48px touch target below health and opens the resume menu",async({page})=>{
 const pause=page.locator(".game-ui__mobile-pause");
 await expect(pause).toBeVisible();
 await expect(pause).toHaveAttribute("aria-label",/توقف|Pause/i);
 const bounds=await pause.boundingBox();
 const rightHealth=await page.locator(".health-bar--opponent").boundingBox();
 expect(bounds).toBeTruthy();
 expect(bounds.width).toBeGreaterThanOrEqual(48);
 expect(bounds.height).toBeGreaterThanOrEqual(48);
 expect(bounds.y).toBeGreaterThanOrEqual(rightHealth.y+rightHealth.height);
 await pause.tap();
 expect(await page.evaluate(()=>window.__weaponFixture.state())).toBe("PAUSED");
 await expect(pause).toBeHidden();
 const resume=page.locator("button[data-action='resume']");
 await expect(resume).toBeVisible();
 await resume.tap();
 expect(await page.evaluate(()=>window.__weaponFixture.state())).toBe("PLAYING");
 await expect(pause).toBeVisible();
});

test("pause remains fully tappable on a small landscape screen",async({page})=>{
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
 await pause.tap();
 expect(await page.evaluate(()=>window.__weaponFixture.state())).toBe("PAUSED");
});

test("missile preview mirrors when the fighter faces left during a held aim",async({page})=>{
 await page.evaluate(()=>window.__weaponFixture.setMode("missile-duel"));
 const attack=page.locator(".game-ui__mobile-button--attack");
 const rect=await attack.boundingBox();
 expect(rect).toBeTruthy();
 await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height/2);
 await page.mouse.down();
 try{
  await expect(page.locator(".game-ui__missile-aim-guide")).toBeVisible();
  const path=page.locator(".game-ui__missile-aim-guide path");
  const direction=async()=>{
   const d=await path.getAttribute("d");
   const xs=[...d.matchAll(/[ML]([0-9.]+) ([0-9.]+)/g)].map(m=>Number(m[1]));
   return Math.sign(xs.at(-1)-xs[0]);
  };
  expect(await direction()).toBe(1);
  await page.evaluate(()=>window.__weaponFixture.setFacing(-1));
  expect(await page.evaluate(()=>window.__weaponFixture.facing())).toBe(-1);
  expect(await direction()).toBe(-1);
  await page.evaluate(()=>window.__weaponFixture.setFacing(1));
  expect(await direction()).toBe(1);
 }finally{await page.mouse.up();}
 await expect(page.locator(".game-ui__missile-aim-guide")).toBeHidden();
});

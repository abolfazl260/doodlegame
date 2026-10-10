import {test,expect} from "@playwright/test";

test.use({viewport:{width:740,height:360},hasTouch:true,isMobile:true});

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/run-progression.html");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 await page.evaluate(()=>window.__runFixture.startBowDuel());
 await expect(page.locator(".game-ui.playing")).toBeVisible();
});

const snapshot=page=>page.evaluate(()=>window.__runFixture.combatSnapshot());

test("held Bow charge is discarded by Game.pause even without a DOM input reset",async({page})=>{
 await page.evaluate(()=>window.__runFixture.beginBowCharge());
 const charging=await snapshot(page);
 expect(charging.bowCharging).toBe(true);
 expect(charging.bowCharge).toBeGreaterThan(0);
 expect(charging.arrows).toBe(0);
 await page.evaluate(()=>window.__runFixture.pauseDirect());
 const stopped=await snapshot(page);
 expect(stopped.state).toBe("PAUSED");
 expect(stopped.bowCharging).toBe(false);
 expect(stopped.bowCharge).toBe(0);
 expect(stopped.attackTime).toBe(0);
 expect(stopped.cooldown).toBe(0);
 await page.evaluate(()=>{
  window.__runFixture.releaseStaleInput();
  window.__runFixture.resumeDirect();
  window.__runFixture.nextFrame();
 });
 const after=await snapshot(page);
 expect(after.arrows).toBe(0);
 expect(after.cooldown).toBe(0);
 expect(after.playerHealth).toBe(charging.playerHealth);
 expect(after.opponentHealth).toBe(charging.opponentHealth);
});

test("background and foreground transition cancels Bow attack and a subsequent real release still fires",async({page})=>{
 await page.evaluate(()=>window.__runFixture.beginBowCharge());
 await page.evaluate(()=>window.__runFixture.pauseFromBackground());
 expect((await snapshot(page)).bowCharging).toBe(false);
 await page.evaluate(()=>{
  window.__runFixture.resumeFromBackground();
  window.__runFixture.nextFrame();
 });
 expect((await snapshot(page)).arrows).toBe(0);
 await page.evaluate(()=>window.__runFixture.beginBowCharge());
 expect((await snapshot(page)).bowCharge).toBeGreaterThan(0);
 await page.evaluate(()=>window.__runFixture.releaseBow());
 const released=await snapshot(page);
 expect(released.arrows).toBe(1);
 expect(released.bowCharging).toBe(false);
 expect(released.bowCharge).toBe(0);
 expect(released.cooldown).toBeGreaterThan(0);
});

test("mobile Pause button cancels charging and hides outside PLAYING",async({page})=>{
 const pause=page.locator(".game-ui__mobile-pause");
 await expect(pause).toBeVisible();
 await expect(pause).toHaveAttribute("aria-label",/توقف|Pause/i);
 await page.evaluate(()=>window.__runFixture.beginBowCharge());
 await pause.tap();
 expect((await snapshot(page)).state).toBe("PAUSED");
 expect((await snapshot(page)).bowCharge).toBe(0);
 await expect(pause).toBeHidden();
 await page.locator('button[data-action="resume"]').tap();
 await expect(pause).toBeVisible();
 await page.evaluate(()=>window.__runFixture.nextFrame());
 expect((await snapshot(page)).arrows).toBe(0);
 await page.evaluate(()=>window.__runFixture.stopFight());
 await expect(pause).toBeHidden();
});

test("rapid pause and restart does not retain charge, arrows, or pressed attack state",async({page})=>{
 await page.evaluate(()=>window.__runFixture.beginBowCharge());
 await page.evaluate(()=>{
  window.__runFixture.pauseDirect();
  window.__runFixture.restartFight();
  window.__runFixture.nextFrame();
 });
 const restarted=await snapshot(page);
 expect(restarted.state).toBe("PLAYING");
 expect(restarted.weapon).toBe("bow");
 expect(restarted.bowCharge).toBe(0);
 expect(restarted.bowCharging).toBe(false);
 expect(restarted.arrows).toBe(0);
 expect(restarted.cooldown).toBe(0);
 await page.evaluate(()=>window.__runFixture.beginBowCharge());
 await page.evaluate(()=>window.__runFixture.releaseBow());
 expect((await snapshot(page)).arrows).toBe(1);
});

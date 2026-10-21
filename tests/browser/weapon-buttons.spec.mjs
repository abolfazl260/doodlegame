import {startMatch} from "./setup.mjs";
import {test,expect} from "@playwright/test";
const toggle=".game-ui__mobile-weapon-switcher .game-ui__weapon-toggle";
const selected=page=>page.evaluate(()=>window.__weaponFixture.selected());
const changeMode=(page,mode)=>page.evaluate(m=>window.__weaponFixture.setMode(m),mode);
const changeArena=(page,arena)=>page.evaluate(a=>window.__weaponFixture.setArena(a),arena);
for(const id of ["hammer","blaster","uzi","boomerang","bow","bomb","missile","spear","grapple","blade"]){
 test(`starting ${id} stays locked during offline combat`,async({page})=>{
  await page.setViewportSize({width:1280,height:720});
  await page.goto("tests/browser/run-progression.html");
  await startMatch(page,id);
  expect(await page.evaluate(()=>window.__runFixture.view().weapon)).toBe(id);
  await expect(page.locator(toggle)).toBeHidden();
  await page.keyboard.press("e");
  await page.evaluate(()=>window.__runFixture.nextFrame());
  expect(await page.evaluate(()=>window.__runFixture.view().weapon)).toBe(id);
  expect(await page.evaluate(()=>window.__runFixture.pvpSnapshot().p1Input.attackHeld)).toBe(false);
 });
}

test.describe("offline combat controls",()=>{
test.beforeEach(async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 await page.goto("tests/browser/weapon-picker.html");
 await page.waitForFunction(()=>Boolean(window.__weaponFixture));
});
test("Escape does not reveal a palette or fire an attack",async({page})=>{
 await page.keyboard.press("Escape");
 await expect(page.locator(toggle)).toBeHidden();
 await expect(page.locator(".game-ui__weapon-list")).toBeHidden();
 expect(await page.evaluate(()=>window.__weaponFixture.attackPressed())).toBe(false);
});
test("melee-only keeps its default weapon and hides manual combat selection",async({page})=>{
 await changeMode(page,"melee-only");
 await expect(page.locator(toggle)).toBeHidden();
 expect(await selected(page)).toBe("blade");
});
test("Missile Duel and Fortress both hide the offline combat palette",async({page})=>{
 await changeMode(page,"missile-duel");expect(await selected(page)).toBe("missile");await expect(page.locator(toggle)).toBeHidden();
 await changeMode(page,"duel");await changeArena(page,"fortress");expect(await selected(page)).toBe("blade");
 await expect(page.locator(toggle)).toBeHidden();
 await expect(page.locator(".game-ui__weapon-list")).toBeHidden();
});
test("random weapons disables manual selection",async({page})=>{
 await changeMode(page,"random-weapons");await expect(page.locator(toggle)).toBeHidden();await expect(page.locator(".game-ui__weapon-list")).toBeHidden();
});
test("direction pad aims without moving or firing",async({page})=>{
 await page.evaluate(()=>window.__weaponFixture.setWeapon("blaster"));
 const pad=await page.locator('.game-ui__aim-pad[data-player="1"]').boundingBox();
 await page.mouse.move(pad.x+pad.width/2,pad.y+pad.height/2);await page.mouse.down();await page.mouse.move(pad.x+pad.width,pad.y);await page.mouse.up();
 expect(await page.evaluate(()=>window.__weaponFixture.projectiles())).toBe(0);
 expect(await page.evaluate(()=>window.__weaponFixture.moveX())).toBe(0);
 expect(await page.evaluate(()=>window.__weaponFixture.attackHeld())).toBe(false);
});

test("mouse release over a blocking overlay still ends the captured canvas attack",async({page})=>{
 const canvas=await page.locator("#game-canvas").boundingBox();
 expect(canvas).toBeTruthy();
 const x=canvas.x+50,y=canvas.y+canvas.height/2;
 await page.mouse.move(x,y);
 await page.mouse.down();
 expect(await page.evaluate(()=>window.__weaponFixture.pointerDown())).toBe(true);
 expect(await page.evaluate(()=>window.__weaponFixture.attackHeld())).toBe(true);
 await page.evaluate(()=>{
  const overlay=document.createElement("div");
  overlay.id="pointer-interception-test";
  Object.assign(overlay.style,{position:"fixed",inset:"0",zIndex:"99999",pointerEvents:"auto"});
  document.body.append(overlay);
 });
 try{
  await page.mouse.move(x+120,y+50);
  await page.mouse.up();
  expect(await page.evaluate(()=>window.__weaponFixture.pointerDown())).toBe(false);
  expect(await page.evaluate(()=>window.__weaponFixture.attackHeld())).toBe(false);
 }finally{
  await page.evaluate(()=>document.querySelector("#pointer-interception-test")?.remove());
 }
});

});

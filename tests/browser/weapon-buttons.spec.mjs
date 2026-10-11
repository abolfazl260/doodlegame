import {test,expect} from "@playwright/test";
const button=id=>`.game-ui.playing .game-ui__weapon-list button[data-weapon="${id}"]`;
const toggle=".game-ui__mobile-weapon-switcher .game-ui__weapon-toggle";
const selected=page=>page.evaluate(()=>window.__weaponFixture.selected());
const changeMode=(page,mode)=>page.evaluate(m=>window.__weaponFixture.setMode(m),mode);
const changeArena=(page,arena)=>page.evaluate(a=>window.__weaponFixture.setArena(a),arena);
test.beforeEach(async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 await page.goto("tests/browser/weapon-picker.html");
 await page.waitForFunction(()=>Boolean(window.__weaponFixture));
});
test("one weapon button opens a palette and closes after choosing",async({page})=>{
 await expect(page.locator(toggle)).toBeVisible();
 await expect(page.locator(".game-ui__weapon-list")).toBeHidden();
 for(const id of ["hammer","blaster","uzi","boomerang","bow","bomb","missile","blade"]){
  await page.locator(toggle).click();await expect(page.locator(button(id))).toBeEnabled();
  await page.evaluate(()=>window.__weaponFixture.clearAttack());
  await page.locator(button(id)).click();expect(await selected(page)).toBe(id);
  await expect(page.locator(".game-ui__weapon-list")).toBeHidden();
  expect(await page.evaluate(()=>window.__weaponFixture.attackPressed())).toBe(false);
 }
});
test("palette closes with its button or Escape without firing",async({page})=>{
 await page.locator(toggle).click();await page.locator(toggle).click();
 await expect(page.locator(".game-ui__weapon-list")).toBeHidden();
 await page.locator(toggle).click();await page.keyboard.press("Escape");
 await expect(page.locator(".game-ui__weapon-list")).toBeHidden();
 expect(await page.evaluate(()=>window.__weaponFixture.attackPressed())).toBe(false);
});
test("melee-only excludes ranged weapons",async({page})=>{
 await changeMode(page,"melee-only");await page.locator(toggle).click();
 for(const id of ["blaster","uzi","boomerang","bow","bomb","missile"]){await expect(page.locator(button(id))).toBeHidden();await expect(page.locator(button(id))).toBeDisabled();}
 await page.locator(button("hammer")).click();expect(await selected(page)).toBe("hammer");
});
test("Missile Duel locks the weapon; Fortress allows all standard weapons",async({page})=>{
 await changeMode(page,"missile-duel");expect(await selected(page)).toBe("missile");await expect(page.locator(toggle)).toBeHidden();
 await changeMode(page,"duel");await changeArena(page,"fortress");expect(await selected(page)).toBe("blade");
 await page.locator(toggle).click();await page.locator(button("missile")).click();expect(await selected(page)).toBe("missile");
 await page.locator(toggle).click();await page.locator(button("bow")).click();expect(await selected(page)).toBe("bow");
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

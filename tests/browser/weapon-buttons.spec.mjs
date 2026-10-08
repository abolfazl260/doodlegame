import {test,expect} from "@playwright/test";

const button=id=>`.game-ui.playing .game-ui__weapon-list button[data-weapon="${id}"]`;
const selected=page=>page.evaluate(()=>window.__weaponFixture.selected());
const changeMode=(page,mode)=>page.evaluate(m=>window.__weaponFixture.setMode(m),mode);
const changeArena=(page,arena)=>page.evaluate(a=>window.__weaponFixture.setArena(a),arena);

test.beforeEach(async({page})=>{
 await page.setViewportSize({width:1280,height:720});
 await page.goto("tests/browser/weapon-picker.html");
 await page.waitForFunction(()=>Boolean(window.__weaponFixture));
 await expect(page.locator(".game-ui.playing")).toBeVisible();
});

test("visible desktop weapon buttons receive native mouse clicks and equip the selected weapon",async({page})=>{
 const bar=page.locator(".game-ui.playing .game-ui__weapon-list");
 await expect(bar).toHaveCSS("pointer-events","none");
 for(const id of ["hammer","blaster","uzi","boomerang","bow","bomb","blade"]){
  const target=page.locator(button(id));
  await expect(target).toBeVisible();
  await expect(target).toBeEnabled();
  await expect(target).toHaveCSS("pointer-events","auto");
  await page.evaluate(()=>window.__weaponFixture.clearAttack());
  // Playwright performs genuine Chromium pointer hit testing; a CSS-only check would miss the regression.
  await target.click({timeout:2000});
  expect(await selected(page)).toBe(id);
  await expect(target).toHaveClass(/active/);
  expect(await page.evaluate(()=>window.__weaponFixture.attackPressed())).toBe(false);
 }
 await expect(page.locator(button("missile"))).toBeHidden();
});

test("weapon-bar gaps and the battlefield remain click-through to WebInput",async({page})=>{
 const list=page.locator(".game-ui.playing .game-ui__weapon-list");
 const first=page.locator(button("blade")),second=page.locator(button("hammer"));
 const a=await first.boundingBox(),b=await second.boundingBox();
 expect(a).toBeTruthy();expect(b).toBeTruthy();
 expect(b.x).toBeGreaterThan(a.x+a.width);
 const gapX=(a.x+a.width+b.x)/2,gapY=a.y+a.height/2;
 const underGap=await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,{x:gapX,y:gapY});
 expect(underGap).toBe("game-canvas");
 await page.mouse.click(gapX,gapY);
 expect(await page.evaluate(()=>window.__weaponFixture.attackPressed())).toBe(true);
 await page.evaluate(()=>window.__weaponFixture.clearAttack());
 const battlefield=await page.locator("#game-canvas").boundingBox();
 await page.mouse.click(battlefield.x+50,battlefield.y+battlefield.height/2);
 expect(await page.evaluate(()=>window.__weaponFixture.attackPressed())).toBe(true);
 expect(await selected(page)).toBe("blade");
 await expect(list).toHaveCSS("pointer-events","none");
});

test("melee-only hides and disables ranged weapons while the two melee buttons remain clickable",async({page})=>{
 await changeMode(page,"melee-only");
 for(const id of ["blade","hammer"]){
  await expect(page.locator(button(id))).toBeVisible();
  await page.locator(button(id)).click();
  expect(await selected(page)).toBe(id);
 }
 for(const id of ["blaster","uzi","boomerang","bow","bomb","missile"]){
  await expect(page.locator(button(id))).toBeHidden();
  await expect(page.locator(button(id))).toBeDisabled();
  await page.locator(button(id)).evaluate(el=>el.click());
  expect(await selected(page)).toBe("hammer");
 }
});

test("missile-duel and Fortress duel restrict all other weapons",async({page})=>{
 await changeMode(page,"missile-duel");
 await expect(page.locator(".game-ui.playing .game-ui__weapon-list")).toBeHidden();
 expect(await selected(page)).toBe("missile");
 for(const id of ["blade","hammer","blaster","uzi","boomerang","bow","bomb"]){
  await expect(page.locator(button(id))).toBeDisabled();
  await page.locator(button(id)).evaluate(el=>el.click());
  expect(await selected(page)).toBe("missile");
 }
 await changeMode(page,"duel");
 await changeArena(page,"fortress");
 expect(await selected(page)).toBe("missile");
 await expect(page.locator(button("missile"))).toBeVisible();
 await expect(page.locator(button("missile"))).toBeEnabled();
 await page.locator(button("missile")).click();
 expect(await selected(page)).toBe("missile");
 await expect(page.locator(button("blade"))).toBeDisabled();
});

test("random-weapons permits no manual weapon changes",async({page})=>{
 await changeMode(page,"random-weapons");
 const weapon=await selected(page);
 const visible=page.locator(".game-ui.playing .game-ui__weapon-list button:visible");
 await expect(visible).toHaveCount(1);
 await expect(visible).toBeDisabled();
 await visible.evaluate(el=>el.click());
 expect(await selected(page)).toBe(weapon);
 await expect(page.locator(button("missile"))).toBeDisabled();
 for(const id of ["blade","hammer","blaster","uzi","boomerang","bow","bomb"].filter(x=>x!==weapon)){
  await expect(page.locator(button(id))).toBeHidden();
 }
});

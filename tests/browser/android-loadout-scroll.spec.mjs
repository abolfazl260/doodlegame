import {test,expect} from "@playwright/test";

test.use({viewport:{width:568,height:280},hasTouch:true,isMobile:true});

async function reachLoadout(page,language){
 await page.goto("tests/browser/run-progression.html?landing=1");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 if(language==="en")await page.locator(".game-ui__language button").tap();
 await page.locator('[data-route="custom"]').tap();
 await page.locator('[data-action="next"]').tap();
 await page.locator('[data-action="next"]').tap();
 await expect(page.locator(".game-ui__menu-loadout-panel")).toBeVisible();
 await expect(page.locator(".game-ui__character-card")).toHaveCount(8);
 await expect(page.locator("[data-starting-weapon]")).toHaveCount(11);
}

async function swipeUp(page,selector){
 const target=page.locator(selector);
 const rect=await target.boundingBox();
 expect(rect).not.toBeNull();
 const x=rect.x+rect.width*.5,from=rect.y+rect.height*.82,to=rect.y+rect.height*.18;
 const client=await page.context().newCDPSession(page);
 try{
  await client.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y:from}]});
  for(let i=1;i<=8;i++){
   await client.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{x,y:from+(to-from)*i/8}]});
  }
  await client.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
 }finally{await client.detach();}
}

for(const language of ["fa","en"]){
 test(`Android ${language}: both character and weapon grids pan vertically and final choices remain selectable`,async({page})=>{
  await reachLoadout(page,language);
  const first=await page.evaluate(()=>{
   const ch=document.querySelector(".game-ui__character-cards");
   const we=document.querySelector(".game-ui__weapon-grid");
   const menu=document.querySelector(".game-ui__menu");
   return {ch:ch.scrollHeight>ch.clientHeight,weapon:we.scrollHeight>we.clientHeight,
    characterTouch:getComputedStyle(ch).touchAction,weaponTouch:getComputedStyle(we).touchAction,
    menuTouch:getComputedStyle(menu).touchAction};
  });
  expect(first.ch).toBe(true);
  expect(first.weapon).toBe(true);
  expect(first.characterTouch).toBe("pan-y");
  expect(first.weaponTouch).toBe("pan-y");
  expect(first.menuTouch).toBe("pan-y");
  await swipeUp(page,".game-ui__character-cards");
  await expect.poll(()=>page.locator(".game-ui__character-cards").evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  await page.locator(".game-ui__character-card").last().tap();
  await expect(page.locator(".game-ui__character-card").last()).toHaveAttribute("aria-pressed","true");
  // If opening Mummy cosmetics expands the wizard, the weapon list must still be scrollable.
  await page.locator(".game-ui__character-card[data-character='mummy']").tap();
  await expect(page.locator(".game-ui__mummy-options")).toBeVisible();
  await page.locator(".game-ui__weapon-grid").evaluate(el=>{el.scrollTop=0;});
  await swipeUp(page,".game-ui__weapon-grid");
  await expect.poll(()=>page.locator(".game-ui__weapon-grid").evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
  const last=page.locator("[data-starting-weapon]").last();
  await last.tap();
  await expect(last).toHaveAttribute("aria-pressed","true");
  await expect(page.locator('[data-action="start"]')).toBeEnabled();
  await page.locator('[data-action="start"]').tap();
  await expect(page.locator(".game-ui.playing")).toBeVisible();
  expect(await page.evaluate(()=>window.__runFixture.state())).toBe("PLAYING");
 });
}

test("Android portrait: setup retains touch panning and accessible character/weapon options",async({page})=>{
 await page.setViewportSize({width:360,height:740});
 await reachLoadout(page,"fa");
 for(const selector of [".game-ui__character-cards",".game-ui__weapon-grid"]){
  const state=await page.locator(selector).evaluate(el=>({
   overflowY:getComputedStyle(el).overflowY,touchAction:getComputedStyle(el).touchAction,
   count:el.children.length,tabIndex:el.tabIndex
  }));
  expect(state.overflowY).toBe("auto");
  expect(state.touchAction).toBe("pan-y");
  expect(state.tabIndex).toBe(0);
  expect(state.count).toBeGreaterThanOrEqual(8);
 }
 await page.locator('[data-starting-weapon="gravity-gauntlet"]').tap();
 await expect(page.locator('[data-action="start"]')).toBeEnabled();
});

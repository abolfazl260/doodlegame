import {test,expect} from "@playwright/test";

test.use({hasTouch:true,isMobile:true});

async function enterLoadout(page,route="custom",language="fa"){
 await page.goto("tests/browser/run-progression.html?landing=1");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 if(language==="en")await page.locator(".game-ui__language button").tap();
 await page.locator('[data-route="'+route+'"]').tap();
 await page.locator('[data-action="next"]').tap();
 await page.locator('[data-action="next"]').tap();
 await expect(page.locator(".game-ui__menu-loadout-panel")).toBeVisible();
 await expect(page.locator(".game-ui")).toHaveAttribute("data-setup-step","loadout");
}

async function scrollMetrics(page){
 return page.evaluate(()=>{
  const content=document.querySelector(".game-ui__menu-setup");
  const menu=document.querySelector(".game-ui__menu");
  const footer=document.querySelector(".game-ui__controls");
  if(!content||!menu||!footer)throw Error("Missing equipment scroll surface");
  return {
   scrollTop:content.scrollTop,clientHeight:content.clientHeight,scrollHeight:content.scrollHeight,
   contentOverflow:getComputedStyle(content).overflowY,
   contentTouchAction:getComputedStyle(content).touchAction,
   menuTouchAction:getComputedStyle(menu).touchAction,
   bodyTouchAction:getComputedStyle(document.body).touchAction,
   footerVisible:!footer.hidden
  };
 });
}

async function swipe(page,box,vertical){
 // Dispatch DOM touch events so this verifies the manual drag path, not only
 // browser-native scrolling that can fail after Android's 90-degree rotation.
 const session=await page.context().newCDPSession(page);
 const x=Math.round(box.x+box.width*(vertical?.5:.2));
 const y=Math.round(box.y+box.height*(vertical?.78:.5));
 const distance=Math.min(vertical?170:155,Math.round((vertical?box.height:box.width)*.58));
 try{
  await session.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,id:1}]});
  for(let i=1;i<=10;i++){
   await session.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{
    x:x+(vertical?0:Math.round(distance*i/10)),
    y:y-(vertical?Math.round(distance*i/10):0),id:1
   }]});
   await page.waitForTimeout(16);
  }
  await session.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
 }finally{await session.detach();}
}

for(const language of ["fa","en"]){
 test(`Android ${language}: short-landscape loadout can be swiped and the last weapon can start a match`,async({page})=>{
  await page.setViewportSize({width:844,height:390});
  await enterLoadout(page,"custom",language);
  const content=page.locator(".game-ui__menu-setup");
  const before=await scrollMetrics(page);
  expect(before.clientHeight).toBeGreaterThan(60);
  expect(before.scrollHeight).toBeGreaterThan(before.clientHeight+160);
  expect(before.contentOverflow).toBe("auto");
  expect(before.contentTouchAction).toBe("none");
  expect(before.menuTouchAction).toBe("auto");
  expect(before.bodyTouchAction).toBe("auto");
  await expect(page.locator(".game-ui__loadout-scroll-hint")).toContainText(language==="fa"?/بکشید/:/Swipe/);
  await swipe(page,await content.boundingBox(),true);
  await expect.poll(async()=>(await scrollMetrics(page)).scrollTop).toBeGreaterThan(20);

  const lastCharacter=page.locator(".game-ui__character-card").last();
  await lastCharacter.tap();
  await expect(lastCharacter).toHaveAttribute("aria-pressed","true");
  await page.locator('.game-ui__character-card[data-character="mummy"]').tap();
  await expect(page.locator(".game-ui__mummy-picker")).toBeVisible();

  const lastWeapon=page.locator('[data-starting-weapon="gravity-gauntlet"]');
  await lastWeapon.tap();
  await expect(lastWeapon).toHaveAttribute("aria-pressed","true");
  const start=page.locator('[data-action="start"]');
  await expect(start).toBeInViewport();
  await expect(start).toBeEnabled();
  await start.tap();
  await expect(page.locator(".game-ui.playing")).toBeVisible();
  expect(await page.evaluate(()=>window.__runFixture.state())).toBe("PLAYING");
 });
}

test("rotated portrait Android maps a physical sideways swipe to vertical loadout scrolling",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await enterLoadout(page);
 await page.evaluate(async()=>{
  const app=document.createElement("div");
  app.id="app";
  const canvas=document.querySelector("#game-canvas");
  const ui=document.querySelector("#ui-root");
  document.body.append(app);
  app.append(canvas,ui);
  const {installLandscapeOrientation}=await import("/doodlegame/src/platform/web/LandscapeOrientation.ts");
  window.__reviewOrientation=installLandscapeOrientation({onResize(){}});
 });
 await expect(page.locator("html")).toHaveClass(/software-landscape/);
 await expect.poll(()=>page.evaluate(()=>document.querySelector("#app")?.clientWidth)).toBe(844);
 const content=page.locator(".game-ui__menu-setup"),before=await scrollMetrics(page);
 expect(before.scrollHeight).toBeGreaterThan(before.clientHeight+160);
 expect(before.contentTouchAction).toBe("none");
 expect(before.bodyTouchAction).toBe("auto");
 await swipe(page,await content.boundingBox(),false);
 await expect.poll(async()=>(await scrollMetrics(page)).scrollTop).toBeGreaterThan(12);
 await expect(page.locator('[data-action="start"]')).toBeInViewport();
 await page.evaluate(()=>window.__reviewOrientation?.dispose());
});

test("two-player Mummy skins and the final weapon remain reachable by touch",async({page})=>{
 await page.setViewportSize({width:680,height:320});
 await enterLoadout(page,"local");
 const content=page.locator(".game-ui__menu-setup");
 await page.locator(".game-ui__loadout-player-tab").nth(1).tap();
 await page.locator('.game-ui__character-card[data-character="mummy"]').tap();
 await expect(page.locator(".game-ui__mummy-picker")).toBeVisible();
 const before=await scrollMetrics(page);
 await swipe(page,await content.boundingBox(),true);
 await expect.poll(async()=>(await scrollMetrics(page)).scrollTop).toBeGreaterThan(Math.min(12,before.scrollHeight-before.clientHeight));
 const lastWeapon=page.locator('[data-starting-weapon="gravity-gauntlet"]');
 await lastWeapon.tap();
 await expect(lastWeapon).toHaveAttribute("aria-pressed","true");
 await expect(page.locator('[data-action="start"]')).toBeInViewport();
});

import {test,expect} from "@playwright/test";

test.use({hasTouch:true,isMobile:true});

async function enterLoadout(page,route="custom"){
 await page.goto("tests/browser/run-progression.html?landing=1");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
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
 // Dispatch native touchstart/move/end; high-level compositor-only gestures can
 // skip DOM touch events and cannot exercise Android's drag fallback.
 const session=await page.context().newCDPSession(page);
 const x=Math.round(box.x+box.width*(vertical?.5:.2));
 const y=Math.round(box.y+box.height*(vertical?.78:.5));
 const distance=Math.min(vertical?170:155,Math.round((vertical?box.height:box.width)*.58));
 await session.send("Input.dispatchTouchEvent",{type:"touchStart",touchPoints:[{x,y,id:1}]});
 for(let i=1;i<=10;i++){
  await session.send("Input.dispatchTouchEvent",{type:"touchMove",touchPoints:[{
   x:x+(vertical?0:Math.round(distance*i/10)),
   y:y-(vertical?Math.round(distance*i/10):0),id:1
  }]});
  await page.waitForTimeout(16);
 }
 await session.send("Input.dispatchTouchEvent",{type:"touchEnd",touchPoints:[]});
 await session.detach();
}

test("store reviewer can swipe through the entire loadout on a short landscape Android screen",async({page})=>{
 await page.setViewportSize({width:844,height:390});
 await enterLoadout(page);
 const content=page.locator(".game-ui__menu-setup");
 let metrics=await scrollMetrics(page);
 expect(metrics.clientHeight).toBeGreaterThan(60);
 expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight+160);
 expect(metrics.contentOverflow).toBe("auto");
 expect(metrics.contentTouchAction).toBe("none");
 expect(metrics.menuTouchAction).toBe("auto");
 expect(metrics.bodyTouchAction).toBe("auto");
 await expect(page.locator(".game-ui__loadout-scroll-hint")).toContainText(/Swipe|بکشید/);
 await swipe(page,await content.boundingBox(),true);
 await expect.poll(async()=>(await scrollMetrics(page)).scrollTop).toBeGreaterThan(20);
 // Last weapon and START remain available without hiding content or the CTA.
 const last=page.locator('[data-starting-weapon="gravity-gauntlet"]');
 await last.tap();
 await expect(last).toHaveAttribute("aria-pressed","true");
 await expect(page.locator('[data-action="start"]')).toBeInViewport();
 await expect(page.locator('[data-action="start"]')).toBeEnabled();
 await page.locator('[data-action="start"]').tap();
 await expect(page.locator(".game-ui.playing")).toBeVisible();
});

test("rotated portrait Android allows the physical sideways swipe needed for vertical in-game scrolling",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await enterLoadout(page);
 // The fixture normally omits the Android orientation adapter. Install the real
 // production adapter in the DOM to exercise the identical quarter-turn layout.
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
 // The "start" button stays visible after finger scrolling in both orientations.
 await expect(page.locator('[data-action="start"]')).toBeInViewport();
 await page.evaluate(()=>window.__reviewOrientation?.dispose());
});

test("P2 and Mummy cosmetic skins stay reachable while changing characters and weapons",async({page})=>{
 await page.setViewportSize({width:680,height:320});
 await enterLoadout(page,"local");
 const content=page.locator(".game-ui__menu-setup");
 const p2=page.locator(".game-ui__loadout-player-tab").nth(1);
 await p2.tap();
 await page.locator('.game-ui__character-card[data-character="mummy"]').tap();
 await expect(page.locator(".game-ui__mummy-picker")).toBeVisible();
 await content.evaluate(el=>{el.scrollTop=el.scrollHeight;});
 await expect.poll(async()=>content.evaluate(el=>el.scrollTop)).toBeGreaterThan(0);
 await page.locator('[data-starting-weapon="gravity-gauntlet"]').tap();
 await expect(page.locator('[data-starting-weapon="gravity-gauntlet"]')).toHaveAttribute("aria-pressed","true");
 await expect(page.locator('[data-action="start"]')).toBeInViewport();
});

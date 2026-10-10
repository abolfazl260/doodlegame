import {test,expect} from "@playwright/test";

test.use({viewport:{width:740,height:360},hasTouch:true,isMobile:true});
const snapshot=page=>page.evaluate(()=>window.__runFixture.pvpSnapshot());
const center=async locator=>{
 const r=await locator.boundingBox();
 expect(r).toBeTruthy();
 return{x:Math.round(r.x+r.width/2),y:Math.round(r.y+r.height/2)};
};
const touch=(client,type,touchPoints)=>client.send("Input.dispatchTouchEvent",{type,touchPoints});
test.beforeEach(async({page})=>{
 await page.goto("tests/browser/run-progression.html");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
});

test("Two Players option launches an AI-free duel and exposes both touch control sets",async({page})=>{
 const mode=page.locator(".game-ui__menu-settings select").first();
 await expect(mode.locator('option[value="local-pvp"]')).toHaveCount(1);
 await mode.selectOption("local-pvp");
 await expect(page.locator(".game-ui__pvp-hint")).toBeVisible();
 await expect(page.locator(".game-ui__pvp-hint")).toContainText(/P1|نفر ۱|بازیکن ۱/);
 await page.locator('button[data-action="start"]').tap();
 expect(await page.evaluate(()=>window.__runFixture.state())).toBe("PLAYING");
 const game=await snapshot(page);
 expect(game.mode).toBe("local-pvp");
 expect(game.player.health).toBe(100);
 expect(game.opponent.health).toBe(100);
 expect(game.opponent.enemyType).toBe(null);
 await expect(page.locator(".game-ui__p2-controls")).toBeVisible();
 await expect(page.locator(".game-ui__p2-joystick")).toBeVisible();
 await expect(page.locator(".game-ui__p2-attack")).toBeVisible();
 await expect(page.locator(".game-ui__mobile-button--attack")).toBeVisible();
 await expect(page.locator(".game-ui__p2-weapons button")).toHaveCount(2);
});

test("desktop-style keyboard controls remain independent for both fighters",async({page})=>{
 await page.evaluate(()=>window.__runFixture.startPvP());
 await page.keyboard.down("d");
 await page.keyboard.down("ArrowLeft");
 await page.evaluate(()=>window.__runFixture.tickPvP(1));
 let s=await snapshot(page);
 expect(s.player.velocityX).toBeGreaterThan(0);
 expect(s.opponent.velocityX).toBeLessThan(0);
 await page.keyboard.down("w");
 await page.keyboard.down("ArrowUp");
 await page.evaluate(()=>window.__runFixture.tickPvP(1));
 s=await snapshot(page);
 expect(s.player.velocityY).toBeGreaterThan(0);
 expect(s.opponent.velocityY).toBeGreaterThan(0);
 await page.keyboard.up("d");
 await page.keyboard.up("ArrowLeft");
 await page.keyboard.up("w");
 await page.keyboard.up("ArrowUp");
 await page.keyboard.down("Enter");
 await page.evaluate(()=>window.__runFixture.tickPvP(1));
 s=await snapshot(page);
 expect(s.p2Input.attackHeld).toBe(true);
 expect(s.p1Input.attackHeld).toBe(false);
 expect(s.opponent.attackTime).toBeGreaterThan(0);
 await page.keyboard.up("Enter");
 await page.keyboard.down("]");
 await page.evaluate(()=>window.__runFixture.tickPvP(1));
 s=await snapshot(page);
 expect(s.opponent.weapon).toBe("hammer");
 expect(s.player.weapon).toBe("blade");
 await page.keyboard.up("]");
});

test("P1 and P2 movement and held ATTACK respond to four concurrent real touches",async({page})=>{
 await page.evaluate(()=>window.__runFixture.startPvP());
 const p1move=await center(page.locator(".game-ui__joystick"));
 const p1attack=await center(page.locator(".game-ui__mobile-button--attack"));
 const p2move=await center(page.locator(".game-ui__p2-joystick"));
 const p2attack=await center(page.locator(".game-ui__p2-attack"));
 const a={...p1move,x:p1move.x+22,id:1};
 const b={...p2move,x:p2move.x-22,id:2};
 const c={...p1attack,id:3};
 const d={...p2attack,id:4};
 const client=await page.context().newCDPSession(page);
 try{
  await touch(client,"touchStart",[a]);
  await touch(client,"touchStart",[a,b]);
  await touch(client,"touchStart",[a,b,c]);
  await touch(client,"touchStart",[a,b,c,d]);
  let state=await snapshot(page);
  expect(state.p1Input.moveX).toBeGreaterThan(0);
  expect(state.p2Input.moveX).toBeLessThan(0);
  expect(state.p1Input.attackHeld).toBe(true);
  expect(state.p2Input.attackHeld).toBe(true);
  await touch(client,"touchEnd",[d]);
  state=await snapshot(page);
  expect(state.p2Input.attackHeld).toBe(false);
  expect(state.p1Input.attackHeld).toBe(true);
  expect(state.p1Input.moveX).toBeGreaterThan(0);
  await touch(client,"touchEnd",[c]);
  state=await snapshot(page);
  expect(state.p1Input.attackHeld).toBe(false);
  expect(state.p2Input.moveX).toBeLessThan(0);
  await touch(client,"touchEnd",[b]);
  await touch(client,"touchEnd",[a]);
  state=await snapshot(page);
  expect(state.p1Input.moveX).toBe(0);
  expect(state.p2Input.moveX).toBe(0);
 }finally{await client.detach();}
});

test("P2 weapon selector, Pause/Resume and match result work on mobile",async({page})=>{
 await page.evaluate(()=>window.__runFixture.startPvP());
 const next=page.locator(".game-ui__p2-weapons button").last();
 await next.tap();
 await page.evaluate(()=>window.__runFixture.tickPvP(1));
 expect((await snapshot(page)).opponent.weapon).toBe("hammer");
 expect((await snapshot(page)).player.weapon).toBe("blade");
 await page.locator(".game-ui__mobile-pause").tap();
 expect(await page.evaluate(()=>window.__runFixture.state())).toBe("PAUSED");
 await expect(page.locator(".game-ui__p2-controls")).toBeHidden();
 await page.locator('button[data-action="resume"]').tap();
 await expect(page.locator(".game-ui__p2-controls")).toBeVisible();
 await page.evaluate(()=>window.__runFixture.finishPvP("opponent"));
 expect(await page.evaluate(()=>window.__runFixture.state())).toBe("GAME_OVER");
 await expect(page.locator(".game-ui__menu-result")).toContainText(/بازیکن ۲|PLAYER 2/);
 await page.locator('button[data-action="restart"]').tap();
 expect(await page.evaluate(()=>window.__runFixture.state())).toBe("PLAYING");
 expect((await snapshot(page)).opponent.health).toBe(100);
});

test("simultaneous elimination renders an explicit draw without awarding Run progress",async({page})=>{
 await page.evaluate(()=>window.__runFixture.startPvP());
 await page.evaluate(()=>window.__runFixture.finishPvP("draw"));
 expect(await page.evaluate(()=>window.__runFixture.state())).toBe("GAME_OVER");
 expect((await snapshot(page)).winner).toBe("draw");
 await expect(page.locator(".game-ui__menu-result")).toContainText(/مساوی|DRAW/);
});


test("compact 568×260 landscape keeps all four touch controls and Pause separately hittable",async({page})=>{
 await page.setViewportSize({width:568,height:260});
 await page.evaluate(()=>window.__runFixture.startPvP());
 const selectors=[
  ".game-ui__joystick",
  ".game-ui__mobile-button--attack",
  ".game-ui__p2-joystick",
  ".game-ui__p2-attack",
  ".game-ui__mobile-pause"
 ];
 const boxes=await Promise.all(selectors.map(async selector=>{
  const element=page.locator(selector),b=await element.boundingBox();
  expect(b).toBeTruthy();
  expect(b.x).toBeGreaterThanOrEqual(0);
  expect(b.y).toBeGreaterThanOrEqual(0);
  expect(b.x+b.width).toBeLessThanOrEqual(568);
  expect(b.y+b.height).toBeLessThanOrEqual(260);
  const hit=await page.evaluate(({selector,x,y})=>Boolean(document.elementFromPoint(x,y)?.closest(selector)),{
   selector,x:b.x+b.width/2,y:b.y+b.height/2
  });
  expect(hit,selector+" must own its hit-test center").toBe(true);
  return b;
 }));
 for(let i=0;i<boxes.length;i++){
  for(let j=i+1;j<boxes.length;j++){
   const a=boxes[i],b=boxes[j];
   const overlap=Math.max(0,Math.min(a.x+a.width,b.x+b.width)-Math.max(a.x,b.x))*
    Math.max(0,Math.min(a.y+a.height,b.y+b.height)-Math.max(a.y,b.y));
   expect(overlap,selectors[i]+" overlaps "+selectors[j]).toBe(0);
  }
 }
 await expect(page.locator(".game-ui__p2-weapons button")).toHaveCount(2);
});

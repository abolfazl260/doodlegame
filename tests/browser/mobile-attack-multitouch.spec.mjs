import {test,expect} from "@playwright/test";

test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/weapon-picker.html");
 await page.waitForFunction(()=>Boolean(window.__weaponFixture));
 await expect(page.locator(".game-ui.playing .game-ui__mobile-button--attack")).toBeVisible();
});

const metrics=page=>page.evaluate(()=>({
 held:window.__weaponFixture.attackHeld(),
 pressed:window.__weaponFixture.attackPressed(),
 cancelled:window.__weaponFixture.attackCancelled(),
 move:window.__weaponFixture.moveX(),
 projectiles:window.__weaponFixture.projectiles()
}));
const center=async locator=>{
 const b=await locator.boundingBox();
 expect(b).toBeTruthy();
 return{x:Math.round(b.x+b.width/2),y:Math.round(b.y+b.height/2)};
};
const touch=(client,type,points)=>client.send("Input.dispatchTouchEvent",{type,touchPoints:points});

test("second ATTACK finger cannot release the owned UZI hold; regular release ends it",async({page})=>{
 await page.evaluate(()=>window.__weaponFixture.setWeapon("uzi"));
 const p=await center(page.locator(".game-ui__mobile-button--attack"));
 const first={...p,id:1},second={x:p.x+12,y:p.y,id:2};
 const client=await page.context().newCDPSession(page);
 try{
  await touch(client,"touchStart",[first]);
  expect((await metrics(page)).held).toBe(true);
  await touch(client,"touchStart",[first,second]);
  expect((await metrics(page)).held).toBe(true);
  await touch(client,"touchEnd",[second]); // CDP touchEnd names the contact being lifted.
  expect((await metrics(page)).held).toBe(true);
  await page.evaluate(()=>window.__weaponFixture.tick(25));
  expect((await metrics(page)).projectiles).toBeGreaterThan(0);
  await touch(client,"touchEnd",[first]);
  expect((await metrics(page)).held).toBe(false);
  expect((await metrics(page)).cancelled).toBe(false);
 }finally{await client.detach();}
});

test("joystick and ATTACK keep separate simultaneous touch ownership",async({page})=>{
 const a=await center(page.locator(".game-ui__mobile-button--attack"));
 const j=await center(page.locator(".game-ui__joystick"));
 const joystick={x:j.x+24,y:j.y-8,id:3},attack={...a,id:4};
 const client=await page.context().newCDPSession(page);
 try{
  await touch(client,"touchStart",[joystick]);
  expect((await metrics(page)).move).toBeGreaterThan(0);
  await touch(client,"touchStart",[joystick,attack]);
  let m=await metrics(page);
  expect(m.move).toBeGreaterThan(0);
  expect(m.held).toBe(true);
  await touch(client,"touchEnd",[attack]);
  m=await metrics(page);
  expect(m.held).toBe(false);
  expect(m.move).toBeGreaterThan(0);
  await touch(client,"touchEnd",[joystick]);
  expect((await metrics(page)).move).toBe(0);
 }finally{await client.detach();}
});

test("cancelled touch and capture loss cannot leave a phantom held ATTACK",async({page})=>{
 await page.evaluate(()=>window.__weaponFixture.setWeapon("bow"));
 const p=await center(page.locator(".game-ui__mobile-button--attack"));
 const client=await page.context().newCDPSession(page);
 try{
  await touch(client,"touchStart",[{...p,id:5}]);
  await page.evaluate(()=>window.__weaponFixture.tick(12));
  expect((await metrics(page)).held).toBe(true);
  await touch(client,"touchCancel",[]);
  let m=await metrics(page);
  expect(m.held).toBe(false);
  expect(m.cancelled).toBe(true);
  await page.evaluate(()=>window.__weaponFixture.tick(2));
  m=await metrics(page);
  expect(m.projectiles).toBe(0);
  await touch(client,"touchStart",[{...p,id:6}]);
  expect((await metrics(page)).held).toBe(true);
  await touch(client,"touchEnd",[]);
  expect((await metrics(page)).held).toBe(false);
  await page.evaluate(()=>window.__weaponFixture.tick(2));
  expect((await metrics(page)).projectiles).toBeGreaterThan(0);
 }finally{await client.detach();}
});

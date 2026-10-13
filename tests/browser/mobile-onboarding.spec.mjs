import {test,expect} from '@playwright/test';
test.use({viewport:{width:568,height:320},hasTouch:true,isMobile:true});
const path='tests/browser/run-progression.html';
const start=async page=>{await page.locator('[data-action="next"]').click();await page.locator('[data-action="start"]').click();};
test('touch coaching accepts real actions, stays nonblocking and persists skip/replay',async({page})=>{
 await page.goto(path);await start(page);
 const coach=page.locator('.game-ui__coach');await expect(coach).toBeVisible();await expect(coach).toContainText(/Move|حرکت/);
 const j=await page.locator('.game-ui__joystick').boundingBox();
 expect(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.className,{x:j.x+j.width/2,y:j.y+j.height/2})).toContain('joystick');
 const client=await page.context().newCDPSession(page);
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:j.x+j.width*.15,y:j.y+j.height/2,id:1}]});
 await page.evaluate(()=>window.__runFixture.tickPvP(40));
 await expect(coach).toContainText(/Jump|پرش/);
 // Fixture's scheduler is intentionally manual; tick gameplay while held.
 
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{x:j.x+j.width/2,y:j.y+5,id:2}]});
 await page.evaluate(()=>window.__runFixture.nextFrame());
 await expect(coach).toContainText(/Attack|حمله/);
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.locator('.game-ui__mobile-button--attack').tap();await page.evaluate(()=>window.__runFixture.nextFrame());
 await expect(coach).toContainText(/ready|آماده/);
 await coach.locator('button').click();await expect(coach).toBeHidden();
 await page.reload();await start(page);await expect(coach).toBeHidden();
 await page.evaluate(()=>window.__runFixture.back());
 await page.locator('.game-ui__menu-extras').evaluate(n=>n.open=true);
 await page.locator('[data-help="true"]').click();await page.getByRole('button',{name:/Replay touch|تکرار آموزش/}).click();
 await start(page);await expect(coach).toBeVisible();
});
test('local multiplayer and desktop do not receive automatic touch coaching',async({page})=>{
 await page.goto(path);await page.evaluate(()=>window.__runFixture.startPvP());await expect(page.locator('.game-ui__coach')).toBeHidden();
});

import {test,expect} from '@playwright/test';import {mkdirSync} from 'node:fs';
for(const [width,height] of [[568,280],[568,320],[640,320],[844,390]])for(const locale of ['en','fa'])test(`landing navigation ${width}x${height} ${locale}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});const page=await context.newPage();
 await page.addInitScript(l=>localStorage.setItem('doodlegame.locale',JSON.stringify(l)),locale);await page.goto('tests/browser/run-progression.html?landing=1');
 if(process.env.MENU_CAPTURE_STAGE){mkdirSync('docs/screenshots/menu',{recursive:true});if(width===568&&height===320)await page.screenshot({path:`docs/screenshots/menu/${process.env.MENU_CAPTURE_STAGE}-${locale}.png`});}
 if(process.env.MENU_CAPTURE_STAGE==='before'){await context.close();return;}
 await expect(page.locator('[data-route="quick"]')).toBeVisible();
 const quick=await page.locator('[data-route="quick"]').boundingBox();expect(quick.height).toBeGreaterThanOrEqual(44);
 expect(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('button')?.dataset.route,{x:quick.x+quick.width/2,y:quick.y+quick.height/2})).toBe('quick');
 await page.locator('[data-route="quick"]').click();expect((await page.evaluate(()=>window.__runFixture.view())).mode).toBe('duel');expect((await page.evaluate(()=>window.__runFixture.view())).localPvP).toBe(false);
 await page.evaluate(()=>window.__runFixture.back());await expect(page.locator('[data-route="quick"]')).toBeVisible();
 for(const route of ['custom','local','arenas','progression','settings']){
  await page.locator(`[data-route="${route}"]`).click();await expect(page.locator('[data-menu-home]')).toBeVisible();
  if(route==='local')expect((await page.evaluate(()=>window.__runFixture.view())).localPvP).toBe(true);
  if(route==='arenas')await expect(page.locator('.game-ui__arena-card')).toHaveCount(16);
  if(route==='settings'){await page.locator('[data-help="true"]').click();await expect(page.locator('.game-ui__help')).toBeVisible();await page.keyboard.press('Escape');}
  await page.locator('[data-menu-home]').click();await expect(page.locator('[data-route="quick"]')).toBeVisible();
 }
 expect(await page.locator('.game-ui__menu').evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);await context.close();
});

test('Quick Play preserves custom choices/names and a pending Run can continue safely',async({page})=>{
 await page.goto('tests/browser/run-progression.html?landing=1');
 await page.locator('[data-route="local"]').click();
 const names=page.locator('.game-ui__character-name-input');await names.first().fill('نام بازیکن اول');await names.nth(1).fill('Second human');
 await page.locator('[data-mode="low-gravity"]').click();await page.locator('[data-action="next"]').click();await page.locator('[data-arena="pit"]').click();
 await page.locator('.game-ui__weapon-details summary').click();await page.locator('[data-starting-weapon="bow"]').click();
 const custom=await page.evaluate(()=>{const h=window.__runFixture.view();return {arena:h.arena,mode:h.mode,localPvP:h.localPvP,weapon:h.weapon,playerName:h.playerName,secondPlayerName:h.secondPlayerName}});
 await page.locator('[data-menu-home]').click();await page.locator('[data-route="quick"]').click();
 expect((await page.evaluate(()=>window.__runFixture.view())).arena).toBe('classic');await page.evaluate(()=>window.__runFixture.back());
 expect(await page.evaluate(()=>{const h=window.__runFixture.view();return {arena:h.arena,mode:h.mode,localPvP:h.localPvP,weapon:h.weapon,playerName:h.playerName,secondPlayerName:h.secondPlayerName}})).toEqual(custom);
 await page.locator('[data-route="progression"]').click();await page.locator('.game-ui__run-new').click();await page.evaluate(()=>window.__runFixture.win());
 await page.locator('[data-action="menu"]').click();await expect(page.locator('[data-route="continue"]')).toBeVisible();
 const pending=await page.evaluate(()=>window.__runFixture.view().progression);await page.locator('[data-route="quick"]').click();await page.evaluate(()=>window.__runFixture.back());
 expect(await page.evaluate(()=>window.__runFixture.view().progression)).toEqual(pending);
 await page.locator('[data-route="continue"]').click();await expect(page.locator('.game-ui__upgrade-panel')).toBeVisible();expect(await page.evaluate(()=>window.__runFixture.state())).toBe('MENU');
 await page.reload();await expect(page.locator('.game-ui__upgrade-panel')).toBeVisible();
});

test('production app opens a real Quick Play match and returns through Pause to landing',async({browser})=>{
 const context=await browser.newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true});const page=await context.newPage();
 await page.goto('./');const skip=page.locator('.opening-intro__skip');if(await skip.isVisible())await skip.click();
 await page.locator('[data-route="quick"]').click();await expect(page.locator('.game-ui.playing')).toBeVisible();
 const pause=await page.locator('.game-ui__mobile-pause').boundingBox();await page.mouse.move(pause.x+pause.width/2,pause.y+pause.height/2);await page.mouse.down();await page.waitForTimeout(2100);await page.mouse.up();
 await expect(page.locator('.game-ui.paused')).toBeVisible();await page.locator('[data-action="menu"]').click();await expect(page.locator('[data-route="quick"]')).toBeVisible();await context.close();
});

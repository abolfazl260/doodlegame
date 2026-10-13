import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
for(const [width,height] of [[568,280],[568,320],[640,320],[844,390]])for(const locale of ['en','fa']){
 test(`essential HUD ${width}x${height} ${locale}`,async({browser})=>{
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});const page=await context.newPage();
  await page.addInitScript(l=>localStorage.setItem('doodlegame.locale',JSON.stringify(l)),locale);await page.goto('tests/browser/weapon-picker.html');
  await page.locator('.game-ui__coach button').evaluate(n=>n.click());
  const stage=process.env.HUD_CAPTURE_STAGE;
  if(!stage)await page.evaluate(()=>{const s=document.documentElement.style;s.setProperty('--safe-left','24px');s.setProperty('--safe-right','4px');});
  for(const mode of ['duel','king-of-hill']){
   await page.evaluate(mode=>window.__weaponFixture.setMode(mode),mode);
   if(stage&&width===568&&height===320){mkdirSync('docs/screenshots/hud',{recursive:true});await page.screenshot({path:`docs/screenshots/hud/${stage}-${locale}-${mode}.png`});}
   if(stage==='before')continue;
   const status=page.locator('.game-ui__status');if(mode==='duel')await expect(status).toBeHidden();else await expect(status).toContainText(/8/);
   await expect(page.locator('.game-ui__details')).toHaveCount(0);
   const geometry=await page.evaluate(()=>{
    const b=s=>{const r=document.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom};};
    return {a:b('.health-bar--player'),b:b('.health-bar--opponent'),p:b('.game-ui__mobile-pause'),hud:b('.game-ui__top-hud')};
   });
   expect(geometry.a.right).toBeLessThanOrEqual(geometry.p.x+1);expect(geometry.p.right).toBeLessThanOrEqual(geometry.b.x+1);
   expect(geometry.hud.bottom).toBeLessThan(100);
   for(const s of ['.game-ui__mobile-pause','.game-ui__mobile-button--attack','.game-ui__joystick']){
    const n=page.locator(s),r=await n.boundingBox();expect(await page.evaluate(({x,y,s})=>Boolean(document.elementFromPoint(x,y)?.closest(s)),{x:r.x+r.width/2,y:r.y+r.height/2,s})).toBe(true);
   }
  }
  await context.close();
 });
}

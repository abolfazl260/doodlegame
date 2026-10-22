import {chooseLoadout} from "./setup.mjs";
import {test,expect} from '@playwright/test';
import {mkdirSync} from 'node:fs';
for(const [width,height] of [[568,280],[568,320],[640,320],[844,390]])for(const locale of ['en','fa']){
 test(`readable landscape ${width}x${height} ${locale}`,async({browser})=>{
  const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});const page=await context.newPage();
  await page.addInitScript(locale=>localStorage.setItem('doodlegame.locale',JSON.stringify(locale)),locale);
  await page.goto('tests/browser/run-progression.html');
  const stage=process.env.UI_CAPTURE_STAGE;
  if(stage){mkdirSync('docs/screenshots/readability',{recursive:true});await page.screenshot({path:`docs/screenshots/readability/${stage}-${width}x${height}-${locale}.png`});}
  if(stage!=='before'){
   for(const selector of ['.game-ui__menu-progress','.game-ui__character-description','.game-ui__character-picker-hint','.game-ui__mode-card','.game-ui__mode-description']){
    const fonts=await page.locator(selector).evaluateAll(nodes=>nodes.filter(n=>n.getClientRects().length).map(n=>parseFloat(getComputedStyle(n).fontSize)));expect(fonts.every(n=>n>=12)).toBe(true);
   }
   await page.locator('.game-ui__character-name-input').first().fill(locale==='fa'?'نام بلند بازیکن برای بررسی چیدمان و خوانایی':'A long player name for layout checks');
   expect(await page.locator('.game-ui__menu').evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);
   await chooseLoadout(page);await expect(page.locator('[data-action="start"]')).toBeVisible();
   const b=await page.locator('[data-action="start"]').boundingBox();expect(b.height).toBeGreaterThanOrEqual(44);
   expect(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.closest('button')?.dataset.action,{x:b.x+b.width/2,y:b.y+b.height/2})).toBe('start');
   expect(await page.locator('.game-ui__menu').evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);
  }
  if(stage!=='before'){
   await page.locator('[data-action="back"]').click();await page.locator('[data-action="back"]').click();
   await page.locator('.game-ui__menu-extras').evaluate(n=>n.open=true);
   await page.locator('[data-help="true"]').click();
   await page.evaluate(()=>document.documentElement.style.fontSize='20px');
   const dialog=page.locator('.game-ui__help');expect(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);
   await dialog.locator('.game-ui__dialog-close').click();await expect(dialog).toBeHidden();
  }
  await context.close();
 });
}

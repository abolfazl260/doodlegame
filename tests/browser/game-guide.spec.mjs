import {test,expect} from '@playwright/test';
for(const [width,height] of [[568,280],[568,320],[640,320],[844,390]])for(const locale of ['en','fa'])test(`complete guide ${width}x${height} ${locale}`,async({browser})=>{
 const context=await browser.newContext({viewport:{width,height},hasTouch:true,isMobile:true});const page=await context.newPage();
 await page.addInitScript(l=>localStorage.setItem('doodlegame.locale',JSON.stringify(l)),locale);await page.goto('tests/browser/run-progression.html');
 await page.locator('.game-ui__menu-extras').evaluate(n=>n.open=true);await page.locator('[data-help="true"]').click();
 const dialog=page.locator('.game-ui__help');await expect(dialog).toBeVisible();await expect(dialog.locator('[data-guide-section]')).toHaveCount(6);
 const controls=dialog.locator('[data-guide-section="controls"]');await expect(controls).toHaveAttribute('open','');await controls.locator('summary').click();await expect(controls).not.toHaveAttribute('open','');
 for(const section of ['advanced','weapons','modes','progression','local']){
  const details=dialog.locator(`[data-guide-section="${section}"]`);await details.locator('summary').click();await expect(details).toHaveAttribute('open','');
  if(section==='weapons'||section==='modes')await expect(details.locator('article')).toHaveCount(section==='weapons'?9:8);
  if(section==='local')await expect(details).toContainText('Numpad1');
  expect(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);
  await details.locator('summary').click();
 }
 await page.evaluate(()=>document.documentElement.style.fontSize='20px');expect(await dialog.evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);
 await dialog.locator('.game-ui__dialog-close').click();await expect(dialog).toBeHidden();await expect(page.locator('[data-help="true"]')).toBeFocused();
 await page.locator('[data-help="true"]').click();await page.keyboard.press('Escape');await expect(dialog).toBeHidden();await context.close();
});

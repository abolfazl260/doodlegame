import {test,expect} from '@playwright/test';
test.use({hasTouch:true,isMobile:true});
import {mkdirSync} from 'node:fs';
for(const locale of ['en','fa'])test(`arena thumbnails and filters ${locale}`,async({page})=>{
 await page.setViewportSize({width:568,height:320});await page.addInitScript(l=>localStorage.setItem('doodlegame.locale',JSON.stringify(l)),locale);
 await page.goto('tests/browser/run-progression.html');await page.locator('[data-action="next"]').click();
 const stage=process.env.ARENA_CAPTURE_STAGE;if(stage==='after')await page.locator('.game-ui__arena-card').first().scrollIntoViewIfNeeded();
 const screenshot=stage;
 if(screenshot){mkdirSync('docs/screenshots/arenas',{recursive:true});await page.screenshot({path:`docs/screenshots/arenas/${stage}-${locale}.png`});}
 if(stage==='before')return;
 const cards=page.locator('.game-ui__arena-card');await expect(cards).toHaveCount(16);await expect(cards.locator('img')).toHaveCount(16);
 expect(await cards.locator('img').evaluateAll(nodes=>nodes.every(n=>n.complete&&n.naturalWidth>0&&n.src.startsWith('data:')))).toBe(true);
  await page.locator('[data-arena="pit"]').click();
 await page.locator('[data-arena-category="moving"]').click();expect((await page.evaluate(()=>window.__runFixture.view())).arena).toBe('pit');
 await expect(page.locator('.game-ui__arena-selection-summary')).toContainText(locale==='fa'?'گودال':'PIT');
 expect(await page.locator('.game-ui__arena-card:visible').count()).toBeLessThan(16);
 await page.locator('[data-arena-category="all"]').click();await expect(page.locator('.game-ui__arena-card:visible')).toHaveCount(16);
 for(const card of await cards.all()){await card.click();await expect(card).toHaveAttribute('aria-pressed','true');}
 await page.locator('[data-action="back"]').click();await page.locator('[data-quick-mode="local-pvp"]').click();await page.locator('[data-action="next"]').click();
 await expect(page.locator('.game-ui__arena-card:visible')).toHaveCount(16);await expect(page.locator('[data-action="next"]')).toBeVisible();
 expect(await page.locator('.game-ui__menu').evaluate(n=>n.scrollWidth<=n.clientWidth+1)).toBe(true);
 const first=cards.first();await first.locator('img').evaluate(n=>n.dispatchEvent(new Event('error')));await expect(first.locator('img')).toBeHidden();await expect(first.locator('.game-ui__arena-name')).toBeVisible();
});

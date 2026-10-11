import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";

test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
const raw="https://raw.githubusercontent.com/abolfazl260/doodlegame/main/public/downloadable-arenas/";
async function mockGithub(page){
 await page.route(raw+"**",route=>{
  const relative=route.request().url().slice(raw.length);
  if(!/^(catalog\.json|(?:forest|desert)\/(?:arena\.json|background\.svg))$/.test(relative))
   return route.fulfill({status:404,body:"Not found"});
  const body=readFileSync(new URL("../../public/downloadable-arenas/"+relative,import.meta.url),"utf8");
  return route.fulfill({status:200,contentType:relative.endsWith(".svg")?"image/svg+xml":"application/json",headers:{"access-control-allow-origin":"*"},body});
 });
}
async function visitArenaStep(page){
 await page.goto("tests/browser/run-progression.html");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 await page.locator('button[data-action="next"]').tap();
 await expect(page.locator(".game-ui__menu-arena-panel")).toBeVisible();
}

test("players can download new GitHub arenas, choose them, and replay them offline after reload",async({page})=>{
 await mockGithub(page);
 await visitArenaStep(page);
 await expect(page.locator(".game-ui__arena-card")).toHaveCount(16);
 const extras=page.locator(".game-ui__downloadable-arenas");
 await expect(extras).toBeVisible();
 await extras.locator(".game-ui__download-refresh").tap();
 const cards=extras.locator(".game-ui__download-card");
 await expect(cards).toHaveCount(2);
 await cards.first().locator(".game-ui__download-install").tap();
 await expect(cards.first().locator(".game-ui__download-play")).toBeVisible();
 await cards.first().locator(".game-ui__download-play").tap();
 await expect(page.locator(".game-ui__arena-selection-summary")).toContainText("جنگل مه‌آلود");
 await page.locator('button[data-action="start"]').tap();
 expect(await page.evaluate(()=>window.__runFixture.view().arena)).toBe("extra-forest");
 await page.unrouteAll();
 await page.route(raw+"**",route=>route.abort());
 await page.reload();
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 await page.locator('button[data-action="next"]').tap();
 await expect(page.locator(".game-ui__download-play")).toHaveCount(1);
 await page.locator(".game-ui__download-play").tap();
 expect(await page.evaluate(()=>window.__runFixture.view().arena)).toBe("extra-forest");
 await expect(page.locator(".game-ui__arena-card")).toHaveCount(16);
 await page.locator(".game-ui__download-delete").tap();
 await expect(page.locator(".game-ui__download-play")).toHaveCount(0);
});

test("failed catalog request never blocks the original sixteen offline arenas",async({page})=>{
 await page.route(raw+"**",route=>route.abort());
 await visitArenaStep(page);
 await page.locator(".game-ui__download-refresh").tap();
 await expect(page.locator(".game-ui__download-feedback")).toContainText(/گیت‌هاب|GitHub/);
 await expect(page.locator(".game-ui__arena-card")).toHaveCount(16);
 await page.locator('.game-ui__arena-card[data-arena="sky"]').tap();
 await page.locator('button[data-action="start"]').tap();
 expect(await page.evaluate(()=>window.__runFixture.view().arena)).toBe("sky");
});

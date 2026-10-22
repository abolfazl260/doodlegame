import {startMatch} from "./setup.mjs";
import {test,expect} from "@playwright/test";
import {readFileSync} from "node:fs";
import {WEBP_SAMPLE_BASE64,WEBP_SAMPLE_DESCRIPTOR,WEBP_SAMPLE_LISTING} from "../fixtures/downloadable-webp.mjs";

test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
const raw="https://raw.githubusercontent.com/abolfazl260/doodlegame/main/public/downloadable-arenas/";
const fixtureCatalog=JSON.parse(readFileSync(new URL("../../public/downloadable-arenas/catalog.json",import.meta.url),"utf8"));
const availablePaths=new Set(["catalog.json",...fixtureCatalog.arenas.flatMap(e=>[e.path,e.path.replace(/arena\.json$/,"background.svg")])]);
async function mockGithub(page){
 await page.route(raw+"**",route=>{
  const relative=route.request().url().slice(raw.length);
  if(!availablePaths.has(relative))
   return route.fulfill({status:404,body:"Not found"});
  const image=relative.endsWith(".webp");
  const body=readFileSync(new URL("../../public/downloadable-arenas/"+relative,import.meta.url),image?undefined:"utf8");
  return route.fulfill({status:200,contentType:image?"image/webp":relative.endsWith(".svg")?"image/svg+xml":"application/json",headers:{"access-control-allow-origin":"*"},body});
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
 await expect(page.locator(".game-ui__arena-card")).toHaveCount(20);
 const extras=page.locator(".game-ui__downloadable-arenas");
 await expect(extras).toBeVisible();
 await extras.locator(".game-ui__download-refresh").tap();
 const cards=extras.locator(".game-ui__download-card");
 await expect(cards).toHaveCount(25);
 await cards.first().locator(".game-ui__download-install").tap();
 await expect(cards.first().locator(".game-ui__download-play")).toBeVisible();
 await cards.first().locator(".game-ui__download-play").tap();
 await expect(page.locator(".game-ui__arena-selection-summary")).toContainText("جنگل مه‌آلود");
 await startMatch(page);
 expect(await page.evaluate(()=>window.__runFixture.view().arena)).toBe("extra-forest");
 await page.unrouteAll();
 await page.route(raw+"**",route=>route.abort());
 await page.reload();
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 await page.locator('button[data-action="next"]').tap();
 await expect(page.locator(".game-ui__download-play")).toHaveCount(1);
 await page.locator(".game-ui__download-play").tap();
 expect(await page.evaluate(()=>window.__runFixture.view().arena)).toBe("extra-forest");
 await expect(page.locator(".game-ui__arena-card")).toHaveCount(20);
 await page.locator(".game-ui__download-delete").tap();
 await expect(page.locator(".game-ui__download-play")).toHaveCount(0);
});

test("three new landscapes can each be downloaded, selected and reused offline",async({page})=>{
 await mockGithub(page);
 await visitArenaStep(page);
 await page.locator(".game-ui__download-refresh").tap();
 await expect(page.locator(".game-ui__download-card")).toHaveCount(25);
 const newlyAdded=[
  {id:"extra-glacier",fa:"قله یخی"},
  {id:"extra-volcano",fa:"آتشفشان سوزان"},
  {id:"extra-neon-city",fa:"بام‌های نئونی"}
 ];
 for(const item of newlyAdded){
  const card=page.locator(".game-ui__download-card").filter({hasText:item.fa});
  await card.locator(".game-ui__download-install").tap();
  await expect(card.locator(".game-ui__download-play")).toBeVisible();
  await expect(card.locator(".game-ui__download-preview")).toHaveCSS("background-image",/data:image\/svg\+xml;charset=utf-8,/);
  await card.locator(".game-ui__download-play").tap();
  await expect(page.locator(".game-ui__arena-selection-summary")).toContainText(item.fa);
  expect(await page.evaluate(()=>window.__runFixture.view().arena)).toBe(item.id);
 }
 await page.unrouteAll();
 await page.route(raw+"**",route=>route.abort());
 await page.reload();
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 await page.locator('button[data-action="next"]').tap();
 await expect(page.locator(".game-ui__download-play")).toHaveCount(3);
 const offlineCard=page.locator(".game-ui__download-card").filter({hasText:"بام‌های نئونی"});
 await offlineCard.locator(".game-ui__download-play").tap();
 await startMatch(page);
 expect(await page.evaluate(()=>window.__runFixture.view().arena)).toBe("extra-neon-city");
 await expect(page.locator(".game-ui__arena-card")).toHaveCount(20);
});

test("short landscape gallery keeps all downloadable cards independently reachable above sticky menu actions",async({page})=>{
 await mockGithub(page);
 await page.setViewportSize({width:568,height:300});
 await visitArenaStep(page);
 await page.locator(".game-ui__download-refresh").tap();
 const grid=page.locator(".game-ui__download-grid");
 await expect(grid.locator(".game-ui__download-card")).toHaveCount(25);
 // Previously the full gallery expanded under the sticky Start/Back footer.
 const before=await grid.evaluate(node=>{
  const css=getComputedStyle(node);
  return {scrollHeight:node.scrollHeight,clientHeight:node.clientHeight,
   overflowY:css.overflowY,touchAction:css.touchAction};
 });
 expect(before.scrollHeight).toBeGreaterThan(before.clientHeight);
 expect(before.overflowY).toBe("auto");
 expect(before.touchAction).toBe("pan-y");
 await grid.evaluate(node=>node.scrollTop=node.scrollHeight);
 const last=grid.locator(".game-ui__download-card").last();
 const viewport=await grid.boundingBox(),download=await last.locator(".game-ui__download-install").boundingBox();
 // A card may be taller than the short viewport, but its action must be reachable.
 expect(download.y+download.height).toBeLessThanOrEqual(viewport.y+viewport.height+1);
 expect(download.y).toBeGreaterThanOrEqual(viewport.y-1);
 await last.locator(".game-ui__download-install").tap();
 await expect(last.locator(".game-ui__download-play")).toBeVisible();
 await last.locator(".game-ui__download-play").tap();
 await expect(page.locator(".game-ui__arena-selection-summary")).toContainText("باغ شکوفه‌های گیلاس");
 await expect(page.locator('button[data-action="next"]')).toBeInViewport();
});

test("downloadable previews appear before install, then switch to cached SVG after installing",async({page})=>{
 await mockGithub(page);
 await visitArenaStep(page);
 await page.locator(".game-ui__download-refresh").tap();
 const card=page.locator(".game-ui__download-card").filter({hasText:"جنگل مه‌آلود"});
 await expect(card.locator(".game-ui__download-preview")).toHaveCSS("background-image",/forest\/background\.svg/);
 await expect(card.locator(".game-ui__download-badge")).toContainText("جدید");
 await card.locator(".game-ui__download-install").tap();
 await expect(card.locator(".game-ui__download-preview")).toHaveCSS("background-image",/data:image\/svg\+xml;charset=utf-8,/);
 await expect(card.locator(".game-ui__download-badge")).toContainText("دانلودشده");
});

test("WebP arena downloads as binary, displays its thumbnail and plays again offline",async({page})=>{
 const descriptor={...JSON.parse(readFileSync(new URL("../../public/downloadable-arenas/forest/arena.json",import.meta.url),"utf8")),...WEBP_SAMPLE_DESCRIPTOR};
 const catalog={...JSON.parse(readFileSync(new URL("../../public/downloadable-arenas/catalog.json",import.meta.url),"utf8"))};
 catalog.arenas.push(WEBP_SAMPLE_LISTING);
 await page.route(raw+"**",route=>{
  const uri=route.request().url().slice(raw.length);
  if(uri==="catalog.json")return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(catalog)});
  if(uri==="webp-demo/arena.json")return route.fulfill({status:200,contentType:"application/json",headers:{"access-control-allow-origin":"*"},body:JSON.stringify(descriptor)});
  if(uri==="webp-demo/background.webp")return route.fulfill({status:200,contentType:"image/webp",headers:{"access-control-allow-origin":"*"},body:Buffer.from(WEBP_SAMPLE_BASE64,"base64")});
  return route.fulfill({status:404,body:"Not found"});
 });
 await visitArenaStep(page);
 await page.locator(".game-ui__download-refresh").tap();
 await expect(page.locator(".game-ui__download-card")).toHaveCount(26);
 const card=page.locator(".game-ui__download-card").filter({hasText:"نمای آزمایشی WebP"});
 await card.locator(".game-ui__download-install").tap();
 await expect(card.locator(".game-ui__download-play")).toBeVisible();
 await expect(card.locator(".game-ui__download-preview")).toHaveCSS("background-image",/data:image\/webp;base64,/);
 const decoded=await card.locator(".game-ui__download-preview").evaluate(async el=>{
  const css=el.style.backgroundImage;
  const src=css.slice(5,-2);
  const image=new Image();
  return new Promise(resolve=>{image.onload=()=>resolve({width:image.naturalWidth,height:image.naturalHeight});image.onerror=()=>resolve(null);image.src=src;});
 });
 expect(decoded).toEqual({width:32,height:18});
 await card.locator(".game-ui__download-play").tap();
 expect(await page.evaluate(()=>window.__runFixture.view().arena)).toBe("extra-webp-demo");
 await page.unrouteAll();
 await page.route(raw+"**",route=>route.abort());
 await page.reload();
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 await page.locator('button[data-action="next"]').tap();
 const saved=page.locator(".game-ui__download-card").filter({hasText:"نمای آزمایشی WebP"});
 await expect(saved.locator(".game-ui__download-play")).toBeVisible();
 await expect(saved.locator(".game-ui__download-preview")).toHaveCSS("background-image",/data:image\/webp;base64,/);
 await saved.locator(".game-ui__download-play").tap();
 await startMatch(page);
 expect(await page.evaluate(()=>window.__runFixture.view().arena)).toBe("extra-webp-demo");
 await expect(page.locator(".game-ui__arena-card")).toHaveCount(20);
});

test("failed catalog request never blocks the original twenty offline arenas",async({page})=>{
 await page.route(raw+"**",route=>route.abort());
 await visitArenaStep(page);
 await page.locator(".game-ui__download-refresh").tap();
 await expect(page.locator(".game-ui__download-feedback")).toContainText(/گیت‌هاب|GitHub/);
 await expect(page.locator(".game-ui__arena-card")).toHaveCount(20);
 await page.locator('.game-ui__arena-card[data-arena="sky"]').tap();
 await startMatch(page);
 expect(await page.evaluate(()=>window.__runFixture.view().arena)).toBe("sky");
});

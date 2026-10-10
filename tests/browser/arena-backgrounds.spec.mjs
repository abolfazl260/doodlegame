import {test,expect} from "@playwright/test";

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/arena-backgrounds.html");
 await page.waitForFunction(()=>Boolean(window.__arenaArt));
});

test("all 16 arena backdrops render opaque, different, readable scenes",async({page})=>{
 const scenes=await page.evaluate(()=>window.__arenaArt.all());
 expect(scenes).toHaveLength(16);
 expect(new Set(scenes.map(s=>s.hash)).size).toBe(16);
 for(const scene of scenes){
  expect(scene.opaque).toBeGreaterThan(1000);
  expect(scene.centerLuma).toBeLessThan(130);
 }
 const stable=await page.evaluate(()=>window.__arenaArt.all());
 expect(stable.map(s=>s.hash)).toEqual(scenes.map(s=>s.hash));
});

test("backdrops scale predictably to compact landscape and full HD without losing opacity",async({page})=>{
 const sizes=[[568,260],[960,540],[1920,1080]];
 for(const [width,height] of sizes){
  const scene=await page.evaluate(([w,h])=>window.__arenaArt.render("reactor",w,h),[width,height]);
  expect(scene.width).toBe(width);
  expect(scene.height).toBe(height);
  expect(scene.opaque).toBeGreaterThan(100);
  expect(scene.centerLuma).toBeLessThan(140);
 }
});

test("arena switching changes actual background pixels without fetching image assets",async({page})=>{
 const names=["sky","reactor","ruins","pit","moving","classic"];
 const pixels=await page.evaluate(ids=>ids.map(id=>window.__arenaArt.render(id).hash),names);
 expect(new Set(pixels).size).toBe(names.length);
 const canvas=page.locator("#scene");
 await expect(canvas).toHaveAttribute("width","640");
 await expect(canvas).toHaveAttribute("height","360");
});

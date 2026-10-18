import {test,expect} from "@playwright/test";

test("the whole game fills a portrait viewport with landscape coordinates",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("./");
 await expect.poll(()=>page.evaluate(()=>document.documentElement.classList.contains("software-landscape"))).toBe(true);
 const size=await page.evaluate(()=>{
  const app=document.querySelector("#app"),canvas=document.querySelector("#game-canvas");
  if(!app||!canvas)throw Error("Game surface missing");
  const bounds=app.getBoundingClientRect();
  return {logicalWidth:app.clientWidth,logicalHeight:app.clientHeight,
   width:bounds.width,height:bounds.height,
   canvasWidth:canvas.clientWidth,canvasHeight:canvas.clientHeight,
   guard:document.querySelector("#orientation-guard")!==null,
   blocked:app.hasAttribute("inert")};
 });
 expect(size.logicalWidth).toBeGreaterThan(size.logicalHeight);
 expect(size.logicalWidth).toBeCloseTo(844,0);
 expect(size.logicalHeight).toBeCloseTo(390,0);
 expect(size.width).toBeCloseTo(390,0);
 expect(size.height).toBeCloseTo(844,0);
 expect(size.canvasWidth).toBeCloseTo(size.logicalWidth,0);
 expect(size.canvasHeight).toBeCloseTo(size.logicalHeight,0);
 expect(size.guard).toBe(false);
 expect(size.blocked).toBe(false);
});

test("resizing portrait to landscape and back updates the game box",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("./");
 await expect.poll(()=>page.evaluate(()=>document.documentElement.classList.contains("software-landscape"))).toBe(true);
 await page.setViewportSize({width:844,height:390});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.classList.contains("software-landscape"))).toBe(false);
 await expect.poll(()=>page.evaluate(()=>document.querySelector("#app")?.clientWidth)).toBe(844);
 await page.setViewportSize({width:412,height:915});
 await expect.poll(()=>page.evaluate(()=>document.documentElement.classList.contains("software-landscape"))).toBe(true);
 await expect.poll(()=>page.evaluate(()=>document.querySelector("#app")?.clientWidth)).toBe(915);
});

test("pointer positions and swipe directions follow the rotated canvas",async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.goto("./");
 await expect.poll(()=>page.evaluate(()=>document.documentElement.classList.contains("software-landscape"))).toBe(true);
 const result=await page.evaluate(async()=>{
  const {gamePointerInElement,toGamePointerDelta}=await import("/doodlegame/src/platform/web/LandscapeOrientation.ts");
  const canvas=document.querySelector("#game-canvas");
  if(!(canvas instanceof HTMLCanvasElement))throw Error("Canvas not found");
  return {
   topLeft:gamePointerInElement(canvas,{clientX:390,clientY:0}),
   bottomRight:gamePointerInElement(canvas,{clientX:0,clientY:844}),
   logicalUp:toGamePointerDelta(60,0)
  };
 });
 expect(result.topLeft.x).toBeCloseTo(0,0);
 expect(result.topLeft.y).toBeCloseTo(0,0);
 expect(result.bottomRight.x).toBeCloseTo(844,0);
 expect(result.bottomRight.y).toBeCloseTo(390,0);
 expect(result.logicalUp.x).toBe(0);
 expect(result.logicalUp.y).toBe(-60);
});

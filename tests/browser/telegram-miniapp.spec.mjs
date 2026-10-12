import {test,expect} from "@playwright/test";

test("normal GitHub Pages visitors never request Telegram SDK",async({page})=>{
 let external=0;
 await page.route("https://telegram.org/js/telegram-web-app.js*",route=>{external++;return route.abort()});
 await page.goto("/doodlegame/");
 await expect(page.locator("#boot-fallback")).toHaveCount(0);
 expect(await page.locator("html").evaluate(el=>el.classList.contains("telegram-mini-app"))).toBe(false);
 await page.waitForTimeout(500);
 expect(external).toBe(0);
});

test("Mini App launch loads SDK on demand, applies safe areas and handles viewport changes",async({page})=>{
 const fakeSdk=[
  "window.__tgCalls=[];",
  "window.__tgEvents={};",
  "window.Telegram={WebApp:{",
  "viewportHeight:560,safeAreaInset:{top:12,right:4,bottom:12,left:6},",
  "contentSafeAreaInset:{top:44,right:7,bottom:28,left:7},",
  "ready(){window.__tgCalls.push('ready')},expand(){window.__tgCalls.push('expand')},",
  "disableVerticalSwipes(){window.__tgCalls.push('no-swipes')},",
  "setHeaderColor(value){window.__tgCalls.push('header:'+value)},",
  "setBackgroundColor(value){window.__tgCalls.push('background:'+value)},",
  "setBottomBarColor(value){window.__tgCalls.push('bottom:'+value)},",
  "isVersionAtLeast(){return true},requestFullscreen(){window.__tgCalls.push('fullscreen')},",
  "onEvent(name,callback){window.__tgEvents[name]=callback},",
  "offEvent(name,callback){if(window.__tgEvents[name]===callback)delete window.__tgEvents[name]},",
  "BackButton:{show(){window.__tgCalls.push('back-show')},",
  "hide(){window.__tgCalls.push('back-hide')},",
  "onClick(callback){window.__tgEvents.back=callback},",
  "offClick(callback){if(window.__tgEvents.back===callback)delete window.__tgEvents.back}}",
  "}};"
 ].join("\n");
 await page.route("https://telegram.org/js/telegram-web-app.js*",route=>route.fulfill({
  status:200,contentType:"application/javascript",body:fakeSdk
 }));
 await page.goto("/doodlegame/#tgWebAppPlatform=android&tgWebAppVersion=9.0");
 await page.waitForFunction(()=>window.__tgCalls?.includes("ready"));
 await expect(page.locator("#boot-fallback")).toHaveCount(0);
 expect(await page.locator("html").evaluate(el=>el.classList.contains("telegram-mini-app"))).toBe(true);
 const result=await page.evaluate(()=>{
  const html=document.documentElement,api=window.Telegram.WebApp;
  const top=html.style.getPropertyValue("--tg-safe-top");
  api.viewportHeight=612;
  api.contentSafeAreaInset.top=61;
  window.__tgEvents.viewportChanged();
  return {top,updatedTop:html.style.getPropertyValue("--tg-safe-top"),
   updatedHeight:html.style.getPropertyValue("--tg-viewport-height"),
   calls:window.__tgCalls.slice()};
 });
 expect(result.top).toBe("44px");
 expect(result.updatedTop).toBe("61px");
 expect(result.updatedHeight).toBe("612px");
 expect(result.calls).toContain("no-swipes");
 expect(result.calls).toContain("back-hide");
 expect(result.calls).toContain("header:#000000");
});

test("Telegram launch with unsupported SDK does not prevent the game loading",async({page})=>{
 await page.route("https://telegram.org/js/telegram-web-app.js*",route=>route.abort());
 await page.goto("/doodlegame/#tgWebAppPlatform=ios&tgWebAppVersion=9.0");
 await expect(page.locator("#boot-fallback")).toHaveCount(0);
 expect(await page.locator("html").evaluate(el=>el.classList.contains("telegram-mini-app"))).toBe(true);
});

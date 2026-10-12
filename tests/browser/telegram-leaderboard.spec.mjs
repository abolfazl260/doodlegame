import {test,expect} from "@playwright/test";

test("Telegram profile and top wins are shown only after the Worker responds",async({page})=>{
 const worker="https://doodlegame-test.workers.dev";
 const auth="auth_date=12345&user=verified-by-backend-only";
 const sdk=[
  "window.Telegram={WebApp:{",
  "initData:"+JSON.stringify(auth)+",",
  "viewportHeight:550,ready(){},expand(){},setHeaderColor(){},",
  "setBackgroundColor(){},setBottomBarColor(){},disableVerticalSwipes(){},",
  "onEvent(){},offEvent(){},BackButton:{show(){},hide(){},onClick(){},offClick(){}}",
  "}};"
 ].join("");
 await page.route("https://telegram.org/js/telegram-web-app.js*",route=>route.fulfill({
  status:200,contentType:"application/javascript",body:sdk
 }));
 await page.route("**/leaderboard-config.json",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify({apiBaseUrl:worker})
 }));
 let authSeen=false;
 await page.route(worker+"/api/**",route=>{
  if(route.request().headers().authorization==="tma "+auth)authSeen=true;
  const url=new URL(route.request().url());
  const data=url.pathname==="/api/me"?
   {ok:true,player:{displayName:"Verified User",wins:4}}:
   {ok:true,me:{displayName:"Verified User",wins:4},myRank:1,
    leaders:[{rank:1,displayName:"Verified User",wins:4},{rank:2,displayName:"Opponent",wins:2}]};
  return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify(data)});
 });
 await page.goto("/doodlegame/#tgWebAppPlatform=android&tgWebAppVersion=9.0");
 await expect(page.locator("#boot-fallback")).toHaveCount(0);
 const button=page.locator(".game-ui__telegram-ranks");
 await expect(button).toHaveCount(1);
 await expect(page.locator(".telegram-leaderboard__profile")).toContainText("4 پیروزی");
 await button.evaluate(el=>el.click());
 await expect(page.locator(".telegram-leaderboard__entries li")).toHaveCount(2);
 expect(authSeen).toBe(true);
});

test("normal web access never renders Telegram ranking UI or calls the API",async({page})=>{
 let requests=0;
 await page.route("**/leaderboard-config.json",route=>{requests++;return route.abort();});
 await page.goto("/doodlegame/");
 await expect(page.locator("#boot-fallback")).toHaveCount(0);
 await expect(page.locator(".game-ui__telegram-ranks")).toHaveCount(0);
 expect(requests).toBe(0);
});

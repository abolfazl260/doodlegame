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
 await expect(button).toHaveAttribute("data-state","ready");
 expect(await button.evaluate(el=>Boolean(el.closest(".game-ui__menu-extras")))).toBe(false);
 await button.evaluate(el=>el.click());
 await expect(page.locator(".telegram-leaderboard__entries li")).toHaveCount(2);
 expect(authSeen).toBe(true);
});


test("Telegram login is discoverable outside collapsed settings and explains rejected tokens",async({page})=>{
 const sdk="window.Telegram={WebApp:{initData:'auth_date=123&user=test',viewportHeight:550,ready(){},expand(){},onEvent(){},offEvent(){}}};";
 await page.route("https://telegram.org/js/telegram-web-app.js*",route=>route.fulfill({
  status:200,contentType:"application/javascript",body:sdk
 }));
 await page.route("**/leaderboard-config.json",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify({apiBaseUrl:"https://example.workers.dev"})
 }));
 await page.route("https://example.workers.dev/api/me",route=>route.fulfill({
  status:401,contentType:"application/json",body:JSON.stringify({error:"Invalid or expired Telegram authorization"})
 }));
 await page.goto("/doodlegame/#tgWebAppPlatform=android&tgWebAppVersion=9.0");
 const ranks=page.locator(".game-ui__telegram-ranks");
 await expect(ranks).toHaveAttribute("data-state","error");
 await expect(ranks).toContainText("اتصال برقرار نیست");
 expect(await ranks.evaluate(el=>Boolean(el.closest(".game-ui__menu-extras")))).toBe(false);
 await ranks.evaluate(el=>el.click());
 await expect(page.locator(".telegram-leaderboard__status")).toContainText("توکن");
});

test("Telegram login explains uninitialized D1 tables instead of hiding server errors",async({page})=>{
 const sdk="window.Telegram={WebApp:{initData:'auth_date=123&user=test',viewportHeight:550,ready(){},expand(){},onEvent(){},offEvent(){}}};";
 await page.route("https://telegram.org/js/telegram-web-app.js*",route=>route.fulfill({
  status:200,contentType:"application/javascript",body:sdk
 }));
 await page.route("**/leaderboard-config.json",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify({apiBaseUrl:"https://example.workers.dev"})
 }));
 await page.route("https://example.workers.dev/api/me",route=>route.fulfill({
  status:500,contentType:"application/json",body:JSON.stringify({error:"D1 database error"})
 }));
 await page.goto("/doodlegame/#tgWebAppPlatform=android&tgWebAppVersion=9.0");
 const ranks=page.locator(".game-ui__telegram-ranks");
 await expect(ranks).toHaveAttribute("data-state","error");
 await ranks.evaluate(el=>el.click());
 await expect(page.locator(".telegram-leaderboard__status")).toContainText("players");
 await expect(page.locator(".telegram-leaderboard__status")).toContainText("matches");
});

test("ordinary desktop and mobile browsers hide all Telegram ranking UI without network calls",async({page})=>{
 let configRequests=0,sdkRequests=0;
 await page.route("**/leaderboard-config.json",route=>{configRequests++;return route.abort();});
 await page.route("https://telegram.org/js/telegram-web-app.js*",route=>{sdkRequests++;return route.abort();});
 for(const viewport of [{width:1280,height:720},{width:390,height:844}]){
  await page.setViewportSize(viewport);
  await page.goto("/doodlegame/");
  await expect(page.locator("#boot-fallback")).toHaveCount(0);
  await expect(page.locator(".game-ui__telegram-ranks")).toHaveCount(0);
  await expect(page.locator(".telegram-leaderboard")).toHaveCount(0);
  await expect(page.locator("html")).not.toHaveClass(/telegram-mini-app/);
 }
 expect(configRequests).toBe(0);
 expect(sdkRequests).toBe(0);
});

test("ordinary browser with SDK object but no signed Telegram identity hides rankings",async({page})=>{
 let requests=0;
 await page.addInitScript(()=>{
  window.Telegram={WebApp:{initData:"",ready(){},expand(){},onEvent(){},offEvent(){}}};
 });
 await page.route("**/leaderboard-config.json",route=>{requests++;return route.abort();});
 await page.goto("/doodlegame/");
 await expect(page.locator("#boot-fallback")).toHaveCount(0);
 await expect(page.locator(".game-ui__telegram-ranks")).toHaveCount(0);
 await expect(page.locator(".telegram-leaderboard")).toHaveCount(0);
 expect(requests).toBe(0);
});

test("pre-injected Telegram signed initData shows rankings after URL markers disappear",async({page})=>{
 const worker="https://doodlegame-test.workers.dev";
 const signed="auth_date=123&user=example&hash=server-verified";
 let sdkLoads=0,authSeen=0;
 await page.addInitScript(signed=>{
  window.Telegram={WebApp:{initData:signed,ready(){},expand(){},onEvent(){},offEvent(){}}};
 },signed);
 await page.route("https://telegram.org/js/telegram-web-app.js*",route=>{sdkLoads++;return route.abort();});
 await page.route("**/leaderboard-config.json",route=>route.fulfill({
  status:200,contentType:"application/json",body:JSON.stringify({apiBaseUrl:worker})
 }));
 await page.route(worker+"/api/me",route=>{
  if(route.request().headers().authorization==="tma "+signed)authSeen++;
  return route.fulfill({status:200,contentType:"application/json",
   body:JSON.stringify({ok:true,player:{displayName:"New Player",wins:0}})});
 });
 await page.goto("/doodlegame/");
 await expect(page.locator("#boot-fallback")).toHaveCount(0);
 const ranks=page.locator(".game-ui__telegram-ranks");
 await expect(ranks).toHaveAttribute("data-state","ready");
 await expect(ranks).toContainText("New Player");
 expect(sdkLoads).toBe(0,"pre-injected Telegram SDK should not be re-downloaded");
 expect(authSeen).toBe(1);
});

test("Telegram SDK with no identity shows explicit error rather than hiding the ranking button",async({page})=>{
 await page.route("https://telegram.org/js/telegram-web-app.js*",route=>route.fulfill({
  status:200,contentType:"application/javascript",
  body:"window.Telegram={WebApp:{initData:'',ready(){},expand(){},onEvent(){},offEvent(){}}};"
 }));
 await page.goto("/doodlegame/#tgWebAppPlatform=android&tgWebAppVersion=9.0");
 const ranks=page.locator(".game-ui__telegram-ranks");
 await expect(ranks).toHaveAttribute("data-state","error");
 await ranks.evaluate(el=>el.click());
 await expect(page.locator(".telegram-leaderboard__status")).toContainText("اطلاعات ورود دریافت نشد");
});

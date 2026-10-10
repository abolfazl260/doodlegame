import {test,expect} from "@playwright/test";

test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/run-progression.html");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 await expect(page.locator(".game-ui.menu")).toBeVisible();
});

test("player-count cards filter mode choices and arena is selected on the next screen",async({page})=>{
 const solo=page.locator('.game-ui__quick-mode[data-quick-mode="duel"]');
 const versus=page.locator('.game-ui__quick-mode[data-quick-mode="local-pvp"]');
 const cards=page.locator(".game-ui__mode-card:visible");
 await expect(solo).toHaveAttribute("aria-pressed","true");
 await expect(cards).toHaveCount(7);
 await versus.tap();
 expect((await page.evaluate(()=>window.__runFixture.view())).mode).toBe("local-pvp");
 await expect(versus).toHaveAttribute("aria-pressed","true");
 await expect(cards).toHaveCount(1);
 await expect(page.locator(".game-ui__pvp-hint")).toBeVisible();
 await solo.tap();
 await expect(cards).toHaveCount(7);
 await page.locator('.game-ui__mode-card[data-mode="low-gravity"]').tap();
 await expect(page.locator('.game-ui__mode-card[data-mode="low-gravity"]')).toHaveAttribute("aria-pressed","true");
 await expect(page.locator(".game-ui__mode-description")).toContainText("پرش‌های");
 await expect(page.locator('button[data-action="start"]')).toBeHidden();
 await page.locator('button[data-action="next"]').tap();
 await expect(page.locator(".game-ui__menu-arena-panel")).toBeVisible();
 await expect(page.locator(".game-ui__menu-mode-panel")).toBeHidden();
 await expect(page.locator(".game-ui__arena-card")).toHaveCount(16);
 await page.locator('.game-ui__arena-card[data-arena="ruins"]').tap();
 await expect(page.locator('.game-ui__arena-card[data-arena="ruins"]')).toHaveAttribute("aria-pressed","true");
 await page.locator(".game-ui__weapon-details summary").tap();
 await page.locator('.game-ui__loadout-card[data-starting-weapon="bow"]').tap();
 await expect(page.locator(".game-ui__match-summary")).toContainText("ویرانه‌ها");
 await expect(page.locator(".game-ui__match-summary")).toContainText("کمان");
 await page.locator(".game-ui__language button").tap();
 await expect(solo).toHaveText("SOLO PLAYER");
 await expect(page.locator(".game-ui__match-summary")).toContainText("RUINS");
 await expect(page.locator(".game-ui__match-summary")).toContainText("BOW");
 await page.locator('button[data-action="back"]').tap();
 await expect(page.locator('.game-ui__mode-card[data-mode="low-gravity"]')).toHaveAttribute("aria-pressed","true");
 await expect(page.locator(".game-ui__menu-arena-panel")).toBeHidden();
});

test("advanced settings stay secondary and help dialog dismisses with Escape",async({page})=>{
 const extras=page.locator(".game-ui__menu-extras");
 const help=page.locator(".game-ui__help");
 const primary=page.locator('button[data-action="next"]');
 await expect(extras).not.toHaveAttribute("open","");
 await expect(primary).toBeVisible();
 await extras.locator("summary").tap();
 await expect(extras).toHaveAttribute("open","");
 const helpAction=page.locator(".game-ui__menu-links button[data-help]");
 await helpAction.tap();
 await expect(help).toBeVisible();
 await page.keyboard.press("Escape");
 await expect(help).toBeHidden();
 await expect(helpAction).toBeFocused();
 await expect(primary).toBeVisible();
 await extras.locator("summary").tap();
 await expect(extras).not.toHaveAttribute("open","");
});

test("short landscape wizard keeps NEXT and START hittable while arena gallery scrolls",async({page})=>{
 await page.setViewportSize({width:568,height:280});
 const menu=page.locator(".game-ui__menu");
 const next=page.locator('button[data-action="next"]');
 await expect(next).toBeInViewport();
 await next.tap();
 const start=page.locator('button[data-action="start"]');
 await expect(start).toBeInViewport();
 const geometry=await page.evaluate(()=>{
  const menu=document.querySelector(".game-ui__menu");
  const button=document.querySelector('[data-action="start"]');
  const before=menu.scrollTop;
  menu.scrollTop=menu.scrollHeight;
  const rect=button.getBoundingClientRect(),x=rect.left+rect.width/2,y=rect.top+rect.height/2;
  return {before,after:menu.scrollTop,overflow:menu.scrollHeight>menu.clientHeight,
   touchAction:getComputedStyle(menu).touchAction,hit:button.contains(document.elementFromPoint(x,y))};
 });
 expect(geometry.overflow).toBe(true);
 expect(geometry.after).toBeGreaterThan(geometry.before);
 expect(geometry.touchAction).toBe("pan-y");
 expect(geometry.hit).toBe(true);
 await start.tap();
 expect(await page.evaluate(()=>window.__runFixture.state())).toBe("PLAYING");
});

test("pause shows Resume without match setup and Run remains reachable from the main menu",async({page})=>{
 const run=page.locator(".game-ui__run-panel");
 await expect(run).not.toBeVisible();
 await page.locator(".game-ui__menu-progress-details > summary").tap();
 await expect(run).toBeVisible();
 await expect(run.locator(".game-ui__run-new")).toBeVisible();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="start"]').tap();
 await page.locator(".game-ui__mobile-pause").tap();
 await expect(page.locator(".game-ui__menu-setup")).toBeHidden();
 await expect(page.locator('button[data-action="resume"]')).toBeVisible();
 await page.locator('button[data-action="menu"]').tap();
 await expect(page.locator(".game-ui__menu-setup")).toBeVisible();
 await expect(run).toBeVisible();
});

test("reference-screen layout keeps every RTL card inside the menu and shows labeled CTA",async({page})=>{
 await page.setViewportSize({width:1488,height:1055});
 const next=page.locator('button[data-action="next"]');
 await expect(next).toHaveText(/مرحله بعد/);
 await expect(page.locator(".game-ui__menu-progress-details")).not.toHaveAttribute("open","");
 await expect(page.locator(".game-ui__menu-arena-panel")).toBeHidden();
 const measures=await page.evaluate(()=>{
  const panel=document.querySelector(".game-ui.menu").getBoundingClientRect();
  const targets=[...document.querySelectorAll(".game-ui__quick-mode,.game-ui__mode-card:not([hidden])")];
  const rects=targets.map(node=>node.getBoundingClientRect());
  const heading=document.querySelector(".game-ui__menu-mode-panel .game-ui__section-title").getBoundingClientRect();
  return{
   left:panel.left,right:panel.right,
   cardLeft:Math.min(...rects.map(r=>r.left)),
   cardRight:Math.max(...rects.map(r=>r.right)),
   headingLeft:heading.left,headingRight:heading.right,
   documentWidth:document.documentElement.scrollWidth,windowWidth:innerWidth
  };
 });
 expect(measures.cardLeft).toBeGreaterThanOrEqual(measures.left-1);
 expect(measures.cardRight).toBeLessThanOrEqual(measures.right+1);
 expect(measures.headingLeft).toBeGreaterThanOrEqual(measures.left-1);
 expect(measures.headingRight).toBeLessThanOrEqual(measures.right+1);
 expect(measures.documentWidth).toBeLessThanOrEqual(measures.windowWidth);
 await next.tap();
 await expect(page.locator(".game-ui__menu-arena-panel")).toBeVisible();
 await expect(page.locator(".game-ui__menu-mode-panel")).toBeHidden();
 await expect(page.locator(".game-ui__menu-progress-details")).toBeHidden();
 await expect(page.locator(".game-ui__menu-extras")).toBeHidden();
 await expect(page.locator('button[data-action="back"]')).toHaveText("بازگشت");
 await expect(page.locator('button[data-action="start"]')).toHaveText("شروع");
 await page.locator('button[data-action="back"]').tap();
 await expect(next).toHaveText(/مرحله بعد/);
});

test("wizard navigation labels persist after changing language and only one step is visible",async({page})=>{
 const next=page.locator('button[data-action="next"]');
 const back=page.locator('button[data-action="back"]');
 await expect(next).toHaveText(/مرحله بعد/);
 await page.locator(".game-ui__language button").tap();
 await expect(next).toHaveText("NEXT · CHOOSE ARENA");
 await next.tap();
 await expect(back).toHaveText("BACK");
 await expect(page.locator(".game-ui__menu-arena-panel")).toBeVisible();
 await expect(page.locator(".game-ui__menu-mode-panel")).toBeHidden();
 await expect(page.locator(".game-ui__quick-mode")).toHaveCount(2);
 await expect(page.locator(".game-ui__quick-mode").first()).toBeHidden();
 await page.locator(".game-ui__language button").tap();
 await expect(back).toHaveText("بازگشت");
 await back.tap();
 await expect(next).toHaveText(/مرحله بعد/);
});


test("1610x738 results screen has only two full-width readable actions without collisions",async({page})=>{
 await page.setViewportSize({width:1610,height:738});
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="start"]').tap();
 await page.evaluate(()=>window.__runFixture.win());
 await expect(page.locator(".game-ui.game-over")).toBeVisible();
 await expect(page.locator(".game-ui__menu-result")).toContainText("بردی");
 await expect(page.locator(".game-ui__menu-setup")).toBeHidden();
 await expect(page.locator(".game-ui__menu-mode-panel")).toBeHidden();
 await expect(page.locator(".game-ui__menu-arena-panel")).toBeHidden();
 await expect(page.locator(".game-ui__menu-progress-details")).toBeHidden();
 await expect(page.locator(".game-ui__menu-extras")).toBeHidden();
 await expect(page.locator('button[data-action="next"]')).toBeHidden();
 await expect(page.locator('button[data-action="back"]')).toBeHidden();
 await expect(page.locator('button[data-action="start"]')).toBeHidden();
 const replay=page.locator('button[data-action="restart"]');
 const main=page.locator('button[data-action="menu"]');
 await expect(replay).toBeVisible();
 await expect(main).toBeVisible();
 const rects=await page.evaluate(()=>{
  const get=selector=>document.querySelector(selector).getBoundingClientRect();
  const panel=get(".game-ui.game-over"),a=get('[data-action="restart"]'),b=get('[data-action="menu"]');
  const hit=r=>{const x=r.left+r.width/2,y=r.top+r.height/2;return document.elementFromPoint(x,y)?.dataset.action??null;};
  return {panel:{left:panel.left,right:panel.right,top:panel.top,bottom:panel.bottom},
   replay:{left:a.left,right:a.right,top:a.top,bottom:a.bottom,width:a.width,height:a.height,hit:hit(a)},
   main:{left:b.left,right:b.right,top:b.top,bottom:b.bottom,width:b.width,height:b.height,hit:hit(b)}};
 });
 for(const key of ["replay","main"]){
  expect(rects[key].width).toBeGreaterThan(100);
  expect(rects[key].height).toBeGreaterThanOrEqual(44);
  expect(rects[key].left).toBeGreaterThanOrEqual(rects.panel.left);
  expect(rects[key].right).toBeLessThanOrEqual(rects.panel.right);
  expect(rects[key].top).toBeGreaterThanOrEqual(rects.panel.top);
  expect(rects[key].bottom).toBeLessThanOrEqual(rects.panel.bottom+1);
  expect(rects[key].hit).toBe(key==="replay"?"restart":"menu");
 }
 expect(rects.replay.right<=rects.main.left+1||rects.main.right<=rects.replay.left+1).toBe(true);
 await main.tap();
 await expect(page.locator(".game-ui.menu")).toBeVisible();
 await expect(page.locator('button[data-action="next"]')).toBeVisible();
});

test("2048x1807 upgrade screen uses one optional view at a time and keeps CTA tappable",async({page})=>{
 await page.setViewportSize({width:2048,height:1807});
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="start"]').tap();
 await page.evaluate(()=>window.__runFixture.win());
 await page.locator('button[data-action="menu"]').tap();
 const drawer=page.locator(".game-ui__menu-progress-details");
 await drawer.locator("> summary").tap();
 await expect(page.locator(".game-ui__menu-progress-tabs")).toBeVisible();
 await expect(page.locator(".game-ui__upgrade-panel")).toBeVisible();
 await expect(page.locator(".game-ui__run-panel")).toBeHidden();
 await page.locator('.game-ui__menu-progress-tab[data-view="run"]').tap();
 await expect(page.locator(".game-ui__run-panel")).toBeVisible();
 await expect(page.locator(".game-ui__upgrade-panel")).toBeHidden();
 await page.locator('.game-ui__menu-progress-tab[data-view="upgrades"]').tap();
 await expect(page.locator(".game-ui__upgrade-panel")).toBeVisible();
 await expect(page.locator(".game-ui__run-panel")).toBeHidden();
 const next=page.locator('button[data-action="next"]');
 await expect(next).toHaveText(/مرحله بعد/);
 await expect(next).toBeInViewport();
 await next.tap();
 await expect(drawer).toBeHidden();
 await expect(page.locator(".game-ui__menu-arena-panel")).toBeVisible();
 await expect(page.locator('button[data-action="start"]')).toBeVisible();
});

test("Run intermission exposes reward tiles and next fight together without showing setup or next arena",async({page})=>{
 await page.locator(".game-ui__menu-progress-details > summary").tap();
 await page.locator(".game-ui__run-new").tap();
 await page.evaluate(()=>window.__runFixture.win());
 await expect(page.locator(".game-ui.game-over")).toBeVisible();
 await expect(page.locator(".game-ui__menu-setup")).toBeHidden();
 await expect(page.locator(".game-ui__menu-progress-details")).toBeVisible();
 await expect(page.locator(".game-ui__menu-progress-details")).toHaveAttribute("open","");
 await expect(page.locator(".game-ui__run-panel")).toBeVisible();
 await expect(page.locator(".game-ui__upgrade-panel")).toBeVisible();
 await expect(page.locator(".game-ui__menu-progress-tabs")).toBeHidden();
 await expect(page.locator(".game-ui__run-continue")).toBeDisabled();
 await expect(page.locator('button[data-action="next"]')).toBeHidden();
 const selected=(await page.evaluate(()=>window.__runFixture.view())).progression.choices[0];
 await page.locator(`.game-ui__upgrade-card[data-upgrade-weapon="${selected}"]`).tap();
 await page.locator(".game-ui__upgrade-choices > button").tap();
 await expect(page.locator(".game-ui__run-continue")).toBeEnabled();
});

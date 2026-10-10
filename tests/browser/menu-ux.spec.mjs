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
 await expect(page.locator(".game-ui__mode-description")).toContainText("جاذبه");
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
 const primary=page.locator('button[data-action="start"]');
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

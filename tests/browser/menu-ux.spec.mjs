import {test,expect} from "@playwright/test";

test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/run-progression.html");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 await expect(page.locator(".game-ui.menu")).toBeVisible();
});

async function holdToPause(page){
 const button=page.locator(".game-ui__mobile-pause");
 const bounds=await button.boundingBox();
 expect(bounds).not.toBeNull();
 const x=bounds.x+bounds.width/2,y=bounds.y+bounds.height/2;
 // Mouse pointer events exercise the same hold logic as touch on the emulator.
 await page.mouse.move(x,y);
 await page.mouse.down();
 await page.waitForTimeout(2100);
 await page.mouse.up();
}

test("Online Multiplayer stays disabled for touch, keyboard, and both locales",async({page})=>{
 const online=page.locator('.game-ui__mode-card[data-mode="online"]');
 await expect(online).toBeVisible();
 await expect(online).toBeDisabled();
 await expect(online).toHaveAttribute("aria-disabled","true");
 await expect(online).toContainText("بازی آنلاین");
 await expect(online).toContainText("به‌زودی");
 await expect(page.locator("html")).toHaveAttribute("dir","rtl");
 const before=await page.evaluate(()=>({mode:window.__runFixture.view().mode,state:window.__runFixture.state()}));
 const didFocus=await online.evaluate(button=>{
  button.focus();
  button.click();
  button.dispatchEvent(new PointerEvent("pointerdown",{bubbles:true,pointerId:4}));
  button.dispatchEvent(new PointerEvent("pointerup",{bubbles:true,pointerId:4}));
  button.dispatchEvent(new KeyboardEvent("keydown",{key:"Enter",code:"Enter",bubbles:true}));
  button.dispatchEvent(new KeyboardEvent("keydown",{key:" ",code:"Space",bubbles:true}));
  return document.activeElement===button;
 });
 expect(didFocus).toBe(false);
 expect(await page.evaluate(()=>({mode:window.__runFixture.view().mode,state:window.__runFixture.state()}))).toEqual(before);
 await expect(page.locator(".game-ui__menu-arena-panel")).toBeHidden();
 await page.locator(".game-ui__language button").tap();
 await expect(page.locator("html")).toHaveAttribute("dir","ltr");
 await expect(online).toContainText("ONLINE");
 await expect(online).toContainText("COMING SOON");
 await expect(online).toBeDisabled();
 await page.setViewportSize({width:640,height:320});
 const fits=await online.evaluate(button=>{
  const box=button.getBoundingClientRect();
  const grid=button.parentElement.getBoundingClientRect();
  return box.width>0&&box.left>=grid.left-1&&box.right<=grid.right+1;
 });
 expect(fits).toBe(true);
 await page.locator('.game-ui__mode-card[data-mode="low-gravity"]').tap();
 await expect(page.locator('.game-ui__mode-card[data-mode="low-gravity"]')).toHaveAttribute("aria-pressed","true");
 await page.locator('button[data-action="next"]').tap();
 await expect(page.locator(".game-ui__menu-arena-panel")).toBeVisible();
});

test("missile duel has no aim controls or extra HUD details",async({page})=>{
 await page.locator('.game-ui__mode-card[data-mode="missile-duel"]').tap();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="start"]').tap();
 await expect(page.locator(".game-ui.playing")).toBeVisible();
 await expect(page.locator(".game-ui__missile-panel")).toHaveCount(0);
 await expect(page.locator(".game-ui__mobile-button--attack")).toBeVisible();
 await expect(page.locator(".game-ui__missile-aim-guide,.game-ui__details")).toHaveCount(0);
 const hudText=await page.locator(".game-ui.playing").innerText();
 expect(hudText).not.toMatch(/(?:زاویه|ANGLE)/i);
 expect(hudText).not.toMatch(/(?:قدرت|POWER)/i);
});

test("player-count cards preserve all mode choices and arena is selected on the next screen",async({page})=>{
 const solo=page.locator('.game-ui__quick-mode[data-quick-mode="duel"]');
 const versus=page.locator('.game-ui__quick-mode[data-quick-mode="local-pvp"]');
 const cards=page.locator(".game-ui__mode-card:visible");
 await expect(solo).toHaveAttribute("aria-pressed","true");
 await expect(cards).toHaveCount(8);
 await versus.tap();
 expect((await page.evaluate(()=>window.__runFixture.view())).localPvP).toBe(true);
 await expect(versus).toHaveAttribute("aria-pressed","true");
 await expect(cards).toHaveCount(8);
 await expect(page.locator(".game-ui__pvp-hint")).toBeVisible();
 await solo.tap();
 await expect(cards).toHaveCount(8);
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

test("centered translucent pause ignores a short touch and opens after a two-second hold",async({page})=>{
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="start"]').tap();
 const button=page.locator(".game-ui__mobile-pause");
 await expect(button).toBeVisible();
 const bounds=await button.boundingBox();
 expect(Math.abs(bounds.x+bounds.width/2-page.viewportSize().width/2)).toBeLessThan(2);
 expect(bounds.width).toBeLessThanOrEqual(42);
 const opacity=await button.evaluate(el=>Number(getComputedStyle(el).opacity));
 expect(opacity).toBeLessThan(.6);
 await button.tap();
 expect(await page.evaluate(()=>window.__runFixture.state())).toBe("PLAYING");
 await holdToPause(page);
 expect(await page.evaluate(()=>window.__runFixture.state())).toBe("PAUSED");
 await expect(button).toBeHidden();
});

test("pause shows Resume without match setup and Run remains reachable from the main menu",async({page})=>{
 const run=page.locator(".game-ui__run-panel");
 await expect(run).not.toBeVisible();
 await page.locator(".game-ui__menu-progress-details > summary").tap();
 await expect(run).toBeVisible();
 await expect(run.locator(".game-ui__run-new")).toBeVisible();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="start"]').tap();
 await holdToPause(page);
 await expect(page.locator(".game-ui__menu-setup")).toBeHidden();
 await expect(page.locator('button[data-action="resume"]')).toBeVisible();
 await page.locator('button[data-action="menu"]').tap();
 await expect(page.locator(".game-ui__menu-setup")).toBeVisible();
 await expect(run).toBeVisible();
});

test("reference-screen layout keeps every RTL card inside the menu and shows labeled CTA",async({page})=>{
 await page.setViewportSize({width:1488,height:1055});
 const next=page.locator('button[data-action="next"]');
 await expect(next).toHaveText(/بعدی/);
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
 await expect(next).toHaveText(/بعدی/);
});

test("wizard navigation labels persist after changing language and only one step is visible",async({page})=>{
 const next=page.locator('button[data-action="next"]');
 const back=page.locator('button[data-action="back"]');
 await expect(next).toHaveText(/بعدی/);
 await page.locator(".game-ui__language button").tap();
 await expect(next).toHaveText("NEXT · ARENA");
 await next.tap();
 await expect(back).toHaveText("BACK");
 await expect(page.locator(".game-ui__menu-arena-panel")).toBeVisible();
 await expect(page.locator(".game-ui__menu-mode-panel")).toBeHidden();
 await expect(page.locator(".game-ui__quick-mode")).toHaveCount(2);
 await expect(page.locator(".game-ui__quick-mode").first()).toBeHidden();
 await page.locator(".game-ui__language button").tap();
 await expect(back).toHaveText("بازگشت");
 await back.tap();
 await expect(next).toHaveText(/بعدی/);
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
 await expect(next).toHaveText(/بعدی/);
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

test("direct map shortcut exposes all sixteen selectable maps and the chosen arena starts the match",async({page})=>{
 const shortcut=page.locator(".game-ui__arena-shortcut");
 await expect(shortcut).toBeVisible();
 await expect(shortcut).toContainText("کلاسیک");
 await shortcut.tap();
 const maps=page.locator(".game-ui__arena-card");
 const ids=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge",
 "crater","vertical","ruins","conveyor","collapse","storm","reactor"];
 await expect(maps).toHaveCount(ids.length);
 for(const id of ids){
  const card=page.locator(`.game-ui__arena-card[data-arena="${id}"]`);
  await card.tap();
  await expect(card).toHaveAttribute("aria-pressed","true");
  expect((await page.evaluate(()=>window.__runFixture.view())).arena).toBe(id);
 }
 await expect(page.locator(".game-ui__arena-selection-summary")).toContainText("راکتور");
 await page.locator('button[data-action="back"]').tap();
 await expect(shortcut).toContainText("راکتور");
 await page.locator('.game-ui__quick-mode[data-quick-mode="local-pvp"]').tap();
 await shortcut.tap();
 await expect(maps).toHaveCount(16);
 await page.locator('.game-ui__arena-card[data-arena="sky"]').tap();
 await expect(page.locator('.game-ui__arena-card[data-arena="sky"]')).toHaveAttribute("aria-pressed","true");
 expect((await page.evaluate(()=>window.__runFixture.view())).arena).toBe("sky");
 await page.locator('button[data-action="start"]').tap();
 const state=await page.evaluate(()=>window.__runFixture.pvpSnapshot());
 expect(state.arena).toBe("sky");
 expect(state.localPvP).toBe(true);
});

test("character names persist across launches and are used for both local fighters",async({page})=>{
 const first=page.locator(".game-ui__character-name-input").first();
 await expect(first).toBeVisible();
 await first.fill("آرش");
 await page.reload();
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 await expect(first).toHaveValue("آرش");
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="start"]').tap();
 await expect(page.locator(".health-bar--player .health-label__name")).toHaveText("آرش");
 await holdToPause(page);
 await page.locator('button[data-action="menu"]').tap();
 await page.locator('.game-ui__quick-mode[data-quick-mode="local-pvp"]').tap();
 const second=page.locator(".game-ui__character-name-input").nth(1);
 await expect(second).toBeVisible();
 await second.fill("سام");
 await page.locator('button[data-action="next"]').tap();
 await expect(page.locator(".game-ui__arena-card")).toHaveCount(16);
 await page.locator('button[data-action="start"]').tap();
 await expect(page.locator(".health-bar--opponent .health-label__name")).toHaveText("سام");
});

test("real keyboard typing works for both local players and every arena is selectable",async({page})=>{
 await page.locator('.game-ui__quick-mode[data-quick-mode="local-pvp"]').tap();
 const first=page.locator(".game-ui__character-name-input").first();
 const second=page.locator(".game-ui__character-name-input").nth(1);
 await expect(first).toBeVisible();
 await expect(second).toBeVisible();
 await first.pressSequentially("Arman");
 await second.pressSequentially("Sina");
 await expect(first).toHaveValue("Arman");
 await expect(second).toHaveValue("Sina");
 // Typing must not trigger attacks, movement, weapon changes or jump.
 const before=await page.evaluate(()=>window.__runFixture.pvpSnapshot());
 expect(before.p1Input.moveX).toBe(0);
 expect(before.p2Input.moveX).toBe(0);
 expect(before.p1Input.attackPressed).toBe(false);
 expect(before.p2Input.attackPressed).toBe(false);
 await expect(page.locator('button[data-action="next"]')).toContainText("۱۶");
 await page.locator('button[data-action="next"]').tap();
 const ids=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge",
  "crater","vertical","ruins","conveyor","collapse","storm","reactor"];
 await expect(page.locator(".game-ui__arena-card")).toHaveCount(ids.length);
 for(const id of ids){
  const card=page.locator(`.game-ui__arena-card[data-arena="${id}"]`);
  await expect(card).toBeEnabled();
  await card.tap();
  await expect(card).toHaveAttribute("aria-pressed","true");
  expect((await page.evaluate(()=>window.__runFixture.view())).arena).toBe(id);
 }
 await page.locator('button[data-action="start"]').tap();
 const match=await page.evaluate(()=>window.__runFixture.pvpSnapshot());
 expect(match.arena).toBe("reactor");
 expect(match.localPvP).toBe(true);
 await expect(page.locator(".health-bar--player .health-label__name")).toHaveText("Arman");
 await expect(page.locator(".health-bar--opponent .health-label__name")).toHaveText("Sina");
});

test("local PvP names follow the physical left and right characters in Persian and English",async({page})=>{
 await page.locator('.game-ui__quick-mode[data-quick-mode="local-pvp"]').tap();
 const fields=page.locator(".game-ui__character-name-input");
 const left=fields.nth(0),right=fields.nth(1);
 const labels=page.locator(".game-ui__character-name-caption");
 const positions=async()=>{
  const [l,r]=await Promise.all([left.boundingBox(),right.boundingBox()]);
  expect(l).toBeTruthy();expect(r).toBeTruthy();
  expect(l.x+l.width/2).toBeLessThan(r.x+r.width/2);
 };
 await expect(page.locator("html")).toHaveAttribute("dir","rtl");
 await expect(labels.first()).toContainText("سمت چپ");
 await expect(labels.nth(1)).toContainText("سمت راست");
 await positions();
 // Switching the language must not swap the physical fields.
 await page.locator(".game-ui__language button").tap();
 await expect(page.locator("html")).toHaveAttribute("dir","ltr");
 await expect(labels.first()).toContainText("LEFT");
 await expect(labels.nth(1)).toContainText("RIGHT");
 await positions();
 await left.fill("Left Hero");
 await right.fill("Right Hero");
 await page.locator(".game-ui__language button").tap();
 await expect(page.locator("html")).toHaveAttribute("dir","rtl");
 await expect(left).toHaveValue("Left Hero");
 await expect(right).toHaveValue("Right Hero");
 await positions();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="start"]').tap();
 const fighters=await page.evaluate(()=>window.__runFixture.pvpSnapshot());
 expect(fighters.player.x).toBeLessThan(fighters.opponent.x);
 expect(fighters.localPvP).toBe(true);
 const p1=page.locator(".health-bar--player"),p2=page.locator(".health-bar--opponent");
 await expect(p1.locator(".health-label__name")).toHaveText("Left Hero");
 await expect(p2.locator(".health-label__name")).toHaveText("Right Hero");
 const leftHud=await p1.boundingBox(),rightHud=await p2.boundingBox();
 expect(leftHud.x+leftHud.width/2).toBeLessThan(rightHud.x+rightHud.width/2);
 await page.evaluate(()=>window.__runFixture.finishPvP("opponent"));
 await expect(page.locator(".game-ui__menu-result")).toContainText("Right Hero");
});

test("compact landscape names stay assigned to the correct side despite stacked inputs",async({page})=>{
 await page.setViewportSize({width:568,height:260});
 await page.locator('.game-ui__quick-mode[data-quick-mode="local-pvp"]').tap();
 const names=page.locator(".game-ui__character-name-input");
 await expect(page.locator(".game-ui__character-name-caption").first()).toContainText("چپ");
 await expect(page.locator(".game-ui__character-name-caption").nth(1)).toContainText("راست");
 await names.nth(0).fill("بازیکن چپ");
 await names.nth(1).fill("بازیکن راست");
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="start"]').tap();
 await expect(page.locator(".health-bar--player .health-label__name")).toHaveText("بازیکن چپ");
 await expect(page.locator(".health-bar--opponent .health-label__name")).toHaveText("بازیکن راست");
});

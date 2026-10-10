import {test,expect} from "@playwright/test";

test.use({viewport:{width:740,height:360},hasTouch:true,isMobile:true});

test.beforeEach(async({page})=>{
 await page.goto("tests/browser/run-progression.html");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 await expect(page.locator(".game-ui__run-panel")).toBeVisible();
});

const getView=page=>page.evaluate(()=>window.__runFixture.view());
const status=page=>page.evaluate(()=>window.__runFixture.state());

test("complete three encounters and a boss with one upgrade choice after each win",async({page})=>{
 await page.locator(".game-ui__run-new").tap();
 for(let stage=1;stage<=4;stage++){
  expect(await status(page)).toBe("PLAYING");
  const active=await getView(page);
  expect(active.inRun).toBe(true);
  expect(active.progression.run.stage).toBe(stage);
  expect(active.opponentMaxHealth).toBe([100,115,130,175][stage-1]);
  await page.evaluate(()=>window.__runFixture.win());
  expect(await status(page)).toBe("GAME_OVER");
  const view=await getView(page);
  expect(view.progression.totalWins).toBe(stage);
  if(stage===4){
   expect(view.progression.run.status).toBe("complete");
   await expect(page.locator(".game-ui__run-continue")).toBeHidden();
  }else{
   expect(view.progression.run.status).toBe("victory");
   expect(view.progression.choices).toHaveLength(3);
   await expect(page.locator(".game-ui__run-continue")).toBeDisabled();
   const selected=view.progression.choices[1];
   await page.locator(".game-ui__upgrade-choices select").selectOption(selected);
   await page.locator(".game-ui__upgrade-choices button").tap();
   const upgraded=await getView(page);
   expect(upgraded.progression.run.upgradedWeapons).toContain(selected);
   expect(upgraded.progression.run.points).toBe(0);
   await expect(page.locator(".game-ui__run-continue")).toBeEnabled();
   await page.locator(".game-ui__run-continue").tap();
  }
 }
 const finished=await getView(page);
 expect(finished.progression.completedRuns).toBe(1);
 expect(finished.progression.medals).toEqual(["rookie","veteran","champion"]);
 await expect(page.locator(".game-ui__run-medals")).toContainText("قهرمان");
 await page.locator(".game-ui__run-leave").tap();
 expect(await status(page)).toBe("MENU");
 expect((await getView(page)).inRun).toBe(false);
 await page.locator('button[data-action="start"]').tap();
 expect(await status(page)).toBe("PLAYING");
 expect((await getView(page)).inRun).toBe(false);
});

test("pending reward and purchased upgrades survive reload; English Run copy switches",async({page})=>{
 await page.locator(".game-ui__run-new").tap();
 await page.evaluate(()=>window.__runFixture.win());
 await page.reload();
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 const resumed=await getView(page);
 expect(resumed.progression.run.status).toBe("victory");
 expect(resumed.inRun).toBe(true);
 await expect(page.locator(".game-ui__run-continue")).toBeDisabled();
 const id=resumed.progression.choices[0];
 await page.locator(".game-ui__upgrade-choices select").selectOption(id);
 await page.locator(".game-ui__upgrade-choices button").tap();
 await page.reload();
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 const loaded=await getView(page);
 expect(loaded.progression.run.upgradedWeapons).toContain(id);
 expect(loaded.progression.run.points).toBe(0);
 await page.locator(".game-ui__language button").tap();
 await expect(page.locator(".game-ui__run-heading")).toHaveText("FOUR-FIGHT RUN");
 await expect(page.locator(".game-ui__run-continue")).toHaveText("NEXT FIGHT");
 await page.locator(".game-ui__run-continue").tap();
 expect((await getView(page)).progression.run.stage).toBe(2);
});

test("a lost Run encounter can be retried; a reload during combat restarts the same wave",async({page})=>{
 await page.locator(".game-ui__run-new").tap();
 await page.evaluate(()=>window.__runFixture.lose());
 let progress=await getView(page);
 expect(progress.progression.totalWins).toBe(0);
 expect(progress.progression.run.status).toBe("defeat");
 await page.locator(".game-ui__run-continue").tap();
 expect((await getView(page)).progression.run.stage).toBe(1);
 await page.reload();
 await page.waitForFunction(()=>Boolean(window.__runFixture));
 progress=await getView(page);
 expect(progress.progression.run.status).toBe("ready");
 expect(progress.progression.run.stage).toBe(1);
 await page.locator(".game-ui__run-continue").tap();
 await page.evaluate(()=>window.__runFixture.win());
 expect((await getView(page)).progression.totalWins).toBe(1);
});

test("Android Back saves a retryable wave and an unfinished reward can reenter intermission",async({page})=>{
 await page.locator(".game-ui__run-new").tap();
 await page.evaluate(()=>window.__runFixture.back());
 let view=await getView(page);
 expect(await status(page)).toBe("MENU");
 expect(view.inRun).toBe(false);
 expect(view.progression.run.status).toBe("ready");
 await page.locator(".game-ui__run-continue").tap();
 expect(await status(page)).toBe("PLAYING");
 await page.evaluate(()=>window.__runFixture.win());
 view=await getView(page);
 expect(view.progression.run.status).toBe("victory");
 await page.evaluate(()=>window.__runFixture.back());
 expect(await status(page)).toBe("MENU");
 await expect(page.locator(".game-ui__run-continue")).toBeEnabled();
 await page.locator(".game-ui__run-continue").tap();
 view=await getView(page);
 expect(view.inRun).toBe(true);
 expect(view.progression.run.status).toBe("victory");
 await expect(page.locator(".game-ui__run-continue")).toBeDisabled();
 const choice=view.progression.choices[0];
 await page.locator(".game-ui__upgrade-choices select").selectOption(choice);
 await page.locator(".game-ui__upgrade-choices button").tap();
 await page.locator(".game-ui__run-continue").tap();
 expect((await getView(page)).progression.run.stage).toBe(2);
});

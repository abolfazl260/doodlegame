import {test,expect} from "@playwright/test";

test.use({viewport:{width:740,height:360},hasTouch:true,isMobile:true});
test.beforeEach(async({page})=>{
 await page.goto("tests/browser/run-progression.html");
 await page.waitForFunction(()=>Boolean(window.__runFixture));
});
test("Gravity Gauntlet is selectable, documents all four moves, and shows cooldowns on mobile",async({page})=>{
 await page.locator('.game-ui__quick-mode[data-quick-mode="duel"]').tap();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('button[data-action="next"]').tap();
 await page.locator('.game-ui__character-card[data-character="soldier"]').tap();
 const gauntlet=page.locator('[data-starting-weapon="gravity-gauntlet"]');
 await expect(gauntlet).toBeVisible();
 await gauntlet.tap();
 await expect(gauntlet).toHaveAttribute("aria-pressed","true");
 const guide=page.locator(".game-ui__gauntlet-guide");
 await expect(guide).toBeVisible();
 await expect(guide).toContainText(/Pulse Punch|ضربه/);
 await expect(guide).toContainText(/Mag Pull|کشش/);
 await expect(guide).toContainText(/Air Slam|کوبش/);
 await expect(guide).toContainText(/Perfect Parry|دفع/);
 await page.locator('button[data-action="start"]').tap();
 await expect.poll(()=>page.evaluate(()=>window.__runFixture.state())).toBe("PLAYING");
 await expect(page.locator(".game-ui__gauntlet-status")).toBeVisible();
 await expect(page.locator(".game-ui__gauntlet-status")).toContainText(/PULL READY|کشش آماده/);
 await expect(page.locator(".game-ui__gauntlet-status")).toContainText(/PARRY READY|دفع آماده/);
 expect((await page.evaluate(()=>window.__runFixture.view())).weapon).toBe("gravity-gauntlet");
});

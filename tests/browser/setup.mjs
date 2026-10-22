import {expect} from "@playwright/test";

// Follow the same three-step setup and explicit loadout confirmation as players.
export async function chooseLoadout(page,weapon="blade",secondWeapon="blade"){
 const panel=page.locator(".game-ui__menu-loadout-panel");
 for(let step=0;step<2&&!await panel.isVisible();step++)await page.locator('[data-action="next"]').click();
 await expect(panel).toBeVisible();
 const choose=async id=>{
  const random=page.locator(".game-ui__random-loadout");
  if(await random.isVisible())await random.click();
  else{
   const desired=page.locator(`[data-starting-weapon="${id}"]`);
   await (await desired.isVisible()?desired:page.locator('[data-starting-weapon]:visible').first()).click();
  }
 };
 await page.locator(".game-ui__loadout-player-tab").first().click();
 await choose(weapon);
 const second=page.locator(".game-ui__loadout-player-tab").nth(1);
 if(await second.isVisible()){await second.click();await choose(secondWeapon);}
 await expect(page.locator('[data-action="start"]')).toBeEnabled();
}
export async function startMatch(page,weapon="blade",secondWeapon="blade"){
 await chooseLoadout(page,weapon,secondWeapon);
 await page.locator('[data-action="start"]').click();
}
export async function launchRun(page,action="new"){
 await page.locator(`.game-ui__run-${action}`).click();
 if(await page.locator(".game-ui__menu-setup").isVisible())await startMatch(page);
}

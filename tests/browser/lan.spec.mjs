import {test,expect} from '@playwright/test';
test.setTimeout(45000);
test.use({viewport:{width:844,height:390},hasTouch:true,isMobile:true});
for(const role of ['host','guest'])for(const locale of ['fa','en'])test(`LAN ${role} ${locale}: room, ready, one control set, pause and disconnect`,async({page})=>{
 await page.addInitScript(l=>localStorage.setItem('doodlegame.locale',JSON.stringify(l)),locale);
 await page.goto(`tests/browser/lan.html?role=${role}`);await page.waitForFunction(()=>window.__lanFixture);
 await page.locator('[data-route="lan"]').click();const panel=page.locator('.lan-panel');await expect(panel).toBeVisible();
 if(role==='host'){
  await panel.getByRole('button',{name:locale==='fa'?'ساخت اتاق محلی':'Create LAN Room',exact:true}).click();
  await expect(panel.locator('.lan-panel__address')).toContainText('192.168.4.2:23000');
  await page.evaluate(()=>window.__lanFixture.joinPeer());
 }else{
  const room=await page.evaluate(()=>window.__lanFixture.hostRoom());
  await panel.getByRole('button',{name:locale==='fa'?'پیوستن به اتاق':'Join LAN Room',exact:true}).click();
  const fields=panel.locator('input');await fields.nth(0).fill(room.address);await fields.nth(1).fill(String(room.port));await fields.nth(2).fill(room.token);
  await panel.locator('button[type="submit"]').click();
 }
 await expect(panel.getByRole('status')).toContainText('2/2');
 const arena=panel.locator('#lan-arena');await expect(arena).toBeEnabled({enabled:role==='host'});
 if(role==='host')await arena.selectOption('moving');
 await panel.locator('#lan-weapon').selectOption('bow');
 const ready=panel.getByRole('button',{name:locale==='fa'?'آماده‌ام':'Ready',exact:true});await ready.click();await page.evaluate(()=>window.__lanFixture.peerReady());
 if(role==='host')await panel.getByRole('button',{name:locale==='fa'?'شروع مسابقه':'Start match',exact:true}).click();else await page.evaluate(()=>window.__lanFixture.startHost());
 await expect(panel).toBeHidden({timeout:7000});await expect(page.locator('.game-ui__mobile-controls')).toBeVisible();await expect(page.locator('.game-ui__lan-dash')).toBeVisible();await expect(page.locator('.game-ui__weapon-toggle').first()).toBeEnabled();await expect(page.locator('.game-ui__p2-controls')).toBeHidden();await expect(page.locator('.game-ui__p2-attack')).toBeHidden();await expect(page.locator('.game-ui__aim-pad[data-player="2"]')).toBeHidden();
 const joystick=page.locator('.game-ui__joystick');const box=await joystick.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x+box.width*.9,box.y+box.height/2);
 await expect.poll(()=>page.evaluate(()=>window.__lanFixture.state().localInput.moveX)).toBeGreaterThan(0);await page.mouse.up();
 await page.evaluate(()=>window.__lanFixture.pause());await expect(panel).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.__lanFixture.state().host)).toBe('paused');
 await expect.poll(()=>page.evaluate(()=>window.__lanFixture.state().localInput.moveX)).toBe(0);
 const resume=panel.getByRole('button',{name:locale==='fa'?'آماده ادامه‌ام':'Ready to resume',exact:true});await resume.click();await expect(panel).toBeVisible();
 await page.evaluate(()=>window.__lanFixture.peerReady());await expect(panel).toBeHidden({timeout:7000});
 await page.evaluate(()=>window.__lanFixture.drop());await expect(panel).toBeVisible();await expect.poll(()=>page.evaluate(()=>window.__lanFixture.state().host)).toBe('lost');
 await expect(panel.getByRole('alert')).toBeVisible();
 await panel.getByRole('button',{name:locale==='fa'?'خروج / بستن اتاق':'Leave / Close room',exact:true}).click();await expect(page.locator('[data-route="lan"]')).toBeVisible();
 await expect(page.locator('[data-mode="online"]')).toBeDisabled();
});
test('LAN join rejects a public IP and restores form after a failed connection',async({page})=>{
 await page.goto('tests/browser/lan.html?role=guest');await page.waitForFunction(()=>window.__lanFixture);await page.evaluate(()=>window.__lanFixture.locale('en'));
 await page.locator('[data-route="lan"]').click();const panel=page.locator('.lan-panel');await panel.getByRole('button',{name:'Join LAN Room',exact:true}).click();
 const fields=panel.locator('input');await fields.nth(0).fill('8.8.8.8');await fields.nth(1).fill('23000');await fields.nth(2).fill('0'.repeat(32));await panel.locator('button[type="submit"]').click();
 await expect(panel.getByRole('alert')).toContainText('private numeric IPv4');await expect(panel.locator('button[type="submit"]')).toBeEnabled();
});

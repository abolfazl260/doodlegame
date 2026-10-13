import test from 'node:test';import assert from 'node:assert/strict';
import {GUIDE_EN,GUIDE_FA,GUIDE_SECTION_IDS} from '../.test-build/i18n/GameGuide.js';
const weapons=['blade','hammer','blaster','uzi','boomerang','bow','bomb','missile'];
const modes=['duel','missile-duel','melee-only','random-weapons','sudden-death','low-gravity','king-of-hill','local-pvp'];
test('both guides completely cover every weapon, mode and required section',()=>{
 for(const guide of [GUIDE_EN,GUIDE_FA]){
  assert.deepEqual(Object.keys(guide.sections),[...GUIDE_SECTION_IDS]);assert.deepEqual(Object.keys(guide.weapons),weapons);assert.deepEqual(Object.keys(guide.modes),modes);
  for(const text of [...Object.values(guide.weapons),...Object.values(guide.modes)])assert.ok(text.length>60);
  assert.equal(guide.controls.length,6);assert.equal(guide.advanced.length,6);assert.equal(guide.local.length,3);
  const keys=[...guide.controls,...guide.advanced,...guide.local].map(x=>x.keys??'').join(' ');for(const key of ['Numpad1','Numpad5','Numpad8','PageUp','PageDown','Shift','Space'])assert.ok(keys.includes(key));
 }
});
test('guide reflects fixed Missile, start-only random assignment and distinct slam moves',()=>{
 assert.match(GUIDE_EN.weapons.missile,/fixed/);assert.match(GUIDE_FA.weapons.missile,/ثابت/);
 assert.match(GUIDE_EN.modes['random-weapons'],/do not automatically cycle/);assert.match(GUIDE_FA.modes['random-weapons'],/خودکار عوض نمی‌شود/);
 assert.match(GUIDE_EN.weapons.hammer,/not the airborne/);assert.match(GUIDE_EN.controls.find(x=>x.title==='Pause / Resume').body,/two seconds/);
 assert.match(GUIDE_EN.modes['king-of-hill'],/8 seconds/);assert.match(GUIDE_EN.progression.find(x=>x.title==='Career vs Run').body,/do not become permanent/);
});

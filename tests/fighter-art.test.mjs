import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../.test-build/gameplay/GameSession.js';
import {fighterVisual,fighterOutfit,FIGHTER_INK_WIDTH,weaponAccentColor,weaponAccentSegments,toolSegments} from '../.test-build/rendering/FighterVisual.js';

const session=new GameSession({getState(){return {}},endFrame(){}});
const base=session.getRenderState().player;

test('clothing follows the animated fighter, not its world position',()=>{
 for(const characterId of ['soldier','ninja'])for(const velocityX of [0,3,8]){
  const s={...base,characterId,velocityX,gaitPhase:1.7};
  const pose=fighterVisual(s),outfit=fighterOutfit(s,pose);
  assert.equal(outfit.vest.length,1);
  assert.equal(outfit.gear.length,6);
  assert.equal(outfit.hair.length,0);
  assert.deepEqual(outfit.vest[0],pose.body[0]);
  for(const segment of [...outfit.vest,...outfit.gear,...outfit.trim,...outfit.hair])
   assert.ok(segment.flat().every(Number.isFinite));
 }
});

test('all eight weapons retain silhouettes and get distinct accent geometry',()=>{
 const colors=new Set();
 for(const weapon of ['blade','hammer','blaster','uzi','bow','boomerang','bomb','missile']){
  const s={...base,weapon,weaponHolsterFrom:null,weaponDrawTime:0,grabPhase:null};
  const lines=weaponAccentSegments(s);
  assert.ok(lines.length>0,weapon+' should have identifiable inlays');
  assert.ok(toolSegments(s).length>=lines.length);
  assert.ok(lines.every(segment=>segment.flat().every(Number.isFinite)));
  colors.add(weaponAccentColor(s));
 }
 assert.equal(colors.size,8);
 const hidden={...base,weapon:'blade',grabPhase:'hold'};
 assert.equal(weaponAccentSegments(hidden).length,0);
});

test('Soldier and Ninja share slim stick limbs without shrinking faces or headbands',()=>{
 const {body,vest,gear,costume,weapon,head,marking}=FIGHTER_INK_WIDTH;
 assert.ok(body.halo<=.19&&body.outline<=.14&&body.core<=.095);
 assert.ok(vest.outline<=.31&&vest.core<=.235,"torso no longer looks bulky");
 assert.ok(gear.outline<=.17&&gear.core<=.115,"arms and legs remain narrow");
 assert.ok(costume.outline<=.105&&weapon.outline<=.125);
 assert.ok(body.halo>body.outline&&body.outline>body.core);
 assert.ok(vest.outline>vest.core&&gear.outline>gear.core);
 assert.deepEqual(head,{halo:.355,outline:.318,core:.274},"keep the head at original size");
 assert.deepEqual(marking,{outline:.125,core:.069},"preserve the visible headbands");
});

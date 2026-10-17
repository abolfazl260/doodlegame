import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../.test-build/gameplay/GameSession.js';
import {fighterVisual,fighterOutfit,FIGHTER_INK_WIDTH,weaponAccentColor,weaponAccentSegments,weaponStyleLayers,toolSegments} from '../.test-build/rendering/FighterVisual.js';

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

test('all nine weapons retain silhouettes and get distinct accent geometry',()=>{
 const colors=new Set();
 for(const weapon of ['blade','hammer','blaster','uzi','bow','boomerang','bomb','missile','spear']){
  const s={...base,weapon,weaponHolsterFrom:null,weaponDrawTime:0,grabPhase:null};
  const lines=weaponAccentSegments(s);
  assert.ok(lines.length>0,weapon+' should have identifiable inlays');
  assert.ok(toolSegments(s).length>=lines.length);
  assert.ok(lines.every(segment=>segment.flat().every(Number.isFinite)));
  colors.add(weaponAccentColor(s));
 }
 assert.equal(colors.size,9);
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
 assert.deepEqual(marking,{outline:.102,core:.057},"headbands remain legible with extra-slim outlines");
});

test('four redesigned weapons retain distinctive color layers and finite artwork',()=>{
 const expected={
  blade:['#c0d8eb','#1766c3','#f2c34b','#f5fcff'],
  hammer:['#a0aeba','#795032','#eab637','#dce7f0'],
  blaster:['#303a49','#1c2531','#f14655','#91a2b5'],
  bow:['#ad7138','#25ba79','#d9e1de','#72c944'],
  uzi:['#252e39','#35434e','#59d84f','#9aa9b5'],
  boomerang:['#253244','#249fff','#153752','#79d4ff'],
  bomb:['#222934','#454d58','#ff9a3d','#d9e0e6'],
  missile:['#f2f5f7','#ef4040','#dc3442','#ffc430'],
  spear:['#1858bf','#553a31','#d1dae3','#f6bf35']
 };
 const snapshot=JSON.stringify(base);
 for(const [weapon,colors] of Object.entries(expected)){
  for(const charge of [0,.5,1]){
   const s={...base,characterId:'soldier',weapon,bowCharge:charge};
   const layers=weaponStyleLayers(s),geometry=toolSegments(s);
   assert.deepEqual(layers.map(layer=>layer.color),colors,weapon+' layers match the reference palette');
   assert.ok(geometry.length>=5,weapon+' retains a readable silhouette');
   assert.ok(layers.every(layer=>layer.width>0&&layer.segments.length>0&&
    layer.segments.every(segment=>segment.flat().every(Number.isFinite))));
   assert.ok(weaponAccentSegments(s).length>0,weapon+' has a visible highlight');
  }
 }
 assert.equal(weaponStyleLayers({...base,characterId:'ninja',weapon:'blade'}).length,0,
  'existing Ninja dagger remains distinct from Soldier sword');
 for(const weapon of ['uzi','boomerang','bomb','missile']){
  assert.equal(weaponStyleLayers({...base,weapon}).length,4,weapon+' has four illustrated layers');
 }
 assert.equal(weaponStyleLayers({...base,weapon:'bow',grabPhase:'hold'}).length,0,
  'hidden grabbed weapon should not leave floating details');
 assert.deepEqual(JSON.stringify(base),snapshot,'procedural artwork must not mutate combat state');
});

test('thinner weapon ink and color layers preserve animated finite render geometry',()=>{
 const {weapon,body,vest,head}=FIGHTER_INK_WIDTH;
 assert.deepEqual(weapon,{outline:.082,core:.048,accent:.028});
 assert.ok(body.halo<=.16&&vest.outline<=.24);
 assert.deepEqual(head,{halo:.355,outline:.318,core:.274},'head must not shrink');
 for(const id of ['uzi','boomerang','bomb','missile']){
  const s={...base,weapon:id,weaponHolsterFrom:null,weaponDrawTime:0};
  const outlines=toolSegments(s);
  const styled=weaponStyleLayers(s);
  assert.ok(outlines.length>5);
  assert.equal(styled.length,4);
  for(const layer of styled){
   assert.ok(layer.width<=.22,'color overlays must not conceal the stick rig');
   assert.ok(layer.segments.length>0);
   assert.ok(layer.segments.every(([a,b])=>[...a,...b].every(Number.isFinite)));
  }
 }
 for(const t of [0,.15,.35,.8]){
  const bomb={...base,weapon:'bomb',animationTime:t};
  assert.ok(toolSegments(bomb).every(([a,b])=>[...a,...b].every(Number.isFinite)));
 }
});

test('all eight weapon paint layers have the approved extra-slim widths',()=>{
 const widths={
  blade:[.105,.064,.081,.028],
  hammer:[.22,.072,.055,.028],
  blaster:[.126,.086,.053,.025],
  bow:[.06,.10,.028,.047],
  uzi:[.119,.094,.053,.024],
  boomerang:[.081,.064,.034,.026],
  bomb:[.22,.037,.034,.021],
  missile:[.132,.068,.055,.045],
  spear:[.087,.070,.112,.065]
 };
 for(const [weapon,expected] of Object.entries(widths)){
  const state={...base,characterId:'soldier',weapon,weaponHolsterFrom:null,weaponDrawTime:0};
  assert.deepEqual(weaponStyleLayers(state).map(x=>x.width),expected,weapon+' preserves slimmer accent widths');
 }
 const {body,vest,gear,marking,head}=FIGHTER_INK_WIDTH;
 assert.deepEqual(body,{halo:.16,outline:.118,core:.08});
 assert.deepEqual(vest,{outline:.24,core:.18});
 assert.deepEqual(gear,{outline:.135,core:.092});
 assert.deepEqual(marking,{outline:.102,core:.057});
 assert.deepEqual(head,{halo:.355,outline:.318,core:.274});
});

test('Spear remains a readable thin silver-tip weapon for both fighters',()=>{
 for(const characterId of ['soldier','ninja']){
  const state={...base,weapon:'spear',characterId,weaponHolsterFrom:null};
  const geometry=toolSegments(state);
  const colors=weaponStyleLayers(state);
  assert.ok(geometry.length>=15);
  assert.deepEqual(colors.map(l=>l.color),['#1858bf','#553a31','#d1dae3','#f6bf35']);
  assert.ok(colors.every(l=>l.width<=.112));
  assert.ok(geometry.every(seg=>seg.flat().every(Number.isFinite)));
  assert.ok(geometry.some(seg=>seg.some(p=>p[0]>=1.3)),'silver tip reaches forward');
 }
 assert.equal(weaponStyleLayers({...base,weapon:'spear',grabPhase:'hold'}).length,0);
});

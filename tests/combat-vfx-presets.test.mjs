import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {combatCueArt,combatCueFrame,COMBAT_GLYPH_LINES,MAX_COMBAT_CUES} from "../.test-build/gameplay/CombatFeedback.js";
import {combatSoundProfile} from "../.test-build/audio/CombatSoundProfile.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

const weapons=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile","spear","grapple","gravity-gauntlet"];
const cue=(weapon,kind="hit",variant)=>({id:5,weapon,kind,variant,x:1,y:2,direction:1,intensity:1,age:.04,life:.28});

test("all eleven weapons map to finite bounded shared glyph geometry and opaque valid colors",()=>{
 for(const weapon of weapons)for(const kind of ["attack","hit","deflect","throw","explosion","slam","defeat"]){
  const art=combatCueArt(cue(weapon,kind));
  assert.match(art.color,/^#[0-9a-f]{6}$/i);
  assert.match(art.accent,/^#[0-9a-f]{6}$/i);
  assert.ok(art.radius>0&&art.radius<=2&&art.aspectY>0&&art.aspectY<=1);
  for(const alpha of [art.ringAlpha,art.lineAlpha,art.accentAlpha])assert.ok(alpha>=0&&alpha<=1);
  const shape=COMBAT_GLYPH_LINES[art.glyph];
  assert.ok(shape.main.length>0);
  for(const part of [shape.main,shape.accent])for(const segment of part){
   assert.equal(segment.length,4);
   assert.ok(segment.every(Number.isFinite));
  }
 }
 assert.equal(MAX_COMBAT_CUES,24,"visual count stays bounded");
});

test("whiff, contact, explosion and KO have visually distinct glyphs and no false hit ring",()=>{
 const bladeAttack=combatCueArt(cue("blade","attack"));
 const bladeHit=combatCueArt(cue("blade","hit"));
 assert.equal(bladeAttack.glyph,"slash");
 assert.equal(bladeAttack.ringAlpha,0,"a whiff cannot look like confirmed damage");
 assert.ok(bladeHit.ringAlpha>0);
 assert.equal(combatCueArt(cue("hammer","hit")).glyph,"smash");
 assert.equal(combatCueArt(cue("blaster","attack")).glyph,"muzzle");
 assert.equal(combatCueArt(cue("uzi","attack")).glyph,"muzzle");
 assert.equal(combatCueArt(cue("bow","hit")).glyph,"arrow");
 assert.equal(combatCueArt(cue("spear","hit")).glyph,"arrow");
 assert.equal(combatCueArt(cue("boomerang","attack")).glyph,"return");
 assert.equal(combatCueArt(cue("grapple","throw")).glyph,"hook");
 assert.equal(combatCueArt(cue("missile","explosion")).glyph,"blast");
 assert.ok(combatCueArt(cue("missile","explosion")).ringAlpha<=.1,"existing physical explosion already has a ring");
 assert.equal(combatCueArt(cue("blade","defeat")).glyph,"finish");
 assert.equal(combatCueArt(cue("hammer","hit")).aspectY,.63);
});

test("pull, attempted parry and successful reflection have separate presentation states",()=>{
 const pulling=combatCueArt(cue("gravity-gauntlet","deflect","pull"));
 const attempted=combatCueArt(cue("gravity-gauntlet","deflect","parry"));
 const reflected=combatCueArt(cue("gravity-gauntlet","deflect","parry-success"));
 assert.equal(pulling.glyph,"gravity");
 assert.equal(attempted.glyph,"shield");
 assert.equal(reflected.glyph,"shield");
 assert.notEqual(pulling.color,reflected.color);
 assert.ok(combatSoundProfile(cue("gravity-gauntlet","deflect","parry-success")).volume>
  combatSoundProfile(cue("gravity-gauntlet","deflect","parry")).volume);
});

test("fade and scale are deterministic, finite and motion-reduction safe",()=>{
 for(const t of [0,.08,.14,.28,.4]){
  const c={...cue("hammer","hit"),age:t};
  const normal=combatCueFrame(c),reduced=combatCueFrame(c,true);
  assert.deepEqual(combatCueFrame(c),normal);
  assert.ok(Number.isFinite(normal.fade)&&normal.fade>=0&&normal.fade<=1);
  assert.ok(Number.isFinite(normal.size)&&normal.size>0);
  assert.ok(reduced.size<=1.84,"reduced motion uses a constant no-zoom profile");
 }
 assert.equal(combatCueFrame({...cue("blade"),life:0}).fade,0);
});

test("short synthesized sound envelopes distinguish weapons and prioritize restrained KO",()=>{
 const hammer=combatSoundProfile(cue("hammer","hit")),blade=combatSoundProfile(cue("blade","hit"));
 const uzi=combatSoundProfile(cue("uzi","attack")),bow=combatSoundProfile(cue("bow","attack"));
 const finish=combatSoundProfile(cue("blade","defeat"));
 assert.ok(hammer.frequency<blade.frequency);
 assert.ok(hammer.duration>blade.duration);
 assert.ok(uzi.volume<hammer.volume);
 assert.notEqual(bow.wave,uzi.wave);
 assert.ok(finish.duration>hammer.duration);
 for(const weapon of weapons)for(const kind of ["attack","hit","deflect","explosion","slam","defeat"]){
  const sound=combatSoundProfile(cue(weapon,kind));
  assert.ok(sound.duration>0&&sound.duration<=.3);
  assert.ok(sound.volume>0&&sound.volume<=.15);
  assert.ok(sound.frequency>=50&&sound.frequency<1000);
  assert.ok(sound.bend>0);
 }
});

test("both renderers consume identical shared profiles and WebGL caches glyph geometry",()=>{
 const canvas=readFileSync("src/rendering/CanvasRenderer.ts","utf8");
 const webgl=readFileSync("src/rendering/ThreeRenderer.ts","utf8");
 for(const source of [canvas,webgl]){
  assert.match(source,/combatCueArt\(cue\)/);
  assert.match(source,/combatCueFrame\(cue,reduced\)/);
  assert.match(source,/COMBAT_GLYPH_LINES/);
  assert.match(source,/prefers-reduced-motion: reduce/);
 }
 assert.match(webgl,/combatGlyphGeometry=new Map/);
 assert.match(webgl,/getCombatGlyphGeometry\(art\.glyph\)/);
 const audio=readFileSync("src/audio/CombatAudio.ts","utf8");
 assert.match(audio,/combatSoundProfile\(cue\)/);
 assert.match(audio,/if\(!this\.muted&&cue\.age<\.1\)this\.play\(cue\)/);
});

test("win emits the existing defeat cue without any change to HP outcome",()=>{
 const idle={moveX:0,moveY:0,pointerX:0,pointerY:0,attackHeld:false,attackPressed:false,jumpPressed:false,dashPressed:false,grabPressed:false};
 const input={getState:()=>idle,endFrame(){}};
 const game=new GameSession(input);
 const enemy=game.opponent;
 game.damage(enemy,100,0,"hammer");
 game.update(1/60);
 const state=game.getRenderState();
 assert.equal(enemy.health,0);
 assert.equal(state.winner,"player");
 assert.equal(state.combatCues.filter(x=>x.kind==="defeat").length,1);
 assert.equal(combatCueArt(state.combatCues.find(x=>x.kind==="defeat")).glyph,"finish");
 game.dispose();
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {combatShake,MAX_COMBAT_CUES} from "../.test-build/gameplay/CombatFeedback.js";

const neutral={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
function create(){
 const input={state:{...neutral},getState(){return this.state},endFrame(){this.state={...this.state,attackPressed:false,jumpPressed:false,dashPressed:false}}};
 return new GameSession(input);
}

test("attacks create presentation cues without inventing a hit or damaging targets",()=>{
 const game=create();
 game.setStartingWeapon("hammer");
 const originalHP=game.getRenderState().opponent.health;
 game.fireWeapon();
 const state=game.getRenderState();
 assert.equal(state.combatCues.filter(c=>c.kind==="attack").length,1);
 assert.equal(state.combatCues.filter(c=>c.kind==="hit").length,0);
 assert.equal(state.opponent.health,originalHP);
 assert.equal(state.combatCues[0].weapon,"hammer");
 game.dispose();
});

test("damage applies only once and produces a bounded hit cue",()=>{
 const game=create(),target=game.opponent;
 const hp=target.health;
 game.damage(target,15,6,"hammer");
 assert.equal(target.health,hp-15);
 assert.equal(game.getRenderState().combatCues.filter(c=>c.kind==="hit").length,1);
 assert.ok(game.getRenderState().cameraShake.x<=.2);
 assert.ok(game.getRenderState().cameraShake.y<=.15);
 game.setShakeEnabled(false);
 assert.deepEqual(game.getRenderState().cameraShake,{x:0,y:0});
 // Motion setting must not modify the actual physics/damage path.
 const after=target.health;
 game.damage(target,10,6,"hammer");
 assert.equal(target.health,after-10);
 game.dispose();
});

test("presentation cues expire, never grow without bound, and reset between rounds",()=>{
 const game=create();
 for(let i=0;i<65;i++)game.emitCue("hit","uzi",0,1,1,.75);
 const current=game.getRenderState().combatCues;
 assert.equal(current.length,MAX_COMBAT_CUES);
 assert.ok(current.every(c=>c.id>0&&c.life>0));
 assert.ok(current.every((c,i)=>i===0||c.id>current[i-1].id));
 for(let i=0;i<45;i++)game.update(1/60);
 assert.equal(game.getRenderState().combatCues.length,0);
 game.emitCue("explosion","bomb",0,0,1,1.5);
 assert.equal(game.getRenderState().combatCues.length,1);
 game.reset();
 assert.equal(game.getRenderState().combatCues.length,0);
 game.dispose();
});

test("visual hit-stop freezes animation only while simulation proceeds",()=>{
 const game=create();
 game.damage(game.opponent,25,-6,"hammer");
 const before=game.getRenderState();
 game.update(1/60);
 const during=game.getRenderState();
 assert.equal(during.player.animationTime,before.player.animationTime);
 assert.notEqual(during.opponent.x,before.opponent.x,"fighter physics must continue during cosmetic hit-stop");
 for(let i=0;i<5;i++)game.update(1/60);
 assert.ok(game.getRenderState().player.animationTime>before.player.animationTime);
 game.dispose();
});

test("missile launch and explosion retain collision behavior with distinct cues",()=>{
 const game=create();
 game.setArena("fortress");
 const prevHealth=game.getRenderState().opponent.health;
 game.fireWeapon();
 let state=game.getRenderState();
 assert.equal(state.projectiles.length,1);
 assert.equal(state.combatCues.filter(c=>c.kind==="attack").length,1);
 assert.equal(state.opponent.health,prevHealth);
 game.explodeMissile(game.projectiles[0]);
 state=game.getRenderState();
 assert.equal(state.combatCues.filter(c=>c.kind==="explosion").length,1);
 assert.ok(state.explosions.length>0);
 game.dispose();
});

test("both rendering backends expose identical combat cue rendering paths",()=>{
 const canvas=readFileSync("src/rendering/CanvasRenderer.ts","utf8");
 const three=readFileSync("src/rendering/ThreeRenderer.ts","utf8");
 assert.match(canvas,/drawCombatCues\(c,state,toX,toY,scale\)/);
 assert.match(three,/drawCombatCues\(state\)/);
 assert.match(canvas,/state\.cameraShake/);
 assert.match(three,/state\.cameraShake/);
 const sound=readFileSync("src/audio/CombatAudio.ts","utf8");
 assert.match(sound,/addEventListener\("pointerdown",this\.unlock/);
 assert.match(sound,/if\(!this\.muted&&cue\.age<\.1\)this\.play\(cue\)/);
});

test("shake is deterministic, finite, limited, and can be disabled",()=>{
 const cue={id:19,kind:"explosion",weapon:"missile",x:1,y:2,age:.06,life:.42,direction:1,intensity:2};
 const result=combatShake([cue],true);
 assert.deepEqual(combatShake([cue],true),result);
 assert.ok(Number.isFinite(result.x)&&Math.abs(result.x)<=.2);
 assert.ok(Number.isFinite(result.y)&&Math.abs(result.y)<=.15);
 assert.deepEqual(combatShake([cue],false),{x:0,y:0});
});

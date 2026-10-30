import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {cueLife,formatAppliedDamage,visibleDamageCues,damageLabelFrame,MAX_DAMAGE_LABELS} from "../.test-build/gameplay/CombatFeedback.js";

const idle=()=>({moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,
 attackHeld:false,attackCancelled:false,jumpPressed:false,dashPressed:false,grabPressed:false,
 attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false});
function session(){
 const input={state:idle(),getState(){return this.state},getPlayer2State(){return idle()},
  endFrame(){this.state={...this.state,attackPressed:false,grabPressed:false}},setLocalPvPEnabled(){}};
 const game=new GameSession(input);
 return game;
}
const latestHit=(game)=>game.getRenderState().combatCues.filter(c=>c.kind==="hit").at(-1);

test("damage cue reports post-mutation HP delta, not nominal attack or overkill",()=>{
 const game=session(),target=game.opponent;
 const before=target.health;
 game.damage(target,13.75,6,"spear");
 const cue=latestHit(game);
 assert.equal(target.health,before-13.75);
 assert.equal(cue.appliedDamage,13.75);assert.equal(cue.target,"opponent");
 assert.equal(cue.damageSource,"weapon");assert.equal(cue.weapon,"spear");
 target.health=4.5;
 game.damage(target,190,7,"hammer");
 assert.equal(target.health,0);
 assert.equal(latestHit(game).appliedDamage,4.5,"finishing blow cannot display overkill value");
 assert.equal(formatAppliedDamage(latestHit(game).appliedDamage),"-4.5");
 const hits=game.getRenderState().combatCues.filter(c=>c.kind==="hit");
 assert.equal(hits.length,2);
 game.dispose();
});
test("scaled missile splash creates one exact damage value per damaged fighter",()=>{
 const game=session();game.setArena("fortress");
 // Isolate the missile AoE from fortress barrels that can chain-explode.
 game.environment=[];
 game.player.x=-.25;game.opponent.x=.35;
 game.player.y=0;game.opponent.y=0;
 const oldP=game.player.health,oldO=game.opponent.health;
 const projectile={x:0,y:.35,vx:5,vy:0,life:1,weapon:"missile",owner:"player",originX:-2,
  returning:false,spin:0,age:0,bounce:0,ricochets:0,damageScale:.58,clusterChild:true};
 game.explodeMissile(projectile);
 const hits=game.getRenderState().combatCues.filter(c=>c.kind==="hit");
 assert.equal(hits.length,2,"one independent number for each accepted splash hit");
 for(const h of hits){
  const lost=h.target==="player"?oldP-game.player.health:oldO-game.opponent.health;
  assert.ok(lost>0&&lost<22);
  assert.ok(Math.abs(h.appliedDamage-lost)<1e-9);
  assert.equal(h.weapon,"missile");
 }
 game.dispose();
});
test("sudden death reports exact remaining HP, not base weapon damage",()=>{
 const game=session();game.setMode("sudden-death");
 const target=game.opponent;target.health=43.25;
 game.damage(target,4,0,"uzi");
 assert.equal(target.health,0);
 assert.equal(latestHit(game).appliedDamage,43.25);
 game.dispose();
});
test("blocked, missed, dead-target and non-damaging cues never show numbers",()=>{
 const game=session();
 game.setStartingWeapon("hammer");game.fireWeapon();
 assert.equal(visibleDamageCues(game.getRenderState().combatCues).length,0);
 game.emitCue("deflect","gravity-gauntlet",0,0,1,1,"parry-success");
 game.emitCue("block","hammer",0,0,1);
 game.emitCue("hit","blade",0,0,1);
 assert.equal(visibleDamageCues(game.getRenderState().combatCues).length,0);
 game.opponent.health=0;game.damage(game.opponent,7,0,"blade");
 assert.equal(visibleDamageCues(game.getRenderState().combatCues).length,0);
 game.dispose();
});
test("direct trap and vent damage label uses hazard origin; trap recoil is retained",()=>{
 const game=session(),target=game.opponent;
 target.health=50;target.velocityY=0;
 const trap={kind:"trap",x:target.x,y:target.y-1.05,width:1.2,height:.3,hp:1,maxHp:1,active:true,
 rotation:0,pulse:0,warning:0,falling:false,vx:0,vy:0,grounded:true,cooldown:0,timer:0};
 game.environment=[trap];
 game.resolveEnvironmentFighter(target);
 assert.equal(target.health,32);
 assert.equal(target.velocityY,10);
 assert.equal(latestHit(game).appliedDamage,18);
 assert.equal(latestHit(game).damageSource,"hazard");
 assert.equal(latestHit(game).target,"opponent");
 const first=game.getRenderState().combatCues.length;
 game.resolveEnvironmentFighter(target);
 assert.equal(game.getRenderState().combatCues.length,first,"trap cooldown prevents duplicate label");
 game.dispose();
});
test("pit fall death is a KO outcome, not a fictitious ordinary hit",()=>{
 const game=session();game.setArena("pit");const player=game.player;
 player.x=0;player.y=-10;player.velocityY=-2;
 game.integrate(player,1/60);
 assert.equal(player.health,0);
 assert.equal(game.getRenderState().combatCues.filter(c=>c.kind==="hit"&&c.appliedDamage!==undefined).length,0);
 game.dispose();
});
test("fraction formatting preserves positive tiny HP deltas and removes false zero labels",()=>{
 for(const [amount,text] of [[20,"-20"],[3.5,"-3.5"],[.125,"-0.13"],[.005,"-0.005"],[.0000002,"-2e-7"]]){
  assert.equal(formatAppliedDamage(amount),text);
 }
 for(const value of [0,-1,NaN,Infinity])assert.equal(formatAppliedDamage(value),"");
});
test("bounded labels expire after 480ms and reposition with a moving fighter",()=>{
 const cue=(id,age=0,extra={})=>({id,kind:"hit",weapon:"uzi",x:0,y:1,age,life:cueLife("hit"),
  direction:1,intensity:.5,appliedDamage:4,target:"opponent",damageSource:"weapon",...extra});
 const items=Array.from({length:32},(_,i)=>cue(i+1));
 assert.equal(MAX_DAMAGE_LABELS,12);
 const visible=visibleDamageCues(items);
 assert.equal(visible.length,12);
 assert.deepEqual(visible.map(c=>c.id),Array.from({length:12},(_,i)=>i+21));
 const original=damageLabelFrame(cue(28,.1),{x:3,y:4});
 const moved=damageLabelFrame(cue(28,.1),{x:8,y:7});
 assert.equal(moved.x-original.x,5);
 assert.ok(Math.abs((moved.y-original.y)-3)<1e-10);
 const later=damageLabelFrame(cue(28,.25),{x:3,y:4});
 assert.ok(later.y>original.y&&later.alpha<original.alpha);
 const reduced=damageLabelFrame(cue(28,.25),{x:3,y:4},true);
 assert.ok(reduced.y<later.y,"reduced motion keeps stationary-ish readable feedback");
 assert.equal(damageLabelFrame(cue(28,.48),{x:0,y:0}),null);
 assert.equal(visibleDamageCues([cue(1,0,{appliedDamage:0}),cue(2,.48),cue(3,0,{appliedDamage:NaN})]).length,0);
});
test("render backends use one shared presentation pipeline, bounded GPU sprite textures",()=>{
 const canvas=readFileSync("src/rendering/CanvasRenderer.ts","utf8");
 const three=readFileSync("src/rendering/ThreeRenderer.ts","utf8");
 for(const source of [canvas,three]){
  assert.match(source,/visibleDamageCues\(state\.combatCues\)/);
  assert.match(source,/damageLabelFrame\(cue,anchor,reduced\)/);
 }
 assert.match(canvas,/strokeText\(label\.text/);
 assert.match(canvas,/fillText\(label\.text/);
 assert.match(three,/while\(this\.damageVisuals\.length<cues\.length\)/);
 assert.match(three,/visual\.cueId!==cue\.id/);
 assert.match(three,/visual\.texture\.needsUpdate=true/);
 assert.match(three,/visual\.texture\.dispose\(\)/);
});

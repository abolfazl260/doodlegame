import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

const idle={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
function create(arena){
 const input={state:{...idle},getState(){return this.state;},endFrame(){}};
 const session=new GameSession(input);session.setArena(arena);
 return session;
}
function tickEnvironment(session,seconds){
 const steps=Math.ceil(seconds*120);
 for(let i=0;i<steps;i++)session.updateEnvironment(seconds/steps);
}
test("Fortress adds separate destructible cover openings without changing player boundaries",()=>{
 const game=create("fortress");
 const walls=game.environment.filter(e=>e.kind==="wall");
 assert.equal(walls.length,4);
 assert.ok(walls.some(e=>Math.abs(e.x)>4));
 const wall=walls.find(e=>e.x>4);
 assert.equal(game.hitEnvironment(wall.x,wall.y,12,5,"player"),true);
 assert.equal(wall.active,true);
 assert.equal(wall.hp,12);
 assert.equal(game.hitEnvironment(wall.x,wall.y,12,5,"player"),true);
 assert.equal(wall.active,false);
 assert.ok(game.getRenderState().debris.length>=4);
 assert.equal(game.hitEnvironment(wall.x,wall.y,10,5,"player"),false);
 assert.equal(game.getRenderState().debris.length,4,"destroyed wall must not spawn debris twice");
 game.reset(false);
 const restored=game.environment.find(e=>e.x===wall.x&&e.kind==="wall");
 assert.equal(restored.active,true);
 assert.equal(restored.hp,24);
 assert.equal(game.getRenderState().debris.length,0);
});

test("bridge sections warn for over half a second and then disappear",()=>{
 const game=create("bridge"),section=game.environment[1];
 const top=section.y+section.height/2;
 game.damageEnvironmentBody(section,999,10);
 assert.equal(section.hp,0);
 assert.equal(section.active,true);
 assert.ok(section.warning>.9);
 game.player.x=section.x;game.player.y=top+.9;game.player.grounded=true;
 tickEnvironment(game,.3);
 assert.equal(section.active,true);
 assert.ok(section.warning>0&&section.warning<1);
 tickEnvironment(game,.34);
 assert.equal(section.active,false);
 assert.equal(section.warning,0);
 assert.ok(game.getRenderState().debris.some(d=>Math.abs(d.x-section.x)<1.2));
 game.player.grounded=false;game.player.velocityY=-2;game.player.y=top+1.1;
 game.integrate(game.player,.05);
 assert.equal(game.player.grounded,false);
 game.reset(false);
 assert.ok(game.environment.every(e=>e.active&&e.hp===e.maxHp));
});

test("Crater vents give visible warnings, cycle, and only damage during a bounded pulse",()=>{
 const game=create("crater");
 const vents=game.environment.filter(e=>e.kind==="vent");
 assert.equal(vents.length,2);
 const e=vents[0];
 game.player.x=e.x;game.player.y=e.y+e.height/2+.9;game.player.grounded=true;
 const full=game.player.health;
 tickEnvironment(game,Math.max(0,e.timer-.6));
 assert.ok(e.warning>0,"warning must precede any eruption");
 game.resolveEnvironmentFighter(game.player);
 assert.equal(game.player.health,full);
 tickEnvironment(game,.62);
 assert.ok(e.pulse>0);
 game.resolveEnvironmentFighter(game.player);
 assert.equal(game.player.health,full-11);
 game.resolveEnvironmentFighter(game.player);
 assert.equal(game.player.health,full-11,"damage cooldown prevents per-frame repeat hits");
 tickEnvironment(game,.7);
 assert.equal(e.pulse,0);
 const after=game.player.health;
 game.resolveEnvironmentFighter(game.player);
 assert.equal(game.player.health,after);
 assert.ok(e.timer>0,"vent re-arms rather than remaining active");
 game.reset(false);
 assert.equal(game.environment.filter(e=>e.kind==="vent").length,2);
 assert.ok(game.environment.every(e=>e.warning===0&&e.pulse===0));
});

test("Ruins rocks telegraph before falling and impact only once",()=>{
 const game=create("ruins");
 const rocks=game.environment.filter(e=>e.kind==="fallingRock");
 assert.equal(rocks.length,2);
 const rock=rocks[0];
 game.player.x=rock.x;game.player.y=3.1;game.player.grounded=false;
 const original=game.player.health;
 tickEnvironment(game,.45);
 assert.equal(rock.falling,false);
 assert.ok(rock.warning>0);
 assert.equal(game.player.health,original);
 tickEnvironment(game,.9);
 assert.equal(rock.falling,true);
 let hit=false;
 for(let i=0;i<200;i++){
  game.updateEnvironment(1/120);
  if(game.player.health<original){hit=true;break;}
 }
 assert.equal(hit,true,"rock should hit a fighter who ignores warning");
 assert.equal(rock.active,false);
 assert.equal(game.player.health,original-16);
 tickEnvironment(game,2);
 assert.equal(game.player.health,original-16,"inactive debris is non-colliding");
 game.reset(false);
 assert.ok(game.environment.filter(e=>e.kind==="fallingRock").every(e=>e.active&&!e.falling));
});

test("simultaneous destruction remains bounded and debris cannot create soft locks",()=>{
 const game=create("fortress");
 for(const e of [...game.environment]){
  if(!e.active)continue;
  if(e.kind==="barrel")game.explodeBarrel(e,1);
  else game.damageEnvironmentBody(e,200,0);
 }
 assert.ok(game.debris.length<=36);
 assert.ok(game.debris.every(d=>Number.isFinite(d.x)&&Number.isFinite(d.y)));
 assert.equal(game.projectiles.length,0);
 assert.ok(game.player.health>=0&&game.opponent.health>=0);
 assert.equal(game.debris.every(d=>"hp" in d===false),true);
 game.updateDebris(2);
 assert.equal(game.debris.length,0);
});

test("hazard and debris drawing are present in both rendering paths",()=>{
 const canvas=readFileSync("src/rendering/CanvasRenderer.ts","utf8");
 const webgl=readFileSync("src/rendering/ThreeRenderer.ts","utf8");
 for(const kind of ["vent","fallingRock"]){
  assert.ok(canvas.includes('e.kind==="'+kind+'"'));
  assert.ok(webgl.includes('kind==="'+kind+'"'));
 }
 assert.match(canvas,/drawArenaHazards\(c,state,toX,toY,scale\)/);
 assert.match(canvas,/drawArenaDebris\(c,state,toX,toY,scale\)/);
 assert.match(webgl,/drawArenaDebris\(state\)/);
 assert.match(webgl,/g\.userData\.warning/);
});

test("all sixteen arenas retain finite physical states with new hazards at 30/60/120 FPS",()=>{
 for(const id of ["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"]){
  for(const fps of [30,60,120]){
   const game=create(id);
   for(let i=0;i<fps*3;i++)game.update(1/fps);
   const r=game.getRenderState();
   assert.ok([...r.environment.flatMap(e=>[e.x,e.y,e.hp,e.warning,e.pulse]),...r.debris.flatMap(d=>[d.x,d.y,d.age,d.size])].every(Number.isFinite),id);
   assert.ok(r.debris.length<=36);
  }
 }
});

import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {combatCameraFrame} from "../.test-build/rendering/CombatCamera.js";

const arenas=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
const neutral={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
function setup(id){
 const input={state:{...neutral},getState(){return this.state},endFrame(){this.state={...this.state,attackPressed:false,jumpPressed:false,dashPressed:false}}};
 const game=new GameSession(input);
 game.setArena(id);
 // Isolate idle spawn, collisions and camera behavior from autonomous enemy decisions.
 game.updateOpponent=()=>{};
 return game;
}
function cameraContains(frame,state,aspect){
 const halfW=frame.height*aspect/2,halfH=frame.height/2;
 for(const fighter of [state.player,state.opponent]){
  assert.ok(fighter.x-.8>=frame.x-halfW-1e-6&&fighter.x+.8<=frame.x+halfW+1e-6,"fighter clipped horizontally");
  assert.ok(fighter.y-1>=frame.y-halfH-1e-6&&fighter.y+1<=frame.y+halfH+1e-6,"fighter clipped vertically");
 }
}
test("all sixteen arenas keep a freshly spawned, idle fighter on its original X through the first substep",()=>{
 for(const id of arenas){
  const game=setup(id);
  const initial=game.getRenderState();
  assert.ok(initial.player.x<initial.opponent.x,id);
  for(const fighter of [game.player,game.opponent]){
   const bounds=game.fighterHorizontalBounds(fighter);
   assert.ok(fighter.x>=bounds.min&&fighter.x<=bounds.max,id+":spawn in playable area");
   assert.ok(game.platforms.some(p=>fighter.x>=p.x&&fighter.x<=p.x+p.width&&
    Math.abs(fighter.y-1.8/2-(p.y+p.height))<.01),id+":spawn on actual platform");
  }
  game.update(1/120);
  const after=game.getRenderState();
  assert.ok(Math.abs(after.player.x-initial.player.x)<.12,id+":player teleported at start");
  assert.ok(Math.abs(after.opponent.x-initial.opponent.x)<.12,id+":enemy teleported at start");
  game.dispose();
 }
});

test("arena geometry, not a global +/-6 clamp, defines safe fighter-center boundaries",()=>{
 for(const id of arenas){
  const game=setup(id);
  for(const fighter of [game.player,game.opponent]){
   const {min,max}=game.fighterHorizontalBounds(fighter);
   assert.ok(min<=fighter.x&&fighter.x<=max,id);
   assert.ok(max>7&&min< -7,id+" should preserve the outer arena space");
   for(const [attempt,velocity,expected] of [[min-40,-18,min],[max+40,18,max]]){
    fighter.x=attempt;fighter.y=8;fighter.grounded=false;fighter.velocityX=velocity;
    game.integrate(fighter,1/120);
    assert.ok(Math.abs(fighter.x-expected)<1e-8,id+":physics edge policy");
    assert.equal(fighter.velocityX,0,id+":outward velocity cleared");
    fighter.x=attempt;fighter.velocityX=velocity;
    game.resolveStaticHorizontalOverlap(fighter,attempt);
    assert.ok(Math.abs(fighter.x-expected)<1e-8,id+":collision edge policy");
   }
  }
  game.dispose();
 }
});

test("Fortress Duel keeps player/opponent on separate halves without constricting other modes",()=>{
 const game=setup("fortress");
 assert.deepEqual(game.fighterHorizontalBounds(game.player),{min:-11.6,max:-2.6});
 assert.deepEqual(game.fighterHorizontalBounds(game.opponent),{min:2.6,max:11.6});
 game.player.x=0;game.opponent.x=0;
 game.player.y=game.opponent.y=8;
 game.integrate(game.player,1/120);game.resolveStaticHorizontalOverlap(game.opponent,0);
 assert.equal(game.player.x,-2.6);
 assert.equal(game.opponent.x,2.6);
 game.setMode("missile-duel");
 assert.deepEqual(game.fighterHorizontalBounds(game.player),{min:-11.6,max:11.6});
 game.setMode("melee-only");
 assert.deepEqual(game.fighterHorizontalBounds(game.opponent),{min:-11.6,max:11.6});
 game.dispose();
});

test("gap arenas keep fall deaths, recover from reset and never invent an invisible side wall",()=>{
 for(const id of ["pit","bridge","crater","ruins","collapse"]){
  const game=setup(id),fall=game.getArena().fallLimit;
  assert.ok(fall!==null,id);
  const gap=game.platforms.some(p=>p.x>0);
  assert.ok(gap,id+":distinct platform sections");
  game.player.x=0;game.player.y=fall-2;game.player.velocityY=-1;game.player.grounded=false;
  game.integrate(game.player,1/120);
  assert.equal(game.player.health,0,id+":fall-zone elimination preserved");
  game.reset(false);
  assert.equal(game.player.health,100,id+":round reset restored fighter");
  game.dispose();
 }
});

test("shared camera shows distant starts, extreme platform edges and vertical movement at several aspect ratios",()=>{
 for(const id of arenas){
  const game=setup(id);
  for(const aspect of [16/9,4/3,2.35]){
   const pair=game.getRenderState();
   let frame=combatCameraFrame(pair,aspect);
   cameraContains(frame,pair,aspect);
   const bounds=game.fighterHorizontalBounds(game.player);
   const extremes={player:{x:bounds.min,y:1.15},opponent:{x:bounds.max,y:7.5}};
   const wider=combatCameraFrame(extremes,aspect,frame);
   cameraContains(wider,extremes,aspect);
   assert.ok(wider.height>=10&&Number.isFinite(wider.x)&&Number.isFinite(wider.y),id);
   for(let i=0;i<45;i++){
    frame=combatCameraFrame(pair,aspect,wider);
    cameraContains(frame,pair,aspect);
   }
  }
  game.dispose();
 }
});

test("Canvas and WebGL renderers both use the identical frame and respect camera shake",()=>{
 const canvas=readFileSync("src/rendering/CanvasRenderer.ts","utf8");
 const webgl=readFileSync("src/rendering/ThreeRenderer.ts","utf8");
 const gameplay=readFileSync("src/gameplay/GameSession.ts","utf8");
 assert.match(canvas,/combatCameraFrame\(state,aspect,previous\)/);
 assert.match(webgl,/combatCameraFrame\(state,aspect,previous\)/);
 assert.match(canvas,/frame\.height/);
 assert.match(webgl,/this\.cameraFrame\.height/);
 assert.match(canvas,/state\.cameraShake\.x/);
 assert.match(webgl,/state\.cameraShake\.x/);
 assert.doesNotMatch(gameplay,/screenMin=-6|screenMax=6/);
});

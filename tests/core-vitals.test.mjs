import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameLoop} from '../.test-build/core/GameLoop.js';
import {GameSession} from '../.test-build/gameplay/GameSession.js';
import {installWebVisibilityLifecycle} from '../.test-build/platform/web/WebVisibilityLifecycle.js';
import {createRendererWithFallback} from '../.test-build/rendering/RendererFactory.js';
import {WebGLContextLifecycle} from '../.test-build/rendering/WebGLContextLifecycle.js';

const idle={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};

function fakeScheduler(){
 let next=0;
 const callbacks=new Map();
 return{
  scheduler:{
   request(callback){const id=++next;callbacks.set(id,callback);return id;},
   cancel(id){callbacks.delete(id);}
  },
  get pending(){return callbacks.size;},
  run(time){
   const entry=callbacks.entries().next().value;
   assert.ok(entry,'expected a scheduled frame');
   const [id,callback]=entry;
   callbacks.delete(id);
   callback(time);
  }
 };
}

function session(){
 const input={
  state:{...idle},
  getState(){return this.state;},
  endFrame(){this.state={...this.state,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};}
 };
 return{game:new GameSession(input),input};
}

test('repeated start/resume calls never create duplicate game-loop frames',()=>{
 const scheduled=fakeScheduler();
 let updates=0,renders=0,errors=0;
 const loop=new GameLoop(scheduled.scheduler,()=>updates++,()=>renders++,()=>errors++);
 loop.start();loop.start();loop.start();
 assert.equal(scheduled.pending,1);
 scheduled.run(1000);
 assert.equal(updates,1);assert.equal(renders,1);assert.equal(scheduled.pending,1);
 loop.stop();loop.stop();
 assert.equal(scheduled.pending,0);
 loop.start();loop.start();
 assert.equal(scheduled.pending,1);
 scheduled.run(1016);
 assert.equal(updates,2);assert.equal(renders,2);assert.equal(scheduled.pending,1);
 loop.dispose();
 assert.equal(scheduled.pending,0);assert.equal(errors,0);
});

test('game-loop runtime errors stop the loop instead of creating a crash loop',()=>{
 const scheduled=fakeScheduler();
 let errors=0;
 const loop=new GameLoop(scheduled.scheduler,()=>{throw new Error('boom');},()=>{},()=>errors++);
 loop.start();
 scheduled.run(1000);
 assert.equal(errors,1);
 assert.equal(scheduled.pending,0);
 loop.start();
 assert.equal(scheduled.pending,1);
 loop.dispose();
});

test('renderer initialization falls back exactly once when WebGL setup throws',()=>{
 const fallbackRenderer={resize(){},render(){},dispose(){}};
 let warnings=0,fallbacks=0;
 const renderer=createRendererWithFallback(
  ()=>{throw new Error('WebGL unavailable');},
  ()=>{fallbacks++;return fallbackRenderer;},
  ()=>warnings++
 );
 assert.equal(renderer,fallbackRenderer);
 assert.equal(warnings,1);
 assert.equal(fallbacks,1);

 let unusedFallbacks=0;
 const primary=createRendererWithFallback(
  ()=>fallbackRenderer,
  ()=>{unusedFallbacks++;return fallbackRenderer;}
 );
 assert.equal(primary,fallbackRenderer);
 assert.equal(unusedFallbacks,0);
});

test('WebGL context loss pauses rendering and restoration is recoverable',()=>{
 const target=new EventTarget();
 let restores=0;
 const lifecycle=new WebGLContextLifecycle(target,()=>restores++);
 assert.equal(lifecycle.canRender(),true);

 const lost=new Event('webglcontextlost',{cancelable:true});
 target.dispatchEvent(lost);
 assert.equal(lost.defaultPrevented,true);
 assert.equal(lifecycle.canRender(),false);

 target.dispatchEvent(new Event('webglcontextrestored'));
 assert.equal(restores,1);
 assert.equal(lifecycle.canRender(),true);

 lifecycle.dispose();
 assert.equal(lifecycle.canRender(),false);
 target.dispatchEvent(new Event('webglcontextrestored'));
 assert.equal(restores,1);
});

test('document visibility pauses work and the listener is removable',()=>{
 const target=new EventTarget();
 let hidden=false,pauses=0;
 Object.defineProperty(target,'hidden',{get:()=>hidden});
 const dispose=installWebVisibilityLifecycle(target,()=>pauses++);
 hidden=true;target.dispatchEvent(new Event('visibilitychange'));
 assert.equal(pauses,1);
 hidden=false;target.dispatchEvent(new Event('visibilitychange'));
 assert.equal(pauses,1);
 dispose();
 hidden=true;target.dispatchEvent(new Event('visibilitychange'));
 assert.equal(pauses,1);
});

test('HUD loop is active-only instead of scheduling frames in menu or pause',()=>{
 const source=readFileSync(new URL('../src/ui/GameUI.ts',import.meta.url),'utf8');
 assert.match(source,/if\(state===GameState\.PLAYING\)this\.startHudLoop\(\);\s*else this\.stopHudLoop\(\);/);
 assert.match(source,/if\(this\.currentState!==GameState\.PLAYING\|\|!this\.readHud\)return;/);
 assert.doesNotMatch(source,/if\(this\.currentState===GameState\.PLAYING\)this\.render\(this\.currentState,read\(\)\);\s*this\.hudFrame=window\.requestAnimationFrame\(frame\);/);
});

test('HUD snapshot avoids render-only collections',()=>{
 const {game}=session();
 const hud=game.getHudState();
 assert.equal('projectiles' in hud,false);
 assert.equal('explosions' in hud,false);
 assert.equal('environment' in hud,false);
 assert.equal(hud.playerHealth,100);
 assert.equal(hud.playerMaxHealth,100);
});

test('five-minute deterministic gameplay soak stays finite and bounded',()=>{
 const {game,input}=session();
 game.updateOpponent=()=>{};
 const totalFrames=5*60*60;

 for(let i=0;i<totalFrames;i++){
  input.state.moveX=Math.floor(i/180)%2===0?1:-1;
  input.state.jumpPressed=i%240===0;
  input.state.dashPressed=i%360===0;
  if(i%300===0)game.selectWeapon(1);
  if(i%90===0)game.fireWeapon();
  game.update(1/60);

  if(i%120===0){
   const state=game.getRenderState();
   const values=[
    state.player.x,state.player.y,state.player.velocityX,state.player.velocityY,state.player.health,
    state.opponent.x,state.opponent.y,state.opponent.velocityX,state.opponent.velocityY,state.opponent.health,
    ...state.projectiles.flatMap(p=>[p.x,p.y,p.vx,p.vy,p.life,p.age,p.rotation]),
    ...state.explosions.flatMap(e=>[e.x,e.y,e.age,e.life,e.radius]),
    ...state.environment.flatMap(e=>[e.x,e.y,e.hp,e.maxHp,e.rotation,e.pulse])
   ];
   assert.ok(values.every(Number.isFinite),'simulation state must stay finite');
   assert.ok(state.projectiles.length<64,'projectile pool should remain bounded');
   assert.ok(state.explosions.length<32,'explosion pool should remain bounded');
  }
 }
});

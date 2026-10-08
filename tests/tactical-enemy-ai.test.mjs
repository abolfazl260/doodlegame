import test from "node:test";
import assert from "node:assert/strict";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {chooseEnemyPlan,ENEMY_PROFILES,hasClearShot,intersectsSolid,terrainAhead,bossPhaseFor} from "../.test-build/gameplay/EnemyAI.js";
import {telegraphSegments} from "../.test-build/rendering/FighterVisual.js";
const idle={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
const make=()=>{
 const input={state:{...idle},getState(){return this.state;},endFrame(){this.state={...this.state,attackPressed:false,jumpPressed:false,dashPressed:false};}};
 return new GameSession(input);
};
const view=(type,extra={})=>({type,dx:-4,dy:0,distance:4,clearShot:true,threat:false,hillDx:null,bossPhase:0,weaponIsRanged:["shooter","bomber","ninja"].includes(type),recovering:false,...extra});

test("each of the seven enemy archetypes has explicit reaction and combat timing",()=>{
 assert.deepEqual(Object.keys(ENEMY_PROFILES),["runner","tank","shooter","jumper","bomber","ninja","boss"]);
 for(const profile of Object.values(ENEMY_PROFILES)){
  assert.ok(profile.reaction>=.14&&profile.reaction<=.4);
  assert.ok(profile.windup>=.1&&profile.windup<=.6);
  assert.ok(profile.recovery>=.1&&profile.recovery<=.5);
 }
 assert.equal(chooseEnemyPlan(view("runner")).intent,"approach");
 assert.equal(chooseEnemyPlan(view("tank")).move,-1);
 assert.equal(chooseEnemyPlan(view("shooter",{distance:1,dx:-1})).intent,"evade");
 assert.equal(chooseEnemyPlan(view("jumper",{distance:4,dy:2})).leap,true);
 assert.equal(chooseEnemyPlan(view("bomber",{distance:4.5,dx:-4.5})).attack,true);
 assert.equal(chooseEnemyPlan(view("ninja",{threat:true})).intent,"evade");
 assert.equal(chooseEnemyPlan(view("boss",{distance:1.5,dx:-1.5})).attack,true);
});

test("shooter seeks firing lane; blocked line of sight suppresses attack",()=>{
 const clear=chooseEnemyPlan(view("shooter",{distance:4.2,dx:-4.2}));
 const blocked=chooseEnemyPlan(view("shooter",{distance:4.2,dx:-4.2,clearShot:false}));
 assert.equal(clear.attack,true);
 assert.equal(blocked.attack,false);
 assert.equal(blocked.intent,"reposition");
 assert.equal(blocked.leap,true);
 assert.equal(chooseEnemyPlan(view("shooter",{recovering:true})).attack,false);
});

test("raycast ignores one-way platforms and inactive cover but finds active walls and solid platforms",()=>{
 assert.equal(intersectsSolid(-3,1,3,1,-.2,0,.2,2),true);
 assert.equal(intersectsSolid(-3,3,3,3,-.2,0,.2,2),false);
 const wall={kind:"wall",x:0,y:1,width:.6,height:2,active:true,hp:20,maxHp:20,rotation:0,pulse:0};
 assert.equal(hasClearShot(-4,1,4,1,[],[wall]),false);
 assert.equal(hasClearShot(-4,1,4,1,[],[{...wall,active:false}]),true);
 assert.equal(hasClearShot(-4,1,4,1,[{x:-1,y:.8,width:2,height:.25,surface:"oneWay"}],[]),true);
 assert.equal(hasClearShot(-4,1,4,1,[{x:-1,y:.8,width:2,height:.25}],[]),false);
});

test("feet probe spots unsupported cliff and only proposes leaps to reachable platforms",()=>{
 const start={x:-7,y:0,width:3,height:.5};
 assert.deepEqual(terrainAhead(-4.6,.5,1,[start]),{supported:false,canLeap:false});
 const reachable={x:-2,y:0,width:2,height:.5};
 assert.deepEqual(terrainAhead(-4.6,.5,1,[start,reachable]),{supported:false,canLeap:true});
 assert.deepEqual(terrainAhead(-5.6,.5,1,[start]),{supported:true,canLeap:false});
});

test("boss phases use explicit health thresholds and overhead warnings grow by phase",()=>{
 assert.equal(bossPhaseFor(70,100),1);
 assert.equal(bossPhaseFor(71,100),0);
 assert.equal(bossPhaseFor(35,100),2);
 assert.equal(bossPhaseFor(36,100),1);
 const game=make();
 for(let i=0;i<6;i++)game.reset();
 assert.equal(game.opponent.enemyType,"boss");
 const initially=game.getRenderState().opponent;
 assert.equal(initially.bossPhase,0);
 assert.deepEqual(telegraphSegments(initially),[]);
 game.opponent.health=68;
 game.update(1/60);
 const phaseOne=game.getRenderState().opponent;
 assert.equal(phaseOne.bossPhase,1);
 assert.ok(phaseOne.attackTelegraph>0);
 assert.equal(telegraphSegments(phaseOne).length,6);
 game.opponent.health=32;
 game.update(1/60);
 const phaseTwo=game.getRenderState().opponent;
 assert.equal(phaseTwo.bossPhase,2);
 assert.ok(phaseTwo.attackTelegraph>0);
 assert.equal(telegraphSegments(phaseTwo).length,7);
 game.dispose();
});

test("mode-specific weapon limits remain enforced even with boss phases",()=>{
 for(const mode of ["missile-duel","melee-only","random-weapons"]){
  const game=make();game.setMode(mode);
  for(let i=0;i<6;i++)game.reset();
  assert.equal(game.opponent.enemyType,"boss");
  const original=game.opponent.weapon;
  game.opponent.health=30;
  for(let i=0;i<90;i++)game.update(1/120);
  if(mode==="missile-duel")assert.equal(game.opponent.weapon,"missile");
  if(mode==="melee-only")assert.equal(game.opponent.weapon,"hammer");
  if(mode==="random-weapons")assert.equal(game.opponent.weapon,original);
  game.dispose();
 }
});

test("opponents remain finite and never loop over the full arena set",()=>{
 const arenas=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
 for(const arena of arenas){
  const game=make();game.setArena(arena);
  for(let kind=0;kind<7;kind++){
   if(kind>0)game.reset();
   for(let frame=0;frame<80;frame++)game.update(1/120);
   const enemy=game.getRenderState().opponent;
   assert.ok([enemy.x,enemy.y,enemy.velocityX,enemy.velocityY,enemy.attackTelegraph].every(Number.isFinite),arena+"/"+enemy.enemyType);
   assert.ok(Math.abs(enemy.x)<=6.01);
  }
  game.dispose();
 }
});

test("windup commits attacks after a readable delay without predicting player input",()=>{
 const game=make();
 game.opponent.x=-2;game.player.x=-.6;
 game.opponent.y=game.player.y;game.opponent.facing=1;
 game.opponent.cooldown=0;
 // Advance one decision cycle, then verify the warning precedes any attack.
 let warned=false;
 for(let i=0;i<85;i++){
  game.updateOpponent(1/120);
  if(game.opponent.attackTelegraph>0){warned=true;assert.equal(game.opponent.attackTime,0);break;}
 }
 assert.equal(warned,true);
 game.dispose();
});

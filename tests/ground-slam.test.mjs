import test from "node:test";
import assert from "node:assert/strict";
import {GameSession,SLAM} from "../.test-build/gameplay/GameSession.js";
import {fighterVisual,slamEffectSegments} from "../.test-build/rendering/FighterVisual.js";
import {WebInput} from "../.test-build/platform/web/WebInput.js";

const empty=()=>({moveX:0,moveY:0,attackPressed:false,attackHeld:false,attackCancelled:false,
 jumpPressed:false,dashPressed:false,grabPressed:false,weaponNextPressed:false,weaponPreviousPressed:false});
function setup(arena="classic"){
 const input={state:empty(),p2:empty(),getState(){return this.state},getPlayer2State(){return this.p2},
  endFrame(){for(const s of [this.state,this.p2])for(const k of ["attackPressed","attackCancelled","jumpPressed","dashPressed","grabPressed","weaponNextPressed","weaponPreviousPressed"])s[k]=false;},
  setLocalPvPEnabled(){}};
 const game=new GameSession(input);
 game.setArena(arena);game.updateOpponent=()=>{};
 return {game,input};
}
const tick=(g,n=1)=>{for(let i=0;i<n;i++)g.update(1/60)};
function airborne(g,x=-5,y=3.8){
 const f=g.player;f.x=x;f.y=y;f.grounded=false;f.velocityY=0;f.velocityX=0;
}
function slam(g,input){
 input.state.moveY=1;input.state.attackPressed=true;input.state.attackHeld=true;
 tick(g);
}
function until(g,predicate,max=130){
 for(let i=0;i<max;i++){if(predicate())return true;tick(g);}
 return predicate();
}
test("airborne Down + Attack has startup, rapid descent, true platform impact and one AoE hit",()=>{
 const {game,input}=setup();airborne(game);
 const target=game.opponent;target.x=-3.7;target.y=1.15;target.grounded=true;
 slam(game,input);
 assert.equal(game.player.slamPhase,"startup");
 assert.equal(game.player.slamAvailable,false);
 assert.equal(game.player.cooldown>0,true);
 assert.equal(game.getRenderState().combatCues.some(c=>c.kind==="slam"),false);
 assert.equal(target.health,100);
 assert.ok(until(game,()=>game.player.slamPhase==="descent"));
 const pose=fighterVisual(game.getRenderState().player);
 assert.ok(Math.abs(pose.hand[1])>.3);
 assert.equal(slamEffectSegments(game.getRenderState().player).length,4);
 assert.ok(game.player.velocityY<=-SLAM.descentSpeed);
 assert.ok(until(game,()=>game.player.slamPhase==="impact"));
 assert.equal(game.player.grounded,true);
 assert.equal(game.player.health,100);
 assert.equal(target.health,100-SLAM.damage);
 const cues=game.getRenderState().combatCues.filter(c=>c.kind==="slam");
 assert.equal(cues.length,1);
 assert.ok(cues[0].y>.1&&cues[0].y<.4,"shock ring is at the contact height");
 const hp=target.health;
 tick(game,60);
 assert.equal(target.health,hp,"impact damage cannot repeat during held input or recovery");
 assert.equal(game.getRenderState().combatCues.filter(c=>c.kind==="slam").length,0,"cue fades normally");
 assert.equal(game.player.slamPhase,null);
});
test("landing in startup is harmless and never creates a false shockwave",()=>{
 const {game,input}=setup();
 airborne(game,-5,1.37);game.player.velocityY=-1;
 game.opponent.x=-3.75;game.opponent.y=1.15;
 slam(game,input);tick(game,5);
 assert.equal(game.player.grounded,true);
 assert.equal(game.opponent.health,100);
 assert.equal(game.getRenderState().combatCues.some(c=>c.kind==="slam"),false);
});
test("falling into a fatal pit cannot deal impact damage or remain in descent",()=>{
 const {game,input}=setup("pit");airborne(game,0,2.1);
 game.opponent.x=1;game.opponent.y=-2;
 slam(game,input);
 assert.ok(until(game,()=>game.player.health===0));
 assert.equal(game.player.slamPhase,null);
 assert.equal(game.getRenderState().combatCues.some(c=>c.kind==="slam"),false);
 assert.equal(game.opponent.health,100);
});
test("moving and one-way platforms use exactly the regular swept landing path",()=>{
 for(const arena of ["moving","zigzag"]){
  const {game,input}=setup(arena);
  const platform=arena==="moving"?game.platforms[2]:game.platforms[2];
  const top=platform.y+platform.height;
  airborne(game,platform.x+platform.width*.4,top+.9+2.6);
  game.opponent.x=game.player.x+1.3;game.opponent.y=top+.9;game.opponent.grounded=true;
  slam(game,input);
  assert.ok(until(game,()=>game.player.slamPhase==="impact"),arena+" did not land");
  assert.equal(game.player.grounded,true);
  assert.ok(Math.abs((game.player.y-.9)-(game.supportPlatform(game.player)?.y+game.supportPlatform(game.player)?.height??NaN))<.15);
  assert.equal(game.getRenderState().combatCues.filter(c=>c.kind==="slam").length,1);
 }
});
test("solid environment blocks are valid contact, but do not create aerial hits",()=>{
 const {game,input}=setup();
 airborne(game,-1.8,4.3);
 game.opponent.x=-3;game.opponent.y=2.225;game.opponent.grounded=true;
 slam(game,input);
 assert.equal(game.opponent.health,100);
 assert.ok(until(game,()=>game.player.slamPhase==="impact"));
 assert.equal(game.player.grounded,true);
 assert.ok(game.getRenderState().combatCues.some(c=>c.kind==="slam"));
});
test("dash, wall jump, damage and pause cancellation never leave a stuck downward impulse",()=>{
 const {game,input}=setup();
 airborne(game);slam(game,input);
 assert.ok(until(game,()=>game.player.slamPhase==="descent"));
 game.cancelTransientActions();
 assert.equal(game.player.slamPhase,null);
 assert.ok(game.player.velocityY>=-7);
 const cooldown=game.player.cooldown;
 game.tryDash(game.player);
 assert.equal(game.player.slamPhase,null);
 assert.equal(game.player.cooldown,cooldown);
 game.reset(false);airborne(game);slam(game,input);
 // Release first so the previous button hold cannot retrigger.
 input.state.attackHeld=false;
 assert.ok(until(game,()=>game.player.slamPhase==="descent"));
 game.damage(game.player,4,2);
 assert.equal(game.player.slamPhase,null);
 assert.equal(game.player.hitTime>0,true);
 game.reset(false);airborne(game);input.state.attackHeld=false;input.state.attackPressed=true;input.state.moveY=1;tick(game);
 const frozen=game.player.slamElapsed;game.getRenderState();game.getRenderState();
 assert.equal(game.player.slamElapsed,frozen,"a paused game does not advance without update");
 game.reset(false);airborne(game,-4.4,2);input.state.attackPressed=true;input.state.attackHeld=true;tick(game);
 game.tryJump(game.player);
 assert.equal(game.player.slamPhase,null);
 assert.ok(game.player.velocityY>0);
});
test("grounded Down + Attack retains kick combo; air normal ATTACK uses equipped weapon",()=>{
 const {game,input}=setup();
 input.state.moveY=1;input.state.attackPressed=true;input.state.attackHeld=true;
 tick(game);
 assert.equal(game.player.kickKind,"straight");
 assert.equal(game.player.slamPhase,null);
 game.reset(false);airborne(game);
 input.state.moveY=0;input.state.attackPressed=true;input.state.attackHeld=true;
 game.selectWeaponById("blaster");tick(game);
 assert.equal(game.player.slamPhase,null);
 assert.ok(game.getRenderState().projectiles.some(p=>p.weapon==="blaster"));
 game.reset(false);game.setMode("missile-duel");airborne(game);
 input.state.moveY=1;input.state.attackPressed=true;input.state.attackHeld=true;tick(game);
 assert.equal(game.player.slamPhase,null,"missile-only special rules remain unchanged");
});
test("Bow charging and release stay intact unless an uncharged aerial Slam is requested",()=>{
 const {game,input}=setup();
 game.selectWeaponById("bow");airborne(game);
 input.state.attackPressed=true;input.state.attackHeld=true;input.state.moveY=0;tick(game,5);
 assert.ok(game.player.bowCharging);
 input.state.moveY=1;input.state.attackPressed=true;tick(game);
 assert.equal(game.player.slamPhase,null,"a charging Bow may not be silently replaced by Slam");
 input.state.attackHeld=false;tick(game);
 assert.ok(game.projectiles.some(p=>p.weapon==="bow"));
 game.reset(false);game.selectWeaponById("bow");airborne(game);
 input.state.moveY=1;input.state.attackPressed=true;input.state.attackHeld=true;
 tick(game);
 assert.equal(game.player.slamPhase,"startup");
 assert.equal(game.player.bowCharging,false);
});
test("P2 keyboard/mobile Down + Attack are independent of P1, including held action",()=>{
 const input=new WebInput({});
 const game=new GameSession(input);
 game.setLocalPvP(true);
 game.updateOpponent=()=>{};
 const second=game.opponent;
 second.x=4;second.y=4;second.grounded=false;second.velocityY=0;
 input.setPlayer2TouchMove(0,1);
 input.player2TouchAttackStart();
 tick(game);
 assert.equal(second.slamPhase,"startup");
 assert.equal(game.player.slamPhase,null);
 input.player2TouchAttackRelease();
 input.setPlayer2TouchMove(0,0);
 game.reset(false);
 const p=game.opponent;
 p.x=4;p.y=4;p.grounded=false;
 const key=(code)=>input.keyDown({code,preventDefault(){}});
 key("ArrowDown");key("Enter");tick(game);
 assert.equal(p.slamPhase,"startup");
 assert.equal(game.player.slamPhase,null);
});
test("no Slam recast until a valid landing; no automatic UZI shots after held Slam",()=>{
 const {game,input}=setup();airborne(game);
 game.selectWeaponById("uzi");
 slam(game,input);
 assert.ok(until(game,()=>game.player.slamPhase==="descent"));
 game.cancelTransientActions();
 assert.equal(game.player.slamAvailable,false);
 assert.equal(game.player.slamPhase,null);
 game.player.cooldown=0;
 input.state.attackPressed=true;tick(game);
 assert.equal(game.player.slamPhase,null);
 assert.equal(game.getRenderState().projectiles.length,0);
 input.state.attackHeld=false;tick(game);assert.equal(game.player.slamAttackLatch,false);
});

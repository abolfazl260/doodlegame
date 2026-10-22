import test from "node:test";
import assert from "node:assert/strict";
import {WebInput} from "../.test-build/platform/web/WebInput.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
const key=(input,code,down)=>input[down?"keyDown":"keyUp"]({code,preventDefault(){}});

const setup=()=>{
 const input=new WebInput({});
 const session=new GameSession(input);
 session.setMode("local-pvp");
 return {input,session};
};
test("local PvP spawns two human fighters with symmetrical base health and no bot",()=>{
 const {input,session}=setup();
 const view=session.getRenderState();
 assert.equal(view.mode,"local-pvp");
 assert.equal(view.player.health,100);
 assert.equal(view.opponent.health,100);
 assert.equal(view.opponent.enemyType,null);
 assert.equal(session.getHudState().secondWeapon,"blade");
 assert.equal(input.getPlayer2State().attackHeld,false);
 session.dispose();
});
test("independent WASD/Arrow inputs drive simultaneous movement and jumping",()=>{
 const {input,session}=setup();
 key(input,"KeyD",true);
 key(input,"ArrowLeft",true);
 session.update(1/60);
 const moving=session.getRenderState();
 assert.ok(moving.player.velocityX>0);
 assert.ok(moving.opponent.velocityX<0);
 key(input,"KeyW",true);
 key(input,"ArrowUp",true);
 session.update(1/60);
 const jumping=session.getRenderState();
 assert.ok(jumping.player.velocityY>0);
 assert.ok(jumping.opponent.velocityY>0);
 key(input,"KeyD",false);key(input,"ArrowLeft",false);
 key(input,"KeyW",false);key(input,"ArrowUp",false);
 session.dispose();
});
test("P2 attack and rejected mid-game weapon hotkeys never modify P1 state",()=>{
 const {input,session}=setup();
 key(input,"Enter",true);
 assert.equal(input.getPlayer2State().attackPressed,true);
 assert.equal(input.getState().attackPressed,false);
 session.update(1/60);
 assert.ok(session.opponent.cooldown>0);
 assert.equal(session.player.cooldown,0);
 key(input,"Enter",false);
 input.endFrame();
 assert.equal(input.getPlayer2State().attackHeld,false);
 key(input,"BracketRight",true);
 session.update(1/60);
 assert.equal(session.getHudState().secondWeapon,"blade");
 assert.equal(session.getHudState().weapon,"blade");
 key(input,"BracketRight",false);
 session.dispose();
});
test("P2 Bow charge fires only on actual release and cancelled charges never fire",()=>{
 const {input,session}=setup();
 for(let i=0;i<5;i++)session.selectPlayer2Weapon(1);
 assert.equal(session.opponent.weapon,"bow");
 input.player2TouchAttackStart();
 for(let i=0;i<10;i++)session.update(1/60);
 assert.ok(session.opponent.bowCharge>0);
 assert.equal(session.projectiles.filter(p=>p.owner==="opponent"&&p.weapon==="bow").length,0);
 input.player2TouchAttackCancel();
 session.update(1/60);
 assert.equal(session.opponent.bowCharging,false);
 assert.equal(session.projectiles.filter(p=>p.owner==="opponent"&&p.weapon==="bow").length,0);
 input.player2TouchAttackStart();
 for(let i=0;i<10;i++)session.update(1/60);
 input.player2TouchAttackRelease();
 session.update(1/60);
 assert.equal(session.projectiles.filter(p=>p.owner==="opponent"&&p.weapon==="bow").length,1);
 session.dispose();
});
test("independent P2 touch joystick and automatic UZI do not arm P1",()=>{
 const {input,session}=setup();
 for(let i=0;i<3;i++)session.selectPlayer2Weapon(1);
 assert.equal(session.opponent.weapon,"uzi");
 input.setPlayer2TouchMove(-.75,-.8);
 assert.equal(input.getPlayer2State().jumpPressed,true);
 assert.equal(input.getState().jumpPressed,false);
 assert.equal(input.getState().moveX,0);
 input.player2TouchAttackStart();
 for(let i=0;i<36;i++)session.update(1/60);
 assert.ok(session.projectiles.some(p=>p.owner==="opponent"&&p.weapon==="uzi"));
 assert.equal(input.getState().attackHeld,false);
 input.player2TouchAttackRelease();
 assert.equal(input.getPlayer2State().attackHeld,false);
 input.setPlayer2TouchMove(0,0);
 assert.equal(input.getPlayer2State().moveX,0);
 session.dispose();
});
test("both sides can win, double KO is a draw, and PvP never grants career upgrade points",()=>{
 const {session}=setup();
 const points=session.getHudState().upgradePoints;
 session.damage(session.opponent,200,0);
 session.update(1/60);
 assert.equal(session.getHudState().winner,"player");
 assert.equal(session.getHudState().upgradePoints,points);
 session.reset(false);
 session.damage(session.player,200,0);
 session.update(1/60);
 assert.equal(session.getHudState().winner,"opponent");
 assert.equal(session.getHudState().upgradePoints,points);
 session.reset(false);
 session.damage(session.player,200,0);
 session.damage(session.opponent,200,0);
 session.update(1/60);
 assert.equal(session.getHudState().winner,"draw");
 assert.equal(session.getHudState().upgradePoints,points);
 session.dispose();
});
test("choosing a new arena and rematching retain local PvP; returning to Duel restores AI",()=>{
 const {input,session}=setup();
 session.setArena("fortress");
 assert.equal(session.getRenderState().arena,"fortress");
 assert.equal(session.getRenderState().opponent.enemyType,null);
 assert.equal(session.getHudState().weapon,"blade","Fortress PvP does not force missile rules");
 session.selectPlayer2Weapon(1);
 assert.equal(session.getHudState().secondWeapon,"hammer");
 session.reset();
 session.reset();
 session.reset();
 assert.equal(session.getHudState().winner,null);
 assert.equal(session.getHudState().secondWeapon,"blade");
 assert.equal(session.getRenderState().opponent.enemyType,null);
 session.setMode("duel");
 assert.equal(session.getRenderState().opponent.enemyType,"runner");
 assert.equal(input.getPlayer2State().attackHeld,false);
 session.dispose();
});


test("independent chosen starting weapons persist for both humans through rematches",()=>{
 const {session}=setup();
 assert.equal(session.setStartingWeapon("blaster"),true);
 assert.equal(session.setPlayer2StartingWeapon("hammer"),true);
 session.setCharacterId("archer");
 session.setPlayer2CharacterId("viking");
 session.reset(false);
 assert.equal(session.getHudState().weapon,"blaster");
 assert.equal(session.getHudState().secondWeapon,"hammer");
 assert.equal(session.getHudState().characterId,"archer");
 assert.equal(session.getHudState().opponentCharacterId,"viking");
 assert.equal(session.lockLoadout(),true);
 session.selectPlayer2Weapon(1);
 session.selectWeapon(1);
 assert.equal(session.getHudState().weapon,"blaster");
 assert.equal(session.getHudState().secondWeapon,"hammer");
 session.reset(false);
 assert.equal(session.getHudState().weapon,"blaster");
 assert.equal(session.getHudState().secondWeapon,"hammer");
 session.dispose();
});

test("all sixteen arenas can be selected and played in local two-player mode",()=>{
 const {session}=setup();
 const maps=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge",
  "crater","vertical","ruins","conveyor","collapse","storm","reactor"];
 for(const arena of maps){
  session.setArena(arena);
  let state=session.getRenderState();
  assert.equal(state.arena,arena);
  assert.equal(state.mode,"local-pvp");
  assert.equal(state.opponent.enemyType,null);
  assert.equal(state.player.health,100);
  assert.equal(state.opponent.health,100);
  session.update(1/60);
  state=session.getRenderState();
  assert.equal(state.arena,arena);
  assert.equal(state.mode,"local-pvp");
 }
 session.dispose();
});

function twoChargedBows(){
 const {input,session}=setup();
 assert.equal(session.setStartingWeapon("bow"),true);
 assert.equal(session.setPlayer2StartingWeapon("bow"),true);
 session.reset(false);
 input.touchAttack(true);
 input.player2TouchAttackStart();
 for(let i=0;i<12;i++)session.update(1/60);
 assert.ok(session.player.bowCharging&&session.player.bowCharge>0);
 assert.ok(session.opponent.bowCharging&&session.opponent.bowCharge>0);
 return {input,session};
}
test("P1 interrupted touch attack leaves P2 Bow charge and release intact",()=>{
 const {input,session}=twoChargedBows();
 const secondCharge=session.opponent.bowCharge;
 session.cancelTouchAttack(1);
 input.touchAttackCancel();
 assert.equal(session.player.bowCharging,false);
 assert.equal(session.player.bowCharge,0);
 assert.equal(session.opponent.bowCharging,true);
 assert.equal(session.opponent.bowCharge,secondCharge);
 input.player2TouchAttackRelease();
 session.update(1/60);
 assert.equal(session.projectiles.filter(p=>p.owner==="player"&&p.weapon==="bow").length,0);
 assert.equal(session.projectiles.filter(p=>p.owner==="opponent"&&p.weapon==="bow").length,1);
 session.dispose();
});
test("P2 interrupted touch attack leaves P1 Bow charge and release intact",()=>{
 const {input,session}=twoChargedBows();
 const firstCharge=session.player.bowCharge;
 session.cancelTouchAttack(2);
 input.player2TouchAttackCancel();
 assert.equal(session.opponent.bowCharging,false);
 assert.equal(session.opponent.bowCharge,0);
 assert.equal(session.player.bowCharging,true);
 assert.equal(session.player.bowCharge,firstCharge);
 input.touchAttackRelease();
 session.update(1/60);
 assert.equal(session.projectiles.filter(p=>p.owner==="opponent"&&p.weapon==="bow").length,0);
 assert.equal(session.projectiles.filter(p=>p.owner==="player"&&p.weapon==="bow").length,1);
 session.dispose();
});
test("global pause cancellation still clears both players' pending attacks",()=>{
 const {input,session}=twoChargedBows();
 session.cancelTransientActions();
 input.touchAttackCancel();
 input.player2TouchAttackCancel();
 assert.equal(session.player.bowCharging,false);
 assert.equal(session.opponent.bowCharging,false);
 assert.equal(session.player.bowCharge,0);
 assert.equal(session.opponent.bowCharge,0);
 session.update(1/60);
 assert.equal(session.projectiles.length,0);
 session.dispose();
});
test("P1 touch cancellation does not interrupt a grab owned by P2",()=>{
 const {session}=setup();
 session.player.grabPhase="held";
 session.opponent.grabPhase="hold";
 session.cancelTouchAttack(1);
 assert.equal(session.player.grabPhase,"held");
 assert.equal(session.opponent.grabPhase,"hold");
 session.dispose();
});

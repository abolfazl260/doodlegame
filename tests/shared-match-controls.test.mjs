import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../.test-build/gameplay/GameSession.js';
import {WebInput} from '../.test-build/platform/web/WebInput.js';

const setup=()=>{const input=new WebInput({});const session=new GameSession(input);session.setLocalPvP(true);return {input,session};};
const modes=['duel','missile-duel','melee-only','random-weapons','sudden-death','low-gravity','king-of-hill'];
test('every game rule keeps two human fighters across arena changes and rematches',()=>{
 const {input,session}=setup();
 for(const mode of modes){
  session.setMode(mode);
  session.setArena('fortress');session.reset();
  assert.equal(session.getHudState().localPvP,true);
  assert.equal(session.getMode(),mode);
  assert.equal(session.getRenderState().opponent.enemyType,null);
  input.setPlayer2TouchMove(-1,0);session.update(1/60);
  assert.ok(session.getRenderState().opponent.velocityX<0);
  input.setPlayer2TouchMove(0,0);
 }
 session.setLocalPvP(false);
 assert.notEqual(session.getRenderState().opponent.enemyType,null);
});
test('missile is a persistent starting weapon in standard matches on every arena',()=>{
 const {session}=setup();
 for(const arena of ['classic','towers','pit','steps','zigzag','sky','moving','fortress','bridge','crater','vertical','ruins','conveyor','collapse','storm','reactor']){
  session.setArena(arena);assert.equal(session.setStartingWeapon('missile'),true);session.reset();
  assert.equal(session.getHudState().weapon,'missile');assert.equal(session.getHudState().secondWeapon,'missile');
  session.selectWeaponById('blaster');session.selectPlayer2WeaponById('bomb');
  assert.equal(session.getHudState().weapon,'blaster');assert.equal(session.getHudState().secondWeapon,'bomb');
 }
 session.setMode('melee-only');session.selectPlayer2WeaponById('missile');assert.equal(session.getHudState().secondWeapon,'blade');
 session.setMode('missile-duel');session.selectPlayer2WeaponById('blaster');assert.equal(session.getHudState().secondWeapon,'missile');
});
test('both humans fire every ranged weapon, including missiles, in their own selected directions',()=>{
 const {session}=setup();
 for(const weapon of ['blaster','uzi','bow','bomb','boomerang','missile']){
  session.setStartingWeapon(weapon);session.reset(false);
  session.setWeaponAim(1,1,1);session.setWeaponAim(2,-1,-1);
  assert.equal(session.getRenderState().projectiles.length,0,'aiming alone never fires');
  if(weapon==='bow'){session.fireBow(session.player,1);session.fireBow(session.opponent,1);}
  else{session.attack(session.player,session.opponent,true);session.attack(session.opponent,session.player,true);}
  const player=session.projectiles.find(p=>p.owner==='player'),opponent=session.projectiles.find(p=>p.owner==='opponent');
  assert.ok(player.vx>0&&player.vy>0,weapon+' P1 direction');
  assert.ok(opponent.vx<0&&opponent.vy<0,weapon+' P2 direction');
 }
});
test('two-player sudden death and hill victory apply rules without career rewards',()=>{
 const {session}=setup();
 session.setMode('sudden-death');session.damage(session.player,1,0);session.update(1/60);assert.equal(session.getHudState().winner,'opponent');
 for(const winner of ['player','opponent']){
  session.setMode('king-of-hill');session.player.x=winner==='player'?0:-5;session.opponent.x=winner==='opponent'?0:5;
  session.updateHill(8);
  assert.equal(session.getHudState().winner,winner);assert.equal(session.getHudState().upgradePoints,0);
 }
});
test('keyboard aiming stays independent and clears on pause/reset',()=>{
 const {input,session}=setup();
 input.keyDown({code:'KeyR',preventDefault(){}});session.update(1/60);
 assert.ok(session.player.aimAngle>0);assert.equal(session.opponent.aimAngle,null);
 input.keyDown({code:'PageUp',preventDefault(){}});session.update(1/60);
 assert.notEqual(session.opponent.aimAngle,null);
 input.resetTransientState();assert.equal(input.getState().aimUpHeld,false);assert.equal(input.getPlayer2State().aimUpHeld,false);
});

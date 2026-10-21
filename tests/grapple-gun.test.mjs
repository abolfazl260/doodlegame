import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../.test-build/gameplay/GameSession.js';

function setup(){
 const game=new GameSession({getState(){return{}},endFrame(){}});
 game.setMode('duel');
 game.player.weapon='grapple';
 game.player.cooldown=0;
 game.player.aimAngle=0;
 game.player.facing=1;
 game.player.visualFacing=1;
 game.opponent.x=7;
 game.opponent.y=game.player.y;
 return game;
}

test('Grapple Gun shoots a tether instead of a damaging projectile and second ATTACK releases it',()=>{
 const game=setup(),oldHealth=game.opponent.health;
 game.attack(game.player,game.opponent,true);
 const hook=game.getRenderState().player.grapple;
 assert.equal(hook.phase,'flying');
 assert.ok(hook.vx>0);
 assert.equal(game.projectiles.length,0,'the rope must not use ordinary projectile physics');
 assert.equal(game.opponent.health,oldHealth);
 game.updateGrapples(1/120);
 assert.ok(game.player.grapple.x>hook.x);
 game.attack(game.player,game.opponent,true);
 assert.equal(game.getRenderState().player.grapple,null,'second tap cancels even if weapon cooldown remains');
});

test('a hook attaches to an opponent and applies damage only on the initial hit',()=>{
 const game=setup();
 game.opponent.x=game.player.x+4;
 for(let i=0;i<48;i++){
  if(i===0)game.attack(game.player,game.opponent,true);
  game.updateGrapples(1/120);
  if(game.player.grapple?.phase==='latched')break;
 }
 assert.equal(game.player.grapple?.phase,'latched');
 assert.equal(game.player.grapple?.target,'enemy');
 assert.equal(game.opponent.health,94);
 for(let i=0;i<16;i++)game.updateGrapples(1/120);
 assert.equal(game.opponent.health,94,'a held tether must not repeatedly inflict damage');
 assert.ok(game.opponent.velocityX<0,'the enemy is tugged towards the owner');
});

test('platform impact anchors the rope, reels the owner in, and reset clears the tether',()=>{
 const game=setup();
 game.player.x=-6;
 game.player.y=2;
 game.opponent.x=8;
 game.attack(game.player,game.opponent,true);
 for(let i=0;i<35&&game.player.grapple?.phase==='flying';i++)game.updateGrapples(1/120);
 assert.equal(game.player.grapple?.phase,'latched');
 assert.equal(game.player.grapple?.target,'arena');
 const initialLength=game.player.grapple.ropeLength;
 for(let i=0;i<10;i++)game.updateGrapples(1/120);
 assert.ok(game.player.grapple.ropeLength<initialLength,'rope length shrinks after anchoring');
 assert.ok(game.player.velocityX>0,'anchored rope applies force towards the platform');
 game.reset(false);
 assert.equal(game.getRenderState().player.grapple,null);
});

test('Long Cable upgrade increases reach and works without ammunition',()=>{
 const base=setup(),upgraded=setup();
 upgraded.upgradedWeapons.add('grapple');
 for(const game of [base,upgraded]){
  game.attack(game.player,game.opponent,true);
  game.opponent.x=14;
  game.player.grapple.x=game.player.x+10.2;
  game.player.grapple.y=game.player.y+4;
  game.player.grapple.travel=10.9;
  game.updateGrapples(1/120);
 }
 assert.equal(base.player.grapple,null,'base cable expires beyond 10 units');
 assert.equal(upgraded.player.grapple?.phase,'flying','upgrade extends the maximum range');
});

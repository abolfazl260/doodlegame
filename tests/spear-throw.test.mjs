import test from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../.test-build/gameplay/GameSession.js';

function setup(){
 const session=new GameSession({getState(){return{}},endFrame(){}});
 session.setMode('duel');
 session.player.weapon='spear';session.player.weaponDrawTime=0;session.player.weaponHolsterFrom=null;
 session.player.cooldown=0;session.player.aimAngle=null;
 session.player.facing=1;session.player.visualFacing=1;
 session.opponent.x=session.player.x+4;session.opponent.y=session.player.y;
 session.opponent.health=100;session.opponent.velocityX=0;session.opponent.velocityY=0;
 return session;
}
test('spear is thrown instead of dealing instant melee damage',()=>{
 const game=setup(),before=game.opponent.health;
 game.attack(game.player,game.opponent,true);
 assert.equal(game.opponent.health,before);
 const throws=game.projectiles.filter(p=>p.weapon==='spear');
 assert.equal(throws.length,1);
 assert.ok(throws[0].vx>0);
 assert.ok(game.player.cooldown>0);
 assert.equal(game.player.attackTime,.22);
 game.attack(game.player,game.opponent,true);
 assert.equal(game.projectiles.filter(p=>p.weapon==='spear').length,1,'cooldown prevents repeated throwing');
});
test('thrown spear travels, drops with gravity and damages the enemy once',()=>{
 const game=setup();
 game.attack(game.player,game.opponent,true);
 const p=game.projectiles.find(p=>p.weapon==='spear');
 assert.ok(p);
 const firstVy=p.vy;
 game.updateProjectiles(1/60);
 assert.ok(p.vy<firstVy,'spear has a descending ballistic path');
 for(let i=0;i<30;i++)game.updateProjectiles(1/60);
 assert.ok(game.opponent.health<100,'swept hit should catch a fast spear');
 assert.ok(!game.projectiles.some(p=>p.weapon==='spear'),'spear disappears on hit');
});
test('spear can be thrown left and upgraded Twin Spear throws two angled projectiles',()=>{
 const game=setup();
 game.player.facing=-1;game.player.visualFacing=-1;
 game.attack(game.player,game.opponent,true);
 assert.equal(game.projectiles.filter(p=>p.weapon==='spear').length,1);
 assert.ok(game.projectiles[0].vx<0);
 const upgraded=setup();
 upgraded.upgradedWeapons.add('spear');
 upgraded.attack(upgraded.player,upgraded.opponent,true);
 const spears=upgraded.projectiles.filter(p=>p.weapon==='spear');
 assert.equal(spears.length,2);
 assert.notEqual(spears[0].vy,spears[1].vy);
 assert.ok(spears.every(p=>p.damageScale===.72));
});
test('spear can be equipped independently in local PvP',()=>{
 const game=setup();
 game.setLocalPvP(true);
 game.selectPlayer2WeaponById('spear');
 assert.equal(game.getRenderState().opponent.weapon,'spear');
 game.opponent.cooldown=0;
 game.attack(game.opponent,game.player,true);
 assert.ok(game.projectiles.some(p=>p.weapon==='spear'&&p.owner==='opponent'));
});

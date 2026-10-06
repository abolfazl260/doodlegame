import {test} from 'node:test';
import assert from 'node:assert/strict';
import {GameSession} from '../.test-build/gameplay/GameSession.js';
import {fighterVisual,toolSegments,segmentPositions} from '../.test-build/rendering/FighterVisual.js';
const idle={moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,attackHeld:false,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
function setup(arena='classic') {
 const input={state:{...idle},frames:0,start(){},stop(){},dispose(){},getState(){return this.state},endFrame(){this.frames++;this.state={...this.state,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false}}};
 const game=new GameSession(input);game.setArena(arena);game.updateOpponent=()=>{};
 return {game,input};
}
test('ordinary jump lands and remains grounded, with a transient landing pose',()=>{
 const {game,input}=setup();input.state.jumpPressed=true;game.update(1/60);
 let landed=false;
 for(let i=0;i<100;i++){game.update(1/120);const p=game.getRenderState().player;if(p.grounded){landed=true;assert.ok(p.landingTime>0);break;}}
 assert.ok(landed);for(let i=0;i<60;i++)game.update(1/120);
 const p=game.getRenderState().player;assert.equal(p.velocityY,0);assert.ok(p.grounded);assert.equal(p.landingTime,0);
});
test('substeps consume jump and weapon change once per input frame',()=>{
 const {game,input}=setup();input.state.jumpPressed=true;input.state.weaponNextPressed=true;game.update(.1);
 assert.equal(input.frames,1);assert.equal(game.player.doubleJumpAvailable,true);assert.equal(game.getRenderState().player.weapon,'hammer');
});
test('ice retains momentum and makes direction changes slower',()=>{
 const normal=setup().game,ice=setup().game;
 normal.player.velocityX=6;ice.player.velocityX=6;ice.player.x=-2;ice.player.y=3.25;
 normal.move(normal.player,0,.1);ice.move(ice.player,0,.1);
 assert.ok(ice.player.velocityX>normal.player.velocityX);
 normal.move(normal.player,-1,.1);ice.move(ice.player,-1,.1);assert.ok(ice.player.velocityX>normal.player.velocityX);
});
test('mass reduces knockback, which persists instead of being speed-clamped',()=>{
 const {game}=setup();game.opponent.enemyType='tank';game.damage(game.player,5,12);game.damage(game.opponent,5,12);
 assert.ok(game.player.velocityX>game.opponent.velocityX);game.update(1/60);assert.ok(game.player.velocityX>8);assert.ok(game.player.hitTime>0);
});
test('moving platform carries a stationary grounded fighter',()=>{
 const {game}=setup('moving');const p=game.platforms[2];game.player.x=p.x+p.width/2;game.player.y=p.y+p.height+.9;
 const before=game.player.x;for(let i=0;i<12;i++)game.update(1/120);
 const after=game.platforms[2];assert.ok(Math.abs(game.player.x-before)>.02);assert.ok(Math.abs(game.player.y-after.y-after.height-.9)<.01);
});
test('wall jumps push away and overhead platforms do not teleport fighters upward',()=>{
 const {game}=setup();game.player.x=-4.4;game.player.y=2;game.player.grounded=false;game.tryJump(game.player);assert.ok(game.player.velocityX<0);
 game.player.x=1;game.player.y=2.7;game.player.velocityY=8;game.player.velocityX=0;game.integrate(game.player,.05);assert.ok(game.player.y<3);assert.equal(game.player.velocityY,0);
});
test('ranged weapon recoil, projectile expiration and melee vertical separation',()=>{
 const {game}=setup();game.selectWeaponById('blaster');game.fireWeapon();assert.ok(game.player.velocityX<0);for(let i=0;i<400;i++)game.update(1/120);assert.equal(game.projectiles.length,0);
 game.player.cooldown=0;game.player.weapon='blade';game.opponent.x=game.player.x+1;game.opponent.y=game.player.y+4;const health=game.opponent.health;game.fireWeapon();assert.equal(game.opponent.health,health);
});
test('all tool geometries have finite, complete vertex pairs and match both renderers',()=>{
 const {game}=setup();const base=game.getRenderState().player;
 for(const weapon of ['blade','hammer','blaster','uzi','boomerang','bow','bomb','missile'])for(const facing of [-1,1]) {
  const s={...base,weapon,facing,bowCharge:1,attackTime:.1,landingTime:.1};const pose=fighterVisual(s),geometry=segmentPositions(toolSegments(s));
  assert.ok(pose.joints.length>=9);assert.ok(geometry.length>=30);assert.equal(geometry.length%6,0);assert.ok([...geometry].every(Number.isFinite));assert.ok(Number.isFinite(pose.toolAngle));
 }
});
test('physics stays finite in every arena at 30, 60 and 120 FPS',()=>{
 for(const arena of ['classic','towers','pit','steps','zigzag','sky','moving','fortress','bridge','crater','vertical','ruins'])for(const fps of [30,60,120]){
  const {game,input}=setup(arena);for(let i=0;i<fps*2;i++){input.state.moveX=i<fps?1:-1;input.state.jumpPressed=i===0;game.update(1/fps);}
  const p=game.getRenderState().player;assert.ok([p.x,p.y,p.velocityX,p.velocityY,p.gaitPhase].every(Number.isFinite));
 }
});
test('active melee parry redirects ownership while projectiles continue aging',()=>{
 const {game}=setup();game.opponent.weapon='blade';game.opponent.attackTime=.1;
 const f=game.opponent,cx=f.x+f.facing*.8;
 const p={x:cx+.1,y:f.y+.2,vx:14,vy:0,life:1,weapon:'bow',owner:'player',age:0};
 assert.equal(game.deflectProjectile(p,f,cx-.1,p.y),true);assert.equal(p.owner,'opponent');assert.ok(p.vx<0);
 assert.equal(game.deflectProjectile(p,f,cx-.1,p.y),false);
 f.attackTime=0;p.deflectCooldown=0;assert.equal(game.deflectProjectile(p,f,cx-.1,p.y),false);
});
test('bomb fuse expiry removes the bomb and emits one visible blast that fades',()=>{
 const {game}=setup();game.selectWeaponById('bomb');game.fireWeapon();
 for(let i=0;i<181;i++)game.update(1/120);
 assert.equal(game.projectiles.length,0);assert.equal(game.explosions.length,1);
 const blast=game.explosions[0];assert.equal(blast.radius,1.8);assert.equal(blast.life,.75);assert.ok(blast.age>=0&&blast.age<.75);
 for(let i=0;i<100;i++)game.update(1/120);assert.equal(game.explosions.length,0);
});
test('close-range bomb detonates once and the final-hit explosion continues fading',()=>{
 const {game}=setup();game.opponent.x=0;game.opponent.y=1.15;game.opponent.health=1;
 game.projectiles.push({x:0,y:1.15,vx:0,vy:0,life:.5,weapon:'bomb',owner:'player',originX:0,returning:false,spin:0,age:1,bounce:0,ricochets:0});
 game.update(1/120);assert.equal(game.projectiles.length,0);assert.equal(game.explosions.length,1);assert.equal(game.winner,'player');
 const before=game.explosions[0].age;game.update(.1);assert.ok(game.explosions[0].age>before);
 for(let i=0;i<10;i++)game.update(.1);assert.equal(game.explosions.length,0);
});

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

test('arenas seed destructible cover and bridge terrain is fully destructible',()=>{
 const fortress=setup('fortress').game.getRenderState();
 assert.ok(fortress.environment.some(e=>e.kind==='wall'&&e.active));
 const bridge=setup('bridge').game.getRenderState();
 assert.equal(bridge.platforms.length,2);
 assert.equal(bridge.environment.filter(e=>e.kind==='wall'&&e.active).length,4);
});
test('crates and bridge sections take direct and explosive damage',()=>{
 const {game}=setup('classic');const crate=game.environment.find(e=>e.kind==='box');assert.ok(crate);
 const startHp=crate.hp;assert.equal(game.hitEnvironment(crate.x,crate.y,7,4,'player'),true);assert.ok(crate.hp<startHp&&crate.active);
 game.explode({x:crate.x,y:crate.y,vx:0,vy:0,life:0,weapon:'bomb',owner:'player',originX:crate.x,returning:false,spin:0,age:0,bounce:0,ricochets:0});
 assert.equal(crate.active,false);
 const bridge=setup('bridge').game,section=bridge.environment[0];assert.ok(section.active);
 bridge.explode({x:section.x,y:section.y,vx:0,vy:0,life:0,weapon:'bomb',owner:'player',originX:section.x,returning:false,spin:0,age:0,bounce:0,ricochets:0});
 assert.equal(section.active,false);
});
test('destructible bridge sections support fighters until destroyed',()=>{
 const {game}=setup('bridge'),section=game.environment[1],top=section.y+section.height/2;
 game.player.x=section.x;game.player.y=top+.98;game.player.velocityY=-1.5;game.player.grounded=false;game.integrate(game.player,1/120);
 assert.equal(game.player.grounded,true);assert.ok(Math.abs(game.player.y-(top+.9))<1e-9);
 section.active=false;game.player.y=top+1.1;game.player.velocityY=-2;game.player.grounded=false;game.integrate(game.player,.05);
 assert.equal(game.player.grounded,false);
});

test('victories award upgrade points and upgrades persist across rounds',()=>{
 const {game}=setup();
 game.opponent.x=game.player.x+1;game.opponent.y=game.player.y;game.opponent.health=1;
 game.fireWeapon();game.update(1/120);
 let state=game.getRenderState();
 assert.equal(state.winner,'player');assert.equal(state.upgradePoints,1);
 assert.equal(game.upgradeWeapon('bow'),true);assert.equal(game.upgradeWeapon('bow'),false);
 game.reset();state=game.getRenderState();
 assert.equal(state.upgradePoints,0);assert.ok(state.upgradedWeapons.includes('bow'));
});

test('all eight weapon upgrades change their combat behavior',()=>{
 const {game}=setup();game.upgradePoints=8;
 for(const id of ['blade','hammer','blaster','uzi','boomerang','bow','bomb','missile'])assert.equal(game.upgradeWeapon(id),true);

 game.opponent.x=game.player.x+1;game.opponent.y=game.player.y;
 let before=game.opponent.health;game.player.weapon='blade';game.player.cooldown=0;game.fireWeapon();
 assert.ok(before-game.opponent.health>8);

 game.opponent.health=100;game.opponent.x=game.player.x+2;game.player.weapon='hammer';game.player.cooldown=0;game.player.grounded=true;game.fireWeapon();
 assert.ok(game.opponent.health<100);assert.ok(game.explosions.some(e=>e.radius===2.35));

 game.projectiles=[];game.player.weapon='blaster';game.player.cooldown=0;game.fireWeapon();
 assert.equal(game.projectiles.length,3);assert.ok(game.projectiles.every(p=>p.damageScale===.58));

 game.projectiles=[];game.player.weapon='uzi';game.player.cooldown=0;game.fireWeapon();
 assert.equal(game.projectiles.length,1);assert.equal(game.projectiles[0].ricochets,2);

 game.projectiles=[];game.player.weapon='boomerang';game.player.cooldown=0;game.fireWeapon();
 assert.equal(game.projectiles.length,2);assert.ok(game.projectiles.every(p=>p.damageScale===.72));

 game.projectiles=[];game.player.weapon='bow';game.player.cooldown=0;game.fireBow(game.player,1);
 assert.equal(game.projectiles.length,3);assert.ok(game.projectiles.every(p=>p.damageScale===.65));

 game.projectiles=[];game.player.weapon='bomb';game.player.cooldown=0;game.fireWeapon();
 assert.equal(game.projectiles[0].sticky,true);
 const sticky=game.projectiles[0];sticky.x=0;sticky.y=.3;sticky.vx=0;sticky.vy=-1;game.update(1/60);
 assert.equal(sticky.stuck,true);

 game.setArena('fortress');game.projectiles=[];game.player.cooldown=0;game.fireWeapon();
 const missile=game.projectiles[0];game.explodeMissile(missile);
 const children=game.projectiles.filter(p=>p.clusterChild);
 assert.equal(children.length,4);assert.ok(children.every(p=>p.damageScale===.42));
});


test('game modes apply weapon rules without losing upgrade progression',()=>{
 const {game}=setup();game.upgradePoints=1;assert.equal(game.upgradeWeapon('missile'),true);
 game.setMode('missile-duel');
 let state=game.getRenderState();
 assert.equal(state.mode,'missile-duel');assert.equal(state.arena,'classic');assert.equal(state.player.weapon,'missile');assert.equal(state.opponent.weapon,'missile');assert.ok(state.upgradedWeapons.includes('missile'));
 game.setMode('melee-only');state=game.getRenderState();assert.ok(['blade','hammer'].includes(state.player.weapon));assert.ok(['blade','hammer'].includes(state.opponent.weapon));
 game.selectWeaponById('blaster');assert.ok(['blade','hammer'].includes(game.getRenderState().player.weapon));
 game.selectWeapon(1);assert.equal(game.getRenderState().player.weapon,'hammer');
 game.setMode('random-weapons');const randomWeapon=game.getRenderState().player.weapon;game.selectWeapon(1);game.selectWeaponById('blade');assert.equal(game.getRenderState().player.weapon,randomWeapon);
});

test('sudden death makes any positive hit lethal',()=>{
 const {game}=setup();game.setMode('sudden-death');assert.ok(game.opponent.health>0);game.damage(game.opponent,.1,0);assert.equal(game.opponent.health,0);
});

test('low gravity reduces fighter and projectile downward acceleration',()=>{
 const normal=setup().game,low=setup().game;low.setMode('low-gravity');
 normal.player.grounded=false;low.player.grounded=false;normal.player.y=5;low.player.y=5;normal.player.velocityY=0;low.player.velocityY=0;
 normal.integrate(normal.player,.1);low.integrate(low.player,.1);
 assert.ok(Math.abs(low.player.velocityY)<Math.abs(normal.player.velocityY));
 const pNormal={x:0,y:5,vx:0,vy:0,life:1,weapon:'bow',owner:'player',originX:0,returning:false,spin:0,age:0,bounce:0,ricochets:0};
 const pLow={...pNormal};normal.projectiles=[pNormal];low.projectiles=[pLow];normal.updateProjectiles(.1);low.updateProjectiles(.1);
 assert.ok(Math.abs(pLow.vy)<Math.abs(pNormal.vy));
});

test('king of the hill awards uncontested center control, victory and upgrade point',()=>{
 const {game}=setup();game.setMode('king-of-hill');game.player.x=0;game.opponent.x=5;
 const before=game.upgradePoints;
 for(let i=0;i<90&&!game.winner;i++)game.update(.1);
 const state=game.getRenderState();assert.equal(state.mode,'king-of-hill');assert.ok(state.hill.player>=state.hill.target);assert.equal(state.winner,'player');assert.equal(state.upgradePoints,before+1);
});

test('fighter body collision blocks walking and dash tunneling',()=>{
 const {game,input}=setup();
 game.player.x=-.65;game.opponent.x=.65;game.player.y=game.opponent.y=1.15;
 input.state={...idle,moveX:1};
 for(let i=0;i<45;i++)game.update(1/60);
 assert.ok(game.opponent.x-game.player.x>=.799,'walking fighters must remain separated');

 game.player.x=-1;game.opponent.x=0;game.player.y=game.opponent.y=1.15;
 game.player.velocityX=0;game.opponent.velocityX=0;game.player.facing=1;
 input.state={...idle,dashPressed:true};
 game.update(.1);
 assert.ok(game.player.x<game.opponent.x,'dash must not tunnel through the opponent');
 assert.ok(game.opponent.x-game.player.x>=.799,'dash collision must preserve body separation');
});

test('spawn and knockback overlaps depenetrate without vertical jitter',()=>{
 const {game,input}=setup();
 const y=game.player.y;
 game.player.x=0;game.opponent.x=0;game.player.y=y;game.opponent.y=y;
 game.player.velocityX=0;game.opponent.velocityX=0;
 input.state={...idle};
 game.update(1/120);
 assert.ok(Math.abs(game.opponent.x-game.player.x)>=.799,'spawn overlap must be resolved');
 assert.ok(Math.abs(game.player.y-y)<.05&&Math.abs(game.opponent.y-y)<.05,'depenetration should stay horizontal');

 game.player.x=-.55;game.opponent.x=.35;game.player.y=game.opponent.y=y;
 game.player.velocityX=20;game.opponent.velocityX=0;game.player.grounded=true;game.opponent.grounded=true;
 game.update(1/30);
 assert.ok(game.player.x<game.opponent.x,'knockback-speed motion must not swap fighter order');
 assert.ok(game.opponent.x-game.player.x>=.799,'knockback-speed motion must end without overlap');
 assert.ok([game.player.x,game.player.y,game.opponent.x,game.opponent.y].every(Number.isFinite));
});

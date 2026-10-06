import type {InputSource,InputState,WeaponId} from "../input/Input";
export type PlatformSurface="normal"|"ice"|"slippery"|"oneWay";
export interface Platform{readonly x:number;readonly y:number;readonly width:number;readonly height:number;readonly surface?:PlatformSurface;}
export type EnemyType="runner"|"tank"|"shooter"|"jumper"|"bomber"|"ninja"|"boss";
export type EnvironmentKind="barrel"|"box"|"wall"|"bounce"|"trap"|"rock";
export interface EnvironmentRenderState{readonly kind:EnvironmentKind;readonly x:number;readonly y:number;readonly width:number;readonly height:number;readonly hp:number;readonly maxHp:number;readonly active:boolean;readonly rotation:number;readonly pulse:number;}
export interface DuelistRenderState{readonly x:number;readonly enemyType:EnemyType|null;readonly bowCharge:number;readonly missileAngle:number;readonly missilePower:number;readonly y:number;readonly velocityX:number;readonly velocityY:number;readonly grounded:boolean;readonly facing:number;readonly health:number;readonly weapon:WeaponId;readonly attackTime:number;readonly attackVariant:number;readonly animationTime:number;readonly gaitPhase:number;readonly landingTime:number;readonly hitTime:number;}
export interface ProjectileRenderState{readonly x:number;readonly y:number;readonly vx:number;readonly vy:number;readonly life:number;readonly weapon:WeaponId;readonly rotation:number;readonly age:number;}
export interface ExplosionRenderState{readonly x:number;readonly y:number;age:number;readonly life:number;readonly radius:number;}
export type ArenaId="classic"|"towers"|"pit"|"steps"|"zigzag"|"sky"|"moving"|"fortress"|"bridge"|"crater"|"vertical"|"ruins";
export type GameModeId="duel"|"missile-duel"|"melee-only"|"random-weapons"|"sudden-death"|"low-gravity"|"king-of-hill";
export interface HillState{readonly player:number;readonly opponent:number;readonly target:number;readonly halfWidth:number;}
export interface ArenaDefinition{readonly id:ArenaId;readonly name:string;readonly platforms:readonly Platform[];readonly spawnX:[number,number];readonly speedMultiplier:number;readonly jumpMultiplier:number;readonly gravity:number;readonly fallLimit:number|null;readonly movingPlatforms:boolean;}
export interface GameRenderState{readonly player:DuelistRenderState;readonly opponent:DuelistRenderState;readonly projectiles:readonly ProjectileRenderState[];readonly explosions:readonly ExplosionRenderState[];readonly platforms:readonly Platform[];readonly environment:readonly EnvironmentRenderState[];readonly winner:"player"|"opponent"|null;readonly arena:ArenaId;readonly mode:GameModeId;readonly hill:HillState;readonly upgradePoints:number;readonly upgradedWeapons:readonly WeaponId[];}
interface Fighter{x:number;y:number;velocityX:number;velocityY:number;grounded:boolean;facing:number;health:number;maxHealth:number;enemyType:EnemyType|null;weapon:WeaponId;attackTime:number;cooldown:number;bowCharge:number;bowCharging:boolean;attackVariant:number;doubleJumpAvailable:boolean;airDashAvailable:boolean;dashCooldown:number;wallJumpCooldown:number;gaitPhase:number;landingTime:number;hitTime:number;}
interface Projectile{x:number;y:number;vx:number;vy:number;life:number;weapon:WeaponId;owner:"player"|"opponent";originX:number;returning:boolean;spin:number;age:number;bounce:number;ricochets:number;deflectCooldown?:number;damageScale?:number;sticky?:boolean;stuck?:boolean;clusterChild?:boolean;}
interface EnvironmentBody{kind:EnvironmentKind;x:number;y:number;width:number;height:number;hp:number;maxHp:number;active:boolean;rotation:number;pulse:number;vx:number;vy:number;grounded:boolean;cooldown:number;}
const PH=.8,HH=1.8,G=-22,ACC=32,MAX=8,FRIC=26,AIR=5,JUMP=9.2,DASH_SPEED=14,DASH_TIME=.12,DASH_COOLDOWN=.65,WALL_JUMP_SPEED=9.6,MIN_MISSILE_ANGLE=12,MAX_MISSILE_ANGLE=78,MIN_MISSILE_POWER=8,MAX_MISSILE_POWER=18,HILL_TARGET=8,HILL_HALF_WIDTH=1.6;
const ARENAS:Readonly<Record<ArenaId,ArenaDefinition>>={
 classic:{id:"classic",name:"CLASSIC",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-5,5],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-4,y:2,width:3.5,height:.35,surface:"ice"},{x:.5,y:3.7,width:3.5,height:.35,surface:"slippery"}]},
 towers:{id:"towers",name:"TOWERS",speedMultiplier:1,jumpMultiplier:1.15,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-7,7],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.6,width:4.5,height:.35,surface:"oneWay"},{x:4.5,y:1.6,width:4.5,height:.35},{x:-3,y:3.5,width:6,height:.35,surface:"ice"},{x:-10,y:5.2,width:3.5,height:.35},{x:6.5,y:5.2,width:3.5,height:.35}]},
 pit:{id:"pit",name:"PIT",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:-3.5,movingPlatforms:false,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:7.5,height:.5},{x:4.5,y:-.25,width:7.5,height:.5},{x:-7.5,y:2.1,width:4,height:.35,surface:"slippery"},{x:3.5,y:2.1,width:4,height:.35},{x:-1.75,y:4,width:3.5,height:.35}]},
 steps:{id:"steps",name:"STEPS",speedMultiplier:1.2,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-10,y:1.1,width:3.5,height:.35,surface:"ice"},{x:-6,y:2.0,width:3.5,height:.35,surface:"slippery"},{x:-2,y:2.9,width:3.5,height:.35},{x:2,y:2.0,width:3.5,height:.35},{x:6,y:1.1,width:3.5,height:.35}]},
 zigzag:{id:"zigzag",name:"ZIGZAG",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:true,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-10,y:1.3,width:4.5,height:.35},{x:-3.5,y:2.8,width:4,height:.35,surface:"oneWay"},{x:2.5,y:1.3,width:4.5,height:.35},{x:7,y:3.6,width:3,height:.35}]},
 sky:{id:"sky",name:"SKY",speedMultiplier:1,jumpMultiplier:1.25,gravity:-18,fallLimit:null,movingPlatforms:false,spawnX:[-6,6],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.7,width:3.5,height:.35},{x:-3,y:3.1,width:3.5,height:.35,surface:"ice"},{x:3,y:1.7,width:3.5,height:.35},{x:-1.75,y:4.7,width:3.5,height:.35}]}, moving:{id:"moving",name:"MOVING",speedMultiplier:1,jumpMultiplier:1.05,gravity:G,fallLimit:null,movingPlatforms:true,spawnX:[-7,7],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.5,width:3.5,height:.35,surface:"slippery"},{x:-3.5,y:2.8,width:3.5,height:.35},{x:2,y:1.6,width:3.5,height:.35},{x:6,y:3.3,width:3.5,height:.35}]},
 fortress:{id:"fortress",name:"FORTRESS",speedMultiplier:.9,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-9,9],platforms:[{x:-12,y:-.25,width:24,height:.5}]},
 bridge:{id:"bridge",name:"BRIDGE",speedMultiplier:1.05,jumpMultiplier:1,gravity:G,fallLimit:-4.5,movingPlatforms:false,spawnX:[-7,7],platforms:[{x:-12,y:-.25,width:7.5,height:.5},{x:5.2,y:.2,width:6.8,height:.5}]},
 crater:{id:"crater",name:"CRATER",speedMultiplier:1,jumpMultiplier:1.08,gravity:G,fallLimit:-5,movingPlatforms:false,spawnX:[-6,6],platforms:[{x:-12,y:-.25,width:5.5,height:.5},{x:-5.3,y:-1,width:10.6,height:.5},{x:6.5,y:-.25,width:5.5,height:.5},{x:-2.5,y:1.25,width:5,height:.35},{x:3.3,y:3,width:3.3,height:.35,surface:"oneWay"}]},
 vertical:{id:"vertical",name:"VERTICAL",speedMultiplier:1.12,jumpMultiplier:1.2,gravity:G,fallLimit:-5,movingPlatforms:false,spawnX:[-7,7],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-8.8,y:1.35,width:3.2,height:.35},{x:5.6,y:1.35,width:3.2,height:.35},{x:-5.4,y:3,width:3.1,height:.35,surface:"oneWay"},{x:2.3,y:3,width:3.1,height:.35,surface:"oneWay"},{x:-1.7,y:4.65,width:3.4,height:.35}]},
 ruins:{id:"ruins",name:"RUINS",speedMultiplier:.98,jumpMultiplier:1,gravity:G,fallLimit:-4.5,movingPlatforms:true,spawnX:[-7,7],platforms:[{x:-12,y:-.25,width:6.2,height:.5},{x:-5.1,y:1.1,width:3.1,height:.35},{x:-.6,y:2.35,width:3.6,height:.35,surface:"ice"},{x:3.7,y:1.05,width:3.2,height:.35,surface:"slippery"},{x:7.5,y:2.9,width:3.2,height:.35},{x:-1,y:4.1,width:2.6,height:.35,surface:"oneWay"}]}
};
interface EnvironmentTemplate{readonly kind:EnvironmentKind;readonly x:number;readonly y:number;readonly width:number;readonly height:number;readonly hp:number;}
const ENVIRONMENT_TEMPLATES:Readonly<Record<ArenaId,readonly EnvironmentTemplate[]>>={
 classic:[
  {kind:"box",x:-1.8,y:.8,width:1.05,height:1.05,hp:16},
  {kind:"barrel",x:1.65,y:.8,width:.75,height:1.1,hp:1}
 ],
 towers:[
  {kind:"wall",x:-1.35,y:1.2,width:.7,height:1.9,hp:30},
  {kind:"wall",x:1.35,y:1.2,width:.7,height:1.9,hp:30},
  {kind:"box",x:0,y:.8,width:1,height:1,hp:18}
 ],
 pit:[
  {kind:"rock",x:-4.9,y:.8,width:1.15,height:1.1,hp:28},
  {kind:"rock",x:4.9,y:.8,width:1.15,height:1.1,hp:28}
 ],
 steps:[
  {kind:"box",x:-4.2,y:.8,width:1,height:1,hp:16},
  {kind:"barrel",x:4.4,y:.8,width:.75,height:1.1,hp:1}
 ],
 zigzag:[
  {kind:"box",x:-5.1,y:.8,width:1.05,height:1.05,hp:16},
  {kind:"barrel",x:5.1,y:.8,width:.75,height:1.1,hp:1}
 ],
 sky:[
  {kind:"rock",x:0,y:.8,width:1.2,height:1.05,hp:28},
  {kind:"box",x:4.2,y:.8,width:1,height:1,hp:16}
 ],
 moving:[
  {kind:"box",x:-5.2,y:.8,width:1,height:1,hp:16},
  {kind:"box",x:5.2,y:.8,width:1,height:1,hp:16}
 ],
 fortress:[
  {kind:"wall",x:-1.95,y:1.2,width:1.05,height:1.9,hp:46},
  {kind:"wall",x:1.95,y:1.2,width:1.05,height:1.9,hp:46},
  {kind:"barrel",x:0,y:.8,width:.75,height:1.1,hp:1}
 ],
 bridge:[
  {kind:"wall",x:-3.225,y:.40,width:2.35,height:.30,hp:14},
  {kind:"wall",x:-.875,y:.50,width:2.35,height:.30,hp:14},
  {kind:"wall",x:1.475,y:.60,width:2.35,height:.30,hp:14},
  {kind:"wall",x:3.825,y:.70,width:2.35,height:.30,hp:14}
 ],
 crater:[
  {kind:"rock",x:-1.35,y:.15,width:1.2,height:1.2,hp:30},
  {kind:"barrel",x:0,y:.05,width:.75,height:1.1,hp:1},
  {kind:"rock",x:1.35,y:.15,width:1.2,height:1.2,hp:30}
 ],
 vertical:[
  {kind:"wall",x:-2.15,y:1.0,width:.72,height:1.5,hp:26},
  {kind:"wall",x:2.15,y:1.0,width:.72,height:1.5,hp:26},
  {kind:"box",x:0,y:.8,width:1,height:1,hp:18}
 ],
 ruins:[
  {kind:"box",x:-10.1,y:.8,width:1,height:1,hp:16},
  {kind:"barrel",x:-8.55,y:.8,width:.75,height:1.1,hp:1}
 ]
};
const WEAPONS:Readonly<Record<WeaponId,{damage:number;range:number;cooldown:number;knockback:number;projectileSpeed?:number;radius?:number;automatic?:boolean}>>={
 blade:{damage:8,range:1.35,cooldown:.32,knockback:4},
 hammer:{damage:14,range:1.45,cooldown:.75,knockback:8},
 blaster:{damage:7,range:0,cooldown:.5,knockback:5,projectileSpeed:14},
 uzi:{damage:4,range:0,cooldown:.12,knockback:2.5,projectileSpeed:16,automatic:true},
 boomerang:{damage:9,range:0,cooldown:.7,knockback:4,projectileSpeed:10},
 bow:{damage:12,range:0,cooldown:.9,knockback:3,projectileSpeed:18},
 bomb:{damage:18,range:0,cooldown:1.15,knockback:9,projectileSpeed:8,radius:1.8},
 missile:{damage:22,range:0,cooldown:1.05,knockback:10,projectileSpeed:1,radius:1.15}
};
const ORDER:readonly WeaponId[]=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile"];
export class GameSession{
 private arenaId:ArenaId="classic";private modeId:GameModeId="duel";
 private missileAngle=45;private missilePower=13;private hillPlayer=0;private hillOpponent=0;
 private elapsed=0;private enemyRound=0;private upgradePoints=0;private readonly upgradedWeapons=new Set<WeaponId>();private player:Fighter=this.create(-5,1,null);private opponent:Fighter=this.create(5,-1,"runner");private projectiles:Projectile[]=[];private explosions:ExplosionRenderState[]=[];private environment:EnvironmentBody[]=[];private winner:"player"|"opponent"|null=null;
 constructor(private readonly input:InputSource){}
 private get arena(){return ARENAS[this.arenaId];}
 private get missileRules(){return this.modeId==="missile-duel"||(this.arenaId==="fortress"&&this.modeId==="duel");}
 private get gravityScale(){return this.modeId==="low-gravity"?.55:1;}
 private get platforms(){return this.platformsAt(this.elapsed);}
 private platformsAt(time:number){return this.arena.movingPlatforms?this.arena.platforms.map((p,i)=>i===0?p:{...p,x:p.x+Math.sin(time*1.15+i*1.4)*1.1,y:p.y+Math.sin(time*.8+i*1.9)*.22}):this.arena.platforms;}
 private platformAtSpawn(x:number){const underneath=this.platforms.filter(p=>x>=p.x&&x<=p.x+p.width);if(underneath.length)return underneath.reduce((a,b)=>a.y+a.height>b.y+b.height?a:b);return this.platforms.reduce((best,p)=>Math.abs((p.x+p.width/2)-x)<Math.abs((best.x+best.width/2)-x)?p:best,this.platforms[0]);}
 private create(x:number,facing:number,enemyType:EnemyType|null):Fighter{
  const p=this.platformAtSpawn(x);
  const stats=enemyType===null?{health:100,weapon:"blade" as WeaponId,speed:1,jump:1}:{health:{runner:85,tank:170,shooter:90,jumper:95,bomber:105,ninja:100,boss:220}[enemyType],weapon:{runner:"blade",tank:"hammer",shooter:"blaster",jumper:"boomerang",bomber:"bomb",ninja:"uzi",boss:"hammer"}[enemyType] as WeaponId,speed:{runner:1.35,tank:.68,shooter:.82,jumper:1.05,bomber:.9,ninja:1.2,boss:.92}[enemyType],jump:{runner:1.1,tank:.8,shooter:.9,jumper:1.35,bomber:1,ninja:1.15,boss:1.1}[enemyType]};
  return{x,y:p.y+p.height+HH/2,velocityX:0,velocityY:0,grounded:true,facing,health:stats.health,maxHealth:stats.health,enemyType,weapon:this.missileRules?"missile":stats.weapon,attackTime:0,cooldown:0,bowCharge:0,bowCharging:false,attackVariant:0,doubleJumpAvailable:true,airDashAvailable:true,dashCooldown:0,wallJumpCooldown:0,gaitPhase:0,landingTime:0,hitTime:0};
}
 setArena(id:ArenaId){this.arenaId=id;this.reset();}
 setMode(id:GameModeId){this.modeId=id;this.reset();}
 getArena(){return this.arena;}
 getMode(){return this.modeId;}
 setMissileAngle(angle:number){this.missileAngle=Math.max(MIN_MISSILE_ANGLE,Math.min(MAX_MISSILE_ANGLE,angle));}
 setMissilePower(power:number){this.missilePower=Math.max(MIN_MISSILE_POWER,Math.min(MAX_MISSILE_POWER,power));}
 fireWeapon(){if(this.winner)return;const w=WEAPONS[this.player.weapon];this.attack(this.player,this.opponent,Boolean(w));}
 getMissileAim(){return{angle:this.missileAngle,power:this.missilePower};}
 upgradeWeapon(id:WeaponId){if(this.upgradePoints<=0||this.upgradedWeapons.has(id))return false;this.upgradedWeapons.add(id);this.upgradePoints--;return true;}
 reset(){this.elapsed=0;this.missileAngle=45;this.missilePower=13;this.hillPlayer=0;this.hillOpponent=0;this.explosions=[];this.enemyRound++;const types:EnemyType[]=["runner","tank","shooter","jumper","bomber","ninja","boss"];this.player=this.create(this.arena.spawnX[0],1,null);this.opponent=this.create(this.arena.spawnX[1],-1,types[(this.enemyRound-1)%types.length]);if(this.modeId==="melee-only"){this.player.weapon="blade";this.opponent.weapon=this.opponent.enemyType==="tank"||this.opponent.enemyType==="boss"?"hammer":"blade";}else if(this.modeId==="random-weapons"){const pool=ORDER.filter(id=>id!=="missile");this.player.weapon=pool[Math.floor(Math.random()*pool.length)];this.opponent.weapon=pool[Math.floor(Math.random()*pool.length)];}this.projectiles=[];this.resetEnvironment();this.winner=null;}
 private availableWeapons():WeaponId[]{if(this.missileRules)return["missile"];if(this.modeId==="melee-only")return["blade","hammer"];if(this.modeId==="random-weapons")return[this.player.weapon];return ORDER.filter(id=>id!=="missile");}
 selectWeapon(direction:1|-1){if(this.modeId==="random-weapons")return;const available=this.availableWeapons();const i=Math.max(0,available.indexOf(this.player.weapon));this.player.weapon=available[(i+direction+available.length)%available.length];this.player.bowCharging=false;this.player.bowCharge=0;}
 selectWeaponById(id:WeaponId){if(this.modeId==="random-weapons")return;const available=this.availableWeapons();if(!available.includes(id))return;this.player.weapon=id;this.player.bowCharging=false;this.player.bowCharge=0;}
 update(dt:number){
  if(!Number.isFinite(dt)||dt<=0){this.input.endFrame();return;}
  if(this.winner){this.explosions=this.explosions.filter(e=>(e.age+=Math.min(dt,.1))<e.life);this.input.endFrame();return;}
  const input=this.input.getState(),duration=Math.min(dt,.1),steps=Math.ceil(duration/(1/120));
  for(let i=0;i<steps;i++) {
   const frame=i===0?input:{...input,jumpPressed:false,dashPressed:false,attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false};
   for(const f of [this.player,this.opponent]){f.landingTime=Math.max(0,f.landingTime-duration/steps);f.hitTime=Math.max(0,f.hitTime-duration/steps);}
   const before=this.platforms;
   const after=this.platformsAt(this.elapsed+duration/steps);
   for(const f of [this.player,this.opponent]){
    const index=f.grounded?before.findIndex(p=>Math.abs(f.y-HH/2-p.y-p.height)<.12&&f.x+PH/2>p.x&&f.x-PH/2<p.x+p.width):-1;
    if(index>=0){f.x+=after[index].x-before[index].x;f.y+=after[index].y-before[index].y;}
   }
   this.step(duration/steps,frame);
   for(const f of [this.player,this.opponent])f.gaitPhase+=Math.abs(f.velocityX)*duration/steps*1.8;
  }
  this.input.endFrame();
 }
 private step(dt:number,input:InputState){if(this.winner){this.explosions=this.explosions.filter(e=>(e.age+=dt)<e.life);return;}this.elapsed+=dt;this.explosions=this.explosions.filter(e=>(e.age+=dt)<e.life);this.updateEnvironment(dt);this.updatePlayer(input,dt);this.updateOpponent(dt);this.resolveEnvironmentFighter(this.player);this.resolveEnvironmentFighter(this.opponent);const playerWeapon=WEAPONS[this.player.weapon];if(this.player.weapon==="bow")this.updateBow(input,dt);else this.attack(this.player,this.opponent,input.attackPressed||(Boolean(playerWeapon.automatic)&&input.attackHeld));this.updateProjectiles(dt);this.player.attackTime=Math.max(0,this.player.attackTime-dt);this.opponent.attackTime=Math.max(0,this.opponent.attackTime-dt);this.player.cooldown=Math.max(0,this.player.cooldown-dt);this.opponent.cooldown=Math.max(0,this.opponent.cooldown-dt);if(this.player.health<=0)this.winner="opponent";else if(this.opponent.health<=0){this.winner="player";this.upgradePoints++;}else this.updateHill(dt);if(!this.missileRules&&this.modeId!=="random-weapons"){if(input.weaponNextPressed)this.selectWeapon(1);if(input.weaponPreviousPressed)this.selectWeapon(-1);}}
 private updatePlayer(input:InputState,dt:number){
  const d=Math.abs(input.moveX)>.01?Math.sign(input.moveX):0;
  if(input.dashPressed)this.tryDash(this.player);
  if(input.jumpPressed)this.tryJump(this.player);
  if(this.player.dashCooldown>0)this.player.dashCooldown=Math.max(0,this.player.dashCooldown-dt);
  if(this.player.wallJumpCooldown>0)this.player.wallJumpCooldown=Math.max(0,this.player.wallJumpCooldown-dt);
  if(this.player.dashCooldown<=DASH_COOLDOWN-DASH_TIME)this.move(this.player,d,dt);
  this.integrate(this.player,dt);
}
 private updateOpponent(dt:number){
  const dx=this.player.x-this.opponent.x;
  const type=this.opponent.enemyType!;
  const distance=Math.abs(dx);
  const objectiveDx=this.modeId==="king-of-hill"&&Math.abs(this.opponent.x)>HILL_HALF_WIDTH?-this.opponent.x:dx;
  const d=Math.abs(objectiveDx)>.9?Math.sign(objectiveDx):0;
  if(this.opponent.dashCooldown>0)this.opponent.dashCooldown=Math.max(0,this.opponent.dashCooldown-dt);
  if(this.opponent.wallJumpCooldown>0)this.opponent.wallJumpCooldown=Math.max(0,this.opponent.wallJumpCooldown-dt);
  const jumpThreshold=type==="jumper"?0.8:type==="runner"?1.7:1.5;
  if(this.opponent.grounded&&this.player.y-this.opponent.y>jumpThreshold)this.tryJump(this.opponent);
  if((type==="jumper"||type==="ninja"||type==="boss")&&!this.opponent.grounded&&distance>2.2&&this.opponent.dashCooldown<=0&&Math.random()<dt*.8)this.tryDash(this.opponent);
  let moveDirection=d;
  if(type==="shooter"||type==="bomber"){if(distance<3.2)moveDirection=-d;else if(distance>6)moveDirection=d;else moveDirection=0;}
  if(type==="tank"&&distance<2)moveDirection=d;
  this.move(this.opponent,moveDirection*(type==="runner"?1.15:type==="tank"?.72:type==="shooter"?.8:type==="ninja"?1.05:1),dt);
  this.integrate(this.opponent,dt);
  const attackRange=this.missileRules?Infinity:type==="shooter"?7:type==="bomber"?6:type==="jumper"?4.5:type==="boss"?2.4:2;
  if(this.missileRules){if(this.opponent.cooldown<=0&&distance>4.5)this.attack(this.opponent,this.player,true);}else if(distance<attackRange&&this.opponent.cooldown<=0){this.attack(this.opponent,this.player,true);}
}
 private tryJump(f:Fighter){
  if(f.grounded){
    f.velocityY=JUMP*this.arena.jumpMultiplier;
    f.grounded=false;
    f.doubleJumpAvailable=true;
    f.airDashAvailable=true;
    return;
  }
  const wall=this.wallDirection(f);
  if(wall!==0&&f.wallJumpCooldown<=0){
    f.velocityY=JUMP*this.arena.jumpMultiplier;
    f.velocityX=-wall*WALL_JUMP_SPEED;
    f.facing=-wall;
    f.doubleJumpAvailable=true;
    f.airDashAvailable=true;
    f.wallJumpCooldown=.18;
    return;
  }
  if(f.doubleJumpAvailable){
    f.velocityY=JUMP*this.arena.jumpMultiplier*.92;
    f.doubleJumpAvailable=false;
  }
 }
 private tryDash(f:Fighter){
  if(f.dashCooldown>0||(!f.grounded&&!f.airDashAvailable))return;
  f.velocityX=f.facing*DASH_SPEED;
  if(!f.grounded){f.airDashAvailable=false;f.velocityY*=.35;}
  f.dashCooldown=DASH_COOLDOWN;
 }
 private wallDirection(f:Fighter){
  const edgeTolerance=.14;
  for(const p of this.platforms){
    const verticalOverlap=f.y-HH/2<p.y+p.height+.08&&f.y+HH/2>p.y-.05;
    if(!verticalOverlap)continue;
    if(Math.abs((f.x+PH/2)-p.x)<edgeTolerance)return 1;
    if(Math.abs((f.x-PH/2)-(p.x+p.width))<edgeTolerance)return -1;
  }
  for(const e of this.environment){
    if(!e.active||e.kind!=="wall")continue;
    const left=e.x-e.width/2,right=e.x+e.width/2,bottom=e.y-e.height/2,top=e.y+e.height/2;
    if(f.y-HH/2>=top+.08||f.y+HH/2<=bottom-.05)continue;
    if(Math.abs((f.x+PH/2)-left)<edgeTolerance)return 1;
    if(Math.abs((f.x-PH/2)-right)<edgeTolerance)return -1;
  }
  return 0;
 }
 private move(f:Fighter,d:number,dt:number){
  if(f.hitTime>.12||f.wallJumpCooldown>.1)return;
  if(f.dashCooldown>DASH_COOLDOWN-DASH_TIME)return;
  const surface=this.supportPlatform(f)?.surface??'normal';
  const grip=surface==='ice'?.22:surface==='slippery'?.1:1;
  const max=MAX*this.arena.speedMultiplier;
  if(d){
   f.facing=Math.sign(d);
   const target=d*max;
   const acceleration=ACC*(f.grounded?grip:.42)*dt;
   f.velocityX+=Math.max(-acceleration,Math.min(acceleration,target-f.velocityX));
  }else{
   const amount=(f.grounded?FRIC*grip:AIR*.25)*dt;
   f.velocityX=Math.abs(f.velocityX)<=amount?0:f.velocityX-Math.sign(f.velocityX)*amount;
  }
 }
 private integrate(f:Fighter,dt:number){
  const previousX=f.x;
  const previousBottom=f.y-HH/2;
  const previousTop=f.y+HH/2;
  f.velocityY+=this.arena.gravity*this.gravityScale*dt;
  f.x+=f.velocityX*dt;
  f.y+=f.velocityY*dt;
  f.grounded=false;
  const currentBottom=f.y-HH/2;
  let landingTop:number|null=null;
  for(const p of this.platforms){
    const top=p.y+p.height;
    const overlap=f.x+PH/2>p.x&&f.x-PH/2<p.x+p.width;
    const crossed=previousBottom>=top-.08&&currentBottom<=top+.08;
    if(f.velocityY<=0&&overlap&&crossed&&(landingTop===null||top>landingTop))landingTop=top;
  }
  if(landingTop!==null){
    const incoming=-f.velocityY;
    f.y=landingTop+HH/2;
    if(incoming>2)f.landingTime=.18*Math.min(1,incoming/10);
    f.velocityY=0;
    f.grounded=true;
    f.doubleJumpAvailable=true;
    f.airDashAvailable=true;
  }
  const bounds=this.platforms.reduce((b,p)=>({min:Math.min(b.min,p.x),max:Math.max(b.max,p.x+p.width)}),{min:Infinity,max:-Infinity});
  f.x=Math.max(bounds.min+PH/2,Math.min(bounds.max-PH/2,f.x));
  // Keep fighters inside the visible combat area rather than allowing them to run to off-screen platform edges.
  const screenMin=-6,screenMax=6;
  f.x=Math.max(screenMin+PH/2,Math.min(screenMax-PH/2,f.x));
  if(this.arenaId==="fortress"&&this.modeId==="duel"){if(f===this.player)f.x=Math.max(screenMin+PH/2,Math.min(-2.6,f.x));else f.x=Math.max(2.6,Math.min(screenMax-PH/2,f.x));}
  if(this.arena.fallLimit!==null&&f.y-HH/2<this.arena.fallLimit){f.health=0;return;}
  for(const p of this.platforms){
   if(p.surface==='oneWay')continue;
   const top=p.y+p.height;
   const vertical=f.y-HH/2<top-.01&&f.y+HH/2>p.y+.01;
   if(vertical&&previousX+PH/2<=p.x&&f.x+PH/2>p.x){f.x=p.x-PH/2;f.velocityX=0;}
   else if(vertical&&previousX-PH/2>=p.x+p.width&&f.x-PH/2<p.x+p.width){f.x=p.x+p.width+PH/2;f.velocityX=0;}
   if(f.velocityY>0&&previousTop<=p.y&&f.y+HH/2>=p.y&&f.x+PH/2>p.x&&f.x-PH/2<p.x+p.width){f.y=p.y-HH/2;f.velocityY=0;}
  }
  this.resolveEnvironmentLanding(f,previousBottom,previousX);
 }
 private updateBow(input:InputState,dt:number){
  if(input.attackPressed&&this.player.cooldown<=0&&!this.player.bowCharging){this.player.bowCharging=true;this.player.bowCharge=0;this.player.attackTime=.12;}
  if(!this.player.bowCharging)return;
  if(input.attackHeld){this.player.bowCharge=Math.min(1,this.player.bowCharge+dt/.9);this.player.attackTime=.12+this.player.bowCharge*.12;return;}
  this.fireBow(this.player,Math.max(.12,this.player.bowCharge));
 }
 private fireBow(a:Fighter,charge:number){
  if(a.cooldown>0){a.bowCharging=false;a.bowCharge=0;return;}
  const w=WEAPONS.bow,direction=a.facing,speed=w.projectileSpeed!*(.58+.62*charge),angle=(4+11*charge)*Math.PI/180;
  const originX=a.x+direction*(.72+.08*charge),originY=a.y+.48;
  const upgraded=a===this.player&&this.upgradedWeapons.has("bow");
  for(const offset of upgraded?[-8,0,8]:[0]){
   const flightAngle=angle+offset*Math.PI/180;
   this.projectiles.push({x:originX,y:originY,vx:direction*Math.cos(flightAngle)*speed+a.velocityX*.2,vy:Math.sin(flightAngle)*speed+Math.max(0,a.velocityY*.12),life:2.8,weapon:"bow",owner:a===this.player?"player":"opponent",originX:a.x,returning:false,spin:flightAngle,age:0,bounce:0,ricochets:0,damageScale:upgraded?.65:1});
  }
  a.cooldown=w.cooldown;a.attackTime=.22;a.bowCharge=0;a.bowCharging=false;
 }
 private attack(a:Fighter,t:Fighter,pressed:boolean){
  const w=WEAPONS[a.weapon];
  if(!pressed||a.cooldown>0)return;
  const upgraded=a===this.player&&this.upgradedWeapons.has(a.weapon);
  const wall=this.wallDirection(a);
  const melee=a.weapon==="blade"||a.weapon==="hammer";
  if(melee&&!a.grounded&&wall!==0){
    a.velocityX=-wall*WALL_JUMP_SPEED;
    a.velocityY=Math.max(a.velocityY,JUMP*this.arena.jumpMultiplier*.78);
    a.facing=-wall;
  }else if(melee){
    a.velocityX=Math.max(-DASH_SPEED,Math.min(DASH_SPEED,a.velocityX+a.facing*(a.weapon==="hammer"?5.2:3.8)));
  }
  if(this.missileRules&&a.weapon!=="missile")a.weapon="missile";
  a.cooldown=w.cooldown;
  if(a.weapon==="missile"&&a===this.player){
    const radians=this.missileAngle*Math.PI/180;
    const direction=a.facing;
    this.projectiles.push({x:a.x+direction*.75,y:a.y+1.05,vx:Math.cos(radians)*this.missilePower*direction,vy:Math.sin(radians)*this.missilePower,life:4,weapon:"missile",owner:"player",originX:a.x,returning:false,spin:radians,age:0,bounce:0,ricochets:0});
    a.attackTime=.22;
    return;
  }
  a.attackTime=a.weapon==="blade"?.22:a.weapon==="hammer"?.24:.14;
  if(a.weapon==="blade")a.attackVariant=(a.attackVariant+1)%4;
  if(a.weapon==="missile"&&a===this.opponent){
    const dx=this.player.x-a.x,dy=(this.player.y+.2)-a.y;const dist=Math.max(1,Math.abs(dx));const angle=Math.max(20,Math.min(65,Math.atan2(Math.max(.5,dy),dist)*180/Math.PI+12));const power=Math.max(8,Math.min(18,dist/(Math.cos(angle*Math.PI/180)*.72)));const radians=angle*Math.PI/180;const direction=Math.sign(dx)||a.facing;this.projectiles.push({x:a.x+direction*.75,y:a.y+1.05,vx:Math.cos(radians)*power*direction,vy:Math.sin(radians)*power,life:4,weapon:"missile",owner:"opponent",originX:a.x,returning:false,spin:radians,age:0,bounce:0,ricochets:0});a.attackTime=.22;return;
  }
  if(a.weapon==="bow")a.attackVariant=(a.attackVariant+1)%2;
  if(a.weapon==="hammer"){
    a.attackVariant=(a.attackVariant+1)%3;
    const distance=t.x-a.x;
    if(upgraded&&a.grounded){
      const slamRadius=2.35;
      if(Math.abs(distance)<=slamRadius&&Math.abs(t.y-a.y)<1.55){
        const direction=Math.sign(distance)||a.facing;
        this.damage(t,w.damage*1.15,direction*w.knockback*1.35);
        t.velocityY=Math.max(t.velocityY,7);
      }
      this.hitEnvironment(a.x+a.facing*1.4,a.y-.55,w.damage*1.8,a.facing*w.knockback*1.6,a===this.player?"player":"opponent");
      this.hitEnvironment(a.x-a.facing*1.05,a.y-.55,w.damage*1.35,-a.facing*w.knockback,a===this.player?"player":"opponent");
      this.explosions.push({x:a.x,y:a.y-HH/2+.12,age:0,life:.34,radius:slamRadius});
      a.velocityX*=.35;
      return;
    }
    if(Math.sign(distance)===a.facing&&Math.abs(distance)<=w.range*1.08&&Math.abs(t.y-a.y)<1.2){
      this.damage(t,w.damage,a.facing*w.knockback*1.15);
      t.velocityY=Math.max(t.velocityY,a.grounded?5.2:3.6);
      if(a.grounded)a.velocityX*=.55;
    }
    this.strikeEnvironment(a,w.damage*1.35,a.facing*w.knockback*1.35);
    return;
  }
  if(a.weapon==="blade"){
    const distance=t.x-a.x,range=w.range*(upgraded?1.12:1),damage=w.damage*(upgraded?1.65:1),knockback=w.knockback*(upgraded?1.12:1);
    if(Math.sign(distance)===a.facing&&Math.abs(distance)<=range&&Math.abs(t.y-a.y)<1.2)this.damage(t,damage,a.facing*knockback);
    this.strikeEnvironment(a,damage*.9,a.facing*knockback);
    return;
  }
  a.velocityX-=a.facing*(a.weapon==="blaster"?1.3:a.weapon==="uzi"?.4:.6);
  const owner=a===this.player?"player":"opponent";
  const spawn=(vy:number,damageScale=1,extraRicochets=0)=>this.projectiles.push({
    x:a.x+a.facing*.65,
    y:a.y+.35,
    vx:a.facing*(w.projectileSpeed??8),
    vy,
    life:a.weapon==="bomb"?1.5:a.weapon==="boomerang"?2.4:2,
    weapon:a.weapon,
    owner,
    originX:a.x,
    returning:false,
    spin:a.weapon==="boomerang"?a.facing:0,
    age:0,
    bounce:0,
    ricochets:(a.weapon==="blaster"?1:a.weapon==="bow"?1:0)+extraRicochets,
    damageScale,
    sticky:a.weapon==="bomb"&&upgraded,
    stuck:false
  });
  if(a.weapon==="blaster"&&upgraded){for(const vy of [-1.35,0,1.35])spawn(vy,.58);return;}
  if(a.weapon==="boomerang"&&upgraded){spawn(4,.72);spawn(1.2,.72);return;}
  spawn(a.weapon==="boomerang"?2.8:a.weapon==="bomb"?2.4:a.weapon==="bow"?1.8:0,1,a.weapon==="uzi"&&upgraded?2:0);
}
 private damage(t:Fighter,damage:number,knockback:number){const mass=t.enemyType==="tank"?1.8:t.enemyType==="boss"?2.2:1;t.health=Math.max(0,t.health-(this.modeId==="sudden-death"&&damage>0?t.health:damage));t.velocityX+=knockback/mass;t.velocityY=Math.max(t.velocityY,2/mass);t.grounded=false;t.hitTime=.22;}
 private updateHill(dt:number){if(this.modeId!=="king-of-hill")return;const playerIn=Math.abs(this.player.x)<=HILL_HALF_WIDTH,opponentIn=Math.abs(this.opponent.x)<=HILL_HALF_WIDTH;if(playerIn===opponentIn)return;if(playerIn)this.hillPlayer=Math.min(HILL_TARGET,this.hillPlayer+dt);else this.hillOpponent=Math.min(HILL_TARGET,this.hillOpponent+dt);if(this.hillPlayer>=HILL_TARGET){this.winner="player";this.upgradePoints++;}else if(this.hillOpponent>=HILL_TARGET)this.winner="opponent";}
 private resetEnvironment(){
  this.environment=ENVIRONMENT_TEMPLATES[this.arenaId].map(t=>({kind:t.kind,x:t.x,y:t.y,width:t.width,height:t.height,hp:t.hp,maxHp:t.hp,active:true,rotation:0,pulse:0,vx:0,vy:0,grounded:false,cooldown:0}));
  for(const e of this.environment)this.snapEnvironmentToPlatform(e);
 }
 private snapEnvironmentToPlatform(e:EnvironmentBody){
  if(e.kind==="trap"){return;}
  const desiredBottom=e.y-e.height/2;
  const support=this.platforms.filter(p=>e.x+e.width/2>p.x&&e.x-e.width/2<p.x+p.width).reduce<Platform|null>((best,p)=>!best||Math.abs((p.y+p.height)-desiredBottom)<Math.abs((best.y+best.height)-desiredBottom)?p:best,null);
  if(support)e.y=support.y+support.height+e.height/2-(e.kind==="bounce"?.02:0);
 }
 private updateEnvironment(dt:number){
  for(const e of this.environment){
   if(!e.active)continue;
   e.pulse=Math.max(0,e.pulse-dt*4);e.cooldown=Math.max(0,e.cooldown-dt);
   if(e.kind!=="box")continue;
   e.vy+=this.arena.gravity*this.gravityScale*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.vx*=Math.pow(.08,dt);
   let landed=false;
   const bottom=e.y-e.height/2;
   for(const p of this.platforms){const top=p.y+p.height;const overlap=e.x+e.width/2>p.x&&e.x-e.width/2<p.x+p.width;if(e.vy<=0&&overlap&&bottom<=top+.08&&bottom>=top-.35){e.y=top+e.height/2;e.vy=0;e.grounded=true;landed=true;break;}}
   if(!landed)e.grounded=false;
   const bounds=this.platforms.reduce((b,p)=>({min:Math.min(b.min,p.x),max:Math.max(b.max,p.x+p.width)}),{min:Infinity,max:-Infinity});
   e.x=Math.max(bounds.min+e.width/2,Math.min(bounds.max-e.width/2,e.x));
  }
 }
 private supportPlatform(f:Fighter){const bottom=f.y-HH/2;return this.platforms.find(p=>Math.abs(bottom-(p.y+p.height))<.12&&f.x+PH/2>p.x&&f.x-PH/2<p.x+p.width)||null;}
 private resolveEnvironmentLanding(f:Fighter,previousBottom:number,previousX:number){
  for(const e of this.environment){
   if(!e.active||e.kind==="barrel"||e.kind==="bounce"||e.kind==="trap")continue;
   const left=e.x-e.width/2,right=e.x+e.width/2,top=e.y+e.height/2,bottom=e.y-e.height/2;
   const overlap=f.x+PH/2>left&&f.x-PH/2<right;
   const crossed=previousBottom>=top-.08&&f.y-HH/2<=top+.08;
   if(crossed&&overlap&&f.velocityY<=0){
    f.y=top+HH/2;f.velocityY=0;f.grounded=true;f.doubleJumpAvailable=true;f.airDashAvailable=true;
    continue;
   }
   if(e.kind==="wall"&&overlap&&f.y-HH/2<top&&f.y+HH/2>bottom){
    if(previousX<=left&&f.x>left){f.x=left-PH/2;f.velocityX=Math.min(0,f.velocityX);}
    else if(previousX>=right&&f.x<right){f.x=right+PH/2;f.velocityX=Math.max(0,f.velocityX);}
    continue;
   }
   if(e.kind==="box"&&overlap&&f.y+HH/2>bottom&&f.y-HH/2<top){const push=Math.sign(f.x-e.x)||f.facing;e.vx=Math.max(-5,Math.min(5,e.vx+f.velocityX*.75));f.x+=push*.03;}
  }
 }
 private resolveEnvironmentFighter(f:Fighter){
  for(const e of this.environment){
   if(!e.active)continue;
   if(e.kind==="bounce"){
    const touching=Math.abs(f.x-e.x)<e.width/2+PH/2&&f.y-HH/2<=e.y+e.height/2+.16&&f.y-HH/2>=e.y-e.height/2-.22;
    if(touching&&e.cooldown<=0&&f.velocityY<=1){f.velocityY=14.2;f.grounded=false;f.doubleJumpAvailable=true;f.airDashAvailable=true;e.cooldown=.35;e.pulse=1;}
   }else if(e.kind==="trap"){
    const touching=Math.abs(f.x-e.x)<e.width/2+PH/2&&Math.abs((f.y-HH/2)-(e.y+e.height/2))<.28;
    if(touching&&e.cooldown<=0&&f.velocityY<=1){f.health=Math.max(0,f.health-(this.modeId==="sudden-death"?f.health:18));f.velocityY=10;e.cooldown=.55;e.pulse=1;}
   }else if(e.kind==="barrel"){
    const touching=Math.abs(f.x-e.x)<e.width/2+PH/2&&Math.abs(f.y-e.y)<HH/2+e.height/2;
    if(touching&&Math.abs(f.velocityX)>2)this.explodeBarrel(e,f.x>=e.x?1:-1);
   }
  }
 }
 private hitEnvironment(x:number,y:number,damage:number,force:number,_owner:"player"|"opponent"){
  for(const e of this.environment){
   if(!e.active||e.kind==="bounce"||e.kind==="trap")continue;
   if(Math.abs(x-e.x)<=e.width/2+.18&&Math.abs(y-e.y)<=e.height/2+.28){
    if(e.kind==="barrel")this.explodeBarrel(e,x>=e.x?1:-1);
    else{
      e.hp=Math.max(0,e.hp-damage);e.pulse=1;
      if(e.kind==="box")e.vx=Math.max(-6,Math.min(6,e.vx+force*.55));
      else e.vx=Math.max(-5,Math.min(5,e.vx+force*.15));
      if(e.hp<=0)e.active=false;
    }
    return true;
   }
  }
  return false;
 }
 private strikeEnvironment(a:Fighter,damage:number,force:number){this.hitEnvironment(a.x+a.facing*1.05,a.y+.25,damage,force,a===this.player?"player":"opponent");}
 private explodeBarrel(e:EnvironmentBody,direction:number){
  if(!e.active)return;
  e.active=false;e.pulse=1;const radius=2.15;
  for(const t of [this.player,this.opponent]){const dx=t.x-e.x,dy=t.y-e.y,d=Math.hypot(dx,dy);if(d<=radius){const f=Math.max(.2,1-d/radius);this.damage(t,24*f,direction*7*f);t.velocityY=Math.max(t.velocityY,5*f);}}
  for(const other of this.environment){
   if(other===e||!other.active)continue;
   const d=Math.hypot(other.x-e.x,other.y-e.y);if(d>radius)continue;
   if(other.kind==="barrel")this.explodeBarrel(other,Math.sign(other.x-e.x)||direction);
   else if(other.kind!=="bounce"&&other.kind!=="trap"){
    other.hp=Math.max(0,other.hp-28);other.pulse=1;
    if(other.kind==="box"){other.vx+=direction*5;other.vy=Math.max(other.vy,6);}
    if(other.hp<=0)other.active=false;
   }
  }
 }
 private blastEnvironment(x:number,y:number,radius:number,damage:number,force:number){
  for(const e of this.environment){
   if(!e.active||e.kind==="bounce"||e.kind==="trap")continue;
   const distance=Math.hypot(e.x-x,e.y-y),reach=radius+Math.hypot(e.width,e.height)*.22;
   if(distance>reach)continue;
   const falloff=Math.max(.28,1-distance/Math.max(.01,radius));
   const direction=Math.sign(e.x-x)||Math.sign(force)||1;
   if(e.kind==="barrel"){this.explodeBarrel(e,direction);continue;}
   e.hp=Math.max(0,e.hp-damage*falloff);e.pulse=1;
   if(e.kind==="box"){
    e.vx=Math.max(-7,Math.min(7,e.vx+direction*force*.55*falloff));
    e.vy=Math.max(e.vy,4.5*falloff);
   }
   if(e.hp<=0)e.active=false;
  }
 }
 private deflectProjectile(p:Projectile,f:Fighter,previousX:number,previousY:number){
  if((p.deflectCooldown??0)>0||f.attackTime<=0||(f.weapon!=='blade'&&f.weapon!=='hammer')||p.weapon==='bomb'||p.weapon==='missile')return false;
  const cx=f.x+f.facing*.8,cy=f.y+.2,dx=p.x-previousX,dy=p.y-previousY,len=dx*dx+dy*dy;
  const along=len>0?Math.max(0,Math.min(1,((cx-previousX)*dx+(cy-previousY)*dy)/len)):0;
  const distance=Math.hypot(previousX+dx*along-cx,previousY+dy*along-cy);
  if(distance>.3||p.vx*f.facing>=0)return false;
  p.vx=f.facing*Math.max(8,Math.abs(p.vx)*.8);p.vy=Math.max(1,Math.abs(p.vy)*.5);
  p.x=cx+f.facing*.35;p.y=cy;p.owner=f===this.player?'player':'opponent';p.deflectCooldown=.12;
  f.velocityX-=f.facing*.6;return true;
 }
 private updateProjectiles(dt:number){
  for(let i=this.projectiles.length-1;i>=0;i--){
    const p=this.projectiles[i];
    const target=p.owner==="player"?this.opponent:this.player;
    const owner=p.owner==="player"?this.player:this.opponent;
    const prevX=p.x,prevY=p.y;
    p.age+=dt;p.deflectCooldown=Math.max(0,(p.deflectCooldown??0)-dt);
    if(p.weapon==="bow"){p.vy+=-12.5*this.gravityScale*dt;p.spin=Math.atan2(p.vy,p.vx);}
    else if(p.weapon==="missile"){p.vy+=-7.8*this.gravityScale*dt;p.spin=Math.atan2(p.vy,p.vx);}
    else p.spin+=dt*(p.weapon==="boomerang"?12:p.weapon==="bomb"?7:0);

    if(p.weapon==="boomerang"){
      if(!p.returning){
        p.vy+=-5.2*this.gravityScale*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
        if(Math.abs(p.x-owner.x)>3.5||p.age>.95)p.returning=true;
      }else{
        const dx=owner.x-p.x,dy=(owner.y+.35)-p.y,dist=Math.max(.001,Math.hypot(dx,dy));
        p.vx=dx/dist*11;p.vy=dy/dist*11;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
        if(dist<.45){this.projectiles.splice(i,1);continue;}
      }
    }else if(p.weapon==="bomb"){
      p.life-=dt;
      if(!p.stuck){
       p.vy+=G*.42*this.gravityScale*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;
       for(const platform of this.platforms){
        const top=platform.y+platform.height;
        if(p.vy<0&&prevY>=top&&p.y<=top+.05&&p.x>platform.x-.15&&p.x<platform.x+platform.width+.15){
          p.y=top+.06;
          if(p.sticky){p.vx=0;p.vy=0;p.stuck=true;}
          else{p.vy=Math.abs(p.vy)*.56;p.vx*=.88;p.bounce++;}
          break;
        }
       }
      }
    }else{
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
      const projectileDamage=WEAPONS[p.weapon].damage*(p.damageScale??1);
      if(p.weapon==="missile"){if(this.hitEnvironment(p.x,p.y,projectileDamage,Math.sign(p.vx)*WEAPONS.missile.knockback,p.owner)){this.explodeMissile(p);this.projectiles.splice(i,1);continue;}}else if(this.hitEnvironment(p.x,p.y,projectileDamage,Math.sign(p.vx)*WEAPONS[p.weapon].knockback,p.owner)){this.projectiles.splice(i,1);continue;}
      for(const platform of this.platforms){
        const top=platform.y+platform.height;
        const crossedTop=p.vy<0&&prevY>=top&&p.y<=top&&p.x>platform.x&&p.x<platform.x+platform.width;
        const crossedSide=Math.abs(p.vx)>0&&p.y>platform.y&&p.y<top&&((prevX<platform.x&&p.x>=platform.x)||(prevX>platform.x+platform.width&&p.x<=platform.x+platform.width));
        if(crossedTop||crossedSide){
          if(p.weapon==="missile"){this.explodeMissile(p);this.projectiles.splice(i,1);break;}
          if(p.ricochets>0){
            if(crossedTop)p.vy=-p.vy*.9;
            else p.vx=-p.vx*.9;
            p.ricochets--;
            p.x=prevX;p.y=prevY;
          }else{
            this.projectiles.splice(i,1);
          }
          break;
        }
      }
      if(!this.projectiles.includes(p))continue;
    }

    if(this.deflectProjectile(p,target,prevX,prevY))continue;
    if(p.weapon==="bow"){
      const sx=p.x-prevX,sy=p.y-prevY,segLenSq=sx*sx+sy*sy,targetY=target.y+.35;
      const along=segLenSq>1e-8?Math.max(0,Math.min(1,((target.x-prevX)*sx+(targetY-prevY)*sy)/segLenSq)):0;
      const cx=prevX+sx*along,cy=prevY+sy*along;
      if(Math.hypot(target.x-cx,targetY-cy)<.38){this.damage(target,WEAPONS.bow.damage*(p.damageScale??1),Math.sign(p.vx)*WEAPONS.bow.knockback);this.projectiles.splice(i,1);continue;}
    }
    if(p.weapon==="missile"&&Math.abs(p.x-target.x)<.72&&Math.abs(p.y-(target.y+.25))<.9){this.explodeMissile(p);this.projectiles.splice(i,1);continue;}
    if(p.weapon==="bomb"&&p.life<=.55&&Math.abs(p.x-target.x)<1.05&&Math.abs(p.y-(target.y+.35))<1){this.explode(p);this.projectiles.splice(i,1);continue;}
    if(p.weapon!=="bomb"&&Math.abs(p.x-target.x)<.65&&Math.abs(p.y-(target.y+.35))<1){
      this.damage(target,WEAPONS[p.weapon].damage*(p.damageScale??1),Math.sign(p.vx)*WEAPONS[p.weapon].knockback);
      this.projectiles.splice(i,1);continue;
    }
    if(p.weapon==="bomb"&&p.life<=0){this.explode(p);this.projectiles.splice(i,1);continue;}
    if(p.life<=0||Math.abs(p.x)>16||p.y< -4||p.y>12){this.projectiles.splice(i,1);continue;}
  }
 }
 private explodeMissile(p:Projectile){
  const w=WEAPONS.missile;
  const damageScale=p.damageScale??1;
  const radius=p.clusterChild?1.05:1.9;
  this.explosions.push({x:p.x,y:p.y,age:0,life:.48,radius});
  this.blastEnvironment(p.x,p.y,radius*1.08,w.damage*.85*damageScale,w.knockback);
  const blastTargets=[this.player,this.opponent];
  for(const target of blastTargets){
    const dx=target.x-p.x,dy=(target.y+.35)-p.y,dist=Math.hypot(dx,dy);
    if(dist>radius)continue;
    const falloff=Math.max(.15,1-dist/radius);
    const dirX=Math.abs(dx)>.05?Math.sign(dx):Math.sign(p.vx)||1;
    target.health=Math.max(0,target.health-(this.modeId==="sudden-death"?target.health:w.damage*damageScale*falloff));
    target.velocityX+=dirX*(7.5+5*falloff);
    target.velocityY=Math.max(target.velocityY,6+8*falloff);
    target.grounded=false;
    target.doubleJumpAvailable=true;
    target.airDashAvailable=true;
  }
  const owner=p.owner==="player"?this.player:this.opponent;
  const ownerDistance=Math.hypot(owner.x-p.x,(owner.y+.25)-p.y);
  if(ownerDistance<=radius*.9){
    const falloff=Math.max(.2,1-ownerDistance/radius);
    owner.velocityX+=Math.sign(owner.x-p.x||p.vx||owner.facing)*6*falloff;
    owner.velocityY=Math.max(owner.velocityY,5+6*falloff);
    owner.grounded=false;
  }
  if(!p.clusterChild&&p.owner==="player"&&this.upgradedWeapons.has("missile")){
    const direction=Math.sign(p.vx)||this.player.facing||1,speed=7.5;
    for(const degrees of [35,70,110,145]){
      const angle=degrees*Math.PI/180;
      this.projectiles.push({x:p.x,y:p.y+.12,vx:direction*Math.cos(angle)*speed,vy:Math.sin(angle)*speed,life:.85,weapon:"missile",owner:p.owner,originX:p.x,returning:false,spin:angle,age:0,bounce:0,ricochets:0,damageScale:.42,clusterChild:true});
    }
  }
 }
 private explode(p:Projectile){
  const w=WEAPONS.bomb,damage=w.damage*(p.damageScale??1);
  this.explosions.push({x:p.x,y:p.y,age:0,life:.75,radius:w.radius!});
  this.blastEnvironment(p.x,p.y,w.radius!*1.2,damage*.95,w.knockback);
  const target=p.owner==="player"?this.opponent:this.player;
  const owner=p.owner==="player"?this.player:this.opponent;
  const targetDistance=Math.hypot(target.x-p.x,target.y-p.y);
  if(targetDistance<=w.radius!){
    const force=Math.max(.35,1-targetDistance/w.radius!);
    this.damage(target,damage*force,Math.sign(target.x-p.x)*w.knockback*force);
    target.velocityY=Math.max(target.velocityY,5.5*force);
  }
  const ownerDistance=Math.hypot(owner.x-p.x,owner.y-p.y);
  if(ownerDistance<=w.radius!){
    const force=Math.max(.2,1-ownerDistance/w.radius!);
    owner.velocityX+=Math.sign(owner.x-p.x||owner.facing)*w.knockback*.8*force;
    owner.velocityY=Math.max(owner.velocityY,6.5*force);
  }
 }
 getRenderState():GameRenderState{return{player:{...this.player,missileAngle:this.missileAngle,missilePower:this.missilePower,animationTime:this.elapsed},opponent:{...this.opponent,missileAngle:this.missileAngle,missilePower:this.missilePower,animationTime:this.elapsed},projectiles:this.projectiles.map(p=>({...p,rotation:p.spin})),explosions:this.explosions.map(e=>({...e})),platforms:this.platforms,environment:this.environment.map(e=>({...e})),winner:this.winner,arena:this.arenaId,mode:this.modeId,hill:{player:this.hillPlayer,opponent:this.hillOpponent,target:HILL_TARGET,halfWidth:HILL_HALF_WIDTH},upgradePoints:this.upgradePoints,upgradedWeapons:[...this.upgradedWeapons]};}
 dispose(){}
}
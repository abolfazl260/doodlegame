import type {InputSource,InputState,WeaponId} from "../input/Input";
export type PlatformSurface="normal"|"ice"|"slippery"|"oneWay";
export interface Platform{readonly x:number;readonly y:number;readonly width:number;readonly height:number;readonly surface?:PlatformSurface;}
export type EnemyType="runner"|"tank"|"shooter"|"jumper"|"bomber"|"ninja"|"boss";
export type EnvironmentKind="barrel"|"box"|"wall"|"bounce"|"trap"|"rock";
export interface EnvironmentRenderState{readonly kind:EnvironmentKind;readonly x:number;readonly y:number;readonly width:number;readonly height:number;readonly hp:number;readonly maxHp:number;readonly active:boolean;readonly rotation:number;readonly pulse:number;}
export interface DuelistRenderState{readonly x:number;readonly enemyType:EnemyType|null;readonly bowCharge:number;readonly missileAngle:number;readonly missilePower:number;readonly y:number;readonly velocityX:number;readonly velocityY:number;readonly grounded:boolean;readonly facing:number;readonly health:number;readonly weapon:WeaponId;readonly attackTime:number;readonly attackVariant:number;readonly animationTime:number;}
export interface ProjectileRenderState{readonly x:number;readonly y:number;readonly vx:number;readonly vy:number;readonly life:number;readonly weapon:WeaponId;readonly rotation:number;readonly age:number;}
export interface ExplosionRenderState{readonly x:number;readonly y:number;readonly age:number;readonly life:number;readonly radius:number;}
export type ArenaId="classic"|"towers"|"pit"|"steps"|"zigzag"|"sky"|"moving"|"fortress";
export interface ArenaDefinition{readonly id:ArenaId;readonly name:string;readonly platforms:readonly Platform[];readonly spawnX:[number,number];readonly speedMultiplier:number;readonly jumpMultiplier:number;readonly gravity:number;readonly fallLimit:number|null;readonly movingPlatforms:boolean;}
export interface GameRenderState{readonly player:DuelistRenderState;readonly opponent:DuelistRenderState;readonly projectiles:readonly ProjectileRenderState[];readonly explosions:readonly ExplosionRenderState[];readonly platforms:readonly Platform[];readonly environment:readonly EnvironmentRenderState[];readonly winner:"player"|"opponent"|null;readonly arena:ArenaId;}
interface Fighter{x:number;y:number;velocityX:number;velocityY:number;grounded:boolean;facing:number;health:number;maxHealth:number;enemyType:EnemyType|null;weapon:WeaponId;attackTime:number;cooldown:number;bowCharge:number;bowCharging:boolean;attackVariant:number;doubleJumpAvailable:boolean;airDashAvailable:boolean;dashCooldown:number;wallJumpCooldown:number;}
interface Projectile{x:number;y:number;vx:number;vy:number;life:number;weapon:WeaponId;owner:"player"|"opponent";originX:number;returning:boolean;spin:number;age:number;bounce:number;ricochets:number;}
interface EnvironmentBody{kind:EnvironmentKind;x:number;y:number;width:number;height:number;hp:number;maxHp:number;active:boolean;rotation:number;pulse:number;vx:number;vy:number;grounded:boolean;cooldown:number;}
const PH=.8,HH=1.8,G=-22,ACC=32,MAX=8,FRIC=26,AIR=5,JUMP=9.2,DASH_SPEED=14,DASH_TIME=.12,DASH_COOLDOWN=.65,WALL_JUMP_SPEED=9.6,BOUNCE_MIN_SPEED=9.5,MIN_MISSILE_ANGLE=12,MAX_MISSILE_ANGLE=78,MIN_MISSILE_POWER=8,MAX_MISSILE_POWER=18;
const ARENAS:Readonly<Record<ArenaId,ArenaDefinition>>={
 classic:{id:"classic",name:"CLASSIC",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-5,5],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-4,y:2,width:3.5,height:.35,surface:"ice"},{x:.5,y:3.7,width:3.5,height:.35,surface:"slippery"}]},
 towers:{id:"towers",name:"TOWERS",speedMultiplier:1,jumpMultiplier:1.15,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-7,7],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.6,width:4.5,height:.35,surface:"oneWay"},{x:4.5,y:1.6,width:4.5,height:.35},{x:-3,y:3.5,width:6,height:.35,surface:"ice"},{x:-10,y:5.2,width:3.5,height:.35},{x:6.5,y:5.2,width:3.5,height:.35}]},
 pit:{id:"pit",name:"PIT",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:-3.5,movingPlatforms:false,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:7.5,height:.5},{x:4.5,y:-.25,width:7.5,height:.5},{x:-7.5,y:2.1,width:4,height:.35,surface:"slippery"},{x:3.5,y:2.1,width:4,height:.35},{x:-1.75,y:4,width:3.5,height:.35}]},
 steps:{id:"steps",name:"STEPS",speedMultiplier:1.2,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-10,y:1.1,width:3.5,height:.35,surface:"ice"},{x:-6,y:2.0,width:3.5,height:.35,surface:"slippery"},{x:-2,y:2.9,width:3.5,height:.35},{x:2,y:2.0,width:3.5,height:.35},{x:6,y:1.1,width:3.5,height:.35}]},
 zigzag:{id:"zigzag",name:"ZIGZAG",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:true,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-10,y:1.3,width:4.5,height:.35},{x:-3.5,y:2.8,width:4,height:.35,surface:"oneWay"},{x:2.5,y:1.3,width:4.5,height:.35},{x:7,y:3.6,width:3,height:.35}]},
 sky:{id:"sky",name:"SKY",speedMultiplier:1,jumpMultiplier:1.25,gravity:-18,fallLimit:null,movingPlatforms:false,spawnX:[-6,6],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.7,width:3.5,height:.35},{x:-3,y:3.1,width:3.5,height:.35,surface:"ice"},{x:3,y:1.7,width:3.5,height:.35},{x:-1.75,y:4.7,width:3.5,height:.35}]}, moving:{id:"moving",name:"MOVING",speedMultiplier:1,jumpMultiplier:1.05,gravity:G,fallLimit:null,movingPlatforms:true,spawnX:[-7,7],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.5,width:3.5,height:.35,surface:"slippery"},{x:-3.5,y:2.8,width:3.5,height:.35},{x:2,y:1.6,width:3.5,height:.35},{x:6,y:3.3,width:3.5,height:.35}]},
 fortress:{id:"fortress",name:"FORTRESS",speedMultiplier:.9,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-9,9],platforms:[{x:-12,y:-.25,width:24,height:.5}]}
};
interface EnvironmentTemplate{readonly kind:EnvironmentKind;readonly x:number;readonly y:number;readonly width:number;readonly height:number;readonly hp:number;}
const ENVIRONMENT_TEMPLATES:Readonly<Record<ArenaId,readonly EnvironmentTemplate[]>>={classic:[],towers:[],pit:[],steps:[],zigzag:[],sky:[],moving:[],fortress:[]};
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
 private arenaId:ArenaId="classic";
 private missileAngle=45;private missilePower=13;
 private elapsed=0;private enemyRound=0;private player:Fighter=this.create(-5,1,null);private opponent:Fighter=this.create(5,-1,"runner");private projectiles:Projectile[]=[];private explosions:ExplosionRenderState[]=[];private environment:EnvironmentBody[]=[];private winner:"player"|"opponent"|null=null;
 constructor(private readonly input:InputSource){}
 private get arena(){return ARENAS[this.arenaId];}
 private get platforms(){return this.arena.movingPlatforms?this.arena.platforms.map((p,i)=>i===0?p:{...p,x:p.x+Math.sin(this.elapsed*1.15+i*1.4)*1.1,y:p.y+Math.sin(this.elapsed*.8+i*1.9)*.22}):this.arena.platforms;}
 private platformAtSpawn(x:number){return this.platforms.reduce((best,p)=>Math.abs((p.x+p.width/2)-x)<Math.abs((best.x+best.width/2)-x)?p:best,this.platforms[0]);}
 private create(x:number,facing:number,enemyType:EnemyType|null):Fighter{
  const p=this.platformAtSpawn(x);
  const stats=enemyType===null?{health:100,weapon:"blade" as WeaponId,speed:1,jump:1}:{health:{runner:85,tank:170,shooter:90,jumper:95,bomber:105,ninja:100,boss:220}[enemyType],weapon:{runner:"blade",tank:"hammer",shooter:"blaster",jumper:"boomerang",bomber:"bomb",ninja:"uzi",boss:"hammer"}[enemyType] as WeaponId,speed:{runner:1.35,tank:.68,shooter:.82,jumper:1.05,bomber:.9,ninja:1.2,boss:.92}[enemyType],jump:{runner:1.1,tank:.8,shooter:.9,jumper:1.35,bomber:1,ninja:1.15,boss:1.1}[enemyType]};
  return{x,y:p.y+p.height+HH/2,velocityX:0,velocityY:0,grounded:true,facing,health:stats.health,maxHealth:stats.health,enemyType,weapon:this.arenaId==="fortress"?"missile":stats.weapon,attackTime:0,cooldown:0,bowCharge:0,bowCharging:false,attackVariant:0,doubleJumpAvailable:true,airDashAvailable:true,dashCooldown:0,wallJumpCooldown:0};
}
 setArena(id:ArenaId){this.arenaId=id;this.reset();}
 getArena(){return this.arena;}
 setMissileAngle(angle:number){this.missileAngle=Math.max(MIN_MISSILE_ANGLE,Math.min(MAX_MISSILE_ANGLE,angle));}
 setMissilePower(power:number){this.missilePower=Math.max(MIN_MISSILE_POWER,Math.min(MAX_MISSILE_POWER,power));}
 fireWeapon(){if(this.winner)return;const w=WEAPONS[this.player.weapon];this.attack(this.player,this.opponent,Boolean(w));}
 getMissileAim(){return{angle:this.missileAngle,power:this.missilePower};}
 reset(){this.elapsed=0;this.missileAngle=45;this.missilePower=13;this.explosions=[];this.enemyRound++;const types:EnemyType[]=["runner","tank","shooter","jumper","bomber","ninja","boss"];this.player=this.create(this.arena.spawnX[0],1,null);this.opponent=this.create(this.arena.spawnX[1],-1,types[(this.enemyRound-1)%types.length]);this.projectiles=[];this.resetEnvironment();this.winner=null;}
 selectWeapon(direction:1|-1){const available:WeaponId[]=this.arenaId==="fortress"?["missile"]:ORDER.filter(id=>id!=="missile");const i=Math.max(0,available.indexOf(this.player.weapon));this.player.weapon=available[(i+direction+available.length)%available.length];this.player.bowCharging=false;this.player.bowCharge=0;}
 selectWeaponById(id:WeaponId){if(id==="missile"&&this.arenaId!=="fortress")return;if(id!=="missile"&&this.arenaId==="fortress")return;this.player.weapon=id;this.player.bowCharging=false;this.player.bowCharge=0;}
 update(dt:number){if(this.winner){this.explosions=this.explosions.filter(e=>(e.age+=dt)<e.life);this.input.endFrame();return;}this.elapsed+=dt;this.explosions=this.explosions.filter(e=>(e.age+=dt)<e.life);const input=this.input.getState();this.updateEnvironment(dt);this.updatePlayer(input,dt);this.updateOpponent(dt);this.resolveEnvironmentFighter(this.player);this.resolveEnvironmentFighter(this.opponent);const playerWeapon=WEAPONS[this.player.weapon];if(this.player.weapon==="bow")this.updateBow(input,dt);else this.attack(this.player,this.opponent,input.attackPressed||(Boolean(playerWeapon.automatic)&&input.attackHeld));this.updateProjectiles(dt);this.player.attackTime=Math.max(0,this.player.attackTime-dt);this.opponent.attackTime=Math.max(0,this.opponent.attackTime-dt);this.player.cooldown=Math.max(0,this.player.cooldown-dt);this.opponent.cooldown=Math.max(0,this.opponent.cooldown-dt);if(this.player.health<=0)this.winner="opponent";else if(this.opponent.health<=0)this.winner="player";if(this.arenaId!=="fortress"){if(input.weaponNextPressed)this.selectWeapon(1);if(input.weaponPreviousPressed)this.selectWeapon(-1);}this.input.endFrame();}
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
  const d=distance>.9?Math.sign(dx):0;
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
  const attackRange=this.arenaId==="fortress"?Infinity:type==="shooter"?7:type==="bomber"?6:type==="jumper"?4.5:type==="boss"?2.4:2;
  if(this.arenaId==="fortress"){if(this.opponent.cooldown<=0&&distance>4.5)this.attack(this.opponent,this.player,true);}else if(distance<attackRange&&this.opponent.cooldown<=0){this.attack(this.opponent,this.player,true);}
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
    if(Math.abs((f.x+PH/2)-p.x)<edgeTolerance)return -1;
    if(Math.abs((f.x-PH/2)-(p.x+p.width))<edgeTolerance)return 1;
  }
  return 0;
 }
 private move(f:Fighter,d:number,dt:number){d*=this.arena.speedMultiplier;if(d){f.velocityX+=d*ACC*dt;f.facing=Math.sign(d);}else{const support=this.supportPlatform(f);const surface=support?.surface??"normal";const factor=surface==="ice"?.18:surface==="slippery"?.05:1;const amount=(f.grounded?FRIC*factor:AIR)*dt;f.velocityX=Math.abs(f.velocityX)<=amount?0:f.velocityX-Math.sign(f.velocityX)*amount;}f.velocityX=Math.max(-MAX,Math.min(MAX,f.velocityX));}
 private integrate(f:Fighter,dt:number){
  const previousX=f.x;
  const previousBottom=f.y-HH/2;
  f.velocityY+=this.arena.gravity*dt;
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
    if(incoming>=BOUNCE_MIN_SPEED){
      f.velocityY=Math.min(12,incoming*.62+3.5);
      f.grounded=false;
    }else{
      f.velocityY=0;
      f.grounded=true;
      f.doubleJumpAvailable=true;
      f.airDashAvailable=true;
    }
  }
  const bounds=this.platforms.reduce((b,p)=>({min:Math.min(b.min,p.x),max:Math.max(b.max,p.x+p.width)}),{min:Infinity,max:-Infinity});
  f.x=Math.max(bounds.min+PH/2,Math.min(bounds.max-PH/2,f.x));
  // Keep fighters inside the visible combat area rather than allowing them to run to off-screen platform edges.
  const screenMin=-6,screenMax=6;
  f.x=Math.max(screenMin+PH/2,Math.min(screenMax-PH/2,f.x));
  if(this.arenaId==="fortress"){if(f===this.player)f.x=Math.max(screenMin+PH/2,Math.min(-2.6,f.x));else f.x=Math.max(2.6,Math.min(screenMax-PH/2,f.x));}
  if(this.arena.fallLimit!==null&&f.y-HH/2<this.arena.fallLimit){f.health=0;return;}
  if(this.arena.id!=="pit"){
    for(const p of this.platforms){
      const top=p.y+p.height;
      if(p.surface!=="oneWay"&&f.y-HH/2<top&&f.x+PH/2>p.x&&f.x-PH/2<p.x+p.width){
        f.y=top+HH/2;f.velocityY=0;f.grounded=true;f.doubleJumpAvailable=true;f.airDashAvailable=true;break;
      }
    }
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
  this.projectiles.push({x:originX,y:originY,vx:direction*Math.cos(angle)*speed+a.velocityX*.2,vy:Math.sin(angle)*speed+Math.max(0,a.velocityY*.12),life:2.8,weapon:"bow",owner:a===this.player?"player":"opponent",originX:a.x,returning:false,spin:angle,age:0,bounce:0,ricochets:0});
  a.cooldown=w.cooldown;a.attackTime=.22;a.bowCharge=0;a.bowCharging=false;
 }
 private attack(a:Fighter,t:Fighter,pressed:boolean){
  const w=WEAPONS[a.weapon];
  if(!pressed||a.cooldown>0)return;
  const wall=this.wallDirection(a);
  const melee=a.weapon==="blade"||a.weapon==="hammer";
  if(melee&&!a.grounded&&wall!==0){
    a.velocityX=-wall*WALL_JUMP_SPEED;
    a.velocityY=Math.max(a.velocityY,JUMP*this.arena.jumpMultiplier*.78);
    a.facing=-wall;
  }else if(melee){
    a.velocityX=Math.max(-DASH_SPEED,Math.min(DASH_SPEED,a.velocityX+a.facing*(a.weapon==="hammer"?5.2:3.8)));
  }
  if(this.arenaId==="fortress"&&a.weapon!=="missile")a.weapon="missile";
  a.cooldown=w.cooldown;
  if(this.arenaId==="fortress"&&a===this.player){
    const radians=this.missileAngle*Math.PI/180;
    const direction=a.facing;
    this.projectiles.push({x:a.x+direction*.75,y:a.y+1.05,vx:Math.cos(radians)*this.missilePower*direction,vy:Math.sin(radians)*this.missilePower,life:4,weapon:"missile",owner:"player",originX:a.x,returning:false,spin:radians,age:0,bounce:0,ricochets:0});
    a.attackTime=.22;
    return;
  }
  a.attackTime=a.weapon==="blade"?.22:a.weapon==="hammer"?.24:.14;
  if(a.weapon==="blade")a.attackVariant=(a.attackVariant+1)%4;
  if(this.arenaId==="fortress"&&a===this.opponent){
    const dx=this.player.x-a.x,dy=(this.player.y+.2)-a.y;const dist=Math.max(1,Math.abs(dx));const angle=Math.max(20,Math.min(65,Math.atan2(Math.max(.5,dy),dist)*180/Math.PI+12));const power=Math.max(8,Math.min(18,dist/(Math.cos(angle*Math.PI/180)*.72)));const radians=angle*Math.PI/180;const direction=Math.sign(dx)||a.facing;this.projectiles.push({x:a.x+direction*.75,y:a.y+1.05,vx:Math.cos(radians)*power*direction,vy:Math.sin(radians)*power,life:4,weapon:"missile",owner:"opponent",originX:a.x,returning:false,spin:radians,age:0,bounce:0,ricochets:0});a.attackTime=.22;return;
  }
  if(a.weapon==="bow")a.attackVariant=(a.attackVariant+1)%2;
  if(a.weapon==="hammer"){
    a.attackVariant=(a.attackVariant+1)%3;
    const distance=t.x-a.x;
    if(Math.sign(distance)===a.facing&&Math.abs(distance)<=w.range*1.08&&Math.abs(t.y-a.y)<1.2){
      this.damage(t,w.damage,a.facing*w.knockback*1.15);
      t.velocityY=Math.max(t.velocityY,a.grounded?5.2:3.6);
      this.strikeEnvironment(a,w.damage*1.35,a.facing*w.knockback*1.35);
      if(a.grounded)a.velocityX*=.55;
    }
    return;
  }
  if(a.weapon==="blade"){
    const distance=t.x-a.x;
    if(Math.sign(distance)===a.facing&&Math.abs(distance)<=w.range){this.damage(t,w.damage,a.facing*w.knockback);this.strikeEnvironment(a,w.damage*.9,a.facing*w.knockback);}
    return;
  }
  this.projectiles.push({
    x:a.x+a.facing*.65,
    y:a.y+.35,
    vx:a.facing*(w.projectileSpeed??8),
    vy:a.weapon==="boomerang"?2.8:a.weapon==="bomb"?2.4:a.weapon==="bow"?1.8:0,
    life:a.weapon==="bomb"?1.5:a.weapon==="boomerang"?2.4:2,
    weapon:a.weapon,
    owner:a===this.player?"player":"opponent",
    originX:a.x,
    returning:false,
    spin:a.weapon==="boomerang"?a.facing:0,
    age:0,
    bounce:0,ricochets:a.weapon==="blaster"?1:a.weapon==="bow"?1:0
  });
}
 private damage(t:Fighter,damage:number,knockback:number){t.health=Math.max(0,t.health-damage);t.velocityX+=knockback;t.velocityY=Math.max(t.velocityY,2);}
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
   e.vy+=this.arena.gravity*dt;e.x+=e.vx*dt;e.y+=e.vy*dt;e.vx*=Math.pow(.08,dt);
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
   if(e.kind==="wall"&&overlap&&f.y-HH/2<top&&f.y+HH/2>bottom){
    if(previousX<=left&&f.x>left){f.x=left-PH/2;f.velocityX=Math.min(0,f.velocityX);}
    else if(previousX>=right&&f.x<right){f.x=right+PH/2;f.velocityX=Math.max(0,f.velocityX);}
    continue;
   }
   const crossed=previousBottom>=top-.08&&f.y-HH/2<=top+.08;
   if(crossed&&overlap&&f.velocityY<=0){f.y=top+HH/2;f.velocityY=0;f.grounded=true;f.doubleJumpAvailable=true;f.airDashAvailable=true;}
   else if(e.kind==="box"&&overlap&&f.y+HH/2>bottom&&f.y-HH/2<top){const push=Math.sign(f.x-e.x)||f.facing;e.vx=Math.max(-5,Math.min(5,e.vx+f.velocityX*.75));f.x+=push*.03;}
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
    if(touching&&e.cooldown<=0&&f.velocityY<=1){f.health=Math.max(0,f.health-18);f.velocityY=10;e.cooldown=.55;e.pulse=1;}
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
    if(e.kind==="box"){e.vx=Math.max(-6,Math.min(6,e.vx+force*.55));e.pulse=1;}
    else if(e.kind==="barrel"){this.explodeBarrel(e,x>=e.x?1:-1);}
    else{e.hp=Math.max(0,e.hp-damage);e.pulse=1;e.vx=Math.max(-5,Math.min(5,e.vx+force*.15));if(e.hp<=0)e.active=false;}
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
  for(const other of this.environment){if(other===e||!other.active)continue;const d=Math.hypot(other.x-e.x,other.y-e.y);if(d>radius)continue;if(other.kind==="barrel")this.explodeBarrel(other,Math.sign(other.x-e.x)||direction);else if(other.kind==="box"){other.vx+=direction*5;other.vy=Math.max(other.vy,6);other.pulse=1;}else if(other.kind==="wall"||other.kind==="rock"){other.hp=Math.max(0,other.hp-28);other.pulse=1;if(other.hp<=0)other.active=false;}}
 }
 private heldWeaponHit(f:Fighter,px:number,py:number,prevX:number,prevY:number){
  const reach=f.weapon==="hammer"?1.05:f.weapon==="blade"?1.1:(f.weapon==="bow"||f.weapon==="blaster"||f.weapon==="uzi"||f.weapon==="missile")?1.0:.82;
  const width=f.weapon==="hammer"?.28:f.weapon==="blade"?.18:(f.weapon==="bow"||f.weapon==="blaster"||f.weapon==="uzi"||f.weapon==="missile")?.22:.3;
  const cx=f.x+f.facing*(.45+reach*.42);
  const cy=f.y+.08+(f.weapon==="missile"?.16:0);
  const dx=px-prevX,dy=py-prevY,lenSq=dx*dx+dy*dy;
  const t=lenSq>1e-8?Math.max(0,Math.min(1,((cx-prevX)*dx+(cy-prevY)*dy)/lenSq)):0;
  const closestX=prevX+dx*t,closestY=prevY+dy*t;
  const radius=Math.hypot(reach*.5,width*.85);
  const hitDistance=Math.hypot(closestX-cx,closestY-cy);
  if(hitDistance>radius)return null;
  const nx=(closestX-cx)/Math.max(.001,hitDistance),ny=(closestY-cy)/Math.max(.001,hitDistance);
  return{nx,ny,bounce:.78+(f.weapon==="hammer"?.12:0)};
 }
 private updateProjectiles(dt:number){
  for(let i=this.projectiles.length-1;i>=0;i--){
    const p=this.projectiles[i];
    const target=p.owner==="player"?this.opponent:this.player;
    const owner=p.owner==="player"?this.player:this.opponent;
    const prevX=p.x,prevY=p.y;
    const opposingWeapon=p.owner==="player"?this.opponent:this.player;
    if(p.weapon!=="bomb"){
      const weaponHit=this.heldWeaponHit(opposingWeapon,p.x,p.y,prevX,prevY);
      if(weaponHit){
        const velocityNormal=p.vx*weaponHit.nx+p.vy*weaponHit.ny;
        p.vx=(p.vx-2*velocityNormal*weaponHit.nx)*weaponHit.bounce;
        p.vy=(p.vy-2*velocityNormal*weaponHit.ny)*weaponHit.bounce;
        p.x=opposingWeapon.x+weaponHit.nx*.24;
        p.y=opposingWeapon.y+weaponHit.ny*.24;
        p.ricochets=Math.min(3,p.ricochets+1);
        p.life-=.06;
        opposingWeapon.velocityX-=weaponHit.nx*.7;
        opposingWeapon.velocityY+=Math.max(0,weaponHit.ny)*.45;
        opposingWeapon.attackTime=Math.max(opposingWeapon.attackTime,.08);
        continue;
      }
    }
    p.age+=dt;
    if(p.weapon==="bow"){p.vy+=-12.5*dt;p.spin=Math.atan2(p.vy,p.vx);}
    else if(p.weapon==="missile"){p.vy+=-7.8*dt;p.spin=Math.atan2(p.vy,p.vx);}
    else p.spin+=dt*(p.weapon==="boomerang"?12:p.weapon==="bomb"?7:0);

    if(p.weapon==="boomerang"){
      if(!p.returning){
        p.vy+=-5.2*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
        if(Math.abs(p.x-owner.x)>3.5||p.age>.95)p.returning=true;
      }else{
        const dx=owner.x-p.x,dy=(owner.y+.35)-p.y,dist=Math.max(.001,Math.hypot(dx,dy));
        p.vx=dx/dist*11;p.vy=dy/dist*11;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
        if(dist<.45){this.projectiles.splice(i,1);continue;}
      }
    }else if(p.weapon==="bomb"){
      p.vy+=G*.42*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
      for(const platform of this.platforms){
        const top=platform.y+platform.height;
        if(p.vy<0&&prevY>=top&&p.y<=top+.05&&p.x>platform.x-.15&&p.x<platform.x+platform.width+.15){
          p.y=top+.06;p.vy=Math.abs(p.vy)*.56;p.vx*=.88;p.bounce++;break;
        }
      }
    }else{
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
      if(p.weapon==="missile"){if(this.hitEnvironment(p.x,p.y,WEAPONS.missile.damage,Math.sign(p.vx)*WEAPONS.missile.knockback,p.owner)){this.explodeMissile(p);this.projectiles.splice(i,1);continue;}}else if(this.hitEnvironment(p.x,p.y,WEAPONS[p.weapon].damage,Math.sign(p.vx)*WEAPONS[p.weapon].knockback,p.owner)){this.projectiles.splice(i,1);continue;}
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
      if(!this.projectiles[i])continue;
    }

    if(p.weapon==="bow"){
      const sx=p.x-prevX,sy=p.y-prevY,segLenSq=sx*sx+sy*sy,targetY=target.y+.35;
      const along=segLenSq>1e-8?Math.max(0,Math.min(1,((target.x-prevX)*sx+(targetY-prevY)*sy)/segLenSq)):0;
      const cx=prevX+sx*along,cy=prevY+sy*along;
      if(Math.hypot(target.x-cx,targetY-cy)<.38){this.damage(target,WEAPONS.bow.damage,Math.sign(p.vx)*WEAPONS.bow.knockback);this.projectiles.splice(i,1);continue;}
    }
    if(p.weapon==="missile"&&Math.abs(p.x-target.x)<.72&&Math.abs(p.y-(target.y+.25))<.9){this.explodeMissile(p);this.projectiles.splice(i,1);continue;}
    if(p.weapon==="bomb"&&p.life<=.55&&Math.abs(p.x-target.x)<1.05&&Math.abs(p.y-(target.y+.35))<1){this.explode(p);this.projectiles.splice(i,1);continue;}
    if(p.weapon!=="bomb"&&Math.abs(p.x-target.x)<.65&&Math.abs(p.y-(target.y+.35))<1){
      this.damage(target,WEAPONS[p.weapon].damage,Math.sign(p.vx)*WEAPONS[p.weapon].knockback);
      this.projectiles.splice(i,1);continue;
    }
    if(p.weapon==="bomb"&&p.life<=0){this.explode(p);this.projectiles.splice(i,1);continue;}
    if(p.life<=0||Math.abs(p.x)>16||p.y< -4||p.y>12){this.projectiles.splice(i,1);continue;}
  }
 }
 private explodeMissile(p:Projectile){
  const w=WEAPONS.missile;
  const radius=1.9;
  this.explosions.push({x:p.x,y:p.y,age:0,life:.48,radius});
  const blastTargets=[this.player,this.opponent];
  for(const target of blastTargets){
    const dx=target.x-p.x,dy=(target.y+.35)-p.y,dist=Math.hypot(dx,dy);
    if(dist>radius)continue;
    const falloff=Math.max(.15,1-dist/radius);
    const dirX=Math.abs(dx)>.05?Math.sign(dx):Math.sign(p.vx)||1;
    target.health=Math.max(0,target.health-w.damage*falloff);
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
 }
 private explode(p:Projectile){
  const w=WEAPONS.bomb;
  for(const e of this.environment){if(e.active&&Math.hypot(e.x-p.x,e.y-p.y)<=w.radius!*1.2){if(e.kind==="barrel")this.explodeBarrel(e,Math.sign(e.x-p.x)||1);else if(e.kind==="wall"||e.kind==="rock"){e.hp=Math.max(0,e.hp-w.damage*.8);e.pulse=1;if(e.hp<=0)e.active=false;}else if(e.kind==="box"){e.vx+=Math.sign(e.x-p.x||1)*5;e.vy=Math.max(e.vy,5);e.pulse=1;}}}
  const target=p.owner==="player"?this.opponent:this.player;
  const owner=p.owner==="player"?this.player:this.opponent;
  const targetDistance=Math.hypot(target.x-p.x,target.y-p.y);
  if(targetDistance<=w.radius!){
    const force=Math.max(.35,1-targetDistance/w.radius!);
    this.damage(target,w.damage*force,Math.sign(target.x-p.x)*w.knockback*force);
    target.velocityY=Math.max(target.velocityY,5.5*force);
  }
  const ownerDistance=Math.hypot(owner.x-p.x,owner.y-p.y);
  if(ownerDistance<=w.radius!){
    const force=Math.max(.2,1-ownerDistance/w.radius!);
    owner.velocityX+=Math.sign(owner.x-p.x||owner.facing)*w.knockback*.8*force;
    owner.velocityY=Math.max(owner.velocityY,6.5*force);
  }
 }
 getRenderState():GameRenderState{return{player:{...this.player,missileAngle:this.missileAngle,missilePower:this.missilePower,animationTime:this.elapsed},opponent:{...this.opponent,missileAngle:this.missileAngle,missilePower:this.missilePower,animationTime:this.elapsed},projectiles:this.projectiles.map(p=>({...p,rotation:p.spin})),explosions:this.explosions.map(e=>({...e})),platforms:this.platforms,environment:this.environment.map(e=>({...e})),winner:this.winner,arena:this.arenaId};}
 dispose(){}
}
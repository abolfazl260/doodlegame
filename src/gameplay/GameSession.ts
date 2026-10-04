import type {InputSource,InputState,WeaponId} from "../input/Input";
export interface Platform{readonly x:number;readonly y:number;readonly width:number;readonly height:number;}
export type EnemyType="runner"|"tank"|"shooter"|"jumper"|"bomber"|"ninja"|"boss";
export interface DuelistRenderState{readonly x:number;readonly enemyType:EnemyType|null;readonly missileAngle:number;readonly missilePower:number;readonly y:number;readonly velocityX:number;readonly velocityY:number;readonly grounded:boolean;readonly facing:number;readonly health:number;readonly weapon:WeaponId;readonly attackTime:number;readonly attackVariant:number;readonly animationTime:number;}
export interface ProjectileRenderState{readonly x:number;readonly y:number;readonly vx:number;readonly vy:number;readonly life:number;readonly weapon:WeaponId;readonly rotation:number;readonly age:number;}
export type ArenaId="classic"|"towers"|"pit"|"steps"|"zigzag"|"sky"|"moving"|"fortress";
export interface ArenaDefinition{readonly id:ArenaId;readonly name:string;readonly platforms:readonly Platform[];readonly spawnX:[number,number];readonly speedMultiplier:number;readonly jumpMultiplier:number;readonly gravity:number;readonly fallLimit:number|null;readonly movingPlatforms:boolean;}
export interface GameRenderState{readonly player:DuelistRenderState;readonly opponent:DuelistRenderState;readonly projectiles:readonly ProjectileRenderState[];readonly platforms:readonly Platform[];readonly winner:"player"|"opponent"|null;readonly arena:ArenaId;}
interface Fighter{x:number;y:number;velocityX:number;velocityY:number;grounded:boolean;facing:number;health:number;maxHealth:number;enemyType:EnemyType|null;weapon:WeaponId;attackTime:number;cooldown:number;attackVariant:number;doubleJumpAvailable:boolean;airDashAvailable:boolean;dashCooldown:number;wallJumpCooldown:number;}
interface Projectile{x:number;y:number;vx:number;vy:number;life:number;weapon:WeaponId;owner:"player"|"opponent";originX:number;returning:boolean;spin:number;age:number;bounce:number;ricochets:number;}
const PH=.8,HH=1.8,G=-22,ACC=32,MAX=8,FRIC=26,AIR=5,JUMP=9.2,DASH_SPEED=14,DASH_TIME=.12,DASH_COOLDOWN=.65,WALL_JUMP_SPEED=9.6,BOUNCE_MIN_SPEED=9.5,MIN_MISSILE_ANGLE=12,MAX_MISSILE_ANGLE=78,MIN_MISSILE_POWER=8,MAX_MISSILE_POWER=18;
const ARENAS:Readonly<Record<ArenaId,ArenaDefinition>>={
 classic:{id:"classic",name:"CLASSIC",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-5,5],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-4,y:2,width:3.5,height:.35},{x:.5,y:3.7,width:3.5,height:.35}]},
 towers:{id:"towers",name:"TOWERS",speedMultiplier:1,jumpMultiplier:1.15,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-7,7],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.6,width:4.5,height:.35},{x:4.5,y:1.6,width:4.5,height:.35},{x:-3,y:3.5,width:6,height:.35},{x:-10,y:5.2,width:3.5,height:.35},{x:6.5,y:5.2,width:3.5,height:.35}]},
 pit:{id:"pit",name:"PIT",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:-3.5,movingPlatforms:false,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:7.5,height:.5},{x:4.5,y:-.25,width:7.5,height:.5},{x:-7.5,y:2.1,width:4,height:.35},{x:3.5,y:2.1,width:4,height:.35},{x:-1.75,y:4,width:3.5,height:.35}]},
 steps:{id:"steps",name:"STEPS",speedMultiplier:1.2,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-10,y:1.1,width:3.5,height:.35},{x:-6,y:2.0,width:3.5,height:.35},{x:-2,y:2.9,width:3.5,height:.35},{x:2,y:2.0,width:3.5,height:.35},{x:6,y:1.1,width:3.5,height:.35}]},
 zigzag:{id:"zigzag",name:"ZIGZAG",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:true,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-10,y:1.3,width:4.5,height:.35},{x:-3.5,y:2.8,width:4,height:.35},{x:2.5,y:1.3,width:4.5,height:.35},{x:7,y:3.6,width:3,height:.35}]},
 sky:{id:"sky",name:"SKY",speedMultiplier:1,jumpMultiplier:1.25,gravity:-18,fallLimit:null,movingPlatforms:false,spawnX:[-6,6],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.7,width:3.5,height:.35},{x:-3,y:3.1,width:3.5,height:.35},{x:3,y:1.7,width:3.5,height:.35},{x:-1.75,y:4.7,width:3.5,height:.35}]}, moving:{id:"moving",name:"MOVING",speedMultiplier:1,jumpMultiplier:1.05,gravity:G,fallLimit:null,movingPlatforms:true,spawnX:[-7,7],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.5,width:3.5,height:.35},{x:-3.5,y:2.8,width:3.5,height:.35},{x:2,y:1.6,width:3.5,height:.35},{x:6,y:3.3,width:3.5,height:.35}]},
 fortress:{id:"fortress",name:"FORTRESS",speedMultiplier:.9,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-9,9],platforms:[{x:-12,y:-.25,width:24,height:.5}]}
};
const WEAPONS:Readonly<Record<WeaponId,{damage:number;range:number;cooldown:number;knockback:number;projectileSpeed?:number;radius?:number}>>={
 blade:{damage:8,range:1.35,cooldown:.32,knockback:4},
 hammer:{damage:14,range:1.45,cooldown:.75,knockback:8},
 blaster:{damage:7,range:0,cooldown:.5,knockback:5,projectileSpeed:14},
 uzi:{damage:4,range:0,cooldown:.12,knockback:2.5,projectileSpeed:16},
 boomerang:{damage:9,range:0,cooldown:.7,knockback:4,projectileSpeed:10},
 bow:{damage:12,range:0,cooldown:.9,knockback:3,projectileSpeed:18},
 bomb:{damage:18,range:0,cooldown:1.15,knockback:9,projectileSpeed:8,radius:1.8},
 missile:{damage:22,range:0,cooldown:1.05,knockback:10,projectileSpeed:1,radius:1.15}
};
const ORDER:readonly WeaponId[]=["blade","hammer","blaster","uzi","boomerang","bow","bomb"];
export class GameSession{
 private arenaId:ArenaId="classic";
 private missileAngle=45;private missilePower=13;
 private elapsed=0;private enemyRound=0;private player:Fighter=this.create(-5,1,null);private opponent:Fighter=this.create(5,-1,"runner");private projectiles:Projectile[]=[];private winner:"player"|"opponent"|null=null;
 constructor(private readonly input:InputSource){}
 private get arena(){return ARENAS[this.arenaId];}
 private get platforms(){return this.arena.movingPlatforms?this.arena.platforms.map((p,i)=>i===0?p:{...p,x:p.x+Math.sin(this.elapsed*1.15+i*1.4)*1.1,y:p.y+Math.sin(this.elapsed*.8+i*1.9)*.22}):this.arena.platforms;}
 private platformAtSpawn(x:number){return this.platforms.reduce((best,p)=>Math.abs((p.x+p.width/2)-x)<Math.abs((best.x+best.width/2)-x)?p:best,this.platforms[0]);}
 private create(x:number,facing:number,enemyType:EnemyType|null):Fighter{
  const p=this.platformAtSpawn(x);
  const stats=enemyType===null?{health:100,weapon:"blade" as WeaponId,speed:1,jump:1}:{health:{runner:85,tank:170,shooter:90,jumper:95,bomber:105,ninja:100,boss:220}[enemyType],weapon:{runner:"blade",tank:"hammer",shooter:"blaster",jumper:"boomerang",bomber:"bomb",ninja:"uzi",boss:"hammer"}[enemyType] as WeaponId,speed:{runner:1.35,tank:.68,shooter:.82,jumper:1.05,bomber:.9,ninja:1.2,boss:.92}[enemyType],jump:{runner:1.1,tank:.8,shooter:.9,jumper:1.35,bomber:1,ninja:1.15,boss:1.1}[enemyType]};
  return{x,y:p.y+p.height+HH/2,velocityX:0,velocityY:0,grounded:true,facing,health:stats.health,maxHealth:stats.health,enemyType,weapon:this.arenaId==="fortress"?"missile":stats.weapon,attackTime:0,cooldown:0,attackVariant:0,doubleJumpAvailable:true,airDashAvailable:true,dashCooldown:0,wallJumpCooldown:0};
}
 setArena(id:ArenaId){this.arenaId=id;this.reset();}
 getArena(){return this.arena;}
 setMissileAngle(angle:number){this.missileAngle=Math.max(MIN_MISSILE_ANGLE,Math.min(MAX_MISSILE_ANGLE,angle));}
 setMissilePower(power:number){this.missilePower=Math.max(MIN_MISSILE_POWER,Math.min(MAX_MISSILE_POWER,power));}
 fireMissile(){if(this.winner||this.arenaId!=="fortress")return;this.attack(this.player,this.opponent,true);}
 getMissileAim(){return{angle:this.missileAngle,power:this.missilePower};}
 reset(){this.elapsed=0;this.missileAngle=45;this.missilePower=13;this.enemyRound++;const types:EnemyType[]=["runner","tank","shooter","jumper","bomber","ninja","boss"];this.player=this.create(this.arena.spawnX[0],1,null);this.opponent=this.create(this.arena.spawnX[1],-1,types[(this.enemyRound-1)%types.length]);this.projectiles=[];this.winner=null;}
 selectWeapon(direction:1|-1){const i=ORDER.indexOf(this.player.weapon);this.player.weapon=ORDER[(i+direction+ORDER.length)%ORDER.length];}
 selectWeaponById(id:WeaponId){if(id==="missile"&&this.arenaId!=="fortress")return;this.player.weapon=id;}
 update(dt:number){if(this.winner){this.input.endFrame();return;}this.elapsed+=dt;const input=this.input.getState();this.updatePlayer(input,dt);this.updateOpponent(dt);if(this.arenaId==="fortress"){if(input.attackPressed)this.fireMissile();}else{this.attack(this.player,this.opponent,input.attackPressed||input.attackHeld);}this.updateProjectiles(dt);this.player.attackTime=Math.max(0,this.player.attackTime-dt);this.opponent.attackTime=Math.max(0,this.opponent.attackTime-dt);this.player.cooldown=Math.max(0,this.player.cooldown-dt);this.opponent.cooldown=Math.max(0,this.opponent.cooldown-dt);if(this.player.health<=0)this.winner="opponent";else if(this.opponent.health<=0)this.winner="player";if(this.arenaId!=="fortress"){if(input.weaponNextPressed)this.selectWeapon(1);if(input.weaponPreviousPressed)this.selectWeapon(-1);}this.input.endFrame();}
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
  const attackRange=type==="shooter"?7:type==="bomber"?6:type==="jumper"?4.5:type==="boss"?2.4:2;
  if(this.arenaId!=="fortress"&&distance<attackRange&&this.opponent.cooldown<=0)this.attack(this.opponent,this.player,true);
  if(this.arenaId==="fortress"&&this.opponent.cooldown<=0&&distance>4.5)this.attack(this.opponent,this.player,true);
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
 private move(f:Fighter,d:number,dt:number){d*=this.arena.speedMultiplier;if(d){f.velocityX+=d*ACC*dt;f.facing=Math.sign(d);}else{const amount=(f.grounded?FRIC:AIR)*dt;f.velocityX=Math.abs(f.velocityX)<=amount?0:f.velocityX-Math.sign(f.velocityX)*amount;}f.velocityX=Math.max(-MAX,Math.min(MAX,f.velocityX));}
 private integrate(f:Fighter,dt:number){
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
  if(this.arenaId==="fortress"){if(f===this.player)f.x=Math.max(-10.8,Math.min(-2.6,f.x));else f.x=Math.max(2.6,Math.min(10.8,f.x));}
  if(this.arena.fallLimit!==null&&f.y-HH/2<this.arena.fallLimit){f.health=0;return;}
  if(this.arena.id!=="pit"){
    for(const p of this.platforms){
      const top=p.y+p.height;
      if(f.y-HH/2<top&&f.x+PH/2>p.x&&f.x-PH/2<p.x+p.width){
        f.y=top+HH/2;f.velocityY=0;f.grounded=true;f.doubleJumpAvailable=true;f.airDashAvailable=true;break;
      }
    }
  }
 }
 private attack(a:Fighter,t:Fighter,pressed:boolean){
  const w=WEAPONS[a.weapon];
  if(!pressed||a.cooldown>0)return;
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
      if(a.grounded)a.velocityX*=.55;
    }
    return;
  }
  if(a.weapon==="blade"){
    const distance=t.x-a.x;
    if(Math.sign(distance)===a.facing&&Math.abs(distance)<=w.range)this.damage(t,w.damage,a.facing*w.knockback);
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
 private updateProjectiles(dt:number){
  for(let i=this.projectiles.length-1;i>=0;i--){
    const p=this.projectiles[i];
    const target=p.owner==="player"?this.opponent:this.player;
    const owner=p.owner==="player"?this.player:this.opponent;
    const prevX=p.x,prevY=p.y;
    p.age+=dt;
    if(p.weapon==="bow"){p.vy+=-7.5*dt;p.spin=Math.atan2(p.vy,p.vx);}
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
      for(const platform of this.platforms){
        const top=platform.y+platform.height;
        const crossedTop=p.vy<0&&prevY>=top&&p.y<=top&&p.x>platform.x&&p.x<platform.x+platform.width;
        const crossedSide=Math.abs(p.vx)>0&&p.y>platform.y&&p.y<top&&((prevX<platform.x&&p.x>=platform.x)||(prevX>platform.x+platform.width&&p.x<=platform.x+platform.width));
        if(crossedTop||crossedSide){
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

    if(p.weapon==="missile"&&Math.abs(p.x-target.x)<.72&&Math.abs(p.y-(target.y+.25))<.9){this.damage(target,WEAPONS.missile.damage,Math.sign(p.vx)*WEAPONS.missile.knockback);this.projectiles.splice(i,1);continue;}
    if(p.weapon==="bomb"&&p.life<=.55&&Math.abs(p.x-target.x)<1.05&&Math.abs(p.y-(target.y+.35))<1){this.explode(p);this.projectiles.splice(i,1);continue;}
    if(p.weapon!=="bomb"&&Math.abs(p.x-target.x)<.65&&Math.abs(p.y-(target.y+.35))<1){
      this.damage(target,WEAPONS[p.weapon].damage,Math.sign(p.vx)*WEAPONS[p.weapon].knockback);
      this.projectiles.splice(i,1);continue;
    }
    if(p.weapon==="bomb"&&p.life<=0){this.explode(p);this.projectiles.splice(i,1);continue;}
    if(p.life<=0||Math.abs(p.x)>16||p.y< -4||p.y>12){this.projectiles.splice(i,1);continue;}
  }
 }
 private explode(p:Projectile){
  const w=WEAPONS.bomb;
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
 getRenderState():GameRenderState{return{player:{...this.player,animationTime:this.elapsed},opponent:{...this.opponent,animationTime:this.elapsed},projectiles:this.projectiles.map(p=>({...p,rotation:p.spin})),platforms:this.platforms,winner:this.winner,arena:this.arenaId};}
 dispose(){}
}
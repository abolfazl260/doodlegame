import type {InputSource,InputState,WeaponId} from "../input/Input";
export interface Platform{readonly x:number;readonly y:number;readonly width:number;readonly height:number;}
export interface DuelistRenderState{readonly x:number;readonly y:number;readonly velocityX:number;readonly velocityY:number;readonly grounded:boolean;readonly facing:number;readonly health:number;readonly weapon:WeaponId;readonly attackTime:number;readonly attackVariant:number;readonly animationTime:number;}
export interface ProjectileRenderState{readonly x:number;readonly y:number;readonly vx:number;readonly vy:number;readonly life:number;readonly weapon:WeaponId;readonly rotation:number;readonly age:number;}
export type ArenaId="classic"|"towers"|"pit"|"steps"|"zigzag"|"sky"|"moving";
export interface ArenaDefinition{readonly id:ArenaId;readonly name:string;readonly platforms:readonly Platform[];readonly spawnX:[number,number];readonly speedMultiplier:number;readonly jumpMultiplier:number;readonly gravity:number;readonly fallLimit:number|null;readonly movingPlatforms:boolean;}
export interface GameRenderState{readonly player:DuelistRenderState;readonly opponent:DuelistRenderState;readonly projectiles:readonly ProjectileRenderState[];readonly platforms:readonly Platform[];readonly winner:"player"|"opponent"|null;readonly arena:ArenaId;}
interface Fighter{x:number;y:number;velocityX:number;velocityY:number;grounded:boolean;facing:number;health:number;weapon:WeaponId;attackTime:number;cooldown:number;attackVariant:number;}
interface Projectile{x:number;y:number;vx:number;vy:number;life:number;weapon:WeaponId;owner:"player"|"opponent";originX:number;returning:boolean;spin:number;age:number;bounce:number;}
const PH=.8,HH=1.8,G=-22,ACC=32,MAX=8,FRIC=26,AIR=5,JUMP=9.2;
const ARENAS:Readonly<Record<ArenaId,ArenaDefinition>>={
 classic:{id:"classic",name:"CLASSIC",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-5,5],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-4,y:2,width:3.5,height:.35},{x:.5,y:3.7,width:3.5,height:.35}]},
 towers:{id:"towers",name:"TOWERS",speedMultiplier:1,jumpMultiplier:1.15,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-7,7],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.6,width:4.5,height:.35},{x:4.5,y:1.6,width:4.5,height:.35},{x:-3,y:3.5,width:6,height:.35},{x:-10,y:5.2,width:3.5,height:.35},{x:6.5,y:5.2,width:3.5,height:.35}]},
 pit:{id:"pit",name:"PIT",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:-3.5,movingPlatforms:false,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:7.5,height:.5},{x:4.5,y:-.25,width:7.5,height:.5},{x:-7.5,y:2.1,width:4,height:.35},{x:3.5,y:2.1,width:4,height:.35},{x:-1.75,y:4,width:3.5,height:.35}]},
 steps:{id:"steps",name:"STEPS",speedMultiplier:1.2,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:false,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-10,y:1.1,width:3.5,height:.35},{x:-6,y:2.0,width:3.5,height:.35},{x:-2,y:2.9,width:3.5,height:.35},{x:2,y:2.0,width:3.5,height:.35},{x:6,y:1.1,width:3.5,height:.35}]},
 zigzag:{id:"zigzag",name:"ZIGZAG",speedMultiplier:1,jumpMultiplier:1,gravity:G,fallLimit:null,movingPlatforms:true,spawnX:[-8,8],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-10,y:1.3,width:4.5,height:.35},{x:-3.5,y:2.8,width:4,height:.35},{x:2.5,y:1.3,width:4.5,height:.35},{x:7,y:3.6,width:3,height:.35}]},
 sky:{id:"sky",name:"SKY",speedMultiplier:1,jumpMultiplier:1.25,gravity:-18,fallLimit:null,movingPlatforms:false,spawnX:[-6,6],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.7,width:3.5,height:.35},{x:-3,y:3.1,width:3.5,height:.35},{x:3,y:1.7,width:3.5,height:.35},{x:-1.75,y:4.7,width:3.5,height:.35}]}, moving:{id:"moving",name:"MOVING",speedMultiplier:1,jumpMultiplier:1.05,gravity:G,fallLimit:null,movingPlatforms:true,spawnX:[-7,7],platforms:[{x:-12,y:-.25,width:24,height:.5},{x:-9,y:1.5,width:3.5,height:.35},{x:-3.5,y:2.8,width:3.5,height:.35},{x:2,y:1.6,width:3.5,height:.35},{x:6,y:3.3,width:3.5,height:.35}]}
};
const WEAPONS:Readonly<Record<WeaponId,{damage:number;range:number;cooldown:number;knockback:number;projectileSpeed?:number;radius?:number}>>={
 blade:{damage:8,range:1.35,cooldown:.32,knockback:4},
 hammer:{damage:14,range:1.45,cooldown:.75,knockback:8},
 blaster:{damage:7,range:0,cooldown:.5,knockback:5,projectileSpeed:14},
 uzi:{damage:4,range:0,cooldown:.12,knockback:2.5,projectileSpeed:16},
 boomerang:{damage:9,range:0,cooldown:.7,knockback:4,projectileSpeed:10},
 bow:{damage:12,range:0,cooldown:.9,knockback:3,projectileSpeed:18},
 bomb:{damage:18,range:0,cooldown:1.15,knockback:9,projectileSpeed:8,radius:1.8}
};
const ORDER:readonly WeaponId[]=["blade","hammer","blaster","uzi","boomerang","bow","bomb"];
export class GameSession{
 private arenaId:ArenaId="classic";
 private elapsed=0;private player:Fighter=this.create(-5,1);private opponent:Fighter=this.create(5,-1);private projectiles:Projectile[]=[];private winner:"player"|"opponent"|null=null;
 constructor(private readonly input:InputSource){}
 private get arena(){return ARENAS[this.arenaId];}
 private get platforms(){return this.arena.movingPlatforms?this.arena.platforms.map((p,i)=>i===0?p:{...p,x:p.x+Math.sin(this.elapsed*1.15+i*1.4)*1.1,y:p.y+Math.sin(this.elapsed*.8+i*1.9)*.22}):this.arena.platforms;}
 private platformAtSpawn(x:number){return this.platforms.reduce((best,p)=>Math.abs((p.x+p.width/2)-x)<Math.abs((best.x+best.width/2)-x)?p:best,this.platforms[0]);}
 private create(x:number,facing:number):Fighter{const p=this.platformAtSpawn(x);return{x,y:p.y+p.height+HH/2,velocityX:0,velocityY:0,grounded:true,facing,health:100,weapon:"blade",attackTime:0,cooldown:0,attackVariant:0};}
 setArena(id:ArenaId){this.arenaId=id;this.reset();}
 getArena(){return this.arena;}
 reset(){this.elapsed=0;this.player=this.create(this.arena.spawnX[0],1);this.opponent=this.create(this.arena.spawnX[1],-1);this.projectiles=[];this.winner=null;}
 selectWeapon(direction:1|-1){const i=ORDER.indexOf(this.player.weapon);this.player.weapon=ORDER[(i+direction+ORDER.length)%ORDER.length];}
 selectWeaponById(id:WeaponId){this.player.weapon=id;}
 update(dt:number){if(this.winner){this.input.endFrame();return;}this.elapsed+=dt;const input=this.input.getState();this.updatePlayer(input,dt);this.updateOpponent(dt);this.attack(this.player,this.opponent,input.attackPressed||input.attackHeld);this.updateProjectiles(dt);this.player.attackTime=Math.max(0,this.player.attackTime-dt);this.opponent.attackTime=Math.max(0,this.opponent.attackTime-dt);this.player.cooldown=Math.max(0,this.player.cooldown-dt);this.opponent.cooldown=Math.max(0,this.opponent.cooldown-dt);if(this.player.health<=0)this.winner="opponent";else if(this.opponent.health<=0)this.winner="player";if(input.weaponNextPressed)this.selectWeapon(1);if(input.weaponPreviousPressed)this.selectWeapon(-1);this.input.endFrame();}
 private updatePlayer(input:InputState,dt:number){const d=Math.abs(input.moveX)>.01?Math.sign(input.moveX):0;this.move(this.player,d,dt);if(input.jumpPressed&&this.player.grounded){this.player.velocityY=JUMP*this.arena.jumpMultiplier;this.player.grounded=false;}this.integrate(this.player,dt);}
 private updateOpponent(dt:number){const dx=this.player.x-this.opponent.x;const d=Math.abs(dx)>.9?Math.sign(dx):0;this.move(this.opponent,d*.55,dt);if(this.opponent.grounded&&this.player.y-this.opponent.y>1.5)this.opponent.velocityY=JUMP*this.arena.jumpMultiplier*.9;this.integrate(this.opponent,dt);if(Math.abs(dx)<2&&this.opponent.cooldown<=0)this.attack(this.opponent,this.player,true);}
 private move(f:Fighter,d:number,dt:number){d*=this.arena.speedMultiplier;if(d){f.velocityX+=d*ACC*dt;f.facing=Math.sign(d);}else{const amount=(f.grounded?FRIC:AIR)*dt;f.velocityX=Math.abs(f.velocityX)<=amount?0:f.velocityX-Math.sign(f.velocityX)*amount;}f.velocityX=Math.max(-MAX,Math.min(MAX,f.velocityX));}
 private integrate(f:Fighter,dt:number){const previousBottom=f.y-HH/2;f.velocityY+=this.arena.gravity*dt;f.x+=f.velocityX*dt;f.y+=f.velocityY*dt;f.grounded=false;const currentBottom=f.y-HH/2;let landingTop:number|null=null;for(const p of this.platforms){const top=p.y+p.height;const overlap=f.x+PH/2>p.x&&f.x-PH/2<p.x+p.width;const crossed=previousBottom>=top-.08&&currentBottom<=top+.08;if(f.velocityY<=0&&overlap&&crossed&&(landingTop===null||top>landingTop))landingTop=top;}if(landingTop!==null){f.y=landingTop+HH/2;f.velocityY=0;f.grounded=true;}const bounds=this.platforms.reduce((b,p)=>({min:Math.min(b.min,p.x),max:Math.max(b.max,p.x+p.width)}),{min:Infinity,max:-Infinity});f.x=Math.max(bounds.min+PH/2,Math.min(bounds.max-PH/2,f.x));if(this.arena.fallLimit!==null&&f.y-HH/2<this.arena.fallLimit){f.health=0;return;}if(this.arena.id!=="pit"){for(const p of this.platforms){const top=p.y+p.height;if(f.y-HH/2<top&&f.x+PH/2>p.x&&f.x-PH/2<p.x+p.width){f.y=top+HH/2;f.velocityY=0;f.grounded=true;break;}}}}
 private attack(a:Fighter,t:Fighter,pressed:boolean){
  const w=WEAPONS[a.weapon];
  if(!pressed||a.cooldown>0)return;
  a.cooldown=w.cooldown;
  a.attackTime=a.weapon==="blade"?.22:a.weapon==="hammer"?.24:.14;
  if(a.weapon==="blade")a.attackVariant=(a.attackVariant+1)%4;
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
    vy:a.weapon==="boomerang"?2.8:a.weapon==="bomb"?2.4:0,
    life:a.weapon==="bomb"?1.5:a.weapon==="boomerang"?2.4:2,
    weapon:a.weapon,
    owner:a===this.player?"player":"opponent",
    originX:a.x,
    returning:false,
    spin:a.weapon==="boomerang"?a.facing:0,
    age:0,
    bounce:0
  });
}
 private damage(t:Fighter,damage:number,knockback:number){t.health=Math.max(0,t.health-damage);t.velocityX+=knockback;t.velocityY=Math.max(t.velocityY,2);}
 private updateProjectiles(dt:number){
  for(let i=this.projectiles.length-1;i>=0;i--){
    const p=this.projectiles[i];
    const target=p.owner==="player"?this.opponent:this.player;
    const owner=p.owner==="player"?this.player:this.opponent;
    p.age+=dt;
    p.spin+=dt*(p.weapon==="boomerang"?12:p.weapon==="bomb"?7:0);
    if(p.weapon==="boomerang"){
      if(!p.returning){
        p.vy+=-5.2*dt;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
        if(Math.abs(p.x-owner.x)>3.5||p.age>.95)p.returning=true;
      }else{
        const dx=owner.x-p.x,dy=(owner.y+.35)-p.y;
        const dist=Math.max(.001,Math.hypot(dx,dy));
        p.vx=dx/dist*11;p.vy=dy/dist*11;
        p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
        if(dist<.45){this.projectiles.splice(i,1);continue;}
      }
    }else if(p.weapon==="bomb"){
      p.vy+=G*.42*dt;
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
      for(const platform of this.platforms){
        const top=platform.y+platform.height;
        if(p.vy<0&&p.y<=top+.05&&p.y>=top-.35&&p.x>platform.x-.15&&p.x<platform.x+platform.width+.15){
          p.y=top+.06;p.vy=Math.abs(p.vy)*.56;p.vx*=.88;p.bounce++;
          break;
        }
      }
    }else{
      p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;
    }
    if(p.weapon==="bomb"&&p.life<=.55&&Math.abs(p.x-target.x)<1.05&&Math.abs(p.y-(target.y+.35))<1){this.explode(p);this.projectiles.splice(i,1);continue;}
    if(p.weapon!=="bomb"&&Math.abs(p.x-target.x)<.65&&Math.abs(p.y-(target.y+.35))<1){
      this.damage(target,WEAPONS[p.weapon].damage,Math.sign(p.vx)*WEAPONS[p.weapon].knockback);
      this.projectiles.splice(i,1);continue;
    }
    if(p.weapon==="bomb"&&p.life<=0){this.explode(p);this.projectiles.splice(i,1);continue;}
    if(p.life<=0||Math.abs(p.x)>16||p.y< -4||p.y>12){this.projectiles.splice(i,1);continue;}
  }
}
 private explode(p:Projectile){const w=WEAPONS.bomb;const target=p.owner==="player"?this.opponent:this.player;const distance=Math.hypot(target.x-p.x,target.y-(p.y));if(distance<=w.radius!){const force=Math.max(.35,1-distance/w.radius!);this.damage(target,w.damage*force,Math.sign(target.x-p.x)*w.knockback*force);}}
 getRenderState():GameRenderState{return{player:{...this.player,animationTime:this.elapsed},opponent:{...this.opponent,animationTime:this.elapsed},projectiles:this.projectiles.map(p=>({...p,rotation:p.spin})),platforms:this.platforms,winner:this.winner,arena:this.arenaId};}
 dispose(){}
}
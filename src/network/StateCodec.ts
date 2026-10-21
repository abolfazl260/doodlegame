import type {GameRenderState,DuelistRenderState,GrappleRenderState} from '../gameplay/GameSession';
import {object,num,integer,bool,choice,list} from './Validation.js';
import {ARENAS,WEAPONS,CHARACTERS} from './Protocol.js';
export type MatchFrame={tick:number;epoch:number;match:number;ack:number;state:GameRenderState};
const nullableNum=(v:unknown)=>v==null?null:num(v);
function grapple(value:unknown):GrappleRenderState|null{
 if(value==null)return null;const p=object(value);
 return{phase:choice(p.phase,['flying','latched']),x:num(p.x),y:num(p.y),vx:num(p.vx),vy:num(p.vy),angle:num(p.angle),ropeLength:num(p.ropeLength),travel:num(p.travel),target:choice(p.target,['arena','enemy']),platformIndex:integer(p.platformIndex,-1,64),offsetX:num(p.offsetX),offsetY:num(p.offsetY)};
}
/** Explicit render-only projection. Simulation internals and unknown fields never cross the bridge. */
function fighter(value:unknown):DuelistRenderState{
 const p=object(value);
 return{
  characterId:choice(p.characterId,CHARACTERS),weapon:choice(p.weapon,WEAPONS),weaponHolsterFrom:choice(p.weaponHolsterFrom,[null,...WEAPONS]),
  enemyType:choice(p.enemyType,[null]),grapple:grapple(p.grapple),slamPhase:choice(p.slamPhase,[null,'startup','descent','impact','recovery']),
  kickKind:choice(p.kickKind,[null,'straight','spin']),grabPhase:choice(p.grabPhase,[null,'attempt','hold','windup','recovery','held']),
  jumpStage:choice(p.jumpStage,[0,1,2]),grounded:bool(p.grounded),health:num(p.health,0,10000),maxHealth:num(p.maxHealth,1,10000),
  aimAngle:nullableNum(p.aimAngle),x:num(p.x),y:num(p.y),velocityX:num(p.velocityX),velocityY:num(p.velocityY),
  facing:num(p.facing,-1,1),visualFacing:num(p.visualFacing,-1,1),slamElapsed:num(p.slamElapsed),turnPoseTime:num(p.turnPoseTime),doubleJumpPoseTime:num(p.doubleJumpPoseTime),wallJumpPoseTime:num(p.wallJumpPoseTime),weaponDrawTime:num(p.weaponDrawTime),bowCharge:num(p.bowCharge),missileAngle:num(p.missileAngle),missilePower:num(p.missilePower),attackTime:num(p.attackTime),attackVariant:num(p.attackVariant),animationTime:num(p.animationTime),gaitPhase:num(p.gaitPhase),landingTime:num(p.landingTime),hitTime:num(p.hitTime),bossPhase:num(p.bossPhase),attackTelegraph:num(p.attackTelegraph),kickElapsed:num(p.kickElapsed),grabElapsed:num(p.grabElapsed)
 };
}
export function decodeState(value:unknown):GameRenderState{
 const p=object(value),hill=object(p.hill),shake=object(p.cameraShake);
 return{
  player:fighter(p.player),opponent:fighter(p.opponent),arena:choice(p.arena,ARENAS),mode:choice(p.mode,['duel']),winner:choice(p.winner,[null,'player','opponent','draw']),
  hill:{player:num(hill.player),opponent:num(hill.opponent),target:num(hill.target),halfWidth:num(hill.halfWidth)},upgradePoints:0,upgradedWeapons:[],
  cameraShake:{x:num(shake.x,-.2,.2),y:num(shake.y,-.2,.2)},
  platforms:list(p.platforms,64,v=>{const a=object(v);return{x:num(a.x),y:num(a.y),width:num(a.width,0),height:num(a.height,0),surface:a.surface===undefined?undefined:choice(a.surface,['normal','ice','slippery','oneWay','conveyorLeft','conveyorRight'])};}),
  projectiles:list(p.projectiles,128,v=>{const a=object(v);return{x:num(a.x),y:num(a.y),vx:num(a.vx),vy:num(a.vy),life:num(a.life),weapon:choice(a.weapon,WEAPONS),rotation:num(a.rotation),age:num(a.age)};}),
  explosions:list(p.explosions,64,v=>{const a=object(v);return{x:num(a.x),y:num(a.y),life:num(a.life),age:num(a.age),radius:num(a.radius,0,100)};}),
  environment:list(p.environment,128,v=>{const a=object(v);return{kind:choice(a.kind,['barrel','box','wall','bounce','trap','rock','crumble','fan','gravity','vent','fallingRock']),x:num(a.x),y:num(a.y),width:num(a.width,0),height:num(a.height,0),hp:num(a.hp),maxHp:num(a.maxHp),active:bool(a.active),rotation:num(a.rotation),pulse:num(a.pulse),warning:num(a.warning)};}),
  debris:list(p.debris,128,v=>{const a=object(v);return{x:num(a.x),y:num(a.y),rotation:num(a.rotation),size:num(a.size),age:num(a.age),life:num(a.life)};}),
  combatCues:list(p.combatCues,128,v=>{const a=object(v);return{id:integer(a.id,1),kind:choice(a.kind,['attack','hit','block','deflect','explosion','slam','defeat','throw']),weapon:choice(a.weapon,WEAPONS),x:num(a.x),y:num(a.y),direction:num(a.direction),intensity:num(a.intensity,0,10),age:num(a.age,0,60),life:num(a.life,0,5)};})
 };
}
export function decodeFrame(value:unknown):MatchFrame{
 const p=object(value);return{tick:integer(p.tick),epoch:integer(p.epoch),match:integer(p.match),ack:integer(p.ack),state:decodeState(p.state)};
}
export const encodeFrame=(tick:number,epoch:number,match:number,ack:number,state:GameRenderState):MatchFrame=>({tick,epoch,match,ack,state:decodeState(state)});
/** One snapshot of interpolation delay; never predict hits/health/winner on the guest. */
export class SnapshotBuffer {
 private previous:MatchFrame|null=null;
 private latest:MatchFrame|null=null;
 private receivedAt=0;
 push(frame:MatchFrame,now:number){
  if(this.latest&&(frame.epoch<this.latest.epoch||frame.epoch===this.latest.epoch&&frame.tick<=this.latest.tick))return false;
  this.previous=this.latest?.epoch===frame.epoch?this.latest:null;this.latest=frame;this.receivedAt=now;return true;
 }
 render(now:number):GameRenderState|null{
  if(!this.latest)return null;
  const current=this.latest.state,previous=this.previous?.state;
  if(!previous||current.winner)return current;
  const alpha=Math.max(0,Math.min(1,(now-this.receivedAt)/50));
  const blend=(a:number,b:number)=>a+(b-a)*alpha;
  const pose=(a:DuelistRenderState,b:DuelistRenderState):DuelistRenderState=>({...b,x:blend(a.x,b.x),y:blend(a.y,b.y),visualFacing:blend(a.visualFacing,b.visualFacing),animationTime:blend(a.animationTime,b.animationTime),gaitPhase:blend(a.gaitPhase,b.gaitPhase)});
  return{...current,player:pose(previous.player,current.player),opponent:pose(previous.opponent,current.opponent),platforms:current.platforms.map((p,i)=>previous.platforms[i]?{...p,x:blend(previous.platforms[i].x,p.x),y:blend(previous.platforms[i].y,p.y)}:p)};
 }
 clear(){this.previous=this.latest=null;}
}

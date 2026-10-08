import type {EnemyType,EnvironmentRenderState,Platform} from "./GameSession";

export type EnemyIntent="approach"|"evade"|"reposition"|"attack"|"recover";
export interface EnemyProfile{
 readonly reaction:number;
 readonly idealMin:number;
 readonly idealMax:number;
 readonly attackRange:number;
 readonly windup:number;
 readonly recovery:number;
}
export const ENEMY_PROFILES:Readonly<Record<EnemyType,EnemyProfile>>={
 runner:{reaction:.17,idealMin:.65,idealMax:1.65,attackRange:1.8,windup:.11,recovery:.19},
 tank:{reaction:.34,idealMin:.7,idealMax:1.55,attackRange:2.0,windup:.30,recovery:.44},
 shooter:{reaction:.29,idealMin:3.6,idealMax:5.5,attackRange:7.0,windup:.20,recovery:.24},
 jumper:{reaction:.19,idealMin:1.55,idealMax:3.5,attackRange:4.5,windup:.14,recovery:.20},
 bomber:{reaction:.36,idealMin:3.35,idealMax:5.7,attackRange:6.0,windup:.35,recovery:.40},
 ninja:{reaction:.24,idealMin:1.6,idealMax:3.2,attackRange:5.0,windup:.13,recovery:.24},
 boss:{reaction:.25,idealMin:.9,idealMax:2.5,attackRange:2.5,windup:.48,recovery:.42}
};
export interface EnemySituation {
 readonly type:EnemyType;
 readonly dx:number;
 readonly dy:number;
 readonly distance:number;
 readonly clearShot:boolean;
 readonly threat:boolean;
 readonly hillDx:number|null;
 readonly bossPhase:number;
 readonly weaponIsRanged:boolean;
 readonly recovering:boolean;
}
export interface EnemyPlan{
 readonly intent:EnemyIntent;
 readonly move:-1|0|1;
 readonly attack:boolean;
 readonly dodge:boolean;
 readonly leap:boolean;
}
const sign=(value:number): -1|0|1=>value>.01?1:value<-.01?-1:0;
/** Pure state selection: changes only on a reaction beat, never on each physics substep. */
export function chooseEnemyPlan(s:EnemySituation):EnemyPlan{
 const profile=ENEMY_PROFILES[s.type],toward=sign(s.hillDx??s.dx);
 if(s.recovering)return{intent:"recover",move:0,attack:false,dodge:false,leap:false};
 if(s.threat&&(s.type==="ninja"||s.type==="jumper"||s.type==="shooter")){
  return{intent:"evade",move:sign(-s.dx)||1,attack:false,dodge:true,leap:s.type==="jumper"};
 }
 if(s.hillDx!==null)return{intent:"approach",move:toward,attack:false,dodge:false,leap:s.type==="jumper"};
 const desiredMin=s.type==="boss"&&s.bossPhase>0&&s.weaponIsRanged?2.9:profile.idealMin;
 const desiredMax=s.type==="boss"&&s.bossPhase>0&&s.weaponIsRanged?5.2:profile.idealMax;
 const attackReach=s.type==="boss"&&s.weaponIsRanged?6.4:profile.attackRange;
 const canAttack=s.distance<=attackReach&&Math.abs(s.dy)<(s.weaponIsRanged?2.3:1.25)&&(!s.weaponIsRanged||s.clearShot);
 if(s.weaponIsRanged&&!s.clearShot&&s.distance<profile.attackRange){
  return{intent:"reposition",move:toward,attack:false,dodge:false,leap:true};
 }
 if(s.distance<desiredMin&&(s.type==="shooter"||s.type==="bomber"||(s.type==="boss"&&s.weaponIsRanged))){
  return{intent:"evade",move:sign(-s.dx),attack:canAttack,dodge:false,leap:false};
 }
 if(s.distance>desiredMax)return{intent:"approach",move:toward,attack:canAttack&&s.weaponIsRanged,dodge:false,leap:s.type==="jumper"};
 return{intent:canAttack?"attack":"reposition",move:canAttack?0:toward,attack:canAttack,dodge:false,leap:s.type==="jumper"&&s.dy>.5};
}
/** Slab ray test avoids tunnelling through narrow walls and boxes. */
export function intersectsSolid(x0:number,y0:number,x1:number,y1:number,l:number,b:number,r:number,t:number){
 let lo=0,hi=1;
 for(const [origin,d,min,max] of [[x0,x1-x0,l,r],[y0,y1-y0,b,t]]){
  if(Math.abs(d)<1e-8){if(origin<min||origin>max)return false;continue;}
  let a=(min-origin)/d,c=(max-origin)/d;
  if(a>c)[a,c]=[c,a];
  lo=Math.max(lo,a);hi=Math.min(hi,c);
  if(lo>hi)return false;
 }
 return hi>.025&&lo<.975;
}
export function hasClearShot(x0:number,y0:number,x1:number,y1:number,platforms:readonly Platform[],environment:readonly EnvironmentRenderState[]){
 for(const p of platforms){
  if(p.surface==="oneWay")continue;
  if(intersectsSolid(x0,y0,x1,y1,p.x,p.y,p.x+p.width,p.y+p.height))return false;
 }
 for(const e of environment){
  if(!e.active||!["wall","box","rock","barrel"].includes(e.kind))continue;
  if(intersectsSolid(x0,y0,x1,y1,e.x-e.width/2,e.y-e.height/2,e.x+e.width/2,e.y+e.height/2))return false;
 }
 return true;
}
/** A conservative forward foot probe prevents blind steps into unsupported pits. */
export function terrainAhead(x:number,bottom:number,direction:number,platforms:readonly Platform[]){
 if(direction===0)return{supported:true,canLeap:false};
 const probe=x+direction*.84;
 const supported=platforms.some(p=>probe>=p.x+.12&&probe<=p.x+p.width-.12&&Math.abs((p.y+p.height)-bottom)<.55);
 if(supported)return{supported:true,canLeap:false};
 const gapSide=direction>0?x+.35:x-.35;
 const target=platforms.some(p=>{
  const edge=direction>0?p.x:p.x+p.width;
  const along=(edge-gapSide)*direction;
  const top=p.y+p.height;
  return along>.1&&along<6.6&&top>bottom-1.6&&top<bottom+2.9;
 });
 return{supported:false,canLeap:target};
}
export function bossPhaseFor(health:number,maxHealth:number){
 const ratio=health/Math.max(1,maxHealth);
 return ratio<=.35?2:ratio<=.7?1:0;
}

import type {Storage} from "../storage/Storage";
import type {WeaponId} from "../input/Input";

export const PROGRESSION_STORAGE_KEY="doodlegame.progression";
export type RunStage=1|2|3|4;
export type RunStatus="ready"|"fighting"|"victory"|"defeat"|"complete";
export type Medal="rookie"|"veteran"|"champion";
export type UpgradeSnapshot={points:number;upgradedWeapons:readonly WeaponId[]};
export type RunCheckpoint={stage:RunStage;status:RunStatus;points:number;upgradedWeapons:WeaponId[]};
export type ProgressionView={
 totalWins:number;completedRuns:number;bestStage:number;medals:readonly Medal[];
 run:RunCheckpoint|null;choices:readonly WeaponId[];
};
type SavedData={version:1;totalWins:number;completedRuns:number;bestStage:number;run:RunCheckpoint|null};
const ALL_WEAPONS:readonly WeaponId[]=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile"];
const DEFAULTS:SavedData={version:1,totalWins:0,completedRuns:0,bestStage:0,run:null};

function count(value:unknown,max=1000000){
 return typeof value==="number"&&Number.isSafeInteger(value)&&value>=0&&value<=max?value:0;
}
function weaponList(input:unknown):WeaponId[]{
 if(!Array.isArray(input))return[];
 return [...new Set(input.filter((id):id is WeaponId=>typeof id==="string"&&ALL_WEAPONS.includes(id as WeaponId)))];
}
function parseRun(value:unknown):RunCheckpoint|null{
 if(!value||typeof value!=="object")return null;
 const v=value as Record<string,unknown>;
 if(![1,2,3,4].includes(v.stage as number))return null;
 if(!["ready","fighting","victory","defeat","complete"].includes(v.status as string))return null;
 if((v.status==="complete")!==(v.stage===4&&v.status==="complete"))return null;
 const upgradedWeapons=weaponList(v.upgradedWeapons);
 return{stage:v.stage as RunStage,status:v.status==="fighting"?"ready":v.status as RunStatus,
  points:Math.min(4,count(v.points,4)),upgradedWeapons};
}
function readData(raw:unknown):SavedData{
 if(!raw||typeof raw!=="object")return{...DEFAULTS};
 const data=raw as Record<string,unknown>;
 if(data.version!==1&&data.version!==0)return{...DEFAULTS};
 const totalWins=count(data.totalWins),completedRuns=count(data.completedRuns),bestStage=count(data.bestStage,4);
 // Version 0 stored career counters only. It intentionally never restores a run.
 const run=data.version===1?parseRun(data.run):null;
 return{version:1,totalWins,completedRuns,bestStage,run};
}
/** Local-only campaign. All writes are best-effort; invalid data never blocks play. */
export class Progression{
 private data:SavedData;
 constructor(private readonly storage:Storage){
  let raw:unknown=null;
  try{raw=storage.get<unknown>(PROGRESSION_STORAGE_KEY);}
  catch(error){console.warn("Invalid progression storage; starting with defaults.",error);}
  this.data=readData(raw);
  // Re-save after migrating v0 or resetting an in-flight fight after a reload.
  if(raw!==null)this.persist();
 }
 getView():ProgressionView{
  const {totalWins,completedRuns,bestStage,run}=this.data;
  const medals:Medal[]=[];
  if(totalWins>=1)medals.push("rookie");
  if(totalWins>=3)medals.push("veteran");
  if(completedRuns>=1)medals.push("champion");
  return{totalWins,completedRuns,bestStage,medals,
   run:run?{...run,upgradedWeapons:[...run.upgradedWeapons]}:null,
   choices:this.choices()};
 }
 private choices():WeaponId[]{
  const run=this.data.run;
  if(!run||run.status!=="victory")return[];
  // Three distinct options per intermission; already owned upgrades are excluded.
  const rotation=["blade","blaster","bow","hammer","uzi","boomerang","bomb","missile"] as const;
  const available=rotation.filter(id=>!run.upgradedWeapons.includes(id));
  const offset=(run.stage-1)*2%Math.max(1,available.length);
  return[...available.slice(offset),...available.slice(0,offset)].slice(0,3);
 }
 begin(){
  this.data.run={stage:1,status:"ready",points:0,upgradedWeapons:[]};
  this.persist();
 }
 canLaunch(){return Boolean(this.data.run&&["ready","defeat"].includes(this.data.run.status));}
 launch(){
  if(!this.canLaunch())return false;
  this.data.run!.status="fighting";
  this.persist();
  return true;
 }
 suspend(snapshot:UpgradeSnapshot){
  const run=this.data.run;
  if(!run||run.status!=="fighting")return false;
  run.points=Math.min(4,count(snapshot.points,4));
  run.upgradedWeapons=weaponList(snapshot.upgradedWeapons);
  run.status="ready";
  this.persist();
  return true;
 }
 result(winner:"player"|"opponent",snapshot:UpgradeSnapshot){
  const run=this.data.run;
  if(!run||run.status!=="fighting")return false;
  run.points=Math.min(4,count(snapshot.points,4));
  run.upgradedWeapons=weaponList(snapshot.upgradedWeapons);
  if(winner==="player"){
   this.data.totalWins++;
   this.data.bestStage=Math.max(this.data.bestStage,run.stage);
   if(run.stage===4){run.status="complete";this.data.completedRuns++;}
   else run.status="victory";
  }else run.status="defeat";
  this.persist();
  return true;
 }
 purchase(id:WeaponId,snapshot:UpgradeSnapshot){
  const run=this.data.run;
  if(!run||run.status!=="victory"||!this.choices().includes(id)||run.points<1)return false;
  if(snapshot.points!==run.points-1||!snapshot.upgradedWeapons.includes(id))return false;
  run.points=snapshot.points;
  run.upgradedWeapons=weaponList(snapshot.upgradedWeapons);
  this.persist();
  return true;
 }
 canAdvance(){
  const run=this.data.run;
  return Boolean(run&&run.status==="victory"&&(run.points===0||this.choices().length===0));
 }
 advance(){
  const run=this.data.run;
  if(!run||!this.canAdvance()||run.stage===4)return false;
  run.stage=(run.stage+1) as RunStage;
  run.status="ready";
  this.persist();
  return true;
 }
 clear(){this.data.run=null;this.persist();}
 private persist(){
  try{this.storage.set(PROGRESSION_STORAGE_KEY,this.data);}
  catch(error){console.warn("Could not save progression; progress will last for this session.",error);}
 }
}

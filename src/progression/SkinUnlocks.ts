import {isMummyStyle,type MummyStyleId} from "../gameplay/MummyStyles.js";
import type {WeaponId} from "../input/Input";
import type {Storage} from "../storage/Storage";

export const SKIN_UNLOCK_STORAGE_KEY="doodlegame.skinUnlocks.v1";
type EarnableStyle=Exclude<MummyStyleId,"classic">;
type Counter="wins"|"bowWins"|"arenaWins"|"completedRuns";
export const MUMMY_SKIN_TASKS:Readonly<Record<EarnableStyle,{counter:Counter;target:number;en:string;fa:string}>>={
 royal:{counter:"wins",target:1,en:"Win 1 solo fight",fa:"پیروزی در ۱ مبارزه تک‌نفره"},
 cursed:{counter:"wins",target:5,en:"Win 5 solo fights",fa:"پیروزی در ۵ مبارزه تک‌نفره"},
 scarab:{counter:"bowWins",target:2,en:"Win 2 solo fights with Bow",fa:"پیروزی در ۲ مبارزه با کمان"},
 desert:{counter:"arenaWins",target:3,en:"Win on 3 different arenas",fa:"پیروزی در ۳ زمین متفاوت"},
 sentinel:{counter:"completedRuns",target:1,en:"Complete a four-fight Run",fa:"تکمیل یک مسیر چهارمبارزه‌ای"}
};
export type SkinUnlockCounters={
 readonly wins:number;readonly bowWins:number;readonly arenasWon:readonly string[];readonly completedRuns:number;
};
export type SkinChallengeProgress={unlocked:boolean;current:number;target:number;en:string;fa:string};
export type SkinUnlockView=SkinUnlockCounters&{
 readonly challenges:Readonly<Record<MummyStyleId,SkinChallengeProgress>>;
};
type SavedData={version:1;wins:number;bowWins:number;arenasWon:string[];completedRuns:number};
const DEFAULTS=():SavedData=>({version:1,wins:0,bowWins:0,arenasWon:[],completedRuns:0});
const bounded=(value:unknown)=>typeof value==="number"&&Number.isSafeInteger(value)&&value>=0?
 Math.min(value,1000000):0;
function parseSaved(raw:unknown):SavedData{
 if(!raw||typeof raw!=="object"||(raw as {version?:unknown}).version!==1)return DEFAULTS();
 const data=raw as Record<string,unknown>;
 const wins=bounded(data.wins);
 const bowWins=Math.min(wins,bounded(data.bowWins));
 const arenasWon=Array.isArray(data.arenasWon)?[...new Set(data.arenasWon.filter(
  (id):id is string=>typeof id==="string"&&id.length<=64&&/^[a-z0-9-]+$/.test(id)
 ))].slice(0,64):[];
 return{version:1,wins,bowWins,arenasWon,completedRuns:Math.min(wins,bounded(data.completedRuns))};
}
export function mummySkinProgress(view:SkinUnlockCounters,style:MummyStyleId):SkinChallengeProgress{
 if(style==="classic")return{unlocked:true,current:0,target:0,en:"Available from the start",fa:"از ابتدا آزاد است"};
 const task=MUMMY_SKIN_TASKS[style];
 const raw=task.counter==="arenaWins"?view.arenasWon.length:view[task.counter];
 const current=Math.max(0,Math.min(task.target,raw));
 return{unlocked:current>=task.target,current,target:task.target,en:task.en,fa:task.fa};
}
/** Challenges are earned in real solo fights only; local PvP never farms cosmetic progress.
 * This is device-local progress: no account, purchase, backend or combat-stat changes.
 */
export class SkinUnlocks{
 private data:SavedData;
 constructor(private readonly storage:Storage){
  let raw:unknown=null;
  try{raw=storage.get<unknown>(SKIN_UNLOCK_STORAGE_KEY);}
  catch(error){console.warn("Cannot read skin unlock progress; starting fresh.",error);}
  this.data=parseSaved(raw);
 }
 getView():SkinUnlockView{
  const {wins,bowWins,arenasWon,completedRuns}=this.data;
  const counters={wins,bowWins,arenasWon:[...arenasWon],completedRuns};
  return{...counters,challenges:{
   classic:mummySkinProgress(counters,"classic"),royal:mummySkinProgress(counters,"royal"),
   cursed:mummySkinProgress(counters,"cursed"),scarab:mummySkinProgress(counters,"scarab"),
   desert:mummySkinProgress(counters,"desert"),sentinel:mummySkinProgress(counters,"sentinel")
  }};
 }
 isUnlocked(style:MummyStyleId){return isMummyStyle(style)&&this.getView().challenges[style].unlocked;}
 recordSoloVictory(event:{arena:string;weapon:WeaponId;completedRun:boolean}){
  const before=this.getView();
  this.data.wins=Math.min(1000000,this.data.wins+1);
  if(event.weapon==="bow")this.data.bowWins=Math.min(this.data.wins,this.data.bowWins+1);
  if(/^[a-z0-9-]{1,64}$/.test(event.arena)&&!this.data.arenasWon.includes(event.arena)&&this.data.arenasWon.length<64)
   this.data.arenasWon.push(event.arena);
  if(event.completedRun)this.data.completedRuns=Math.min(this.data.wins,this.data.completedRuns+1);
  this.persist();
  return(Object.keys(MUMMY_SKIN_TASKS) as EarnableStyle[]).filter(style=>
   !mummySkinProgress(before,style).unlocked&&this.isUnlocked(style));
 }
 private persist(){
  try{this.storage.set(SKIN_UNLOCK_STORAGE_KEY,this.data);}
  catch(error){console.warn("Cannot save skin unlock progress; keeping this session's rewards.",error);}
 }
}

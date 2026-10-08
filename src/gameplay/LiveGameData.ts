import type {ArenaId} from "./GameSession.js";
import type {WeaponId} from "../input/Input.js";

/**
 * Data-only update format. Never fetch or evaluate JavaScript, HTML, or native binaries.
 * The JSON on GitHub's main branch is editable without publishing an Android APK.
 */
export const GITHUB_GAME_DATA_URL="https://raw.githubusercontent.com/abolfazl260/doodlegame/main/public/game-data.json";
export const GAME_DATA_STORAGE_KEY="doodlegame.gameData.v1";
const WEAPON_IDS:readonly WeaponId[]=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile"];
const ARENA_IDS:readonly ArenaId[]=["classic","towers","pit","steps","zigzag","sky","moving","fortress","bridge","crater","vertical","ruins","conveyor","collapse","storm","reactor"];
const MAX_BYTES=32768;
export interface WeaponTuning {readonly damage?:number;readonly cooldown?:number;}
export interface ArenaTuning {readonly speedMultiplier?:number;readonly jumpMultiplier?:number;}
export interface LiveGameData {
 readonly schemaVersion:1;
 readonly dataVersion:number;
 readonly weapons:Readonly<Partial<Record<WeaponId,WeaponTuning>>>;
 readonly arenas:Readonly<Partial<Record<ArenaId,ArenaTuning>>>;
}
const plain=(value:unknown):value is Record<string,unknown>=>value!==null&&typeof value==="object"&&!Array.isArray(value);
const only=(value:Record<string,unknown>,keys:readonly string[])=>Object.keys(value).every(key=>keys.includes(key));
const numeric=(value:unknown,min:number,max:number)=>typeof value==="number"&&Number.isFinite(value)&&value>=min&&value<=max;

/** Sanitize untrusted JSON before it is saved or applied to physics/gameplay. */
export function parseLiveGameData(raw:unknown):LiveGameData|null{
 if(!plain(raw)||!only(raw,["schemaVersion","dataVersion","weapons","arenas"])||raw.schemaVersion!==1||!Number.isSafeInteger(raw.dataVersion)||!numeric(raw.dataVersion,1,1_000_000_000))return null;
 if(!plain(raw.weapons)||!plain(raw.arenas)||!only(raw.weapons,WEAPON_IDS)||!only(raw.arenas,ARENA_IDS))return null;
 const weapons:Partial<Record<WeaponId,WeaponTuning>>={};
 const arenas:Partial<Record<ArenaId,ArenaTuning>>={};
 for(const id of WEAPON_IDS){
  const v=raw.weapons[id];
  if(v===undefined)continue;
  if(!plain(v)||!only(v,["damage","cooldown"])||Object.keys(v).length===0)return null;
  if(v.damage!==undefined&&!numeric(v.damage,1,70))return null;
  if(v.cooldown!==undefined&&!numeric(v.cooldown,.06,6))return null;
  weapons[id]={...(v.damage!==undefined?{damage:v.damage as number}:{}),...(v.cooldown!==undefined?{cooldown:v.cooldown as number}:{})};
 }
 for(const id of ARENA_IDS){
  const v=raw.arenas[id];
  if(v===undefined)continue;
  if(!plain(v)||!only(v,["speedMultiplier","jumpMultiplier"])||Object.keys(v).length===0)return null;
  if(v.speedMultiplier!==undefined&&!numeric(v.speedMultiplier,.5,1.6))return null;
  if(v.jumpMultiplier!==undefined&&!numeric(v.jumpMultiplier,.55,1.8))return null;
  arenas[id]={...(v.speedMultiplier!==undefined?{speedMultiplier:v.speedMultiplier as number}:{}),...(v.jumpMultiplier!==undefined?{jumpMultiplier:v.jumpMultiplier as number}:{})};
 }
 if(Object.keys(weapons).length+Object.keys(arenas).length===0)return null;
 return{schemaVersion:1,dataVersion:raw.dataVersion as number,weapons,arenas};
}
export async function downloadLatestGameData(fetcher:typeof fetch=fetch):Promise<LiveGameData>{
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),12000);
 try{
  const response=await fetcher(GITHUB_GAME_DATA_URL,{cache:"no-store",headers:{Accept:"application/json"},signal:controller.signal});
  if(!response.ok)throw new Error("GitHub data request failed");
  if(Number(response.headers.get("content-length")||0)>MAX_BYTES)throw new Error("Game data is too large");
  const body=await response.text();
  if(body.length>MAX_BYTES)throw new Error("Game data exceeds size budget");
  const parsed=parseLiveGameData(JSON.parse(body) as unknown);
  if(!parsed)throw new Error("Game data is incompatible");
  return parsed;
 }finally{clearTimeout(timeout);}
}

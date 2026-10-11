import type {Storage} from "../storage/Storage";

export const PLAYER_NAMES_STORAGE_KEY="doodlegame.characterNames";
export type PlayerIndex=1|2;
const MAX_NAME_LENGTH=18;

/** Names are user-authored, optional and only saved locally on this device. */
export function normalizeCharacterName(raw:unknown):string{
 if(typeof raw!=="string")return "";
 // Exclude invisible controls and bidi overrides to keep HUD text legible.
 const safe=raw.normalize("NFC")
  .replace(/[\u0000-\u001f\u007f-\u009f\u200e\u200f\u202a-\u202e\u2066-\u2069]/gu,"")
  .replace(/\s+/gu," ").trim();
 return Array.from(safe).slice(0,MAX_NAME_LENGTH).join("");
}

export class PlayerNames{
 private names:{player1:string;player2:string}={player1:"",player2:""};
 constructor(private readonly storage:Storage){
  try{
   const data=storage.get<unknown>(PLAYER_NAMES_STORAGE_KEY);
   if(data&&typeof data==="object"&&!Array.isArray(data)){
    const saved=data as Record<string,unknown>;
    this.names.player1=normalizeCharacterName(saved.player1);
    this.names.player2=normalizeCharacterName(saved.player2);
   }
  }catch(error){console.warn("Cannot load character names; using defaults.",error);}
 }
 get(player:PlayerIndex){return this.names[player===1?"player1":"player2"];}
 set(player:PlayerIndex,raw:string){
  const key=player===1?"player1":"player2";
  const name=normalizeCharacterName(raw);
  if(this.names[key]===name)return;
  this.names[key]=name;
  try{this.storage.set(PLAYER_NAMES_STORAGE_KEY,{...this.names});}
  catch(error){console.warn("Cannot save character names on this device.",error);}
 }
}

import type {BuiltInArenaId,CharacterId} from '../gameplay/GameSession';
import type {WeaponId,InputState} from '../input/Input';
import type {InputSample,InputEdge} from './NetworkInput';
import {object,num,integer,bool,str,choice,list} from './Validation.js';
import {MAX_PACKET_BYTES} from './LanTransport.js';
import {decodeFrame,type MatchFrame} from './StateCodec.js';
export const PROTOCOL=1;
export const ARENAS:readonly BuiltInArenaId[]=['classic','towers','pit','steps','zigzag','sky','moving','fortress','bridge','crater','vertical','ruins','conveyor','collapse','storm','reactor'];
export const WEAPONS:readonly WeaponId[]=['blade','hammer','blaster','uzi','boomerang','bow','bomb','missile','spear','grapple'];
export const CHARACTERS:readonly CharacterId[]=['soldier','ninja','viking','ranger','pharaoh','knight','mummy','archer'];
export type Phase='lobby'|'countdown'|'playing'|'paused'|'result'|'lost';
export type Lobby={arena:BuiltInArenaId;mode:'duel';hostReady:boolean;guestReady:boolean;phase:Phase;epoch:number;remaining:number;match:number;hostCharacter:CharacterId;guestCharacter:CharacterId;hostWeapon:WeaponId;guestWeapon:WeaponId;};
export type Message=
 |{type:'JOIN';version:number;fingerprint:string;token:string}
 |{type:'ACCEPT';version:number;fingerprint:string}
 |{type:'REJECT';reason:string}
 |{type:'LOBBY';lobby:Lobby}
 |{type:'READY';ready:boolean;character:CharacterId;weapon:WeaponId}
 |{type:'START';epoch:number;remaining:number;match:number}
 |{type:'INPUT';epoch:number;seq:number;held:InputSample;edges:InputEdge[];cueAck:number}
 |{type:'SNAPSHOT';frame:MatchFrame}
 |{type:'PING'|'PONG';time:number}
 |{type:'PAUSE'|'BACKGROUND'|'RESUME_READY'|'REMATCH'|'LEAVE'};
export function decodeInput(value:unknown):InputState {
 const p=object(value),output:Record<string,number|boolean>={};
 for(const key of ['moveX','moveY','pointerX','pointerY'] as const)output[key]=num(p[key],-1,1);
 for(const key of ['pointerDown','pointerPressed','pointerReleased','attackHeld','attackCancelled','jumpPressed','dashPressed','grabPressed','attackPressed','weaponNextPressed','weaponPreviousPressed','aimUpHeld','aimDownHeld','mobileJump','mobileGrab','mobileAttack'] as const)output[key]=p[key]===undefined?false:bool(p[key]);
 output.mobileMoveX=p.mobileMoveX===undefined?0:num(p.mobileMoveX,-1,1);
 return output as unknown as InputState;
}
const sample=(value:unknown):InputSample=>{const p=object(value);return{input:decodeInput(p.input),aim:p.aim===null?null:(()=>{const a=list(p.aim,2,v=>num(v,-1,1));if(a.length!==2)throw new Error('packet');return a as [number,number];})(),weapon:p.weapon===null?null:choice(p.weapon,WEAPONS)};};
export function decodeLobby(value:unknown):Lobby{
 const p=object(value);return{arena:choice(p.arena,ARENAS),mode:choice(p.mode,['duel']),hostReady:bool(p.hostReady),guestReady:bool(p.guestReady),phase:choice(p.phase,['lobby','countdown','playing','paused','result','lost']),epoch:integer(p.epoch),remaining:num(p.remaining,0,10),match:integer(p.match),hostCharacter:choice(p.hostCharacter,CHARACTERS),guestCharacter:choice(p.guestCharacter,CHARACTERS),hostWeapon:choice(p.hostWeapon,WEAPONS),guestWeapon:choice(p.guestWeapon,WEAPONS)};
}
export function decodeMessage(data:string):Message {
 if(new TextEncoder().encode(data).length>MAX_PACKET_BYTES)throw new Error('packet');
 const p=object(JSON.parse(data)),type=str(p.type,24);
 switch(type){
  case 'JOIN':return{type,version:integer(p.version),fingerprint:str(p.fingerprint,64),token:str(p.token,32)};
  case 'ACCEPT':return{type,version:integer(p.version),fingerprint:str(p.fingerprint,64)};
  case 'REJECT':return{type,reason:str(p.reason,32)};
  case 'LOBBY':return{type,lobby:decodeLobby(p.lobby)};
  case 'READY':return{type,ready:bool(p.ready),character:choice(p.character,CHARACTERS),weapon:choice(p.weapon,WEAPONS)};
  case 'START':return{type,epoch:integer(p.epoch),remaining:num(p.remaining,0,10),match:integer(p.match)};
  case 'INPUT':return{type,epoch:integer(p.epoch),seq:integer(p.seq,1),held:sample(p.held),edges:list(p.edges,64,v=>{const e=object(v);return{...sample(e),id:integer(e.id,1)};}),cueAck:integer(p.cueAck)};
  case 'SNAPSHOT':return{type,frame:decodeFrame(p.frame)};
  case 'PING':case 'PONG':return{type,time:num(p.time,0,Number.MAX_SAFE_INTEGER)};
  case 'PAUSE':case 'BACKGROUND':case 'RESUME_READY':case 'REMATCH':case 'LEAVE':return{type};
  default:throw new Error('packet');
 }
}
export function sessionToken(){const bytes=new Uint8Array(16);crypto.getRandomValues(bytes);return Array.from(bytes,b=>b.toString(16).padStart(2,'0')).join('');}

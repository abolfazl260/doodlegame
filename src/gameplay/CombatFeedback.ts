import type {WeaponId} from "../input/Input";

/** Presentation events. Never use these to apply damage or change simulation timing. */
export type CombatCueKind="attack"|"hit"|"block"|"deflect"|"explosion"|"defeat";
export interface CombatCue {
 readonly id:number;
 readonly kind:CombatCueKind;
 readonly weapon:WeaponId;
 readonly x:number;
 readonly y:number;
 readonly direction:number;
 readonly intensity:number;
 readonly age:number;
 readonly life:number;
}
export const MAX_COMBAT_CUES=24;
export const cueLife=(kind:CombatCueKind)=>kind==="explosion"?.42:kind==="defeat"?.55:kind==="attack"?.13:.28;

/** Pure, bounded shake so both renderers agree and don't accumulate camera drift. */
export function combatShake(cues:readonly CombatCue[],enabled:boolean){
 if(!enabled)return{x:0,y:0};
 let x=0,y=0;
 for(const cue of cues){
  if(cue.kind!=="hit"&&cue.kind!=="explosion")continue;
  const t=Math.min(1,Math.max(0,cue.age/cue.life));
  const strength=(cue.kind==="explosion"?.13:.055)*cue.intensity*(1-t)*(1-t);
  x+=Math.sin(cue.id*4.67+cue.age*115)*strength;
  y+=Math.cos(cue.id*7.13+cue.age*93)*strength*.75;
 }
 return{x:Math.max(-.2,Math.min(.2,x)),y:Math.max(-.15,Math.min(.15,y))};
}

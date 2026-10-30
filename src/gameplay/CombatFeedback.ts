import type {WeaponId} from "../input/Input";
import type {GameRenderState} from "./GameSession";

/** Presentation events. Never use these to apply damage or change simulation timing. */
export type CombatCueKind="attack"|"hit"|"block"|"deflect"|"explosion"|"slam"|"defeat"|"throw";
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
 readonly variant?:CombatCueVariant;
 /** Recorded only for real HP loss, after health mutation. */
 readonly appliedDamage?:number;
 readonly target?:"player"|"opponent";
 readonly damageSource?:"weapon"|"hazard";
}
export const MAX_COMBAT_CUES=24;
// Hits keep their source cue alive for the 480ms damage-label fade; visual glow stays bounded.
export const cueLife=(kind:CombatCueKind)=>kind==="slam"?.34:kind==="explosion"?.42:kind==="defeat"?.55:kind==="throw"?.34:kind==="attack"?.13:kind==="hit"?.48:.28;

/** At most twelve simultaneous labels, always using actual HP deltas and cue IDs. */
export const MAX_DAMAGE_LABELS=12;
export function visibleDamageCues(cues:readonly CombatCue[]):readonly CombatCue[]{
 const matches:CombatCue[]=[];
 for(const cue of cues){
  if(cue.kind!=="hit"||!Number.isFinite(cue.appliedDamage)||!(cue.appliedDamage!>0)||cue.life<=0||cue.age>=cue.life)continue;
  matches.push(cue);
  if(matches.length>MAX_DAMAGE_LABELS)matches.shift();
 }
 return matches;
}
export function formatAppliedDamage(amount:number):string{
 if(!Number.isFinite(amount)||amount<=0)return"";
 // Tiny fractional hits must never display a misleading zero.
 const display=amount>=1?Number(amount.toFixed(2)):Number(amount.toPrecision(2));
 return"-"+display.toString();
}
export interface DamageLabelFrame{
 readonly text:string;readonly x:number;readonly y:number;readonly alpha:number;readonly scale:number;readonly color:string;
}
/** Both renderers use the same moving world-space anchor and deterministic overlap lanes. */
export function damageLabelFrame(cue:CombatCue,anchor:Readonly<{x:number;y:number}>,reducedMotion=false):DamageLabelFrame|null{
 const text=cue.kind==="hit"?formatAppliedDamage(cue.appliedDamage??0):"";
 if(!text||cue.life<=0||cue.age<0||cue.age>=cue.life)return null;
 const t=Math.min(1,Math.max(0,cue.age/cue.life));
 const lane=cue.id%3-1;
 return{
  text,
  x:anchor.x+lane*.21,
  y:anchor.y+1.12+(cue.id%2)*.13+(reducedMotion?.06*t:.53*t),
  alpha:Math.min(1,(1-t)*2.1),
  scale:cue.appliedDamage!>=20?1.14:1,
  color:cue.damageSource==="hazard"?"#ffcf85":cue.appliedDamage!>=20?"#ffe49a":"#ffffff"
 };
}
/** Visual-only semantic variants; a parry *attempt* is never a successful deflection. */
export type CombatCueVariant="pull"|"parry"|"parry-success";
export type CombatGlyph="slash"|"impact"|"smash"|"muzzle"|"arrow"|"return"|"hook"|"blast"|"gravity"|"shield"|"finish";
export type GlyphSegment=readonly [number,number,number,number];
export interface CombatCueArt{
 readonly glyph:CombatGlyph;
 readonly color:string;
 readonly accent:string;
 readonly radius:number;
 readonly aspectY:number;
 readonly ringAlpha:number;
 readonly lineAlpha:number;
 readonly accentAlpha:number;
}
/** Shared linework for Canvas and WebGL, in normalized attack-facing coordinates.
 * Arrays contain no physics data or randomized state; GPU geometries can be cached per glyph. */
export const COMBAT_GLYPH_LINES:Readonly<Record<CombatGlyph,Readonly<{main:readonly GlyphSegment[];accent:readonly GlyphSegment[]}>>>={
 slash:{main:[[-.75,-.48,-.48,.1],[-.48,.1,.05,.65],[.05,.65,.63,.78],[.63,.78,.98,.56]],
        accent:[[.48,.64,.74,.96],[.72,.52,1.10,.60],[.49,.91,.55,1.12]]},
 impact:{main:[[-.65,0,-.3,0],[.28,0,.82,0],[0,-.65,0,-.3],[0,.32,0,.7]],
         accent:[[-.46,-.37,-.69,-.54],[.42,.4,.69,.61],[-.54,.42,-.7,.61],[.55,-.37,.76,-.57]]},
 smash:{main:[[-1.2,-.45,-.54,-.45],[-.54,-.45,0,-.20],[0,-.20,.58,-.45],[.58,-.45,1.25,-.45]],
        accent:[[-.9,-.5,-1.1,-.25],[-.55,-.5,-.65,-.18],[.55,-.5,.65,-.18],[.9,-.5,1.1,-.25],[-.2,-.55,-.35,-.68],[.2,-.55,.35,-.68]]},
 muzzle:{main:[[.03,0,.83,0],[.10,.04,.63,.39],[.10,-.04,.63,-.39]],
         accent:[[.82,0,1.03,.12],[.82,0,1.03,-.12]]},
 arrow:{main:[[-.65,0,.72,0],[.72,0,.37,.31],[.72,0,.37,-.31]],
        accent:[[-.50,.24,-.28,0],[-.50,-.24,-.28,0]]},
 return:{main:[[-.72,-.18,-.32,.44],[-.32,.44,.34,.55],[.34,.55,.76,.12]],
         accent:[[.76,.12,.49,.13],[.76,.12,.63,.40]]},
 hook:{main:[[-.84,0,.50,0],[.50,0,.82,.27],[.82,.27,1.01,.08],[.50,0,.82,-.27],[.82,-.27,1.01,-.08]],
       accent:[[-.45,.12,-.66,.12],[-.45,-.12,-.66,-.12]]},
 blast:{main:[[.18,.16,.85,.57],[.16,-.18,.9,-.61],[-.17,.2,-.65,.53],[-.19,-.16,-.67,-.48]],
        accent:[[.9,.02,1.2,.04],[-.91,0,-1.16,.04],[0,.85,0,1.11],[0,-.85,0,-1.11]]},
 gravity:{main:[[-.94,-.08,-.57,.33],[-.57,.33,-.02,.51],[-.02,.51,.54,.31],[.54,.31,.81,-.14]],
          accent:[[.81,-.14,.51,-.15],[.81,-.14,.77,.17],[-.67,-.20,-.28,-.4],[-.28,-.4,.23,-.33]]},
 shield:{main:[[-.73,-.44,-.65,.42],[-.65,.42,0,.85],[0,.85,.65,.42],[.65,.42,.73,-.44]],
         accent:[[-.50,.14,-.19,.47],[-.19,.47,.19,.47],[.19,.47,.50,.14]]},
 finish:{main:[[-.86,-.55,-.54,.65],[-.54,.65,0,.96],[0,.96,.54,.65],[.54,.65,.86,-.55]],
         accent:[[-.52,-.46,-.1,-.24],[.1,-.24,.52,-.46],[-.18,.38,.18,.38]]}
};
/** Pure palette/shape selection prevents the two renderers from diverging. */
export function combatCueArt(cue:Pick<CombatCue,"kind"|"weapon"|"intensity"|"variant">):CombatCueArt{
 const {kind,weapon}=cue;
 const explosive=kind==="explosion";
 const finishing=kind==="defeat";
 const gauntlet=weapon==="gravity-gauntlet";
 let glyph:CombatGlyph="impact";
 if(finishing)glyph="finish";
 else if(explosive)glyph="blast";
 else if(kind==="slam"||weapon==="hammer"&&kind==="hit")glyph="smash";
 else if(gauntlet&&cue.variant==="pull")glyph="gravity";
 else if(kind==="deflect"||kind==="block")glyph="shield";
 else if(kind==="attack"||kind==="throw"){
  glyph=weapon==="blade"?"slash":weapon==="hammer"?"smash":
   weapon==="blaster"||weapon==="uzi"?"muzzle":
   weapon==="bow"||weapon==="spear"?"arrow":
   weapon==="boomerang"?"return":weapon==="grapple"?"hook":
   weapon==="bomb"||weapon==="missile"?"blast":
   "impact";
 }else if(kind==="hit"){
  glyph=weapon==="blade"?"slash":
   weapon==="bow"||weapon==="spear"?"arrow":
   weapon==="boomerang"?"return":weapon==="grapple"?"hook":
   "impact";
 }
 const color=finishing?"#fff0b9":
  gauntlet?(cue.variant==="pull"?"#ca89ff":"#5dfff2"):
  weapon==="hammer"?"#f0c187":
  weapon==="blade"?"#f7faff":
  weapon==="blaster"||weapon==="uzi"?"#ffd66d":
  weapon==="bow"||weapon==="spear"?"#a2e9fb":
  weapon==="boomerang"?"#57b6ff":
  weapon==="grapple"?"#7fdbbd":
  weapon==="bomb"||weapon==="missile"?"#ffa94e":"#ffffff";
 const accent=finishing?"#ffcf64":gauntlet?(cue.variant==="pull"?"#9956ff":"#c8fffd"):
  weapon==="hammer"?"#a98465":weapon==="blade"?"#c2e8ff":
  weapon==="blaster"||weapon==="uzi"?"#fff6bf":
  weapon==="bow"||weapon==="spear"?"#e9faff":
  weapon==="boomerang"?"#9edbff":
  weapon==="grapple"?"#b1fff0":"#ffe1a2";
 const radius=kind==="slam"?1.25:explosive?.92:finishing?1.12:
  kind==="attack"?.38:kind==="throw"?.52:kind==="deflect"?.72:kind==="block"?.58:.62;
 const aspectY=glyph==="smash"?.63:1;
 // Explosion bodies already draw a full expanding ring; just add short colored rays.
 const ringAlpha=kind==="attack"||kind==="throw"?0:explosive?.10:kind==="hit"?.5:finishing?.72:.4;
 const lineAlpha=kind==="attack"?.5:explosive?.42:finishing?.72:.88;
 return{glyph,color,accent,radius,aspectY,ringAlpha,lineAlpha,accentAlpha:lineAlpha*.76};
}
/** Both engines use the same bounded lifetime, scale and fade. */
export function combatCueFrame(cue:Pick<CombatCue,"kind"|"age"|"life"|"intensity">,reducedMotion=false){
 const t=cue.life>0?Math.max(0,Math.min(1,cue.age/cue.life)):1;
 const fade=(1-t)*(1-t);
 const zoom=reducedMotion?.92:.58+t*.86;
 return{fade,size:Math.max(.1,Math.min(2,cue.intensity))*zoom};
}


/** Pure, bounded shake so both renderers agree and don't accumulate camera drift. */
export function combatShake(cues:readonly CombatCue[],enabled:boolean){
 if(!enabled)return{x:0,y:0};
 let x=0,y=0;
 for(const cue of cues){
  if(cue.life<=0)continue;
  if(cue.kind!=="hit"&&cue.kind!=="explosion"&&cue.kind!=="slam")continue;
  const t=Math.min(1,Math.max(0,cue.age/cue.life));
  const strength=(cue.kind==="slam"?.12:cue.kind==="explosion"?.13:.055)*cue.intensity*(1-t)*(1-t);
  x+=Math.sin(cue.id*4.67+cue.age*115)*strength;
  y+=Math.cos(cue.id*7.13+cue.age*93)*strength*.75;
 }
 return{x:Math.max(-.2,Math.min(.2,x)),y:Math.max(-.15,Math.min(.15,y))};
}

/** Each phone applies its own motion preference without modifying the shared match snapshot. */
export function withCameraShakePreference(state:GameRenderState,enabled:boolean):GameRenderState{
 return{...state,cameraShake:combatShake(state.combatCues,enabled)};
}

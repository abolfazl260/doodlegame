import type {CombatCue} from "../gameplay/CombatFeedback";

/** Presentation-only synthesis preset. Deliberately short and conservative for phones. */
export type CombatSoundProfile={
 readonly wave:OscillatorType;
 readonly frequency:number;
 readonly duration:number;
 readonly bend:number;
 readonly volume:number;
};
export function combatSoundProfile(cue:Pick<CombatCue,"kind"|"weapon"|"variant"|"intensity">):CombatSoundProfile{
 const {kind,weapon,variant}=cue;
 const heavy=weapon==="hammer",ranged=weapon==="blaster"||weapon==="uzi";
 let wave:OscillatorType="triangle",frequency=310,duration=.10,bend=.55,volume=.072;
 if(kind==="defeat"){
  wave="sawtooth";frequency=185;duration=.24;bend=.38;volume=.095;
 }else if(kind==="explosion"){
  wave="sawtooth";frequency=75;duration=.23;bend=.30;volume=.11;
 }else if(kind==="slam"){
  wave="sawtooth";frequency=95;duration=.18;bend=.32;volume=.10;
 }else if(weapon==="gravity-gauntlet"&&variant==="pull"){
  wave="sine";frequency=205;duration=.17;bend=1.7;volume=.065;
 }else if(kind==="deflect"){
  wave="sine";frequency=variant==="parry-success"?850:variant==="parry"?650:590;
  duration=variant==="parry-success"?.17:.10;
  bend=variant==="parry-success"?1.35:1.05;volume=variant==="parry-success"?.088:.047;
 }else if(kind==="block"){
  wave="square";frequency=215;duration=.09;bend=.52;volume=.043;
 }else if(kind==="attack"){
  if(heavy){wave="triangle";frequency=115;duration=.085;bend=.6;volume=.045;}
  else if(ranged){wave="square";frequency=weapon==="uzi"?450:360;duration=.042;bend=.64;volume=.028;}
  else if(weapon==="bow"||weapon==="spear"){wave="sine";frequency=415;duration=.074;bend=.67;volume=.037;}
  else if(weapon==="gravity-gauntlet"){wave="sine";frequency=490;duration=.068;bend=.77;volume=.046;}
  else{frequency=weapon==="blade"?510:310;duration=.065;bend=.62;volume=.039;}
 }else if(kind==="hit"){
  if(heavy){wave="sawtooth";frequency=108;duration=.14;bend=.37;volume=.09;}
  else if(weapon==="blade"){frequency=550;duration=.087;bend=.5;volume=.067;}
  else if(ranged){wave="square";frequency=440;duration=.065;bend=.5;volume=.047;}
  else if(weapon==="bow"||weapon==="spear"){wave="triangle";frequency=340;duration=.087;bend=.59;volume=.057;}
  else if(weapon==="gravity-gauntlet"){wave="sine";frequency=570;duration=.12;bend=.49;volume=.081;}
 }else if(kind==="throw"){
  wave="sine";frequency=275;duration=.095;bend=.68;volume=.047;
 }
 return{wave,frequency,duration,bend,volume:Math.min(.15,volume*Math.max(.25,Math.min(1.5,cue.intensity)))};
}

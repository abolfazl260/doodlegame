/** Deterministic, frame-independent tuning for close-range grabs. */
export type GrabPhase="attempt"|"hold"|"windup"|"recovery"|"held"|null;
export const GRAB={reach:1.48,tankReach:1.2,maxElevation:.48,anchorDistance:.91,attempt:.10,hold:.17,windup:.18,recovery:.25,cooldown:1.2,immunity:.9,throwSpeed:10,throwLift:5.4,damage:8,tankDamage:5} as const;
export interface GrabCandidate{
 readonly x:number;readonly y:number;readonly facing:number;readonly health:number;
 readonly enemyType:"runner"|"tank"|"shooter"|"jumper"|"bomber"|"ninja"|"boss"|null;
 readonly grabPhase:GrabPhase;readonly grabImmunity:number;
}
export function isGrabTarget(a:GrabCandidate,t:GrabCandidate,pathClear:boolean):boolean{
 if(!pathClear||a.health<=0||t.health<=0||(a.grabPhase!==null&&a.grabPhase!=="attempt")||t.grabPhase!==null||t.grabImmunity>0||t.enemyType==="boss")return false;
 const forward=(t.x-a.x)*a.facing;
 const reach=t.enemyType==="tank"?GRAB.tankReach:GRAB.reach;
 return forward>.55&&forward<=reach&&Math.abs(t.y-a.y)<=GRAB.maxElevation;
}
export function heldPosition(x:number,y:number,facing:number,deltaY:number){
 return{x:x+facing*GRAB.anchorDistance,y:y+Math.max(-GRAB.maxElevation,Math.min(GRAB.maxElevation,deltaY))};
}
export function grabGesture(startX:number,startY:number,x:number,y:number,elapsedMs:number):boolean{
 // Upward swipe, not diagonal aim or normal tap, and not a long bow hold.
 const dx=x-startX,up=startY-y;
 return elapsedMs>=0&&elapsedMs<=380&&up>=52&&Math.abs(dx)<=Math.max(30,up*.5);
}

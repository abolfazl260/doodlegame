/** Tunable, deterministic Gravity Gauntlet abilities; no network, rendering or input side effects. */
export const GRAVITY_GAUNTLET={
 pulseDamage:12,pulseRange:1.8,pulseKnockback:7,pulseCooldown:.52,
 pullHold:.32,pullDuration:.48,pullCooldown:1.45,pullRadius:4.15,pullAcceleration:65,
 parryWindow:.20,parryCooldown:1.35,parryRadius:.74,
 slamDamage:17,slamRadius:2.35,slamKnockback:8.6
} as const;
export function gauntletPullImpulse(dx:number,dy:number,dt:number,mass=1,upgraded=false){
 const radius=GRAVITY_GAUNTLET.pullRadius+(upgraded?.85:0);
 const distance=Math.hypot(dx,dy);
 if(!Number.isFinite(distance)||!Number.isFinite(dt)||dt<=0||distance<.25||distance>radius)return{x:0,y:0};
 const strength=GRAVITY_GAUNTLET.pullAcceleration*(1-distance/(radius*1.8))*Math.min(.05,dt)/Math.max(1,mass);
 return{x:dx/distance*strength,y:dy/distance*strength};
}
/** Reflect once when a projectile sweeps through the gauntlet's forward shield. */
export function gauntletParryContact(
 originX:number,originY:number,prevX:number,prevY:number,nextX:number,nextY:number,facing:number,upgraded=false
){
 const dx=nextX-prevX,dy=nextY-prevY,length=dx*dx+dy*dy;
 const fraction=length>1e-8?Math.max(0,Math.min(1,((originX-prevX)*dx+(originY-prevY)*dy)/length)):0;
 const px=prevX+dx*fraction,py=prevY+dy*fraction;
 return (px-originX)*facing>=-.18&&
  Math.hypot(px-originX,py-originY)<=GRAVITY_GAUNTLET.parryRadius+(upgraded?.18:0);
}

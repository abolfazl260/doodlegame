/** Grounded Down + ATTACK combo. Timings are in simulated seconds. */
export type KickKind="straight"|"spin";
export interface KickSpec{
 readonly duration:number;readonly windup:number;readonly activeEnd:number;
 readonly range:number;readonly damage:number;readonly knockback:number;
}
export const KICK_SPECS:Readonly<Record<KickKind,KickSpec>>={
 straight:{duration:.32,windup:.09,activeEnd:.205,range:1.35,damage:6,knockback:4},
 spin:{duration:.48,windup:.16,activeEnd:.345,range:1.58,damage:10,knockback:6.2}
};
export const KICK_COMBO_TIME=.86;
export const KICK_DOWN_THRESHOLD=.55;
export function kickIsActive(kind:KickKind,elapsed:number){
 const spec=KICK_SPECS[kind];
 return elapsed>=spec.windup&&elapsed<=spec.activeEnd;
}

import type {WeaponId} from "../input/Input";
import type {Storage} from "../storage/Storage";
import type {Locale} from "../i18n/I18n";

/** Single source for the touch HUD, weapon micro-coach and Help quick reference. */
type WeaponCopy={primary:string;secondary:string;tip:string};
export type TouchActionGuide={primary:string;secondary:string;tip:string};
const GUIDE:Readonly<Record<WeaponId,Readonly<Record<Locale,WeaponCopy>>>>={
 blade:{en:{primary:"TAP · SLASH",secondary:"SWIPE ↑ · GRAB",tip:"Tap ATTACK to slash. Swipe up early to grab when close."},fa:{primary:"لمس · برش",secondary:"کشیدن ↑ · گرفتن",tip:"برای برش، حمله را لمس کن. برای گرفتن نزدیک دشمن، سریع به بالا بکش."}},
 hammer:{en:{primary:"TAP · SMASH",secondary:"SWIPE ↑ · GRAB",tip:"Tap ATTACK for a heavy hit. Swipe up early to grab."},fa:{primary:"لمس · ضربه سنگین",secondary:"کشیدن ↑ · گرفتن",tip:"برای ضربه سنگین لمس کن؛ برای گرفتن، سریع به بالا بکش."}},
 blaster:{en:{primary:"TAP · FIRE",secondary:"SWIPE ↑ · GRAB",tip:"Aim using ⊕, then tap ATTACK to fire. Swipe up early to grab."},fa:{primary:"لمس · شلیک",secondary:"کشیدن ↑ · گرفتن",tip:"با ⊕ نشانه بگیر و لمس کن تا شلیک شود. کشیدن سریع به بالا برای گرفتن است."}},
 uzi:{en:{primary:"HOLD · AUTO FIRE",secondary:"SWIPE ↑ · GRAB",tip:"Hold ATTACK for automatic fire. A quick upward swipe grabs instead."},fa:{primary:"نگه‌دار · رگبار",secondary:"کشیدن ↑ · گرفتن",tip:"برای رگبار، حمله را نگه‌دار. کشیدن سریع به بالا برای گرفتن است."}},
 boomerang:{en:{primary:"TAP · THROW",secondary:"SWIPE ↑ · GRAB",tip:"Aim with ⊕ and tap ATTACK to throw the returning boomerang."},fa:{primary:"لمس · پرتاب",secondary:"کشیدن ↑ · گرفتن",tip:"با ⊕ نشانه بگیر و بومرنگ را با لمس پرتاب کن."}},
 bow:{en:{primary:"HOLD · DRAW",secondary:"RELEASE · SHOOT",tip:"Hold ATTACK to draw the bow; release to shoot. Aim using ⊕."},fa:{primary:"نگه‌دار · کشیدن زه",secondary:"رها کن · شلیک",tip:"حمله را نگه‌دار تا کمان شارژ شود؛ با رهاکردن شلیک می‌شود. با ⊕ نشانه بگیر."}},
 bomb:{en:{primary:"TAP · BOMB",secondary:"SWIPE ↑ · GRAB",tip:"Aim using ⊕ and tap ATTACK to throw a bomb."},fa:{primary:"لمس · بمب",secondary:"کشیدن ↑ · گرفتن",tip:"با ⊕ نشانه بگیر و با لمس حمله بمب پرتاب کن."}},
 missile:{en:{primary:"RELEASE · LAUNCH",secondary:"AIM · ⊕ PAD",tip:"Set the direction with ⊕. A tap launches on release, never on press."},fa:{primary:"رها کن · موشک",secondary:"نشانه‌گیری · ⊕",tip:"با ⊕ جهت موشک را تعیین کن. موشک فقط با رهاکردن حمله شلیک می‌شود."}},
 spear:{en:{primary:"TAP · SPEAR",secondary:"SWIPE ↑ · GRAB",tip:"Aim with ⊕ and tap ATTACK to throw a spear."},fa:{primary:"لمس · نیزه",secondary:"کشیدن ↑ · گرفتن",tip:"با ⊕ نشانه بگیر و با لمس حمله نیزه پرتاب کن."}},
 grapple:{en:{primary:"TAP · HOOK",secondary:"TAP AGAIN · RELEASE",tip:"Tap ATTACK to launch the hook; tap again to release an active rope."},fa:{primary:"لمس · قلاب",secondary:"لمس دوباره · رهاسازی",tip:"با لمس حمله قلاب را پرتاب کن؛ با لمس دوباره طناب فعال را آزاد کن."}},
 "gravity-gauntlet":{en:{primary:"TAP · PUNCH / HOLD · PULL",secondary:"SWIPE ↑ · PARRY / AIR ↓ · SLAM",tip:"Tap to punch, hold for Mag Pull, swipe up early to parry, or press ATTACK with ↓ in air to slam."},fa:{primary:"لمس · مشت / نگه‌دار · کشش",secondary:"کشیدن ↑ · دفع / هوا ↓ · کوبش",tip:"لمس: مشت؛ نگه‌داشتن: کشش؛ کشیدن سریع به بالا: دفع؛ پایین + حمله در هوا: کوبش."}}
};
export const touchActionGuide=(weapon:WeaponId,locale:Locale):TouchActionGuide=>GUIDE[weapon][locale];

/** Only presentation state; the simulation owns ability timing and eligibility. */
export type TouchAbilityHud={
 readonly bowCharge:number;
 readonly attackCooldown?:number;
 readonly gauntlet?:Readonly<{pullCooldown:number;parryCooldown:number;pulling:boolean;parrying:boolean;holdProgress?:number}>;
};
export type TouchActionStatus={label:string;phase:"ready"|"charging"|"active"|"cooldown";progress:number};
const clamp01=(n:number)=>Number.isFinite(n)?Math.max(0,Math.min(1,n)):0;
export function touchActionStatus(weapon:WeaponId,locale:Locale,hud:TouchAbilityHud):TouchActionStatus{
 const fa=locale==="fa",g=hud.gauntlet;
 if(weapon==="gravity-gauntlet"&&g){
  if(g.parrying)return{label:fa?"دفع فعال":"PARRY ACTIVE",phase:"active",progress:1};
  if(g.pulling)return{label:fa?"کشش فعال":"PULL ACTIVE",phase:"active",progress:1};
  if(g.holdProgress&&g.holdProgress>0&&g.pullCooldown<=0)return{label:fa?"شارژ کشش":"CHARGING PULL",phase:"charging",progress:clamp01(g.holdProgress)};
  const pull=g.pullCooldown>0?(fa?"کشش ":"PULL ")+g.pullCooldown.toFixed(1)+"s":fa?"کشش آماده":"PULL READY";
  const parry=g.parryCooldown>0?(fa?"دفع ":"PARRY ")+g.parryCooldown.toFixed(1)+"s":fa?"دفع آماده":"PARRY READY";
  return{label:pull+" · "+parry,phase:g.pullCooldown>0||g.parryCooldown>0?"cooldown":"ready",progress:0};
 }
 if(weapon==="bow"&&hud.bowCharge>0)return{label:fa?"شارژ کمان":"BOW DRAW",phase:"charging",progress:clamp01(hud.bowCharge)};
 const cooldown=hud.attackCooldown??0;
 if(cooldown>0.05)return{label:(fa?"آماده‌سازی ":"COOLDOWN ")+cooldown.toFixed(1)+"s",phase:"cooldown",progress:0};
 return{label:fa?"آماده":"READY",phase:"ready",progress:0};
}

export const WEAPON_TIP_STORAGE_KEY="doodlegame.weaponTips.v1";
/** Device-local, fail-open completion flags. Unknown/invalid saved data is ignored. */
export class WeaponTipTracker{
 private learned=new Set<WeaponId>();
 constructor(private readonly storage?:Storage){
  try{
   const raw=storage?.get<unknown>(WEAPON_TIP_STORAGE_KEY);
   if(Array.isArray(raw))for(const id of raw){
    if(typeof id==="string"&&Object.prototype.hasOwnProperty.call(GUIDE,id))this.learned.add(id as WeaponId);
   }
  }catch{/* Storage may be unavailable. */}
 }
 isLearned(id:WeaponId){return this.learned.has(id);}
 markLearned(id:WeaponId){if(this.learned.has(id))return;this.learned.add(id);this.persist();}
 replay(){this.learned.clear();try{this.storage?.remove(WEAPON_TIP_STORAGE_KEY);}catch{/* Optional storage. */}}
 private persist(){try{this.storage?.set(WEAPON_TIP_STORAGE_KEY,[...this.learned]);}catch{/* Optional storage. */}}
}

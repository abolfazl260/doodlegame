import type {Storage} from "../storage/Storage";
export type TutorialStep="move"|"jump"|"attack"|"double"|"grab"|"kick"|"ready";
export type TutorialSignals={move:number;jump:number;attack:number;double:number;grab:number;kick:number;grounded:boolean;doubleAvailable:boolean;near:boolean;safe:boolean};
export const ONBOARDING_KEY="doodlegame.mobileOnboarding.v1";
/** Action counters come from accepted gameplay, never pointer motion or time. */
export class MobileOnboarding{
 status:"eligible"|"active"|"completed"|"skipped"|"dismissed"="eligible";
 step:TutorialStep="move";
 private baseline:TutorialSignals|null=null;
 private learned=new Set<TutorialStep>();
 private coreDone=false;
 constructor(private storage?:Storage){try{const saved=storage?.get<string>(ONBOARDING_KEY);if(saved==="completed"||saved==="skipped")this.status=saved;}catch{/* Storage may be blocked. */}}
 private save(value:"completed"|"skipped"){try{this.storage?.set(ONBOARDING_KEY,value);}catch{/* Keep session usable. */}}
 replay(){this.status="eligible";this.step="move";this.baseline=null;this.coreDone=false;this.learned.clear();try{this.storage?.remove(ONBOARDING_KEY);}catch{}}
 isCoreComplete(){return this.coreDone||this.status==="completed";}
 skip(){this.status="skipped";this.save("skipped");}
 dismiss(){if(this.status==="active")this.status=this.coreDone?"completed":"dismissed";this.baseline=null;}
 update(s:TutorialSignals,eligible:boolean,missile:boolean):TutorialStep|null{
  if(!eligible){return null;}
  if(this.status==="eligible"||this.status==="dismissed"){this.status="active";this.baseline={...s};}
  if(this.status!=="active")return null;
  const b=this.baseline!;
  if(!this.coreDone){
   const done=this.step==="move"?s.move-b.move>=.8:this.step==="jump"?s.jump>b.jump:s.attack>b.attack;
   if(done){this.step=this.step==="move"?"jump":this.step==="jump"?"attack":"ready";this.baseline={...s};if(this.step==="ready"){this.coreDone=true;this.save("completed");}return this.step;}
  }else{
   for(const id of ["double","grab","kick"] as const)if(s[id]>b[id])this.learned.add(id);
   const next=!this.learned.has("double")&&!s.grounded&&s.doubleAvailable?"double":
    !missile&&!this.learned.has("grab")&&s.near?"grab":!missile&&!this.learned.has("kick")&&s.grounded&&s.near?"kick":null;
   if(!next){this.step="ready";return null;}this.step=next;
  }
  return s.safe?this.step:null;
 }
}

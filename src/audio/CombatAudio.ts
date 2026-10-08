import type {CombatCue} from "../gameplay/CombatFeedback";

/** Small synthesized cues; WebAudio is unlocked only by a user's pointer/keyboard gesture. */
export class CombatAudio{
 private context:AudioContext|null=null;
 private muted=false;
 private lastCueId=0;
 private lastPlayTime=-1;
 private readonly unlock=()=>{
  if(this.muted||this.context||typeof window==="undefined")return;
  const Ctor=window.AudioContext||(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
  if(!Ctor)return;
  try{this.context=new Ctor();void this.context.resume().catch(()=>{});}catch{this.context=null;}
 };
 constructor(){
  if(typeof document!=="undefined"){
   document.addEventListener("pointerdown",this.unlock,{passive:true});
   document.addEventListener("keydown",this.unlock);
  }
 }
 setMuted(value:boolean){this.muted=value;if(!value)this.unlock();}
 render(cues:readonly CombatCue[]){
  for(const cue of cues){
   if(cue.id<=this.lastCueId)continue;
   this.lastCueId=cue.id;
   if(!this.muted&&cue.age<.1)this.play(cue);
  }
 }
 private play(cue:CombatCue){
  const ctx=this.context;
  if(!ctx||ctx.state!=="running"||ctx.currentTime-this.lastPlayTime<.045)return;
  this.lastPlayTime=ctx.currentTime;
  const explosion=cue.kind==="explosion",heavy=cue.weapon==="hammer"||cue.weapon==="missile"||cue.weapon==="bomb";
  const base=cue.kind==="attack"?(heavy?115:260):cue.kind==="deflect"?700:cue.kind==="block"?450:cue.kind==="defeat"?140:explosion?70:heavy?105:320;
  const duration=explosion?.22:cue.kind==="defeat"?.26:cue.kind==="attack"?.065:.11;
  try{
   const oscillator=ctx.createOscillator(),gain=ctx.createGain(),time=ctx.currentTime;
   oscillator.type=explosion?"sawtooth":cue.kind==="deflect"?"sine":"triangle";
   oscillator.frequency.setValueAtTime(base,time);
   oscillator.frequency.exponentialRampToValueAtTime(Math.max(32,base*(explosion?.35:cue.kind==="deflect"?1.5:.55)),time+duration);
   const volume=(explosion?.12:cue.kind==="attack"?.045:.085)*Math.min(1.5,cue.intensity);
   gain.gain.setValueAtTime(Math.max(.0001,volume),time);
   gain.gain.exponentialRampToValueAtTime(.0001,time+duration);
   oscillator.connect(gain);gain.connect(ctx.destination);
   oscillator.start(time);oscillator.stop(time+duration+.01);
   oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }catch{/* Unsupported/paused audio must never interrupt the game. */}
 }
 dispose(){
  if(typeof document!=="undefined"){document.removeEventListener("pointerdown",this.unlock);document.removeEventListener("keydown",this.unlock);}
  if(this.context){void this.context.close().catch(()=>{});this.context=null;}
 }
}

import type {CombatCue} from "../gameplay/CombatFeedback";

/** Small synthesized cues; WebAudio is unlocked only by a user's pointer/keyboard gesture. */
export class CombatAudio{
 private context:AudioContext|null=null;
 private muted=false;
 private disposed=false;
 private lastCueId=0;
 private lastPlayTime=-1;
 private ambientWanted=false;
 private ambientGain:GainNode|null=null;
 private ambientOscillators:OscillatorNode[]=[];
 private ambientFilter:BiquadFilterNode|null=null;
 private readonly handleVisibility=()=>{
  if(typeof document==="undefined")return;
  if(document.hidden)this.stopAmbient();
  else if(this.ambientWanted)this.unlock();
 };
 /** A very quiet, synthesized two-chord space drone for the floating menu.
  * Audio remains locked until a real user gesture and never runs in combat. */
 setAmbientActive(active:boolean){
  if(this.disposed)return;
  this.ambientWanted=active;
  if(active)this.startAmbient();
  else this.stopAmbient();
 }
 private startAmbient(){
  const ctx=this.context;
  if(!this.ambientWanted||this.muted||this.disposed||this.ambientGain||
   !ctx||ctx.state!=="running"||typeof document!=="undefined"&&document.hidden)return;
  try{
   const gain=ctx.createGain();
   const filter=ctx.createBiquadFilter();
   filter.type="lowpass";filter.frequency.value=640;filter.Q.value=.2;
   gain.gain.setValueAtTime(0,ctx.currentTime);
   gain.gain.setTargetAtTime(.015,ctx.currentTime,.9);
   filter.connect(gain);gain.connect(ctx.destination);
   const notes=[110,164.81,220,293.66];
   const oscillators:OscillatorNode[]=[];
   for(let i=0;i<notes.length;i++){
    const oscillator=ctx.createOscillator(),voice=ctx.createGain();
    oscillator.type="sine";
    oscillator.frequency.value=notes[i];
    voice.gain.value=[.32,.16,.10,.06][i];
    oscillator.connect(voice);voice.connect(filter);
    oscillator.start();
    oscillators.push(oscillator);
   }
   this.ambientGain=gain;this.ambientFilter=filter;
   this.ambientOscillators=oscillators;
  }catch{this.stopAmbient();}
 }
 private stopAmbient(){
  if(!this.ambientGain&&!this.ambientOscillators.length)return;
  const ctx=this.context,gain=this.ambientGain,oscillators=this.ambientOscillators;
  this.ambientGain=null;this.ambientFilter=null;this.ambientOscillators=[];
  try{
   const now=ctx?.currentTime??0;
   if(gain){
    gain.gain.cancelScheduledValues(now);
    gain.gain.setTargetAtTime(0,now,.12);
   }
   for(const oscillator of oscillators)oscillator.stop(now+.6);
   // Nodes disconnect automatically when their context is disposed.
  }catch{
   for(const oscillator of oscillators)try{oscillator.stop();}catch{/* already stopped */}
  }
 }
 private readonly unlock=(event?:Event)=>{
  if(this.muted||this.disposed||typeof window==="undefined")return;
  // Key auto-repeat is not a new user gesture. Retry on subsequent real
  // interactions even if an earlier resume() promise has not settled.
  if(event?.type==="keydown"&&(event as KeyboardEvent).repeat)return;
  let context=this.context;
  if(!context||context.state==="closed"){
   const Ctor=window.AudioContext||(window as Window & {webkitAudioContext?:typeof AudioContext}).webkitAudioContext;
   if(!Ctor)return;
   try{
    context=new Ctor();
    this.context=context;
    // A replacement context starts its clock from zero.
    this.lastPlayTime=-1;
   }catch{return;}
  }
  if(context.state==="running"){this.startAmbient();return;}
  try{
   // A suspended/interrupted context must be resumed by another user gesture.
   // Some browsers leave resume promises pending until audio is permitted,
   // so do not permanently block later attempts.
   void context.resume().then(()=>this.startAmbient()).catch(()=>{});
  }catch{/* Audio availability must not interrupt gameplay. */}
 };
 constructor(){
  if(typeof document!=="undefined"){
   document.addEventListener("pointerdown",this.unlock,{passive:true});
   document.addEventListener("keydown",this.unlock);
   document.addEventListener("visibilitychange",this.handleVisibility);
  }
 }
 setMuted(value:boolean){
  this.muted=value;
  if(value)this.stopAmbient();
  else{this.unlock();this.startAmbient();}
 }
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
  if(this.disposed)return;
  this.disposed=true;
  this.stopAmbient();
  if(typeof document!=="undefined"){
   document.removeEventListener("pointerdown",this.unlock);
   document.removeEventListener("keydown",this.unlock);
   document.removeEventListener("visibilitychange",this.handleVisibility);
  }
  if(this.context){void this.context.close().catch(()=>{});this.context=null;}
 }
}

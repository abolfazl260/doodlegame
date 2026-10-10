import test from "node:test";
import assert from "node:assert/strict";
import {CombatAudio} from "../.test-build/audio/CombatAudio.js";

class FakeAudioContext {
 static instances=[];
 state="suspended";
 currentTime=1;
 destination={};
 ambientStops=0;
 ambientDisconnects=0;
 resumeCalls=0;
 closeCalls=0;
 oscillatorStarts=0;
 rejectResume=false;
 stallResume=false;
 constructor(){FakeAudioContext.instances.push(this);}
 resume(){
  this.resumeCalls++;
  if(this.rejectResume){
   this.rejectResume=false;
   return Promise.reject(new Error("audio temporarily blocked"));
  }
  if(this.stallResume)return new Promise(()=>{});
  this.state="running";
  return Promise.resolve();
 }
 close(){this.closeCalls++;this.state="closed";return Promise.resolve();}
 createBiquadFilter(){return {type:"lowpass",frequency:{value:0},Q:{value:0},connect(){},disconnect(){}};}
 createOscillator(){
  return {
   type:"triangle",
   frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},
   connect(){},disconnect(){},stop:()=>{this.ambientStops++;},
   start:()=>{this.oscillatorStarts++;}
  };
 }
 createGain(){
  return {
   gain:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){},setTargetAtTime(){},cancelScheduledValues(){}},
   connect(){},disconnect(){}
  };
 }
}

async function withAudio(run,legacy=false){
 const originalDocument=globalThis.document;
 const originalWindow=globalThis.window;
 const events=new EventTarget();
 FakeAudioContext.instances=[];
 globalThis.document=events;
 globalThis.window=legacy?{webkitAudioContext:FakeAudioContext}:{AudioContext:FakeAudioContext};
 const audio=new CombatAudio();
 try{
  return await run({audio,events,instances:FakeAudioContext.instances});
 }finally{
  audio.dispose();
  if(originalDocument===undefined)delete globalThis.document;
  else globalThis.document=originalDocument;
  if(originalWindow===undefined)delete globalThis.window;
  else globalThis.window=originalWindow;
 }
}

const pointer=(events)=>events.dispatchEvent(new Event("pointerdown"));
const key=(events,repeat=false)=>{
 const event=new Event("keydown");
 Object.defineProperty(event,"repeat",{value:repeat});
 events.dispatchEvent(event);
};
const cue=(id)=>({id,kind:"attack",weapon:"blade",age:0,life:.2,intensity:1});

test("first pointer gesture unlocks audio, repeated gestures reuse a running context",async()=>{
 await withAudio(({events,instances})=>{
  assert.equal(instances.length,0,"audio must not start before a user gesture");
  pointer(events);
  assert.equal(instances.length,1);
  const ctx=instances[0];
  assert.equal(ctx.resumeCalls,1);
  assert.equal(ctx.state,"running");
  pointer(events);
  key(events);
  assert.equal(instances.length,1);
  assert.equal(ctx.resumeCalls,1);
 });
});

test("a previously constructed context resumes after background suspension",async()=>{
 await withAudio(({audio,events,instances})=>{
  pointer(events);
  const ctx=instances[0];
  audio.render([cue(1)]);
  assert.equal(ctx.oscillatorStarts,1);
  ctx.state="suspended";
  ctx.currentTime=3;
  audio.render([cue(1),cue(2)]); // stale cues must not queue for replay
  assert.equal(ctx.oscillatorStarts,1);
  key(events);
  assert.equal(instances.length,1);
  assert.equal(ctx.resumeCalls,2);
  assert.equal(ctx.state,"running");
  audio.render([cue(1),cue(2),cue(3)]);
  assert.equal(ctx.oscillatorStarts,2,"new cues play again after resuming");
  key(events,true); // auto-repeat is not a fresh gesture
  assert.equal(ctx.resumeCalls,2);
 });
});

test("interrupted contexts are also resumed on the next gesture",async()=>{
 await withAudio(({events,instances})=>{
  key(events);
  const ctx=instances[0];
  ctx.state="interrupted";
  pointer(events);
  assert.equal(ctx.resumeCalls,2);
  assert.equal(ctx.state,"running");
 });
});

test("rejected or unsettled resume attempts do not permanently block retries",async()=>{
 await withAudio(async({events,instances})=>{
  pointer(events);
  const ctx=instances[0];
  ctx.state="suspended";
  ctx.rejectResume=true;
  key(events);
  await Promise.resolve();
  assert.equal(ctx.resumeCalls,2);
  assert.equal(ctx.state,"suspended");
  ctx.stallResume=true;
  pointer(events);
  assert.equal(ctx.resumeCalls,3);
  pointer(events);
  assert.equal(ctx.resumeCalls,4,"another gesture may retry even if a prior promise has not settled");
  ctx.stallResume=false;
  key(events);
  assert.equal(ctx.resumeCalls,5);
  assert.equal(ctx.state,"running");
 });
});

test("muted audio does not unlock or resume until enabled again",async()=>{
 await withAudio(({audio,events,instances})=>{
  audio.setMuted(true);
  pointer(events);
  key(events);
  assert.equal(instances.length,0);
  audio.setMuted(false);
  assert.equal(instances.length,1);
  const ctx=instances[0];
  assert.equal(ctx.resumeCalls,1);
  ctx.state="suspended";
  audio.setMuted(true);
  pointer(events);
  assert.equal(ctx.resumeCalls,1);
  audio.setMuted(false);
  assert.equal(ctx.resumeCalls,2);
 });
});

test("a closed context is replaced and the playback throttle resets with its clock",async()=>{
 await withAudio(({audio,events,instances})=>{
  pointer(events);
  const first=instances[0];
  first.currentTime=120;
  audio.render([cue(1)]);
  assert.equal(first.oscillatorStarts,1);
  first.state="closed";
  key(events);
  assert.equal(instances.length,2);
  assert.notEqual(instances[1],first);
  assert.equal(instances[1].resumeCalls,1);
  audio.render([cue(1),cue(2)]);
  assert.equal(instances[1].oscillatorStarts,1);
 });
});

test("WebKit AudioContext is supported and dispose removes listeners idempotently",async()=>{
 await withAudio(({audio,events,instances})=>{
  pointer(events);
  assert.equal(instances.length,1);
  const ctx=instances[0];
  audio.dispose();
  audio.dispose();
  assert.equal(ctx.closeCalls,1);
  pointer(events);
  key(events);
  audio.setMuted(false);
  assert.equal(instances.length,1,"disposed audio cannot recreate a context");
 },true);
});

test("quiet space ambience starts after permission gesture, stops in gameplay, and respects mute",async()=>{
 await withAudio(async({audio,events,instances})=>{
  audio.setAmbientActive(true);
  assert.equal(instances.length,0,"no audio before user interaction");
  pointer(events);
  await Promise.resolve();
  const ctx=instances[0];
  assert.equal(ctx.oscillatorStarts,4,"space music uses four quiet synthesized voices");
  pointer(events);
  assert.equal(ctx.oscillatorStarts,4,"repeated touches do not duplicate ambient music");
  audio.setAmbientActive(false);
  assert.equal(ctx.ambientStops,4,"all menu voices must stop during combat");
  audio.setAmbientActive(true);
  assert.equal(ctx.oscillatorStarts,8,"menu restoration starts a fresh quiet pad");
  audio.setMuted(true);
  assert.equal(ctx.ambientStops,8,"sound toggle stops ambience");
  audio.setAmbientActive(true);
  pointer(events);
  assert.equal(ctx.oscillatorStarts,8,"muted menu must remain silent");
  audio.setMuted(false);
  await Promise.resolve();
  assert.equal(ctx.oscillatorStarts,12,"unmuting resumes the menu sound");
  audio.dispose();
  assert.equal(ctx.ambientStops,12,"app cleanup stops the soundtrack");
 });
});

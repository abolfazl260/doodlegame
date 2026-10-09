import test from "node:test";
import assert from "node:assert/strict";
import {WebInput} from "../.test-build/platform/web/WebInput.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

class FakeCanvas extends EventTarget {
 captured=new Set();
 getBoundingClientRect(){return {left:0,top:0,width:640,height:360};}
 setPointerCapture(id){this.captured.add(id);}
 hasPointerCapture(id){return this.captured.has(id);}
 releasePointerCapture(id){
  if(!this.captured.delete(id))return;
  this.emit("lostpointercapture",{pointerId:id});
 }
 emit(type,properties={}){
  const event=new Event(type,{cancelable:true});
  Object.assign(event,{pointerId:1,pointerType:"mouse",button:0,clientX:80,clientY:60,...properties});
  this.dispatchEvent(event);
  return event;
 }
 loseCapture(id){this.releasePointerCapture(id);}
}

function withInput(run){
 const previousWindow=globalThis.window;
 const fakeWindow=new EventTarget();
 globalThis.window=fakeWindow;
 const canvas=new FakeCanvas();
 const input=new WebInput(canvas);
 input.start();
 try{return run({canvas,input,fakeWindow});}
 finally{
  input.dispose();
  if(previousWindow===undefined)delete globalThis.window;
  else globalThis.window=previousWindow;
 }
}

test("primary mouse press captures the pointer and release outside the canvas ends attack",()=>{
 withInput(({canvas,input})=>{
  canvas.emit("pointerdown",{pointerId:7});
  assert.equal(canvas.hasPointerCapture(7),true);
  assert.equal(input.getState().pointerDown,true);
  assert.equal(input.getState().attackHeld,true);
  input.endFrame();
  // A captured pointer is routed back to the canvas even when released outside.
  canvas.emit("pointerup",{pointerId:7,clientX:900,clientY:600});
  assert.equal(canvas.hasPointerCapture(7),false);
  assert.equal(input.getState().pointerDown,false);
  assert.equal(input.getState().attackHeld,false);
  assert.equal(input.getState().pointerReleased,true);
  assert.equal(input.getState().attackCancelled,false);
 });
});

test("pointercancel and lost capture cancel attacks without generating a release",()=>{
 withInput(({canvas,input})=>{
  canvas.emit("pointerdown",{pointerId:31});
  canvas.emit("pointercancel",{pointerId:31});
  assert.equal(input.getState().pointerDown,false);
  assert.equal(input.getState().attackHeld,false);
  assert.equal(input.getState().attackPressed,false);
  assert.equal(input.getState().pointerReleased,false);
  assert.equal(input.getState().attackCancelled,true);
  assert.equal(canvas.hasPointerCapture(31),false);

  input.endFrame();
  canvas.emit("pointerdown",{pointerId:32});
  input.endFrame();
  canvas.loseCapture(32);
  assert.equal(input.getState().pointerDown,false);
  assert.equal(input.getState().attackHeld,false);
  assert.equal(input.getState().attackCancelled,true);
  canvas.emit("pointerdown",{pointerId:33});
  assert.equal(canvas.hasPointerCapture(33),true,"cancellation permits a new primary press");
 });
});

test("touch, secondary buttons, and unrelated pointers cannot clear an active mouse attack",()=>{
 withInput(({canvas,input})=>{
  canvas.emit("pointerdown",{pointerId:2,pointerType:"touch"});
  canvas.emit("pointerdown",{pointerId:3,button:2});
  assert.equal(input.getState().pointerDown,false);
  assert.equal(input.getState().attackPressed,false);
  canvas.emit("pointerdown",{pointerId:5});
  canvas.emit("pointerdown",{pointerId:6});
  canvas.emit("pointerup",{pointerId:6});
  canvas.emit("pointercancel",{pointerId:2,pointerType:"touch"});
  assert.equal(input.getState().pointerDown,true);
  assert.equal(input.getState().attackHeld,true);
  assert.equal(canvas.hasPointerCapture(5),true);
  assert.equal(canvas.hasPointerCapture(6),false);
  canvas.emit("pointerup",{pointerId:5});
  assert.equal(input.getState().pointerDown,false);
 });
});

test("blur and stop release owned capture and leave input ready to restart",()=>{
 withInput(({canvas,input,fakeWindow})=>{
  canvas.emit("pointerdown",{pointerId:9});
  fakeWindow.dispatchEvent(new Event("blur"));
  assert.equal(canvas.hasPointerCapture(9),false);
  assert.equal(input.getState().attackHeld,false);
  assert.equal(input.getState().pointerDown,false);
  canvas.emit("pointerdown",{pointerId:10});
  input.stop();
  assert.equal(canvas.hasPointerCapture(10),false);
  assert.equal(input.getState().attackHeld,false);
  input.start();
  canvas.emit("pointerdown",{pointerId:11});
  assert.equal(canvas.hasPointerCapture(11),true);
 });
});

test("cancelled click does not fire UZI, and canceling charged bow does not release an arrow",()=>{
 withInput(({canvas,input})=>{
  const game=new GameSession(input);
  try{
   game.selectWeaponById("uzi");
   canvas.emit("pointerdown",{pointerId:41});
   canvas.emit("pointercancel",{pointerId:41});
   game.update(1/60);
   assert.equal(game.getRenderState().projectiles.length,0);

   game.selectWeaponById("bow");
   canvas.emit("pointerdown",{pointerId:42});
   game.update(1/60);
   assert.ok(game.getHudState().bowCharge>0);
   canvas.emit("pointercancel",{pointerId:42});
   game.update(1/60);
   assert.equal(game.getRenderState().projectiles.length,0);
   assert.equal(game.getHudState().bowCharge,0);

   // A genuine release still fires the bow after a cancellation.
   canvas.emit("pointerdown",{pointerId:43});
   game.update(1/60);
   canvas.emit("pointerup",{pointerId:43});
   game.update(1/60);
   assert.equal(game.getRenderState().projectiles.length,1);
  }finally{game.dispose();}
 });
});

test("mouse cancellation does not clear a separately held keyboard or mobile attack",()=>{
 withInput(({canvas,input,fakeWindow})=>{
  const key=new Event("keydown",{cancelable:true});
  Object.assign(key,{code:"KeyZ"});
  fakeWindow.dispatchEvent(key);
  canvas.emit("pointerdown",{pointerId:51});
  canvas.emit("pointercancel",{pointerId:51});
  assert.equal(input.getState().attackHeld,true);
  assert.equal(input.getState().attackCancelled,false);
  input.touchAttack(true);
  const up=new Event("keyup");
  Object.assign(up,{code:"KeyZ"});
  fakeWindow.dispatchEvent(up);
  assert.equal(input.getState().attackHeld,true);
  input.touchAttackRelease();
  assert.equal(input.getState().attackHeld,false);
 });
});

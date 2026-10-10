import test from "node:test";
import assert from "node:assert/strict";
import {WebInput} from "../.test-build/platform/web/WebInput.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {GRAB,grabGesture,isGrabTarget} from "../.test-build/gameplay/GrabCombat.js";

const setup=(pvp=true)=>{
 const input=new WebInput({});
 const session=new GameSession(input);
 if(pvp)session.setMode("local-pvp");
 const a=session.player,t=session.opponent;
 a.x=-.46;t.x=.46;a.y=t.y=1.15;
 a.facing=1;t.facing=-1;a.velocityX=t.velocityX=0;
 return {input,session,a,t};
};
const tick=(s,n=1)=>{for(let i=0;i<n;i++)s.update(1/60);};
const press=(input,code)=>input.keyDown({code,preventDefault(){}});
const release=(input,code)=>input.keyUp({code,preventDefault(){}});

test("up swipe is bounded and does not treat taps or missile diagonal aiming as a grab",()=>{
 assert.equal(grabGesture(100,150,110,80,120),true);
 assert.equal(grabGesture(100,150,100,125,110),false);
 assert.equal(grabGesture(100,150,165,85,100),false);
 assert.equal(grabGesture(100,150,100,70,600),false);
});
test("facing, elevation, boss immunity, and tank reach are explicit",()=>{
 const {session,a,t}=setup();
 assert.equal(isGrabTarget(a,t,true),true);
 a.facing=-1;assert.equal(isGrabTarget(a,t,true),false);a.facing=1;
 t.y+=GRAB.maxElevation+.01;assert.equal(isGrabTarget(a,t,true),false);t.y=a.y;
 t.enemyType="boss";assert.equal(isGrabTarget(a,t,true),false);
 t.enemyType="tank";t.x=a.x+GRAB.tankReach+.01;assert.equal(isGrabTarget(a,t,true),false);
 session.dispose();
});
test("a nearby PvP victim is held, visibly wound up, released once, and becomes immune",()=>{
 const {session,input,a,t}=setup();
 const hp=t.health;
 press(input,"KeyC");
 tick(session,8);
 assert.ok(a.grabPhase==="hold"||a.grabPhase==="windup");
 assert.equal(t.grabPhase,"held");
 assert.ok(Math.abs(t.x-a.x-a.facing*GRAB.anchorDistance)<.1);
 assert.equal(t.health,hp);
 tick(session,28);
 assert.equal(t.grabPhase,null);
 assert.ok(t.velocityX>5);
 assert.ok(t.velocityY>1);
 assert.equal(hp-t.health,GRAB.damage);
 assert.ok(t.grabImmunity>0);
 assert.ok(session.getRenderState().combatCues.some(c=>c.kind==="throw"));
 tick(session,15);
 assert.equal(t.health,hp-GRAB.damage,"throw damage is never duplicated");
 release(input,"KeyC");session.dispose();
});
test("out-of-range grab misses without altering victim coordinates or HP",()=>{
 const {session,input,a,t}=setup();
 t.x=5;
 const origin=t.x,hp=t.health;
 press(input,"KeyC");tick(session,9);
 assert.equal(a.grabPhase,"recovery");
 assert.equal(t.grabPhase,null);
 assert.equal(t.x,origin);
 assert.equal(t.health,hp);
 session.dispose();
});
test("a solid wall between two fighters prevents attachment even in nominal range",()=>{
 const {session,input,a,t}=setup();
 session.environment.push({kind:"wall",active:true,x:0,y:1.5,width:.12,height:2,hp:10,maxHp:10,rotation:0,pulse:0,warning:0,falling:false,vx:0,vy:0,grounded:true,cooldown:0,timer:0});
 press(input,"KeyC");tick(session,8);
 assert.notEqual(t.grabPhase,"held");
 assert.equal(a.grabPhase,"recovery");
 session.dispose();
});
test("opponent grab is independent of first player ATTACK input",()=>{
 const {session,input,a,t}=setup();
 press(input,"Numpad1");
 assert.equal(input.getPlayer2State().grabPressed,true);
 assert.equal(input.getState().attackPressed,false);
 assert.equal(input.getPlayer2State().attackPressed,false);
 tick(session,1);
 assert.equal(t.grabPhase,"attempt");
 assert.equal(a.grabPhase,null);
 release(input,"Numpad1");session.dispose();
});
test("damage, pause, reset and death release held targets without permanent physics locks",()=>{
 for(const mode of ["hit","pause","reset","death"]){
  const {session,input,a,t}=setup();
  input.triggerTouchGrab();tick(session,8);
  assert.equal(t.grabPhase,"held",mode);
  if(mode==="hit")session.damage(a,5,0);
  if(mode==="pause")session.cancelTransientActions();
  if(mode==="reset")session.reset(false);
  if(mode==="death"){a.health=0;tick(session);}
  assert.notEqual(session.player.grabPhase,"hold",mode);
  assert.notEqual(session.opponent.grabPhase,"held",mode);
  session.dispose();
 }
});
test("the victim cannot start a new grab while held or directly chain after throw",()=>{
 const {session,input,a,t}=setup();
 input.triggerTouchGrab();tick(session,8);
 input.triggerTouchGrab(2);tick(session);
 assert.equal(t.grabPhase,"held");
 tick(session,28);
 assert.ok(t.grabImmunity>0);
 a.grabPhase=null;a.grabCooldown=0;
 input.triggerTouchGrab();tick(session,8);
 assert.notEqual(t.grabPhase,"held","recent throw has a re-grab immunity window");
 session.dispose();
});

import test from "node:test";
import assert from "node:assert/strict";
import {GameSession} from "../.test-build/gameplay/GameSession.js";

function setup(){
 const input={
  state:{moveX:0,moveY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,
   pointerX:0,pointerY:0,attackPressed:false,attackHeld:false,attackCancelled:false,
   jumpPressed:false,dashPressed:false,weaponNextPressed:false,weaponPreviousPressed:false},
  getState(){return this.state;},
  endFrame(){
   this.state.attackPressed=false;
   this.state.pointerPressed=false;
   this.state.pointerReleased=false;
   this.state.attackCancelled=false;
   this.state.jumpPressed=false;
   this.state.dashPressed=false;
   this.state.weaponNextPressed=false;
   this.state.weaponPreviousPressed=false;
  }
 };
 const session=new GameSession(input);
 session.setStartingWeapon("bow");
 return{input,session};
}
function charge(input,session,frames=12){
 input.state.attackPressed=true;
 input.state.attackHeld=true;
 for(let i=0;i<frames;i++)session.update(1/60);
 assert.ok(session.getHudState().bowCharge>0);
}
function arrows(session){return session.getRenderState().projectiles.filter(p=>p.weapon==="bow").length;}

test("Bow cancellation is independent of attackCancelled input and does not spawn an arrow",()=>{
 const {input,session}=setup();
 charge(input,session);
 const before=session.getHudState();
 const oldCooldown=session.player.cooldown;
 session.cancelTransientActions();
 assert.equal(session.getHudState().bowCharge,0);
 assert.equal(session.player.bowCharging,false);
 assert.equal(session.player.attackTime,0);
 assert.equal(session.player.cooldown,oldCooldown);
 assert.equal(arrows(session),0);
 // Simulates stale held input being cleared without an attackCancelled event.
 input.state.attackHeld=false;
 input.state.attackCancelled=false;
 session.update(1/60);
 assert.equal(arrows(session),0);
 assert.equal(session.player.cooldown,0);
 assert.equal(session.getHudState().playerHealth,before.playerHealth);
 assert.equal(session.getHudState().opponentHealth,before.opponentHealth);
});
test("Bow hold and real release still fires one projectile and starts cooldown",()=>{
 const {input,session}=setup();
 charge(input,session);
 assert.equal(arrows(session),0);
 input.state.attackHeld=false;
 session.update(1/60);
 assert.equal(arrows(session),1);
 assert.ok(session.player.cooldown>0);
 assert.equal(session.getHudState().bowCharge,0);
 assert.equal(session.player.bowCharging,false);
 // Cancelling after a genuine release must not retroactively erase a shot.
 const cooldown=session.player.cooldown;
 session.cancelTransientActions();
 assert.equal(arrows(session),1);
 assert.equal(session.player.cooldown,cooldown);
});
test("touch cancellation and rapid resets discard Bow charge without affecting subsequent attacks",()=>{
 const {input,session}=setup();
 charge(input,session);
 session.cancelTouchAttack();
 input.state.attackHeld=false;
 session.update(1/60);
 assert.equal(arrows(session),0);
 charge(input,session);
 session.reset(false);
 input.state.attackHeld=false;input.state.attackPressed=false;
 session.update(1/60);
 assert.equal(arrows(session),0);
 assert.equal(session.getHudState().bowCharge,0);
 charge(input,session);
 input.state.attackHeld=false;
 session.update(1/60);
 assert.equal(arrows(session),1);
});

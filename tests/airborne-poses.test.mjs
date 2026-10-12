import test from "node:test";
import assert from "node:assert/strict";
import {GameSession,DOUBLE_JUMP_POSE_DURATION,WALL_JUMP_POSE_DURATION} from "../.test-build/gameplay/GameSession.js";
import {airbornePose,fighterVisual} from "../.test-build/rendering/FighterVisual.js";

function setup(){
 const idle=()=>({moveX:0,moveY:0,jumpPressed:false,dashPressed:false,attackPressed:false,attackHeld:false,grabPressed:false,weaponNextPressed:false,weaponPreviousPressed:false});
 const input={state:idle(),second:idle(),getState(){return this.state},getPlayer2State(){return this.second},endFrame(){
  for(const v of [this.state,this.second])for(const key of ["jumpPressed","dashPressed","attackPressed","grabPressed","weaponNextPressed","weaponPreviousPressed"])v[key]=false;
 },setLocalPvPEnabled(){}};
 return {input,session:new GameSession(input)};
}
const step=(session,n=1)=>{for(let i=0;i<n;i++)session.update(1/60)};
const view=session=>session.getRenderState().player;

test("normal launch, apex, descending fall, landing and reset preserve jump physics",()=>{
 const {input,session}=setup();
 assert.equal(view(session).jumpStage,0);
 assert.equal(airbornePose(view(session)).phase,"grounded");
 input.state.jumpPressed=true;step(session);
 const launch=view(session);
 assert.equal(launch.jumpStage,1);
 assert.equal(launch.doubleJumpPoseTime,0);
 assert.equal(airbornePose(launch).phase,"rise");
 assert.ok(Math.abs(launch.velocityY-(9.2-22/60))<.001,"ordinary jump retains original launch and gravity");
 let apex=false,fall=false,landed=false;
 for(let i=0;i<120;i++){
  step(session);
  const s=view(session),p=airbornePose(s);
  if(p.phase==="apex")apex=true;
  if(p.phase==="fall"){
   fall=true;
   assert.ok(s.velocityY<0);
   const spread=fighterVisual(s).joints[4][1][0];
   assert.ok(spread>0.3,"falling fighter extends a leg outward");
  }
  if(s.grounded){landed=true;assert.equal(s.jumpStage,0);assert.equal(s.doubleJumpPoseTime,0);break;}
 }
 assert.ok(apex,"rising motion passes through a readable apex");
 assert.ok(fall,"descending motion has a separate falling pose");
 assert.ok(landed,"original collision physics still lands fighter");
 step(session,25);
 assert.equal(airbornePose(view(session)).phase,"grounded");
 assert.equal(view(session).landingTime,0);
 session.reset(false);
 assert.equal(view(session).jumpStage,0);
});

test("double jump tucks legs and rotates briefly without adding another jump",()=>{
 const {input,session}=setup();
 input.state.jumpPressed=true;step(session);
 const base=view(session);
 const normalPose=fighterVisual(base);
 input.state.jumpPressed=true;step(session);
 const raised=view(session);
 assert.equal(raised.jumpStage,2);
 assert.equal(session.player.doubleJumpAvailable,false);
 assert.ok(Math.abs(raised.velocityY-(9.2*.92-22/60))<.001,"second jump keeps its 0.92 velocity multiplier");
 assert.ok(raised.doubleJumpPoseTime>0&&raised.doubleJumpPoseTime<DOUBLE_JUMP_POSE_DURATION);
 assert.equal(airbornePose(raised).phase,"double");
 step(session,6);
 const halfway=view(session),tuck=fighterVisual(halfway);
 assert.equal(airbornePose(halfway).phase,"double");
 assert.ok(tuck.joints[4][1][1]>normalPose.joints[4][1][1]+.1,"double jump tucks the feet");
 assert.ok(Math.abs(tuck.lean)>Math.abs(normalPose.lean)+.1,"double jump rotates the body");
 input.state.jumpPressed=true;step(session);
 assert.equal(view(session).jumpStage,2);
 assert.equal(session.player.doubleJumpAvailable,false);
 step(session,20);
 assert.equal(view(session).doubleJumpPoseTime,0);
 assert.notEqual(airbornePose(view(session)).phase,"double");
});

test("wall jump has a distinct push-off, re-arms the double jump and does not change wall impulses",()=>{
 const {session}=setup(),f=session.player;
 f.x=-4.4;f.y=2;f.grounded=false;
 session.tryJump(f);
 assert.equal(f.jumpStage,1);
 assert.equal(f.wallJumpPoseTime,WALL_JUMP_POSE_DURATION);
 assert.equal(f.doubleJumpPoseTime,0);
 assert.equal(f.doubleJumpAvailable,true);
 assert.equal(f.velocityX<0,true);
 assert.ok(Math.abs(f.velocityX+9.6)<.001,"existing wall-jump velocity remains unchanged");
 assert.equal(airbornePose(view(session)).phase,"wall");
 session.tryJump(f);
 assert.equal(f.jumpStage,2);
 assert.equal(f.wallJumpPoseTime,0);
 assert.equal(f.doubleJumpPoseTime,DOUBLE_JUMP_POSE_DURATION);
});

test("mobile upward re-arm permits exactly two jumps and no auto-repeat",()=>{
 const {input,session}=setup();
 input.state.jumpPressed=true;step(session);
 assert.equal(view(session).jumpStage,1);
 input.state.jumpPressed=true;step(session);
 assert.equal(view(session).jumpStage,2);
 assert.equal(session.player.doubleJumpAvailable,false);
 const beforePoseTime=view(session).doubleJumpPoseTime;
 input.state.jumpPressed=true;step(session);
 assert.ok(view(session).doubleJumpPoseTime<beforePoseTime,"a third trigger cannot restart the animation");
 assert.equal(session.player.doubleJumpAvailable,false);
});

test("air dash, hit, bow attack and ordinary attack safely cancel tuck pose",()=>{
 const {session}=setup(),f=session.player;
 session.tryJump(f);session.tryJump(f);
 assert.ok(f.doubleJumpPoseTime>0);
 session.tryDash(f);
 assert.equal(f.doubleJumpPoseTime,0);
 assert.equal(f.jumpStage,2,"visual interruption cannot grant another double jump");
 session.reset(false);
 session.tryJump(session.player);session.tryJump(session.player);
 session.damage(session.player,3,1);
 assert.equal(view(session).doubleJumpPoseTime,0);
 assert.equal(airbornePose(view(session)).phase,"rise");
 session.reset(false);
 session.selectWeaponById("blaster");
 session.tryJump(session.player);session.tryJump(session.player);
 session.fireWeapon();
 assert.equal(view(session).doubleJumpPoseTime,0);
 assert.ok(session.getRenderState().projectiles.some(p=>p.weapon==="blaster"));
});

test("local PvP and bot jumps have independent timers; no draw conflicts",()=>{
 const {input,session}=setup();
 session.setLocalPvP(true);
 input.state.jumpPressed=true;input.second.jumpPressed=true;step(session);
 assert.equal(session.getRenderState().player.jumpStage,1);
 assert.equal(session.getRenderState().opponent.jumpStage,1);
 input.second.jumpPressed=true;step(session);
 let s=session.getRenderState();
 assert.equal(s.opponent.jumpStage,2);
 assert.equal(s.player.jumpStage,1);
 assert.equal(airbornePose(s.opponent).phase,"double");
 assert.equal(airbornePose(s.player).phase,"rise");
 session.selectWeaponById("hammer");
 input.state.jumpPressed=true;step(session);
 s=session.getRenderState();
 assert.equal(s.player.jumpStage,2);
 assert.ok(Number.isFinite(fighterVisual(s.player).lean));
 assert.ok(Number.isFinite(fighterVisual(s.opponent).lean));
 session.setLocalPvP(false);
 session.reset(false);
 session.tryJump(session.opponent);
 session.tryJump(session.opponent);
 assert.equal(session.getRenderState().opponent.jumpStage,2);
});

test("low gravity, fall pits, moving platforms and suspended updates do not leave stale pose state",()=>{
 for(const arena of ["sky","pit","moving"]){
  const {session}=setup();
  session.setArena(arena);
  if(arena==="sky")session.setMode("low-gravity");
  session.tryJump(session.player);session.tryJump(session.player);
  const before=view(session).doubleJumpPoseTime;
  session.getRenderState();session.getRenderState();
  assert.equal(view(session).doubleJumpPoseTime,before,"render-only reads cannot advance timers while paused");
  step(session,20);
  assert.equal(view(session).doubleJumpPoseTime,0);
  assert.ok(Number.isFinite(fighterVisual(view(session)).lean));
  session.reset(false);
  assert.equal(view(session).jumpStage,0);
  assert.equal(view(session).doubleJumpPoseTime,0);
 }
});

test("all aerial joints and poses stay finite for rising, apex, free fall and collisions",()=>{
 const {session}=setup();
 const base=view(session);
 for(const velocityY of [12,4,1,0,-1,-3,-12,-35]){
  for(const jumpStage of [0,1,2]){
   const s={...base,grounded:false,velocityY,jumpStage,doubleJumpPoseTime:jumpStage===2?.12:0,wallJumpPoseTime:0};
   const visual=fighterVisual(s);
   for(const [a,b]of visual.joints)assert.ok([...a,...b].every(Number.isFinite));
   assert.ok([visual.lean,...visual.hand].every(Number.isFinite));
  }
 }
});

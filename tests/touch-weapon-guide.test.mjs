import test from "node:test";
import assert from "node:assert/strict";
import {touchActionGuide,touchActionStatus,WeaponTipTracker,WEAPON_TIP_STORAGE_KEY} from "../.test-build/ui/TouchWeaponGuide.js";
import {MobileOnboarding} from "../.test-build/ui/MobileOnboarding.js";
import {GameSession} from "../.test-build/gameplay/GameSession.js";
import {GRAVITY_GAUNTLET} from "../.test-build/gameplay/GravityGauntlet.js";

const weapons=["blade","hammer","blaster","uzi","boomerang","bow","bomb","missile","spear","grapple","gravity-gauntlet"];
const memory=()=>{const m=new Map();return{get:key=>m.get(key),set:(key,value)=>m.set(key,value),remove:key=>m.delete(key)};};

test("all 11 weapon touch descriptions are localized and explain only supported interactions",()=>{
 for(const weapon of weapons){
  for(const locale of ["fa","en"]){
   const g=touchActionGuide(weapon,locale);
   assert.ok(g.primary.length>2&&g.secondary.length>2&&g.tip.length>10,`missing ${weapon}/${locale}`);
  }
 }
 const missile=touchActionGuide("missile","en");
 assert.match(missile.primary,/RELEASE/);
 assert.doesNotMatch(missile.primary,/HOLD/);
 const glove=touchActionGuide("gravity-gauntlet","en");
 assert.match(glove.primary,/PUNCH.*PULL/);
 assert.match(glove.secondary,/PARRY.*SLAM/);
 assert.match(touchActionGuide("uzi","en").primary,/HOLD/);
});

test("HUD affordances follow actual charge, cooldown, and gauntlet readiness",()=>{
 const ready={bowCharge:0,attackCooldown:0};
 assert.equal(touchActionStatus("blade","en",ready).phase,"ready");
 assert.equal(touchActionStatus("hammer","fa",{...ready,attackCooldown:.25}).phase,"cooldown");
 const bow=touchActionStatus("bow","en",{bowCharge:.6,attackCooldown:.3});
 assert.equal(bow.phase,"charging");assert.equal(bow.progress,.6);
 const g={pullCooldown:0,parryCooldown:0,pulling:false,parrying:false,holdProgress:0};
 assert.equal(touchActionStatus("gravity-gauntlet","en",{bowCharge:0,gauntlet:g}).phase,"ready");
 const charging=touchActionStatus("gravity-gauntlet","fa",{bowCharge:0,gauntlet:{...g,holdProgress:.5}});
 assert.equal(charging.phase,"charging");assert.equal(charging.progress,.5);
 assert.match(touchActionStatus("gravity-gauntlet","en",{bowCharge:0,gauntlet:{...g,pullCooldown:1.35}}).label,/PULL 1\.4s/);
 assert.equal(touchActionStatus("gravity-gauntlet","en",{bowCharge:0,gauntlet:{...g,pulling:true}}).phase,"active");
 assert.equal(touchActionStatus("gravity-gauntlet","en",{bowCharge:0,gauntlet:{...g,parrying:true}}).phase,"active");
});

test("first-use micro-tip completion is device-local, validated, replayable and fail-open",()=>{
 const storage=memory(),tips=new WeaponTipTracker(storage);
 assert.equal(tips.isLearned("bow"),false);tips.markLearned("bow");
 tips.markLearned("bow");assert.deepEqual(storage.get(WEAPON_TIP_STORAGE_KEY),["bow"]);
 const restored=new WeaponTipTracker(storage);assert.equal(restored.isLearned("bow"),true);
 storage.set(WEAPON_TIP_STORAGE_KEY,["blade","unrecognized",null,5]);
 assert.equal(new WeaponTipTracker(storage).isLearned("blade"),true);
 restored.replay();assert.equal(storage.get(WEAPON_TIP_STORAGE_KEY),undefined);
 assert.equal(restored.isLearned("bow"),false);
 const broken={get:()=>{throw Error("disabled")},set:()=>{throw Error("disabled")},remove:()=>{throw Error("disabled")}};
 const failOpen=new WeaponTipTracker(broken);
 failOpen.markLearned("uzi");assert.equal(failOpen.isLearned("uzi"),true);failOpen.replay();
});

test("micro-tips can start only after accepted core input",()=>{
 const flow=new MobileOnboarding(),s={move:0,jump:0,attack:0,double:0,grab:0,kick:0,grounded:true,doubleAvailable:true,near:false,safe:true};
 assert.equal(flow.isCoreComplete(),false);
 flow.update(s,true,false);s.move=.9;flow.update(s,true,false);s.jump++;flow.update(s,true,false);s.attack++;
 assert.equal(flow.update(s,true,false),"ready");
 assert.equal(flow.isCoreComplete(),true);
 flow.replay();assert.equal(flow.isCoreComplete(),false);
});

test("GameSession exposes real charge fraction and ability cooldown without changing combat",()=>{
 const idle=()=>({moveX:0,moveY:0,pointerX:0,pointerY:0,pointerDown:false,pointerPressed:false,pointerReleased:false,
  attackHeld:false,attackCancelled:false,jumpPressed:false,dashPressed:false,grabPressed:false,
  attackPressed:false,weaponNextPressed:false,weaponPreviousPressed:false});
 const input={state:idle(),getState(){return this.state},getPlayer2State(){return idle()},endFrame(){this.state={...this.state,attackPressed:false,grabPressed:false}},setLocalPvPEnabled(){}};
 const game=new GameSession(input);game.setStartingWeapon("gravity-gauntlet");game.reset(false);
 assert.equal(game.getHudState().gauntlet.holdProgress,0);
 input.state.attackHeld=true;
 for(let i=0;i<8;i++)game.update(1/60);
 const partial=game.getHudState().gauntlet.holdProgress;
 assert.ok(partial>0&&partial<1);
 for(let i=0;i<20;i++)game.update(1/60);
 assert.ok(game.getHudState().gauntlet.pullCooldown>0);
 assert.ok(game.getHudState().gauntlet.holdProgress>=1);
 assert.equal(GRAVITY_GAUNTLET.pullHold,.32);
 game.dispose();
});

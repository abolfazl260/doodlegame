import test from "node:test";
import assert from "node:assert/strict";
import {GameSession,WEAPON_DRAW_DURATION} from "../.test-build/gameplay/GameSession.js";
import {fighterVisual,toolSegments,weaponDrawPose} from "../.test-build/rendering/FighterVisual.js";

function setup(){
 const input={
  state:{moveX:0,moveY:0,attackPressed:false,attackHeld:false,attackCancelled:false,
   jumpPressed:false,dashPressed:false,grabPressed:false,weaponNextPressed:false,weaponPreviousPressed:false},
  second:{moveX:0,moveY:0,attackPressed:false,attackHeld:false,attackCancelled:false,
   jumpPressed:false,dashPressed:false,grabPressed:false,weaponNextPressed:false,weaponPreviousPressed:false},
  getState(){return this.state;},getPlayer2State(){return this.second;},
  endFrame(){for(const value of [this.state,this.second])for(const key of ["attackPressed","attackCancelled","jumpPressed","dashPressed","grabPressed","weaponNextPressed","weaponPreviousPressed"])value[key]=false;},
  setLocalPvPEnabled(){}
 };
 return {input,session:new GameSession(input)};
}
const visible=session=>weaponDrawPose(session.getRenderState().player);
const advance=(session,frames=1)=>{for(let i=0;i<frames;i++)session.update(1/60);};

test("an allowed switch animates old tool down then draws the new one over 180ms",()=>{
 const {session}=setup();
 session.selectWeaponById("hammer");
 assert.equal(session.getHudState().weapon,"hammer");
 assert.equal(session.getRenderState().player.weaponHolsterFrom,"blade");
 assert.equal(session.getRenderState().player.weaponDrawTime,WEAPON_DRAW_DURATION);
 assert.deepEqual(visible(session),{weapon:"blade",phase:"holster",progress:0});
 const startHand=fighterVisual(session.getRenderState().player).hand;
 advance(session,3);
 const view=session.getRenderState().player;
 assert.equal(visible(session).phase,"holster");
 assert.ok(fighterVisual(view).hand[1]<startHand[1],"hand moves toward the holster");
 advance(session,2);
 assert.equal(visible(session).phase,"draw");
 assert.equal(visible(session).weapon,"hammer");
 const mid=toolSegments(session.getRenderState().player);
 assert.ok(mid.length>0,"incoming weapon has a rendered tool");
 advance(session,12);
 assert.equal(session.getRenderState().player.weaponDrawTime,0);
 assert.equal(session.getRenderState().player.weaponHolsterFrom,null);
 assert.equal(visible(session).phase,"ready");
 assert.equal(visible(session).weapon,"hammer");
});

test("rapid cycling, picking same weapon and switching during movement never leaves stale tools",()=>{
 const {input,session}=setup();
 session.selectWeapon(1);
 session.selectWeapon(1);
 assert.equal(session.getRenderState().player.weaponHolsterFrom,"hammer");
 assert.equal(session.getHudState().weapon,"blaster");
 session.selectWeaponById("blaster");
 assert.equal(session.getRenderState().player.weaponHolsterFrom,"hammer","same choice must not restart the draw");
 input.state.moveX=1;
 advance(session,3);
 assert.ok(session.getRenderState().player.velocityX>0);
 input.state.jumpPressed=true;advance(session);
 assert.ok(session.getRenderState().player.velocityY>0);
 session.selectWeaponById("uzi");
 assert.equal(visible(session).weapon,"blaster");
 assert.equal(session.getHudState().weapon,"uzi");
 advance(session,13);
 assert.equal(visible(session).weapon,"uzi");
 assert.equal(visible(session).phase,"ready");
 assert.ok(toolSegments(session.getRenderState().player).length>0);
 session.reset(false);
 assert.equal(session.getRenderState().player.weaponHolsterFrom,null);
 assert.equal(session.getRenderState().player.weaponDrawTime,0);
});

test("firing immediately after switch uses the newly equipped weapon and retains the previous cooldown",()=>{
 const {session}=setup();
 session.selectWeaponById("blaster");
 assert.equal(visible(session).weapon,"blade");
 session.fireWeapon();
 const view=session.getRenderState();
 assert.equal(visible(session).weapon,"blaster","firing interrupts holster animation");
 assert.equal(view.player.weaponHolsterFrom,null);
 assert.equal(view.player.weaponDrawTime,0);
 assert.ok(view.projectiles.some(p=>p.weapon==="blaster"));
 const shots=view.projectiles.length,cooldown=session.player.cooldown;
 session.selectWeaponById("uzi");
 assert.equal(session.player.cooldown,cooldown,"switching must not reset an earned cooldown");
 session.fireWeapon();
 assert.equal(session.getRenderState().projectiles.length,shots,"instant switch cannot bypass cooldown");
 advance(session,6);
 assert.ok(session.player.cooldown>0);
 session.selectWeaponById("bow");
 assert.ok(session.player.cooldown>0);
});

test("switching away from a charging Bow cancels the charge without releasing an arrow",()=>{
 const {input,session}=setup();
 session.selectWeaponById("bow");
 input.state.attackPressed=true;input.state.attackHeld=true;
 advance(session,10);
 assert.ok(session.getRenderState().player.bowCharge>0);
 assert.equal(session.getRenderState().player.weaponDrawTime,0,"charging reveals correct Bow immediately");
 const cooldown=session.player.cooldown;
 session.selectWeaponById("hammer");
 assert.equal(session.player.bowCharging,false);
 assert.equal(session.getRenderState().player.bowCharge,0);
 assert.equal(session.player.cooldown,cooldown);
 input.state.attackHeld=false;
 advance(session);
 assert.equal(session.getRenderState().projectiles.filter(p=>p.weapon==="bow").length,0);
 session.selectWeaponById("bow");
 input.state.attackPressed=true;input.state.attackHeld=true;
 advance(session,4);
 input.state.attackHeld=false;advance(session);
 assert.equal(session.getRenderState().projectiles.filter(p=>p.weapon==="bow").length,1);
 assert.equal(session.getRenderState().player.weaponDrawTime,0);
});

test("PvP switches independently and P2 attacks interrupt only P2 holster",()=>{
 const {session}=setup();
 session.setLocalPvP(true);
 session.selectWeaponById("bow");
 session.selectPlayer2Weapon(1);
 assert.equal(session.getHudState().weapon,"bow");
 assert.equal(session.getHudState().secondWeapon,"hammer");
 let v=session.getRenderState();
 assert.equal(v.player.weaponHolsterFrom,"blade");
 assert.equal(v.opponent.weaponHolsterFrom,"blade");
 session.selectPlayer2WeaponById("blaster");
 v=session.getRenderState();
 assert.equal(v.opponent.weaponHolsterFrom,"hammer");
 assert.equal(v.opponent.weapon,"blaster");
 session.opponent.cooldown=0;
 session.attack(session.opponent,session.player,true);
 v=session.getRenderState();
 assert.equal(v.opponent.weaponHolsterFrom,null);
 assert.equal(v.opponent.weaponDrawTime,0);
 assert.equal(v.player.weapon,"bow");
 assert.equal(v.player.weaponHolsterFrom,"blade");
 assert.ok(v.projectiles.some(p=>p.weapon==="blaster"));
});

test("pause-like suspended updates freeze the visual draw; no-op selection and mode restrictions do not animate",()=>{
 const {session}=setup();
 session.selectWeaponById("hammer");
 const frozen=session.getRenderState().player.weaponDrawTime;
 session.getRenderState();session.getHudState();session.getRenderState();
 assert.equal(session.getRenderState().player.weaponDrawTime,frozen);
 advance(session,1);
 assert.ok(session.getRenderState().player.weaponDrawTime<frozen);
 session.selectWeaponById("hammer");
 assert.equal(session.getRenderState().player.weaponHolsterFrom,"blade");
 session.setMode("random-weapons");
 session.selectWeaponById("bow");
 session.selectWeapon(1);
 assert.equal(session.getRenderState().player.weaponHolsterFrom,null);
 session.setMode("missile-duel");
 assert.equal(session.getHudState().weapon,"missile");
 session.selectWeapon(1);
 session.selectWeaponById("hammer");
 assert.equal(session.getHudState().weapon,"missile");
 assert.equal(session.getRenderState().player.weaponDrawTime,0);
 session.setMode("melee-only");
 session.selectWeaponById("missile");
 assert.equal(session.getHudState().weapon,"blade");
 session.selectWeapon(1);
 assert.equal(session.getHudState().weapon,"hammer");
 assert.equal(session.getRenderState().player.weaponHolsterFrom,"blade");
});
